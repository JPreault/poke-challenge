import { RankedMode } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ARENA_RANKED_MODES } from "@/lib/games/ranked-limits";
import { getRankedModeLabel } from "@/lib/games/ranked-limits";
import {
  getLeaderboardPage,
  getLeaderboardRankForUser,
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

  const [{ total, entries, deduped }, session] = await Promise.all([
    getLeaderboardPage({
      seasonId: season.id,
      mode,
      page,
      pageSize,
    }),
    getRequiredSession(),
  ]);

  let selfEntry: {
    rank: number;
    bestWinStreak: number;
  } | null = null;

  if (session && mode) {
    const userEntry = deduped.find((entry) => entry.userId === session.user.id);
    if (userEntry) {
      selfEntry = {
        rank: getLeaderboardRankForUser(deduped, session.user.id),
        bestWinStreak: userEntry.bestWinStreak,
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
      userId: entry.userId,
      userName: formatPlayerLabel({
        pseudo: entry.user.profile?.pseudo,
        publicId: entry.user.profile?.publicId,
        fallbackName: entry.user.name ?? "Dresseur inconnu",
      }),
      userImage: entry.user.image,
      bestWinStreak: entry.bestWinStreak,
      updatedAt: entry.updatedAt,
    })),
    self: selfEntry,
  });
}
