export type GameMode =
  | "image-to-name"
  | "name-to-image"
  | "letter-input"
  | "cry-guess"
  | "shuffle"
  | "pokedle"
  | "description-guess"
  | "blur-guess"
  | "zoom-guess";

export type GameInterfaceMode = "bac-training" | "arena";

export type BacShuffleRoundType =
  | "image-to-name"
  | "name-to-image"
  | "letter-input"
  | "blur-guess"
  | "zoom-guess";

export type ArenaShuffleRoundType =
  | "image-to-name"
  | "name-to-image"
  | "blur-guess"
  | "zoom-guess"
  | "cry-guess"
  | "pokedle"
  | "description-guess";

export type ShuffleRoundType = BacShuffleRoundType | ArenaShuffleRoundType;

export const BAC_SHUFFLE_ROUND_TYPES: BacShuffleRoundType[] = [
  "image-to-name",
  "name-to-image",
  "letter-input",
  "blur-guess",
  "zoom-guess",
];

export const ARENA_SHUFFLE_ROUND_TYPES: ArenaShuffleRoundType[] = [
  "image-to-name",
  "name-to-image",
  "blur-guess",
  "zoom-guess",
  "cry-guess",
  "pokedle",
  "description-guess",
];

export interface RoundRecord {
  round: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  preferred?: boolean;
  questionImage?: string;
  chosenImage?: string;
  chosenLabel?: string;
  correctImage?: string;
  /** True when the player skipped/abandoned the round. */
  skipped?: boolean;
  /** Number of guesses before solve/skip (blur/zoom/description/pokedle). */
  attemptCount?: number;
  /** Share of correct Pokedle hint cells, 0–100. */
  hintAccuracyPercent?: number;
  userAnswerCry?: string;
  correctAnswerCry?: string;
}

export interface GameSessionState {
  mode: GameMode;
  rounds: RoundRecord[];
  isFinished: boolean;
}

export interface GameStats {
  totalRounds: number;
  correctCount: number;
  incorrectCount: number;
  successRate: number;
  errors: RoundRecord[];
}

export function getGameModeLabel(mode: GameMode): string {
  switch (mode) {
    case "image-to-name":
      return "Image → Nom";
    case "name-to-image":
      return "Nom → Image";
    case "letter-input":
      return "Lettre → Nom";
    case "cry-guess":
      return "Pokémon → Cri";
    case "shuffle":
      return "Shuffle";
    case "pokedle":
      return "Pokédle";
    case "description-guess":
      return "Description → Pokémon";
    case "blur-guess":
      return "Image flou";
    case "zoom-guess":
      return "Image zoomer";
  }
}

export function getShuffleRoundLabel(type: ShuffleRoundType): string {
  switch (type) {
    case "image-to-name":
      return "Image → Nom";
    case "name-to-image":
      return "Nom → Image";
    case "letter-input":
      return "Lettre → Nom";
    case "cry-guess":
      return "Pokémon → Cri";
    case "pokedle":
      return "Pokédle";
    case "description-guess":
      return "Description → Pokémon";
    case "blur-guess":
      return "Image flou";
    case "zoom-guess":
      return "Image zoomer";
  }
}

export function getShuffleRoundDescription(type: ShuffleRoundType): string {
  switch (type) {
    case "image-to-name":
      return "Clique sur le bon nom parmi les 4 propositions.";
    case "name-to-image":
      return "Clique sur la bonne image parmi les 4 propositions.";
    case "letter-input":
      return "Entre un Pokémon existant dont le nom français commence par la lettre affichée.";
    case "cry-guess":
      return "Écoute les 4 propositions et choisis le cri correspondant au Pokémon affiché.";
    case "pokedle":
      return "Propose un Pokémon et compare ses caractéristiques pour trouver le Pokémon mystère.";
    case "description-guess":
      return "Lis la description Pokédex et retrouve le Pokémon correspondant.";
    case "blur-guess":
      return "Devine le Pokémon à partir d'une image floutée. À chaque tentative, l'image se dévoile légèrement.";
    case "zoom-guess":
      return "Devine le Pokémon à partir d'une image ultra zoomée. À chaque tentative, l'image se dézoome légèrement.";
  }
}

export function computeStats(rounds: RoundRecord[]): GameStats {
  const correctCount = rounds.filter((round) => round.isCorrect).length;
  const totalRounds = rounds.length;
  const incorrectCount = totalRounds - correctCount;

  return {
    totalRounds,
    correctCount,
    incorrectCount,
    successRate: totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0,
    errors: rounds.filter((round) => !round.isCorrect),
  };
}

export interface BlurGuessStats {
  completedRounds: number;
  averageAttempts: number | null;
}

export function computeBlurGuessStats(rounds: RoundRecord[]): BlurGuessStats {
  const successful = rounds.filter((round) => round.isCorrect);
  const totalAttempts = successful.reduce(
    (sum, round) => sum + (round.attemptCount ?? 1),
    0,
  );

  return {
    completedRounds: successful.length,
    averageAttempts:
      successful.length > 0
        ? Math.round((totalAttempts / successful.length) * 10) / 10
        : null,
  };
}
