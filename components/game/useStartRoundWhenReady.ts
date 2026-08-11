"use client";

import { useEffect, useRef } from "react";

import { useRankedSession } from "@/components/game/RankedSessionContext";

/** Lance startRound une fois le mode classé prêt (ou immédiatement en casual). */
export function useStartRoundWhenReady(
  startRound: () => void | Promise<void>,
) {
  const ranked = useRankedSession();
  const rankedReady = ranked?.ready ?? true;
  const startRoundRef = useRef(startRound);
  startRoundRef.current = startRound;

  useEffect(() => {
    if (!rankedReady) return;

    const timeoutId = window.setTimeout(() => {
      void startRoundRef.current();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [rankedReady]);
}
