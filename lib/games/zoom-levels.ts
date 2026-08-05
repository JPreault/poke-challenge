export const INITIAL_ZOOM_SCALE = 10;

/** Réduction du zoom (facteur) à chaque tentative incorrecte. */
export const DEZOOM_STEP = 0.7;

export function getZoomScale(wrongAttempts: number): number {
  const scale = INITIAL_ZOOM_SCALE - wrongAttempts * DEZOOM_STEP;
  return Math.max(1, Math.round(scale * 10) / 10);
}

export function isFullyDezoomed(wrongAttempts: number): boolean {
  return getZoomScale(wrongAttempts) <= 1;
}
