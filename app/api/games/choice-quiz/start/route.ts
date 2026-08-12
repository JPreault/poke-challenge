import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { startChoiceQuizRound } from "@/lib/games/choice-quiz-round";
import type { ChoiceQuizMode, QuizPool } from "@/lib/games/choice-quiz-types";

interface StartBody {
  mode?: ChoiceQuizMode;
  pool?: QuizPool;
  matchId?: string;
}

export async function POST(request: Request) {
  let body: StartBody;

  try {
    body = (await request.json()) as StartBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { mode, pool, matchId } = body;

  if (
    mode !== "image-to-name" &&
    mode !== "name-to-image" &&
    mode !== "cry-guess"
  ) {
    return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
  }

  if (pool !== "training" && pool !== "catalog" && pool !== "bac") {
    return NextResponse.json({ error: "Pool invalide." }, { status: 400 });
  }

  const session = await getRequiredSession();
  if (matchId && !session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const result = await startChoiceQuizRound(
    mode,
    pool,
    session?.user.id,
    matchId,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
