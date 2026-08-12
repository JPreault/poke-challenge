import {
  createTokenJti,
  decryptTokenPayload,
  encryptTokenPayload,
  tokenExpiry,
} from "@/lib/games/token-crypto";
import type { RankedTokenFields } from "@/lib/games/token-fields";
import { validateRankedTokenFields } from "@/lib/games/token-fields";
import type { MysteryKind, MysteryPool } from "@/lib/games/mystery-types";

export type { MysteryKind, MysteryPool };

export interface MysteryPayload extends RankedTokenFields {
  pokemonId: number;
  kind: MysteryKind;
  pool: MysteryPool;
  userId?: string;
  solved?: boolean;
  exp: number;
}

const VERSION = 1;

function isValidPool(pool: unknown): pool is MysteryPool {
  return pool === "training" || pool === "catalog" || pool === "bac";
}

export function createMysteryToken(input: {
  pokemonId: number;
  kind: MysteryKind;
  pool: MysteryPool;
  userId?: string;
  ranked?: boolean;
  matchId?: string;
  roundId?: string;
  jti?: string;
  wrongAttempts?: number;
  maxAttempts?: number;
  solved?: boolean;
}): string {
  const ranked = input.ranked === true;
  const payload: MysteryPayload = {
    pokemonId: input.pokemonId,
    kind: input.kind,
    pool: input.pool,
    userId: input.userId,
    ranked: input.ranked,
    matchId: input.matchId,
    roundId: input.roundId,
    jti: input.jti ?? createTokenJti(),
    wrongAttempts: input.wrongAttempts ?? 0,
    maxAttempts: input.maxAttempts ?? (ranked ? 3 : 99),
    solved: input.solved,
    exp: tokenExpiry(ranked),
  };

  return encryptTokenPayload(payload, VERSION);
}

export function verifyMysteryToken(token: string): MysteryPayload | null {
  const payload = decryptTokenPayload<MysteryPayload>(token, VERSION);
  if (!payload) return null;

  if (
    typeof payload.pokemonId !== "number" ||
    (payload.kind !== "blur" && payload.kind !== "zoom") ||
    !isValidPool(payload.pool) ||
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

export function mysteryArtworkPath(token: string): string {
  return `/api/games/mystery/artwork?t=${encodeURIComponent(token)}`;
}
