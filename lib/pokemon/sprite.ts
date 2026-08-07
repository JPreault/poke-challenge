import type { SearchPokemon } from "@/lib/pokemon/client-data";

/** Sprite officiel (suggestions / UI légère côté client). */
export function getPokemonSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export type { SearchPokemon };
