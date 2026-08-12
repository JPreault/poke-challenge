import type { RankedMode } from "@prisma/client";

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
import { assertJtiAvailable, consumeJti } from "@/lib/games/token-consume";
import {
  findCatalogPokemonById,
  getCatalogPokemon,
} from "@/lib/pokemon/data";
import { getTrainingQuizPokemon } from "@/lib/pokemon/training-pool";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { toRankedMode } from "@/lib/ranked/mode";
import {
  createRankedRound,
  getActiveRankedRound,
  recordRankedGuess,
  updateRankedRoundProgress,
} from "@/lib/ranked/round-service";

function choiceModeToRanked(mode: ChoiceQuizMode): RankedMode {
  const ranked = toRankedMode(mode);
  if (!ranked) throw new Error(`Mode non classé: ${mode}`);
  return ranked;
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
  extras: {
    userId?: string;
    ranked?: boolean;
    matchId?: string;
    roundId?: string;
    jti?: string;
    maxAttempts?: number;
  },
): ChoiceQuizStartResult {
  const choiceIds = choices.map((pokemon) => pokemon.id);
  const token = createChoiceQuizToken({
    targetId: target.id,
    choiceIds,
    mode,
    pool,
    userId: extras.userId,
    ranked: extras.ranked,
    matchId: extras.matchId,
    roundId: extras.roundId,
    jti: extras.jti,
    maxAttempts: extras.maxAttempts,
    wrongAttempts: 0,
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
  matchId?: string,
): Promise<ChoiceQuizStartResult | { error: string; status: number }> {
  const normalized = normalizeQuizPool(pool);
  if (normalized === "training" && !userId) {
    return { error: "Connexion requise pour l'entraînement.", status: 401 };
  }

  if (matchId && !userId) {
    return { error: "Connexion requise pour le mode classé.", status: 401 };
  }

  const target = await (async () => {
    if (normalized === "training") {
      if (!userId) return null;
      const training = await getTrainingQuizPokemon(userId);
      if (training.length === 0) return null;
      return pickRandom(training);
    }
    return pickRandom(getCatalogPokemon());
  })();

  if (!target) {
    return {
      error:
        "Ta liste d'entraînement est vide. Ajoute des Pokémon dans ton profil.",
      status: 400,
    };
  }

  const catalog = getCatalogPokemon();
  const choices = buildQuizChoices(target, catalog);

  if (matchId && userId) {
    const ranked = await createRankedRound({
      matchId,
      userId,
      mode: choiceModeToRanked(mode),
      targetPokemonId: target.id,
    });
    if ("error" in ranked) return ranked;

    return buildStartResult(mode, normalized, target, choices, {
      userId,
      ranked: true,
      matchId: ranked.context.matchId,
      roundId: ranked.context.roundId,
      jti: ranked.context.jti,
      maxAttempts: ranked.context.maxAttempts,
    });
  }

  return buildStartResult(mode, normalized, target, choices, {
    userId: normalized === "training" ? userId : undefined,
  });
}

export async function answerChoiceQuizRound(
  token: string,
  choiceIndex: number,
): Promise<ChoiceQuizAnswerResult> {
  const payload = verifyChoiceQuizToken(token);
  if (!payload) {
    return {
      status: "invalid_token",
      message: "Manche expirée ou invalide. Relance une nouvelle manche.",
    };
  }

  const jtiCheck = await assertJtiAvailable(payload.jti);
  if ("error" in jtiCheck) {
    return { status: "invalid_token", message: jtiCheck.error };
  }

  if (payload.ranked && payload.roundId && payload.matchId) {
    const round = await getActiveRankedRound({
      roundId: payload.roundId,
      matchId: payload.matchId,
      jti: payload.jti,
    });
    if (!round || round.status !== "ACTIVE") {
      return {
        status: "invalid_token",
        message: "Manche classée invalide ou terminée.",
      };
    }
    const rate = await recordRankedGuess({ roundId: round.id });
    if ("error" in rate) {
      return { status: "invalid_token", message: rate.error };
    }
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

  await consumeJti(payload.jti, payload.exp);

  const correctIndex = payload.choiceIds.findIndex((id) => id === target.id);

  if (chosen.id === target.id) {
    if (payload.ranked && payload.roundId) {
      await updateRankedRoundProgress({
        roundId: payload.roundId,
        wrongAttempts: payload.wrongAttempts,
        status: "CORRECT",
      });
    }
    return {
      status: "correct",
      reveal: toReveal(target),
      correctIndex,
      roundFailed: false,
    };
  }

  if (payload.ranked && payload.roundId) {
    await updateRankedRoundProgress({
      roundId: payload.roundId,
      wrongAttempts: payload.wrongAttempts + 1,
      status: "FAILED",
    });
  }

  // QCM: wrong ends the round — reveal correctIndex only after consumption
  return {
    status: "wrong",
    reveal: toReveal(chosen),
    targetReveal: toReveal(target),
    correctIndex,
    roundFailed: true,
  };
}

export async function skipChoiceQuizRound(
  token: string,
): Promise<ChoiceQuizSkipResult> {
  const payload = verifyChoiceQuizToken(token);
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

  const jtiCheck = await assertJtiAvailable(payload.jti);
  if ("error" in jtiCheck) {
    return { status: "invalid_token", message: jtiCheck.error };
  }

  const target = findCatalogPokemonById(payload.targetId);
  if (!target) {
    return {
      status: "invalid_token",
      message: "Impossible de charger la manche.",
    };
  }

  await consumeJti(payload.jti, payload.exp);
  const correctIndex = payload.choiceIds.findIndex((id) => id === target.id);

  return { status: "ok", reveal: toReveal(target), correctIndex };
}
