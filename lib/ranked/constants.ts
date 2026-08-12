import type { RankedMode } from "@prisma/client";

import { ARENA_RANKED_MODES } from "@/lib/games/ranked-limits";

export { ARENA_RANKED_MODES as RANKED_MODES };

export type RankedModeValue = RankedMode;

/** Délai avant passage à la manche suivante ou fin de partie en classé. */
export const RANKED_ROUND_TRANSITION_MS = 4000;
