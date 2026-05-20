"use client";

import type { Dispatch, SetStateAction } from "react";
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
  summaries: ProjectionSummary[];
  taxInstrument: TaxDeclarationRecord["instrument"];
  taxNotes: string;
  totalInvested: number;
  updateMonth: (nextMonth: string) => void;
  upcomingMaturities: Array<InvestmentLot & { maturityDate: string }>;
};

export default function DashboardShell(_props: DashboardShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[220px] shrink-0 border-r border-[var(--hairline)] bg-[var(--background-2)]/80 lg:block" />
        <section className="flex min-w-0 flex-1 flex-col gap-[14px] px-4 py-5 md:px-8 md:py-6">
          <div className="h-[58px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
          <div className="grid gap-[14px] xl:grid-cols-[1fr_2.4fr]">
            <div className="min-h-[196px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
            <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="min-h-[196px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl"
                  key={index}
                />
              ))}
            </div>
          </div>
          <div className="min-h-[440px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] backdrop-blur-2xl" />
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
    </main>
  );
}
