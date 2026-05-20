import Link from "next/link";

export default function AnalisisPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] p-8 backdrop-blur-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Análisis</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.015em]">Histórico de análisis</h1>
        <p className="mt-3 text-[13px] leading-6 text-[var(--text-soft)]">
          Vista pendiente de handoff. El panel ejecutivo del mes ya vive en el dashboard principal.
        </p>
        <Link className="mt-6 inline-flex rounded-full bg-[var(--foreground)] px-4 py-2 text-[12px] font-semibold text-[var(--background)]" href="/">
          Volver al resumen
        </Link>
      </section>
    </main>
  );
}
