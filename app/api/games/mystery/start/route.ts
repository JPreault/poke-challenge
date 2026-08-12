import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { startMysteryRound } from "@/lib/games/mystery-round";
import type { MysteryKind, MysteryPool } from "@/lib/games/mystery-types";

interface StartBody {
  kind?: MysteryKind;
  pool?: MysteryPool;
  matchId?: string;
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

  const { kind, pool, matchId } = body;

  if (kind !== "blur" && kind !== "zoom") {
    return NextResponse.json(
      { error: "Le type de manche doit être 'blur' ou 'zoom'." },
      { status: 400 },
    );
  }

  if (pool !== "training" && pool !== "catalog" && pool !== "bac") {
    return NextResponse.json(
      { error: "Le pool doit être 'training' ou 'catalog'." },
      { status: 400 },
    );
  }

  const session = await getRequiredSession();
  if (matchId && !session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const result = await startMysteryRound(
    kind,
    pool,
    session?.user.id,
    matchId,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
