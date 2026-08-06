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
import {
  proxyArtworkUrl,
  proxyCryUrl,
  proxySpriteUrl,
} from "@/lib/games/media-token";
import { pickRandom } from "@/lib/games/random";
import {
  findCatalogPokemonById,
  getBacPokemon,
  getCatalogPokemon,
} from "@/lib/pokemon/data";
import type { QuizPokemon } from "@/lib/pokemon/types";

function pickTarget(pool: QuizPool): QuizPokemon {
  const catalog = getCatalogPokemon();
  if (pool === "bac") {
    const bacEntry = pickRandom(getBacPokemon());
    return findCatalogPokemonById(bacEntry.id) ?? pickRandom(catalog);
  }
  return pickRandom(catalog);
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
): ChoiceQuizStartResult {
  const choiceIds = choices.map((pokemon) => pokemon.id);
  const token = createChoiceQuizToken({
    targetId: target.id,
    choiceIds,
    mode,
    pool,
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

export function startChoiceQuizRound(
  mode: ChoiceQuizMode,
  pool: QuizPool,
): ChoiceQuizStartResult {
  const target = pickTarget(pool);
  const catalog = getCatalogPokemon();
  const choices = buildQuizChoices(target, catalog);
  return buildStartResult(mode, pool, target, choices);
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

export function getChoiceQuizCorrectReveal(token: string): ChoiceQuizReveal | null {
  const payload = verifyChoiceQuizToken(token);
  if (!payload) return null;
  const target = findCatalogPokemonById(payload.targetId);
  return target ? toReveal(target) : null;
}
