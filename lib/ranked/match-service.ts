import type { RankedEndReason, RankedMode, RankedMatchStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { ARENA_RANKED_MODES } from "@/lib/games/ranked-limits";
import { formatPlayerLabel } from "@/lib/profile/display-name";
import {
  computeWinStreakFromRounds,
  expireActiveRounds,
} from "@/lib/ranked/round-service";

export interface FinishRankedMatchInput {
  matchId: string;
  userId: string;
  durationMs?: number | null;
  endedReason: RankedEndReason;
  status: "FINISHED" | "ABANDONED";
}

export async function finishRankedMatch(input: FinishRankedMatchInput) {
  const match = await prisma.rankedMatch.findUnique({
    where: { id: input.matchId },
  });

  if (!match || match.userId !== input.userId) {
    return { error: "Partie introuvable.", status: 404 as const };
  }

  if (match.status !== "IN_PROGRESS") {
    return { error: "Partie deja finalisee.", status: 409 as const };
  }

  await expireActiveRounds(match.id);

  const rounds = await prisma.rankedRound.findMany({
    where: { matchId: match.id },
    select: { status: true, roundIndex: true },
    orderBy: { roundIndex: "asc" },
  });

  const { winStreak, totalRounds, correctCount } =
    computeWinStreakFromRounds(rounds);
  const durationMs = input.durationMs ? Math.max(1, Math.floor(input.durationMs)) : null;

  const entry = await prisma.leaderboardEntry.upsert({
    where: {
      userId_mode: {
        userId: input.userId,
        mode: match.mode,
      },
    },
    update: {},
    create: {
      userId: input.userId,
      mode: match.mode,
      bestWinStreak: 0,
    },
  });

  const isNewRecord = winStreak > entry.bestWinStreak;

  const [updatedMatch, updatedEntry] = await prisma.$transaction([
    prisma.rankedMatch.update({
      where: { id: match.id },
      data: {
        status: input.status,
        winStreak,
        endedReason: input.endedReason,
        totalRounds,
        correctCount,
        durationMs,
        finishedAt: new Date(),
      },
      select: {
        id: true,
        mode: true,
        winStreak: true,
        status: true,
        endedReason: true,
        totalRounds: true,
        correctCount: true,
        finishedAt: true,
      },
    }),
    prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: isNewRecord ? { bestWinStreak: winStreak } : {},
      select: {
        bestWinStreak: true,
      },
    }),
  ]);

  return {
    match: updatedMatch,
    leaderboard: updatedEntry,
    isNewRecord,
    previousBest: entry.bestWinStreak,
  };
}

const leaderboardUserSelect = {
  id: true,
  name: true,
  image: true,
  profile: {
    select: {
      pseudo: true,
      publicId: true,
    },
  },
} as const;

export type LeaderboardUser = {
  id: string;
  name: string | null;
  image: string | null;
  profile: {
    pseudo: string | null;
    publicId: string | null;
  } | null;
};

export type LeaderboardRunRow = {
  matchId: string;
  userId: string;
  winStreak: number;
  finishedAt: Date;
  user: LeaderboardUser;
};

function rankedRunWhere(mode?: RankedMode) {
  const finishedStatuses: RankedMatchStatus[] = ["FINISHED", "ABANDONED"];

  return {
    ...(mode ? { mode } : {}),
    status: { in: finishedStatuses },
    winStreak: { gt: 0 },
  };
}

export async function getLeaderboardTopForMode(mode: RankedMode) {
  const top = await prisma.rankedMatch.findFirst({
    where: rankedRunWhere(mode),
    orderBy: [{ winStreak: "desc" }, { finishedAt: "asc" }],
    include: {
      user: {
        select: {
          name: true,
          profile: { select: { pseudo: true, publicId: true } },
        },
      },
    },
  });

  if (!top || (top.winStreak ?? 0) <= 0) {
    return { topStreak: 0, topPlayerName: null as string | null };
  }

  return {
    topStreak: top.winStreak ?? 0,
    topPlayerName: formatPlayerLabel({
      pseudo: top.user.profile?.pseudo,
      publicId: top.user.profile?.publicId,
      fallbackName: top.user.name ?? "Dresseur inconnu",
    }),
  };
}

export async function getPlayerBestStreak(userId: string, mode: RankedMode) {
  const aggregate = await prisma.rankedMatch.aggregate({
    where: {
      userId,
      mode,
      status: { in: ["FINISHED", "ABANDONED"] },
      winStreak: { gt: 0 },
    },
    _max: { winStreak: true },
  });

  return aggregate._max.winStreak ?? 0;
}

export type PlayerRankedScore = {
  mode: RankedMode;
  bestWinStreak: number;
};

export type PlayerRankedScoreDetail = PlayerRankedScore & {
  bestTopRank: number | null;
};

async function getPlayerBestTopRankInMode(
  userId: string,
  mode: RankedMode,
  topLimit: number,
): Promise<number | null> {
  const runs = await prisma.rankedMatch.findMany({
    where: rankedRunWhere(mode),
    select: { userId: true },
    orderBy: [{ winStreak: "desc" }, { finishedAt: "asc" }],
  });

  const ranksInTop = runs
    .map((run, index) => ({ userId: run.userId, rank: index + 1 }))
    .filter((run) => run.userId === userId && run.rank <= topLimit)
    .map((run) => run.rank);

  return ranksInTop.length > 0 ? Math.min(...ranksInTop) : null;
}

export async function getPlayerRankedScores(
  userId: string,
): Promise<PlayerRankedScore[]> {
  const grouped = await prisma.rankedMatch.groupBy({
    by: ["mode"],
    where: {
      userId,
      status: { in: ["FINISHED", "ABANDONED"] },
      winStreak: { gt: 0 },
    },
    _max: { winStreak: true },
  });

  const streakByMode = new Map(
    grouped.map((row) => [row.mode, row._max.winStreak ?? 0]),
  );

  return ARENA_RANKED_MODES.map((mode) => ({
    mode,
    bestWinStreak: streakByMode.get(mode) ?? 0,
  }));
}

export async function getPlayerRankedScoreDetails(
  userId: string,
  topLimit = 20,
): Promise<PlayerRankedScoreDetail[]> {
  const [scores, topRanks] = await Promise.all([
    getPlayerRankedScores(userId),
    Promise.all(
      ARENA_RANKED_MODES.map(async (mode) => ({
        mode,
        bestTopRank: await getPlayerBestTopRankInMode(userId, mode, topLimit),
      })),
    ),
  ]);

  const topRankByMode = new Map(
    topRanks.map((entry) => [entry.mode, entry.bestTopRank]),
  );

  return scores.map((score) => ({
    ...score,
    bestTopRank: topRankByMode.get(score.mode) ?? null,
  }));
}

/** Top N parties classées (un joueur peut apparaître plusieurs fois). */
export async function getLeaderboardPage(input: {
  mode?: RankedMode;
  page: number;
  pageSize: number;
}) {
  const where = rankedRunWhere(input.mode);

  const [total, matches] = await Promise.all([
    prisma.rankedMatch.count({ where }),
    prisma.rankedMatch.findMany({
      where,
      select: {
        id: true,
        userId: true,
        winStreak: true,
        finishedAt: true,
        user: {
          select: leaderboardUserSelect,
        },
      },
      orderBy: [{ winStreak: "desc" }, { finishedAt: "asc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  const entries: LeaderboardRunRow[] = matches.map((match) => ({
    matchId: match.id,
    userId: match.userId,
    winStreak: match.winStreak ?? 0,
    finishedAt: match.finishedAt ?? new Date(0),
    user: match.user,
  }));

  return { total, entries };
}

export async function getSelfLeaderboardStats(
  userId: string,
  input: {
    mode: RankedMode;
    topLimit?: number;
  },
) {
  const runs = await prisma.rankedMatch.findMany({
    where: rankedRunWhere(input.mode),
    select: {
      id: true,
      userId: true,
      winStreak: true,
    },
    orderBy: [{ winStreak: "desc" }, { finishedAt: "asc" }],
  });

  const userRuns = runs
    .map((run, index) => ({
      matchId: run.id,
      rank: index + 1,
      winStreak: run.winStreak ?? 0,
      userId: run.userId,
    }))
    .filter((run) => run.userId === userId);

  if (userRuns.length === 0) {
    return null;
  }

  const topLimit = input.topLimit ?? 20;
  const entriesInTop = userRuns.filter((run) => run.rank <= topLimit).length;
  const bestPlacedRun = userRuns.reduce((best, run) =>
    run.rank < best.rank ? run : best,
  );

  return {
    bestRank: bestPlacedRun.rank,
    winStreak: bestPlacedRun.winStreak,
    bestWinStreak: Math.max(...userRuns.map((run) => run.winStreak)),
    matchId: bestPlacedRun.matchId,
    entriesInTop,
    inTop: entriesInTop > 0,
  };
}
