import { NextResponse } from "next/server";

import { startDescriptionRound } from "@/lib/games/description-round";

export async function POST() {
  return NextResponse.json(startDescriptionRound());
}
