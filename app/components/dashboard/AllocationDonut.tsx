import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { InstrumentType } from "@/core/types";
import { formatCurrency } from "@/lib/format";

type AllocationDonutProps = {
  currentAllocation: Record<InstrumentType, number>;
  targetAllocation?: Record<InstrumentType, number>;
  totalInvested: number;
};

const order: InstrumentType[] = ["BONOS", "UDIBONOS", "CETES", "BONDDIA"];
const colors: Record<InstrumentType, string> = {
  BONOS: "#67E8C8",
  UDIBONOS: "#F5C16C",
  CETES: "#7AA9F7",
  BONDDIA: "#C594F1",
};

export default function AllocationDonut({ currentAllocation, targetAllocation, totalInvested }: AllocationDonutProps) {
  const data = order.map((instrument) => ({
    instrument,
    value: Math.max(0, currentAllocation[instrument] ?? 0),
  }));
  const hasAllocation = data.some((item) => item.value > 0);

  return (
    <section className="flex min-h-[172px] items-center gap-[18px] rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-5 py-[18px] backdrop-blur-2xl">
      <div className="relative h-[128px] w-[128px] shrink-0">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={hasAllocation ? data : [{ instrument: "BONOS", value: 1 }]}
              dataKey="value"
              innerRadius={38}
              isAnimationActive={false}
              outerRadius={56}
              paddingAngle={2}
            >
              {(hasAllocation ? data : [{ instrument: "BONOS" as InstrumentType, value: 1 }]).map((entry) => (
                <Cell fill={hasAllocation ? colors[entry.instrument] : "rgba(255,255,255,0.10)"} fillOpacity={0.88} key={entry.instrument} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">Total</p>
          <p className="mt-0.5 font-mono text-[13px] text-[var(--foreground)]">{formatCompactCurrency(totalInvested)}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Allocation</p>
        <div className="mt-2 grid gap-2">
          {order.map((instrument) => (
            <div className="flex items-center gap-2 text-[11px]" key={instrument}>
              <span className="h-1.5 w-1.5 rounded-sm" style={{ background: colors[instrument] }} />
              <span className="flex-1 text-[var(--text-soft)]">{instrument}</span>
              <span className="font-mono text-[var(--foreground)]">{(currentAllocation[instrument] ?? 0).toFixed(1)}%</span>
              <span className="w-9 text-right font-mono text-[9px] text-[var(--muted)]">
                → {(targetAllocation?.[instrument] ?? 0).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatCompactCurrency(value: number) {
  if (value <= 0) return formatCurrency(0);

  return new Intl.NumberFormat("es-MX", {
    compactDisplay: "short",
    currency: "MXN",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}
