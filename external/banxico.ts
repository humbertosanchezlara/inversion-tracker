import type { MarketInstrumentQuote } from "@/core/types";

type BanxicoSeriesResponse = {
  bmx?: {
    series?: Array<{
      idSerie: string;
      titulo: string;
      datos?: Array<{
        fecha: string;
        dato: string;
      }>;
    }>;
  };
};

const BANXICO_SERIES = {
  CETES_28: "SF43936",
  BONOS_10: "SF44071",
  UDIBONOS_10: "SF43924",
  INPC: "SP1",
};

function parseBanxicoNumber(value?: string) {
  if (!value || value === "N/E") return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBanxicoDate(value: string) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function subtractOneYear(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

async function fetchSeries(seriesId: string, range?: { start: string; end: string }) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) {
    throw new Error("BANXICO_TOKEN no configurado.");
  }

  const suffix = range ? `datos/${range.start}/${range.end}` : "datos/oportuno";
  const response = await fetch(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${seriesId}/${suffix}`, {
    cache: "no-store",
    headers: {
      "Bmx-Token": token,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Banxico respondió ${response.status} para ${seriesId}.`);
  }

  return (await response.json()) as BanxicoSeriesResponse;
}

function latestData(payload: BanxicoSeriesResponse) {
  return payload.bmx?.series?.[0]?.datos?.find((item) => parseBanxicoNumber(item.dato) !== undefined);
}

async function fetchRateQuote(
  seriesId: string,
  instrument: MarketInstrumentQuote["instrument"],
  termYears: number | undefined,
): Promise<MarketInstrumentQuote | undefined> {
  const payload = await fetchSeries(seriesId);
  const data = latestData(payload);
  const rate = parseBanxicoNumber(data?.dato);

  if (!data || typeof rate !== "number") return undefined;

  return {
    instrument,
    annualRate: rate / 100,
    ...(termYears ? { termYears } : {}),
    source: `Banxico SIE ${seriesId}`,
    sourceUrl: "https://www.banxico.org.mx/SieInternet/",
  } satisfies MarketInstrumentQuote;
}

export async function fetchBanxicoMarketData() {
  const notes: string[] = [];
  const quoteResults = await Promise.allSettled([
    fetchRateQuote(BANXICO_SERIES.BONOS_10, "BONOS", 10),
    fetchRateQuote(BANXICO_SERIES.UDIBONOS_10, "UDIBONOS", 10),
    fetchRateQuote(BANXICO_SERIES.CETES_28, "CETES", undefined),
  ]);

  const quotes: MarketInstrumentQuote[] = quoteResults
    .map((result) => {
      if (result.status === "rejected") notes.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      return result.status === "fulfilled" ? result.value : undefined;
    })
    .filter((quote): quote is MarketInstrumentQuote => Boolean(quote));

  let inflationAnnual: number | undefined;
  let inpc: number | undefined;

  try {
    const latestPayload = await fetchSeries(BANXICO_SERIES.INPC);
    const latest = latestData(latestPayload);
    const latestInpc = parseBanxicoNumber(latest?.dato);

    if (latest?.fecha && typeof latestInpc === "number") {
      const latestIso = parseBanxicoDate(latest.fecha);
      const priorIso = subtractOneYear(latestIso);
      const historyPayload = await fetchSeries(BANXICO_SERIES.INPC, { start: priorIso, end: latestIso });
      const values = historyPayload.bmx?.series?.[0]?.datos ?? [];
      const prior = values.find((item) => parseBanxicoDate(item.fecha) === priorIso);
      const priorInpc = parseBanxicoNumber(prior?.dato);

      inpc = latestInpc;
      if (typeof priorInpc === "number") {
        inflationAnnual = latestInpc / priorInpc - 1;
      } else {
        notes.push("Banxico no devolvió INPC de hace 12 meses para calcular inflación anual.");
      }
    }
  } catch (error) {
    notes.push(error instanceof Error ? error.message : String(error));
  }

  return { quotes, inflationAnnual, inpc, notes };
}
