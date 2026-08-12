import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { startPokedleRound } from "@/lib/games/pokedle-round";

interface StartBody {
  matchId?: string;
}

export async function POST(request: Request) {
  let body: StartBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as StartBody;
    }
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const session = await getRequiredSession();
  if (body.matchId && !session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const result = await startPokedleRound({
    userId: session?.user.id,
    matchId: body.matchId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
