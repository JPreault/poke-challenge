import "server-only";

import { prisma } from "@/lib/db/prisma";
import { findCatalogPokemonById } from "@/lib/pokemon/data";
import type { QuizPokemon } from "@/lib/pokemon/types";

const TRAINING_POOL_TTL_MS = 60_000;

type TrainingPoolCacheEntry = {
  ids: Set<number>;
  expiresAt: number;
};

const trainingPoolCache = new Map<string, TrainingPoolCacheEntry>();

export async function getTrainingPokemonIds(userId: string): Promise<number[]> {
  const cached = trainingPoolCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return [...cached.ids];
  }

  const rows = await prisma.trainingPokemon.findMany({
    where: { userId },
    select: { pokemonId: true },
    orderBy: { createdAt: "asc" },
  });
  const ids = rows.map((row) => row.pokemonId);
  trainingPoolCache.set(userId, {
    ids: new Set(ids),
    expiresAt: Date.now() + TRAINING_POOL_TTL_MS,
  });
  return ids;
}

export async function isInTrainingPool(
  userId: string,
  pokemonId: number,
): Promise<boolean> {
  const cached = trainingPoolCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ids.has(pokemonId);
  }

  const ids = await getTrainingPokemonIds(userId);
  return ids.includes(pokemonId);
}

/** Invalidate cache after profile list edits. */
export function invalidateTrainingPoolCache(userId: string) {
  trainingPoolCache.delete(userId);
}

export async function getTrainingQuizPokemon(userId: string): Promise<QuizPokemon[]> {
  const ids = await getTrainingPokemonIds(userId);
  return ids
    .map((id) => findCatalogPokemonById(id))
    .filter((pokemon): pokemon is QuizPokemon => Boolean(pokemon))
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"));
}

export async function getTrainingSearchCatalog(
  userId: string,
): Promise<Array<{ id: number; nameFr: string }>> {
  const pokemon = await getTrainingQuizPokemon(userId);
  return pokemon.map((entry) => ({ id: entry.id, nameFr: entry.nameFr }));
}

export async function hasTrainingPool(userId: string): Promise<boolean> {
  const cached = trainingPoolCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ids.size > 0;
  }
  const count = await prisma.trainingPokemon.count({ where: { userId } });
  return count > 0;
}
