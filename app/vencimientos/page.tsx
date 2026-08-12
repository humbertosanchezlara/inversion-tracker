"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useTrackerData } from "@/app/hooks/useTrackerData";
import BackgroundMesh from "@/app/components/dashboard/BackgroundMesh";
import MobileNav from "@/app/components/dashboard/MobileNav";
import Sidebar from "@/app/components/dashboard/Sidebar";
import { effectiveTermYears, hasTermMismatch } from "@/core/lots";
import { formatIsoDate } from "@/core/dates";
import { INSTRUMENT_TYPES, type InstrumentType, type InvestmentLot } from "@/core/types";
import { formatCurrency, formatPercent } from "@/lib/format";

type InstrumentFilter = InstrumentType | "TODOS";

const instrumentColors: Record<InstrumentType, string> = {
  BONOS: "var(--bonos)",
  UDIBONOS: "var(--udibonos)",
  CETES: "var(--cetes)",
  BONDDIA: "var(--bonddia)",
};

export default function VencimientosPage() {
  const { lots, message, snapshots, status } = useTrackerData();
  const [filter, setFilter] = useState<InstrumentFilter>("TODOS");

  const activeSnapshot = snapshots.find((snapshot) => snapshot.quotes.length > 0);
  const visibleLots = useMemo(
    () => (filter === "TODOS" ? lots : lots.filter((lot) => lot.instrument === filter)),
    [filter, lots],
  );
  const registrations = useMemo(() => groupByRegistration(visibleLots), [visibleLots]);
  const pending = useMemo(() => pendingMaturities(visibleLots), [visibleLots]);
  const totals = useMemo(() => summarize(visibleLots), [visibleLots]);

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
            <Link
              className="inline-flex h-9 w-fit items-center rounded-[999px] border border-[var(--hairline)] bg-white/[0.06] px-3.5 text-[12px] text-[var(--foreground)] transition hover:bg-white/[0.09]"
              href="/"
            >
              ← Volver al resumen
            </Link>
          </header>
          <MobileNav />

          {status === "loading" ? (
            <div className="dashboard-skeleton h-64 rounded-2xl border border-[var(--hairline)]" />
          ) : status === "signed-out" ? (
            <SignedOut message={message} />
          ) : lots.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-[10px] xl:grid-cols-4">
                <Stat label="Aportado" value={formatCurrency(totals.invested)} />
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
                      {registrations.length} {registrations.length === 1 ? "sesión" : "sesiones"} de captura
                    </h2>
                  </div>
                  <p className="font-mono text-[10px] text-[var(--muted)]">más reciente primero</p>
                </div>

                <div className="mt-4 grid gap-4">
                  {registrations.map((group) => (
                    <RegistrationGroup group={group} key={group.key} />
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </div>
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
  const options: InstrumentFilter[] = ["TODOS", ...INSTRUMENT_TYPES.filter((instrument) =>
    lots.some((lot) => lot.instrument === instrument),
  )];

  return (
    <div className="flex w-fit max-w-full flex-wrap gap-1.5 rounded-lg border border-[var(--hairline)] bg-black/25 p-0.5">
      {options.map((option) => (
        <button
          aria-pressed={option === value}
          className={`rounded-md px-2.5 py-1 font-mono text-[10px] transition ${
            option === value ? "bg-white/[0.08] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--text-soft)]"
          }`}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
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

type RegistrationGroup = {
  key: string;
  month: string;
  registeredAt: string;
  lots: InvestmentLot[];
  total: number;
};

function RegistrationGroup({ group }: { group: RegistrationGroup }) {
  return (
    <div className="rounded-[14px] border border-[var(--hairline)] bg-black/25 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--hairline)] pb-2.5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Mes {group.month}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold">Registrado el {formatTimestamp(group.registeredAt)}</p>
        </div>
        <p className="font-mono text-[13px] text-[var(--foreground)]">{formatCurrency(group.total)}</p>
      </div>

      <div className="mt-2.5 overflow-x-auto">
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
            {group.lots.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </tbody>
        </table>
      </div>
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

/**
 * Una sesión de captura = los lotes de un mismo mes guardados el mismo día. Agrupar por
 * minuto partiría un registro normal en varias entradas, y agrupar solo por mes uniría
 * una corrección hecha semanas después.
 */
function groupByRegistration(lots: InvestmentLot[]): RegistrationGroup[] {
  const groups = new Map<string, RegistrationGroup>();

  for (const lot of lots) {
    const key = `${lot.month}:${lot.createdAt.slice(0, 10)}`;
    const group = groups.get(key) ?? {
      key,
      month: lot.month,
      registeredAt: lot.createdAt,
      lots: [],
      total: 0,
    };
    group.lots.push(lot);
    group.total += lot.amount;
    if (lot.createdAt < group.registeredAt) group.registeredAt = lot.createdAt;
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
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
