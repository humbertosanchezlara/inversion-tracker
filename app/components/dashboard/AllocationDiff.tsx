import type { InstrumentType } from "@/core/types";

type AllocationDiffProps = {
  current: Record<InstrumentType, number>;
  target: Record<InstrumentType, number>;
};

const order: InstrumentType[] = ["BONOS", "UDIBONOS", "CETES", "BONDDIA"];
const instrumentColor: Record<InstrumentType, string> = {
  BONOS: "#67E8C8",
  UDIBONOS: "#F5C16C",
  CETES: "#7AA9F7",
  BONDDIA: "#C594F1",
};

export default function AllocationDiff({ current, target }: AllocationDiffProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="hidden grid-cols-[4.5rem_minmax(150px,1fr)_3.6rem_4.2rem_4rem] gap-x-3 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[var(--muted)] sm:grid">
        <span />
        <span />
        <span className="text-right">actual</span>
        <span className="text-right">objetivo</span>
        <span className="text-right">mov.</span>
      </div>
      {order.map((instrument) => {
        const cur = current[instrument] ?? 0;
        const tgt = target[instrument] ?? 0;
        const delta = tgt - cur;
        const currentWidth = percentWidth(cur);
        const targetWidth = percentWidth(tgt);
        const color = instrumentColor[instrument];
        const deltaColor = delta === 0 ? "var(--muted)" : delta > 0 ? color : "var(--warn)";

        return (
          <div
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[4.5rem_minmax(150px,1fr)_3.6rem_4.2rem_4rem]"
            key={instrument}
          >
            <div className="w-16 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--foreground)]">
              {instrument}
            </div>
            <div
              aria-label={`${instrument}: actual ${formatPercent(cur)}, objetivo ${formatPercent(tgt)}`}
              className="relative h-3 rounded-full bg-white/[0.05]"
            >
              <div
                className="absolute inset-y-[3px] left-0 rounded-full border border-dashed"
                style={{
                  background: `linear-gradient(90deg, ${color}33, ${color}11)`,
                  borderColor: `${color}66`,
                  width: `${targetWidth}%`,
                }}
              />
              <div
                className="absolute inset-y-[3px] left-0 rounded-full"
                style={{ background: color, boxShadow: `0 0 12px ${color}80`, width: `${currentWidth}%` }}
              />
              <span
                className="absolute top-1/2 h-4 -translate-x-1/2 -translate-y-1/2 border-l border-dashed"
                style={{ borderColor: color, left: `${targetWidth}%` }}
              />
            </div>

            <div className="hidden text-right font-mono text-[10px] text-[var(--text-soft)] sm:block">
              {formatPercent(cur)}
            </div>
            <div className="hidden text-right font-mono text-[10px] font-semibold sm:block" style={{ color }}>
              {formatPercent(tgt)}
            </div>
            <div className="hidden text-right font-mono text-[10px] sm:block" style={{ color: deltaColor }}>
              {formatDelta(delta)}
            </div>

            <div className="col-start-2 flex flex-wrap gap-2 font-mono text-[9px] sm:hidden">
              <span className="text-[var(--text-soft)]">actual {formatPercent(cur)}</span>
              <span style={{ color }}>objetivo {formatPercent(tgt)}</span>
              <span style={{ color: deltaColor }}>{formatDelta(delta)}</span>
            </div>
          </div>
        );
      })}
      <div className="mt-1 flex items-center gap-3.5 font-mono text-[9px] text-[var(--muted)]">
        <span className="w-16" />
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-3.5 rounded-sm bg-[var(--foreground)] opacity-60" />
          actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-3.5 rounded-sm border border-dashed border-[var(--muted)]" />
          objetivo
        </span>
      </div>
    </div>
  );
}

const percentFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

function percentWidth(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatPercent(value: number) {
  return `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`;
}

function formatDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${percentFormatter.format(Number.isFinite(value) ? value : 0)} pp`;
}
