import { NextResponse } from "next/server";

import { startPokedleRound } from "@/lib/games/pokedle-round";

export async function POST() {
  return NextResponse.json(startPokedleRound());
}
