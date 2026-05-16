import type { InstrumentType, MarketInstrumentQuote } from "@/core/types";

const CETES_URLS: Record<InstrumentType, string> = {
  BONOS: "https://www.cetesdirecto.com/tablas/valores_gubernamentales/bonos.html",
  UDIBONOS: "https://www.cetesdirecto.com/tablas/valores_gubernamentales/udibonos.html",
  CETES: "https://www.cetesdirecto.com/tablas/valores_gubernamentales/cetes.html",
  BONDDIA: "https://www.cetesdirecto.com/tablas/valores_gubernamentales/bonddia.html",
};

function parsePercent(raw: string) {
  const normalized = raw.replace("%", "").replace(",", ".").trim();
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value / 100 : undefined;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCetesDirectoQuote(html: string, instrument: InstrumentType): MarketInstrumentQuote | null {
  if (/Web Application Firewall|This transfer is blocked/i.test(html)) {
    return null;
  }

  const text = stripHtml(html);
  const rates = [...text.matchAll(/(\d{1,2}(?:[.,]\d{1,4})?)\s*%/g)]
    .map((match) => parsePercent(match[1]))
    .filter((value): value is number => typeof value === "number");

  if (rates.length === 0) return null;

  const likelyRate = rates.find((rate) => rate > 0.01 && rate < 0.2) ?? rates[0];
  return {
    instrument,
    annualRate: likelyRate,
    termYears: instrument === "BONOS" || instrument === "UDIBONOS" ? 10 : undefined,
    source: "CETES Directo",
    sourceUrl: CETES_URLS[instrument],
  };
}

export async function fetchCetesDirectoQuotes() {
  const instruments: InstrumentType[] = ["BONOS", "UDIBONOS", "CETES", "BONDDIA"];
  const results = await Promise.allSettled(
    instruments.map(async (instrument) => {
      const response = await fetch(CETES_URLS[instrument], {
        cache: "no-store",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 retirement-bonds-tracker",
        },
      });
      const html = await response.text();
      return parseCetesDirectoQuote(html, instrument);
    }),
  );

  return results
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((quote): quote is MarketInstrumentQuote => Boolean(quote));
}
