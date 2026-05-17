"use client";

import type { AppSettings, InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";
import { supabase } from "@/lib/supabaseClient";

function isUuid(value?: string) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function fromLot(row: Record<string, unknown>): InvestmentLot {
  return {
    id: String(row.id),
    month: String(row.month),
    date: String(row.investment_date),
    maturityDate: String(row.maturity_date),
    instrument: row.instrument as InvestmentLot["instrument"],
    amount: Number(row.amount),
    annualRate: Number(row.annual_rate),
    inflationRate: Number(row.inflation_rate),
    provisionalWithholdingRate: Number(row.provisional_withholding_rate),
    estimatedAnnualWithholding: Number(row.estimated_annual_withholding),
    termYears: Number(row.term_years),
    couponFrequencyMonths: row.coupon_frequency_months === null ? undefined : 6,
    sourceSnapshotId: row.source_snapshot_id ? String(row.source_snapshot_id) : undefined,
    createdAt: String(row.created_at),
  };
}

function toLot(userId: string, lot: InvestmentLot) {
  return {
    id: lot.id,
    user_id: userId,
    month: lot.month,
    investment_date: lot.date,
    maturity_date: lot.maturityDate,
    instrument: lot.instrument,
    amount: lot.amount,
    annual_rate: lot.annualRate,
    inflation_rate: lot.inflationRate,
    provisional_withholding_rate: lot.provisionalWithholdingRate,
    estimated_annual_withholding: lot.estimatedAnnualWithholding,
    term_years: lot.termYears,
    coupon_frequency_months: lot.couponFrequencyMonths ?? null,
    source_snapshot_id: isUuid(lot.sourceSnapshotId) ? lot.sourceSnapshotId : null,
    created_at: lot.createdAt,
  };
}

function fromSnapshot(row: Record<string, unknown>): MarketSnapshot {
  return {
    id: String(row.id),
    fetchedAt: String(row.fetched_at),
    status: row.status as MarketSnapshot["status"],
    quotes: (row.quotes ?? []) as MarketSnapshot["quotes"],
    inflationAnnual: row.inflation_annual === null ? undefined : Number(row.inflation_annual),
    inpc: row.inpc === null ? undefined : Number(row.inpc),
    provisionalWithholdingRate:
      row.provisional_withholding_rate === null ? undefined : Number(row.provisional_withholding_rate),
    notes: (row.notes ?? []) as string[],
  };
}

function toSnapshot(userId: string, snapshot: MarketSnapshot) {
  return {
    id: snapshot.id,
    user_id: userId,
    fetched_at: snapshot.fetchedAt,
    status: snapshot.status,
    quotes: snapshot.quotes,
    inflation_annual: snapshot.inflationAnnual ?? null,
    inpc: snapshot.inpc ?? null,
    provisional_withholding_rate: snapshot.provisionalWithholdingRate ?? null,
    notes: snapshot.notes,
  };
}

function fromAnalysis(row: Record<string, unknown>): MonthlyAnalysis {
  return {
    id: String(row.id),
    month: String(row.month),
    createdAt: String(row.created_at),
    recommendation: row.recommendation as MonthlyAnalysis["recommendation"],
    targetAllocation: row.target_allocation as MonthlyAnalysis["targetAllocation"],
    confidence: row.confidence as MonthlyAnalysis["confidence"],
    rationale: (row.rationale ?? []) as string[],
    risks: (row.risks ?? []) as string[],
    dataUsed: (row.data_used ?? []) as string[],
    macroSummary: (row.macro_summary ?? []) as string[],
    curveSummary: (row.curve_summary ?? []) as string[],
    portfolioSummary: (row.portfolio_summary ?? []) as string[],
    actionItems: (row.action_items ?? []) as string[],
    watchConditions: (row.watch_conditions ?? []) as string[],
    notFinancialAdvice: true,
  };
}

function toAnalysis(userId: string, analysis: MonthlyAnalysis) {
  return {
    id: analysis.id,
    user_id: userId,
    month: analysis.month,
    created_at: analysis.createdAt,
    recommendation: analysis.recommendation,
    target_allocation: analysis.targetAllocation,
    confidence: analysis.confidence,
    rationale: analysis.rationale,
    risks: analysis.risks,
    data_used: analysis.dataUsed,
    macro_summary: analysis.macroSummary ?? [],
    curve_summary: analysis.curveSummary ?? [],
    portfolio_summary: analysis.portfolioSummary ?? [],
    action_items: analysis.actionItems ?? [],
    watch_conditions: analysis.watchConditions ?? [],
    not_financial_advice: analysis.notFinancialAdvice,
  };
}

function fromTaxRecord(row: Record<string, unknown>): TaxDeclarationRecord {
  return {
    id: String(row.id),
    fiscalYear: Number(row.fiscal_year),
    instrument: row.instrument as TaxDeclarationRecord["instrument"],
    source: row.source as TaxDeclarationRecord["source"],
    nominalInterest: Number(row.nominal_interest),
    realInterest: Number(row.real_interest),
    isrWithheld: Number(row.isr_withheld),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toTaxRecord(userId: string, record: TaxDeclarationRecord) {
  return {
    id: record.id,
    user_id: userId,
    fiscal_year: record.fiscalYear,
    instrument: record.instrument,
    source: record.source,
    nominal_interest: record.nominalInterest,
    real_interest: record.realInterest,
    isr_withheld: record.isrWithheld,
    notes: record.notes ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function fromSettings(row?: Record<string, unknown> | null): AppSettings | undefined {
  if (!row) return undefined;
  const optionalNumber = (value: unknown) => value === null || typeof value === "undefined" ? undefined : Number(value);

  return {
    id: "default",
    updatedAt: String(row.updated_at),
    manualBonosRate: optionalNumber(row.manual_bonos_rate),
    manualUdibonosRate: optionalNumber(row.manual_udibonos_rate),
    manualCetesRate: optionalNumber(row.manual_cetes_rate),
    manualBonddiaRate: optionalNumber(row.manual_bonddia_rate),
    manualInflationAnnual: optionalNumber(row.manual_inflation_annual),
    manualProvisionalWithholdingRate: optionalNumber(row.manual_provisional_withholding_rate),
  };
}

function toSettings(userId: string, settings: AppSettings) {
  return {
    user_id: userId,
    updated_at: settings.updatedAt,
    manual_bonos_rate: settings.manualBonosRate ?? null,
    manual_udibonos_rate: settings.manualUdibonosRate ?? null,
    manual_cetes_rate: settings.manualCetesRate ?? null,
    manual_bonddia_rate: settings.manualBonddiaRate ?? null,
    manual_inflation_annual: settings.manualInflationAnnual ?? null,
    manual_provisional_withholding_rate: settings.manualProvisionalWithholdingRate ?? null,
  };
}

export async function loadCloudData(userId: string) {
  const [lots, snapshots, analyses, taxRecords, settings] = await Promise.all([
    supabase.from("investment_lots").select("*").eq("user_id", userId).order("investment_date", { ascending: false }),
    supabase.from("market_snapshots").select("*").eq("user_id", userId).order("fetched_at", { ascending: false }),
    supabase.from("monthly_analyses").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("tax_declaration_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("app_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  for (const result of [lots, snapshots, analyses, taxRecords, settings]) {
    if (result.error) throw result.error;
  }

  return {
    lots: (lots.data ?? []).map(fromLot),
    snapshots: (snapshots.data ?? []).map(fromSnapshot),
    analyses: (analyses.data ?? []).map(fromAnalysis),
    taxRecords: (taxRecords.data ?? []).map(fromTaxRecord),
    settings: fromSettings(settings.data),
  };
}

export async function saveInvestmentLots(userId: string, lots: InvestmentLot[]) {
  const { error } = await supabase.from("investment_lots").upsert(lots.map((lot) => toLot(userId, lot)));
  if (error) throw error;
}

export async function saveMarketSnapshot(userId: string, snapshot: MarketSnapshot) {
  const { error } = await supabase.from("market_snapshots").upsert(toSnapshot(userId, snapshot));
  if (error) throw error;
}

export async function saveMonthlyAnalysis(userId: string, analysis: MonthlyAnalysis) {
  const { error } = await supabase.from("monthly_analyses").upsert(toAnalysis(userId, analysis));
  if (error) throw error;
}

export async function saveTaxDeclarationRecord(userId: string, record: TaxDeclarationRecord) {
  const { error } = await supabase.from("tax_declaration_records").upsert(toTaxRecord(userId, record));
  if (error) throw error;
}

export async function saveAppSettings(userId: string, settings: AppSettings) {
  const { error } = await supabase.from("app_settings").upsert(toSettings(userId, settings));
  if (error) throw error;
}
