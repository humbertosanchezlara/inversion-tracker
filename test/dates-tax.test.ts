import { describe, expect, it } from "vitest";
import { addYearsIsoDate } from "@/core/dates";
import { estimateTaxDeclarationFromLots, summarizeTaxDeclaration } from "@/core/tax";
import type { InvestmentLot, TaxDeclarationRecord } from "@/core/types";

describe("maturity dates", () => {
  it("adds the investment term to produce a maturity date", () => {
    expect(addYearsIsoDate("2026-05-15", 10)).toBe("2036-05-15");
  });
});

describe("tax declaration tracking", () => {
  it("summarizes annual taxable records", () => {
    const records: TaxDeclarationRecord[] = [
      {
        id: "1",
        fiscalYear: 2026,
        instrument: "BONOS",
        source: "MANUAL",
        nominalInterest: 1000,
        realInterest: 700,
        isrWithheld: 150,
        createdAt: "2026-12-31T00:00:00.000Z",
        updatedAt: "2026-12-31T00:00:00.000Z",
      },
      {
        id: "2",
        fiscalYear: 2026,
        instrument: "UDIBONOS",
        source: "MANUAL",
        nominalInterest: 500,
        realInterest: 500,
        isrWithheld: 75,
        createdAt: "2026-12-31T00:00:00.000Z",
        updatedAt: "2026-12-31T00:00:00.000Z",
      },
    ];

    const summary = summarizeTaxDeclaration(records, 2026);

    expect(summary.nominalInterest).toBe(1500);
    expect(summary.realInterest).toBe(1200);
    expect(summary.isrWithheld).toBe(225);
  });

  it("estimates annual tax values from investment lots", () => {
    const lots: InvestmentLot[] = [
      {
        id: "lot-1",
        month: "2026-01",
        date: "2026-01-01",
        maturityDate: "2036-01-01",
        instrument: "BONOS",
        amount: 10_000,
        annualRate: 0.1,
        inflationRate: 0.04,
        provisionalWithholdingRate: 0.009,
        estimatedAnnualWithholding: 90,
        termYears: 10,
        couponFrequencyMonths: 6,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const summary = estimateTaxDeclarationFromLots(lots, 2026);

    expect(summary.investedCapital).toBe(10_000);
    expect(summary.nominalInterest).toBe(1000);
    expect(summary.inflationAdjustment).toBe(400);
    expect(summary.realInterest).toBe(600);
    expect(summary.isrWithheld).toBe(90);
    expect(summary.lines[0].instrument).toBe("BONOS");
  });

  it("prorates lots that are active for only part of the fiscal year", () => {
    const lots: InvestmentLot[] = [
      {
        id: "lot-1",
        month: "2026-07",
        date: "2026-07-01",
        maturityDate: "2027-07-01",
        instrument: "CETES",
        amount: 36_500,
        annualRate: 0.1,
        inflationRate: 0.04,
        provisionalWithholdingRate: 0.009,
        estimatedAnnualWithholding: 328.5,
        termYears: 1,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ];

    const summary = estimateTaxDeclarationFromLots(lots, 2026);

    expect(summary.nominalInterest).toBeCloseTo(1840, 0);
    expect(summary.realInterest).toBeCloseTo(1104, 0);
    expect(summary.isrWithheld).toBeCloseTo(165.6, 0);
  });

  it("uses the registered month when BONDDIA has no auction or maturity dates", () => {
    const lots: InvestmentLot[] = [
      {
        id: "lot-1",
        month: "2026-05",
        instrument: "BONDDIA",
        amount: 10_000,
        annualRate: 0.08,
        inflationRate: 0.04,
        provisionalWithholdingRate: 0.009,
        estimatedAnnualWithholding: 90,
        termYears: 1,
        createdAt: "2026-05-01T00:00:00.000Z",
      },
    ];

    const summary = estimateTaxDeclarationFromLots(lots, 2026);

    expect(summary.lines[0].instrument).toBe("BONDDIA");
    expect(summary.nominalInterest).toBeGreaterThan(0);
    expect(summary.nominalInterest).toBeLessThan(800);
  });
});
