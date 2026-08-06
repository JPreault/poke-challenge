import { NextResponse } from "next/server";

import { skipDescriptionRound } from "@/lib/games/description-round";

interface SkipBody {
  token?: string;
  wrongAttempts?: number;
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

  const { token, wrongAttempts } = body;

  if (!token || typeof wrongAttempts !== "number") {
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  return NextResponse.json(skipDescriptionRound(token, wrongAttempts));
}
