import type { RankedMode, RankedRound, RankedRoundStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { createTokenJti } from "@/lib/games/token-crypto";
import { getRankedAttemptLimit } from "@/lib/games/ranked-limits";
import { ARENA_SHUFFLE_ROUND_TYPES } from "@/lib/games/types";
import { toGameMode, toRankedMode } from "@/lib/ranked/mode";

const MAX_GUESSES_PER_MATCH_PER_MINUTE = 30;

const SHUFFLE_ROUND_MODES = new Set<RankedMode>(
  ARENA_SHUFFLE_ROUND_TYPES.map((type) => toRankedMode(type)!),
);

function isShuffleSubMode(mode: RankedMode): boolean {
  return SHUFFLE_ROUND_MODES.has(mode);
}

export type RankedRoundContext = {
  matchId: string;
  roundId: string;
  jti: string;
  maxAttempts: number;
  ranked: true;
};

export async function assertActiveRankedMatch(input: {
  matchId: string;
  userId: string;
  mode: RankedMode;
}) {
  const match = await prisma.rankedMatch.findUnique({
    where: { id: input.matchId },
  });

  if (!match || match.userId !== input.userId) {
    return { error: "Partie introuvable.", status: 404 as const };
  }
  if (match.status !== "IN_PROGRESS") {
    return { error: "Partie déjà finalisée.", status: 409 as const };
  }
  if (match.mode !== input.mode) {
    const shuffleSubMode =
      match.mode === "SHUFFLE" && isShuffleSubMode(input.mode);
    if (!shuffleSubMode) {
      return { error: "Mode incompatible avec la partie.", status: 400 as const };
    }
  }

  return { match };
}

export async function createRankedRound(input: {
  matchId: string;
  userId: string;
  mode: RankedMode;
  targetPokemonId: number;
}): Promise<
  | { error: string; status: number }
  | { round: RankedRound; context: RankedRoundContext }
> {
  const matchResult = await assertActiveRankedMatch(input);
  if ("error" in matchResult && matchResult.error) {
    return { error: matchResult.error, status: matchResult.status };
  }

  const active = await prisma.rankedRound.findFirst({
    where: { matchId: input.matchId, status: "ACTIVE" },
  });
  if (active) {
    return {
      error: "Une manche est déjà en cours pour cette partie.",
      status: 409,
    };
  }

  const gameMode = toGameMode(input.mode);
  const maxAttempts = getRankedAttemptLimit(gameMode) ?? 1;
  const roundIndex = await prisma.rankedRound.count({
    where: { matchId: input.matchId },
  });
  const jti = createTokenJti();

  const round = await prisma.rankedRound.create({
    data: {
      matchId: input.matchId,
      roundIndex,
      mode: input.mode,
      tokenJti: jti,
      status: "ACTIVE",
      wrongAttempts: 0,
      maxAttempts,
      targetPokemonId: input.targetPokemonId,
    },
  });

  return {
    round,
    context: {
      matchId: input.matchId,
      roundId: round.id,
      jti,
      maxAttempts,
      ranked: true,
    },
  };
}

export async function getActiveRankedRound(input: {
  roundId: string;
  matchId: string;
  jti: string;
}): Promise<RankedRound | null> {
  const round = await prisma.rankedRound.findUnique({
    where: { id: input.roundId },
  });
  if (!round) return null;
  if (round.matchId !== input.matchId) return null;
  if (round.tokenJti !== input.jti) return null;
  return round;
}

export async function recordRankedGuess(input: {
  roundId: string;
}): Promise<{ error: string; status: number } | { ok: true }> {
  const round = await prisma.rankedRound.findUnique({
    where: { id: input.roundId },
  });
  if (!round || round.status !== "ACTIVE") {
    return { error: "Manche invalide ou terminée.", status: 409 };
  }

  const since = new Date(Date.now() - 60_000);
  const recentGuesses = await prisma.rankedRound.aggregate({
    where: {
      matchId: round.matchId,
      updatedAt: { gte: since },
    },
    _sum: { guessCount: true },
  });

  const guessTotal = recentGuesses._sum.guessCount ?? 0;
  if (guessTotal >= MAX_GUESSES_PER_MATCH_PER_MINUTE) {
    return { error: "Trop de tentatives. Ralentis.", status: 429 };
  }

  await prisma.rankedRound.update({
    where: { id: round.id },
    data: { guessCount: { increment: 1 } },
  });

  return { ok: true };
}

export async function updateRankedRoundProgress(input: {
  roundId: string;
  wrongAttempts: number;
  status?: RankedRoundStatus;
}): Promise<RankedRound | null> {
  const round = await prisma.rankedRound.findUnique({
    where: { id: input.roundId },
  });
  if (!round || round.status !== "ACTIVE") return null;

  return prisma.rankedRound.update({
    where: { id: input.roundId },
    data: {
      wrongAttempts: input.wrongAttempts,
      ...(input.status
        ? {
            status: input.status,
            finishedAt: input.status === "ACTIVE" ? null : new Date(),
          }
        : {}),
    },
  });
}

export function computeWinStreakFromRounds(
  rounds: Array<{ status: RankedRoundStatus; roundIndex: number }>,
): { winStreak: number; totalRounds: number; correctCount: number } {
  const ordered = [...rounds].sort((a, b) => a.roundIndex - b.roundIndex);
  let winStreak = 0;
  for (const round of ordered) {
    if (round.status === "CORRECT") {
      winStreak += 1;
      continue;
    }
    if (round.status === "FAILED") {
      break;
    }
    // ACTIVE/EXPIRED at end of abandon: stop counting further
    if (round.status === "ACTIVE" || round.status === "EXPIRED") {
      break;
    }
  }

  const finished = ordered.filter(
    (round) => round.status === "CORRECT" || round.status === "FAILED",
  );
  const correctCount = ordered.filter((round) => round.status === "CORRECT").length;

  return {
    winStreak,
    totalRounds: finished.length,
    correctCount,
  };
}

export async function expireActiveRounds(matchId: string) {
  await prisma.rankedRound.updateMany({
    where: { matchId, status: "ACTIVE" },
    data: { status: "EXPIRED", finishedAt: new Date() },
  });
}
