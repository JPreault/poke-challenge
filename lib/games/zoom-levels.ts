import { MYSTERY_FULL_REVEAL_ATTEMPTS } from "@/lib/games/blur-levels";

export const INITIAL_ZOOM_SCALE = 10;

export function getZoomScale(wrongAttempts: number): number {
  const progress = Math.min(
    Math.max(wrongAttempts, 0) / MYSTERY_FULL_REVEAL_ATTEMPTS,
    1,
  );
  const scale = 1 + (INITIAL_ZOOM_SCALE - 1) * (1 - progress);
  return Math.max(1, Math.round(scale * 10) / 10);
}

export function isFullyDezoomed(wrongAttempts: number): boolean {
  return getZoomScale(wrongAttempts) <= 1;
}
