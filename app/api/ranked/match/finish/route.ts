import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { computePerformance, computeRatingDelta } from "@/lib/ranked/rating";

interface FinishRankedBody {
  matchId?: string;
  totalRounds?: number;
  correctCount?: number;
  durationMs?: number;
  score?: number;
}

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  let body: FinishRankedBody;
  try {
    body = (await request.json()) as FinishRankedBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.matchId || !body.totalRounds || body.correctCount == null) {
    return NextResponse.json({ error: "Parametres manquants." }, { status: 400 });
  }

  const totalRounds = Math.max(1, Math.floor(body.totalRounds));
  const correctCount = Math.max(0, Math.min(totalRounds, Math.floor(body.correctCount)));
  const durationMs = body.durationMs ? Math.max(1, Math.floor(body.durationMs)) : null;

  const match = await prisma.rankedMatch.findUnique({
    where: { id: body.matchId },
    include: { season: true },
  });

  if (!match || match.userId !== session.user.id) {
    return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
  }

  if (match.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Partie deja finalisee." }, { status: 409 });
  }

  const entry = await prisma.leaderboardEntry.upsert({
    where: {
      userId_seasonId_mode: {
        userId: session.user.id,
        seasonId: match.seasonId,
        mode: match.mode,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      seasonId: match.seasonId,
      mode: match.mode,
      rating: 1000,
      gamesCount: 0,
      winsCount: 0,
      lossesCount: 0,
    },
  });

  const ratingBefore = entry.rating;
  const delta = computeRatingDelta({
    ratingBefore,
    correctCount,
    totalRounds,
    durationMs,
  });
  const ratingAfter = Math.max(100, ratingBefore + delta);
  const accuracy = correctCount / totalRounds;
  const performance = computePerformance({
    correctCount,
    totalRounds,
    durationMs,
  });
  const computedScore =
    body.score ?? Math.round(performance * 1000 + correctCount * 10 - totalRounds * 2);

  const [updatedMatch, updatedEntry] = await prisma.$transaction([
    prisma.rankedMatch.update({
      where: { id: match.id },
      data: {
        status: "FINISHED",
        totalRounds,
        correctCount,
        durationMs,
        score: computedScore,
        accuracy,
        ratingBefore,
        ratingAfter,
        deltaRating: delta,
        finishedAt: new Date(),
      },
      select: {
        id: true,
        mode: true,
        score: true,
        totalRounds: true,
        correctCount: true,
        accuracy: true,
        ratingBefore: true,
        ratingAfter: true,
        deltaRating: true,
        finishedAt: true,
      },
    }),
    prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: {
        rating: ratingAfter,
        gamesCount: { increment: 1 },
        winsCount: accuracy >= 0.5 ? { increment: 1 } : undefined,
        lossesCount: accuracy < 0.5 ? { increment: 1 } : undefined,
      },
      select: {
        rating: true,
        gamesCount: true,
        winsCount: true,
        lossesCount: true,
      },
    }),
  ]);

  await prisma.ratingHistory.create({
    data: {
      userId: session.user.id,
      seasonId: match.seasonId,
      mode: match.mode,
      matchId: match.id,
      ratingBefore,
      ratingAfter,
      delta,
    },
  });

  return NextResponse.json({
    match: updatedMatch,
    leaderboard: updatedEntry,
  });
}
