export type InstrumentType = "BONOS" | "UDIBONOS" | "CETES" | "BONDDIA";

export const INSTRUMENT_TYPES = ["BONOS", "UDIBONOS", "CETES", "BONDDIA"] as const satisfies InstrumentType[];

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  BONOS: "BONOS",
  UDIBONOS: "UDIBONOS",
  CETES: "CETES",
  BONDDIA: "BONDDIA",
};

export type InvestmentLot = {
  id: string;
  month: string;
  date?: string;
  maturityDate?: string;
  instrument: InstrumentType;
  amount: number;
  annualRate: number;
  inflationRate: number;
  provisionalWithholdingRate: number;
  estimatedAnnualWithholding: number;
  termYears: number;
  couponFrequencyMonths?: 6;
  sourceSnapshotId?: string;
  createdAt: string;
};

export type AssetMovementKind = "DEPOSIT" | "BUY" | "SELL" | "WITHDRAWAL" | "NONE";

export const ASSET_MOVEMENT_KINDS = [
  "DEPOSIT",
  "BUY",
  "SELL",
  "WITHDRAWAL",
  "NONE",
] as const satisfies AssetMovementKind[];

export const ASSET_MOVEMENT_LABELS: Record<AssetMovementKind, string> = {
  DEPOSIT: "Depósito",
  BUY: "Compra",
  SELL: "Venta",
  WITHDRAWAL: "Retiro",
  NONE: "Sin movimientos",
};

/**
 * Movimiento fuera del universo gubernamental (cripto, efectivo en exchange).
 * Deliberadamente separado de InvestmentLot: no tiene plazo, vencimiento, cupón ni
 * retención Art. 24 LIF, y no entra a proyección, estimación fiscal ni análisis IA.
 */
export type AssetMovement = {
  id: string;
  month: string;
  occurredAt?: string;
  kind: AssetMovementKind;
  asset?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  /** Moneda en que se liquidó el movimiento: MXN, USD, etc. */
  quoteCurrency: string;
  feeAmount?: number;
  feeAsset?: string;
  venue?: string;
  notes?: string;
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

export type TaxDeclarationEstimateLine = {
  fiscalYear: number;
  instrument: InstrumentType;
  lotsCount: number;
  investedCapital: number;
  nominalInterest: number;
  inflationAdjustment: number;
  realInterest: number;
  isrWithheld: number;
};

export type TaxDeclarationEstimateSummary = {
  fiscalYear: number;
  investedCapital: number;
  nominalInterest: number;
  inflationAdjustment: number;
  realInterest: number;
  isrWithheld: number;
  lines: TaxDeclarationEstimateLine[];
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
