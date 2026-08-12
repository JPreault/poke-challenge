"use client";

import { useCallback, useEffect, useRef } from "react";

interface UsePrefetchedRoundOptions<T> {
  /** Prefetch only when true (disable for ranked / shuffle). */
  enabled: boolean;
  fetchPayload: () => Promise<T | null>;
  warm?: (payload: T) => Promise<void>;
}

/**
 * Cache the next round payload (+ optional media warm) so advance can swap
 * without waiting on a cold /start.
 */
export function usePrefetchedRound<T>({
  enabled,
  fetchPayload,
  warm,
}: UsePrefetchedRoundOptions<T>) {
  const cacheRef = useRef<T | null>(null);
  const inflightRef = useRef<Promise<T | null> | null>(null);
  const fetchRef = useRef(fetchPayload);
  const warmRef = useRef(warm);
  fetchRef.current = fetchPayload;
  warmRef.current = warm;

  useEffect(() => {
    if (enabled) return;
    cacheRef.current = null;
    inflightRef.current = null;
  }, [enabled]);

  const prefetch = useCallback(() => {
    if (!enabled || cacheRef.current || inflightRef.current) return;

    inflightRef.current = (async () => {
      try {
        const payload = await fetchRef.current();
        if (payload && warmRef.current) {
          await warmRef.current(payload);
        }
        cacheRef.current = payload;
        return payload;
      } catch {
        return null;
      } finally {
        inflightRef.current = null;
      }
    })();
  }, [enabled]);

  const takeOrFetch = useCallback(async (): Promise<T | null> => {
    if (cacheRef.current) {
      const payload = cacheRef.current;
      cacheRef.current = null;
      return payload;
    }

    if (inflightRef.current) {
      const payload = await inflightRef.current;
      cacheRef.current = null;
      return payload;
    }

    try {
      const payload = await fetchRef.current();
      if (payload && warmRef.current) {
        await warmRef.current(payload);
      }
      return payload;
    } catch {
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    cacheRef.current = null;
    inflightRef.current = null;
  }, []);

  return { prefetch, takeOrFetch, clear };
}
