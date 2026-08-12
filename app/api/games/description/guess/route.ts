import { NextResponse } from "next/server";

import { guessDescriptionRound } from "@/lib/games/description-round";

interface GuessBody {
  token?: string;
  answer?: string;
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

  const { token, answer } = body;

  if (!token || typeof answer !== "string") {
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  return NextResponse.json(await guessDescriptionRound(token, answer));
}
