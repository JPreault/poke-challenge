"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { buildQuizChoices } from "@/lib/games/distractors";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getBacPokemon, getCatalogPokemon } from "@/lib/pokemon/data";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
  useBacPool?: boolean;
}

interface NameToImageQuizProps {
  session: GameSession;
  useBacPool?: boolean;
}

type FeedbackState = "idle" | "correct" | "incorrect";

interface RoundState {
  pokemon: QuizPokemon;
  choices: QuizPokemon[];
}

export function NameToImageRound({
  session,
  onRoundComplete,
  useBacPool = true,
}: RoundProps) {
  const bacPokemon = useMemo(() => getBacPokemon(), []);
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const [round, setRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const startRound = useCallback(() => {
    const pokemon = useBacPool
      ? catalog.find((entry) => entry.id === pickRandom(bacPokemon).id)
      : pickRandom(catalog);
    if (!pokemon) return;
    setRound({
      pokemon,
      choices: buildQuizChoices(pokemon, catalog),
    });
    setFeedback("idle");
    setSelectedId(null);
  }, [bacPokemon, catalog, useBacPool]);

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

  const handleSkip = useCallback(() => {
    if (!round || feedback !== "idle") return;

    session.recordRound({
      question: `Quelle image correspond à ${round.pokemon.nameFr} ?`,
      userAnswer: "Abandon",
      correctAnswer: round.pokemon.nameFr,
      isCorrect: false,
      skipped: true,
      correctImage: round.pokemon.artwork,
    });

    setFeedback("incorrect");
    window.setTimeout(advanceRound, 800);
  }, [advanceRound, feedback, round, session]);

  useRegisterSkip(handleSkip, Boolean(round) && feedback === "idle");

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
      `name-to-image-choice-${nextIndex}`,
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
      const isAlreadyOnChoice = active?.id?.startsWith("name-to-image-choice-");
      if (isAlreadyOnChoice) return;

      const targetIndex =
        event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? round.choices.length - 1
          : 0;
      const target = document.getElementById(
        `name-to-image-choice-${targetIndex}`,
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
        {round.choices.map((pokemon, index) => {
          const isSelected = selectedId === pokemon.id;
          const isCorrectChoice = pokemon.id === round.pokemon.id;

          return (
            <button
              key={pokemon.id}
              id={`name-to-image-choice-${index}`}
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
              onKeyDown={(event) => handleChoiceKeyDown(event, index)}
              disabled={feedback !== "idle"}
            >
              <div className="relative h-28 w-28">
                <Image
                  src={pokemon.artwork}
                  alt={pokemon.nameFr}
                  fill
                  sizes="112px"
                  loading="eager"
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

export function NameToImageQuiz({
  session,
  useBacPool = true,
}: NameToImageQuizProps) {
  return (
    <GameShell
      session={session}
      title="Devine l'image"
      description="Clique sur la bonne image parmi les 4 propositions."
    >
      <NameToImageRound session={session} useBacPool={useBacPool} />
    </GameShell>
  );
}
