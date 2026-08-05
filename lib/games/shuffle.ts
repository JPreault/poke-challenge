import { pickRandom } from "./random";
import {
  ARENA_SHUFFLE_ROUND_TYPES,
  BAC_SHUFFLE_ROUND_TYPES,
  type ShuffleRoundType,
} from "./types";

export function getAvailableShuffleRoundTypes(
  useBacPool: boolean,
): readonly ShuffleRoundType[] {
  return useBacPool ? BAC_SHUFFLE_ROUND_TYPES : ARENA_SHUFFLE_ROUND_TYPES;
}

export function parseShuffleGamesParam(
  value: string | string[] | undefined,
  useBacPool: boolean,
): ShuffleRoundType[] {
  if (value === undefined) {
    return [];
  }

  const raw = Array.isArray(value) ? value.join(",") : value;
  const allowed = new Set<string>(getAvailableShuffleRoundTypes(useBacPool));
  const seen = new Set<ShuffleRoundType>();
  const parsed: ShuffleRoundType[] = [];

  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || !allowed.has(trimmed) || seen.has(trimmed as ShuffleRoundType)) {
      continue;
    }

    const roundType = trimmed as ShuffleRoundType;
    seen.add(roundType);
    parsed.push(roundType);
  }

  return parsed;
}

export function pickShuffleRoundType(
  selected: ShuffleRoundType[],
): ShuffleRoundType {
  if (selected.length === 0) {
    throw new Error("Cannot pick a shuffle round type from an empty selection");
  }

  return pickRandom(selected);
}

export function buildShuffleGamesQuery(selected: ShuffleRoundType[]): string {
  return selected.join(",");
}
