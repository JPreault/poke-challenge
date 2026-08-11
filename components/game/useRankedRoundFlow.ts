"use client";

import { useCallback, useRef } from "react";

import { useRankedSession } from "@/components/game/RankedSessionContext";
import type { GameSession } from "@/lib/games/useGameSession";

export function useRankedRoundFlow(
  session: GameSession,
  advanceRound: () => void,
) {
  const ranked = useRankedSession();
  const isRanked = Boolean(ranked?.ready && !ranked.loading && !ranked.error);

  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;

  const advanceRoundRef = useRef(advanceRound);
  advanceRoundRef.current = advanceRound;

  const onSuccess = useCallback((afterRecord?: () => void) => {
    const current = rankedRef.current;
    if (!current) {
      afterRecord?.();
      return;
    }
    current.onRoundSuccess();
    afterRecord?.();
    window.setTimeout(() => advanceRoundRef.current(), 400);
  }, []);

  const onFailure = useCallback(() => {
    rankedRef.current?.onRoundFail();
  }, []);

  const onWrongAttempt = useCallback(() => {
    const current = rankedRef.current;
    if (!current) return false;
    const failed = current.onWrongAttempt();
    if (failed) {
      current.onRoundFail();
    }
    return failed;
  }, []);

  const resetAttempts = useCallback(() => {
    rankedRef.current?.resetRoundAttempts();
  }, []);

  return {
    isRanked,
    allowSkip: !isRanked,
    attemptsRemaining: ranked
      ? Math.max(0, ranked.attemptLimit - ranked.roundAttempts)
      : null,
    attemptLimit: ranked?.attemptLimit ?? null,
    onSuccess,
    onFailure,
    onWrongAttempt,
    resetAttempts,
  };
}
