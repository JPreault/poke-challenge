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
  generation: { name: string };
  color: { name: string };
  habitat: { name: string } | null;
  evolution_chain: { url: string };
}

interface PokemonResponse {
  id: number;
  height: number;
  weight: number;
  types: Array<{
    slot: number;
    type: { name: string };
  }>;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
}

interface TypeListResponse {
  results: Array<{ name: string; url: string }>;
}

interface TypeResponse {
  names: Array<{
    language: { name: string };
    name: string;
  }>;
}

interface EvolutionChainResponse {
  chain: EvolutionChainNode;
}

interface EvolutionChainNode {
  species: { url: string };
  evolves_to: EvolutionChainNode[];
}

const FALLBACK_TYPE_FR: Record<string, string> = {
  normal: "Normal",
  fire: "Feu",
  water: "Eau",
  electric: "Électrik",
  grass: "Plante",
  ice: "Glace",
  fighting: "Combat",
  poison: "Poison",
  ground: "Sol",
  flying: "Vol",
  psychic: "Psy",
  bug: "Insecte",
  rock: "Roche",
  ghost: "Spectre",
  dragon: "Dragon",
  dark: "Ténèbres",
  steel: "Acier",
  fairy: "Fée",
};

const HABITAT_FR: Record<string, string> = {
  cave: "Grotte",
  forest: "Forêt",
  grassland: "Prairie",
  mountain: "Montagne",
  rare: "Rare",
  "rough-terrain": "Terrain accidenté",
  sea: "Mer",
  urban: "Urbain",
  "waters-edge": "Bord de l'eau",
};

const COLOR_FR: Record<string, string> = {
  black: "Noir",
  blue: "Bleu",
  brown: "Marron",
  gray: "Gris",
  green: "Vert",
  pink: "Rose",
  purple: "Violet",
  red: "Rouge",
  white: "Blanc",
  yellow: "Jaune",
};

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

function parseTrailingIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) {
    throw new Error(`Unable to parse id from URL: ${url}`);
  }
  return Number(match[1]);
}

function generationNameToNumber(name: string): number {
  const roman = name.replace("generation-", "").toUpperCase();
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
  };
  const generation = map[roman];
  if (!generation) {
    throw new Error(`Unknown generation ${name}`);
  }
  return generation;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const tasks = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(tasks);
  return results;
}

async function buildTypeTranslations(): Promise<Record<string, string>> {
  const list = await fetchJson<TypeListResponse>(`${POKEAPI_BASE}/type?limit=100`);
  const details = await Promise.all(
    list.results.map((typeItem) => fetchJson<TypeResponse>(typeItem.url)),
  );

  const output: Record<string, string> = {};
  list.results.forEach((typeItem, index) => {
    const frName =
      details[index].names.find((entry) => entry.language.name === "fr")?.name ??
      FALLBACK_TYPE_FR[typeItem.name] ??
      typeItem.name;
    output[typeItem.name] = frName;
  });

  return output;
}

function collectEvolutionStages(
  node: EvolutionChainNode,
  stage: number,
  stageBySpeciesId: Map<number, number>,
) {
  const speciesId = parseTrailingIdFromUrl(node.species.url);
  const current = stageBySpeciesId.get(speciesId);
  if (!current || stage < current) {
    stageBySpeciesId.set(speciesId, stage);
  }

  for (const next of node.evolves_to) {
    collectEvolutionStages(next, stage + 1, stageBySpeciesId);
  }
}

async function buildEvolutionStageMap(
  speciesList: SpeciesResponse[],
): Promise<Map<number, number>> {
  const uniqueEvolutionUrls = Array.from(
    new Set(speciesList.map((species) => species.evolution_chain.url)),
  );
  const stageBySpeciesId = new Map<number, number>();

  await mapWithConcurrency(uniqueEvolutionUrls, 20, async (url) => {
    const chain = await fetchJson<EvolutionChainResponse>(url);
    collectEvolutionStages(chain.chain, 1, stageBySpeciesId);
    return null;
  });

  return stageBySpeciesId;
}

function getFrenchName(species: SpeciesResponse): string | null {
  return (
    species.names.find((entry) => entry.language.name === "fr")?.name ?? null
  );
}

async function main() {
  console.log("Fetching Pokémon species from PokéAPI...");
  const allSpecies = await fetchAllSpecies();
  console.log(`Fetched ${allSpecies.length} species.`);

  console.log("Fetching localized type labels...");
  const typeTranslations = await buildTypeTranslations();

  console.log("Fetching evolution chains...");
  const evolutionStageBySpeciesId = await buildEvolutionStageMap(allSpecies);

  console.log("Fetching detailed Pokémon stats...");
  const pokemonDetails = await mapWithConcurrency(allSpecies, 20, (species) =>
    fetchJson<PokemonResponse>(`${POKEAPI_BASE}/pokemon/${species.id}`),
  );
  const pokemonById = new Map<number, PokemonResponse>(
    pokemonDetails.map((pokemon) => [pokemon.id, pokemon]),
  );

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

    const pokemon = pokemonById.get(species.id);
    if (!pokemon) {
      failures.push(entry.name);
      continue;
    }

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
    .map((entry) => {
      const species = frenchNameToSpecies.get(normalizeFrenchName(entry.nameFr));
      if (!species) {
        return null;
      }

      const pokemon = pokemonById.get(entry.id);
      if (!pokemon) {
        return null;
      }

      const sprite =
        pokemon.sprites.front_default ??
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`;
      const artwork =
        pokemon.sprites.other?.["official-artwork"]?.front_default ?? sprite;
      const habitat = species.habitat
        ? (HABITAT_FR[species.habitat.name] ?? species.habitat.name)
        : null;
      const colors = [COLOR_FR[species.color.name] ?? species.color.name];
      const types = pokemon.types
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map(
          (typeEntry) =>
            typeTranslations[typeEntry.type.name] ??
            FALLBACK_TYPE_FR[typeEntry.type.name] ??
            typeEntry.type.name,
        );

      return {
        id: entry.id,
        nameFr: entry.nameFr,
        sprite,
        artwork,
        cryLatest: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${entry.id}.ogg`,
        generation: generationNameToNumber(species.generation.name),
        types,
        habitat,
        colors,
        evolutionStage: evolutionStageBySpeciesId.get(entry.id) ?? 1,
        heightM: pokemon.height / 10,
        weightKg: pokemon.weight / 10,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
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
