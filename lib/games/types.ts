export type GameMode =
  | "image-to-name"
  | "name-to-image"
  | "letter-input"
  | "cry-guess"
  | "shuffle"
  | "pokedle"
  | "description-guess";

export type GameInterfaceMode = "bac-training" | "arena";

export type BacShuffleRoundType = "image-to-name" | "name-to-image" | "letter-input";

export type ArenaShuffleRoundType =
  | BacShuffleRoundType
  | "cry-guess"
  | "pokedle"
  | "description-guess";

export type ShuffleRoundType = BacShuffleRoundType | ArenaShuffleRoundType;

export const BAC_SHUFFLE_ROUND_TYPES: BacShuffleRoundType[] = [
  "image-to-name",
  "name-to-image",
  "letter-input",
];

export const ARENA_SHUFFLE_ROUND_TYPES: ArenaShuffleRoundType[] = [
  "image-to-name",
  "name-to-image",
  "letter-input",
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
