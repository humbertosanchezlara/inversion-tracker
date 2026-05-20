type TopBarProps = {
  busy: string | null;
  month: string;
  onOpenRegister: () => void;
  onRefreshMarketData: () => Promise<void>;
};

function formatMonthLabel(month: string) {
  const date = new Date(`${month}-02T00:00:00`);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date).toUpperCase();
}

export default function TopBar({ busy, month, onOpenRegister, onRefreshMarketData }: TopBarProps) {
  return (
    <header className="flex min-h-[58px] flex-col justify-between gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] px-4 py-3 backdrop-blur-2xl md:flex-row md:items-center md:px-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{formatMonthLabel(month)}</p>
        <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
          Buenos días, Humberto
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[999px] border border-[var(--hairline)] bg-white/[0.06] px-3.5 text-[12px] text-[var(--foreground)] transition hover:bg-white/[0.09]"
          disabled={busy === "market"}
          onClick={onRefreshMarketData}
          type="button"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--bonos)] shadow-[0_0_8px_var(--bonos)]" />
          {busy === "market" ? "Actualizando" : "Actualizar fuentes"}
        </button>
        <button
          className="inline-flex h-9 items-center rounded-[999px] bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-[var(--background)] transition hover:shadow-[0_0_16px_rgba(234,238,242,0.25)]"
          onClick={onOpenRegister}
          type="button"
        >
          + Registrar mes
        </button>
      </div>
    </header>
  );
}
