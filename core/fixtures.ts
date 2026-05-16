import type { MarketSnapshot } from "./types";

export const FALLBACK_MARKET_SNAPSHOT: MarketSnapshot = {
  id: "fallback-2026-05-14",
  fetchedAt: "2026-05-14T18:00:00.000Z",
  status: "partial",
  inflationAnnual: 0.0445,
  provisionalWithholdingRate: 0.009,
  notes: [
    "Snapshot inicial de referencia para desarrollo local. Reemplazar con datos automáticos antes de tomar decisiones.",
    "CETES Directo puede bloquear lecturas server-side con WAF; la app marca ese estado y no inventa datos frescos.",
  ],
  quotes: [
    {
      instrument: "UDIBONOS",
      annualRate: 0.0461,
      termYears: 10,
      source: "CETES Directo referencia 2026-05-14",
      sourceUrl: "https://www.cetesdirecto.com/tablas/valores_gubernamentales/udibonos.html",
    },
    {
      instrument: "BONOS",
      annualRate: 0.0888,
      termYears: 10,
      source: "CETES Directo referencia 2026-05-14",
      sourceUrl: "https://www.cetesdirecto.com/tablas/valores_gubernamentales/bonos.html",
    },
  ],
};
