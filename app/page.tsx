"use client";

import Link from "next/link";
import { useRef } from "react";

import { buttonVariants } from "@/components/ui/button";
import { BAC_POKEMON } from "@/data/bac-list";
import { useInterfaceMode } from "@/lib/games/useInterfaceMode";
import type { GameMode } from "@/lib/games/types";
import { cn } from "@/lib/utils";

interface GameCard {
  mode: GameMode;
  title: string;
  description: string;
  tag: string;
}

const TRAINING_GAMES: GameCard[] = [
  {
    mode: "shuffle",
    title: "Shuffle",
    description:
      "Enchaîne les mini-jeux : à chaque manche, un jeu est choisi au hasard.",
    tag: "Mix",
  },
  {
    mode: "image-to-name",
    title: "Image → Nom",
    description:
      "Une image s'affiche, choisis le bon nom parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "name-to-image",
    title: "Nom → Image",
    description:
      "Un nom s'affiche, choisis la bonne image parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "letter-input",
    title: "Lettre → Nom",
    description:
      "Entre un Pokémon existant dont le nom français commence par la lettre affichée.",
    tag: "Saisie",
  },
] as const;

const ARENA_GAMES: GameCard[] = [
  {
    mode: "shuffle",
    title: "Shuffle",
    description:
      "Enchaîne les mini-jeux : à chaque manche, un jeu est choisi au hasard.",
    tag: "Mix",
  },
  {
    mode: "image-to-name",
    title: "Image → Nom",
    description:
      "Une image s'affiche, choisis le bon nom parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "name-to-image",
    title: "Nom → Image",
    description:
      "Un nom s'affiche, choisis la bonne image parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "letter-input",
    title: "Lettre → Nom",
    description:
      "Entre un Pokémon existant dont le nom français commence par la lettre affichée.",
    tag: "Saisie",
  },
  {
    mode: "cry-guess",
    title: "Pokémon → Cri",
    description:
      "Un Pokémon aléatoire s'affiche : trouve son cri parmi 4 propositions audio.",
    tag: "Audio",
  },
  {
    mode: "pokedle",
    title: "Pokédle",
    description:
      "Trouve le Pokémon mystère grâce à des indices colorés qui se dévoilent à chaque proposition.",
    tag: "Déduction",
  },
  {
    mode: "description-guess",
    title: "Description → Pokémon",
    description:
      "Lis une description Pokédex aléatoire et retrouve le Pokémon correspondant.",
    tag: "Déduction",
  },
] as const;

export default function HomePage() {
  const selectedInterface = useInterfaceMode();
  const games =
    selectedInterface === "bac-training" ? TRAINING_GAMES : ARENA_GAMES;
  const gameLinksRef = useRef<Array<HTMLAnchorElement | null>>([]);

  const handleGameCardKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
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
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8 sm:py-24">
      <header className="mb-20 max-w-2xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Bac Pokémon
        </p>
        <h1 className="font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl">
          Poke Challenge
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Choisis ton interface, puis lance un mini-jeu. Tu peux changer de mode
          à tout moment.
        </p>
      </header>

      <section className="mb-24">
        <h2 className="mb-8 font-heading text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Mini-jeux
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {games.map((game, index) => (
            <article
              key={game.mode}
              className="surface-hover flex flex-col p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {game.tag}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">
                  {game.title}
                </h3>
                <p className="text-base leading-7 text-muted-foreground">
                  {game.description}
                </p>
              </div>

              <Link
                href={
                  selectedInterface === "bac-training"
                    ? `/game/${game.mode}?interface=bac-training`
                    : `/game/${game.mode}`
                }
                ref={(node) => {
                  gameLinksRef.current[index] = node;
                }}
                onKeyDown={(event) => handleGameCardKeyDown(event, index)}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-10 w-full justify-center",
                )}
              >
                Jouer
              </Link>
            </article>
          ))}
        </div>
      </section>

      {selectedInterface === "bac-training" ? (
        <section>
        <div className="mb-8 space-y-2">
          <h2 className="font-heading text-2xl font-semibold">Liste du bac</h2>
          <p className="text-muted-foreground">
            Les 26 Pokémon à connaître, de A à Z.
          </p>
        </div>

        <div className="surface divide-y divide-border/60 overflow-hidden">
          <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-border/60">
            {[BAC_POKEMON.slice(0, 13), BAC_POKEMON.slice(13)].map(
              (column, columnIndex) => (
                <ul key={columnIndex}>
                  {column.map((entry) => (
                    <li
                      key={entry.letter}
                      className="flex items-center gap-5 border-b border-border/40 px-6 py-4 last:border-b-0 sm:last:border-b"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-poke-indigo/8 font-heading text-sm font-bold text-poke-indigo">
                        {entry.letter}
                      </span>
                      <span className="text-base font-medium text-foreground">
                        {entry.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </div>
        </section>
      ) : null}
    </main>
  );
}
