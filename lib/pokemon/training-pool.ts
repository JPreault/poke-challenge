import "server-only";

import { prisma } from "@/lib/db/prisma";
import { findCatalogPokemonById } from "@/lib/pokemon/data";
import type { QuizPokemon } from "@/lib/pokemon/types";

export async function getTrainingPokemonIds(userId: string): Promise<number[]> {
  const rows = await prisma.trainingPokemon.findMany({
    where: { userId },
    select: { pokemonId: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.pokemonId);
}

export async function getTrainingQuizPokemon(userId: string): Promise<QuizPokemon[]> {
  const ids = await getTrainingPokemonIds(userId);
  return ids
    .map((id) => findCatalogPokemonById(id))
    .filter((pokemon): pokemon is QuizPokemon => Boolean(pokemon));
}

export async function getTrainingSearchCatalog(
  userId: string,
): Promise<Array<{ id: number; nameFr: string }>> {
  const pokemon = await getTrainingQuizPokemon(userId);
  return pokemon.map((entry) => ({ id: entry.id, nameFr: entry.nameFr }));
}

export async function hasTrainingPool(userId: string): Promise<boolean> {
  const count = await prisma.trainingPokemon.count({ where: { userId } });
  return count > 0;
}
