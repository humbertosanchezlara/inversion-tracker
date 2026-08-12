"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "@/app/components/dashboard/DashboardShell";
import { useTrackerData } from "@/app/hooks/useTrackerData";
import {
  saveInvestmentLots,
  saveMarketSnapshot,
  saveMonthlyAnalysis,
  saveTaxDeclarationRecord,
} from "@/data/supabaseRepository";
import { projectPortfolio, summarizeProjection } from "@/core/projection";
import { addYearsIsoDate, firstDayOfMonth } from "@/core/dates";
import { lotTermYears } from "@/core/lots";
import { SUPABASE_CONTACT_ERROR, readableAuthError, readableError } from "@/lib/supabaseErrors";
import { estimateTaxDeclarationFromLots, summarizeTaxDeclaration } from "@/core/tax";
import { estimateAnnualWithholding } from "@/core/market";
import { INSTRUMENT_LABELS, INSTRUMENT_TYPES } from "@/core/types";
import type { InstrumentType, InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";
import { formatCurrency, monthKey } from "@/lib/format";

const HORIZONS = [10, 15, 20, 25, 30];
const BOND_TERM_OPTIONS = [3, 5, 7, 10, 20, 30] as const;
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
const DEFAULT_INVESTMENT_TERMS: Record<InstrumentType, string> = {
  BONOS: "10",
  UDIBONOS: "10",
  CETES: "1",
  BONDDIA: "1",
};
const INSTRUMENT_ORDER: InstrumentType[] = ["CETES", "BONOS", "UDIBONOS", "BONDDIA"];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function hasBondTermSelection(instrument: InstrumentType) {
  return instrument === "BONOS" || instrument === "UDIBONOS";
}

function quote(snapshot: MarketSnapshot | undefined, instrument: InstrumentType, termYears?: number) {
  if (typeof termYears === "number") {
    return snapshot?.quotes.find((item) => item.instrument === instrument && item.termYears === termYears);
  }

  return snapshot?.quotes.find((item) => item.instrument === instrument && item.termYears === 10)
    ?? snapshot?.quotes.find((item) => item.instrument === instrument);
}

function couponFrequencyMonths(instrument: InstrumentType) {
  return instrument === "BONOS" || instrument === "UDIBONOS" ? 6 as const : undefined;
}

function investmentTermYears(
  instrument: InstrumentType,
  investmentTerms: Record<InstrumentType, string>,
  quoteTermYears?: number,
) {
  if (!hasBondTermSelection(instrument)) return lotTermYears(instrument, quoteTermYears);

  const termYears = Number(investmentTerms[instrument]);
  return BOND_TERM_OPTIONS.includes(termYears as (typeof BOND_TERM_OPTIONS)[number]) ? termYears : 10;
}

function latestUsableSnapshot(snapshots: MarketSnapshot[]) {
  const usable = snapshots.filter((snapshot) => snapshot.quotes.length > 0 && typeof snapshot.inflationAnnual === "number");
  return usable.find((snapshot) => snapshot.quotes.length >= 5) ?? usable[0];
}

function displayName(email?: string) {
  const localPart = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!localPart) return undefined;

  const firstName = localPart.split(" ")[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

function calculateAllocationPercent(lots: InvestmentLot[], totalInvested: number) {
  const allocation = { BONOS: 0, UDIBONOS: 0, CETES: 0, BONDDIA: 0 } satisfies Record<InstrumentType, number>;
  if (totalInvested <= 0) return allocation;

  for (const lot of lots) {
    allocation[lot.instrument] += (lot.amount / totalInvested) * 100;
  }

  return allocation;
}

function summarizePortfolioByTerm(lots: InvestmentLot[], totalInvested: number) {
  const byTerm = new Map<
    string,
    {
      instrument: InstrumentType;
      termYears: number;
      amount: number;
      lotsCount: number;
      weightedAnnualRate: number;
      nextMaturityDate?: string;
    }
  >();

  for (const lot of lots) {
    const key = `${lot.instrument}:${lot.termYears}`;
    const current = byTerm.get(key) ?? {
      instrument: lot.instrument,
      termYears: lot.termYears,
      amount: 0,
      lotsCount: 0,
      weightedAnnualRate: 0,
      nextMaturityDate: lot.maturityDate,
    };
    current.amount += lot.amount;
    current.lotsCount += 1;
    current.weightedAnnualRate += lot.amount * lot.annualRate;
    current.nextMaturityDate =
      current.nextMaturityDate && lot.maturityDate
        ? current.nextMaturityDate.localeCompare(lot.maturityDate) <= 0
          ? current.nextMaturityDate
          : lot.maturityDate
        : current.nextMaturityDate ?? lot.maturityDate;
    byTerm.set(key, current);
  }

  return Array.from(byTerm.values())
    .map((item) => ({
      ...item,
      allocationPercent: totalInvested > 0 ? (item.amount / totalInvested) * 100 : 0,
      weightedAnnualRate: item.amount > 0 ? item.weightedAnnualRate / item.amount : 0,
    }))
    .sort((a, b) => {
      const instrumentDiff = INSTRUMENT_ORDER.indexOf(a.instrument) - INSTRUMENT_ORDER.indexOf(b.instrument);
      if (instrumentDiff !== 0) return instrumentDiff;
      return a.termYears - b.termYears;
    });
}

export default function TrackerApp() {
  const { analyses, lots, message, reload, session, setMessage, snapshots, status, taxRecords, userId } =
    useTrackerData();
  const [email, setEmail] = useState("");
  const [month, setMonth] = useState(monthKey());
  const [auctionDate, setAuctionDate] = useState(firstDayOfMonth(monthKey()));
  const [investmentAmounts, setInvestmentAmounts] = useState<Record<InstrumentType, string>>(DEFAULT_AMOUNTS);
  const [investmentTerms, setInvestmentTerms] = useState<Record<InstrumentType, string>>(DEFAULT_INVESTMENT_TERMS);
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [taxInstrument, setTaxInstrument] = useState<TaxDeclarationRecord["instrument"]>("BONOS");
  const [nominalInterest, setNominalInterest] = useState("");
  const [realInterest, setRealInterest] = useState("");
  const [isrWithheld, setIsrWithheld] = useState("");
  const [taxNotes, setTaxNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [investmentMessage, setInvestmentMessage] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

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
    return lots.reduce<Record<InstrumentType, number>>((acc, lot) => {
      acc[lot.instrument] = (acc[lot.instrument] ?? 0) + lot.amount;
      return acc;
    }, { BONOS: 0, UDIBONOS: 0, CETES: 0, BONDDIA: 0 });
  }, [lots]);
  const currentAllocationPercent = useMemo(
    () => calculateAllocationPercent(lots, totalInvested),
    [lots, totalInvested],
  );
  const portfolioByInstrumentTerm = useMemo(
    () => summarizePortfolioByTerm(lots, totalInvested),
    [lots, totalInvested],
  );

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    setAuctionDate(firstDayOfMonth(nextMonth));
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
      await reload();
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
        termYears: investmentTermYears(instrument, investmentTerms),
        quote: quote(
          activeSnapshot,
          instrument,
          hasBondTermSelection(instrument) ? investmentTermYears(instrument, investmentTerms) : undefined,
        ),
      }))
      .filter((item) => item.amount > 0);
    const inflationRate = activeSnapshot.inflationAnnual;
    const provisionalWithholdingRate = activeSnapshot.provisionalWithholdingRate;
    const missingQuotes = requestedInstruments
      .filter((item) => !item.quote)
      .map((item) => (hasBondTermSelection(item.instrument) ? `${item.instrument} ${item.termYears} años` : item.instrument));
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

    if (requiresDates && !auctionDate) {
      const text = "Captura la fecha de subasta.";
      setMessage(text);
      setInvestmentMessage(text);
      return;
    }

    const invalidMaturity = requestedInstruments.some(
      (item) =>
        item.instrument !== "BONDDIA" && addYearsIsoDate(auctionDate, item.termYears) <= auctionDate,
    );
    if (requiresDates && invalidMaturity) {
      const text = "El plazo debe generar un vencimiento posterior a la fecha de subasta.";
      setMessage(text);
      setInvestmentMessage(text);
      return;
    }

    const now = new Date().toISOString();
    const nextLots: InvestmentLot[] = requestedInstruments.map(({ instrument, amount, quote: instrumentQuote, termYears }) => {
      return {
        id: newId(),
        month,
        date: instrument === "BONDDIA" ? undefined : auctionDate,
        maturityDate: instrument === "BONDDIA" ? undefined : addYearsIsoDate(auctionDate, termYears),
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
      await reload();
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
      await reload();
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
          currentAllocation: currentAllocationPercent,
          targetPolicyAllocation: { BONOS: 40, UDIBONOS: 60, CETES: 0, BONDDIA: 0 },
          portfolio: {
            lots,
            taxRecords,
            totalInvested,
            currentAmountsByInstrument: allocationByInstrument,
            currentAllocation: currentAllocationPercent,
            byInstrumentTerm: portfolioByInstrumentTerm,
            upcomingMaturities: upcomingMaturities.map((lot) => ({
              instrument: lot.instrument,
              amount: lot.amount,
              maturityDate: lot.maturityDate,
              annualRate: lot.annualRate,
              termYears: lot.termYears,
              couponFrequencyMonths: lot.couponFrequencyMonths,
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
      await reload();
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
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      setMessage(error ? readableAuthError(error) : "Te envié un magic link. Ábrelo para entrar.");
    } catch {
      setMessage(SUPABASE_CONTACT_ERROR);
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="dashboard-skeleton h-24 w-full max-w-md rounded-2xl border border-[var(--hairline)]" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-sm font-semibold text-[var(--accent)]">Supabase configurado</p>
          <h1 className="mt-1 text-2xl font-semibold">Entrar al tracker</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Usa tu email para recibir un magic link. Tus inversiones, configuración fiscal y análisis se guardarán en
            Supabase bajo tu usuario.
          </p>
          <label className="mt-5 grid gap-1 text-sm font-medium">
            Email
            <input
              className="h-10 rounded-md border border-[var(--line)] bg-[var(--background-2)] px-3 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
            />
          </label>
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)]"
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
      investmentTerms={investmentTerms}
      investmentMessage={investmentMessage}
      latestAnalysis={latestAnalysis}
      lotRows={lotRows}
      lotRowsTotal={lotRowsTotal}
      lots={lots}
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
      setInvestmentTerms={setInvestmentTerms}
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
      userName={displayName(session.user.email)}
    />
  );
}
