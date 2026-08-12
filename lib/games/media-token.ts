import {
  decryptTokenPayload,
  encryptTokenPayload,
  tokenExpiry,
} from "@/lib/games/token-crypto";

export type MediaKind = "artwork" | "sprite" | "cry";

export interface MediaPayload {
  pokemonId: number;
  kind: MediaKind;
  exp: number;
}

const VERSION = 1;

export function createMediaToken(pokemonId: number, kind: MediaKind): string {
  const payload: MediaPayload = {
    pokemonId,
    kind,
    exp: tokenExpiry(false),
  };

  return encryptTokenPayload(payload, VERSION);
}

export function verifyMediaToken(token: string): MediaPayload | null {
  const payload = decryptTokenPayload<MediaPayload>(token, VERSION);
  if (!payload) return null;

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
