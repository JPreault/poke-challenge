import { NextResponse } from "next/server";

import { startMysteryRound } from "@/lib/games/mystery-round";
import type { MysteryKind, MysteryPool } from "@/lib/games/mystery-types";

interface StartBody {
  kind?: MysteryKind;
  pool?: MysteryPool;
}

export async function POST(request: Request) {
  let body: StartBody;

  try {
    body = (await request.json()) as StartBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { kind, pool } = body;

  if (kind !== "blur" && kind !== "zoom") {
    return NextResponse.json(
      { error: "Le type de manche doit être 'blur' ou 'zoom'." },
      { status: 400 },
    );
  }

  if (pool !== "bac" && pool !== "catalog") {
    return NextResponse.json(
      { error: "Le pool doit être 'bac' ou 'catalog'." },
      { status: 400 },
    );
  }

  const result = startMysteryRound(kind, pool);
  return NextResponse.json(result);
}
