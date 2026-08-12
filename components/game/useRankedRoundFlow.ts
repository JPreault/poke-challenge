"use client";

import { useCallback, useRef } from "react";

import { useRankedSession } from "@/components/game/RankedSessionContext";
import type { GameSession } from "@/lib/games/useGameSession";
import { RANKED_ROUND_TRANSITION_MS } from "@/lib/ranked/constants";

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
    window.setTimeout(
      () => advanceRoundRef.current(),
      RANKED_ROUND_TRANSITION_MS,
    );
  }, []);

  const onFailure = useCallback(() => {
    window.setTimeout(() => {
      rankedRef.current?.onRoundFail();
    }, RANKED_ROUND_TRANSITION_MS);
  }, []);

  const onWrongAttempt = useCallback(() => {
    const current = rankedRef.current;
    if (!current) return false;
    const failed = current.onWrongAttempt();
    if (failed) {
      window.setTimeout(() => {
        rankedRef.current?.onRoundFail();
      }, RANKED_ROUND_TRANSITION_MS);
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
