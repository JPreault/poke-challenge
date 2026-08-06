import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { getTrainingSearchCatalog } from "@/lib/pokemon/training-pool";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const catalog = await getTrainingSearchCatalog(session.user.id);
  return NextResponse.json({ catalog });
}
