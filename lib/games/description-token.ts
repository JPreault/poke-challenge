import {
  createTokenJti,
  decryptTokenPayload,
  encryptTokenPayload,
  tokenExpiry,
} from "@/lib/games/token-crypto";
import type { RankedTokenFields } from "@/lib/games/token-fields";
import { validateRankedTokenFields } from "@/lib/games/token-fields";

export interface DescriptionPayload extends RankedTokenFields {
  targetId: number;
  exp: number;
}

const VERSION = 1;

export function createDescriptionToken(input: {
  targetId: number;
  ranked?: boolean;
  matchId?: string;
  roundId?: string;
  jti?: string;
  wrongAttempts?: number;
  maxAttempts?: number;
}): string {
  const ranked = input.ranked === true;
  const payload: DescriptionPayload = {
    targetId: input.targetId,
    ranked: input.ranked,
    matchId: input.matchId,
    roundId: input.roundId,
    jti: input.jti ?? createTokenJti(),
    wrongAttempts: input.wrongAttempts ?? 0,
    maxAttempts: input.maxAttempts ?? (ranked ? 4 : 99),
    exp: tokenExpiry(ranked),
  };

  return encryptTokenPayload(payload, VERSION);
}

export function verifyDescriptionToken(
  token: string,
): DescriptionPayload | null {
  const payload = decryptTokenPayload<DescriptionPayload>(token, VERSION);
  if (!payload) return null;

  if (
    typeof payload.targetId !== "number" ||
    typeof payload.exp !== "number" ||
    !validateRankedTokenFields(payload)
  ) {
    return null;
  }

  if (Date.now() > payload.exp) {
    return null;
  }

  return payload;
}
