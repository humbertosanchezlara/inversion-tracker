import { describe, expect, it } from "vitest";
import { addYearsIsoDate } from "@/core/dates";
import { summarizeTaxDeclaration } from "@/core/tax";
import type { TaxDeclarationRecord } from "@/core/types";

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
});
