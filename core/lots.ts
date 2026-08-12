import { addYearsIsoDate, firstDayOfMonth } from "./dates";
import { CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE, estimateAnnualWithholding } from "./market";
import type { InstrumentType, InvestmentLot } from "./types";

export function lotTermYears(instrument: InstrumentType, quoteTermYears?: number) {
  if (instrument === "BONOS" || instrument === "UDIBONOS") return quoteTermYears ?? 10;
  return quoteTermYears ?? 1;
}

/** Completa lotes viejos que se guardaron antes de que existieran fechas y retención. */
export function normalizeLot(lot: InvestmentLot): InvestmentLot {
  const provisionalWithholdingRate = lot.provisionalWithholdingRate ?? CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE;
  const fallbackDate = firstDayOfMonth(lot.month);
  const date = lot.date ?? (lot.instrument === "BONDDIA" ? undefined : fallbackDate);

  return {
    ...lot,
    date,
    maturityDate:
      lot.maturityDate ||
      (lot.instrument === "BONDDIA"
        ? undefined
        : addYearsIsoDate(date ?? fallbackDate, lotTermYears(lot.instrument, lot.termYears))),
    provisionalWithholdingRate,
    estimatedAnnualWithholding:
      lot.estimatedAnnualWithholding ?? estimateAnnualWithholding(lot.amount, provisionalWithholdingRate),
  };
}

/** Debajo de este margen la diferencia es liquidación de subasta, no otro plazo. */
const TERM_MISMATCH_TOLERANCE_DAYS = 45;

/**
 * Los lotes capturados antes del selector de plazo guardaron el vencimiento real del
 * instrumento, que no siempre coincide con `subasta + termYears`. Detectarlo importa
 * porque la proyección usa termYears y el cálculo fiscal usa maturityDate.
 */
export function hasTermMismatch(lot: InvestmentLot) {
  if (!lot.date || !lot.maturityDate) return false;

  const expected = new Date(`${addYearsIsoDate(lot.date, lot.termYears)}T00:00:00.000Z`).getTime();
  const actual = new Date(`${lot.maturityDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;

  return Math.abs(actual - expected) / (24 * 60 * 60 * 1000) > TERM_MISMATCH_TOLERANCE_DAYS;
}

/** Años reales entre subasta y vencimiento, según las fechas guardadas. */
export function effectiveTermYears(lot: InvestmentLot) {
  if (!lot.date || !lot.maturityDate) return lot.termYears;
  const start = new Date(`${lot.date}T00:00:00.000Z`).getTime();
  const end = new Date(`${lot.maturityDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return lot.termYears;

  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}
