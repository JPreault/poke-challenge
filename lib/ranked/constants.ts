import type { RankedMode } from "@prisma/client";

import { ARENA_RANKED_MODES } from "@/lib/games/ranked-limits";

export { ARENA_RANKED_MODES as RANKED_MODES };

export type RankedModeValue = RankedMode;
