import { prisma } from "@/lib/db/prisma";

export async function getActiveSeason() {
  const now = new Date();

  const active = await prisma.season.findFirst({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { startsAt: "desc" },
  });

  if (active) return active;

  return prisma.season.upsert({
    where: { slug: "season-1" },
    update: { isActive: true },
    create: {
      slug: "season-1",
      name: "Saison 1",
      startsAt: now,
      isActive: true,
    },
  });
}
