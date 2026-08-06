export interface DescriptionStartResult {
  token: string;
  totalDescriptions: number;
  visibleDescriptions: string[];
}

export interface DescriptionWrongGuess {
  id: number;
  nameFr: string;
  spriteUrl: string;
}

export type DescriptionGuessResult =
  | {
      status: "correct";
      nameFr: string;
      artworkUrl: string;
      visibleDescriptions: string[];
    }
  | {
      status: "wrong";
      wrongGuess: DescriptionWrongGuess;
      visibleDescriptions: string[];
      unlockedNewDescription: boolean;
    }
  | { status: "not_found"; message: string }
  | { status: "invalid_token"; message: string };

export type DescriptionSkipResult =
  | {
      status: "ok";
      nameFr: string;
      artworkUrl: string;
      visibleDescriptions: string[];
    }
  | { status: "invalid_token"; message: string };
