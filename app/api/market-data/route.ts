import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { fetchCetesDirectoQuotes } from "@/external/cetes";
import { fetchInflationAnnual } from "@/external/inflation";
import { CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE } from "@/core/market";
import type { MarketSnapshot } from "@/core/types";

export async function GET() {
  const [quotes, inflation] = await Promise.all([fetchCetesDirectoQuotes(), fetchInflationAnnual()]);
  const notes: string[] = [];

  if (quotes.length === 0) {
    notes.push("No se pudieron leer tasas desde CETES Directo. La fuente puede bloquear lecturas automáticas server-side.");
  }

  if (inflation.note) notes.push(inflation.note);

  const snapshot: MarketSnapshot = {
    id: randomUUID(),
    fetchedAt: new Date().toISOString(),
    status: quotes.length > 0 && inflation.inflationAnnual ? "fresh" : quotes.length > 0 ? "partial" : "failed",
    quotes,
    inflationAnnual: inflation.inflationAnnual,
    inpc: inflation.inpc,
    provisionalWithholdingRate: CURRENT_LIF_ARTICLE_24_WITHHOLDING_RATE,
    notes,
  };

  return NextResponse.json(snapshot);
}
