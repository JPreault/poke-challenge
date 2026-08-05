"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { Button } from "@/components/ui/button";
import { buildQuizChoices } from "@/lib/games/distractors";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getCatalogPokemon } from "@/lib/pokemon/data";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
}

interface CryGuessQuizProps {
  session: GameSession;
}

type FeedbackState =
  | { type: "idle" }
  | { type: "correct"; message: string }
  | { type: "incorrect"; message: string };

interface RoundState {
  pokemon: QuizPokemon;
  choices: QuizPokemon[];
}

export function CryGuessRound({ session, onRoundComplete }: RoundProps) {
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const [round, setRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPlayingId, setIsPlayingId] = useState<number | null>(null);

  const startRound = useCallback(() => {
    const pokemon = pickRandom(catalog);
    setRound({
      pokemon,
      choices: buildQuizChoices(pokemon, catalog),
    });
    setFeedback({ type: "idle" });
    setSelectedId(null);
    setIsPlayingId(null);
  }, [catalog]);

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

  const playCry = useCallback((pokemon: QuizPokemon) => {
    setIsPlayingId(pokemon.id);
    const audio = new Audio(pokemon.cryLatest);
    audio.play().catch(() => undefined);
    audio.onended = () => setIsPlayingId((current) => (current === pokemon.id ? null : current));
  }, []);

  const validateChoice = (pokemon: QuizPokemon) => {
    if (!round || feedback.type !== "idle") return;

    setSelectedId(pokemon.id);
    const isCorrect = pokemon.id === round.pokemon.id;

    if (isCorrect) {
      setFeedback({ type: "correct", message: "Bravo !" });
    } else {
      const correctIndex =
        round.choices.findIndex((choice) => choice.id === round.pokemon.id) + 1;
      setFeedback({
        type: "incorrect",
        message: `Raté, c'était la proposition ${correctIndex}.`,
      });
      playCry(round.pokemon);
    }

    session.recordRound({
      question: `Quel cri correspond à ${round.pokemon.nameFr} ?`,
      userAnswer: pokemon.nameFr,
      correctAnswer: round.pokemon.nameFr,
      isCorrect,
      questionImage: round.pokemon.artwork,
    });

    window.setTimeout(advanceRound, isCorrect ? 1200 : 2200);
  };

  const handleValidateSelected = () => {
    if (!round || feedback.type !== "idle" || selectedId === null) return;
    const selected = round.choices.find((choice) => choice.id === selectedId);
    if (!selected) return;
    validateChoice(selected);
  };

  const handleChoiceKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    pokemon: QuizPokemon,
  ) => {
    if (!round || feedback.type !== "idle") return;

    if (event.key === " ") {
      event.preventDefault();
      playCry(pokemon);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      validateChoice(pokemon);
      return;
    }

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
      `cry-choice-${nextIndex}`,
    ) as HTMLButtonElement | null;
    setSelectedId(round.choices[nextIndex]?.id ?? null);
    nextButton?.focus();
  };

  useEffect(() => {
    if (!round || feedback.type !== "idle") return;

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
      const isAlreadyOnChoice = active?.id?.startsWith("cry-choice-");
      if (isAlreadyOnChoice) return;

      const targetIndex =
        event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? round.choices.length - 1
          : 0;
      const target = document.getElementById(
        `cry-choice-${targetIndex}`,
      ) as HTMLButtonElement | null;
      if (!target) return;

      event.preventDefault();
      setSelectedId(round.choices[targetIndex]?.id ?? null);
      target.focus();
    };

    window.addEventListener("keydown", focusChoiceFromArrow);
    return () => window.removeEventListener("keydown", focusChoiceFromArrow);
  }, [round, feedback]);

  if (!round) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="display-frame w-full text-center">
        <div className="mx-auto mb-4 flex h-40 w-40 items-center justify-center">
          <Image
            src={round.pokemon.artwork}
            alt={round.pokemon.nameFr}
            width={160}
            height={160}
            className="object-contain"
          />
        </div>
        <p className="font-heading text-3xl font-bold">{round.pokemon.nameFr}</p>
      </div>

      {feedback.type !== "idle" ? (
        <p
          className={cn(
            "text-base",
            feedback.type === "correct" ? "feedback-success" : "feedback-error",
          )}
        >
          {feedback.message}
        </p>
      ) : (
        <div className="h-6" />
      )}

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {round.choices.map((pokemon, index) => {
          const isSelected = selectedId === pokemon.id;
          return (
            <Button
              key={pokemon.id}
              id={`cry-choice-${index}`}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-auto w-full justify-between rounded-xl border border-border/60 px-4 py-4 text-base",
                feedback.type === "idle" && "hover:border-foreground/20",
              )}
              onClick={() => {
                setSelectedId(pokemon.id);
                playCry(pokemon);
              }}
              onFocus={() => setSelectedId(pokemon.id)}
              onKeyDown={(event) => handleChoiceKeyDown(event, index, pokemon)}
              disabled={feedback.type !== "idle"}
              aria-label={`Proposition ${index + 1} - appuie sur espace pour écouter le cri, entrée pour valider`}
            >
              <span className="font-medium">Proposition {index + 1}</span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex items-center rounded-md border border-border/60 px-2 py-1 text-sm",
                  isPlayingId === pokemon.id && "text-primary",
                )}
              >
                ▶
              </span>
            </Button>
          );
        })}
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full max-w-sm"
        onClick={handleValidateSelected}
        disabled={feedback.type !== "idle" || selectedId === null}
      >
        Valider le cri
      </Button>
    </div>
  );
}

export function CryGuessQuiz({ session }: CryGuessQuizProps) {
  return (
    <GameShell
      session={session}
      title="Pokémon → Cri"
      description="Écoute les 4 propositions et choisis le cri correspondant au Pokémon affiché."
    >
      <CryGuessRound session={session} />
    </GameShell>
  );
}

