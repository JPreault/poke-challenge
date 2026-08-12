"use client";

import { Play, Shuffle } from "lucide-react";
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
        <main className="w-full pb-16 pt-4 sm:pb-24 sm:pt-6">
            <header className="mb-12 sm:mb-20">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Poke Challenge</p>
                <h1 className="font-heading text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl lg:text-5xl">Non classée</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
                    Joue en mode non classé. Connecte-toi pour débloquer l&apos;entraînement et le mode classé.
                </p>
            </header>

            <section className="mb-24">
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h2 className="font-heading text-base font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:text-lg">Mini-jeux</h2>
                    <Link href="/game/shuffle" className={cn(buttonVariants({ size: "lg" }), "w-full shrink-0 gap-2 sm:w-auto")}>
                        <Shuffle data-icon="inline-start" className="size-4" />
                        Mode shuffle
                    </Link>
                </div>
                <div className="grid gap-4">
                    {games.map((game, index) => (
                        <article key={game.mode} className="surface-hover flex items-center gap-4 p-5 md:gap-6 md:p-6">
                            <div className="min-w-0 flex-1 space-y-2">
                                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">{game.title}</h3>
                                <p className="text-sm leading-6 text-muted-foreground md:text-base md:leading-7">{game.description}</p>
                            </div>

                            <Link
                                href={`/game/${game.mode}`}
                                ref={(node) => {
                                    gameLinksRef.current[index] = node;
                                }}
                                onKeyDown={(event) => handleGameCardKeyDown(event, index)}
                                aria-label={`Jouer à ${game.title}`}
                                title={`Jouer à ${game.title}`}
                                className={cn(buttonVariants({ size: "icon-lg" }), "shrink-0")}
                            >
                                <Play className="size-5 fill-current" />
                            </Link>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
