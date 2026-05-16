export async function fetchInflationAnnual() {
  const token = process.env.INEGI_TOKEN;
  if (!token) {
    return {
      inflationAnnual: undefined,
      inpc: undefined,
      note: "INEGI_TOKEN no configurado; no se pudo consultar inflación automáticamente.",
    };
  }

  const indicator = "628194";
  const url = `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/${indicator}/es/0700/false/BISE/2.0/${token}?type=json`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return {
      inflationAnnual: undefined,
      inpc: undefined,
      note: `INEGI respondió ${response.status}; no se pudo actualizar inflación.`,
    };
  }

  const payload = await response.json();
  const observations = payload?.Series?.[0]?.OBSERVATIONS ?? [];
  const latest = observations.find((obs: { OBS_VALUE?: string }) => Number.isFinite(Number.parseFloat(obs.OBS_VALUE ?? "")));
  const value = latest ? Number.parseFloat(latest.OBS_VALUE) : undefined;

  return {
    inflationAnnual: typeof value === "number" ? value / 100 : undefined,
    inpc: undefined,
    note: typeof value === "number" ? "Inflación consultada desde INEGI." : "INEGI no devolvió un valor interpretable.",
  };
}
