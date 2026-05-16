import { describe, expect, it } from "vitest";
import { projectPortfolio, summarizeProjection } from "@/core/projection";
import type { InvestmentLot } from "@/core/types";

const baseLot: InvestmentLot = {
  id: "lot-1",
  month: "2026-05",
  date: "2026-05-01",
  maturityDate: "2036-05-01",
  instrument: "BONOS",
  amount: 10_000,
  annualRate: 0.08,
  inflationRate: 0.04,
  provisionalWithholdingRate: 0.009,
  estimatedAnnualWithholding: 90,
  termYears: 10,
  couponFrequencyMonths: 6,
  createdAt: "2026-05-01T00:00:00.000Z",
};

describe("projection engine", () => {
  it("projects coupon reinvestment by year", () => {
    const points = projectPortfolio([baseLot], 10);

    expect(points).toHaveLength(10);
    expect(points[0].contributed).toBe(10_000);
    expect(points[0].nominalBalance).toBeGreaterThan(10_000);
    expect(points[9].nominalBalance).toBeGreaterThan(points[0].nominalBalance);
  });

  it("discounts nominal balances into real pesos", () => {
    const [point] = projectPortfolio([baseLot], 1);

    expect(point.realBalance).toBeLessThan(point.nominalBalance);
  });

  it("produces growing summaries for positive rates", () => {
    const summaries = summarizeProjection([baseLot], [10, 15, 20]);

    expect(summaries[1].nominalBalance).toBeGreaterThan(summaries[0].nominalBalance);
    expect(summaries[2].nominalBalance).toBeGreaterThan(summaries[1].nominalBalance);
  });

  it("handles empty portfolios", () => {
    const summaries = summarizeProjection([], [10]);

    expect(summaries[0].contributed).toBe(0);
    expect(summaries[0].realBalance).toBe(0);
  });
});
