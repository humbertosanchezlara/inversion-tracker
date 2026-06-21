import { INSTRUMENT_TYPES, type InstrumentType, type MonthlyAnalysis } from "@/core/types";
import AllocationDiff from "./AllocationDiff";
import BulletColumn from "./BulletColumn";
import ConfidenceLadder from "./ConfidenceLadder";

type AIAnalysisPanelProps = {
  analysisMessage: string | null;
  busy: string | null;
  currentAllocation: Record<InstrumentType, number>;
  latestAnalysis?: MonthlyAnalysis;
  month: string;
  onRunAnalysis: () => Promise<void>;
};

const recommendationLabels: Record<MonthlyAnalysis["recommendation"], string> = {
  maintain_60_40: "Mantener 60/40",
  adjust_mix: "Ajustar mezcla",
  consider_other_gov_instrument: "Considerar otro instrumento",
};

export default function AIAnalysisPanel({
  analysisMessage,
  busy,
  currentAllocation,
  latestAnalysis,
  month,
  onRunAnalysis,
}: AIAnalysisPanelProps) {
  const isLoading = busy === "analysis";
  const formattedMonth = formatMonth(month);
  const runAt = latestAnalysis?.createdAt ? formatRunDate(latestAnalysis.createdAt) : "sin ejecución";
  const isErrorMessage = Boolean(analysisMessage && !analysisMessage.toLowerCase().includes("generado"));
  const targetAllocationSummary = latestAnalysis ? buildTargetAllocationSummary(latestAnalysis.targetAllocation) : null;

  return (
    <section className="relative flex min-h-[440px] flex-col gap-[18px] overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--panel-bg)] px-5 py-[22px] backdrop-blur-2xl md:px-[26px]">
      <div className="pointer-events-none absolute -right-16 -top-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(197,148,241,0.10),transparent_70%)]" />

      {isErrorMessage ? (
        <div className="relative rounded-xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.10)] px-3 py-2 text-[12px] leading-5 text-[var(--warn)]">
          {analysisMessage}
        </div>
      ) : null}

      <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[var(--bonddia)] to-[var(--cetes)] text-[15px] font-bold text-[var(--background)] shadow-[0_0_18px_rgba(197,148,241,0.4)]">
            ✦
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Análisis del mes</p>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.01em]">Informe ejecutivo · {formattedMonth}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <ConfidenceLadder level={latestAnalysis?.confidence} />
          <div className="border-l border-[var(--hairline)] pl-3.5 font-mono text-[10px] leading-4 text-[var(--muted)]">
            <div>OpenAI · gpt-5</div>
            <div>último · {runAt}</div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-[var(--bonddia)] to-[var(--cetes)] px-4 py-2.5 text-[12.5px] font-semibold tracking-[-0.005em] text-[var(--background)] shadow-[0_0_22px_rgba(197,148,241,0.45),inset_0_0_0_1px_rgba(255,255,255,0.18)] transition hover:shadow-[0_0_28px_rgba(197,148,241,0.58),inset_0_0_0_1px_rgba(255,255,255,0.22)]"
            disabled={isLoading}
            onClick={onRunAnalysis}
            type="button"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[rgba(11,14,16,0.25)] text-[10px]">
              ✦
            </span>
            {isLoading ? "Analizando..." : latestAnalysis ? "Re-ejecutar análisis" : "Generar primer análisis"}
          </button>
        </div>
      </div>

      {!latestAnalysis ? (
        <div className="relative flex flex-1 flex-col items-center justify-center rounded-[14px] border border-[var(--hairline)] bg-black/25 px-6 py-12 text-center">
          <p className="text-[17px] font-semibold tracking-[-0.015em]">Aún no has generado análisis este mes</p>
          <p className="mt-2 max-w-md text-[12px] leading-6 text-[var(--text-soft)]">
            Genera una lectura ejecutiva con tasas, inflación, curva, cartera y próximos vencimientos.
          </p>
          <button
            className="mt-5 rounded-[11px] bg-gradient-to-br from-[var(--bonddia)] to-[var(--cetes)] px-4 py-2.5 text-[12.5px] font-semibold text-[var(--background)] shadow-[0_0_22px_rgba(197,148,241,0.45)]"
            disabled={isLoading}
            onClick={onRunAnalysis}
            type="button"
          >
            {isLoading ? "Analizando..." : "Generar primer análisis"}
          </button>
        </div>
      ) : (
        <>
          <div className="relative grid gap-[22px] xl:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col gap-3.5 rounded-[14px] border border-[var(--hairline)] bg-black/25 px-5 py-[18px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Recomendación</p>
              <div>
                <span className="rounded-full border border-[rgba(245,193,108,0.27)] bg-[rgba(245,193,108,0.12)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--udibonos)]">
                  {latestAnalysis.recommendation.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-[18px] font-semibold leading-[1.3] tracking-[-0.015em]">
                {recommendationLabels[latestAnalysis.recommendation]} con monitoreo de curva, inflación y liquidez.
              </p>
              {targetAllocationSummary ? (
                <p className="rounded-[10px] border border-[var(--hairline)] bg-white/[0.04] px-3 py-2 text-[12px] font-semibold leading-5 text-[var(--foreground)]">
                  {targetAllocationSummary}
                </p>
              ) : null}
              <div className="grid gap-1.5">
                {latestAnalysis.rationale.slice(0, 5).map((item, index) => (
                  <div className="flex gap-2 text-[11.5px] leading-5 text-[var(--text-soft)]" key={item}>
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center font-mono text-[9px] text-[var(--bonos)]">
                      0{index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3.5 rounded-[14px] border border-[var(--hairline)] bg-black/25 px-[22px] py-[18px]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Reasignación sugerida
                </p>
                <p className="font-mono text-[10px] text-[var(--muted)]">actual → objetivo</p>
              </div>
              <AllocationDiff current={currentAllocation} target={latestAnalysis.targetAllocation} />
            </div>
          </div>

          <div className="relative grid gap-6 border-t border-[var(--hairline)] pt-[18px] md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.1fr]">
            <BulletColumn dot="#7AA9F7" items={latestAnalysis.macroSummary} label="Macro" />
            <BulletColumn dot="#67E8C8" items={latestAnalysis.curveSummary} label="Curva" />
            <BulletColumn dot="#F5C16C" items={latestAnalysis.portfolioSummary} label="Cartera" />
            <BulletColumn dot="#67E8C8" items={latestAnalysis.actionItems} label="Acciones" numbered />
          </div>

          <div className="relative grid gap-6 border-t border-[var(--hairline)] pt-3.5 xl:grid-cols-[1.1fr_1.2fr_1fr]">
            <FooterBlock dot="#F5C16C" label="Vigilar">
              <div className="flex flex-wrap gap-1.5">
                {(latestAnalysis.watchConditions ?? []).map((item) => (
                  <span
                    className="rounded-md border border-[rgba(245,193,108,0.20)] bg-[rgba(245,193,108,0.10)] px-2 py-1 font-mono text-[11px] text-[var(--udibonos)]"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </FooterBlock>
            <FooterBlock dot="#F87171" label="Riesgos">
              <ul className="grid gap-1.5">
                {latestAnalysis.risks.map((item) => (
                  <li className="text-[11.5px] leading-5 text-[var(--text-soft)]" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </FooterBlock>
            <FooterBlock dot="#7AA9F7" label="Fuentes utilizadas">
              <div className="flex flex-wrap gap-1.5">
                {latestAnalysis.dataUsed.map((item) => (
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-[var(--text-soft)]" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] italic leading-5 text-[var(--muted)]">Informativo. No es asesoría financiera.</p>
            </FooterBlock>
          </div>
        </>
      )}
    </section>
  );
}

function FooterBlock({
  children,
  dot,
  label,
}: {
  children: React.ReactNode;
  dot: string;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--muted)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
        {label}
      </p>
      {children}
    </div>
  );
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(`${month}-02T00:00:00`));
}

function formatRunDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(new Date(date));
}

const percentFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

function buildTargetAllocationSummary(target: Record<InstrumentType, number>) {
  const parts = INSTRUMENT_TYPES.map((instrument) => `${formatAllocationPercent(target[instrument] ?? 0)} en ${instrument}`);
  return `Este mes entonces invierte ${joinWithFinalAnd(parts)}.`;
}

function formatAllocationPercent(value: number) {
  return `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`;
}

function joinWithFinalAnd(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}
