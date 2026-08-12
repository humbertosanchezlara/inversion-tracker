"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-[var(--hairline)] bg-[var(--panel-bg)] p-1 backdrop-blur-2xl lg:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-10 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${
              isActive ? "bg-white/[0.06] text-[var(--foreground)]" : "text-[var(--text-soft)]"
            }`}
            href={item.href}
            key={item.label}
          >
            <span className="font-mono text-[13px]">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
