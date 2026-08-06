import { censorPokemonNameInText } from "@/lib/pokemon/censor";
import {
  createDescriptionToken,
  verifyDescriptionToken,
} from "@/lib/games/description-token";
import type {
  DescriptionGuessResult,
  DescriptionSkipResult,
  DescriptionStartResult,
} from "@/lib/games/description-types";
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

const EXTRA_DESCRIPTION_EVERY = 3;

export type {
  DescriptionGuessResult,
  DescriptionSkipResult,
  DescriptionStartResult,
} from "@/lib/games/description-types";

function pickRandomWithDescription(): QuizPokemon {
  const withDescription = getCatalogPokemon().filter(
    (pokemon) => pokemon.descriptionsFr.length > 0,
  );
  return pickRandom(withDescription);
}

function visibleDescriptionCount(
  wrongAttempts: number,
  total: number,
): number {
  const unlocked = 1 + Math.floor(wrongAttempts / EXTRA_DESCRIPTION_EVERY);
  return Math.min(unlocked, total);
}

function getVisibleDescriptions(
  target: QuizPokemon,
  wrongAttempts: number,
  solved: boolean,
): string[] {
  const count = solved
    ? target.descriptionsFr.length
    : visibleDescriptionCount(wrongAttempts, target.descriptionsFr.length);

  return target.descriptionsFr.slice(0, count).map((description) =>
    solved
      ? description
      : censorPokemonNameInText(description, target.nameFr),
  );
}

export function startDescriptionRound(): DescriptionStartResult {
  const target = pickRandomWithDescription();
  return {
    token: createDescriptionToken(target.id),
    totalDescriptions: target.descriptionsFr.length,
    visibleDescriptions: getVisibleDescriptions(target, 0, false),
  };
}

export function guessDescriptionRound(
  token: string,
  answer: string,
  wrongAttempts: number,
): DescriptionGuessResult {
  const payload = verifyDescriptionToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  const target = findCatalogPokemonById(payload.targetId);
  if (!target || target.descriptionsFr.length === 0) {
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

  if (guessed.id === target.id) {
    return {
      status: "correct",
      nameFr: target.nameFr,
      artworkUrl: proxyArtworkUrl(target.id),
      visibleDescriptions: getVisibleDescriptions(target, wrongAttempts, true),
    };
  }

  const previousVisible = visibleDescriptionCount(
    wrongAttempts,
    target.descriptionsFr.length,
  );
  const nextAttempts = wrongAttempts + 1;
  const nextVisible = visibleDescriptionCount(
    nextAttempts,
    target.descriptionsFr.length,
  );

  return {
    status: "wrong",
    wrongGuess: {
      id: guessed.id,
      nameFr: guessed.nameFr,
      spriteUrl: proxySpriteUrl(guessed.id),
    },
    visibleDescriptions: getVisibleDescriptions(target, nextAttempts, false),
    unlockedNewDescription: nextVisible > previousVisible,
  };
}

export function skipDescriptionRound(
  token: string,
  wrongAttempts: number,
): DescriptionSkipResult {
  const payload = verifyDescriptionToken(token);
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
    nameFr: target.nameFr,
    artworkUrl: proxyArtworkUrl(target.id),
    visibleDescriptions: getVisibleDescriptions(target, wrongAttempts, true),
  };
}

export function getDescriptionState(
  token: string,
  wrongAttempts: number,
  solved: boolean,
): { visibleDescriptions: string[]; totalDescriptions: number } | null {
  const payload = verifyDescriptionToken(token);
  if (!payload) return null;

  const target = findCatalogPokemonById(payload.targetId);
  if (!target) return null;

  return {
    visibleDescriptions: getVisibleDescriptions(target, wrongAttempts, solved),
    totalDescriptions: target.descriptionsFr.length,
  };
}
