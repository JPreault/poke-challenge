import type { RankedEndReason, RankedMode } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { formatPlayerLabel } from "@/lib/profile/display-name";
import { getActiveSeason } from "@/lib/ranked/season";

export interface FinishRankedMatchInput {
  matchId: string;
  userId: string;
  winStreak: number;
  totalRounds: number;
  correctCount: number;
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

  const totalRounds = Math.max(0, Math.floor(input.totalRounds));
  const correctCount = Math.max(0, Math.min(totalRounds, Math.floor(input.correctCount)));
  const winStreak = Math.max(0, Math.floor(input.winStreak));
  const durationMs = input.durationMs ? Math.max(1, Math.floor(input.durationMs)) : null;

  const entry = await prisma.leaderboardEntry.upsert({
    where: {
      userId_seasonId_mode: {
        userId: input.userId,
        seasonId: match.seasonId,
        mode: match.mode,
      },
    },
    update: {},
    create: {
      userId: input.userId,
      seasonId: match.seasonId,
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

function rankedRunWhere(input: { seasonId: string; mode?: RankedMode }) {
  return {
    seasonId: input.seasonId,
    ...(input.mode ? { mode: input.mode } : {}),
    status: { in: ["FINISHED", "ABANDONED"] as const },
    winStreak: { gt: 0 },
  };
}

export async function getLeaderboardTopForMode(
  mode: RankedMode,
  seasonId?: string,
) {
  const season =
    seasonId != null
      ? await prisma.season.findUnique({ where: { id: seasonId } })
      : await getActiveSeason();

  if (!season) {
    return { topStreak: 0, topPlayerName: null as string | null };
  }

  const top = await prisma.rankedMatch.findFirst({
    where: rankedRunWhere({ seasonId: season.id, mode }),
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
    return { topStreak: 0, topPlayerName: null };
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

export async function getPlayerBestStreak(
  userId: string,
  mode: RankedMode,
  seasonId: string,
) {
  const aggregate = await prisma.rankedMatch.aggregate({
    where: {
      userId,
      seasonId,
      mode,
      status: { in: ["FINISHED", "ABANDONED"] },
      winStreak: { gt: 0 },
    },
    _max: { winStreak: true },
  });

  return aggregate._max.winStreak ?? 0;
}

/** Top N parties classées (un joueur peut apparaître plusieurs fois). */
export async function getLeaderboardPage(input: {
  seasonId: string;
  mode?: RankedMode;
  page: number;
  pageSize: number;
}) {
  const where = rankedRunWhere(input);

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
    seasonId: string;
    mode: RankedMode;
    topLimit?: number;
  },
) {
  const runs = await prisma.rankedMatch.findMany({
    where: rankedRunWhere({ seasonId: input.seasonId, mode: input.mode }),
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
