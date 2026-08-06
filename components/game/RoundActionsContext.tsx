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

export interface SkipAction {
  onSkip: () => void;
  disabled?: boolean;
}

interface RoundActionsContextValue {
  skipAction: SkipAction | null;
  setSkipAction: (action: SkipAction | null) => void;
}

const RoundActionsContext = createContext<RoundActionsContextValue | null>(null);

export function RoundActionsProvider({ children }: { children: ReactNode }) {
  const [skipAction, setSkipActionState] = useState<SkipAction | null>(null);

  const setSkipAction = useCallback((action: SkipAction | null) => {
    setSkipActionState(action);
  }, []);

  const value = useMemo(
    () => ({ skipAction, setSkipAction }),
    [skipAction, setSkipAction],
  );

  return (
    <RoundActionsContext.Provider value={value}>
      {children}
    </RoundActionsContext.Provider>
  );
}

export function useRoundActions() {
  const context = useContext(RoundActionsContext);
  if (!context) {
    throw new Error("useRoundActions must be used within RoundActionsProvider");
  }
  return context;
}

/** Register a Passer handler for the current round; cleared on unmount. */
export function useRegisterSkip(
  onSkip: (() => void) | null,
  enabled: boolean,
) {
  const { setSkipAction } = useRoundActions();
  const onSkipRef = useRef(onSkip);

  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  useEffect(() => {
    if (!enabled) {
      setSkipAction(null);
      return;
    }

    setSkipAction({
      onSkip: () => {
        onSkipRef.current?.();
      },
      disabled: false,
    });
    return () => setSkipAction(null);
  }, [enabled, setSkipAction]);
}
