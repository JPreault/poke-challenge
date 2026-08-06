export type MysteryKind = "blur" | "zoom";
/** `training` = liste perso connectée ; `bac` conservé pour compat tokens anciens. */
export type MysteryPool = "training" | "catalog" | "bac";

export function normalizeMysteryPool(pool: MysteryPool): "training" | "catalog" {
  return pool === "catalog" ? "catalog" : "training";
}

export interface MysteryReveal {
  id: number;
  nameFr: string;
  sprite: string;
  artwork: string;
}

export interface MysteryStartResult {
  token: string;
  artworkUrl: string;
}

export type MysteryGuessResult =
  | {
      status: "correct";
      reveal: MysteryReveal;
    }
  | {
      status: "wrong";
      wrongGuess: MysteryReveal;
    }
  | {
      status: "not_found";
      message: string;
    }
  | {
      status: "not_in_pool";
      message: string;
    }
  | {
      status: "invalid_token";
      message: string;
    };

export type MysterySkipResult =
  | { status: "ok"; reveal: MysteryReveal }
  | { status: "invalid_token"; message: string };
