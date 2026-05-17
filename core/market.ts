import type { AppSettings, MarketSnapshot } from "./types";

export const CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE = 0.009;

export function createManualMarketSnapshot(settings: AppSettings | undefined): MarketSnapshot | undefined {
  if (
    !settings ||
    typeof settings.manualInflationAnnual !== "number"
  ) {
    return undefined;
  }

  const quotes = [
    typeof settings.manualBonosRate === "number"
      ? {
          instrument: "BONOS" as const,
          annualRate: settings.manualBonosRate,
          termYears: 10,
          source: "Configuración manual",
        }
      : undefined,
    typeof settings.manualUdibonosRate === "number"
      ? {
          instrument: "UDIBONOS" as const,
          annualRate: settings.manualUdibonosRate,
          termYears: 10,
          source: "Configuración manual",
        }
      : undefined,
    typeof settings.manualCetesRate === "number"
      ? {
          instrument: "CETES" as const,
          annualRate: settings.manualCetesRate,
          termYears: 1,
          source: "Configuración manual",
        }
      : undefined,
    typeof settings.manualBonddiaRate === "number"
      ? {
          instrument: "BONDDIA" as const,
          annualRate: settings.manualBonddiaRate,
          termYears: 1,
          source: "Configuración manual",
        }
      : undefined,
  ].filter((quote): quote is NonNullable<typeof quote> => Boolean(quote));

  if (quotes.length === 0) return undefined;

  return {
    id: "manual-settings",
    fetchedAt: settings.updatedAt,
    status: "partial",
    inflationAnnual: settings.manualInflationAnnual,
    provisionalWithholdingRate:
      settings.manualProvisionalWithholdingRate ?? CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE,
    notes: ["Snapshot generado desde Configuración manual porque las fuentes automáticas no están completas."],
    quotes,
  };
}

export function estimateAnnualWithholding(capital: number, annualWithholdingRate: number) {
  return capital * annualWithholdingRate;
}
