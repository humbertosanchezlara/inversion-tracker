import { describe, expect, it } from "vitest";
import { effectiveTermYears, hasTermMismatch, lotTermYears, normalizeLot } from "@/core/lots";
import type { InvestmentLot } from "@/core/types";

function makeLot(overrides: Partial<InvestmentLot> = {}): InvestmentLot {
  return {
    id: "lot-1",
    month: "2026-06",
    date: "2026-06-23",
    maturityDate: "2036-06-23",
    instrument: "BONOS",
    amount: 4500,
    annualRate: 0.0973,
    inflationRate: 0.042,
    provisionalWithholdingRate: 0.009,
    estimatedAnnualWithholding: 40.5,
    termYears: 10,
    couponFrequencyMonths: 6,
    createdAt: "2026-06-22T18:20:09.000Z",
    ...overrides,
  };
}

describe("lotTermYears", () => {
  it("defaults bonds to 10 years and short instruments to 1", () => {
    expect(lotTermYears("BONOS")).toBe(10);
    expect(lotTermYears("UDIBONOS")).toBe(10);
    expect(lotTermYears("CETES")).toBe(1);
    expect(lotTermYears("BONDDIA")).toBe(1);
  });

  it("prefers the quoted term when there is one", () => {
    expect(lotTermYears("BONOS", 30)).toBe(30);
  });
});

describe("normalizeLot", () => {
  it("derives missing dates from the registered month and term", () => {
    const lot = normalizeLot(makeLot({ date: undefined, maturityDate: undefined, termYears: 3 }));

    expect(lot.date).toBe("2026-06-01");
    expect(lot.maturityDate).toBe("2029-06-01");
  });

  it("leaves BONDDIA without auction or maturity dates", () => {
    const lot = normalizeLot(makeLot({ instrument: "BONDDIA", date: undefined, maturityDate: undefined }));

    expect(lot.date).toBeUndefined();
    expect(lot.maturityDate).toBeUndefined();
  });

  it("keeps dates that were already stored", () => {
    const lot = normalizeLot(makeLot());

    expect(lot.date).toBe("2026-06-23");
    expect(lot.maturityDate).toBe("2036-06-23");
  });
});

describe("hasTermMismatch", () => {
  it("is false when the maturity equals auction plus term", () => {
    expect(hasTermMismatch(makeLot())).toBe(false);
  });

  it("flags lots whose stored maturity does not match the declared term", () => {
    const lot = makeLot({ date: "2026-05-26", maturityDate: "2034-08-24", termYears: 10 });

    expect(hasTermMismatch(lot)).toBe(true);
    expect(effectiveTermYears(lot)).toBeCloseTo(8.25, 2);
  });

  it("tolerates the few days that settlement shifts a maturity", () => {
    const cetes = makeLot({ instrument: "CETES", date: "2026-05-26", maturityDate: "2027-05-27", termYears: 1 });

    expect(hasTermMismatch(cetes)).toBe(false);
  });

  it("ignores lots without dates, like BONDDIA", () => {
    expect(hasTermMismatch(makeLot({ date: undefined, maturityDate: undefined }))).toBe(false);
  });
});
