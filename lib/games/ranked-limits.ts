import type { GameMode } from "@/lib/games/types";
import { getGameModeLabel } from "@/lib/games/types";
import type { RankedMode } from "@prisma/client";
import { toGameMode } from "@/lib/ranked/mode";

/** Max attempts per round in ranked mode. Last attempt must be correct or the run ends. */
export const RANKED_ATTEMPT_LIMITS: Partial<Record<GameMode, number>> = {
  "image-to-name": 1,
  "name-to-image": 1,
  "cry-guess": 1,
  pokedle: 10,
  "description-guess": 4,
  "blur-guess": 3,
  "zoom-guess": 3,
};

export const ARENA_RANKED_MODES: RankedMode[] = [
  "IMAGE_TO_NAME",
  "NAME_TO_IMAGE",
  "CRY_GUESS",
  "POKEDLE",
  "DESCRIPTION_GUESS",
  "BLUR_GUESS",
  "ZOOM_GUESS",
];

export function getRankedAttemptLimit(mode: GameMode): number | null {
  return RANKED_ATTEMPT_LIMITS[mode] ?? null;
}

export function getRankedModeLabel(mode: RankedMode): string {
  return getGameModeLabel(toGameMode(mode));
}

export function isLastRankedAttempt(
  mode: GameMode,
  attemptNumber: number,
): boolean {
  const limit = getRankedAttemptLimit(mode);
  if (!limit) return true;
  return attemptNumber >= limit;
}

export function hasRankedAttemptsRemaining(
  mode: GameMode,
  attemptNumber: number,
): boolean {
  const limit = getRankedAttemptLimit(mode);
  if (!limit) return false;
  return attemptNumber < limit;
}
