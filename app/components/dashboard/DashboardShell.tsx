"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { INSTRUMENT_LABELS, INSTRUMENT_TYPES } from "@/core/types";
import { NAV_ITEMS } from "./nav";
import { addYearsIsoDate, formatIsoDate } from "@/core/dates";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PortfolioHero from "./PortfolioHero";
import InstrumentCard from "./InstrumentCard";
import AIAnalysisPanel from "./AIAnalysisPanel";
import ProjectionPanel from "./ProjectionPanel";
import AllocationDonut from "./AllocationDonut";
import UpcomingMaturities from "./UpcomingMaturities";
import YieldCurveChart from "./YieldCurveChart";
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

const BOND_TERM_OPTIONS = [3, 5, 7, 10, 20, 30] as const;

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
  investmentTerms: Record<InstrumentType, string>;
  investmentMessage: string | null;
  isrWithheld: string;
  latestAnalysis?: MonthlyAnalysis;
  lotRows: InvestmentLot[];
  lotRowsTotal: number;
  lots: InvestmentLot[];
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
  setInvestmentTerms: Dispatch<SetStateAction<Record<InstrumentType, string>>>;
  setIsrWithheld: Dispatch<SetStateAction<string>>;
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
  userName?: string;
};

export default function DashboardShell(props: DashboardShellProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const currentValue = estimateCurrentValue(props.lots);
  const currentAllocation = calculateAllocation(props.lots, props.totalInvested);
  const previousSnapshot = findPreviousSnapshot(props.snapshots, props.activeSnapshot);
  const valueSeries = buildValueSeries(props.lots);
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
          : undefined,
      instrument,
      invested,
      quote: activeQuote,
      rateHistory: buildRateHistory(props.snapshots, instrument, activeQuote?.termYears),
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
            userName={props.userName}
          />
          <MobileNav />
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
              onOpenRegister={() => setIsRegisterOpen(true)}
              totalInvested={props.totalInvested}
              valueSeries={valueSeries}
            />
            <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
              {instruments.map((item) => (
                <InstrumentCard
                  changeBps={item.changeBps}
                  instrument={item.instrument}
                  invested={item.invested}
                  key={item.instrument}
                  quote={item.quote}
                  rateHistory={item.rateHistory}
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
            <ProjectionPanel chartData={props.chartData} summaries={props.summaries} />
            <div className="grid gap-[14px]">
              <AllocationDonut
                currentAllocation={currentAllocation}
                targetAllocation={props.latestAnalysis?.targetAllocation}
                totalInvested={props.totalInvested}
              />
              <UpcomingMaturities lots={props.upcomingMaturities} />
            </div>
          </div>
          <YieldCurveChart quotes={props.curveQuotes} />
        </section>
      </div>
      {isRegisterOpen ? (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/45 backdrop-blur-sm" onClick={() => setIsRegisterOpen(false)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--hairline)] bg-[var(--background-2)] p-5 shadow-2xl"
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
            <MonthlyInvestmentForm props={props} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] p-1 backdrop-blur-2xl lg:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-10 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${
              isActive ? "bg-white/[0.06] text-[var(--foreground)]" : "text-[var(--text-soft)]"
            }`}
            href={item.href}
            key={item.label}
          >
            <span className="font-mono text-[13px]">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function MonthlyInvestmentForm({ props }: { props: DashboardShellProps }) {
  return (
    <div className="mt-6 grid gap-4">
      <label className="grid gap-1.5 text-[12px] font-medium text-[var(--text-soft)]">
        Mes
        <input
          className="h-10 rounded-xl border border-[var(--hairline)] bg-white/[0.04] px-3 font-mono text-[12px] text-[var(--foreground)] outline-none focus:border-[rgba(103,232,200,0.45)]"
          onChange={(event) => props.updateMonth(event.target.value)}
          type="month"
          value={props.month}
        />
      </label>

      <div className="grid gap-3">
        <label className="grid gap-1.5 text-[12px] font-medium text-[var(--text-soft)]">
          Fecha de subasta
          <input
            className="h-10 rounded-xl border border-[var(--hairline)] bg-white/[0.04] px-3 font-mono text-[12px] text-[var(--foreground)] outline-none disabled:text-[var(--muted)]"
            disabled={!props.requiresInvestmentDates}
            onChange={(event) => props.setAuctionDate(event.target.value)}
            type="date"
            value={props.auctionDate}
          />
        </label>
      </div>

      <div className="grid gap-3">
        {INSTRUMENT_TYPES.map((instrument) => {
          const supportsTerm = hasBondTermSelection(instrument);
          const amount = Number(props.investmentAmounts[instrument]) || 0;
          const termYears = Number(props.investmentTerms[instrument]) || 10;
          const maturityDate = props.auctionDate ? addYearsIsoDate(props.auctionDate, termYears) : undefined;

          return (
            <div className="grid gap-1.5 text-[12px] font-medium text-[var(--text-soft)]" key={instrument}>
              <span>{INSTRUMENT_LABELS[instrument]}</span>
              <div className={supportsTerm ? "grid gap-2 sm:grid-cols-[1fr_118px]" : "grid"}>
                <input
                  aria-label={`Monto ${INSTRUMENT_LABELS[instrument]}`}
                  className="h-10 rounded-xl border border-[var(--hairline)] bg-white/[0.04] px-3 font-mono text-[12px] text-[var(--foreground)] outline-none focus:border-[rgba(103,232,200,0.45)]"
                  min="0"
                  onChange={(event) =>
                    props.setInvestmentAmounts((current) => ({ ...current, [instrument]: event.target.value }))
                  }
                  type="number"
                  value={props.investmentAmounts[instrument]}
                />
                {supportsTerm ? (
                  <select
                    aria-label={`Plazo ${INSTRUMENT_LABELS[instrument]}`}
                    className="h-10 rounded-xl border border-[var(--hairline)] bg-white/[0.04] px-3 font-mono text-[12px] text-[var(--foreground)] outline-none focus:border-[rgba(103,232,200,0.45)]"
                    onChange={(event) =>
                      props.setInvestmentTerms((current) => ({ ...current, [instrument]: event.target.value }))
                    }
                    value={props.investmentTerms[instrument]}
                  >
                    {BOND_TERM_OPTIONS.map((term) => (
                      <option key={term} value={term}>
                        {term} años
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              {supportsTerm && amount > 0 && maturityDate ? (
                <span className="font-mono text-[10px] text-[var(--muted)]">Vence {formatIsoDate(maturityDate)}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        className="mt-1 h-10 rounded-full bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)]"
        disabled={props.busy === "investment"}
        onClick={props.saveMonthlyInvestment}
        type="button"
      >
        {props.busy === "investment" ? "Guardando" : "Guardar inversión"}
      </button>

      {props.investmentMessage ? (
        <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.04] px-3 py-2 text-[12px] leading-5 text-[var(--text-soft)]">
          {props.investmentMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-[var(--muted)]">
        Snapshot activo: {props.activeSnapshot ? new Date(props.activeSnapshot.fetchedAt).toLocaleString("es-MX") : "N/D"}.
      </div>
    </div>
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

function hasBondTermSelection(instrument: InstrumentType) {
  return instrument === "BONOS" || instrument === "UDIBONOS";
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

function accruedValue(lot: InvestmentLot, asOf: number) {
  const startDate = new Date(lot.date ?? lot.createdAt).getTime();
  const maturityDate = lot.maturityDate ? new Date(lot.maturityDate).getTime() : asOf;
  const endDate = Math.min(asOf, Number.isFinite(maturityDate) ? maturityDate : asOf);
  const elapsedYears = Math.max(0, (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000));

  return lot.amount * (1 + lot.annualRate) ** elapsedYears;
}

function estimateCurrentValue(lots: InvestmentLot[]) {
  const now = Date.now();
  return lots.reduce((sum, lot) => sum + accruedValue(lot, now), 0);
}

/** Valor devengado de la cartera al cierre de cada mes con lotes registrados. */
function buildValueSeries(lots: InvestmentLot[]) {
  const months = Array.from(new Set(lots.map((lot) => lot.month))).sort();
  if (months.length === 0) return [];
  const now = Date.now();

  const series = months.map((month) => {
    const asOf = Math.min(now, endOfMonthTime(month));
    return lots
      .filter((lot) => lot.month <= month)
      .reduce((sum, lot) => sum + accruedValue(lot, asOf), 0);
  });

  return [0, ...series];
}

function endOfMonthTime(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0, 23, 59, 59).getTime();
}

/** Tasas del mismo instrumento/plazo a lo largo de los snapshots guardados. */
function buildRateHistory(snapshots: MarketSnapshot[], instrument: InstrumentType, termYears?: number) {
  return snapshots
    .filter((snapshot) => snapshot.quotes.length > 0)
    .sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt))
    .map((snapshot) => quote(snapshot, instrument, termYears)?.annualRate)
    .filter((rate): rate is number => typeof rate === "number")
    .slice(-10);
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
