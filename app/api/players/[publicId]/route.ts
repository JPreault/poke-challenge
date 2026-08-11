import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getRankedModeLabel } from "@/lib/games/ranked-limits";
import { formatPlayerLabel } from "@/lib/profile/display-name";
import { getPlayerRankedScoreDetails } from "@/lib/ranked/match-service";

interface RouteParams {
  params: Promise<{ publicId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { publicId: rawPublicId } = await params;
  const publicId = rawPublicId.trim().toUpperCase();

  if (publicId.length !== 6) {
    return NextResponse.json({ error: "Joueur introuvable." }, { status: 404 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { publicId },
    select: {
      userId: true,
      pseudo: true,
      publicId: true,
      user: {
        select: { image: true, name: true },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Joueur introuvable." }, { status: 404 });
  }

  const rankedScores = (await getPlayerRankedScoreDetails(profile.userId)).map(
    (score) => ({
      mode: score.mode,
      modeLabel: getRankedModeLabel(score.mode),
      bestWinStreak: score.bestWinStreak,
      bestTopRank: score.bestTopRank,
    }),
  );

  return NextResponse.json({
    userId: profile.userId,
    pseudo: profile.pseudo,
    publicId: profile.publicId,
    userName: formatPlayerLabel({
      pseudo: profile.pseudo,
      publicId: profile.publicId,
      fallbackName: profile.user.name ?? "Dresseur inconnu",
    }),
    image: profile.user.image,
    rankedScores,
  });
}
