export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
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
