"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Brain, CalendarClock, Database, FileText, LogOut, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  loadCloudData,
  saveInvestmentLots,
  saveMarketSnapshot,
  saveMonthlyAnalysis,
  saveTaxDeclarationRecord,
} from "@/data/supabaseRepository";
import { projectPortfolio, summarizeProjection } from "@/core/projection";
import { formatIsoDate, addYearsIsoDate, firstDayOfMonth } from "@/core/dates";
import { estimateTaxDeclarationFromLots, summarizeTaxDeclaration } from "@/core/tax";
import {
  CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE,
  estimateAnnualWithholding,
} from "@/core/market";
import { INSTRUMENT_LABELS, INSTRUMENT_TYPES } from "@/core/types";
import type { InstrumentType, InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";
import { formatCurrency, formatPercent, monthKey } from "@/lib/format";

const HORIZONS = [10, 15, 20, 25, 30];
const DEFAULT_AMOUNTS: Record<InstrumentType, string> = {
  BONOS: "4000",
  UDIBONOS: "6000",
  CETES: "0",
  BONDDIA: "0",
};
const INSTRUMENT_ORDER: InstrumentType[] = ["CETES", "BONOS", "UDIBONOS", "BONDDIA"];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function quote(snapshot: MarketSnapshot | undefined, instrument: InstrumentType) {
  return snapshot?.quotes.find((item) => item.instrument === instrument && item.termYears === 10)
    ?? snapshot?.quotes.find((item) => item.instrument === instrument);
}

function lotTermYears(instrument: InstrumentType, quoteTermYears?: number) {
  if (instrument === "BONOS" || instrument === "UDIBONOS") return quoteTermYears ?? 10;
  return quoteTermYears ?? 1;
}

function couponFrequencyMonths(instrument: InstrumentType) {
  return instrument === "BONOS" || instrument === "UDIBONOS" ? 6 as const : undefined;
}

function latestUsableSnapshot(snapshots: MarketSnapshot[]) {
  const usable = snapshots.filter((snapshot) => snapshot.quotes.length > 0 && typeof snapshot.inflationAnnual === "number");
  return usable.find((snapshot) => snapshot.quotes.length >= 5) ?? usable[0];
}

function normalizeLot(lot: InvestmentLot): InvestmentLot {
  const provisionalWithholdingRate = lot.provisionalWithholdingRate ?? CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE;
  const fallbackDate = firstDayOfMonth(lot.month);
  const date = lot.date ?? (lot.instrument === "BONDDIA" ? undefined : fallbackDate);

  return {
    ...lot,
    date,
    maturityDate:
      lot.maturityDate ||
      (lot.instrument === "BONDDIA" ? undefined : addYearsIsoDate(date ?? fallbackDate, lotTermYears(lot.instrument, lot.termYears))),
    provisionalWithholdingRate,
    estimatedAnnualWithholding:
      lot.estimatedAnnualWithholding ?? estimateAnnualWithholding(lot.amount, provisionalWithholdingRate),
  };
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Error desconocido.";
}

export default function TrackerApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [lots, setLots] = useState<InvestmentLot[]>([]);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [analyses, setAnalyses] = useState<MonthlyAnalysis[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxDeclarationRecord[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [auctionDate, setAuctionDate] = useState(firstDayOfMonth(monthKey()));
  const [maturityDate, setMaturityDate] = useState(addYearsIsoDate(firstDayOfMonth(monthKey()), 10));
  const [investmentAmounts, setInvestmentAmounts] = useState<Record<InstrumentType, string>>(DEFAULT_AMOUNTS);
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [taxInstrument, setTaxInstrument] = useState<TaxDeclarationRecord["instrument"]>("BONOS");
  const [nominalInterest, setNominalInterest] = useState("");
  const [realInterest, setRealInterest] = useState("");
  const [isrWithheld, setIsrWithheld] = useState("");
  const [taxNotes, setTaxNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  const loadData = useCallback(async (userId: string) => {
    const data = await loadCloudData(userId);
    setLots(data.lots.map(normalizeLot));
    setSnapshots(data.snapshots);
    setAnalyses(data.analyses);
    setTaxRecords(data.taxRecords);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user.id) {
        void loadData(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        void loadData(nextSession.user.id);
      } else {
        setLots([]);
        setSnapshots([]);
        setAnalyses([]);
        setTaxRecords([]);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadData]);

  const activeSnapshot = useMemo(
    () => latestUsableSnapshot(snapshots),
    [snapshots],
  );
  const summaries = useMemo(() => summarizeProjection(lots, HORIZONS), [lots]);
  const chartData = useMemo(() => projectPortfolio(lots, 30), [lots]);
  const totalInvested = lots.reduce((sum, lot) => sum + lot.amount, 0);
  const fiscalYearNumber = Number(fiscalYear);
  const currentTaxSummary = useMemo(
    () => summarizeTaxDeclaration(taxRecords, fiscalYearNumber),
    [taxRecords, fiscalYearNumber],
  );
  const currentTaxEstimate = useMemo(
    () => estimateTaxDeclarationFromLots(lots, fiscalYearNumber),
    [lots, fiscalYearNumber],
  );
  const nextMaturities = useMemo(
    () =>
      lots
        .filter((lot): lot is InvestmentLot & { maturityDate: string } => Boolean(lot.maturityDate))
        .slice()
        .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
        .slice(0, 6),
    [lots],
  );
  const latestAnalysis = analyses[0];
  const missingManualConfig = !activeSnapshot;
  const userId = session?.user.id;
  const curveQuotes = useMemo(() => {
    return (activeSnapshot?.quotes ?? [])
      .slice()
      .sort((a, b) => {
        const instrumentDiff = INSTRUMENT_ORDER.indexOf(a.instrument) - INSTRUMENT_ORDER.indexOf(b.instrument);
        if (instrumentDiff !== 0) return instrumentDiff;
        return (a.termYears ?? 0) - (b.termYears ?? 0);
      });
  }, [activeSnapshot]);
  const allocationByInstrument = useMemo(() => {
    return lots.reduce<Record<string, number>>((acc, lot) => {
      acc[lot.instrument] = (acc[lot.instrument] ?? 0) + lot.amount;
      return acc;
    }, {});
  }, [lots]);

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    setAuctionDate(firstDayOfMonth(nextMonth));
    setMaturityDate(addYearsIsoDate(firstDayOfMonth(nextMonth), 10));
  }

  async function refreshMarketData() {
    if (!userId) return;
    setBusy("market");
    setMessage(null);
    try {
      const response = await fetch("/api/market-data", { cache: "no-store" });
      const snapshot = (await response.json()) as MarketSnapshot;
      await saveMarketSnapshot(userId, snapshot);
      setMessage(
        snapshot.status === "failed"
          ? "No se pudieron leer fuentes automáticas. Se conserva el último snapshot usable."
          : "Fuentes actualizadas y guardadas.",
      );
      await loadData(userId);
    } catch (error) {
      setMessage(`No se pudieron guardar las fuentes en Supabase: ${readableError(error)}`);
    } finally {
      setBusy(null);
    }
  }

  async function saveMonthlyInvestment() {
    if (!userId) return;
    if (!activeSnapshot) {
      setMessage("No hay snapshot de tasas e inflación para registrar lotes.");
      return;
    }

    const requestedInstruments = INSTRUMENT_TYPES
      .map((instrument) => ({
        instrument,
        amount: Number(investmentAmounts[instrument]) || 0,
        quote: quote(activeSnapshot, instrument),
      }))
      .filter((item) => item.amount > 0);
    const inflationRate = activeSnapshot.inflationAnnual;
    const provisionalWithholdingRate = activeSnapshot.provisionalWithholdingRate;
    const missingQuotes = requestedInstruments.filter((item) => !item.quote).map((item) => item.instrument);
    const requiresDates = requestedInstruments.some((item) => item.instrument !== "BONDDIA");
    if (requestedInstruments.length === 0) {
      setMessage("Captura al menos un monto mayor a cero.");
      return;
    }

    if (missingQuotes.length > 0 || typeof inflationRate !== "number") {
      setMessage(`Faltan tasas para ${missingQuotes.join(", ") || "los instrumentos seleccionados"} o inflación.`);
      return;
    }

    if (typeof provisionalWithholdingRate !== "number") {
      setMessage("Falta la retención provisional Art. 24 LIF. Actualízala en Configuración.");
      return;
    }

    if (requiresDates && (!auctionDate || !maturityDate)) {
      setMessage("Captura la fecha de subasta y la fecha de vencimiento.");
      return;
    }

    if (requiresDates && maturityDate <= auctionDate) {
      setMessage("La fecha de vencimiento debe ser posterior a la fecha de subasta.");
      return;
    }

    const now = new Date().toISOString();
    const nextLots: InvestmentLot[] = requestedInstruments.map(({ instrument, amount, quote: instrumentQuote }) => {
      const termYears = lotTermYears(instrument, instrumentQuote?.termYears);
      return {
        id: newId(),
        month,
        date: instrument === "BONDDIA" ? undefined : auctionDate,
        maturityDate: instrument === "BONDDIA" ? undefined : maturityDate,
        instrument,
        amount,
        annualRate: instrumentQuote?.annualRate ?? 0,
        inflationRate,
        provisionalWithholdingRate,
        estimatedAnnualWithholding: estimateAnnualWithholding(amount, provisionalWithholdingRate),
        termYears,
        couponFrequencyMonths: couponFrequencyMonths(instrument),
        sourceSnapshotId: activeSnapshot.id,
        createdAt: now,
      };
    });

    try {
      await saveInvestmentLots(userId, nextLots);
      setMessage("Inversión mensual guardada como lotes independientes.");
      await loadData(userId);
    } catch (error) {
      setMessage(`No se pudo guardar la inversión en Supabase: ${readableError(error)}`);
    }
  }

  async function saveTaxRecord() {
    if (!userId) return;
    const year = Number(fiscalYear);
    const now = new Date().toISOString();

    if (!Number.isInteger(year) || year < 2000) {
      setMessage("Captura un año fiscal válido.");
      return;
    }

    const record: TaxDeclarationRecord = {
      id: newId(),
      fiscalYear: year,
      instrument: taxInstrument,
      source: "MANUAL",
      nominalInterest: Number(nominalInterest) || 0,
      realInterest: Number(realInterest) || 0,
      isrWithheld: Number(isrWithheld) || 0,
      notes: taxNotes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await saveTaxDeclarationRecord(userId, record);
      setNominalInterest("");
      setRealInterest("");
      setIsrWithheld("");
      setTaxNotes("");
      setMessage("Registro fiscal guardado para declaración anual.");
      await loadData(userId);
    } catch (error) {
      setMessage(`No se pudo guardar el registro fiscal en Supabase: ${readableError(error)}`);
    }
  }

  async function runMonthlyAnalysis() {
    if (!userId) {
      setAnalysisMessage("Primero inicia sesión para guardar el análisis.");
      return;
    }
    if (!activeSnapshot) {
      const text = "Faltan tasas/inflación. Actualiza fuentes antes de generar análisis.";
      setMessage(text);
      setAnalysisMessage(text);
      return;
    }

    const hasBonos = activeSnapshot.quotes.some((item) => item.instrument === "BONOS");
    const hasUdibonos = activeSnapshot.quotes.some((item) => item.instrument === "UDIBONOS");
    if (!hasBonos || !hasUdibonos || typeof activeSnapshot.inflationAnnual !== "number") {
      const text = "El análisis necesita BONOS, UDIBONOS e inflación. Actualiza fuentes.";
      setMessage(text);
      setAnalysisMessage(text);
      return;
    }

    setBusy("analysis");
    setMessage(null);
    setAnalysisMessage(null);
    try {
      const response = await fetch("/api/monthly-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month,
          marketSnapshot: activeSnapshot,
          currentAllocation: { BONOS: 40, UDIBONOS: 60, CETES: 0, BONDDIA: 0 },
          portfolio: {
            lots,
            taxRecords,
            totalInvested,
            currentAllocation: allocationByInstrument,
            upcomingMaturities: nextMaturities.map((lot) => ({
              instrument: lot.instrument,
              amount: lot.amount,
              maturityDate: lot.maturityDate,
              annualRate: lot.annualRate,
            })),
          },
        }),
      });
      const payload = await response.json().catch(() => ({
        error: "El servidor no devolvió un error legible. Revisa variables de entorno en Vercel.",
      }));
      if (!response.ok) {
        const text = payload.error ?? "No se pudo generar el análisis.";
        setMessage(text);
        setAnalysisMessage(text);
        return;
      }
      await saveMonthlyAnalysis(userId, payload as MonthlyAnalysis);
      setMessage("Análisis mensual generado y guardado.");
      setAnalysisMessage("Análisis mensual generado y guardado.");
      await loadData(userId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo contactar el endpoint de análisis.";
      setMessage(text);
      setAnalysisMessage(text);
    } finally {
      setBusy(null);
    }
  }

  async function signIn() {
    setBusy("auth");
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(null);
    setMessage(error ? error.message : "Te envié un magic link. Ábrelo para entrar.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <div className="rounded-md border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-semibold text-[var(--accent)]">Supabase conectado</p>
          <h1 className="mt-1 text-2xl font-semibold">Entrar al tracker</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Usa tu email para recibir un magic link. Tus inversiones, configuración fiscal y análisis se guardarán en
            Supabase bajo tu usuario.
          </p>
          <label className="mt-5 grid gap-1 text-sm font-medium">
            Email
            <input
              className="h-10 rounded-md border border-[var(--line)] px-3"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
            />
          </label>
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white"
            onClick={signIn}
            disabled={busy === "auth" || !email}
          >
            {busy === "auth" ? "Enviando" : "Enviar magic link"}
          </button>
          {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Tracker mensual</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">CETES Directo</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Registra cuánto invertiste cada mes en BONOS, UDIBONOS, CETES y BONDDIA, guarda las tasas usadas y proyecta
            retornos. El análisis OpenAI es informativo y no ejecuta compras.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white"
            onClick={refreshMarketData}
            disabled={busy === "market"}
          >
            <RefreshCw size={16} />
            {busy === "market" ? "Actualizando" : "Actualizar fuentes"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold"
            onClick={signOut}
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      {message ? (
        <div className="rounded-md border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
          {message}
        </div>
      ) : null}

      {missingManualConfig ? (
        <div className="rounded-md border border-[#e7c46b] bg-[#fff8e6] px-4 py-3 text-sm text-[#6f4a00]">
          No hay datos automáticos completos. Actualiza fuentes para poder registrar inversiones y proyectar.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Metric title="Total invertido" value={formatCurrency(totalInvested)} />
        <Metric title="Lotes registrados" value={String(lots.length)} />
        {INSTRUMENT_TYPES.map((instrument) => (
          <Metric key={instrument} title={`Tasa ${instrument}`} value={formatPercent(quote(activeSnapshot, instrument)?.annualRate)} />
        ))}
      </section>

      <section className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-lg font-semibold">Curva disponible por instrumento</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {curveQuotes.length > 0
              ? `${curveQuotes.length} tasas cargadas del snapshot activo.`
              : "Sin curva cargada todavía."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#eef2ef] text-left">
              <tr>
                <th className="px-4 py-3">Instrumento</th>
                <th className="px-4 py-3">Plazo</th>
                <th className="px-4 py-3">Tasa anual</th>
                <th className="px-4 py-3">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {curveQuotes.length > 0 ? (
                curveQuotes.map((item) => (
                  <tr className="border-t border-[var(--line)]" key={`${item.instrument}-${item.termLabel ?? item.termYears ?? item.source}`}>
                    <td className="px-4 py-3 font-semibold">{item.instrument}</td>
                    <td className="px-4 py-3">{item.termLabel ?? (item.termYears ? `${item.termYears} años` : "N/D")}</td>
                    <td className="px-4 py-3">{formatPercent(item.annualRate)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{item.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                    Actualiza fuentes para ver la curva disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <Save size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Registro mensual</h2>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Mes
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="month"
                value={month}
                onChange={(event) => updateMonth(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Fecha de subasta
                <input
                  className="h-10 rounded-md border border-[var(--line)] px-3"
                  type="date"
                  value={auctionDate}
                  onChange={(event) => setAuctionDate(event.target.value)}
                />
                <span className="text-xs font-normal text-[var(--muted)]">Opcional para BONDDIA.</span>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Fecha de vencimiento
                <input
                  className="h-10 rounded-md border border-[var(--line)] px-3"
                  type="date"
                  value={maturityDate}
                  onChange={(event) => setMaturityDate(event.target.value)}
                  min={auctionDate}
                />
                <span className="text-xs font-normal text-[var(--muted)]">Opcional para BONDDIA.</span>
              </label>
            </div>
            {INSTRUMENT_TYPES.map((instrument) => (
              <label className="grid gap-1 text-sm font-medium" key={instrument}>
                {INSTRUMENT_LABELS[instrument]}
                <input
                  className="h-10 rounded-md border border-[var(--line)] px-3"
                  type="number"
                  min="0"
                  value={investmentAmounts[instrument]}
                  onChange={(event) =>
                    setInvestmentAmounts((current) => ({ ...current, [instrument]: event.target.value }))
                  }
                />
              </label>
            ))}
            <button
              className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-white"
              onClick={saveMonthlyInvestment}
            >
              <Database size={16} />
              Guardar inversión
            </button>
          </div>

          <div className="mt-5 rounded-md bg-[#eef6f3] p-3 text-xs leading-5 text-[var(--muted)]">
            Snapshot activo: {activeSnapshot ? new Date(activeSnapshot.fetchedAt).toLocaleString("es-MX") : "N/D"}.
            Inflación: {formatPercent(activeSnapshot?.inflationAnnual)}. Retención Art. 24 LIF:{" "}
            {formatPercent(activeSnapshot?.provisionalWithholdingRate)}.
          </div>
        </div>

        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Proyección a 30 años</h2>
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid stroke="#dce3dd" strokeDasharray="3 3" />
                <XAxis dataKey="year" tickLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} labelFormatter={(label) => `Año ${label}`} />
                <Area type="monotone" dataKey="realBalance" name="Pesos de hoy" stroke="#0f766e" fill="#99f6e4" />
                <Area type="monotone" dataKey="nominalBalance" name="Nominal" stroke="#3b5b48" fill="#dce9df" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-lg font-semibold">Horizontes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#eef2ef] text-left">
                <tr>
                  <th className="px-4 py-3">Horizonte</th>
                  <th className="px-4 py-3">Aportado</th>
                  <th className="px-4 py-3">Valor nominal</th>
                  <th className="px-4 py-3">Valor real</th>
                  <th className="px-4 py-3">Retorno real</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr className="border-t border-[var(--line)]" key={summary.horizonYears}>
                    <td className="px-4 py-3 font-semibold">{summary.horizonYears} años</td>
                    <td className="px-4 py-3">{formatCurrency(summary.contributed)}</td>
                    <td className="px-4 py-3">{formatCurrency(summary.nominalBalance)}</td>
                    <td className="px-4 py-3">{formatCurrency(summary.realBalance)}</td>
                    <td className="px-4 py-3">{formatCurrency(summary.realReturn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <Brain size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Análisis del mes</h2>
          </div>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white"
            onClick={runMonthlyAnalysis}
            disabled={busy === "analysis"}
          >
            <Brain size={16} />
            {busy === "analysis" ? "Analizando" : "Analizar con OpenAI"}
          </button>

          {analysisMessage ? (
            <div className="mt-3 rounded-md border border-[#e7c46b] bg-[#fff8e6] p-3 text-sm leading-6 text-[#6f4a00]">
              {analysisMessage}
            </div>
          ) : null}

          {latestAnalysis ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-md bg-[#eef6f3] p-3">
                <p className="font-semibold">{latestAnalysis.recommendation.replace(/_/g, " ")}</p>
                <p className="text-[var(--muted)]">Confianza: {latestAnalysis.confidence}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(latestAnalysis.targetAllocation).map(([key, value]) => (
                  <div className="rounded-md border border-[var(--line)] p-2" key={key}>
                    <p className="text-xs text-[var(--muted)]">{key}</p>
                    <p className="font-semibold">{value}%</p>
                  </div>
                ))}
              </div>
              <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
                {latestAnalysis.rationale.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {latestAnalysis.macroSummary ? <AnalysisList title="Macro" items={latestAnalysis.macroSummary} /> : null}
              {latestAnalysis.curveSummary ? <AnalysisList title="Curva" items={latestAnalysis.curveSummary} /> : null}
              {latestAnalysis.portfolioSummary ? (
                <AnalysisList title="Cartera" items={latestAnalysis.portfolioSummary} />
              ) : null}
              {latestAnalysis.actionItems ? <AnalysisList title="Acciones" items={latestAnalysis.actionItems} /> : null}
              {latestAnalysis.watchConditions ? (
                <AnalysisList title="Vigilar" items={latestAnalysis.watchConditions} />
              ) : null}
              <p className="text-xs text-[var(--warning)]">Sugerencia informativa. No es asesoría financiera.</p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Genera una sugerencia no ejecutable usando solo BONOS, UDIBONOS, CETES y BONDDIA.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
            <CalendarClock size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Vencimientos por lote</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#eef2ef] text-left">
                <tr>
                  <th className="px-4 py-3">Subasta</th>
                  <th className="px-4 py-3">Instrumento</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Tasa</th>
                  <th className="px-4 py-3">ISR prov. anual</th>
                  <th className="px-4 py-3">Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {nextMaturities.length > 0 ? (
                  nextMaturities.map((lot) => (
                    <tr className="border-t border-[var(--line)]" key={lot.id}>
                      <td className="px-4 py-3">{formatIsoDate(lot.date)}</td>
                      <td className="px-4 py-3 font-semibold">{lot.instrument}</td>
                      <td className="px-4 py-3">{formatCurrency(lot.amount)}</td>
                      <td className="px-4 py-3">{formatPercent(lot.annualRate)}</td>
                      <td className="px-4 py-3">{formatCurrency(lot.estimatedAnnualWithholding ?? 0)}</td>
                      <td className="px-4 py-3">{formatIsoDate(lot.maturityDate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                      Guarda una inversión mensual para ver su fecha de vencimiento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Declaración anual / ISR</h2>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Año fiscal
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                value={fiscalYear}
                onChange={(event) => setFiscalYear(event.target.value)}
              />
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--accent)]">Estimado desde inversiones</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <MiniMetric title="Nominal" value={formatCurrency(currentTaxEstimate.nominalInterest)} />
                <MiniMetric title="Acumulable" value={formatCurrency(currentTaxEstimate.realInterest)} />
                <MiniMetric title="ISR prov." value={formatCurrency(currentTaxEstimate.isrWithheld)} />
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-[var(--line)]">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-[#eef2ef] text-left">
                  <tr>
                    <th className="px-3 py-2">Instrumento</th>
                    <th className="px-3 py-2">Lotes</th>
                    <th className="px-3 py-2">Nominal</th>
                    <th className="px-3 py-2">Acumulable</th>
                    <th className="px-3 py-2">ISR</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTaxEstimate.lines.length > 0 ? (
                    currentTaxEstimate.lines.map((line) => (
                      <tr className="border-t border-[var(--line)]" key={line.instrument}>
                        <td className="px-3 py-2 font-semibold">{line.instrument}</td>
                        <td className="px-3 py-2">{line.lotsCount}</td>
                        <td className="px-3 py-2">{formatCurrency(line.nominalInterest)}</td>
                        <td className="px-3 py-2">{formatCurrency(line.realInterest)}</td>
                        <td className="px-3 py-2">{formatCurrency(line.isrWithheld)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-4 text-[var(--muted)]" colSpan={5}>
                        Sin inversiones activas para este año fiscal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--accent)]">Constancia oficial / ajuste</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <MiniMetric title="Nominal" value={formatCurrency(currentTaxSummary.nominalInterest)} />
                <MiniMetric title="Acumulable" value={formatCurrency(currentTaxSummary.realInterest)} />
                <MiniMetric title="ISR" value={formatCurrency(currentTaxSummary.isrWithheld)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Instrumento oficial
                <select
                  className="h-10 rounded-md border border-[var(--line)] px-3"
                  value={taxInstrument}
                  onChange={(event) => setTaxInstrument(event.target.value as TaxDeclarationRecord["instrument"])}
                >
                  {INSTRUMENT_TYPES.map((instrument) => (
                    <option value={instrument} key={instrument}>
                      {INSTRUMENT_LABELS[instrument]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Interés nominal oficial
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                min="0"
                value={nominalInterest}
                onChange={(event) => setNominalInterest(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Interés real / acumulable oficial
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                min="0"
                value={realInterest}
                onChange={(event) => setRealInterest(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              ISR retenido
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                min="0"
                value={isrWithheld}
                onChange={(event) => setIsrWithheld(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Notas
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                value={taxNotes}
                onChange={(event) => setTaxNotes(event.target.value)}
              />
            </label>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-white"
              onClick={saveTaxRecord}
            >
              <FileText size={16} />
              Guardar dato fiscal
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            El estimado se deriva de los lotes registrados y se prorratea por días activos del año fiscal. La constancia
            oficial queda guardada por separado para conciliación.
          </p>
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-white p-4">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] p-2">
      <p className="text-xs text-[var(--muted)]">{title}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-[var(--accent)]">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
