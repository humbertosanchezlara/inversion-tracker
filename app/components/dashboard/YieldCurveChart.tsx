import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/app/lib/chart-theme";
import type { InstrumentType, MarketInstrumentQuote } from "@/core/types";

type YieldCurveChartProps = {
  quotes: MarketInstrumentQuote[];
};

const order: InstrumentType[] = ["BONOS", "UDIBONOS", "CETES", "BONDDIA"];
const colors: Record<InstrumentType, string> = {
  BONOS: "#67E8C8",
  UDIBONOS: "#F5C16C",
  CETES: "#7AA9F7",
  BONDDIA: "#C594F1",
};
const ticks = [0.003, 0.077, 0.25, 1, 3, 10, 30];
const tickLabels = new Map([
  [0.003, "1d"],
  [0.077, "28d"],
  [0.25, "91d"],
  [1, "1y"],
  [3, "3y"],
  [10, "10y"],
  [30, "30y"],
]);

type CurveDatum = { termYears: number } & Partial<Record<InstrumentType, number>>;

export default function YieldCurveChart({ quotes }: YieldCurveChartProps) {
  const data = buildCurveData(quotes);
  const maxByInstrument = order.map((instrument) => findMaxQuote(quotes, instrument));
  const spread = calculateBonosSpread(quotes);
  const rateAxis = buildRateAxis(quotes);

  return (
    <section className="grid min-h-[420px] gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] p-5 backdrop-blur-2xl xl:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Curva de rendimiento</p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em]">Tasas por plazo e instrumento</h2>
          </div>
          <p className="font-mono text-[10px] text-[var(--muted)]">{quotes.length} puntos · escala log</p>
        </div>

        <div className="h-[330px]">
          {data.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={data} margin={{ bottom: 4, left: 0, right: 18, top: 18 }}>
                <defs>
                  {order.map((instrument) => (
                    <filter height="200%" id={`glow-${instrument}`} key={instrument} width="200%" x="-50%" y="-50%">
                      <feDropShadow dx="0" dy="0" floodColor={colors[instrument]} floodOpacity="0.5" stdDeviation="3" />
                    </filter>
                  ))}
                </defs>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 3" vertical={false} />
                <XAxis
                  allowDataOverflow
                  dataKey="termYears"
                  domain={[0.003, 30]}
                  scale="log"
                  tick={{ fill: chartTheme.axisTick, fontFamily: chartTheme.fontMono, fontSize: 10 }}
                  tickFormatter={(value) => tickLabels.get(Number(value)) ?? ""}
                  ticks={ticks}
                  type="number"
                />
                <YAxis
                  domain={rateAxis.domain}
                  tick={{ fill: chartTheme.axisTick, fontFamily: chartTheme.fontMono, fontSize: 10 }}
                  tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                  ticks={rateAxis.ticks}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: chartTheme.tooltipBg,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: 12,
                    color: chartTheme.text,
                    fontFamily: chartTheme.fontMono,
                    fontSize: 11,
                  }}
                  formatter={(value, name) => [`${(Number(value) * 100).toFixed(2)}%`, name]}
                  labelFormatter={(value) => `Plazo ${formatTerm(Number(value))}`}
                />
                {order.map((instrument) => (
                  <Line
                    connectNulls
                    dataKey={instrument}
                    dot={(props) => <CurveDot {...props} color={colors[instrument]} />}
                    filter={`url(#glow-${instrument})`}
                    isAnimationActive={false}
                    key={instrument}
                    name={instrument}
                    stroke={colors[instrument]}
                    strokeWidth={1.8}
                    type="monotone"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-[var(--hairline)] bg-black/20 text-[12px] text-[var(--text-soft)]">
              Actualiza fuentes para ver la curva disponible.
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-[var(--hairline)] bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Snapshot</p>
          <span className="font-mono text-[10px] text-[var(--bonos)]">{quotes.length} pts</span>
        </div>
        <div className="mt-4 grid gap-2">
          {maxByInstrument.map(({ instrument, quote }) => (
            <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.03] p-3" key={instrument}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.10em]" style={{ color: colors[instrument] }}>
                  {instrument}
                </span>
                <span className="font-mono text-[15px] text-[var(--foreground)]">
                  {quote ? `${(quote.annualRate * 100).toFixed(2)}%` : "N/D"}
                </span>
              </div>
              <p className="mt-1 font-mono text-[9px] text-[var(--muted)]">
                {quote ? `${quote.termLabel ?? formatTerm(quote.termYears)} · ${quote.source}` : "Sin tasa cargada"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-full border border-[var(--hairline)] bg-white/[0.04] px-3 py-2 font-mono text-[10px] text-[var(--text-soft)]">
          spread BONOS 30y-3y · {spread}
        </div>
      </aside>
    </section>
  );
}

function buildCurveData(quotes: MarketInstrumentQuote[]) {
  const byTerm = new Map<number, CurveDatum>();

  for (const quote of quotes) {
    const termYears = normalizeTermYears(quote);
    if (!termYears) continue;
    const datum = byTerm.get(termYears) ?? { termYears };
    datum[quote.instrument] = quote.annualRate;
    byTerm.set(termYears, datum);
  }

  return Array.from(byTerm.values()).sort((a, b) => a.termYears - b.termYears);
}

const FALLBACK_RATE_AXIS = { domain: [0.04, 0.1] as [number, number], ticks: [0.04, 0.06, 0.08, 0.1] };

/**
 * Las tasas van desde UDIBONOS reales (~4%) hasta BONOS largos (~10%), así que el eje
 * se deriva del snapshot: un dominio fijo recortaba las series de la parte baja.
 */
function buildRateAxis(quotes: MarketInstrumentQuote[]) {
  const rates = quotes.map((quote) => quote.annualRate).filter((rate) => Number.isFinite(rate));
  if (rates.length === 0) return FALLBACK_RATE_AXIS;

  const step = Math.max(...rates) - Math.min(...rates) > 0.08 ? 0.02 : 0.01;
  const lower = Math.max(0, roundToStep(Math.min(...rates) - step / 2, step, "floor"));
  const upper = roundToStep(Math.max(...rates) + step / 2, step, "ceil");
  const ticks: number[] = [];

  for (let tick = lower; tick <= upper + step / 2; tick += step) {
    ticks.push(Number(tick.toFixed(4)));
  }

  return { domain: [lower, upper] as [number, number], ticks };
}

function roundToStep(value: number, step: number, mode: "floor" | "ceil") {
  const steps = mode === "floor" ? Math.floor(value / step) : Math.ceil(value / step);
  return Number((steps * step).toFixed(4));
}

function normalizeTermYears(quote: MarketInstrumentQuote) {
  if (quote.termYears && quote.termYears > 0) return quote.termYears;
  const label = quote.termLabel?.toLowerCase() ?? "";
  if (label.includes("1d")) return 0.003;
  if (label.includes("28")) return 0.077;
  if (label.includes("91")) return 0.25;
  return undefined;
}

function findMaxQuote(quotes: MarketInstrumentQuote[], instrument: InstrumentType) {
  const quote = quotes
    .filter((item) => item.instrument === instrument)
    .sort((a, b) => b.annualRate - a.annualRate)[0];

  return { instrument, quote };
}

function calculateBonosSpread(quotes: MarketInstrumentQuote[]) {
  const bonos3y = quotes.find((quote) => quote.instrument === "BONOS" && quote.termYears === 3);
  const bonos30y = quotes.find((quote) => quote.instrument === "BONOS" && quote.termYears === 30);
  if (!bonos3y || !bonos30y) return "N/D";

  const bps = Math.round((bonos30y.annualRate - bonos3y.annualRate) * 10000);
  return `${bps >= 0 ? "+" : ""}${bps}bp ${bps >= 0 ? "(empinada)" : "(invertida)"}`;
}

function formatTerm(termYears?: number) {
  if (!termYears) return "N/D";
  const label = tickLabels.get(termYears);
  if (label) return label;
  if (termYears < 1) return `${Math.round(termYears * 365)}d`;
  return `${termYears}y`;
}

function CurveDot(props: { cx?: number; cy?: number; color: string }) {
  if (typeof props.cx !== "number" || typeof props.cy !== "number") return <g />;

  return (
    <g>
      <circle cx={props.cx} cy={props.cy} fill={props.color} opacity="0.22" r="7" />
      <circle cx={props.cx} cy={props.cy} fill={props.color} r="2.5" />
    </g>
  );
}
