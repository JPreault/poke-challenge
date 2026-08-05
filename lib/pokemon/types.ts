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
}

export interface PokemonData {
  bac: BacPokemon[];
  catalog: QuizPokemon[];
  frenchIndex: Record<string, FrenchPokemonEntry>;
}

export type ValidationMode = "strict" | "free";

export interface ValidationResult {
  correct: boolean;
  preferred: boolean;
  expected?: string;
  matched?: string;
  hasTypo?: boolean;
}
