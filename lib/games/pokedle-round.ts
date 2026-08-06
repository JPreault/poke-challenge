import {
  createPokedleToken,
  verifyPokedleToken,
} from "@/lib/games/pokedle-token";
import type {
  AttemptHints,
  Direction,
  HintStatus,
  PokedleAttempt,
  PokedleGuessResult,
  PokedleSkipResult,
  PokedleStartResult,
} from "@/lib/games/pokedle-types";
import {
  proxyArtworkUrl,
  proxySpriteUrl,
} from "@/lib/games/media-token";
import { pickRandom } from "@/lib/games/random";
import {
  findCatalogPokemonById,
  getCatalogPokemon,
  getFrenchIndex,
} from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";

export type {
  AttemptHints,
  Direction,
  PokedleAttempt,
  PokedleGuessResult,
  PokedleSkipResult,
  PokedleStartResult,
} from "@/lib/games/pokedle-types";

function toUniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function areSameSets(left: string[], right: string[]) {
  const a = toUniqueSorted(left);
  const b = toUniqueSorted(right);
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function hasIntersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function getTypeSlotStatus(
  guessTypes: string[],
  targetTypes: string[],
  slotIndex: 0 | 1,
): HintStatus {
  const guessedType = guessTypes[slotIndex] ?? null;
  const targetType = targetTypes[slotIndex] ?? null;

  if (guessedType === targetType) {
    return "correct";
  }

  if (guessedType && targetTypes.includes(guessedType)) {
    return "partial";
  }

  return "wrong";
}

function getSetStatus(guessValues: string[], targetValues: string[]): HintStatus {
  if (areSameSets(guessValues, targetValues)) {
    return "correct";
  }

  if (hasIntersection(guessValues, targetValues)) {
    return "partial";
  }

  return "wrong";
}

function getDirection(guessValue: number, targetValue: number): Direction {
  if (guessValue === targetValue) return "equal";
  return guessValue < targetValue ? "up" : "down";
}

function buildHints(guess: QuizPokemon, target: QuizPokemon): AttemptHints {
  return {
    generation: guess.generation === target.generation ? "correct" : "wrong",
    type1: getTypeSlotStatus(guess.types, target.types, 0),
    type2: getTypeSlotStatus(guess.types, target.types, 1),
    habitat: guess.habitat === target.habitat ? "correct" : "wrong",
    colors: getSetStatus(guess.colors, target.colors),
    evolutionStage:
      guess.evolutionStage === target.evolutionStage ? "correct" : "wrong",
    heightM: guess.heightM === target.heightM ? "correct" : "wrong",
    weightKg: guess.weightKg === target.weightKg ? "correct" : "wrong",
  };
}

function toAttempt(guess: QuizPokemon, target: QuizPokemon): PokedleAttempt {
  const isCorrect = guess.id === target.id;
  return {
    nameFr: guess.nameFr,
    spriteUrl: proxySpriteUrl(guess.id),
    generation: guess.generation,
    types: guess.types,
    habitat: guess.habitat,
    colors: guess.colors,
    evolutionStage: guess.evolutionStage,
    heightM: guess.heightM,
    weightKg: guess.weightKg,
    hints: buildHints(guess, target),
    directions: {
      generation: getDirection(guess.generation, target.generation),
      evolutionStage: getDirection(guess.evolutionStage, target.evolutionStage),
      heightM: getDirection(guess.heightM, target.heightM),
      weightKg: getDirection(guess.weightKg, target.weightKg),
    },
    isCorrect,
  };
}

export function startPokedleRound(): PokedleStartResult {
  const target = pickRandom(getCatalogPokemon());
  return { token: createPokedleToken(target.id) };
}

export function guessPokedleRound(
  token: string,
  answer: string,
): PokedleGuessResult {
  const payload = verifyPokedleToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  const target = findCatalogPokemonById(payload.targetId);
  if (!target) {
    return {
      status: "invalid_token",
      message: "Impossible de charger la manche.",
    };
  }

  const normalized = normalizeFrenchName(answer);
  if (!normalized) {
    return {
      status: "not_found",
      message: "Ce Pokémon est introuvable dans le Pokédex.",
    };
  }

  const indexed = getFrenchIndex()[normalized];
  if (!indexed) {
    return {
      status: "not_found",
      message: "Ce Pokémon est introuvable dans le Pokédex.",
    };
  }

  const guessed = findCatalogPokemonById(indexed.id);
  if (!guessed) {
    return {
      status: "not_found",
      message: "Impossible de charger les données de ce Pokémon.",
    };
  }

  const attempt = toAttempt(guessed, target);
  if (attempt.isCorrect) {
    return {
      status: "correct",
      attempt,
      targetNameFr: target.nameFr,
      targetArtworkUrl: proxyArtworkUrl(target.id),
    };
  }

  return { status: "wrong", attempt };
}

export function skipPokedleRound(token: string): PokedleSkipResult {
  const payload = verifyPokedleToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  const target = findCatalogPokemonById(payload.targetId);
  if (!target) {
    return {
      status: "invalid_token",
      message: "Impossible de charger la manche.",
    };
  }

  return {
    status: "ok",
    targetNameFr: target.nameFr,
    targetArtworkUrl: proxyArtworkUrl(target.id),
  };
}
