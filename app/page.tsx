"use client";

import Link from "next/link";
import { useRef } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ARENA_GAMES } from "@/lib/games/home-games";
import { cn } from "@/lib/utils";

export default function HomePage() {
    const games = ARENA_GAMES;
    const gameLinksRef = useRef<Array<HTMLAnchorElement | null>>([]);

    const handleGameCardKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
        const columns = 2;
        let nextIndex = index;

        if (event.key === "ArrowRight") nextIndex = index + 1;
        if (event.key === "ArrowLeft") nextIndex = index - 1;
        if (event.key === "ArrowDown") nextIndex = index + columns;
        if (event.key === "ArrowUp") nextIndex = index - columns;

        if (nextIndex === index) return;
        if (nextIndex < 0 || nextIndex >= games.length) return;

        event.preventDefault();
        gameLinksRef.current[nextIndex]?.focus();
    };

    return (
        <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
            <header className="mb-20 max-w-2xl">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Poke Challenge</p>
                <h1 className="font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl">Arène</h1>
                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    Joue en mode Arène sur tout le Pokédex. Connecte-toi pour débloquer l&apos;entraînement personnalisé.
                </p>
            </header>

            <section className="mb-12">
                <div className="surface flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl space-y-2">
                        <h2 className="font-heading text-xl font-semibold text-foreground">Shuffle</h2>
                        <p className="text-base leading-7 text-muted-foreground">
                            Choisis les mini-jeux à mélanger, puis enchaîne des manches aléatoires parmi ta sélection.
                        </p>
                    </div>
                    <Link href="/game/shuffle" className={cn(buttonVariants({ size: "lg" }), "w-full shrink-0 justify-center sm:w-auto")}>
                        Configurer
                    </Link>
                </div>
            </section>

            <section className="mb-24">
                <h2 className="mb-8 font-heading text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">Mini-jeux</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                    {games.map((game, index) => (
                        <article key={game.mode} className="surface-hover flex flex-col p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{game.tag}</span>
                            </div>

                            <div className="flex-1 space-y-3">
                                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">{game.title}</h3>
                                <p className="text-base leading-7 text-muted-foreground">{game.description}</p>
                            </div>

                            <Link
                                href={`/game/${game.mode}`}
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
        </main>
    );
}
