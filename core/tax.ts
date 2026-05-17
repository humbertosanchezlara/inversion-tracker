import { INSTRUMENT_TYPES } from "./types";
import type {
  InvestmentLot,
  TaxDeclarationEstimateLine,
  TaxDeclarationEstimateSummary,
  TaxDeclarationRecord,
  TaxDeclarationSummary,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function summarizeTaxDeclaration(records: TaxDeclarationRecord[], fiscalYear: number): TaxDeclarationSummary {
  const filtered = records.filter((record) => record.fiscalYear === fiscalYear);

  return filtered.reduce<TaxDeclarationSummary>(
    (summary, record) => ({
      fiscalYear,
      nominalInterest: summary.nominalInterest + record.nominalInterest,
      realInterest: summary.realInterest + record.realInterest,
      isrWithheld: summary.isrWithheld + record.isrWithheld,
      records: [...summary.records, record],
    }),
    {
      fiscalYear,
      nominalInterest: 0,
      realInterest: 0,
      isrWithheld: 0,
      records: [],
    },
  );
}

function utcDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysInFiscalYear(fiscalYear: number) {
  const start = Date.UTC(fiscalYear, 0, 1);
  const next = Date.UTC(fiscalYear + 1, 0, 1);
  return Math.round((next - start) / MS_PER_DAY);
}

function activeDaysInYear(lot: InvestmentLot, fiscalYear: number) {
  const yearStart = Date.UTC(fiscalYear, 0, 1);
  const yearEnd = Date.UTC(fiscalYear, 11, 31);
  const lotStart = utcDate(lot.date);
  const lotEnd = lot.maturityDate ? utcDate(lot.maturityDate) : yearEnd;
  const start = Math.max(yearStart, lotStart);
  const end = Math.min(yearEnd, lotEnd);

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;

  return Math.round((end - start) / MS_PER_DAY) + 1;
}

export function estimateTaxDeclarationFromLots(
  lots: InvestmentLot[],
  fiscalYear: number,
): TaxDeclarationEstimateSummary {
  const yearDays = daysInFiscalYear(fiscalYear);
  const linesByInstrument = new Map(
    INSTRUMENT_TYPES.map((instrument) => [
      instrument,
      {
        fiscalYear,
        instrument,
        lotsCount: 0,
        investedCapital: 0,
        nominalInterest: 0,
        inflationAdjustment: 0,
        realInterest: 0,
        isrWithheld: 0,
      } satisfies TaxDeclarationEstimateLine,
    ]),
  );

  for (const lot of lots) {
    const activeDays = activeDaysInYear(lot, fiscalYear);
    if (activeDays === 0) continue;

    const yearShare = activeDays / yearDays;
    const nominalInterest = lot.amount * lot.annualRate * yearShare;
    const inflationAdjustment = lot.amount * lot.inflationRate * yearShare;
    const isrWithheld = (lot.estimatedAnnualWithholding ?? lot.amount * lot.provisionalWithholdingRate) * yearShare;
    const line = linesByInstrument.get(lot.instrument);
    if (!line) continue;

    line.lotsCount += 1;
    line.investedCapital += lot.amount * yearShare;
    line.nominalInterest += nominalInterest;
    line.inflationAdjustment += inflationAdjustment;
    line.realInterest += Math.max(nominalInterest - inflationAdjustment, 0);
    line.isrWithheld += isrWithheld;
  }

  const lines = [...linesByInstrument.values()].filter(
    (line) =>
      line.lotsCount > 0 ||
      line.investedCapital > 0 ||
      line.nominalInterest > 0 ||
      line.realInterest > 0 ||
      line.isrWithheld > 0,
  );

  return lines.reduce<TaxDeclarationEstimateSummary>(
    (summary, line) => ({
      fiscalYear,
      investedCapital: summary.investedCapital + line.investedCapital,
      nominalInterest: summary.nominalInterest + line.nominalInterest,
      inflationAdjustment: summary.inflationAdjustment + line.inflationAdjustment,
      realInterest: summary.realInterest + line.realInterest,
      isrWithheld: summary.isrWithheld + line.isrWithheld,
      lines: [...summary.lines, line],
    }),
    {
      fiscalYear,
      investedCapital: 0,
      nominalInterest: 0,
      inflationAdjustment: 0,
      realInterest: 0,
      isrWithheld: 0,
      lines: [],
    },
  );
}
