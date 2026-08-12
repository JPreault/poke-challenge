import { prisma } from "@/lib/db/prisma";

export async function assertJtiAvailable(
  jti: string,
): Promise<{ error: string; status: number } | { ok: true }> {
  const existing = await prisma.consumedGameJti.findUnique({
    where: { jti },
  });
  if (existing && existing.expiresAt > new Date()) {
    return { error: "Manche déjà utilisée.", status: 409 };
  }
  return { ok: true };
}

export async function consumeJti(jti: string, expMs: number): Promise<void> {
  const expiresAt = new Date(Math.max(expMs, Date.now() + 60_000));
  await prisma.consumedGameJti.upsert({
    where: { jti },
    create: { jti, expiresAt },
    update: { expiresAt },
  });
}

export async function rotateRankedRoundJti(input: {
  roundId: string;
  nextJti: string;
  wrongAttempts: number;
}): Promise<void> {
  await prisma.rankedRound.update({
    where: { id: input.roundId },
    data: {
      tokenJti: input.nextJti,
      wrongAttempts: input.wrongAttempts,
    },
  });
}
