"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "@/app/components/dashboard/DashboardShell";
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
import { formatCurrency, monthKey } from "@/lib/format";

const HORIZONS = [10, 15, 20, 25, 30];
const DEFAULT_AMOUNTS: Record<InstrumentType, string> = {
  BONOS: "4000",
  UDIBONOS: "6000",
  CETES: "0",
  BONDDIA: "0",
};
const EMPTY_AMOUNTS: Record<InstrumentType, string> = {
  BONOS: "0",
  UDIBONOS: "0",
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
  const [investmentMessage, setInvestmentMessage] = useState<string | null>(null);
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
  const lotRows = useMemo(
    () =>
      lots
        .slice()
        .sort((a, b) => {
          if (a.maturityDate && b.maturityDate) return a.maturityDate.localeCompare(b.maturityDate);
          if (a.maturityDate) return -1;
          if (b.maturityDate) return 1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [lots],
  );
  const lotRowsTotal = lotRows.reduce((sum, lot) => sum + lot.amount, 0);
  const upcomingMaturities = lotRows.filter(
    (lot): lot is InvestmentLot & { maturityDate: string } => Boolean(lot.maturityDate),
  );
  const latestAnalysis = analyses[0];
  const missingManualConfig = !activeSnapshot;
  const userId = session?.user.id;
  const requiresInvestmentDates = INSTRUMENT_TYPES.some(
    (instrument) => instrument !== "BONDDIA" && (Number(investmentAmounts[instrument]) || 0) > 0,
  );
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
    setInvestmentMessage(null);
    if (!activeSnapshot) {
      const text = "No hay snapshot de tasas e inflación para registrar lotes.";
      setMessage(text);
      setInvestmentMessage(text);
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
      const text = "Captura al menos un monto mayor a cero.";
      setMessage(text);
      setInvestmentMessage(text);
      return;
    }

    if (missingQuotes.length > 0 || typeof inflationRate !== "number") {
      const text = `Faltan tasas para ${missingQuotes.join(", ") || "los instrumentos seleccionados"} o inflación.`;
      setMessage(text);
      setInvestmentMessage(text);
      return;
    }

    if (typeof provisionalWithholdingRate !== "number") {
      const text = "Falta la retención provisional Art. 24 LIF. Actualízala en Configuración.";
      setMessage(text);
      setInvestmentMessage(text);
      return;
    }

    if (requiresDates && (!auctionDate || !maturityDate)) {
      const text = "Captura la fecha de subasta y la fecha de vencimiento.";
      setMessage(text);
      setInvestmentMessage(text);
      return;
    }

    if (requiresDates && maturityDate <= auctionDate) {
      const text = "La fecha de vencimiento debe ser posterior a la fecha de subasta.";
      setMessage(text);
      setInvestmentMessage(text);
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
      setBusy("investment");
      await saveInvestmentLots(userId, nextLots);
      const text = `Inversión guardada: ${nextLots.map((lot) => `${lot.instrument} ${formatCurrency(lot.amount)}`).join(", ")}.`;
      setMessage(text);
      setInvestmentMessage(text);
      setInvestmentAmounts(EMPTY_AMOUNTS);
      await loadData(userId);
    } catch (error) {
      const text = `No se pudo guardar la inversión en Supabase: ${readableError(error)}`;
      setMessage(text);
      setInvestmentMessage(text);
    } finally {
      setBusy(null);
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
            upcomingMaturities: upcomingMaturities.map((lot) => ({
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
    <DashboardShell
      activeSnapshot={activeSnapshot}
      analysisMessage={analysisMessage}
      auctionDate={auctionDate}
      busy={busy}
      chartData={chartData}
      currentTaxEstimate={currentTaxEstimate}
      currentTaxSummary={currentTaxSummary}
      curveQuotes={curveQuotes}
      fiscalYear={fiscalYear}
      investmentAmounts={investmentAmounts}
      investmentMessage={investmentMessage}
      latestAnalysis={latestAnalysis}
      lotRows={lotRows}
      lotRowsTotal={lotRowsTotal}
      lots={lots}
      maturityDate={maturityDate}
      message={message}
      missingManualConfig={missingManualConfig}
      month={month}
      nominalInterest={nominalInterest}
      realInterest={realInterest}
      refreshMarketData={refreshMarketData}
      requiresInvestmentDates={requiresInvestmentDates}
      runMonthlyAnalysis={runMonthlyAnalysis}
      saveMonthlyInvestment={saveMonthlyInvestment}
      saveTaxRecord={saveTaxRecord}
      setAuctionDate={setAuctionDate}
      setFiscalYear={setFiscalYear}
      setInvestmentAmounts={setInvestmentAmounts}
      setMaturityDate={setMaturityDate}
      setNominalInterest={setNominalInterest}
      setRealInterest={setRealInterest}
      setTaxInstrument={setTaxInstrument}
      setTaxNotes={setTaxNotes}
      setIsrWithheld={setIsrWithheld}
      signOut={signOut}
      snapshots={snapshots}
      summaries={summaries}
      taxInstrument={taxInstrument}
      taxNotes={taxNotes}
      isrWithheld={isrWithheld}
      totalInvested={totalInvested}
      updateMonth={updateMonth}
      upcomingMaturities={upcomingMaturities}
    />
  );
}
