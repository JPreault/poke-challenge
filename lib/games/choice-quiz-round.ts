import { buildQuizChoices } from "@/lib/games/distractors";
import {
  createChoiceQuizToken,
  verifyChoiceQuizToken,
} from "@/lib/games/choice-quiz-token";
import type {
  ChoiceQuizAnswerResult,
  ChoiceQuizMode,
  ChoiceQuizReveal,
  ChoiceQuizSkipResult,
  ChoiceQuizStartResult,
  QuizPool,
} from "@/lib/games/choice-quiz-types";
import { normalizeQuizPool } from "@/lib/games/choice-quiz-types";
import {
  proxyArtworkUrl,
  proxyCryUrl,
  proxySpriteUrl,
} from "@/lib/games/media-token";
import { pickRandom } from "@/lib/games/random";
import {
  findCatalogPokemonById,
  getCatalogPokemon,
} from "@/lib/pokemon/data";
import { getTrainingQuizPokemon } from "@/lib/pokemon/training-pool";
import type { QuizPokemon } from "@/lib/pokemon/types";

async function pickTarget(
  pool: QuizPool,
  userId?: string,
): Promise<QuizPokemon | null> {
  const normalized = normalizeQuizPool(pool);
  if (normalized === "training") {
    if (!userId) return null;
    const training = await getTrainingQuizPokemon(userId);
    if (training.length === 0) return null;
    return pickRandom(training);
  }
  return pickRandom(getCatalogPokemon());
}

function toReveal(pokemon: QuizPokemon): ChoiceQuizReveal {
  return {
    nameFr: pokemon.nameFr,
    artworkUrl: proxyArtworkUrl(pokemon.id),
    spriteUrl: proxySpriteUrl(pokemon.id),
    cryUrl: proxyCryUrl(pokemon.id),
  };
}

function buildStartResult(
  mode: ChoiceQuizMode,
  pool: QuizPool,
  target: QuizPokemon,
  choices: QuizPokemon[],
  userId?: string,
): ChoiceQuizStartResult {
  const choiceIds = choices.map((pokemon) => pokemon.id);
  const token = createChoiceQuizToken({
    targetId: target.id,
    choiceIds,
    mode,
    pool,
    userId,
  });

  const result: ChoiceQuizStartResult = {
    token,
    choices: choices.map((pokemon, choiceIndex) => {
      const choice = { choiceIndex };
      if (mode === "image-to-name") {
        return { ...choice, nameFr: pokemon.nameFr };
      }
      if (mode === "name-to-image") {
        return { ...choice, imageUrl: proxyArtworkUrl(pokemon.id) };
      }
      return { ...choice, cryUrl: proxyCryUrl(pokemon.id) };
    }),
  };

  if (mode === "image-to-name" || mode === "cry-guess") {
    result.questionImageUrl = proxyArtworkUrl(target.id);
  }
  if (mode === "name-to-image" || mode === "cry-guess") {
    result.questionName = target.nameFr;
  }

  return result;
}

export async function startChoiceQuizRound(
  mode: ChoiceQuizMode,
  pool: QuizPool,
  userId?: string,
): Promise<ChoiceQuizStartResult | { error: string; status: number }> {
  const normalized = normalizeQuizPool(pool);
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

  const catalog = getCatalogPokemon();
  const choices = buildQuizChoices(target, catalog);
  return buildStartResult(
    mode,
    normalized,
    target,
    choices,
    normalized === "training" ? userId : undefined,
  );
}

export function answerChoiceQuizRound(
  token: string,
  choiceIndex: number,
): ChoiceQuizAnswerResult {
  const payload = verifyChoiceQuizToken(token);
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

  const chosenId = payload.choiceIds[choiceIndex];
  if (chosenId === undefined) {
    return {
      status: "invalid_token",
      message: "Choix invalide.",
    };
  }

  const chosen = findCatalogPokemonById(chosenId);
  if (!chosen) {
    return {
      status: "invalid_token",
      message: "Impossible de charger le choix.",
    };
  }

  if (chosen.id === target.id) {
    return { status: "correct", reveal: toReveal(target) };
  }

  const correctIndex = payload.choiceIds.findIndex((id) => id === target.id);
  return {
    status: "wrong",
    reveal: toReveal(chosen),
    correctIndex,
  };
}

export function skipChoiceQuizRound(token: string): ChoiceQuizSkipResult {
  const payload = verifyChoiceQuizToken(token);
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

  return { status: "ok", reveal: toReveal(target) };
}
