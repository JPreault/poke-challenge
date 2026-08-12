import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Sora } from "next/font/google";
import { Suspense } from "react";

import { Providers } from "@/app/providers";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

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
    applicationName: "Poke Challenge",
    appleWebApp: {
        capable: true,
        title: "Poke Challenge",
        statusBarStyle: "default",
    },
    themeColor: "#b91c1c",
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
            <body className="flex min-h-full flex-col">
                <Providers>
                    <div className="relative flex min-h-full flex-1 flex-col">
                        <div aria-hidden className="pointer-events-none fixed inset-0 app-bg" />
                        <AppHeader />
                        <div className="relative z-10 flex min-h-full flex-1 flex-col pt-12">
                            <div className="min-h-0 flex-1">
                                <Suspense fallback={null}>{children}</Suspense>
                            </div>
                            <AppFooter />
                        </div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
