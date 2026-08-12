import type { RankedMode } from "@prisma/client";

import {
  ARENA_RANKED_MODES,
  getRankedModeLabel,
} from "@/lib/games/ranked-limits";

export interface RankedScoreEntry {
  mode: RankedMode;
  modeLabel: string;
  bestWinStreak: number;
  bestTopRank?: number | null;
}

/** Complète la liste avec toutes les épreuves classées (scores à 0 si absentes). */
export function buildRankedScoreEntries(
  scores: RankedScoreEntry[] = [],
): RankedScoreEntry[] {
  const byMode = new Map(scores.map((score) => [score.mode, score]));

  return ARENA_RANKED_MODES.map((mode) => {
    const existing = byMode.get(mode);

    return {
      mode,
      modeLabel: existing?.modeLabel ?? getRankedModeLabel(mode),
      bestWinStreak: existing?.bestWinStreak ?? 0,
      bestTopRank: existing?.bestTopRank ?? null,
    };
  });
}
