"use client";

import { useCallback, useMemo, useState } from "react";

import {
  computeStats,
  type GameMode,
  type GameStats,
  type RoundRecord,
} from "@/lib/games/types";

interface RecordRoundInput {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  preferred?: boolean;
  questionImage?: string;
  chosenImage?: string;
  chosenLabel?: string;
  correctImage?: string;
}

export function useGameSession(mode: GameMode) {
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const recordRound = useCallback((input: RecordRoundInput) => {
    setRounds((current) => [
      ...current,
      {
        round: current.length + 1,
        ...input,
      },
    ]);
  }, []);

  const stopGame = useCallback(() => {
    setIsFinished(true);
  }, []);

  const stats = useMemo<GameStats>(() => computeStats(rounds), [rounds]);

  return {
    mode,
    rounds,
    isFinished,
    stats,
    recordRound,
    stopGame,
  };
}

export type GameSession = ReturnType<typeof useGameSession>;
