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
      gamesCount: 0,
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
      data: {
        gamesCount: { increment: 1 },
        ...(isNewRecord ? { bestWinStreak: winStreak } : {}),
      },
      select: {
        bestWinStreak: true,
        gamesCount: true,
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

  const top = await prisma.leaderboardEntry.findFirst({
    where: { seasonId: season.id, mode },
    orderBy: [{ bestWinStreak: "desc" }, { updatedAt: "asc" }],
    include: {
      user: {
        select: {
          name: true,
          profile: { select: { pseudo: true, publicId: true } },
        },
      },
    },
  });

  if (!top || top.bestWinStreak <= 0) {
    return { topStreak: 0, topPlayerName: null };
  }

  return {
    topStreak: top.bestWinStreak,
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
  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      userId_seasonId_mode: { userId, seasonId, mode },
    },
    select: { bestWinStreak: true },
  });
  return entry?.bestWinStreak ?? 0;
}

type LeaderboardEntryRow = {
  userId: string;
  bestWinStreak: number;
  updatedAt: Date;
};

function dedupeLeaderboardEntries<T extends LeaderboardEntryRow>(
  entries: T[],
): T[] {
  const bestByUser = new Map<string, T>();

  for (const entry of entries) {
    const existing = bestByUser.get(entry.userId);
    if (
      !existing ||
      entry.bestWinStreak > existing.bestWinStreak ||
      (entry.bestWinStreak === existing.bestWinStreak &&
        entry.updatedAt < existing.updatedAt)
    ) {
      bestByUser.set(entry.userId, entry);
    }
  }

  return [...bestByUser.values()].sort(
    (a, b) =>
      b.bestWinStreak - a.bestWinStreak ||
      a.updatedAt.getTime() - b.updatedAt.getTime(),
  );
}

export async function getLeaderboardPage(input: {
  seasonId: string;
  mode?: RankedMode;
  page: number;
  pageSize: number;
}) {
  const where = {
    seasonId: input.seasonId,
    ...(input.mode ? { mode: input.mode } : {}),
    bestWinStreak: { gt: 0 },
  };

  const allEntries = await prisma.leaderboardEntry.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          profile: {
            select: {
              pseudo: true,
              publicId: true,
            },
          },
        },
      },
    },
    orderBy: [{ bestWinStreak: "desc" }, { updatedAt: "asc" }],
  });

  const deduped = dedupeLeaderboardEntries(allEntries);
  const total = deduped.length;
  const pageEntries = deduped.slice(
    (input.page - 1) * input.pageSize,
    input.page * input.pageSize,
  );

  return { total, entries: pageEntries, deduped };
}

export function getLeaderboardRankForUser(
  deduped: LeaderboardEntryRow[],
  userId: string,
): number {
  const index = deduped.findIndex((entry) => entry.userId === userId);
  return index >= 0 ? index + 1 : 0;
}
