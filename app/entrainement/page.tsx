"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { TRAINING_GAMES } from "@/lib/games/home-games";
import { cn } from "@/lib/utils";

export default function EntrainementPage() {
    const router = useRouter();
    const { status } = useSession();
    const [poolReady, setPoolReady] = useState(false);
    const [hasTrainingList, setHasTrainingList] = useState(false);
    const gameLinksRef = useRef<Array<HTMLAnchorElement | null>>([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/auth/signin?callbackUrl=/entrainement");
            return;
        }
        if (status !== "authenticated") return;

        let active = true;
        const load = async () => {
            try {
                const response = await fetch("/api/training/pool", { cache: "no-store" });
                if (!response.ok) {
                    if (active) {
                        setHasTrainingList(false);
                        setPoolReady(true);
                    }
                    return;
                }
                const payload = (await response.json()) as {
                    catalog: Array<{ id: number; nameFr: string }>;
                };
                if (!active) return;
                setHasTrainingList(payload.catalog.length > 0);
                setPoolReady(true);
            } catch {
                if (active) {
                    setHasTrainingList(false);
                    setPoolReady(true);
                }
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [status, router]);

    const handleGameCardKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
        const columns = 2;
        let nextIndex = index;

        if (event.key === "ArrowRight") nextIndex = index + 1;
        if (event.key === "ArrowLeft") nextIndex = index - 1;
        if (event.key === "ArrowDown") nextIndex = index + columns;
        if (event.key === "ArrowUp") nextIndex = index - columns;

        if (nextIndex === index) return;
        if (nextIndex < 0 || nextIndex >= TRAINING_GAMES.length) return;

        event.preventDefault();
        gameLinksRef.current[nextIndex]?.focus();
    };

    if (status === "loading" || status === "unauthenticated" || !poolReady) {
        return (
            <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
                <p className="text-muted-foreground">Chargement de l&apos;entraînement…</p>
            </main>
        );
    }

    if (!hasTrainingList) {
        return (
            <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
                <header className="mb-12 max-w-2xl">
                    <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Poke Challenge</p>
                    <h1 className="font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl">Entraînement</h1>
                </header>

                <section className="surface max-w-2xl p-8">
                    <h2 className="font-heading text-xl font-semibold">Ta liste est vide</h2>
                    <p className="mt-3 text-base leading-7 text-muted-foreground">
                        Ajoute des Pokémon dans ton profil pour débloquer le mode Entraînement.
                    </p>
                    <Link href="/profile" className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")}>
                        Remplir ma liste
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
            <header className="mb-20 max-w-2xl">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Poke Challenge</p>
                <h1 className="font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl">Entraînement</h1>
                <p className="mt-6 text-lg leading-8 text-muted-foreground">Entraîne-toi sur ta liste personnelle de Pokémon.</p>
            </header>

            <section className="mb-12">
                <div className="surface flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl space-y-2">
                        <h2 className="font-heading text-xl font-semibold text-foreground">Shuffle</h2>
                        <p className="text-base leading-7 text-muted-foreground">
                            Choisis les mini-jeux à mélanger, puis enchaîne des manches aléatoires parmi ta sélection.
                        </p>
                    </div>
                    <Link
                        href="/game/shuffle?interface=bac-training"
                        className={cn(buttonVariants({ size: "lg" }), "w-full shrink-0 justify-center sm:w-auto")}
                    >
                        Configurer
                    </Link>
                </div>
            </section>

            <section className="mb-24">
                <h2 className="mb-8 font-heading text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">Mini-jeux</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                    {TRAINING_GAMES.map((game, index) => (
                        <article key={game.mode} className="surface-hover flex flex-col p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{game.tag}</span>
                            </div>

                            <div className="flex-1 space-y-3">
                                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">{game.title}</h3>
                                <p className="text-base leading-7 text-muted-foreground">{game.description}</p>
                            </div>

                            <Link
                                href={`/game/${game.mode}?interface=bac-training`}
                                ref={(node) => {
                                    gameLinksRef.current[index] = node;
                                }}
                                onKeyDown={(event) => handleGameCardKeyDown(event, index)}
                                className={cn(buttonVariants({ size: "lg" }), "mt-10 w-full justify-center")}
                            >
                                Jouer
                            </Link>
                        </article>
                    ))}
                </div>
            </section>

            <section className="surface p-8">
                <h2 className="font-heading text-xl font-semibold">Ta liste</h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground">Gère les Pokémon de ton entraînement depuis ton profil.</p>
                <Link href="/profile" className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")}>
                    Ouvrir le profil
                </Link>
            </section>
        </main>
    );
}
