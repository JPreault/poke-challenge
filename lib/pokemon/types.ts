import type { BacLetter } from "@/data/bac-list";

export interface BacPokemon {
  letter: BacLetter;
  nameFr: string;
  id: number;
  sprite: string;
  artwork: string;
}

export interface FrenchPokemonEntry {
  id: number;
  nameFr: string;
}

export interface QuizPokemon {
  id: number;
  nameFr: string;
  sprite: string;
  artwork: string;
  cryLatest: string;
  generation: number;
  types: string[];
  habitat: string | null;
  colors: string[];
  evolutionStage: number;
  heightM: number;
  weightKg: number;
}

export interface PokemonData {
  bac: BacPokemon[];
  catalog: QuizPokemon[];
  frenchIndex: Record<string, FrenchPokemonEntry>;
}

export type ValidationMode = "strict" | "free" | "catalog";

export interface ValidationResult {
  correct: boolean;
  preferred: boolean;
  expected?: string;
  matched?: string;
  hasTypo?: boolean;
}
