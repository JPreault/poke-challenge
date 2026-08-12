"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { useRankedSession } from "@/components/game/RankedSessionContext";
import { useRankedRoundFlow } from "@/components/game/useRankedRoundFlow";
import { useStartRoundWhenReady } from "@/components/game/useStartRoundWhenReady";
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

interface NameToImageQuizProps {
  session: GameSession;
  useBacPool?: boolean;
}

type FeedbackState = "idle" | "correct" | "incorrect";

interface RoundState {
  token: string;
  questionName: string;
  choices: ChoiceQuizChoice[];
  correctIndex?: number;
}

export function NameToImageRound({
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
          mode: "name-to-image",
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
      if (!result.questionName) {
        setRound(null);
        setIsLoading(false);
        return;
      }

      setRound({
        token: result.token,
        questionName: result.questionName,
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
      const result = (await response.json()) as ChoiceQuizSkipResult;

      if (result.status === "ok") {
        session.recordRound({
          question: `Quelle image correspond à ${round.questionName} ?`,
          userAnswer: "Abandon",
          correctAnswer: result.reveal.nameFr,
          isCorrect: false,
          skipped: true,
          correctImage: result.reveal.artworkUrl,
        });
      }
    } catch {
      // ignore
    }

    setFeedback("incorrect");
    window.setTimeout(advanceRound, 800);
  }, [advanceRound, feedback, round, session]);

  useRegisterSkip(handleSkip, allowSkip && Boolean(round) && feedback === "idle");

  const handleAnswer = async (choice: ChoiceQuizChoice) => {
    if (!round || feedback !== "idle" || !choice.imageUrl) return;

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
        setFeedback("correct");
        setRound((current) =>
          current ? { ...current, correctIndex: choice.choiceIndex } : current,
        );
        session.recordRound({
          question: `Quelle image correspond à ${round.questionName} ?`,
          userAnswer: result.reveal.nameFr,
          correctAnswer: result.reveal.nameFr,
          isCorrect: true,
          chosenImage: choice.imageUrl,
          chosenLabel: result.reveal.nameFr,
          correctImage: result.reveal.artworkUrl,
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
            ? { ...current, correctIndex: result.correctIndex }
            : current,
        );
        session.recordRound({
          question: `Quelle image correspond à ${round.questionName} ?`,
          userAnswer: result.reveal.nameFr,
          correctAnswer: round.questionName,
          isCorrect: false,
          chosenImage: choice.imageUrl,
          chosenLabel: result.reveal.nameFr,
        });
        if (isRanked) {
          setFeedback("incorrect");
          onFailure();
        } else {
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
    return () => window.removeEventListener("keydown", focusChoiceFromArrow);
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

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="display-frame w-full py-6 text-center sm:py-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Trouve l&apos;image de
        </p>
        <p className="font-heading text-3xl font-bold sm:text-4xl">{round.questionName}</p>
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
            : `Raté — c'était ${round.questionName}.`}
        </p>
      ) : (
        <div className="h-6" />
      )}

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {round.choices.map((choice, index) => {
          const isSelected = selectedIndex === choice.choiceIndex;
          const isCorrectChoice =
            feedback !== "idle" && choice.choiceIndex === round.correctIndex;

          return (
            <button
              key={choice.choiceIndex}
              id={`name-to-image-choice-${index}`}
              type="button"
              className={cn(
                "display-frame flex min-h-36 items-center justify-center p-4 transition disabled:cursor-not-allowed sm:min-h-0 sm:p-6",
                feedback === "idle" &&
                  "hover:border-foreground/20 hover:bg-muted/50",
                isCorrectChoice &&
                  "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30",
                feedback !== "idle" &&
                  isSelected &&
                  !isCorrectChoice &&
                  "border-poke-red/40 bg-poke-red/5",
              )}
              onClick={() => void handleAnswer(choice)}
              onKeyDown={(event) => handleChoiceKeyDown(event, index)}
              disabled={feedback !== "idle" || !choice.imageUrl}
            >
              <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                {choice.imageUrl ? (
                  <Image
                    src={choice.imageUrl}
                    alt="Proposition"
                    fill
                    sizes="(max-width: 640px) 96px, 112px"
                    unoptimized
                    loading="eager"
                    className="object-contain"
                  />
                ) : null}
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
