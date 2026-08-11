"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { GameMode } from "@/lib/games/types";
import { getRankedAttemptLimit } from "@/lib/games/ranked-limits";
import type { GameSession } from "@/lib/games/useGameSession";

interface RankedSessionState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  matchId: string | null;
  winStreak: number;
  topStreak: number;
  topPlayerName: string | null;
  playerBestStreak: number;
  roundAttempts: number;
  attemptLimit: number;
  isNewRecord: boolean | null;
  previousBest: number | null;
  finalWinStreak: number | null;
  endedReason: "fail" | "abandon" | null;
}

interface RankedSessionContextValue extends RankedSessionState {
  isRanked: true;
  onRoundSuccess: () => void;
  onRoundFail: () => void;
  onWrongAttempt: () => boolean;
  resetRoundAttempts: () => void;
  abandon: () => Promise<void>;
}

const RankedSessionContext = createContext<RankedSessionContextValue | null>(
  null,
);

export function useRankedSession() {
  return useContext(RankedSessionContext);
}

interface RankedSessionProviderProps {
  mode: GameMode;
  session: GameSession;
  children: ReactNode;
  onReady?: () => void;
}

export function RankedSessionProvider({
  mode,
  session,
  children,
  onReady,
}: RankedSessionProviderProps) {
  const attemptLimit = getRankedAttemptLimit(mode) ?? 1;
  const startedAtRef = useRef(Date.now());
  const finishingRef = useRef(false);
  const roundKeyRef = useRef(0);

  const [state, setState] = useState<RankedSessionState>({
    ready: false,
    loading: true,
    error: null,
    matchId: null,
    winStreak: 0,
    topStreak: 0,
    topPlayerName: null,
    playerBestStreak: 0,
    roundAttempts: 0,
    attemptLimit,
    isNewRecord: null,
    previousBest: null,
    finalWinStreak: null,
    endedReason: null,
  });

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const response = await fetch("/api/ranked/match/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          if (active) {
            setState((current) => ({
              ...current,
              loading: false,
              error: payload.error ?? "Impossible de démarrer le mode classé.",
            }));
          }
          return;
        }

        const payload = (await response.json()) as {
          match: { id: string };
          topStreak: number;
          topPlayerName: string | null;
          playerBestStreak: number;
        };

        if (!active) return;

        setState((current) => ({
          ...current,
          ready: true,
          loading: false,
          matchId: payload.match.id,
          topStreak: payload.topStreak,
          topPlayerName: payload.topPlayerName,
          playerBestStreak: payload.playerBestStreak,
        }));
        onReady?.();
      } catch {
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            error: "Impossible de démarrer le mode classé.",
          }));
        }
      }
    };

    void start();
    return () => {
      active = false;
    };
  }, [mode, onReady]);

  const persistMatch = useCallback(
    async (
      winStreak: number,
      endedReason: "fail" | "abandon",
      matchId: string,
    ) => {
      const durationMs = Date.now() - startedAtRef.current;
      const endpoint =
        endedReason === "abandon"
          ? "/api/ranked/match/abandon"
          : "/api/ranked/match/finish";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          winStreak,
          totalRounds: winStreak,
          correctCount: winStreak,
          durationMs,
        }),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as {
        isNewRecord: boolean;
        previousBest: number;
        leaderboard: { bestWinStreak: number };
      };
    },
    [],
  );

  const endRun = useCallback(
    async (endedReason: "fail" | "abandon") => {
      if (finishingRef.current) return;
      finishingRef.current = true;

      const matchId = state.matchId;
      const winStreak = state.winStreak;

      if (!matchId) {
        session.stopGame();
        return;
      }

      const result = await persistMatch(winStreak, endedReason, matchId);

      setState((current) => ({
        ...current,
        finalWinStreak: winStreak,
        endedReason,
        isNewRecord: result?.isNewRecord ?? null,
        previousBest: result?.previousBest ?? current.playerBestStreak,
        playerBestStreak:
          result?.leaderboard.bestWinStreak ?? current.playerBestStreak,
        topStreak:
          result?.isNewRecord && winStreak > current.topStreak
            ? winStreak
            : current.topStreak,
      }));

      session.stopGame();
    },
    [persistMatch, session, state.matchId, state.winStreak],
  );

  const onRoundSuccess = useCallback(() => {
    roundKeyRef.current += 1;
    setState((current) => ({
      ...current,
      winStreak: current.winStreak + 1,
      roundAttempts: 0,
    }));
  }, []);

  const onRoundFail = useCallback(() => {
    void endRun("fail");
  }, [endRun]);

  const onWrongAttempt = useCallback(() => {
    let shouldFail = false;
    setState((current) => {
      const nextAttempts = current.roundAttempts + 1;
      shouldFail = nextAttempts >= current.attemptLimit;
      return { ...current, roundAttempts: nextAttempts };
    });
    return shouldFail;
  }, []);

  const resetRoundAttempts = useCallback(() => {
    setState((current) => ({ ...current, roundAttempts: 0 }));
  }, []);

  const abandon = useCallback(async () => {
    await endRun("abandon");
  }, [endRun]);

  const value = useMemo<RankedSessionContextValue>(
    () => ({
      ...state,
      isRanked: true,
      onRoundSuccess,
      onRoundFail,
      onWrongAttempt,
      resetRoundAttempts,
      abandon,
    }),
    [
      state,
      onRoundSuccess,
      onRoundFail,
      onWrongAttempt,
      resetRoundAttempts,
      abandon,
    ],
  );

  return (
    <RankedSessionContext.Provider value={value}>
      {children}
    </RankedSessionContext.Provider>
  );
}

export function useRankedRoundKey() {
  const ranked = useRankedSession();
  const ref = useRef(0);
  if (ranked && ranked.winStreak !== ref.current) {
    ref.current = ranked.winStreak;
  }
  return ranked ? `${ranked.winStreak}-${ranked.roundAttempts}` : "casual";
}
