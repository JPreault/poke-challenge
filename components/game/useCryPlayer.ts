"use client";

import { useCallback, useEffect, useRef } from "react";

import { preloadAudios } from "@/components/game/warmMedia";

const DEFAULT_VOLUME = 0.35;

let sharedAudio: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.volume = DEFAULT_VOLUME;
  }
  return sharedAudio;
}

/** One-shot play for non-hook contexts (e.g. GameShell recap). */
export function playCryOnce(url: string, volume = DEFAULT_VOLUME) {
  if (!url) return;
  const audio = getSharedAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = volume;
  audio.src = url;
  void audio.play().catch(() => undefined);
}

export function stopCryPlayback() {
  if (!sharedAudio) return;
  sharedAudio.pause();
  sharedAudio.currentTime = 0;
}

/**
 * Reusable cry player: stops the previous clip before playing,
 * and can preload a set of URLs for the current round.
 */
export function useCryPlayer(volume = DEFAULT_VOLUME) {
  const onEndedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopCryPlayback();
      onEndedRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    stopCryPlayback();
    onEndedRef.current = null;
  }, []);

  const play = useCallback(
    (url: string | undefined, onEnded?: () => void) => {
      if (!url) return;
      const audio = getSharedAudio();
      audio.pause();
      audio.onended = null;
      onEndedRef.current = onEnded ?? null;
      audio.volume = volume;
      audio.src = url;
      audio.onended = () => {
        onEndedRef.current?.();
        onEndedRef.current = null;
      };
      void audio.play().catch(() => undefined);
    },
    [volume],
  );

  const preload = useCallback(async (urls: Array<string | undefined | null>) => {
    await preloadAudios(urls);
  }, []);

  return { play, stop, preload };
}
