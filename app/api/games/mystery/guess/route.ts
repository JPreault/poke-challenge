import { NextResponse } from "next/server";

import { guessMysteryRound } from "@/lib/games/mystery-round";

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

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Le jeton de manche est requis." },
      { status: 400 },
    );
  }

  if (!answer || typeof answer !== "string") {
    return NextResponse.json(
      { error: "La réponse est requise." },
      { status: 400 },
    );
  }

  const result = await guessMysteryRound(token, answer);
  return NextResponse.json(result);
}
