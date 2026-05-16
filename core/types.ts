export type InstrumentType = "BONOS" | "UDIBONOS" | "CETES" | "BONDDIA";

export type InvestmentLot = {
  id: string;
  month: string;
  date: string;
  maturityDate: string;
  instrument: "BONOS" | "UDIBONOS";
  amount: number;
  annualRate: number;
  inflationRate: number;
  provisionalWithholdingRate: number;
  estimatedAnnualWithholding: number;
  termYears: number;
  couponFrequencyMonths: 6;
  sourceSnapshotId?: string;
  createdAt: string;
};

export type TaxDeclarationRecord = {
  id: string;
  fiscalYear: number;
  instrument: InstrumentType;
  source: "CETES_DIRECTO" | "MANUAL";
  nominalInterest: number;
  realInterest: number;
  isrWithheld: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketInstrumentQuote = {
  instrument: InstrumentType;
  annualRate: number;
  termYears?: number;
  termLabel?: string;
  source: string;
  sourceUrl?: string;
};

export type MarketSnapshot = {
  id: string;
  fetchedAt: string;
  status: "fresh" | "partial" | "failed";
  quotes: MarketInstrumentQuote[];
  inflationAnnual?: number;
  inpc?: number;
  provisionalWithholdingRate?: number;
  notes: string[];
};

export type AppSettings = {
  id: "default";
  updatedAt: string;
  manualBonosRate?: number;
  manualUdibonosRate?: number;
  manualInflationAnnual?: number;
  manualProvisionalWithholdingRate?: number;
};

export type ProjectionPoint = {
  year: number;
  contributed: number;
  nominalBalance: number;
  realBalance: number;
  couponsReinvested: number;
};

export type ProjectionSummary = {
  horizonYears: number;
  contributed: number;
  nominalBalance: number;
  realBalance: number;
  nominalReturn: number;
  realReturn: number;
};

export type TaxDeclarationSummary = {
  fiscalYear: number;
  nominalInterest: number;
  realInterest: number;
  isrWithheld: number;
  records: TaxDeclarationRecord[];
};

export type MonthlyAnalysis = {
  id: string;
  month: string;
  createdAt: string;
  recommendation:
    | "maintain_60_40"
    | "adjust_mix"
    | "consider_other_gov_instrument";
  targetAllocation: Record<InstrumentType, number>;
  confidence: "low" | "medium" | "high";
  rationale: string[];
  risks: string[];
  dataUsed: string[];
  macroSummary?: string[];
  curveSummary?: string[];
  portfolioSummary?: string[];
  actionItems?: string[];
  watchConditions?: string[];
  notFinancialAdvice: true;
};
