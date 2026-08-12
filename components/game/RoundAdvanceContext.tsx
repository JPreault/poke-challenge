"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AUTO_ADVANCE_STORAGE_KEY } from "@/lib/games/round-advance";

interface RoundAdvanceContextValue {
  autoAdvanceEnabled: boolean;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
}

const RoundAdvanceContext = createContext<RoundAdvanceContextValue | null>(
  null,
);

function readStoredAutoAdvance(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTO_ADVANCE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function RoundAdvanceProvider({ children }: { children: ReactNode }) {
  const [autoAdvanceEnabled, setAutoAdvanceState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAutoAdvanceState(readStoredAutoAdvance());
    setHydrated(true);
  }, []);

  const setAutoAdvanceEnabled = useCallback((enabled: boolean) => {
    setAutoAdvanceState(enabled);
    try {
      window.localStorage.setItem(
        AUTO_ADVANCE_STORAGE_KEY,
        enabled ? "1" : "0",
      );
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const value = useMemo(
    () => ({
      autoAdvanceEnabled: hydrated ? autoAdvanceEnabled : false,
      setAutoAdvanceEnabled,
    }),
    [autoAdvanceEnabled, hydrated, setAutoAdvanceEnabled],
  );

  return (
    <RoundAdvanceContext.Provider value={value}>
      {children}
    </RoundAdvanceContext.Provider>
  );
}

export function useRoundAdvancePreference() {
  const context = useContext(RoundAdvanceContext);
  if (!context) {
    throw new Error(
      "useRoundAdvancePreference must be used within RoundAdvanceProvider",
    );
  }
  return context;
}
