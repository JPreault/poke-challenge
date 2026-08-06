import { RankedMode } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatPlayerLabel } from "@/lib/profile/display-name";

const DEFAULT_PAGE_SIZE = 25;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get("mode");
  const seasonParam = searchParams.get("season");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)));

  const mode =
    modeParam && Object.values(RankedMode).includes(modeParam as RankedMode)
      ? (modeParam as RankedMode)
      : undefined;

  const season = seasonParam
    ? await prisma.season.findUnique({ where: { slug: seasonParam } })
    : await prisma.season.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" } });

  if (!season) {
    return NextResponse.json({ entries: [], page, pageSize, total: 0 });
  }

  const where = {
    seasonId: season.id,
    ...(mode ? { mode } : {}),
  };

  const [total, entries, session] = await Promise.all([
    prisma.leaderboardEntry.count({ where }),
    prisma.leaderboardEntry.findMany({
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
      orderBy: [{ rating: "desc" }, { updatedAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    getRequiredSession(),
  ]);

  const selfEntry =
    session && mode
      ? await prisma.leaderboardEntry.findUnique({
          where: {
            userId_seasonId_mode: {
              userId: session.user.id,
              seasonId: season.id,
              mode,
            },
          },
        })
      : null;

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
      rating: entry.rating,
      gamesCount: entry.gamesCount,
      winsCount: entry.winsCount,
      lossesCount: entry.lossesCount,
      updatedAt: entry.updatedAt,
    })),
    self: selfEntry,
  });
}
