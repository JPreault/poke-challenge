import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import type { MysteryKind, MysteryPool } from "@/lib/games/mystery-types";

export type { MysteryKind, MysteryPool };

export interface MysteryPayload {
  pokemonId: number;
  kind: MysteryKind;
  pool: MysteryPool;
  /** Unix timestamp (ms) when the token expires. */
  exp: number;
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours
const VERSION = 1;

function getSecret(): string {
  return (
    process.env.MYSTERY_ROUND_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "poke-challenge-dev-mystery-secret"
  );
}

function getKey(): Buffer {
  return createHash("sha256").update(getSecret()).digest();
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

export function createMysteryToken(
  pokemonId: number,
  kind: MysteryKind,
  pool: MysteryPool,
): string {
  const payload: MysteryPayload = {
    pokemonId,
    kind,
    pool,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${VERSION}.${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(encrypted)}`;
}

export function verifyMysteryToken(token: string): MysteryPayload | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [version, ivPart, tagPart, dataPart] = parts;
  if (version !== String(VERSION) || !ivPart || !tagPart || !dataPart) {
    return null;
  }

  try {
    const iv = fromBase64Url(ivPart);
    const tag = fromBase64Url(tagPart);
    const encrypted = fromBase64Url(dataPart);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const payload = JSON.parse(decrypted.toString("utf8")) as MysteryPayload;

    if (
      typeof payload.pokemonId !== "number" ||
      (payload.kind !== "blur" && payload.kind !== "zoom") ||
      (payload.pool !== "bac" && payload.pool !== "catalog") ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function mysteryArtworkPath(token: string): string {
  return `/api/games/mystery/artwork?t=${encodeURIComponent(token)}`;
}
