export const INITIAL_BLUR_PX = 16;

/** Réduction du flou (px) à chaque tentative incorrecte. */
export const DEBLUR_STEP_PX = 1.2;

export function getBlurPx(wrongAttempts: number): number {
  const blur = INITIAL_BLUR_PX - wrongAttempts * DEBLUR_STEP_PX;
  return Math.max(0, Math.round(blur * 10) / 10);
}

export function isFullyDeblurred(wrongAttempts: number): boolean {
  return getBlurPx(wrongAttempts) <= 0;
}
