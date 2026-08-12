import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const DEV_FALLBACK_SECRET = "poke-challenge-dev-mystery-secret";

export function getTokenSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? null;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET must be set in production.");
    }
    return DEV_FALLBACK_SECRET;
  }

  if (process.env.NODE_ENV === "production" && secret === DEV_FALLBACK_SECRET) {
    throw new Error(
      "Refusing to use the development token secret in production.",
    );
  }

  return secret;
}

function getKey(): Buffer {
  return createHash("sha256").update(getTokenSecret()).digest();
}

export function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

export function encryptTokenPayload(payload: unknown, version = 1): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${version}.${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(encrypted)}`;
}

export function decryptTokenPayload<T>(
  token: string,
  version = 1,
): T | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [versionPart, ivPart, tagPart, dataPart] = parts;
  if (versionPart !== String(version) || !ivPart || !tagPart || !dataPart) {
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
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createTokenJti(): string {
  return randomBytes(16).toString("hex");
}

export const CASUAL_TOKEN_TTL_MS = 1000 * 60 * 60 * 2;
export const RANKED_TOKEN_TTL_MS = 1000 * 60 * 15;

export function tokenExpiry(ranked: boolean): number {
  return Date.now() + (ranked ? RANKED_TOKEN_TTL_MS : CASUAL_TOKEN_TTL_MS);
}
