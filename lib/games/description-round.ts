import { censorPokemonNameInText } from "@/lib/pokemon/censor";
import {
  createDescriptionToken,
  verifyDescriptionToken,
  type DescriptionPayload,
} from "@/lib/games/description-token";
import type {
  DescriptionGuessResult,
  DescriptionSkipResult,
  DescriptionStartResult,
} from "@/lib/games/description-types";
import {
  proxyArtworkUrl,
  proxySpriteUrl,
} from "@/lib/games/media-token";
import { pickRandom } from "@/lib/games/random";
import { createTokenJti } from "@/lib/games/token-crypto";
import {
  assertJtiAvailable,
  consumeJti,
  rotateRankedRoundJti,
} from "@/lib/games/token-consume";
import {
  findCatalogPokemonById,
  getCatalogPokemon,
  getFrenchIndex,
} from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import {
  createRankedRound,
  getActiveRankedRound,
  recordRankedGuess,
  updateRankedRoundProgress,
} from "@/lib/ranked/round-service";

const EXTRA_DESCRIPTION_EVERY = 3;

export type {
  DescriptionGuessResult,
  DescriptionSkipResult,
  DescriptionStartResult,
} from "@/lib/games/description-types";

function pickRandomWithDescription(): QuizPokemon {
  const withDescription = getCatalogPokemon().filter(
    (pokemon) => pokemon.descriptionsFr.length > 0,
  );
  return pickRandom(withDescription);
}

function visibleDescriptionCount(
  wrongAttempts: number,
  total: number,
): number {
  const unlocked = 1 + Math.floor(wrongAttempts / EXTRA_DESCRIPTION_EVERY);
  return Math.min(unlocked, total);
}

function getVisibleDescriptions(
  target: QuizPokemon,
  wrongAttempts: number,
  solved: boolean,
): string[] {
  const count = solved
    ? target.descriptionsFr.length
    : visibleDescriptionCount(wrongAttempts, target.descriptionsFr.length);

  return target.descriptionsFr.slice(0, count).map((description) =>
    solved
      ? description
      : censorPokemonNameInText(description, target.nameFr),
  );
}

function reissueDescriptionToken(
  payload: DescriptionPayload,
  wrongAttempts: number,
  jti: string,
): string {
  return createDescriptionToken({
    targetId: payload.targetId,
    ranked: payload.ranked,
    matchId: payload.matchId,
    roundId: payload.roundId,
    jti,
    wrongAttempts,
    maxAttempts: payload.maxAttempts,
  });
}

export async function startDescriptionRound(input?: {
  userId?: string;
  matchId?: string;
}): Promise<DescriptionStartResult | { error: string; status: number }> {
  const target = pickRandomWithDescription();

  if (input?.matchId) {
    if (!input.userId) {
      return { error: "Connexion requise pour le mode classé.", status: 401 };
    }
    const ranked = await createRankedRound({
      matchId: input.matchId,
      userId: input.userId,
      mode: "DESCRIPTION_GUESS",
      targetPokemonId: target.id,
    });
    if ("error" in ranked) return ranked;

    return {
      token: createDescriptionToken({
        targetId: target.id,
        ranked: true,
        matchId: ranked.context.matchId,
        roundId: ranked.context.roundId,
        jti: ranked.context.jti,
        maxAttempts: ranked.context.maxAttempts,
        wrongAttempts: 0,
      }),
      totalDescriptions: target.descriptionsFr.length,
      visibleDescriptions: getVisibleDescriptions(target, 0, false),
    };
  }

  return {
    token: createDescriptionToken({ targetId: target.id }),
    totalDescriptions: target.descriptionsFr.length,
    visibleDescriptions: getVisibleDescriptions(target, 0, false),
  };
}

export async function guessDescriptionRound(
  token: string,
  answer: string,
): Promise<DescriptionGuessResult> {
  const payload = verifyDescriptionToken(token);
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
  if (!target || target.descriptionsFr.length === 0) {
    return {
      status: "invalid_token",
      message: "Impossible de charger la manche.",
    };
  }

  const wrongAttempts = payload.wrongAttempts;

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

  const guessed = findCatalogPokemonById(indexed.id);
  if (!guessed) {
    return {
      status: "not_found",
      message: "Impossible de charger les données de ce Pokémon.",
    };
  }

  if (guessed.id === target.id) {
    await consumeJti(payload.jti, payload.exp);
    if (payload.ranked && payload.roundId) {
      await updateRankedRoundProgress({
        roundId: payload.roundId,
        wrongAttempts,
        status: "CORRECT",
      });
    }
    return {
      status: "correct",
      nameFr: target.nameFr,
      artworkUrl: proxyArtworkUrl(target.id),
      visibleDescriptions: getVisibleDescriptions(target, wrongAttempts, true),
      roundFailed: false,
    };
  }

  const previousVisible = visibleDescriptionCount(
    wrongAttempts,
    target.descriptionsFr.length,
  );
  const nextAttempts = wrongAttempts + 1;
  const nextVisible = visibleDescriptionCount(
    nextAttempts,
    target.descriptionsFr.length,
  );
  const roundFailed = nextAttempts >= payload.maxAttempts;

  await consumeJti(payload.jti, payload.exp);

  if (roundFailed) {
    if (payload.ranked && payload.roundId) {
      await updateRankedRoundProgress({
        roundId: payload.roundId,
        wrongAttempts: nextAttempts,
        status: "FAILED",
      });
    }
    return {
      status: "wrong",
      wrongGuess: {
        id: guessed.id,
        nameFr: guessed.nameFr,
        spriteUrl: proxySpriteUrl(guessed.id),
      },
      visibleDescriptions: getVisibleDescriptions(target, nextAttempts, true),
      unlockedNewDescription: nextVisible > previousVisible,
      roundFailed: true,
      nameFr: target.nameFr,
      artworkUrl: proxyArtworkUrl(target.id),
    };
  }

  const nextJti = createTokenJti();
  if (payload.ranked && payload.roundId) {
    await rotateRankedRoundJti({
      roundId: payload.roundId,
      nextJti,
      wrongAttempts: nextAttempts,
    });
  }

  return {
    status: "wrong",
    wrongGuess: {
      id: guessed.id,
      nameFr: guessed.nameFr,
      spriteUrl: proxySpriteUrl(guessed.id),
    },
    visibleDescriptions: getVisibleDescriptions(target, nextAttempts, false),
    unlockedNewDescription: nextVisible > previousVisible,
    roundFailed: false,
    nextToken: reissueDescriptionToken(payload, nextAttempts, nextJti),
    wrongAttempts: nextAttempts,
  };
}

export async function skipDescriptionRound(
  token: string,
): Promise<DescriptionSkipResult> {
  const payload = verifyDescriptionToken(token);
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

  return {
    status: "ok",
    nameFr: target.nameFr,
    artworkUrl: proxyArtworkUrl(target.id),
    visibleDescriptions: getVisibleDescriptions(
      target,
      payload.wrongAttempts,
      true,
    ),
  };
}

export function getDescriptionState(
  token: string,
): { visibleDescriptions: string[]; totalDescriptions: number } | null {
  const payload = verifyDescriptionToken(token);
  if (!payload) return null;

  const target = findCatalogPokemonById(payload.targetId);
  if (!target) return null;

  return {
    visibleDescriptions: getVisibleDescriptions(
      target,
      payload.wrongAttempts,
      false,
    ),
    totalDescriptions: target.descriptionsFr.length,
  };
}
