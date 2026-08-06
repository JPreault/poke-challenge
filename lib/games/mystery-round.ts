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
import { normalizeMysteryPool } from "@/lib/games/mystery-types";
import {
  proxyArtworkUrl,
  proxySpriteUrl,
} from "@/lib/games/media-token";
import {
  findCatalogPokemonById,
  getCatalogPokemon,
  getFrenchIndex,
} from "@/lib/pokemon/data";
import { getTrainingQuizPokemon } from "@/lib/pokemon/training-pool";
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

async function pickTarget(
  pool: MysteryPool,
  userId?: string,
): Promise<QuizPokemon | null> {
  const normalized = normalizeMysteryPool(pool);
  if (normalized === "training") {
    if (!userId) return null;
    const training = await getTrainingQuizPokemon(userId);
    if (training.length === 0) return null;
    return pickRandom(training);
  }
  return pickRandom(getCatalogPokemon());
}

export async function startMysteryRound(
  kind: MysteryKind,
  pool: MysteryPool,
  userId?: string,
): Promise<MysteryStartResult | { error: string; status: number }> {
  const normalized = normalizeMysteryPool(pool);
  if (normalized === "training" && !userId) {
    return { error: "Connexion requise pour l'entraînement.", status: 401 };
  }

  const target = await pickTarget(pool, userId);
  if (!target) {
    return {
      error:
        "Ta liste d'entraînement est vide. Ajoute des Pokémon dans ton profil.",
      status: 400,
    };
  }

  const token = createMysteryToken(
    target.id,
    kind,
    normalized,
    normalized === "training" ? userId : undefined,
  );
  return {
    token,
    artworkUrl: mysteryArtworkPath(token),
  };
}

export async function guessMysteryRound(
  token: string,
  answer: string,
): Promise<MysteryGuessResult> {
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

  const pool = normalizeMysteryPool(payload.pool);
  if (pool === "training") {
    if (!payload.userId) {
      return {
        status: "invalid_token",
        message: "Manche invalide.",
      };
    }
    const training = await getTrainingQuizPokemon(payload.userId);
    if (!training.some((pokemon) => pokemon.id === guessed.id)) {
      return {
        status: "not_in_pool",
        message: "Ce Pokémon ne fait pas partie de ta liste d'entraînement.",
      };
    }
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
