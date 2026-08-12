import { NextResponse } from "next/server";

import { skipDescriptionRound } from "@/lib/games/description-round";

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
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  const result = await skipDescriptionRound(token);
  if (result.status === "forbidden") {
    return NextResponse.json({ error: result.message }, { status: 403 });
  }
  return NextResponse.json(result);
}
