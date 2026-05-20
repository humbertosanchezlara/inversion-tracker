type BulletColumnProps = {
  dot?: string;
  items?: string[];
  label: string;
  numbered?: boolean;
};

export default function BulletColumn({ dot = "var(--bonos)", items = [], label, numbered = false }: BulletColumnProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="border-b border-[var(--hairline)] pb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item, index) => (
            <li className="flex items-start gap-2" key={`${label}-${index}-${item}`}>
              {numbered ? (
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[rgba(103,232,200,0.12)] font-mono text-[10px] font-semibold"
                  style={{ color: dot }}
                >
                  {index + 1}
                </span>
              ) : (
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: dot, boxShadow: `0 0 5px ${dot}` }}
                />
              )}
              <span className="text-[11.5px] leading-5 text-[var(--text-soft)]">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11.5px] leading-5 text-[var(--muted)]">Sin datos en el último análisis.</p>
      )}
    </div>
  );
}
