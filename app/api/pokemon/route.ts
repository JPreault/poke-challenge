import { NextResponse } from "next/server";

import { getBacPokemon } from "@/lib/pokemon/data";

export async function GET() {
  return NextResponse.json({ bac: getBacPokemon() });
}
