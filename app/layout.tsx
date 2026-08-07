import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Sora } from "next/font/google";

import { Providers } from "@/app/providers";
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
    title: "Poke Challenge",
    description: "Entraîne tes connaissances en Pokémon avec des mini-jeux : Pokedle, Cris, QCM, etc.",
    icons: {
        icon: [
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/icon.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
        shortcut: "/favicon.ico",
    },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="fr" className={`${dmSans.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}>
            <body className="min-h-full">
                <Providers>
                    <PageShell>{children}</PageShell>
                </Providers>
            </body>
        </html>
    );
}
