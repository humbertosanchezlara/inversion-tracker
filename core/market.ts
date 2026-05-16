import type { AppSettings, MarketSnapshot } from "./types";

export const CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE = 0.009;

export function createManualMarketSnapshot(settings: AppSettings | undefined): MarketSnapshot | undefined {
  if (
    typeof settings?.manualBonosRate !== "number" ||
    typeof settings.manualUdibonosRate !== "number" ||
    typeof settings.manualInflationAnnual !== "number"
  ) {
    return undefined;
  }

  return {
    id: "manual-settings",
    fetchedAt: settings.updatedAt,
    status: "partial",
    inflationAnnual: settings.manualInflationAnnual,
    provisionalWithholdingRate:
      settings.manualProvisionalWithholdingRate ?? CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE,
    notes: ["Snapshot generado desde Configuración manual porque las fuentes automáticas no están completas."],
    quotes: [
      {
        instrument: "BONOS",
        annualRate: settings.manualBonosRate,
        termYears: 10,
        source: "Configuración manual",
      },
      {
        instrument: "UDIBONOS",
        annualRate: settings.manualUdibonosRate,
        termYears: 10,
        source: "Configuración manual",
      },
    ],
  };
}

export function estimateAnnualWithholding(capital: number, annualWithholdingRate: number) {
  return capital * annualWithholdingRate;
}
