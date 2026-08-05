import pokemonData from "@/data/pokemon.json";
import type { PokemonData } from "@/lib/pokemon/types";

export const POKEMON_DATA = pokemonData as PokemonData;

export function getBacPokemon() {
  return POKEMON_DATA.bac;
}

export function getCatalogPokemon() {
  return POKEMON_DATA.catalog;
}

export function getFrenchIndex() {
  return POKEMON_DATA.frenchIndex;
}

export function getBacPokemonByLetter(letter: string) {
  return POKEMON_DATA.bac.find(
    (pokemon) => pokemon.letter.toUpperCase() === letter.toUpperCase(),
  );
}
