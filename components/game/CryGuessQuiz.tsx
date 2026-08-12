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
}

interface CryGuessQuizProps {
  session: GameSession;
}

type FeedbackState =
  | { type: "idle" }
  | { type: "correct"; message: string }
  | { type: "incorrect"; message: string };

interface RoundState {
  token: string;
  questionName: string;
  questionImageUrl: string;
  choices: ChoiceQuizChoice[];
  correctIndex?: number;
}

export function CryGuessRound({ session, onRoundComplete }: RoundProps) {
  const [round, setRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlayingIndex, setIsPlayingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const ranked = useRankedSession();
  const startRound = useCallback(async () => {
    setIsLoading(true);
    setFeedback({ type: "idle" });
    setSelectedIndex(null);
    setIsPlayingIndex(null);

    try {
      const response = await fetch("/api/games/choice-quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cry-guess",
          pool: "catalog",
          ...(ranked?.matchId ? { matchId: ranked.matchId } : {}),
        }),
      });

      if (!response.ok) {
        setRound(null);
        setIsLoading(false);
        return;
      }

      const result = (await response.json()) as ChoiceQuizStartResult;
      if (!result.questionName || !result.questionImageUrl) {
        setRound(null);
        setIsLoading(false);
        return;
      }

      setRound({
        token: result.token,
        questionName: result.questionName,
        questionImageUrl: result.questionImageUrl,
        choices: result.choices,
      });
      setIsLoading(false);
    } catch {
      setRound(null);
      setIsLoading(false);
    }
  }, [ranked?.matchId]);

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

  const playCry = useCallback((choice: ChoiceQuizChoice) => {
    if (!choice.cryUrl) return;
    setIsPlayingIndex(choice.choiceIndex);
    const audio = new Audio(choice.cryUrl);
    audio.volume = 0.35;
    audio.play().catch(() => undefined);
    audio.onended = () =>
      setIsPlayingIndex((current) =>
        current === choice.choiceIndex ? null : current,
      );
  }, []);

  const handleSkip = useCallback(async () => {
    if (!round || feedback.type !== "idle") return;

    try {
      const response = await fetch("/api/games/choice-quiz/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: round.token }),
      });
      const result = (await response.json()) as ChoiceQuizSkipResult;

      if (result.status === "ok") {
        session.recordRound({
          question: `Quel cri correspond à ${round.questionName} ?`,
          userAnswer: "Abandon",
          correctAnswer: result.reveal.nameFr,
          isCorrect: false,
          skipped: true,
          questionImage: round.questionImageUrl,
          correctImage: result.reveal.artworkUrl,
          correctAnswerCry: result.reveal.cryUrl,
        });
        if (result.reveal.cryUrl) {
          const audio = new Audio(result.reveal.cryUrl);
          audio.volume = 0.35;
          audio.play().catch(() => undefined);
        }
      }
    } catch {
      // ignore
    }

    setFeedback({
      type: "incorrect",
      message: `Abandonné. C'était ${round.questionName}.`,
    });
    window.setTimeout(advanceRound, 1800);
  }, [advanceRound, feedback.type, round, session]);

  useRegisterSkip(handleSkip, allowSkip && Boolean(round) && feedback.type === "idle");

  const validateChoice = async (choice: ChoiceQuizChoice) => {
    if (!round || feedback.type !== "idle") return;

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
        setFeedback({ type: "correct", message: "Bravo !" });
        setRound((current) =>
          current
            ? { ...current, correctIndex: choice.choiceIndex }
            : current,
        );
        session.recordRound({
          question: `Quel cri correspond à ${round.questionName} ?`,
          userAnswer: result.reveal.nameFr,
          correctAnswer: result.reveal.nameFr,
          isCorrect: true,
          questionImage: round.questionImageUrl,
          userAnswerCry: choice.cryUrl,
          correctAnswerCry: result.reveal.cryUrl,
        });
        if (isRanked) {
          onSuccess();
        } else {
          setFeedback({ type: "correct", message: "Bravo !" });
          window.setTimeout(advanceRound, 1200);
        }
        return;
      }

      if (result.status === "wrong") {
        const correctIndex = result.correctIndex + 1;
        setRound((current) =>
          current
            ? { ...current, correctIndex: result.correctIndex }
            : current,
        );
        session.recordRound({
          question: `Quel cri correspond à ${round.questionName} ?`,
          userAnswer: `Proposition ${choice.choiceIndex + 1}`,
          correctAnswer: round.questionName,
          isCorrect: false,
          questionImage: round.questionImageUrl,
          userAnswerCry: choice.cryUrl,
        });
        if (isRanked) {
          setFeedback({
            type: "incorrect",
            message: `Raté, c'était la proposition ${correctIndex}.`,
          });
          onFailure();
        } else {
          window.setTimeout(advanceRound, 2200);
        }
        return;
      }
    } catch {
      setSelectedIndex(null);
    }
  };

  const handleValidateSelected = () => {
    if (!round || feedback.type !== "idle" || selectedIndex === null) return;
    const selected = round.choices.find(
      (choice) => choice.choiceIndex === selectedIndex,
    );
    if (!selected) return;
    void validateChoice(selected);
  };

  const handleChoiceKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    choice: ChoiceQuizChoice,
  ) => {
    if (!round || feedback.type !== "idle") return;

    if (event.key === " ") {
      event.preventDefault();
      playCry(choice);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void validateChoice(choice);
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
    setSelectedIndex(round.choices[nextIndex]?.choiceIndex ?? null);
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
      setSelectedIndex(round.choices[targetIndex]?.choiceIndex ?? null);
      target.focus();
    };

    window.addEventListener("keydown", focusChoiceFromArrow);
    return () => window.removeEventListener("keydown", focusChoiceFromArrow);
  }, [round, feedback]);

  if (isLoading || !round) {
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
            src={round.questionImageUrl}
            alt="Pokémon mystère"
            width={160}
            height={160}
            unoptimized
            className="object-contain"
          />
        </div>
        <p className="font-heading text-3xl font-bold">{round.questionName}</p>
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
        {round.choices.map((choice, index) => {
          const isSelected = selectedIndex === choice.choiceIndex;
          return (
            <Button
              key={choice.choiceIndex}
              id={`cry-choice-${index}`}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "min-h-11 h-auto w-full justify-between rounded-xl border border-border/60 px-4 py-4 text-base",
                feedback.type === "idle" && "hover:border-foreground/20",
              )}
              onClick={() => {
                setSelectedIndex(choice.choiceIndex);
                playCry(choice);
              }}
              onFocus={() => setSelectedIndex(choice.choiceIndex)}
              onKeyDown={(event) => handleChoiceKeyDown(event, index, choice)}
              disabled={feedback.type !== "idle"}
              aria-label={`Proposition ${index + 1} - appuie sur espace pour écouter le cri, entrée pour valider`}
            >
              <span className="font-medium">Proposition {index + 1}</span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex items-center rounded-md border border-border/60 px-2 py-1 text-sm",
                  isPlayingIndex === choice.choiceIndex && "text-primary",
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
        className="w-full sm:max-w-sm"
        onClick={handleValidateSelected}
        disabled={feedback.type !== "idle" || selectedIndex === null}
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
