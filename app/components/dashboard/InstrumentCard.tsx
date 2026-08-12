import type { InstrumentType, MarketInstrumentQuote } from "@/core/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Sparkline } from "./PortfolioHero";

type InstrumentCardProps = {
  changeBps?: number;
  instrument: InstrumentType;
  invested: number;
  quote?: MarketInstrumentQuote;
  rateHistory: number[];
};

const instrumentColor: Record<InstrumentType, string> = {
  BONOS: "var(--bonos)",
  UDIBONOS: "var(--udibonos)",
  CETES: "var(--cetes)",
  BONDDIA: "var(--bonddia)",
};

export default function InstrumentCard({ changeBps, instrument, invested, quote, rateHistory }: InstrumentCardProps) {
  const color = instrumentColor[instrument];

  return (
    <article className="group relative min-h-[196px] overflow-hidden rounded-[14px] border border-[var(--hairline)] bg-[var(--panel-bg)] px-4 py-4 backdrop-blur-2xl transition duration-200 hover:-translate-y-px hover:shadow-[0_18px_48px_rgba(0,0,0,0.20)]">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-[90px] w-[90px] rounded-full opacity-100"
        style={{ background: `radial-gradient(circle, ${cssVarToGlow(color)}, transparent 70%)` }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: color, boxShadow: `0 0 8px ${cssVarToShadow(color)}` }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em]">{instrument}</span>
        </div>
        <span className="font-mono text-[9.5px]" style={{ color: typeof changeBps === "number" ? color : "var(--muted)" }}>
          {typeof changeBps === "number" ? `${changeBps >= 0 ? "↑" : "↓"}${Math.abs(changeBps).toFixed(0)}bp` : "s/d"}
        </span>
      </div>
      <div className="relative mt-3 font-mono text-[28px] font-medium leading-none tracking-[-0.025em]">
        {quote ? formatPercent(quote.annualRate).replace("%", "") : "N/D"}
        <span className="text-[13px] text-[var(--muted)]">%</span>
      </div>
      <p className="relative mt-1 text-[10px] text-[var(--muted)]">
        {quote?.termLabel ?? (quote?.termYears ? `${quote.termYears} años` : "plazo N/D")} · {formatCurrency(invested)}
      </p>
      <div className="relative mt-2 -ml-0.5 min-h-5">
        {rateHistory.length >= 2 ? (
          <Sparkline height={20} stroke={color} values={rateHistory} width={150} />
        ) : (
          <span className="font-mono text-[9px] text-[var(--muted)]">Sin histórico de tasas todavía</span>
        )}
      </div>
    </article>
  );
}

function cssVarToGlow(color: string) {
  const map: Record<string, string> = {
    "var(--bonos)": "rgba(103,232,200,0.20)",
    "var(--udibonos)": "rgba(245,193,108,0.20)",
    "var(--cetes)": "rgba(122,169,247,0.20)",
    "var(--bonddia)": "rgba(197,148,241,0.20)",
  };

  return map[color] ?? color;
}

function cssVarToShadow(color: string) {
  const map: Record<string, string> = {
    "var(--bonos)": "rgba(103,232,200,0.50)",
    "var(--udibonos)": "rgba(245,193,108,0.50)",
    "var(--cetes)": "rgba(122,169,247,0.50)",
    "var(--bonddia)": "rgba(197,148,241,0.50)",
  };

  return map[color] ?? color;
}
