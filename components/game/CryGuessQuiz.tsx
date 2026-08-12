"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { useRankedSession } from "@/components/game/RankedSessionContext";
import { useAwaitingAdvance } from "@/components/game/useAwaitingAdvance";
import { useCryPlayer } from "@/components/game/useCryPlayer";
import { usePrefetchedRound } from "@/components/game/usePrefetchedRound";
import { useRankedRoundFlow } from "@/components/game/useRankedRoundFlow";
import { useStartRoundWhenReady } from "@/components/game/useStartRoundWhenReady";
import { warmImage } from "@/components/game/warmMedia";
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
  const endActionRef = useRef<"advance" | "fail">("advance");
  const prefetchEnabled = !ranked?.matchId && !onRoundComplete;
  const { play, preload } = useCryPlayer();

  const fetchPayload = useCallback(async (): Promise<RoundState | null> => {
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

      if (!response.ok) return null;

      const result = (await response.json()) as ChoiceQuizStartResult;
      if (!result.questionName || !result.questionImageUrl) return null;

      return {
        token: result.token,
        questionName: result.questionName,
        questionImageUrl: result.questionImageUrl,
        choices: result.choices,
      };
    } catch {
      return null;
    }
  }, [ranked?.matchId]);

  const warmPayload = useCallback(
    async (payload: RoundState) => {
      await Promise.all([
        warmImage(payload.questionImageUrl),
        preload(payload.choices.map((choice) => choice.cryUrl)),
      ]);
    },
    [preload],
  );

  const { prefetch, takeOrFetch } = usePrefetchedRound({
    enabled: prefetchEnabled,
    fetchPayload,
    warm: warmPayload,
  });

  const startRound = useCallback(async () => {
    setIsLoading(true);
    setFeedback({ type: "idle" });
    setSelectedIndex(null);
    setIsPlayingIndex(null);
    endActionRef.current = "advance";

    const payload = await takeOrFetch();
    if (!payload) {
      setRound(null);
      setIsLoading(false);
      return;
    }

    setRound(payload);
    setIsLoading(false);
  }, [takeOrFetch]);

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

  const handleResolvedAdvance = useCallback(() => {
    if (endActionRef.current === "fail") {
      onFailure();
      return;
    }
    advanceRound();
  }, [advanceRound, onFailure]);

  const { showNextButton, goNext } = useAwaitingAdvance(
    feedback.type !== "idle",
    handleResolvedAdvance,
  );

  useStartRoundWhenReady(startRound);

  useEffect(() => {
    if (feedback.type === "idle" || !prefetchEnabled) return;
    prefetch();
  }, [feedback.type, prefetch, prefetchEnabled]);

  const playCry = useCallback(
    (choice: ChoiceQuizChoice) => {
      if (!choice.cryUrl) return;
      setIsPlayingIndex(choice.choiceIndex);
      play(choice.cryUrl, () =>
        setIsPlayingIndex((current) =>
          current === choice.choiceIndex ? null : current,
        ),
      );
    },
    [play],
  );

  const playCryUrl = useCallback(
    (url: string | undefined, choiceIndex?: number) => {
      if (!url) return;
      if (choiceIndex != null) setIsPlayingIndex(choiceIndex);
      play(url, () => {
        if (choiceIndex != null) {
          setIsPlayingIndex((current) =>
            current === choiceIndex ? null : current,
          );
        }
      });
    },
    [play],
  );

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
        playCryUrl(result.reveal.cryUrl);
      }
    } catch {
      // ignore
    }

    endActionRef.current = "advance";
    setFeedback({
      type: "incorrect",
      message: `Abandonné. C'était ${round.questionName}.`,
    });
  }, [feedback.type, playCryUrl, round, session]);

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
        }
        endActionRef.current = "advance";
        setFeedback({ type: "correct", message: "Bravo !" });
        return;
      }

      if (result.status === "wrong") {
        const correctProposition = result.correctIndex + 1;
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
          correctAnswerCry: result.targetReveal.cryUrl,
        });
        const correctChoice = round.choices.find(
          (entry) => entry.choiceIndex === result.correctIndex,
        );
        playCry(correctChoice ?? choice);
        endActionRef.current = isRanked ? "fail" : "advance";
        setFeedback({
          type: "incorrect",
          message: `Raté, c'était la proposition ${correctProposition}.`,
        });
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
    if (!round) return;

    if (event.key === " ") {
      event.preventDefault();
      playCry(choice);
      return;
    }

    if (feedback.type !== "idle") return;

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

  const isResolved = feedback.type !== "idle";

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

      {isResolved ? (
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
          const isCorrectChoice =
            isResolved && choice.choiceIndex === round.correctIndex;

          return (
            <Button
              key={choice.choiceIndex}
              id={`cry-choice-${index}`}
              type="button"
              variant={isSelected && !isResolved ? "default" : "outline"}
              className={cn(
                "min-h-11 h-auto w-full justify-between rounded-xl border border-border/60 px-4 py-4 text-base",
                !isResolved && "hover:border-foreground/20",
                isCorrectChoice &&
                  "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
                isResolved &&
                  isSelected &&
                  !isCorrectChoice &&
                  "border-poke-red/40 bg-poke-red/5 text-poke-red",
              )}
              onClick={() => {
                if (!isResolved) {
                  setSelectedIndex(choice.choiceIndex);
                }
                playCry(choice);
              }}
              onFocus={() => {
                if (!isResolved) setSelectedIndex(choice.choiceIndex);
              }}
              onKeyDown={(event) => handleChoiceKeyDown(event, index, choice)}
              aria-label={`Proposition ${index + 1} - appuie sur espace pour écouter le cri${isResolved ? "" : ", entrée pour valider"}`}
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

      {showNextButton ? (
        <Button type="button" size="lg" variant="outline" className="w-full sm:max-w-sm" onClick={goNext}>
          Suivant
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full sm:max-w-sm"
          onClick={handleValidateSelected}
          disabled={selectedIndex === null}
        >
          Valider le cri
        </Button>
      )}
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
      <CryGuessRound key={session.sessionEpoch} session={session} />
    </GameShell>
  );
}
