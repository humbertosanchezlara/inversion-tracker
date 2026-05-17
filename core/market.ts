export const CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE = 0.009;

export function estimateAnnualWithholding(capital: number, annualWithholdingRate: number) {
  return capital * annualWithholdingRate;
}
