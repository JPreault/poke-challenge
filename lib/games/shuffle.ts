import { pickRandom } from "./random";
import {
  ARENA_SHUFFLE_ROUND_TYPES,
  BAC_SHUFFLE_ROUND_TYPES,
  type ShuffleRoundType,
} from "./types";

export function pickShuffleRoundType(useBacPool: boolean): ShuffleRoundType {
  const roundTypes = useBacPool ? BAC_SHUFFLE_ROUND_TYPES : ARENA_SHUFFLE_ROUND_TYPES;
  return pickRandom(roundTypes);
}
