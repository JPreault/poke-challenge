import { pickRandom, shuffle } from "./random";
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
  value: string | string[] | undefined | null,
  useBacPool: boolean,
): ShuffleRoundType[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const raw = Array.isArray(value) ? value.join(",") : value;
  const allowed = new Set<string>(getAvailableShuffleRoundTypes(useBacPool));
  const seen = new Set<ShuffleRoundType>();
  const parsed: ShuffleRoundType[] = [];

  for (const part of raw.split(/[,|]/)) {
    const trimmed = decodeURIComponent(part.trim());
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

/** Build a fresh deck containing every selected type exactly once (shuffled). */
export function createShuffleDeck(
  selected: ShuffleRoundType[],
): ShuffleRoundType[] {
  if (selected.length === 0) {
    throw new Error("Cannot create a shuffle deck from an empty selection");
  }

  return shuffle([...selected]);
}

/**
 * Draw the next round type from the deck. When empty, refill with a full
 * reshuffle of all selected types so every chosen game keeps appearing.
 */
export function drawNextShuffleRoundType(
  deck: ShuffleRoundType[],
  selected: ShuffleRoundType[],
): { nextType: ShuffleRoundType; remainingDeck: ShuffleRoundType[] } {
  const workingDeck = deck.length > 0 ? deck : createShuffleDeck(selected);
  const [nextType, ...remainingDeck] = workingDeck;
  return { nextType, remainingDeck };
}

export function buildShuffleGamesQuery(selected: ShuffleRoundType[]): string {
  return selected.join(",");
}
