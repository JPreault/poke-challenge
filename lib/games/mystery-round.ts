import { pickRandom } from "@/lib/games/random";
import {
  createMysteryToken,
  mysteryArtworkPath,
  verifyMysteryToken,
} from "@/lib/games/mystery-token";
import type {
  MysteryGuessResult,
  MysteryKind,
  MysteryPool,
  MysteryReveal,
  MysterySkipResult,
  MysteryStartResult,
} from "@/lib/games/mystery-types";
import {
  proxyArtworkUrl,
  proxySpriteUrl,
} from "@/lib/games/media-token";
import {
  findCatalogPokemonById,
  getBacPokemon,
  getCatalogPokemon,
  getFrenchIndex,
} from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";

export type {
  MysteryGuessResult,
  MysteryReveal,
  MysterySkipResult,
  MysteryStartResult,
} from "@/lib/games/mystery-types";

function toReveal(pokemon: QuizPokemon): MysteryReveal {
  return {
    id: pokemon.id,
    nameFr: pokemon.nameFr,
    sprite: proxySpriteUrl(pokemon.id),
    artwork: proxyArtworkUrl(pokemon.id),
  };
}

function findById(id: number): QuizPokemon | undefined {
  return findCatalogPokemonById(id);
}

function pickTarget(pool: MysteryPool): QuizPokemon {
  const catalog = getCatalogPokemon();
  if (pool === "bac") {
    const bacEntry = pickRandom(getBacPokemon());
    return findById(bacEntry.id) ?? pickRandom(catalog);
  }
  return pickRandom(catalog);
}

export function startMysteryRound(
  kind: MysteryKind,
  pool: MysteryPool,
): MysteryStartResult {
  const target = pickTarget(pool);
  const token = createMysteryToken(target.id, kind, pool);
  return {
    token,
    artworkUrl: mysteryArtworkPath(token),
  };
}

export function guessMysteryRound(
  token: string,
  answer: string,
): MysteryGuessResult {
  const payload = verifyMysteryToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  const target = findById(payload.pokemonId);
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

  const guessed = findById(indexed.id);
  if (!guessed) {
    return {
      status: "not_found",
      message: "Impossible de charger les données de ce Pokémon.",
    };
  }

  if (
    payload.pool === "bac" &&
    !getBacPokemon().some((bac) => bac.id === guessed.id)
  ) {
    return {
      status: "not_in_pool",
      message: "Ce Pokémon ne fait pas partie de la liste du bac.",
    };
  }

  if (guessed.id === target.id) {
    return { status: "correct", reveal: toReveal(target) };
  }

  return { status: "wrong", wrongGuess: toReveal(guessed) };
}

export function skipMysteryRound(token: string): MysterySkipResult {
  const payload = verifyMysteryToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  const target = findById(payload.pokemonId);
  if (!target) {
    return {
      status: "invalid_token",
      message: "Impossible de charger la manche.",
    };
  }

  return { status: "ok", reveal: toReveal(target) };
}

export function resolveMysteryArtworkUrl(token: string): string | null {
  const payload = verifyMysteryToken(token);
  if (!payload) return null;
  const target = findById(payload.pokemonId);
  return target?.artwork ?? null;
}
