import { RankedMode } from "@prisma/client";
import { NextResponse } from "next/server";

import { ARENA_RANKED_MODES } from "@/lib/games/ranked-limits";
import { getLeaderboardTopForMode } from "@/lib/ranked/match-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get("mode");

  if (!modeParam || !ARENA_RANKED_MODES.includes(modeParam as RankedMode)) {
    return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
  }

  const top = await getLeaderboardTopForMode(modeParam as RankedMode);

  return NextResponse.json(top, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
