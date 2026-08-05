export type GameMode =
  | "image-to-name"
  | "name-to-image"
  | "letter-input"
  | "cry-guess"
  | "shuffle"
  | "pokedle";

export type ShuffleRoundType =
  | "image-to-name"
  | "name-to-image"
  | "letter-input"
  | "cry-guess";

export const SHUFFLE_ROUND_TYPES: ShuffleRoundType[] = [
  "image-to-name",
  "name-to-image",
  "letter-input",
  "cry-guess",
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
