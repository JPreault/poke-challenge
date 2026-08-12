"use client";

import { useCallback, useEffect, useRef } from "react";

import { useRoundAdvancePreference } from "@/components/game/RoundAdvanceContext";
import { ROUND_AUTO_ADVANCE_MS } from "@/lib/games/round-advance";

/**
 * When `isResolved` becomes true, expose Suivant / Enter and optionally
 * auto-advance after ROUND_AUTO_ADVANCE_MS if preference is enabled.
 */
export function useAwaitingAdvance(
  isResolved: boolean,
  onAdvance: () => void,
) {
  const { autoAdvanceEnabled } = useRoundAdvancePreference();
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  const advancedRef = useRef(false);

  useEffect(() => {
    if (!isResolved) {
      advancedRef.current = false;
    }
  }, [isResolved]);

  const goNext = useCallback(() => {
    if (!isResolved || advancedRef.current) return;
    advancedRef.current = true;
    onAdvanceRef.current();
  }, [isResolved]);

  useEffect(() => {
    if (!isResolved || !autoAdvanceEnabled) return;

    const timeoutId = window.setTimeout(() => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      onAdvanceRef.current();
    }, ROUND_AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isResolved, autoAdvanceEnabled]);

  useEffect(() => {
    if (!isResolved) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      event.preventDefault();
      if (advancedRef.current) return;
      advancedRef.current = true;
      onAdvanceRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isResolved]);

  return {
    showNextButton: isResolved,
    goNext,
  };
}
