import searchData from "@/data/pokemon-search.json";

export interface SearchPokemon {
  id: number;
  nameFr: string;
}

export interface BacSearchEntry {
  letter: string;
  id: number;
  nameFr: string;
}

interface PokemonSearchData {
  catalog: SearchPokemon[];
  bac: BacSearchEntry[];
}

const data = searchData as PokemonSearchData;

export function getSearchCatalog(): SearchPokemon[] {
  return data.catalog;
}

export function getBacSearchEntries(): BacSearchEntry[] {
  return data.bac;
}

export function getBacIdSet(): Set<number> {
  return new Set(data.bac.map((entry) => entry.id));
}

export function getBacSearchCatalog(): SearchPokemon[] {
  const bacIds = getBacIdSet();
  return data.catalog.filter((entry) => bacIds.has(entry.id));
}
