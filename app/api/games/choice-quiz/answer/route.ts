import { NextResponse } from "next/server";

import { answerChoiceQuizRound } from "@/lib/games/choice-quiz-round";

interface AnswerBody {
  token?: string;
  choiceIndex?: number;
}

export async function POST(request: Request) {
  let body: AnswerBody;

  try {
    body = (await request.json()) as AnswerBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { token, choiceIndex } = body;

  if (!token || typeof choiceIndex !== "number") {
    return NextResponse.json(
      { error: "Jeton ou choix manquant." },
      { status: 400 },
    );
  }

  return NextResponse.json(answerChoiceQuizRound(token, choiceIndex));
}
