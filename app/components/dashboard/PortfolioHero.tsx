import { formatCurrency, formatPercent } from "@/lib/format";

type PortfolioHeroProps = {
  currentValue: number;
  inflation?: number;
  lotsCount: number;
  onOpenRegister: () => void;
  totalInvested: number;
  valueSeries: number[];
};

export default function PortfolioHero({
  currentValue,
  inflation,
  lotsCount,
  onOpenRegister,
  totalInvested,
  valueSeries,
}: PortfolioHeroProps) {
  const gain = currentValue - totalInvested;
  const gainPct = totalInvested > 0 ? gain / totalInvested : 0;

  return (
    <section className="group relative min-h-[196px] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-6 py-[22px] backdrop-blur-2xl transition duration-200 hover:-translate-y-px hover:shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(103,232,200,0.06),transparent_70%)]" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Valor actual</p>
        {lotsCount === 0 ? (
          <div className="mt-4">
            <p className="text-[18px] font-semibold tracking-[-0.015em]">Empieza tu primera inversión</p>
            <p className="mt-2 max-w-[260px] text-[12px] leading-6 text-[var(--text-soft)]">
              Registra un lote mensual para activar proyección, allocation y vencimientos.
            </p>
            <button
              className="mt-4 rounded-full bg-[var(--foreground)] px-3.5 py-2 text-[12px] font-semibold text-[var(--background)]"
              onClick={onOpenRegister}
              type="button"
            >
              + Registrar mes
            </button>
          </div>
        ) : (
          <>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-[36px] font-medium leading-none tracking-[-0.025em] text-[var(--foreground)]">
            {formatCurrency(currentValue || totalInvested)}
          </span>
          <span className="text-[13px] text-[var(--muted)]">MXN</span>
        </div>
        <p className="mt-1 text-[12px] text-[var(--text-soft)]">
          <span className={gain >= 0 ? "text-[var(--bonos)]" : "text-[var(--warn)]"}>
            {gain >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(gain))}
          </span>{" "}
          · {formatPercent(gainPct)} sobre aportado
        </p>
        {valueSeries.length >= 2 ? (
          <div className="mt-3">
            <Sparkline height={42} stroke="var(--bonos)" values={valueSeries} width={280} />
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--muted)]">
              Valor acumulado por mes registrado
            </p>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-5 text-[11px] text-[var(--text-soft)]">
          <MiniStat label="Aportado" value={formatCurrency(totalInvested)} />
          <MiniStat label="Lotes" value={String(lotsCount)} />
          <MiniStat label="Inflación" value={formatPercent(inflation)} />
        </div>
          </>
        )}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 font-mono text-[13px] text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function Sparkline({
  height,
  stroke,
  values,
  width,
}: {
  height: number;
  stroke: string;
  values: number[];
  width: number;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height - ((value - min) / (max - min || 1)) * height;
    return [x, y] as const;
  });
  const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  const end = points[points.length - 1] ?? [0, height];

  return (
    <svg className="block max-w-full overflow-visible" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <path d={area} fill={stroke} opacity="0.12" />
      <path d={d} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <circle cx={end[0]} cy={end[1]} fill={stroke} r="2.5" />
    </svg>
  );
}
