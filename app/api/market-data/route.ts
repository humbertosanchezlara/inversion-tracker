import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { fetchBanxicoMarketData } from "@/external/banxico";
import { fetchCetesDirectoQuotes } from "@/external/cetes";
import { fetchInflationAnnual } from "@/external/inflation";
import { CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE } from "@/core/market";
import type { MarketSnapshot } from "@/core/types";

export async function GET() {
  const [banxico, cetesQuotes, inegiInflation] = await Promise.all([
    fetchBanxicoMarketData(),
    fetchCetesDirectoQuotes(),
    fetchInflationAnnual(),
  ]);
  const notes: string[] = [];
  const quotes = banxico.quotes.length > 0 ? banxico.quotes : cetesQuotes;
  const inflationAnnual = banxico.inflationAnnual ?? inegiInflation.inflationAnnual;
  const inpc = banxico.inpc ?? inegiInflation.inpc;

  if (quotes.length === 0) {
    notes.push("No se pudieron leer tasas desde Banxico ni CETES Directo.");
  }

  if (banxico.notes.length > 0) notes.push(...banxico.notes);
  if (!banxico.inflationAnnual && inegiInflation.note) notes.push(inegiInflation.note);

  const snapshot: MarketSnapshot = {
    id: randomUUID(),
    fetchedAt: new Date().toISOString(),
    status: quotes.length > 0 && inflationAnnual ? "fresh" : quotes.length > 0 ? "partial" : "failed",
    quotes,
    inflationAnnual,
    inpc,
    provisionalWithholdingRate: CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE,
    notes,
  };

  return NextResponse.json(snapshot);
}
