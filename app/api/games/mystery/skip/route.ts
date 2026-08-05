import { NextResponse } from "next/server";

import { skipMysteryRound } from "@/lib/games/mystery-round";

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

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Le jeton de manche est requis." },
      { status: 400 },
    );
  }

  const result = skipMysteryRound(token);
  return NextResponse.json(result);
}
