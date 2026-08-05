import { pickRandomDistinct, shuffle } from "./random";

interface HasId {
  id: number;
}

export function buildQuizChoices<T extends HasId>(
  correct: T,
  catalog: T[],
  count = 4,
): T[] {
  const distractorCount = Math.max(0, count - 1);
  const distractors = pickRandomDistinct(
    catalog.filter((pokemon) => pokemon.id !== correct.id),
    distractorCount,
  );

  return shuffle([correct, ...distractors]);
}
