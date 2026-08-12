import type { InvestmentLot } from "@/core/types";
import { formatCurrency } from "@/lib/format";

type UpcomingMaturitiesProps = {
  lots: Array<InvestmentLot & { maturityDate: string }>;
};

const colors = {
  BONOS: "#67E8C8",
  UDIBONOS: "#F5C16C",
  CETES: "#7AA9F7",
  BONDDIA: "#C594F1",
};

export default function UpcomingMaturities({ lots }: UpcomingMaturitiesProps) {
  const visible = lots.slice(0, 4);
  const extra = Math.max(0, lots.length - visible.length);

  return (
    <section className="flex min-h-[174px] flex-col gap-2.5 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-5 py-[18px] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Próximos vencimientos</p>
        {extra > 0 ? <span className="font-mono text-[10px] text-[var(--bonos)]">+{extra}</span> : null}
      </div>

      <div className="grid flex-1 gap-1.5 overflow-hidden">
        {visible.length > 0 ? (
          visible.map((lot) => <MaturityRow key={lot.id} lot={lot} />)
        ) : (
          <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.03] px-3 py-4 text-[12px] text-[var(--text-soft)]">
            Sin vencimientos registrados todavía.
          </div>
        )}
      </div>

      {lots.length > 4 ? (
        <a className="mt-1 font-mono text-[10px] text-[var(--bonos)] transition hover:text-[var(--foreground)]" href="/vencimientos">
          Ver todos →
        </a>
      ) : null}
    </section>
  );
}

function MaturityRow({ lot }: { lot: InvestmentLot & { maturityDate: string } }) {
  const progress = elapsedProgress(lot);
  const color = colors[lot.instrument];

  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--hairline)] bg-white/[0.03] px-2.5 py-1.5">
      <span className="h-6 w-[3px] rounded-sm" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-[var(--foreground)]">{lot.instrument}</span>
          <span className="font-mono text-[10px] text-[var(--foreground)]">{formatCurrency(lot.amount)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            aria-label={`${progress.toFixed(0)}% del plazo transcurrido`}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
            role="img"
          >
            <div className="h-full rounded-full" style={{ background: color, width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[9px] text-[var(--muted)]">{formatDate(lot.maturityDate)}</span>
        </div>
      </div>
    </div>
  );
}

/** Fracción del plazo ya transcurrida: la barra se llena conforme se acerca el vencimiento. */
function elapsedProgress(lot: InvestmentLot & { maturityDate: string }) {
  const start = new Date(lot.date ?? `${lot.month}-01`).getTime();
  const end = new Date(lot.maturityDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 100;

  return Math.max(2, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(date));
}
