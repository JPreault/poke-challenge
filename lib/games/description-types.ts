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
      roundFailed: false;
    }
  | {
      status: "wrong";
      wrongGuess: DescriptionWrongGuess;
      visibleDescriptions: string[];
      unlockedNewDescription: boolean;
      roundFailed: false;
      nextToken: string;
      wrongAttempts: number;
    }
  | {
      status: "wrong";
      wrongGuess: DescriptionWrongGuess;
      visibleDescriptions: string[];
      unlockedNewDescription: boolean;
      roundFailed: true;
      nameFr: string;
      artworkUrl: string;
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
  | { status: "invalid_token"; message: string }
  | { status: "forbidden"; message: string };
