import { NextResponse } from "next/server";

import { guessDescriptionRound } from "@/lib/games/description-round";

interface GuessBody {
  token?: string;
  answer?: string;
  wrongAttempts?: number;
}

export async function POST(request: Request) {
  let body: GuessBody;

  try {
    body = (await request.json()) as GuessBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { token, answer, wrongAttempts } = body;

  if (!token || typeof answer !== "string" || typeof wrongAttempts !== "number") {
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  return NextResponse.json(guessDescriptionRound(token, answer, wrongAttempts));
}
