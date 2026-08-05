import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Sora } from "next/font/google";

import { PageShell } from "@/components/layout/PageShell";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sora = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poke Challenge — Bac Pokémon",
  description:
    "Entraîne-toi au bac Pokémon avec des mini-jeux : QCM images/noms et saisie par lettre.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
