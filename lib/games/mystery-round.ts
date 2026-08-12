import type { RankedMode } from "@prisma/client";

import { pickRandom } from "@/lib/games/random";
import {
  createMysteryToken,
  mysteryArtworkPath,
  verifyMysteryToken,
  type MysteryPayload,
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
import { createTokenJti } from "@/lib/games/token-crypto";
import { consumeJtiOnce } from "@/lib/games/token-consume";
import {
  findCatalogPokemonById,
  getCatalogPokemon,
  getFrenchIndex,
} from "@/lib/pokemon/data";
import {
  getTrainingQuizPokemon,
  isInTrainingPool,
} from "@/lib/pokemon/training-pool";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import {
  commitRankedGuess,
  createRankedRound,
} from "@/lib/ranked/round-service";

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

function kindToRankedMode(kind: MysteryKind): RankedMode {
  return kind === "blur" ? "BLUR_GUESS" : "ZOOM_GUESS";
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

function reissueMysteryToken(
  payload: MysteryPayload,
  wrongAttempts: number,
  jti: string,
): string {
  return createMysteryToken({
    pokemonId: payload.pokemonId,
    kind: payload.kind,
    pool: payload.pool,
    userId: payload.userId,
    ranked: payload.ranked,
    matchId: payload.matchId,
    roundId: payload.roundId,
    jti,
    wrongAttempts,
    maxAttempts: payload.maxAttempts,
  });
}

export async function startMysteryRound(
  kind: MysteryKind,
  pool: MysteryPool,
  userId?: string,
  matchId?: string,
): Promise<MysteryStartResult | { error: string; status: number }> {
  const normalized = normalizeMysteryPool(pool);
  if (normalized === "training" && !userId) {
    return { error: "Connexion requise pour l'entraînement.", status: 401 };
  }
  if (matchId && !userId) {
    return { error: "Connexion requise pour le mode classé.", status: 401 };
  }

  const target = await pickTarget(pool, userId);
  if (!target) {
    return {
      error:
        "Ta liste d'entraînement est vide. Ajoute des Pokémon dans ton profil.",
      status: 400,
    };
  }

  if (matchId && userId) {
    const ranked = await createRankedRound({
      matchId,
      userId,
      mode: kindToRankedMode(kind),
      targetPokemonId: target.id,
    });
    if ("error" in ranked) return ranked;

    const token = createMysteryToken({
      pokemonId: target.id,
      kind,
      pool: normalized,
      userId,
      ranked: true,
      matchId: ranked.context.matchId,
      roundId: ranked.context.roundId,
      jti: ranked.context.jti,
      maxAttempts: ranked.context.maxAttempts,
      wrongAttempts: 0,
    });
    return { token, artworkUrl: mysteryArtworkPath(token) };
  }

  const token = createMysteryToken({
    pokemonId: target.id,
    kind,
    pool: normalized,
    userId: normalized === "training" ? userId : undefined,
  });
  return { token, artworkUrl: mysteryArtworkPath(token) };
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
      return { status: "invalid_token", message: "Manche invalide." };
    }
    const inPool = await isInTrainingPool(payload.userId, guessed.id);
    if (!inPool) {
      return {
        status: "not_in_pool",
        message: "Ce Pokémon ne fait pas partie de ta liste d'entraînement.",
      };
    }
  }

  const isCorrect = guessed.id === target.id;
  const nextAttempts = isCorrect
    ? payload.wrongAttempts
    : payload.wrongAttempts + 1;
  const roundFailed = !isCorrect && nextAttempts >= payload.maxAttempts;
  const nextJti =
    !isCorrect && !roundFailed ? createTokenJti() : undefined;

  if (payload.ranked && payload.roundId && payload.matchId) {
    const commit = await commitRankedGuess({
      roundId: payload.roundId,
      matchId: payload.matchId,
      jti: payload.jti,
      expMs: payload.exp,
      nextWrongAttempts: nextAttempts,
      nextStatus: isCorrect ? "CORRECT" : roundFailed ? "FAILED" : "ACTIVE",
      nextJti,
    });
    if ("error" in commit) {
      return { status: "invalid_token", message: commit.error };
    }
  } else {
    const jti = await consumeJtiOnce(payload.jti, payload.exp);
    if ("error" in jti) {
      return { status: "invalid_token", message: jti.error };
    }
  }

  if (isCorrect) {
    return { status: "correct", reveal: toReveal(target), roundFailed: false };
  }

  if (roundFailed) {
    return {
      status: "wrong",
      wrongGuess: toReveal(guessed),
      roundFailed: true,
      targetReveal: toReveal(target),
    };
  }

  const nextToken = reissueMysteryToken(payload, nextAttempts, nextJti!);
  return {
    status: "wrong",
    wrongGuess: toReveal(guessed),
    roundFailed: false,
    nextToken,
    artworkUrl: mysteryArtworkPath(nextToken),
    wrongAttempts: nextAttempts,
  };
}

export async function skipMysteryRound(
  token: string,
): Promise<MysterySkipResult> {
  const payload = verifyMysteryToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  if (payload.ranked) {
    return {
      status: "forbidden",
      message: "Le passage est désactivé en mode classé.",
    };
  }

  const target = findById(payload.pokemonId);
  if (!target) {
    return {
      status: "invalid_token",
      message: "Impossible de charger la manche.",
    };
  }

  const jti = await consumeJtiOnce(payload.jti, payload.exp);
  if ("error" in jti) {
    return { status: "invalid_token", message: jti.error };
  }

  return { status: "ok", reveal: toReveal(target) };
}

export function resolveMysteryArtworkPayload(
  token: string,
): MysteryPayload | null {
  return verifyMysteryToken(token);
}

export function resolveMysteryArtworkUrl(token: string): string | null {
  const payload = verifyMysteryToken(token);
  if (!payload) return null;
  const target = findById(payload.pokemonId);
  return target?.artwork ?? null;
}
