import { NextResponse } from "next/server";

import { skipPokedleRound } from "@/lib/games/pokedle-round";

interface SkipBody {
  token?: string;
}

export async function POST(request: Request) {
  let body: SkipBody;

  try {
    body = (await request.json()) as SkipBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });
  }

  return NextResponse.json(skipPokedleRound(token));
}
