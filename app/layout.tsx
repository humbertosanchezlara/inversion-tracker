import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tracker CETES Directo",
  description: "Tracking mensual y proyecciones de instrumentos gubernamentales mexicanos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
