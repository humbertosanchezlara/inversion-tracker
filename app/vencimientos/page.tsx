"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useTrackerData } from "@/app/hooks/useTrackerData";
import BackgroundMesh from "@/app/components/dashboard/BackgroundMesh";
import MobileNav from "@/app/components/dashboard/MobileNav";
import Sidebar from "@/app/components/dashboard/Sidebar";
import MovementForm from "./MovementForm";
import { effectiveTermYears, hasTermMismatch } from "@/core/lots";
import { formatIsoDate } from "@/core/dates";
import { deleteAssetMovement } from "@/data/supabaseRepository";
import { readableError } from "@/lib/supabaseErrors";
import {
  ASSET_MOVEMENT_LABELS,
  INSTRUMENT_TYPES,
  type AssetMovement,
  type InstrumentType,
  type InvestmentLot,
} from "@/core/types";
import { formatCurrency, formatCurrencyPrecise, formatPercent } from "@/lib/format";

type InstrumentFilter = InstrumentType | "TODOS";

const instrumentColors: Record<InstrumentType, string> = {
  BONOS: "var(--bonos)",
  UDIBONOS: "var(--udibonos)",
  CETES: "var(--cetes)",
  BONDDIA: "var(--bonddia)",
};

export default function VencimientosPage() {
  const { lots, message, movements, movementsAvailable, reload, snapshots, status, userId } = useTrackerData();
  const [filter, setFilter] = useState<InstrumentFilter>("TODOS");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const activeSnapshot = snapshots.find((snapshot) => snapshot.quotes.length > 0);
  const showMovements = filter === "TODOS";
  const visibleLots = useMemo(
    () => (filter === "TODOS" ? lots : lots.filter((lot) => lot.instrument === filter)),
    [filter, lots],
  );
  const timeline = useMemo(
    () => buildTimeline(visibleLots, showMovements ? movements : []),
    [movements, showMovements, visibleLots],
  );
  const pending = useMemo(() => pendingMaturities(visibleLots), [visibleLots]);
  const totals = useMemo(() => summarize(visibleLots), [visibleLots]);

  async function removeMovement(movement: AssetMovement) {
    if (!userId) return;
    const label =
      movement.kind === "NONE"
        ? `la marca de "sin movimientos" de ${movement.month}`
        : `${ASSET_MOVEMENT_LABELS[movement.kind]} de ${movement.asset}`;
    if (!window.confirm(`¿Eliminar ${label}? No se puede deshacer.`)) return;

    try {
      await deleteAssetMovement(userId, movement.id);
      setActionMessage("Movimiento eliminado.");
      await reload();
    } catch (error) {
      setActionMessage(`No se pudo eliminar: ${readableError(error)}`);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundMesh />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          activeSnapshot={activeSnapshot}
          onSignOut={async () => {
            await supabase.auth.signOut();
          }}
        />
        <section className="flex min-w-0 flex-1 flex-col gap-[14px] px-4 py-5 md:px-8 md:py-6">
          <header className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-4 py-3 backdrop-blur-2xl md:flex-row md:items-center md:px-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Vencimientos</p>
              <h1 className="mt-1 text-[18px] font-semibold tracking-[-0.015em]">Histórico de registros</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {status === "ready" ? (
                <button
                  className="inline-flex h-9 items-center rounded-[999px] bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-[var(--background)] transition hover:shadow-[0_0_16px_rgba(234,238,242,0.25)]"
                  onClick={() => setIsFormOpen(true)}
                  type="button"
                >
                  + Registrar movimiento
                </button>
              ) : null}
              <Link
                className="inline-flex h-9 w-fit items-center rounded-[999px] border border-[var(--hairline)] bg-white/[0.06] px-3.5 text-[12px] text-[var(--foreground)] transition hover:bg-white/[0.09]"
                href="/"
              >
                ← Volver al resumen
              </Link>
            </div>
          </header>
          <MobileNav />

          {actionMessage ? (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg-hi)] px-4 py-3 text-[12px] leading-5 text-[var(--text-soft)] backdrop-blur-2xl">
              {actionMessage}
            </div>
          ) : null}

          {status === "ready" && !movementsAvailable ? (
            <div className="rounded-2xl border border-[rgba(245,193,108,0.35)] bg-[rgba(245,193,108,0.10)] px-4 py-3 text-[12px] leading-5 text-[var(--udibonos)] backdrop-blur-2xl">
              Faltan migraciones de <span className="font-mono">supabase/</span>. Hasta correrlas no se pueden
              guardar movimientos fuera de instrumentos gubernamentales.
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="dashboard-skeleton h-64 rounded-2xl border border-[var(--hairline)]" />
          ) : status === "signed-out" ? (
            <SignedOut message={message} />
          ) : lots.length === 0 && movements.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-[10px] xl:grid-cols-4">
                <Stat label="Aportado gubernamental" value={formatCurrency(totals.invested)} />
                <Stat label="Lotes" value={String(totals.count)} />
                <Stat label="Meses registrados" value={String(totals.months)} />
                <Stat
                  hint={totals.nextMaturity ? `${daysUntil(totals.nextMaturity)} días` : undefined}
                  label="Próximo vencimiento"
                  value={totals.nextMaturity ? formatIsoDate(totals.nextMaturity) : "N/D"}
                />
              </div>

              <InstrumentFilterBar lots={lots} onChange={setFilter} value={filter} />

              <PendingMaturities lots={pending} />

              <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-5 py-[18px] backdrop-blur-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      Histórico de registros
                    </p>
                    <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.015em]">
                      {timeline.length} {timeline.length === 1 ? "mes" : "meses"} con registro
                    </h2>
                  </div>
                  <p className="font-mono text-[10px] text-[var(--muted)]">más reciente primero</p>
                </div>

                <div className="mt-4 grid gap-4">
                  {timeline.map((entry) => (
                    <MonthEntry entry={entry} key={entry.month} onDeleteMovement={removeMovement} />
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </div>

      {isFormOpen && userId ? (
        <MovementForm
          existingMonths={new Set(movements.filter((item) => item.kind === "NONE").map((item) => item.month))}
          onClose={() => setIsFormOpen(false)}
          onSaved={async (text) => {
            setActionMessage(text);
            await reload();
          }}
          userId={userId}
        />
      ) : null}
    </main>
  );
}

function InstrumentFilterBar({
  lots,
  onChange,
  value,
}: {
  lots: InvestmentLot[];
  onChange: (next: InstrumentFilter) => void;
  value: InstrumentFilter;
}) {
  const options: InstrumentFilter[] = [
    "TODOS",
    ...INSTRUMENT_TYPES.filter((instrument) => lots.some((lot) => lot.instrument === instrument)),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex w-fit max-w-full flex-wrap gap-1.5 rounded-lg border border-[var(--hairline)] bg-black/25 p-0.5">
        {options.map((option) => (
          <button
            aria-pressed={option === value}
            className={`rounded-md px-2.5 py-1 font-mono text-[10px] transition ${
              option === value
                ? "bg-white/[0.08] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--text-soft)]"
            }`}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      {value !== "TODOS" ? (
        <p className="font-mono text-[10px] text-[var(--muted)]">otros movimientos ocultos con filtro activo</p>
      ) : null}
    </div>
  );
}

function PendingMaturities({ lots }: { lots: InvestmentLot[] }) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-5 py-[18px] backdrop-blur-2xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Vencimientos pendientes</p>
      {lots.length === 0 ? (
        <p className="mt-3 text-[12px] leading-5 text-[var(--text-soft)]">
          No hay lotes con vencimiento futuro en esta selección.
        </p>
      ) : (
        <div className="mt-3 grid gap-1.5">
          {lots.map((lot) => (
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-[var(--hairline)] bg-white/[0.03] px-3 py-2"
              key={lot.id}
            >
              <span className="h-5 w-[3px] rounded-sm" style={{ background: instrumentColors[lot.instrument] }} />
              <span className="font-mono text-[11px]" style={{ color: instrumentColors[lot.instrument] }}>
                {lot.instrument}
              </span>
              <span className="font-mono text-[11px] text-[var(--foreground)]">{formatCurrency(lot.amount)}</span>
              <span className="ml-auto font-mono text-[11px] text-[var(--text-soft)]">
                {formatIsoDate(lot.maturityDate)}
              </span>
              <span className="w-20 text-right font-mono text-[10px] text-[var(--muted)]">
                en {daysUntil(lot.maturityDate!)} días
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type MonthEntry = {
  month: string;
  lots: InvestmentLot[];
  lotsTotal: number;
  registeredAt?: string;
  movements: AssetMovement[];
  noActivity?: AssetMovement;
};

function MonthEntry({
  entry,
  onDeleteMovement,
}: {
  entry: MonthEntry;
  onDeleteMovement: (movement: AssetMovement) => void;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--hairline)] bg-black/25 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--hairline)] pb-2.5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Mes {entry.month}</p>
          <p className="mt-0.5 text-[13px] font-semibold">{formatMonthLabel(entry.month)}</p>
        </div>
        {entry.lotsTotal > 0 ? (
          <p className="font-mono text-[13px] text-[var(--foreground)]">{formatCurrency(entry.lotsTotal)}</p>
        ) : null}
      </div>

      {entry.noActivity ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--hairline)] bg-white/[0.03] px-3 py-2">
          <span className="font-mono text-[11px] text-[var(--text-soft)]">Sin movimientos registrados este mes.</span>
          {entry.noActivity.notes ? (
            <span className="font-mono text-[10px] text-[var(--muted)]">{entry.noActivity.notes}</span>
          ) : null}
          <button
            className="ml-auto font-mono text-[10px] text-[var(--muted)] transition hover:text-[var(--warn)]"
            onClick={() => onDeleteMovement(entry.noActivity!)}
            type="button"
          >
            Quitar marca
          </button>
        </div>
      ) : null}

      {entry.lots.length > 0 ? (
        <div className="mt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Instrumentos gubernamentales
            {entry.registeredAt ? ` · registrado el ${formatTimestamp(entry.registeredAt)}` : ""}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] [&>th]:pr-5 [&>th:last-child]:pr-0">
                  <th className="pb-1.5 font-normal">Instrumento</th>
                  <th className="pb-1.5 text-right font-normal">Monto</th>
                  <th className="pb-1.5 font-normal">Subasta</th>
                  <th className="pb-1.5 font-normal">Vence</th>
                  <th className="pb-1.5 text-right font-normal">Plazo</th>
                  <th className="pb-1.5 text-right font-normal">Tasa</th>
                  <th className="pb-1.5 text-right font-normal">Retención est.</th>
                </tr>
              </thead>
              <tbody>
                {entry.lots.map((lot) => (
                  <LotRow key={lot.id} lot={lot} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {entry.movements.length > 0 ? (
        <div className="mt-3.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">Otros movimientos</p>
          <div className="mt-2 grid gap-1.5">
            {entry.movements.map((movement) => (
              <MovementRow key={movement.id} movement={movement} onDelete={onDeleteMovement} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LotRow({ lot }: { lot: InvestmentLot }) {
  const mismatch = hasTermMismatch(lot);

  return (
    <tr className="border-t border-[var(--hairline-2)] font-mono text-[11px] [&>td]:pr-5 [&>td:last-child]:pr-0">
      <td className="py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-sm" style={{ background: instrumentColors[lot.instrument] }} />
          <span style={{ color: instrumentColors[lot.instrument] }}>{lot.instrument}</span>
        </span>
      </td>
      <td className="py-1.5 text-right text-[var(--foreground)]">{formatCurrency(lot.amount)}</td>
      <td className="py-1.5 text-[var(--text-soft)]">{lot.date ? formatIsoDate(lot.date) : "—"}</td>
      <td className="py-1.5 text-[var(--text-soft)]">{lot.maturityDate ? formatIsoDate(lot.maturityDate) : "—"}</td>
      <td className="py-1.5 text-right text-[var(--text-soft)]">
        <span className="inline-flex items-center gap-1">
          {lot.termYears}a
          {mismatch ? (
            <span
              className="cursor-help text-[var(--udibonos)]"
              title={`Las fechas guardadas dan ${effectiveTermYears(lot).toFixed(2)} años, no ${lot.termYears}. La proyección usa el plazo y el cálculo fiscal usa las fechas.`}
            >
              ⚠
            </span>
          ) : null}
        </span>
      </td>
      <td className="py-1.5 text-right text-[var(--foreground)]">{formatPercent(lot.annualRate)}</td>
      <td className="py-1.5 text-right text-[var(--muted)]">{formatCurrency(lot.estimatedAnnualWithholding)}</td>
    </tr>
  );
}

function MovementRow({
  movement,
  onDelete,
}: {
  movement: AssetMovement;
  onDelete: (movement: AssetMovement) => void;
}) {
  const outgoing = movement.kind === "BUY" || movement.kind === "WITHDRAWAL";

  return (
    <div className="rounded-[10px] border border-[var(--hairline)] bg-white/[0.03] px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-md border border-[var(--hairline)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-soft)]">
          {ASSET_MOVEMENT_LABELS[movement.kind]}
        </span>
        <span className="font-mono text-[11px] text-[var(--foreground)]">{movement.asset}</span>
        {typeof movement.quantity === "number" ? (
          <span className="font-mono text-[11px] text-[var(--text-soft)]">{formatQuantity(movement.quantity)}</span>
        ) : null}
        {typeof movement.amount === "number" ? (
          <span className="ml-auto font-mono text-[11px] text-[var(--foreground)]">
            {outgoing ? "−" : "+"}
            {formatCurrencyPrecise(movement.amount, movement.quoteCurrency)}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[9.5px] text-[var(--muted)]">
        {movement.occurredAt ? <span>{formatTimestamp(movement.occurredAt)}</span> : null}
        {typeof movement.unitPrice === "number" ? (
          <span>
            1 {movement.asset} = {formatCurrencyPrecise(movement.unitPrice, movement.quoteCurrency, 8)}
          </span>
        ) : null}
        {typeof movement.feeAmount === "number" ? (
          <span>
            comisión {formatQuantity(movement.feeAmount)} {movement.feeAsset ?? ""}
          </span>
        ) : null}
        {movement.venue ? <span>{movement.venue}</span> : null}
        {movement.notes ? <span className="text-[var(--text-soft)]">{movement.notes}</span> : null}
        <button
          className="ml-auto transition hover:text-[var(--warn)]"
          onClick={() => onDelete(movement)}
          type="button"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function Stat({ hint, label, value }: { hint?: string; label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--hairline)] bg-[var(--panel-bg)] px-4 py-3.5 backdrop-blur-2xl">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-mono text-[18px] tracking-[-0.02em] text-[var(--foreground)]">{value}</p>
      {hint ? <p className="mt-0.5 font-mono text-[9px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-6 py-12 text-center backdrop-blur-2xl">
      <p className="text-[17px] font-semibold tracking-[-0.015em]">Todavía no hay registros</p>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-[var(--text-soft)]">
        Registra tu primer lote mensual desde el resumen y aquí verás el histórico completo con fechas de captura,
        subasta y vencimiento.
      </p>
      <Link
        className="mt-5 inline-flex rounded-full bg-[var(--foreground)] px-4 py-2 text-[12px] font-semibold text-[var(--background)]"
        href="/"
      >
        Ir al resumen
      </Link>
    </section>
  );
}

function SignedOut({ message }: { message: string | null }) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-6 py-12 text-center backdrop-blur-2xl">
      <p className="text-[17px] font-semibold tracking-[-0.015em]">Inicia sesión para ver tu histórico</p>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-[var(--text-soft)]">
        {message ?? "Tus registros se guardan por usuario en Supabase."}
      </p>
      <Link
        className="mt-5 inline-flex rounded-full bg-[var(--foreground)] px-4 py-2 text-[12px] font-semibold text-[var(--background)]"
        href="/"
      >
        Entrar
      </Link>
    </section>
  );
}

/** Un renglón por mes con lotes gubernamentales y/o movimientos, del más reciente al más viejo. */
function buildTimeline(lots: InvestmentLot[], movements: AssetMovement[]): MonthEntry[] {
  const months = new Set([...lots.map((lot) => lot.month), ...movements.map((movement) => movement.month)]);

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const monthLots = lots.filter((lot) => lot.month === month);
      const monthMovements = movements.filter((movement) => movement.month === month);

      return {
        month,
        lots: monthLots,
        lotsTotal: monthLots.reduce((sum, lot) => sum + lot.amount, 0),
        registeredAt: monthLots.map((lot) => lot.createdAt).sort()[0],
        movements: monthMovements
          .filter((movement) => movement.kind !== "NONE")
          .sort((a, b) => (a.occurredAt ?? a.createdAt).localeCompare(b.occurredAt ?? b.createdAt)),
        noActivity: monthMovements.find((movement) => movement.kind === "NONE"),
      };
    });
}

function pendingMaturities(lots: InvestmentLot[]) {
  const today = new Date().toISOString().slice(0, 10);

  return lots
    .filter((lot) => lot.maturityDate && lot.maturityDate >= today)
    .sort((a, b) => a.maturityDate!.localeCompare(b.maturityDate!));
}

function summarize(lots: InvestmentLot[]) {
  const pending = pendingMaturities(lots);

  return {
    count: lots.length,
    invested: lots.reduce((sum, lot) => sum + lot.amount, 0),
    months: new Set(lots.map((lot) => lot.month)).size,
    nextMaturity: pending[0]?.maturityDate,
  };
}

function daysUntil(isoDate: string) {
  const target = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatMonthLabel(month: string) {
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
    new Date(`${month}-02T00:00:00`),
  );

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 8 }).format(value);
}
