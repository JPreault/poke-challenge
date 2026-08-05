import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { BAC_POKEMON } from "../data/bac-list";
import { normalizeFrenchName } from "../lib/pokemon/normalize";
import type { PokemonData } from "../lib/pokemon/types";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

interface SpeciesName {
  language: { name: string };
  name: string;
}

interface SpeciesListItem {
  name: string;
  url: string;
}

interface SpeciesListResponse {
  results: SpeciesListItem[];
  next: string | null;
}

interface SpeciesResponse {
  id: number;
  name: string;
  names: SpeciesName[];
}

interface PokemonResponse {
  id: number;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchAllSpecies(): Promise<SpeciesResponse[]> {
  const species: SpeciesResponse[] = [];
  let url: string | null = `${POKEAPI_BASE}/pokemon-species?limit=2000`;

  while (url) {
    const page: SpeciesListResponse = await fetchJson<SpeciesListResponse>(url);
    const details = await Promise.all(
      page.results.map((item: SpeciesListItem) =>
        fetchJson<SpeciesResponse>(item.url),
      ),
    );
    species.push(...details);
    url = page.next;
  }

  return species;
}

function getFrenchName(species: SpeciesResponse): string | null {
  return (
    species.names.find((entry) => entry.language.name === "fr")?.name ?? null
  );
}

async function main() {
  console.log("Fetching Pokémon species from PokéAPI...");
  const allSpecies = await fetchAllSpecies();

  const frenchIndex: PokemonData["frenchIndex"] = {};
  const frenchNameToSpecies = new Map<string, SpeciesResponse>();

  for (const species of allSpecies) {
    const nameFr = getFrenchName(species);
    if (!nameFr) continue;

    const key = normalizeFrenchName(nameFr);
    frenchIndex[key] = { id: species.id, nameFr };
    frenchNameToSpecies.set(key, species);
  }

  const bac: PokemonData["bac"] = [];
  const failures: string[] = [];

  for (const entry of BAC_POKEMON) {
    const key = normalizeFrenchName(entry.name);
    const species = frenchNameToSpecies.get(key);

    if (!species) {
      failures.push(entry.name);
      continue;
    }

    const pokemon = await fetchJson<PokemonResponse>(
      `${POKEAPI_BASE}/pokemon/${species.id}`,
    );

    const sprite =
      pokemon.sprites.front_default ??
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${species.id}.png`;
    const artwork =
      pokemon.sprites.other?.["official-artwork"]?.front_default ?? sprite;

    bac.push({
      letter: entry.letter,
      nameFr: entry.name,
      id: species.id,
      sprite,
      artwork,
    });

    console.log(`✓ ${entry.letter} - ${entry.name} (id: ${species.id})`);
  }

  if (failures.length > 0) {
    console.error("\nFailed to resolve:");
    for (const name of failures) {
      console.error(`  - ${name}`);
    }
    process.exit(1);
  }

  const catalog: PokemonData["catalog"] = Object.values(frenchIndex)
    .map((entry) => ({
      id: entry.id,
      nameFr: entry.nameFr,
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`,
      artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`,
    }))
    .sort((a, b) => a.id - b.id);

  const data: PokemonData = { bac, catalog, frenchIndex };
  const outputPath = join(process.cwd(), "data", "pokemon.json");
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(
    `\nWrote ${outputPath} (${bac.length} bac Pokémon, ${catalog.length} catalog)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
