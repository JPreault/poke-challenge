import type { RankedMode } from "@prisma/client";

import type { GameMode, GameInterfaceMode } from "@/lib/games/types";

const modeMap: Record<GameMode, RankedMode> = {
  "image-to-name": "IMAGE_TO_NAME",
  "name-to-image": "NAME_TO_IMAGE",
  "letter-input": "LETTER_INPUT",
  "cry-guess": "CRY_GUESS",
  pokedle: "POKEDLE",
  "description-guess": "DESCRIPTION_GUESS",
  "blur-guess": "BLUR_GUESS",
  "zoom-guess": "ZOOM_GUESS",
  shuffle: "SHUFFLE",
};

export function toRankedMode(mode: GameMode): RankedMode | null {
  return modeMap[mode] ?? null;
}

export function toGameMode(mode: RankedMode): GameMode {
  switch (mode) {
    case "IMAGE_TO_NAME":
      return "image-to-name";
    case "NAME_TO_IMAGE":
      return "name-to-image";
    case "LETTER_INPUT":
      return "letter-input";
    case "CRY_GUESS":
      return "cry-guess";
    case "POKEDLE":
      return "pokedle";
    case "DESCRIPTION_GUESS":
      return "description-guess";
    case "BLUR_GUESS":
      return "blur-guess";
    case "ZOOM_GUESS":
      return "zoom-guess";
    case "SHUFFLE":
      return "shuffle";
  }
}

export function toInterfaceMode(dbMode: "ARENA" | "BAC_TRAINING"): GameInterfaceMode {
  return dbMode === "BAC_TRAINING" ? "bac-training" : "arena";
}

export function toDbInterfaceMode(
  mode: GameInterfaceMode,
): "ARENA" | "BAC_TRAINING" {
  return mode === "bac-training" ? "BAC_TRAINING" : "ARENA";
}

export function isRankedInterface(mode: GameInterfaceMode): boolean {
  return mode === "ranked";
}
