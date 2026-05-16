"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Brain, CalendarClock, Database, FileText, LogOut, RefreshCw, Save, Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  loadCloudData,
  saveAppSettings,
  saveInvestmentLots,
  saveMarketSnapshot,
  saveMonthlyAnalysis,
  saveTaxDeclarationRecord,
} from "@/data/supabaseRepository";
import { projectPortfolio, summarizeProjection } from "@/core/projection";
import { formatIsoDate, addYearsIsoDate } from "@/core/dates";
import { summarizeTaxDeclaration } from "@/core/tax";
import {
  CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE,
  createManualMarketSnapshot,
  estimateAnnualWithholding,
} from "@/core/market";
import type { AppSettings, InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";
import { formatCurrency, formatPercent, monthKey } from "@/lib/format";

const HORIZONS = [10, 15, 20, 25, 30];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function quote(snapshot: MarketSnapshot | undefined, instrument: InvestmentLot["instrument"]) {
  return snapshot?.quotes.find((item) => item.instrument === instrument);
}

function latestUsableSnapshot(snapshots: MarketSnapshot[]) {
  return snapshots.find((snapshot) => snapshot.quotes.length > 0 && typeof snapshot.inflationAnnual === "number");
}

function normalizeLot(lot: InvestmentLot): InvestmentLot {
  const provisionalWithholdingRate = lot.provisionalWithholdingRate ?? CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE;

  return {
    ...lot,
    maturityDate: lot.maturityDate || addYearsIsoDate(lot.date, lot.termYears || 10),
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
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [month, setMonth] = useState(monthKey());
  const [bonosAmount, setBonosAmount] = useState("4000");
  const [udibonosAmount, setUdibonosAmount] = useState("6000");
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [taxInstrument, setTaxInstrument] = useState<TaxDeclarationRecord["instrument"]>("BONOS");
  const [nominalInterest, setNominalInterest] = useState("");
  const [realInterest, setRealInterest] = useState("");
  const [isrWithheld, setIsrWithheld] = useState("");
  const [taxNotes, setTaxNotes] = useState("");
  const [manualBonosRate, setManualBonosRate] = useState("");
  const [manualUdibonosRate, setManualUdibonosRate] = useState("");
  const [manualInflationAnnual, setManualInflationAnnual] = useState("");
  const [manualProvisionalWithholdingRate, setManualProvisionalWithholdingRate] = useState("0.90");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  const hydrateSettingsForm = useCallback((nextSettings: AppSettings | undefined) => {
    setManualBonosRate(
      typeof nextSettings?.manualBonosRate === "number" ? String(nextSettings.manualBonosRate * 100) : "",
    );
    setManualUdibonosRate(
      typeof nextSettings?.manualUdibonosRate === "number" ? String(nextSettings.manualUdibonosRate * 100) : "",
    );
    setManualInflationAnnual(
      typeof nextSettings?.manualInflationAnnual === "number" ? String(nextSettings.manualInflationAnnual * 100) : "",
    );
    setManualProvisionalWithholdingRate(
      typeof nextSettings?.manualProvisionalWithholdingRate === "number"
        ? String(nextSettings.manualProvisionalWithholdingRate * 100)
        : "0.90",
    );
  }, []);

  const loadData = useCallback(async (userId: string) => {
    const data = await loadCloudData(userId);
    setLots(data.lots.map(normalizeLot));
    setSnapshots(data.snapshots);
    setAnalyses(data.analyses);
    setTaxRecords(data.taxRecords);
    setSettings(data.settings);
    hydrateSettingsForm(data.settings);
  }, [hydrateSettingsForm]);

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
        setSettings(undefined);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadData]);

  const manualSnapshot = useMemo(() => createManualMarketSnapshot(settings), [settings]);
  const activeSnapshot = useMemo(
    () => latestUsableSnapshot(snapshots) ?? manualSnapshot,
    [snapshots, manualSnapshot],
  );
  const summaries = useMemo(() => summarizeProjection(lots, HORIZONS), [lots]);
  const chartData = useMemo(() => projectPortfolio(lots, 30), [lots]);
  const totalInvested = lots.reduce((sum, lot) => sum + lot.amount, 0);
  const currentTaxSummary = useMemo(
    () => summarizeTaxDeclaration(taxRecords, Number(fiscalYear)),
    [taxRecords, fiscalYear],
  );
  const nextMaturities = useMemo(
    () =>
      lots
        .filter((lot) => lot.maturityDate)
        .slice()
        .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
        .slice(0, 6),
    [lots],
  );
  const latestAnalysis = analyses[0];
  const missingManualConfig = !activeSnapshot;
  const userId = session?.user.id;

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

    const bonosQuote = quote(activeSnapshot, "BONOS");
    const udibonosQuote = quote(activeSnapshot, "UDIBONOS");
    const inflationRate = activeSnapshot.inflationAnnual;
    const provisionalWithholdingRate = activeSnapshot.provisionalWithholdingRate;
    if (!bonosQuote || !udibonosQuote || typeof inflationRate !== "number") {
      setMessage("Faltan tasas automáticas de BONOS/UDIBONOS o inflación.");
      return;
    }

    if (typeof provisionalWithholdingRate !== "number") {
      setMessage("Falta la retención provisional Art. 24 LIF. Actualízala en Configuración.");
      return;
    }

    const now = new Date().toISOString();
    const date = `${month}-01`;
    const candidateLots: InvestmentLot[] = [
      {
        id: newId(),
        month,
        date,
        maturityDate: addYearsIsoDate(date, bonosQuote.termYears ?? 10),
        instrument: "BONOS",
        amount: Number(bonosAmount),
        annualRate: bonosQuote.annualRate,
        inflationRate,
        provisionalWithholdingRate,
        estimatedAnnualWithholding: estimateAnnualWithholding(Number(bonosAmount), provisionalWithholdingRate),
        termYears: bonosQuote.termYears ?? 10,
        couponFrequencyMonths: 6 as const,
        sourceSnapshotId: activeSnapshot.id,
        createdAt: now,
      },
      {
        id: newId(),
        month,
        date,
        maturityDate: addYearsIsoDate(date, udibonosQuote.termYears ?? 10),
        instrument: "UDIBONOS",
        amount: Number(udibonosAmount),
        annualRate: udibonosQuote.annualRate,
        inflationRate,
        provisionalWithholdingRate,
        estimatedAnnualWithholding: estimateAnnualWithholding(Number(udibonosAmount), provisionalWithholdingRate),
        termYears: udibonosQuote.termYears ?? 10,
        couponFrequencyMonths: 6 as const,
        sourceSnapshotId: activeSnapshot.id,
        createdAt: now,
      },
    ];
    const nextLots = candidateLots.filter((lot) => lot.amount > 0);

    try {
      await saveInvestmentLots(userId, nextLots);
      setMessage("Inversión mensual guardada como lotes independientes.");
      await loadData(userId);
    } catch (error) {
      setMessage(`No se pudo guardar la inversión en Supabase: ${readableError(error)}`);
    }
  }

  async function saveSettings() {
    if (!userId) return;
    const nextSettings: AppSettings = {
      id: "default",
      updatedAt: new Date().toISOString(),
      manualBonosRate: Number(manualBonosRate) / 100 || undefined,
      manualUdibonosRate: Number(manualUdibonosRate) / 100 || undefined,
      manualInflationAnnual: Number(manualInflationAnnual) / 100 || undefined,
      manualProvisionalWithholdingRate: Number(manualProvisionalWithholdingRate) / 100 || undefined,
    };

    try {
      await saveAppSettings(userId, nextSettings);
      setSettings(nextSettings);
      setMessage("Configuración manual actualizada.");
    } catch (error) {
      setMessage(`No se pudo guardar la configuración en Supabase: ${readableError(error)}`);
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
      const text = "Faltan tasas/inflación. Actualiza fuentes o llena Configuración manual.";
      setMessage(text);
      setAnalysisMessage(text);
      return;
    }

    const hasBonos = activeSnapshot.quotes.some((item) => item.instrument === "BONOS");
    const hasUdibonos = activeSnapshot.quotes.some((item) => item.instrument === "UDIBONOS");
    if (!hasBonos || !hasUdibonos || typeof activeSnapshot.inflationAnnual !== "number") {
      const text = "El análisis necesita BONOS, UDIBONOS e inflación. Completa esos valores en Configuración manual.";
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
          currentAllocation: { UDIBONOS: 60, BONOS: 40 },
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
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">BONOS / UDIBONOS</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Registra cuánto invertiste cada mes, guarda las tasas usadas y proyecta retornos con cupones semestrales
            reinvertidos. El análisis OpenAI es informativo y no ejecuta compras.
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
          No hay datos automáticos completos. Captura tasas, inflación y retención provisional en Configuración para poder
          registrar inversiones y proyectar.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric title="Total invertido" value={formatCurrency(totalInvested)} />
        <Metric title="Lotes registrados" value={String(lots.length)} />
        <Metric title="Tasa BONOS" value={formatPercent(quote(activeSnapshot, "BONOS")?.annualRate)} />
        <Metric title="Tasa UDIBONOS" value={formatPercent(quote(activeSnapshot, "UDIBONOS")?.annualRate)} />
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
                onChange={(event) => setMonth(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              BONOS
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                min="0"
                value={bonosAmount}
                onChange={(event) => setBonosAmount(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              UDIBONOS
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                min="0"
                value={udibonosAmount}
                onChange={(event) => setUdibonosAmount(event.target.value)}
              />
            </label>
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
                  <th className="px-4 py-3">Inversión</th>
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
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Año fiscal
                <input
                  className="h-10 rounded-md border border-[var(--line)] px-3"
                  type="number"
                  value={fiscalYear}
                  onChange={(event) => setFiscalYear(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Instrumento
                <select
                  className="h-10 rounded-md border border-[var(--line)] px-3"
                  value={taxInstrument}
                  onChange={(event) => setTaxInstrument(event.target.value as TaxDeclarationRecord["instrument"])}
                >
                  <option value="BONOS">BONOS</option>
                  <option value="UDIBONOS">UDIBONOS</option>
                  <option value="CETES">CETES</option>
                  <option value="BONDDIA">BONDDIA</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Interés nominal
              <input
                className="h-10 rounded-md border border-[var(--line)] px-3"
                type="number"
                min="0"
                value={nominalInterest}
                onChange={(event) => setNominalInterest(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Interés real / acumulable
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
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <MiniMetric title="Nominal" value={formatCurrency(currentTaxSummary.nominalInterest)} />
            <MiniMetric title="Acumulable" value={formatCurrency(currentTaxSummary.realInterest)} />
            <MiniMetric title="ISR" value={formatCurrency(currentTaxSummary.isrWithheld)} />
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            Usa esta sección para copiar los importes de tu constancia fiscal anual de CETES Directo. La app los
            conserva como tracking; no sustituye el cálculo oficial del SAT.
          </p>
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <Settings size={18} className="text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">Configuración manual</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium">
            BONOS %
            <input
              className="h-10 rounded-md border border-[var(--line)] px-3"
              type="number"
              step="0.01"
              value={manualBonosRate}
              onChange={(event) => setManualBonosRate(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            UDIBONOS %
            <input
              className="h-10 rounded-md border border-[var(--line)] px-3"
              type="number"
              step="0.01"
              value={manualUdibonosRate}
              onChange={(event) => setManualUdibonosRate(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Inflación anual %
            <input
              className="h-10 rounded-md border border-[var(--line)] px-3"
              type="number"
              step="0.01"
              value={manualInflationAnnual}
              onChange={(event) => setManualInflationAnnual(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Retención Art. 24 LIF %
            <input
              className="h-10 rounded-md border border-[var(--line)] px-3"
              type="number"
              step="0.01"
              value={manualProvisionalWithholdingRate}
              onChange={(event) => setManualProvisionalWithholdingRate(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-5 text-[var(--muted)]">
            Si CETES Directo, INEGI o la tasa fiscal no se pueden consultar, estos valores toman el control para registrar
            lotes y generar proyecciones. Para 2026, Art. 24 LIF está configurado en 0.90% anual sobre capital.
          </p>
          <button
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-white"
            onClick={saveSettings}
          >
            <Settings size={16} />
            Guardar configuración
          </button>
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
