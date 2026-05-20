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
  const max = Math.max(1, ...order.flatMap((instrument) => [current[instrument] ?? 0, target[instrument] ?? 0]));

  return (
    <div className="flex flex-col gap-3.5">
      {order.map((instrument) => {
        const cur = current[instrument] ?? 0;
        const tgt = target[instrument] ?? 0;
        const delta = tgt - cur;
        const color = instrumentColor[instrument];

        return (
          <div className="flex items-center gap-3.5" key={instrument}>
            <div className="w-16 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--foreground)]">
              {instrument}
            </div>
            <div className="relative h-[22px] flex-1">
              <div
                className="absolute left-0 top-[7px] h-2 rounded-full border border-dashed"
                style={{
                  background: `linear-gradient(90deg, ${color}33, ${color}11)`,
                  borderColor: `${color}66`,
                  width: `${(tgt / max) * 100}%`,
                }}
              />
              <div
                className="absolute left-0 top-[7px] h-2 rounded-full"
                style={{ background: color, boxShadow: `0 0 12px ${color}80`, width: `${(cur / max) * 100}%` }}
              />
              <span
                className="absolute top-0 -translate-x-1/2 font-mono text-[9px] text-[var(--text-soft)]"
                style={{ left: `${(cur / max) * 100}%` }}
              >
                {cur.toFixed(0)}%
              </span>
              <span
                className="absolute bottom-0 -translate-x-1/2 font-mono text-[9px] font-semibold"
                style={{ color, left: `${(tgt / max) * 100}%` }}
              >
                {tgt.toFixed(0)}%
              </span>
            </div>
            <div
              className="w-[60px] text-right font-mono text-[10px]"
              style={{ color: delta === 0 ? "var(--muted)" : delta > 0 ? color : "var(--warn)" }}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(0)} pp
            </div>
          </div>
        );
      })}
      <div className="mt-0.5 flex items-center gap-3.5 font-mono text-[9px] text-[var(--muted)]">
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
