export type ChoiceQuizMode = "image-to-name" | "name-to-image" | "cry-guess";
/** `training` = liste perso connectée ; `bac` conservé pour compat tokens anciens. */
export type QuizPool = "training" | "catalog" | "bac";

export function normalizeQuizPool(pool: QuizPool): "training" | "catalog" {
  return pool === "catalog" ? "catalog" : "training";
}

export interface ChoiceQuizChoice {
  choiceIndex: number;
  nameFr?: string;
  imageUrl?: string;
  cryUrl?: string;
}

export interface ChoiceQuizStartResult {
  token: string;
  questionImageUrl?: string;
  questionName?: string;
  choices: ChoiceQuizChoice[];
}

export interface ChoiceQuizReveal {
  nameFr: string;
  artworkUrl: string;
  spriteUrl: string;
  cryUrl?: string;
}

export type ChoiceQuizAnswerResult =
  | {
      status: "correct";
      reveal: ChoiceQuizReveal;
    }
  | {
      status: "wrong";
      reveal: ChoiceQuizReveal;
      correctIndex: number;
    }
  | {
      status: "invalid_token";
      message: string;
    };

export type ChoiceQuizSkipResult =
  | { status: "ok"; reveal: ChoiceQuizReveal }
  | { status: "invalid_token"; message: string };
