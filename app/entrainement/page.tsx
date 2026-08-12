"use client";

import { Play, Shuffle } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { TRAINING_GAMES } from "@/lib/games/home-games";
import { getPokemonSpriteUrl } from "@/lib/pokemon/sprite";
import { cn } from "@/lib/utils";

interface TrainingPokemon {
    id: number;
    nameFr: string;
}

export default function EntrainementPage() {
    const router = useRouter();
    const { status } = useSession();
    const [poolReady, setPoolReady] = useState(false);
    const [trainingList, setTrainingList] = useState<TrainingPokemon[]>([]);
    const gameLinksRef = useRef<Array<HTMLAnchorElement | null>>([]);
    const hasTrainingList = trainingList.length > 0;

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
                        setTrainingList([]);
                        setPoolReady(true);
                    }
                    return;
                }
                const payload = (await response.json()) as {
                    catalog: TrainingPokemon[];
                };
                if (!active) return;
                setTrainingList(payload.catalog);
                setPoolReady(true);
            } catch {
                if (active) {
                    setTrainingList([]);
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
            <main className="w-full pb-16 pt-4 sm:pb-24 sm:pt-6">
                <p className="text-muted-foreground">Chargement de l&apos;entraînement…</p>
            </main>
        );
    }

    if (!hasTrainingList) {
        return (
            <main className="w-full pb-16 pt-4 sm:pb-24 sm:pt-6">
                <header className="mb-12 max-w-2xl sm:mb-20">
                    <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Poke Challenge</p>
                    <h1 className="font-heading text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl lg:text-5xl">Entraînement</h1>
                </header>

                <section className="surface max-w-2xl p-5 sm:p-8">
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
        <main className="w-full pb-16 pt-4 sm:pb-24 sm:pt-6">
            <header className="mb-12 max-w-2xl sm:mb-20">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Poke Challenge</p>
                <h1 className="font-heading text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl lg:text-5xl">Entraînement</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">Entraîne-toi sur ta liste personnelle de Pokémon.</p>
            </header>

            <section className="mb-16 sm:mb-24">
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h2 className="font-heading text-base font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:text-lg">Mini-jeux</h2>
                    <Link href="/game/shuffle?interface=bac-training" className={cn(buttonVariants({ size: "lg" }), "w-full shrink-0 gap-2 sm:w-auto")}>
                        <Shuffle data-icon="inline-start" className="size-4" />
                        Mode shuffle
                    </Link>
                </div>
                <div className="grid gap-4">
                    {TRAINING_GAMES.map((game, index) => (
                        <article key={game.mode} className="surface-hover flex items-center gap-4 p-5 md:gap-6 md:p-6">
                            <div className="min-w-0 flex-1 space-y-2">
                                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">{game.title}</h3>
                                <p className="text-sm leading-6 text-muted-foreground md:text-base md:leading-7">{game.description}</p>
                            </div>

                            <Link
                                href={`/game/${game.mode}?interface=bac-training`}
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

            <section className="surface space-y-4 p-5 sm:p-8">
                <div className="space-y-1">
                    <h2 className="font-heading text-xl font-semibold">Ta liste</h2>
                    <p className="text-sm text-muted-foreground">Lecture seule. Pour ajouter ou retirer des Pokémon, passe par ton profil.</p>
                </div>

                <ul className="flex flex-wrap gap-2">
                    {trainingList.map((pokemon) => (
                        <li key={pokemon.id} className="surface flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm">
                            <Image
                                src={getPokemonSpriteUrl(pokemon.id)}
                                alt=""
                                width={28}
                                height={28}
                                className="rounded-full object-contain"
                                unoptimized
                            />
                            <span>{pokemon.nameFr}</span>
                        </li>
                    ))}
                </ul>

                <Link href="/profile" className={cn(buttonVariants({ size: "lg" }), "inline-flex")}>
                    Modifier ma liste
                </Link>
            </section>
        </main>
    );
}
