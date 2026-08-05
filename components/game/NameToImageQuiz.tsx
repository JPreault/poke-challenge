"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { buildQuizChoices } from "@/lib/games/distractors";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getBacPokemon, getCatalogPokemon } from "@/lib/pokemon/data";
import type { BacPokemon, QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
}

interface NameToImageQuizProps {
  session: GameSession;
}

type FeedbackState = "idle" | "correct" | "incorrect";

interface RoundState {
  pokemon: BacPokemon;
  choices: QuizPokemon[];
}

export function NameToImageRound({ session, onRoundComplete }: RoundProps) {
  const bacPokemon = useMemo(() => getBacPokemon(), []);
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const [round, setRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const startRound = useCallback(() => {
    const pokemon = pickRandom(bacPokemon);
    setRound({
      pokemon,
      choices: buildQuizChoices(pokemon, catalog),
    });
    setFeedback("idle");
    setSelectedId(null);
  }, [bacPokemon, catalog]);

  const advanceRound = useCallback(() => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    startRound();
  }, [onRoundComplete, startRound]);

  useEffect(() => {
    const timeoutId = window.setTimeout(startRound, 0);
    return () => window.clearTimeout(timeoutId);
  }, [startRound]);

  const handleAnswer = (pokemon: QuizPokemon) => {
    if (!round || feedback !== "idle") return;

    const isCorrect = pokemon.id === round.pokemon.id;
    setSelectedId(pokemon.id);
    setFeedback(isCorrect ? "correct" : "incorrect");

    session.recordRound({
      question: `Quelle image correspond à ${round.pokemon.nameFr} ?`,
      userAnswer: pokemon.nameFr,
      correctAnswer: round.pokemon.nameFr,
      isCorrect,
      chosenImage: pokemon.artwork,
      chosenLabel: pokemon.nameFr,
      correctImage: round.pokemon.artwork,
    });

    window.setTimeout(advanceRound, 1000);
  };

  if (!round) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="display-frame w-full py-10 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Trouve l&apos;image de
        </p>
        <p className="font-heading text-4xl font-bold">{round.pokemon.nameFr}</p>
      </div>

      {feedback !== "idle" ? (
        <p
          className={cn(
            "text-base",
            feedback === "correct" ? "feedback-success" : "feedback-error",
          )}
        >
          {feedback === "correct"
            ? "Bravo !"
            : `Raté — c'était ${round.pokemon.nameFr}.`}
        </p>
      ) : (
        <div className="h-6" />
      )}

      <div className="grid w-full grid-cols-2 gap-4">
        {round.choices.map((pokemon) => {
          const isSelected = selectedId === pokemon.id;
          const isCorrectChoice = pokemon.id === round.pokemon.id;

          return (
            <button
              key={pokemon.id}
              type="button"
              className={cn(
                "display-frame flex items-center justify-center p-6 transition disabled:cursor-not-allowed",
                feedback === "idle" &&
                  "hover:border-foreground/20 hover:bg-muted/50",
                feedback !== "idle" &&
                  isCorrectChoice &&
                  "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30",
                feedback !== "idle" &&
                  isSelected &&
                  !isCorrectChoice &&
                  "border-poke-red/40 bg-poke-red/5",
              )}
              onClick={() => handleAnswer(pokemon)}
              disabled={feedback !== "idle"}
            >
              <div className="relative h-28 w-28">
                <Image
                  src={pokemon.artwork}
                  alt={pokemon.nameFr}
                  fill
                  className="object-contain"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NameToImageQuiz({ session }: NameToImageQuizProps) {
  return (
    <GameShell
      session={session}
      title="Devine l'image"
      description="Clique sur la bonne image parmi les 4 propositions."
    >
      <NameToImageRound session={session} />
    </GameShell>
  );
}
