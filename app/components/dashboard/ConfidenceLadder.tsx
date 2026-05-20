import type { MonthlyAnalysis } from "@/core/types";

type ConfidenceLadderProps = {
  level?: MonthlyAnalysis["confidence"];
};

const confidenceMap = { low: 1, medium: 2, high: 3 } as const;
const labels = { low: "BAJA", medium: "MEDIA", high: "ALTA" } as const;

export default function ConfidenceLadder({ level = "low" }: ConfidenceLadderProps) {
  const filled = confidenceMap[level] ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">Confianza</span>
      <div className="flex items-end gap-0.5">
        {[1, 2, 3].map((item) => (
          <span
            className={`w-[5px] rounded-[1px] ${
              item <= filled
                ? "bg-[var(--bonos)] shadow-[0_0_6px_rgba(103,232,200,0.5)]"
                : "bg-white/[0.12]"
            }`}
            key={item}
            style={{ height: item * 5 + 3 }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--foreground)]">{labels[level]}</span>
    </div>
  );
}
