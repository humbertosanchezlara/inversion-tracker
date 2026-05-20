"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { INSTRUMENT_TYPES } from "@/core/types";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PortfolioHero from "./PortfolioHero";
import InstrumentCard from "./InstrumentCard";
import AIAnalysisPanel from "./AIAnalysisPanel";
import type {
  InstrumentType,
  InvestmentLot,
  MarketInstrumentQuote,
  MarketSnapshot,
  MonthlyAnalysis,
  ProjectionPoint,
  ProjectionSummary,
  TaxDeclarationEstimateSummary,
  TaxDeclarationRecord,
  TaxDeclarationSummary,
} from "@/core/types";

export type DashboardShellProps = {
  activeSnapshot?: MarketSnapshot;
  analysisMessage: string | null;
  auctionDate: string;
  busy: string | null;
  chartData: ProjectionPoint[];
  currentTaxEstimate: TaxDeclarationEstimateSummary;
  currentTaxSummary: TaxDeclarationSummary;
  curveQuotes: MarketInstrumentQuote[];
  fiscalYear: string;
  investmentAmounts: Record<InstrumentType, string>;
  investmentMessage: string | null;
  isrWithheld: string;
  latestAnalysis?: MonthlyAnalysis;
  lotRows: InvestmentLot[];
  lotRowsTotal: number;
  lots: InvestmentLot[];
  maturityDate: string;
  message: string | null;
  missingManualConfig: boolean;
  month: string;
  nominalInterest: string;
  realInterest: string;
  refreshMarketData: () => Promise<void>;
  requiresInvestmentDates: boolean;
  runMonthlyAnalysis: () => Promise<void>;
  saveMonthlyInvestment: () => Promise<void>;
  saveTaxRecord: () => Promise<void>;
  setAuctionDate: Dispatch<SetStateAction<string>>;
  setFiscalYear: Dispatch<SetStateAction<string>>;
  setInvestmentAmounts: Dispatch<SetStateAction<Record<InstrumentType, string>>>;
  setIsrWithheld: Dispatch<SetStateAction<string>>;
  setMaturityDate: Dispatch<SetStateAction<string>>;
  setNominalInterest: Dispatch<SetStateAction<string>>;
  setRealInterest: Dispatch<SetStateAction<string>>;
  setTaxInstrument: Dispatch<SetStateAction<TaxDeclarationRecord["instrument"]>>;
  setTaxNotes: Dispatch<SetStateAction<string>>;
  signOut: () => Promise<void>;
  snapshots: MarketSnapshot[];
  summaries: ProjectionSummary[];
  taxInstrument: TaxDeclarationRecord["instrument"];
  taxNotes: string;
  totalInvested: number;
  updateMonth: (nextMonth: string) => void;
  upcomingMaturities: Array<InvestmentLot & { maturityDate: string }>;
};

export default function DashboardShell(props: DashboardShellProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const currentValue = estimateCurrentValue(props.lots);
  const currentAllocation = calculateAllocation(props.lots, props.totalInvested);
  const previousSnapshot = findPreviousSnapshot(props.snapshots, props.activeSnapshot);
  const instruments = INSTRUMENT_TYPES.map((instrument) => {
    const activeQuote = quote(props.activeSnapshot, instrument);
    const previousQuote = quote(previousSnapshot, instrument, activeQuote?.termYears);
    const invested = props.lots
      .filter((lot) => lot.instrument === instrument)
      .reduce((sum, lot) => sum + lot.amount, 0);

    return {
      changeBps:
        typeof activeQuote?.annualRate === "number" && typeof previousQuote?.annualRate === "number"
          ? (activeQuote.annualRate - previousQuote.annualRate) * 10000
          : 0,
      instrument,
      invested,
      quote: activeQuote,
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundMesh />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar activeSnapshot={props.activeSnapshot} onSignOut={props.signOut} />
        <section className="flex min-w-0 flex-1 flex-col gap-[14px] px-4 py-5 md:px-8 md:py-6">
          <TopBar
            busy={props.busy}
            month={props.month}
            onOpenRegister={() => setIsRegisterOpen(true)}
            onRefreshMarketData={props.refreshMarketData}
          />
          {props.message ? (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg-hi)] px-4 py-3 text-[12px] leading-5 text-[var(--text-soft)] backdrop-blur-2xl">
              {props.message}
            </div>
          ) : null}
          {props.missingManualConfig ? (
            <div className="rounded-2xl border border-[rgba(245,193,108,0.35)] bg-[rgba(245,193,108,0.10)] px-4 py-3 text-[12px] leading-5 text-[var(--udibonos)] backdrop-blur-2xl">
              Actualiza fuentes para ver tasas e inflación.
            </div>
          ) : null}
          <div className="grid gap-[14px] xl:grid-cols-[1fr_2.4fr]">
            <PortfolioHero
              currentValue={currentValue}
              inflation={props.activeSnapshot?.inflationAnnual}
              lotsCount={props.lots.length}
              totalInvested={props.totalInvested}
            />
            <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
              {instruments.map((item) => (
                <InstrumentCard
                  changeBps={item.changeBps}
                  instrument={item.instrument}
                  invested={item.invested}
                  key={item.instrument}
                  quote={item.quote}
                />
              ))}
            </div>
          </div>
          <AIAnalysisPanel
            analysisMessage={props.analysisMessage}
            busy={props.busy}
            currentAllocation={currentAllocation}
            latestAnalysis={props.latestAnalysis}
            month={props.month}
            onRunAnalysis={props.runMonthlyAnalysis}
          />
          <div className="grid gap-[14px] xl:grid-cols-[1.55fr_1fr]">
            <div className="min-h-[360px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
            <div className="grid gap-[14px]">
              <div className="min-h-[172px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
              <div className="min-h-[174px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
            </div>
          </div>
          <div className="min-h-[420px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
        </section>
      </div>
      {isRegisterOpen ? (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/45 backdrop-blur-sm" onClick={() => setIsRegisterOpen(false)}>
          <div
            className="h-full w-full max-w-md border-l border-[var(--hairline)] bg-[var(--background-2)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Registro mensual</p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em]">Registrar mes</h2>
              </div>
              <button
                className="rounded-full border border-[var(--hairline)] px-3 py-1.5 text-[12px] text-[var(--text-soft)]"
                onClick={() => setIsRegisterOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-6 text-[12px] leading-6 text-[var(--text-soft)]">
              El formulario existente se conectará aquí en el siguiente bloque de componentes.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function calculateAllocation(lots: InvestmentLot[], totalInvested: number): Record<InstrumentType, number> {
  const allocation = { BONOS: 0, UDIBONOS: 0, CETES: 0, BONDDIA: 0 } satisfies Record<InstrumentType, number>;
  if (totalInvested <= 0) return allocation;

  for (const lot of lots) {
    allocation[lot.instrument] += (lot.amount / totalInvested) * 100;
  }

  return allocation;
}

function quote(snapshot: MarketSnapshot | undefined, instrument: InstrumentType, termYears?: number) {
  return (
    snapshot?.quotes.find((item) => item.instrument === instrument && item.termYears === termYears) ??
    snapshot?.quotes.find((item) => item.instrument === instrument && item.termYears === 10) ??
    snapshot?.quotes.find((item) => item.instrument === instrument)
  );
}

function findPreviousSnapshot(snapshots: MarketSnapshot[], activeSnapshot?: MarketSnapshot) {
  if (!activeSnapshot) return undefined;

  return snapshots
    .filter((snapshot) => snapshot.id !== activeSnapshot.id && snapshot.quotes.length > 0)
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
    .find((snapshot) => snapshot.fetchedAt <= activeSnapshot.fetchedAt);
}

function estimateCurrentValue(lots: InvestmentLot[]) {
  const now = Date.now();

  return lots.reduce((sum, lot) => {
    const startDate = new Date(lot.date ?? lot.createdAt).getTime();
    const maturityDate = lot.maturityDate ? new Date(lot.maturityDate).getTime() : now;
    const endDate = Math.min(now, Number.isFinite(maturityDate) ? maturityDate : now);
    const elapsedYears = Math.max(0, (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000));

    return sum + lot.amount * (1 + lot.annualRate) ** elapsedYears;
  }, 0);
}

function BackgroundMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-20 -top-40 h-[520px] w-[520px] bg-[radial-gradient(circle_at_center,rgba(103,232,200,0.18),transparent_60%)] blur-[20px]" />
      <div className="absolute -right-[120px] top-60 h-[560px] w-[560px] bg-[radial-gradient(circle_at_center,rgba(245,193,108,0.12),transparent_65%)] blur-[20px]" />
      <div className="absolute -bottom-[260px] left-[30%] h-[680px] w-[680px] bg-[radial-gradient(circle_at_center,rgba(122,169,247,0.10),transparent_65%)] blur-[20px]" />
      <div className="absolute bottom-[120px] right-[20%] h-[480px] w-[480px] bg-[radial-gradient(circle_at_center,rgba(197,148,241,0.09),transparent_65%)] blur-[20px]" />
    </div>
  );
}
