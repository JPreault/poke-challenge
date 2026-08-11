import { RankedMode } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ARENA_RANKED_MODES } from "@/lib/games/ranked-limits";
import { getRankedModeLabel } from "@/lib/games/ranked-limits";
import {
  getLeaderboardPage,
  getSelfLeaderboardStats,
} from "@/lib/ranked/match-service";
import { getActiveSeason } from "@/lib/ranked/season";
import { formatPlayerLabel } from "@/lib/profile/display-name";

const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get("mode");
  const seasonParam = searchParams.get("season");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)),
  );

  const mode =
    modeParam && ARENA_RANKED_MODES.includes(modeParam as RankedMode)
      ? (modeParam as RankedMode)
      : undefined;

  const season = seasonParam
    ? await prisma.season.findUnique({ where: { slug: seasonParam } })
    : await getActiveSeason();

  if (!season) {
    return NextResponse.json({ entries: [], page, pageSize, total: 0 });
  }

  const [{ total, entries }, session] = await Promise.all([
    getLeaderboardPage({
      seasonId: season.id,
      mode,
      page,
      pageSize,
    }),
    getRequiredSession(),
  ]);

  let selfEntry: {
    bestRank: number;
    winStreak: number;
    bestWinStreak: number;
    matchId: string;
    entriesInTop: number;
    inTop: boolean;
    userName: string;
  } | null = null;

  if (session && mode) {
    const stats = await getSelfLeaderboardStats(session.user.id, {
      seasonId: season.id,
      mode,
      topLimit: pageSize,
    });

    if (stats) {
      selfEntry = {
        ...stats,
        userName: formatPlayerLabel({
          pseudo: session.user.pseudo,
          publicId: session.user.publicId,
          fallbackName: session.user.name ?? "Dresseur inconnu",
        }),
      };
    }
  }

  return NextResponse.json({
    season: {
      id: season.id,
      slug: season.slug,
      name: season.name,
      startsAt: season.startsAt,
      endsAt: season.endsAt,
      isActive: season.isActive,
    },
    mode: mode ?? null,
    modeLabel: mode ? getRankedModeLabel(mode) : null,
    page,
    pageSize,
    total,
    entries: entries.map((entry, idx) => ({
      rank: (page - 1) * pageSize + idx + 1,
      matchId: entry.matchId,
      userId: entry.userId,
      userName: formatPlayerLabel({
        pseudo: entry.user.profile?.pseudo,
        publicId: entry.user.profile?.publicId,
        fallbackName: entry.user.name ?? "Dresseur inconnu",
      }),
      userImage: entry.user.image,
      winStreak: entry.winStreak,
      finishedAt: entry.finishedAt,
    })),
    self: selfEntry,
  });
}
