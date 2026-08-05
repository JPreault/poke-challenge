import { pickRandom } from "./random";
import {
  SHUFFLE_ROUND_TYPES,
  type ShuffleRoundType,
} from "./types";

export function pickShuffleRoundType(): ShuffleRoundType {
  return pickRandom(SHUFFLE_ROUND_TYPES);
}
