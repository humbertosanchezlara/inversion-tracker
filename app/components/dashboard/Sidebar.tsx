import type { MarketSnapshot } from "@/core/types";

type SidebarProps = {
  activeSnapshot?: MarketSnapshot;
  onSignOut: () => Promise<void>;
};

const nav = [
  { label: "Resumen", icon: "◐", href: "/", active: true },
  { label: "Vencimientos", icon: "◷", href: "/vencimientos" },
  { label: "Análisis", icon: "✦", href: "/analisis" },
  { label: "Fiscal", icon: "§", href: "/fiscal" },
];

export default function Sidebar({ activeSnapshot, onSignOut }: SidebarProps) {
  const fetchedAt = activeSnapshot?.fetchedAt
    ? new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(activeSnapshot.fetchedAt))
    : "Sin snapshot";

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-[var(--hairline)] bg-[var(--background-2)]/82 px-4 py-5 backdrop-blur-2xl lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--hairline)] bg-white/[0.06] text-[15px] shadow-[0_0_16px_rgba(103,232,200,0.16)]">
          ◐
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">Inversion</p>
          <h1 className="text-[14px] font-semibold tracking-[-0.015em]">CETES Directo</h1>
        </div>
      </div>

      <nav className="mt-8 grid gap-1.5">
        {nav.map((item) => (
          <a
            className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[12px] transition hover:bg-white/[0.08] ${
              item.active ? "bg-white/[0.06] text-[var(--foreground)]" : "text-[var(--text-soft)]"
            }`}
            href={item.href}
            key={item.label}
          >
            <span
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border border-[var(--hairline)] text-[12px] ${
                item.active
                  ? "bg-gradient-to-br from-[var(--bonos)] to-[var(--cetes)] text-[var(--background)] shadow-[0_0_8px_rgba(103,232,200,0.5)]"
                  : "bg-white/[0.035] text-[var(--muted)] group-hover:text-[var(--foreground)]"
              }`}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-[var(--hairline)] bg-white/[0.04] p-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--bonos)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--bonos)] shadow-[0_0_8px_var(--bonos)]" />
          </span>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--muted)]">Snapshot fresco</p>
        </div>
        <p className="mt-2 font-mono text-[11px] text-[var(--foreground)]">{fetchedAt}</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft)]">
          Tasas, inflación y retención sincronizadas para el dashboard.
        </p>
        <button
          className="mt-3 rounded-full border border-[var(--hairline)] px-3 py-1.5 text-[11px] text-[var(--text-soft)] transition hover:bg-white/[0.06] hover:text-[var(--foreground)]"
          onClick={onSignOut}
          type="button"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}
