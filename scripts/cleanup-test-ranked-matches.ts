import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000);

  const inProgress = await prisma.rankedMatch.deleteMany({
    where: { status: "IN_PROGRESS" },
  });

  const testFinished = await prisma.rankedMatch.deleteMany({
    where: {
      status: { in: ["FINISHED", "ABANDONED"] },
      createdAt: { gte: cutoff },
      OR: [{ winStreak: null }, { winStreak: { lte: 2 } }],
    },
  });

  const aggregates = await prisma.rankedMatch.groupBy({
    by: ["userId", "mode"],
    where: {
      status: { in: ["FINISHED", "ABANDONED"] },
      winStreak: { gt: 0 },
    },
    _max: { winStreak: true },
  });

  const streakMap = new Map(
    aggregates.map((row) => [
      `${row.userId}:${row.mode}`,
      row._max.winStreak ?? 0,
    ]),
  );

  const entries = await prisma.leaderboardEntry.findMany({
    select: { id: true, userId: true, mode: true },
  });

  for (const entry of entries) {
    const best = streakMap.get(`${entry.userId}:${entry.mode}`) ?? 0;
    await prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: { bestWinStreak: best },
    });
  }

  const remainingInProgress = await prisma.rankedMatch.count({
    where: { status: "IN_PROGRESS" },
  });

  console.log(
    JSON.stringify(
      {
        deletedInProgress: inProgress.count,
        deletedRecentTestFinished: testFinished.count,
        leaderboardEntriesUpdated: entries.length,
        remainingInProgress,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
