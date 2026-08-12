/** Wrong attempts before the image is fully revealed (linear progression). */
export const MYSTERY_FULL_REVEAL_ATTEMPTS = 8;

export const INITIAL_BLUR_PX = 42;

export function getBlurPx(wrongAttempts: number): number {
    const progress = Math.min(Math.max(wrongAttempts, 0) / MYSTERY_FULL_REVEAL_ATTEMPTS, 1);
    const blur = INITIAL_BLUR_PX * (1 - progress);
    return Math.max(0, Math.round(blur * 8) / 8);
}

export function isFullyDeblurred(wrongAttempts: number): boolean {
    return getBlurPx(wrongAttempts) <= 0;
}
