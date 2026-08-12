export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Para movimientos de activos, donde redondear a pesos enteros pierde información:
 * un total de 10,011.69 o un precio unitario de 17.21 deben leerse exactos.
 */
export function formatCurrencyPrecise(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/D";

  return new Intl.NumberFormat("es-MX", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
