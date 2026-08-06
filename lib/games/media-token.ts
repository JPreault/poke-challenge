import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type MediaKind = "artwork" | "sprite" | "cry";

export interface MediaPayload {
  pokemonId: number;
  kind: MediaKind;
  exp: number;
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 2;
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

export function createMediaToken(pokemonId: number, kind: MediaKind): string {
  const payload: MediaPayload = {
    pokemonId,
    kind,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${VERSION}.${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(encrypted)}`;
}

export function verifyMediaToken(token: string): MediaPayload | null {
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
    const payload = JSON.parse(decrypted.toString("utf8")) as MediaPayload;

    if (
      typeof payload.pokemonId !== "number" ||
      (payload.kind !== "artwork" &&
        payload.kind !== "sprite" &&
        payload.kind !== "cry") ||
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

export function mediaPath(kind: MediaKind, token: string): string {
  return `/api/media/${kind}?t=${encodeURIComponent(token)}`;
}

export function proxyArtworkUrl(pokemonId: number): string {
  return mediaPath("artwork", createMediaToken(pokemonId, "artwork"));
}

export function proxySpriteUrl(pokemonId: number): string {
  return mediaPath("sprite", createMediaToken(pokemonId, "sprite"));
}

export function proxyCryUrl(pokemonId: number): string {
  return mediaPath("cry", createMediaToken(pokemonId, "cry"));
}
