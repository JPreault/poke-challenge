import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { finishRankedMatch } from "@/lib/ranked/match-service";

interface FinishRankedBody {
  matchId?: string;
  durationMs?: number;
}

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  let body: FinishRankedBody;
  try {
    body = (await request.json()) as FinishRankedBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.matchId) {
    return NextResponse.json({ error: "Parametres manquants." }, { status: 400 });
  }

  const result = await finishRankedMatch({
    matchId: body.matchId,
    userId: session.user.id,
    durationMs: body.durationMs,
    endedReason: "COMPLETED_FAIL",
    status: "FINISHED",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ...result,
    winStreak: result.match.winStreak ?? 0,
  });
}
