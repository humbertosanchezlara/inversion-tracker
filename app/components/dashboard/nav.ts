export type NavItem = {
  href: string;
  icon: string;
  label: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Resumen", icon: "◐", href: "/" },
  { label: "Vencimientos", icon: "◷", href: "/vencimientos" },
  { label: "Análisis", icon: "✦", href: "/analisis" },
  { label: "Fiscal", icon: "§", href: "/fiscal" },
];
