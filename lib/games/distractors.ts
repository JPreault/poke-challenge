import type { QuizPokemon } from "@/lib/pokemon/types";

import { pickRandomDistinct, shuffle } from "./random";

export function buildQuizChoices(
  correct: QuizPokemon,
  catalog: QuizPokemon[],
  count = 4,
): QuizPokemon[] {
  const distractorCount = Math.max(0, count - 1);
  const distractors = pickRandomDistinct(
    catalog.filter((pokemon) => pokemon.id !== correct.id),
    distractorCount,
  );

  return shuffle([correct, ...distractors]);
}
