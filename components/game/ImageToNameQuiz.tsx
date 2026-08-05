"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { Button } from "@/components/ui/button";
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

interface ImageToNameQuizProps {
  session: GameSession;
}

type FeedbackState = "idle" | "correct" | "incorrect";

interface RoundState {
  pokemon: BacPokemon;
  choices: QuizPokemon[];
}

export function ImageToNameRound({ session, onRoundComplete }: RoundProps) {
  const bacPokemon = useMemo(() => getBacPokemon(), []);
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const [round, setRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const startRound = useCallback(() => {
    const pokemon = pickRandom(bacPokemon);
    const catalogPokemon = catalog.find((entry) => entry.id === pokemon.id);
    if (!catalogPokemon) return;
    setRound({
      pokemon,
      choices: buildQuizChoices(catalogPokemon, catalog),
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
      question: "Quel est ce Pokémon ?",
      userAnswer: pokemon.nameFr,
      correctAnswer: round.pokemon.nameFr,
      isCorrect,
      questionImage: round.pokemon.artwork,
    });

    window.setTimeout(advanceRound, 1000);
  };

  const handleChoiceKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!round || feedback !== "idle") return;

    const columns = 2;
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = index + 1;
    if (event.key === "ArrowLeft") nextIndex = index - 1;
    if (event.key === "ArrowDown") nextIndex = index + columns;
    if (event.key === "ArrowUp") nextIndex = index - columns;

    if (nextIndex === index) return;
    if (nextIndex < 0 || nextIndex >= round.choices.length) return;

    event.preventDefault();
    const nextButton = document.getElementById(
      `image-to-name-choice-${nextIndex}`,
    ) as HTMLButtonElement | null;
    nextButton?.focus();
  };

  useEffect(() => {
    if (!round || feedback !== "idle") return;

    const focusChoiceFromArrow = (event: KeyboardEvent) => {
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const isAlreadyOnChoice = active?.id?.startsWith("image-to-name-choice-");
      if (isAlreadyOnChoice) return;

      const targetIndex =
        event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? round.choices.length - 1
          : 0;
      const target = document.getElementById(
        `image-to-name-choice-${targetIndex}`,
      ) as HTMLButtonElement | null;

      if (!target) return;
      event.preventDefault();
      target.focus();
    };

    window.addEventListener("keydown", focusChoiceFromArrow);
    return () => {
      window.removeEventListener("keydown", focusChoiceFromArrow);
    };
  }, [round, feedback]);

  if (!round) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="display-frame flex h-56 w-56 items-center justify-center">
        <Image
          src={round.pokemon.artwork}
          alt="Pokémon mystère"
          width={192}
          height={192}
          className="object-contain"
          priority
        />
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

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {round.choices.map((pokemon, index) => {
          const isSelected = selectedId === pokemon.id;
          const isCorrectChoice = pokemon.id === round.pokemon.id;

          return (
            <Button
              key={pokemon.id}
              id={`image-to-name-choice-${index}`}
              variant="outline"
              className={cn(
                "h-auto justify-start px-5 py-4 text-base font-medium",
                feedback === "idle" &&
                  "hover:border-foreground/20 hover:bg-muted/50",
                feedback !== "idle" &&
                  isCorrectChoice &&
                  "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
                feedback !== "idle" &&
                  isSelected &&
                  !isCorrectChoice &&
                  "border-poke-red/40 bg-poke-red/5 text-poke-red",
              )}
              onClick={() => handleAnswer(pokemon)}
              onKeyDown={(event) => handleChoiceKeyDown(event, index)}
              disabled={feedback !== "idle"}
            >
              {pokemon.nameFr}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function ImageToNameQuiz({ session }: ImageToNameQuizProps) {
  return (
    <GameShell
      session={session}
      title="Devine le nom"
      description="Clique sur le bon nom parmi les 4 propositions."
    >
      <ImageToNameRound session={session} />
    </GameShell>
  );
}
