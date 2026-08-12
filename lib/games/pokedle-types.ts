export type HintStatus = "correct" | "partial" | "wrong";
export type Direction = "up" | "down" | "equal";

export interface AttemptHints {
  generation: HintStatus;
  type1: HintStatus;
  type2: HintStatus;
  habitat: HintStatus;
  colors: HintStatus;
  evolutionStage: HintStatus;
  heightM: HintStatus;
  weightKg: HintStatus;
}

export interface PokedleAttempt {
  nameFr: string;
  spriteUrl: string;
  generation: number;
  types: string[];
  habitat: string | null;
  colors: string[];
  evolutionStage: number;
  heightM: number;
  weightKg: number;
  hints: AttemptHints;
  directions: {
    generation: Direction;
    evolutionStage: Direction;
    heightM: Direction;
    weightKg: Direction;
  };
  isCorrect: boolean;
}

export interface PokedleStartResult {
  token: string;
}

export type PokedleGuessResult =
  | {
      status: "correct";
      attempt: PokedleAttempt;
      targetNameFr: string;
      targetArtworkUrl: string;
      roundFailed: false;
    }
  | {
      status: "wrong";
      attempt: PokedleAttempt;
      roundFailed: false;
      nextToken: string;
      wrongAttempts: number;
    }
  | {
      status: "wrong";
      attempt: PokedleAttempt;
      roundFailed: true;
      targetNameFr: string;
      targetArtworkUrl: string;
    }
  | { status: "not_found"; message: string }
  | { status: "invalid_token"; message: string };

export type PokedleSkipResult =
  | { status: "ok"; targetNameFr: string; targetArtworkUrl: string }
  | { status: "invalid_token"; message: string }
  | { status: "forbidden"; message: string };
