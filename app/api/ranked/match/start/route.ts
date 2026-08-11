import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { GameMode } from "@/lib/games/types";
import {
  getLeaderboardTopForMode,
  getPlayerBestStreak,
} from "@/lib/ranked/match-service";
import { toRankedMode } from "@/lib/ranked/mode";

interface StartRankedBody {
  mode?: GameMode;
}

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  let body: StartRankedBody;
  try {
    body = (await request.json()) as StartRankedBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.mode) {
    return NextResponse.json({ error: "Mode manquant." }, { status: 400 });
  }

  const rankedMode = toRankedMode(body.mode);
  if (!rankedMode) {
    return NextResponse.json({ error: "Mode non classe." }, { status: 400 });
  }

  const [match, top, playerBestStreak] = await Promise.all([
    prisma.rankedMatch.create({
      data: {
        userId: session.user.id,
        mode: rankedMode,
        status: "IN_PROGRESS",
      },
      select: {
        id: true,
        mode: true,
        createdAt: true,
      },
    }),
    getLeaderboardTopForMode(rankedMode),
    getPlayerBestStreak(session.user.id, rankedMode),
  ]);

  return NextResponse.json({
    match,
    topStreak: top.topStreak,
    topPlayerName: top.topPlayerName,
    playerBestStreak,
  });
}
