"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getBacPokemon, getCatalogPokemon } from "@/lib/pokemon/data";
import { getFirstLetter } from "@/lib/pokemon/normalize";
import type { ValidationMode, ValidationResult } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
  validationMode?: ValidationMode;
}

interface LetterInputQuizProps {
  session: GameSession;
  validationMode?: ValidationMode;
}

type FeedbackState =
  | { type: "idle" }
  | {
      type: "success";
      message: string;
      preferred: boolean;
      userAnswer: string;
      hasTypo: boolean;
      correctSpelling?: string;
    }
  | {
      type: "error";
      message: string;
      userAnswer: string;
      correctSpelling?: string;
    };

function buildFeedback(
  result: ValidationResult,
  userAnswer: string,
  roundLetter: string,
  validationMode: ValidationMode,
  fallbackExpected?: string,
): FeedbackState {
  if (validationMode === "catalog") {
    if (!result.correct) {
      return {
        type: "error",
        message: result.matched
          ? `${result.matched} ne commence pas par ${roundLetter}.`
          : `Incorrect — le Pokémon doit commencer par ${roundLetter}.`,
        userAnswer,
      };
    }

    return {
      type: "success",
      message: "Bravo !",
      preferred: true,
      userAnswer,
      hasTypo: Boolean(result.hasTypo),
      correctSpelling: result.matched,
    };
  }

  const expected = result.expected ?? fallbackExpected ?? "";

  if (!result.correct) {
    return {
      type: "error",
      message: `Incorrect — c'était ${expected}.`,
      userAnswer,
      correctSpelling: expected,
    };
  }

  if (!result.preferred) {
    return {
      type: "success",
      message: `Valide, mais pour ce bac c'était ${expected}.`,
      preferred: false,
      userAnswer,
      hasTypo: Boolean(result.hasTypo),
      correctSpelling: result.matched ?? expected,
    };
  }

  return {
    type: "success",
    message: "Bravo !",
    preferred: true,
    userAnswer,
    hasTypo: Boolean(result.hasTypo),
    correctSpelling: result.matched ?? expected,
  };
}

function FeedbackMessage({ feedback }: { feedback: FeedbackState }) {
  if (feedback.type === "idle") {
    return <div className="h-6" />;
  }

  const showSpellingHint =
    feedback.type === "success" &&
    feedback.hasTypo &&
    feedback.correctSpelling &&
    feedback.userAnswer.trim().toLowerCase() !==
      feedback.correctSpelling.trim().toLowerCase();

  return (
    <div className="space-y-2 text-center">
      <p
        className={cn(
          "text-base",
          feedback.type === "success" &&
            feedback.preferred &&
            "feedback-success",
          feedback.type === "success" &&
            !feedback.preferred &&
            "feedback-warn",
          feedback.type === "error" && "feedback-error",
        )}
      >
        {feedback.message}
      </p>
      {showSpellingHint ? (
        <p className="text-sm text-muted-foreground">
          Ta réponse :{" "}
          <span className="font-medium text-foreground">{feedback.userAnswer}</span>
          {" → "}
          <span className="font-medium text-foreground">
            {feedback.correctSpelling}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function LetterInputRound({
  session,
  onRoundComplete,
  validationMode = "free",
}: RoundProps) {
  const allPokemon = useMemo(() => getBacPokemon(), []);
  const availableLetters = useMemo(() => {
    if (validationMode !== "catalog") {
      return allPokemon.map((pokemon) => pokemon.letter);
    }

    const uniqueLetters = new Set(
      getCatalogPokemon().map((pokemon) => getFirstLetter(pokemon.nameFr)),
    );
    return Array.from(uniqueLetters).filter(Boolean);
  }, [allPokemon, validationMode]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [expectedName, setExpectedName] = useState<string | undefined>(undefined);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startRound = useCallback(() => {
    const letter = pickRandom(availableLetters);
    setCurrentLetter(letter);
    if (validationMode === "free") {
      const expected = allPokemon.find((pokemon) => pokemon.letter === letter);
      setExpectedName(expected?.nameFr);
    } else {
      setExpectedName(undefined);
    }
    setAnswer("");
    setFeedback({ type: "idle" });
    setIsSubmitting(false);
  }, [allPokemon, availableLetters, validationMode]);

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

  useEffect(() => {
    if (!currentLetter || feedback.type !== "idle") return;
    inputRef.current?.focus();
  }, [feedback.type, currentLetter]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (feedback.type !== "idle") {
      advanceRound();
      return;
    }

    if (!currentLetter || isSubmitting || !answer.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pokemon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter: currentLetter,
          answer,
          mode: validationMode,
        }),
      });

      const result = (await response.json()) as ValidationResult;

      session.recordRound({
        question: `Nom de Pokémon pour la lettre ${currentLetter}`,
        userAnswer: answer,
        correctAnswer: result.expected ?? result.matched ?? "Réponse valide",
        isCorrect: result.correct,
        preferred: result.preferred,
      });

      setFeedback(buildFeedback(result, answer, currentLetter, validationMode, expectedName));
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setFeedback({
        type: "error",
        message: "Erreur de validation. Réessaie.",
        userAnswer: answer,
      });
      inputRef.current?.focus();
    }
  };

  if (!currentLetter) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  const isAwaitingAdvance = feedback.type !== "idle";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-10"
    >
      <div className="letter-disc">
        <span>{currentLetter}</span>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <label htmlFor="pokemon-answer" className="sr-only">
          Nom du Pokémon
        </label>
        <Input
          ref={inputRef}
          id="pokemon-answer"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Nom du Pokémon..."
          autoComplete="off"
          autoFocus
          readOnly={isSubmitting || isAwaitingAdvance}
          className="h-12 border-border/70 bg-background px-4 text-base"
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            isSubmitting || (!isAwaitingAdvance && !answer.trim())
          }
        >
          {isAwaitingAdvance ? "Suivant" : "Valider"}
        </Button>
      </div>

      <FeedbackMessage feedback={feedback} />
    </form>
  );
}

export function LetterInputQuiz({
  session,
  validationMode = "free",
}: LetterInputQuizProps) {
  return (
    <GameShell
      session={session}
      title="Lettre → Nom"
      description="Entre un Pokémon existant dont le nom français commence par la lettre affichée."
    >
      <LetterInputRound session={session} validationMode={validationMode} />
    </GameShell>
  );
}
