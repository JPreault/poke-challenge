import { NextResponse } from "next/server";

import { getDescriptionState } from "@/lib/games/description-round";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });
  }

  const state = getDescriptionState(token);
  if (!state) {
    return NextResponse.json(
      { error: "Manche expirée ou invalide." },
      { status: 404 },
    );
  }

  return NextResponse.json(state);
}
