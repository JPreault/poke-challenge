import { getBlurPx } from "@/lib/games/blur-levels";
import { getZoomScale } from "@/lib/games/zoom-levels";

/** Map CSS blur px to a Sharp gaussian sigma. */
export function blurPxToSigma(blurPx: number): number {
  if (blurPx <= 0) return 0;
  return Math.max(0.3, blurPx / 2);
}

export function getMysteryBlurSigma(wrongAttempts: number): number {
  return blurPxToSigma(getBlurPx(wrongAttempts));
}

export function getMysteryZoomCropRatio(wrongAttempts: number): number {
  const scale = getZoomScale(wrongAttempts);
  return 1 / scale;
}
