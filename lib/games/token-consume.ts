import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Atomically consume a JTI (anti-replay). One DB write; race-safe via PK. */
export async function consumeJtiOnce(
  jti: string,
  expMs: number,
): Promise<{ ok: true } | { error: string; status: 409 }> {
  try {
    await prisma.consumedGameJti.create({
      data: {
        jti,
        expiresAt: new Date(Math.max(expMs, Date.now() + 60_000)),
      },
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Manche déjà utilisée.", status: 409 };
    }
    throw error;
  }
}

export { isUniqueViolation };
