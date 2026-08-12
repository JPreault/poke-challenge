import type { RankedMode, RankedRound, RankedRoundStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { createTokenJti } from "@/lib/games/token-crypto";
import { getRankedAttemptLimit } from "@/lib/games/ranked-limits";
import { isUniqueViolation } from "@/lib/games/token-consume";
import { ARENA_SHUFFLE_ROUND_TYPES } from "@/lib/games/types";
import { toGameMode, toRankedMode } from "@/lib/ranked/mode";

/** Max guesses allowed for an entire ranked match (anti-spam). */
const MAX_GUESSES_PER_MATCH = 60;

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

export type CommitRankedGuessInput = {
  roundId: string;
  matchId: string;
  jti: string;
  expMs: number;
  nextWrongAttempts: number;
  nextStatus: RankedRoundStatus;
  /** When continuing an active round (multi-attempt), rotate to a new JTI. */
  nextJti?: string;
};

/**
 * Atomically: consume JTI, increment match guess count (rate limit),
 * and update the round — all in one transaction.
 */
export async function commitRankedGuess(
  input: CommitRankedGuessInput,
): Promise<{ ok: true } | { error: string; status: number }> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.consumedGameJti.create({
        data: {
          jti: input.jti,
          expiresAt: new Date(Math.max(input.expMs, Date.now() + 60_000)),
        },
      });

      const match = await tx.rankedMatch.findUnique({
        where: { id: input.matchId },
        select: { id: true, status: true, guessCount: true },
      });

      if (!match || match.status !== "IN_PROGRESS") {
        throw new CommitRankedGuessError(
          "Partie déjà finalisée.",
          409,
        );
      }

      if (match.guessCount >= MAX_GUESSES_PER_MATCH) {
        throw new CommitRankedGuessError(
          "Trop de tentatives. Ralentis.",
          429,
        );
      }

      await tx.rankedMatch.update({
        where: { id: input.matchId },
        data: { guessCount: { increment: 1 } },
      });

      const finished =
        input.nextStatus === "CORRECT" || input.nextStatus === "FAILED";

      const updated = await tx.rankedRound.updateMany({
        where: {
          id: input.roundId,
          matchId: input.matchId,
          status: "ACTIVE",
          tokenJti: input.jti,
        },
        data: {
          wrongAttempts: input.nextWrongAttempts,
          status: input.nextStatus,
          guessCount: { increment: 1 },
          ...(finished ? { finishedAt: new Date() } : {}),
          ...(input.nextJti ? { tokenJti: input.nextJti } : {}),
        },
      });

      if (updated.count === 0) {
        throw new CommitRankedGuessError(
          "Manche invalide ou terminée.",
          409,
        );
      }
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof CommitRankedGuessError) {
      return { error: error.message, status: error.status };
    }
    if (isUniqueViolation(error)) {
      return { error: "Manche déjà utilisée.", status: 409 };
    }
    throw error;
  }
}

class CommitRankedGuessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CommitRankedGuessError";
    this.status = status;
  }
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
