import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { finishRankedMatch } from "@/lib/ranked/match-service";

interface AbandonRankedBody {
  matchId?: string;
  winStreak?: number;
  totalRounds?: number;
  correctCount?: number;
  durationMs?: number;
}

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  let body: AbandonRankedBody;
  try {
    body = (await request.json()) as AbandonRankedBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.matchId || body.winStreak == null) {
    return NextResponse.json({ error: "Parametres manquants." }, { status: 400 });
  }

  const result = await finishRankedMatch({
    matchId: body.matchId,
    userId: session.user.id,
    winStreak: body.winStreak,
    totalRounds: body.totalRounds ?? body.winStreak,
    correctCount: body.correctCount ?? body.winStreak,
    durationMs: body.durationMs,
    endedReason: "ABANDONED",
    status: "ABANDONED",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
