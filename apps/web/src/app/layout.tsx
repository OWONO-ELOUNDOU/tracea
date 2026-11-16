import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tracea — Plans architecturaux 2D et 3D",
  description:
    "Décrivez votre projet, obtenez des plans d'architecte cotés et exportez-les aux formats du métier.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
