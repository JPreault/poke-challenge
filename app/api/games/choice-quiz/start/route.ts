import { NextResponse } from "next/server";

import { startChoiceQuizRound } from "@/lib/games/choice-quiz-round";
import type { ChoiceQuizMode, QuizPool } from "@/lib/games/choice-quiz-types";

interface StartBody {
  mode?: ChoiceQuizMode;
  pool?: QuizPool;
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

  const { mode, pool } = body;

  if (
    mode !== "image-to-name" &&
    mode !== "name-to-image" &&
    mode !== "cry-guess"
  ) {
    return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
  }

  if (pool !== "bac" && pool !== "catalog") {
    return NextResponse.json({ error: "Pool invalide." }, { status: 400 });
  }

  return NextResponse.json(startChoiceQuizRound(mode, pool));
}
