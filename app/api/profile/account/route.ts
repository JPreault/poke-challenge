import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

interface DeleteAccountBody {
  confirmPseudo?: string;
}

export async function DELETE(request: Request) {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: DeleteAccountBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as DeleteAccountBody;
    }
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { pseudo: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  const confirmPseudo = body.confirmPseudo?.trim();
  if (!confirmPseudo || confirmPseudo !== profile.pseudo) {
    return NextResponse.json(
      { error: "Confirme ton pseudo pour supprimer le compte." },
      { status: 400 },
    );
  }

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
