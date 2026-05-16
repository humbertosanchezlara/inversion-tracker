export function addYearsIsoDate(isoDate: string, years: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(date.getUTCFullYear() + years);

  return date.toISOString().slice(0, 10);
}

export function formatIsoDate(isoDate?: string) {
  if (!isoDate) return "N/D";

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}
