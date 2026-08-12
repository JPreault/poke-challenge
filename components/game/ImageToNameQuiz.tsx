"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { useRankedSession } from "@/components/game/RankedSessionContext";
import { useRankedRoundFlow } from "@/components/game/useRankedRoundFlow";
import { useStartRoundWhenReady } from "@/components/game/useStartRoundWhenReady";
import { Button } from "@/components/ui/button";
import type {
  ChoiceQuizAnswerResult,
  ChoiceQuizChoice,
  ChoiceQuizSkipResult,
  ChoiceQuizStartResult,
} from "@/lib/games/choice-quiz-types";
import type { GameSession } from "@/lib/games/useGameSession";
import { cn } from "@/lib/utils";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
  useBacPool?: boolean;
}

interface ImageToNameQuizProps {
  session: GameSession;
  useBacPool?: boolean;
}

type FeedbackState = "idle" | "correct" | "incorrect";

interface RoundState {
  token: string;
  questionImageUrl: string;
  choices: ChoiceQuizChoice[];
  correctName?: string;
  correctIndex?: number;
}

export function ImageToNameRound({
  session,
  onRoundComplete,
  useBacPool = true,
}: RoundProps) {
  const [round, setRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ranked = useRankedSession();
  const startRound = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setFeedback("idle");
    setSelectedIndex(null);

    try {
      const response = await fetch("/api/games/choice-quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "image-to-name",
          pool: useBacPool ? "training" : "catalog",
          ...(ranked?.matchId ? { matchId: ranked.matchId } : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setLoadError(payload?.error ?? "Impossible de démarrer la manche.");
        setRound(null);
        setIsLoading(false);
        return;
      }

      const result = (await response.json()) as ChoiceQuizStartResult;
      if (!result.questionImageUrl) {
        setRound(null);
        setIsLoading(false);
        return;
      }

      setRound({
        token: result.token,
        questionImageUrl: result.questionImageUrl,
        choices: result.choices,
      });
      setIsLoading(false);
    } catch {
      setRound(null);
      setIsLoading(false);
    }
  }, [ranked?.matchId, useBacPool]);

  const advanceRound = useCallback(() => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    void startRound();
  }, [onRoundComplete, startRound]);

  const { isRanked, allowSkip, onSuccess, onFailure } = useRankedRoundFlow(
    session,
    advanceRound,
  );

  useStartRoundWhenReady(startRound);

  const handleSkip = useCallback(async () => {
    if (!round || feedback !== "idle") return;

    try {
      const response = await fetch("/api/games/choice-quiz/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: round.token }),
      });
      if (!response.ok) return;
      const result = (await response.json()) as ChoiceQuizSkipResult;

      if (result.status === "ok") {
        session.recordRound({
          question: "Quel est ce Pokémon ?",
          userAnswer: "Abandon",
          correctAnswer: result.reveal.nameFr,
          isCorrect: false,
          skipped: true,
          questionImage: round.questionImageUrl,
          correctImage: result.reveal.artworkUrl,
        });
        setRound((current) =>
          current
            ? { ...current, correctName: result.reveal.nameFr }
            : current,
        );
      }
    } catch {
      // ignore
    }

    setFeedback("incorrect");
    window.setTimeout(advanceRound, 800);
  }, [advanceRound, feedback, round, session]);

  useRegisterSkip(handleSkip, allowSkip && Boolean(round) && feedback === "idle");

  const handleAnswer = async (choice: ChoiceQuizChoice) => {
    if (!round || feedback !== "idle") return;

    setSelectedIndex(choice.choiceIndex);

    try {
      const response = await fetch("/api/games/choice-quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: round.token,
          choiceIndex: choice.choiceIndex,
        }),
      });
      const result = (await response.json()) as ChoiceQuizAnswerResult;

      if (result.status === "correct") {
        setRound((current) =>
          current
            ? {
                ...current,
                correctName: result.reveal.nameFr,
                correctIndex: choice.choiceIndex,
              }
            : current,
        );
        session.recordRound({
          question: "Quel est ce Pokémon ?",
          userAnswer: result.reveal.nameFr,
          correctAnswer: result.reveal.nameFr,
          isCorrect: true,
          questionImage: round.questionImageUrl,
        });
        if (isRanked) {
          onSuccess();
        } else {
          setFeedback("correct");
          window.setTimeout(advanceRound, 1000);
        }
        return;
      }

      if (result.status === "wrong") {
        setRound((current) =>
          current
            ? {
                ...current,
                correctName: result.targetReveal.nameFr,
                correctIndex: result.correctIndex,
              }
            : current,
        );
        session.recordRound({
          question: "Quel est ce Pokémon ?",
          userAnswer: result.reveal.nameFr,
          correctAnswer: result.targetReveal.nameFr,
          isCorrect: false,
          questionImage: round.questionImageUrl,
        });
        if (isRanked) {
          onFailure();
        } else {
          setFeedback("incorrect");
          window.setTimeout(advanceRound, 1000);
        }
        return;
      }
    } catch {
      setSelectedIndex(null);
    }
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

  if (loadError) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-muted-foreground">
        {loadError}
      </div>
    );
  }

  if (isLoading || !round) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  const correctIndex = round.correctIndex;

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="display-frame flex h-56 w-56 items-center justify-center">
        <Image
          src={round.questionImageUrl}
          alt="Pokémon mystère"
          width={192}
          height={192}
          unoptimized
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
            : `Raté — c'était ${round.correctName ?? "?"}.`}
        </p>
      ) : (
        <div className="h-6" />
      )}

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {round.choices.map((choice, index) => {
          const isSelected = selectedIndex === choice.choiceIndex;
          const isCorrectChoice =
            feedback !== "idle" && choice.choiceIndex === correctIndex;

          return (
            <Button
              key={choice.choiceIndex}
              id={`image-to-name-choice-${index}`}
              variant="outline"
              className={cn(
                "min-h-11 h-auto justify-start px-5 py-4 text-base font-medium",
                feedback === "idle" &&
                  "hover:border-foreground/20 hover:bg-muted/50",
                isCorrectChoice &&
                  "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
                feedback !== "idle" &&
                  isSelected &&
                  !isCorrectChoice &&
                  "border-poke-red/40 bg-poke-red/5 text-poke-red",
              )}
              onClick={() => void handleAnswer(choice)}
              onKeyDown={(event) => handleChoiceKeyDown(event, index)}
              disabled={feedback !== "idle"}
            >
              {choice.nameFr}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function ImageToNameQuiz({
  session,
  useBacPool = true,
}: ImageToNameQuizProps) {
  return (
    <GameShell
      session={session}
      title="Devine le nom"
      description="Clique sur le bon nom parmi les 4 propositions."
    >
      <ImageToNameRound session={session} useBacPool={useBacPool} />
    </GameShell>
  );
}
