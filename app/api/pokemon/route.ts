import { NextResponse } from "next/server";

import { getBacPokemon } from "@/lib/pokemon/data";
import type { BacPokemon } from "@/lib/pokemon/types";

export async function GET() {
  const bac = getBacPokemon().map(
    ({ letter, nameFr, id }: BacPokemon) => ({ letter, nameFr, id }),
  );
  return NextResponse.json({ bac });
}
