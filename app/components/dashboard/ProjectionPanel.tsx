"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/app/lib/chart-theme";
import type { ProjectionPoint, ProjectionSummary } from "@/core/types";
import { formatCurrency } from "@/lib/format";

type ProjectionPanelProps = {
  chartData: ProjectionPoint[];
  summaries: ProjectionSummary[];
};

export default function ProjectionPanel({ chartData, summaries }: ProjectionPanelProps) {
  const horizons = summaries.map((summary) => summary.horizonYears);
  const maxHorizon = horizons.length > 0 ? Math.max(...horizons) : 30;
  const [selectedHorizon, setSelectedHorizon] = useState(maxHorizon);
  const activeHorizon = horizons.includes(selectedHorizon) ? selectedHorizon : maxHorizon;
  const visibleData = chartData.filter((point) => point.year <= activeHorizon);

  return (
    <section className="flex min-h-[360px] flex-col gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-5 py-[18px] backdrop-blur-2xl">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Proyección · {activeHorizon} años
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em]">Trayectoria del patrimonio</h2>
        </div>
        <div className="flex w-fit gap-1.5 rounded-lg border border-[var(--hairline)] bg-black/25 p-0.5">
          {horizons.map((horizon) => (
            <button
              aria-pressed={horizon === activeHorizon}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] transition ${
                horizon === activeHorizon
                  ? "bg-white/[0.08] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--text-soft)]"
              }`}
              key={horizon}
              onClick={() => setSelectedHorizon(horizon)}
              type="button"
            >
              {horizon}y
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[205px] flex-1">
        <ResponsiveContainer height="100%" minHeight={205} width="100%">
          <AreaChart data={visibleData} margin={{ bottom: 2, left: 0, right: 10, top: 10 }}>
            <defs>
              <linearGradient id="nominalGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#67E8C8" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#67E8C8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="realGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#F5C16C" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#F5C16C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="year"
              interval={4}
              tick={{ fill: chartTheme.axisTick, fontFamily: chartTheme.fontMono, fontSize: 10 }}
              tickFormatter={(value) => `${value}y`}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chartTheme.axisTick, fontFamily: chartTheme.fontMono, fontSize: 9 }}
              tickFormatter={formatCompactAxis}
              tickLine={false}
              width={54}
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
              formatter={(value) => formatCurrency(Number(value ?? 0))}
              labelFormatter={(label) => `Año ${label}`}
            />
            <Area dataKey="nominalBalance" fill="url(#nominalGradient)" name="Nominal" stroke="#67E8C8" strokeWidth={1.8} type="monotone" />
            <Area
              dataKey="realBalance"
              fill="url(#realGradient)"
              name="Pesos de hoy"
              stroke="#F5C16C"
              strokeDasharray="4 3"
              strokeWidth={1.8}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-0 border-t border-[var(--hairline)] pt-3 sm:grid-cols-5">
        {summaries.map((summary, index) => (
          <div
            className={`${index === 0 ? "" : "border-l border-[var(--hairline)] pl-3.5"} pr-2 ${
              summary.horizonYears === activeHorizon ? "" : "opacity-55"
            }`}
            key={summary.horizonYears}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--muted)]">{summary.horizonYears}Y real</p>
            <p className="mt-0.5 font-mono text-[15px] text-[var(--foreground)]">{formatCompactCurrency(summary.realBalance)}</p>
            <p className="mt-0.5 font-mono text-[9px] text-[var(--muted)]">nom {formatCompactCurrency(summary.nominalBalance)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatCompactAxis(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value / 1000)}k`;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    compactDisplay: "short",
    currency: "MXN",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}
