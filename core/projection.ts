import type { InvestmentLot, ProjectionPoint, ProjectionSummary } from "./types";

const MONTHS_PER_YEAR = 12;

function compoundMonthly(value: number, annualRate: number, months: number) {
  return value * (1 + annualRate / MONTHS_PER_YEAR) ** months;
}

function realDiscountFactor(inflationRate: number, years: number) {
  return (1 + inflationRate) ** years;
}

export function projectLot(lot: InvestmentLot, horizonYears: number): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  if (!lot.couponFrequencyMonths) {
    for (let year = 1; year <= horizonYears; year += 1) {
      const nominalBalance = compoundMonthly(lot.amount, lot.annualRate, year * MONTHS_PER_YEAR);
      points.push({
        year,
        contributed: lot.amount,
        nominalBalance,
        realBalance: nominalBalance / realDiscountFactor(lot.inflationRate, year),
        couponsReinvested: 0,
      });
    }

    return points;
  }

  const couponRate = lot.annualRate / 2;
  const couponPeriods = Math.floor((horizonYears * MONTHS_PER_YEAR) / lot.couponFrequencyMonths);
  let principal = lot.amount;
  let reinvestedCoupons = 0;

  for (let period = 1; period <= couponPeriods; period += 1) {
    const coupon = principal * couponRate;
    const monthsRemaining = horizonYears * MONTHS_PER_YEAR - period * lot.couponFrequencyMonths;
    reinvestedCoupons += compoundMonthly(coupon, lot.annualRate, monthsRemaining);
  }

  for (let year = 1; year <= horizonYears; year += 1) {
    const elapsedMonths = year * MONTHS_PER_YEAR;
    const elapsedPeriods = Math.floor(elapsedMonths / lot.couponFrequencyMonths);
    let couponsAtYear = 0;

    for (let period = 1; period <= elapsedPeriods; period += 1) {
      const coupon = principal * couponRate;
      const monthsRemaining = elapsedMonths - period * lot.couponFrequencyMonths;
      couponsAtYear += compoundMonthly(coupon, lot.annualRate, monthsRemaining);
    }

    const nominalBalance = principal + couponsAtYear;
    points.push({
      year,
      contributed: lot.amount,
      nominalBalance,
      realBalance: nominalBalance / realDiscountFactor(lot.inflationRate, year),
      couponsReinvested: couponsAtYear,
    });
  }

  const finalPoint = points[points.length - 1];
  if (finalPoint) {
    finalPoint.couponsReinvested = reinvestedCoupons;
  }

  return points;
}

export function projectPortfolio(lots: InvestmentLot[], horizonYears: number): ProjectionPoint[] {
  const empty = Array.from({ length: horizonYears }, (_, index) => ({
    year: index + 1,
    contributed: 0,
    nominalBalance: 0,
    realBalance: 0,
    couponsReinvested: 0,
  }));

  return lots.reduce((acc, lot) => {
    const projected = projectLot(lot, horizonYears);
    return acc.map((point, index) => ({
      year: point.year,
      contributed: point.contributed + projected[index].contributed,
      nominalBalance: point.nominalBalance + projected[index].nominalBalance,
      realBalance: point.realBalance + projected[index].realBalance,
      couponsReinvested: point.couponsReinvested + projected[index].couponsReinvested,
    }));
  }, empty);
}

export function summarizeProjection(lots: InvestmentLot[], horizons = [10, 15, 20, 25, 30]): ProjectionSummary[] {
  return horizons.map((horizonYears) => {
    const projection = projectPortfolio(lots, horizonYears);
    const point = projection[projection.length - 1];
    const contributed = point?.contributed ?? 0;
    const nominalBalance = point?.nominalBalance ?? 0;
    const realBalance = point?.realBalance ?? 0;

    return {
      horizonYears,
      contributed,
      nominalBalance,
      realBalance,
      nominalReturn: nominalBalance - contributed,
      realReturn: realBalance - contributed,
    };
  });
}
