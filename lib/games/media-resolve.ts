import { findCatalogPokemonById } from "@/lib/pokemon/data";

import { type MediaKind, verifyMediaToken } from "./media-token";

export function resolveMediaUrl(token: string, kind: MediaKind): string | null {
  const payload = verifyMediaToken(token);
  if (!payload || payload.kind !== kind) return null;

  const pokemon = findCatalogPokemonById(payload.pokemonId);
  if (!pokemon) return null;

  switch (kind) {
    case "artwork":
      return pokemon.artwork;
    case "sprite":
      return pokemon.sprite;
    case "cry":
      return pokemon.cryLatest;
    default:
      return null;
  }
}
