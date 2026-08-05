import { notFound } from "next/navigation";

import { GameClient } from "@/components/game/GameClient";
import { parseShuffleGamesParam } from "@/lib/games/shuffle";
import type { GameInterfaceMode, GameMode } from "@/lib/games/types";

const TRAINING_MODES: GameMode[] = [
  "shuffle",
  "image-to-name",
  "name-to-image",
  "letter-input",
  "blur-guess",
  "zoom-guess",
];
const ARENA_MODES: GameMode[] = [
  "shuffle",
  "image-to-name",
  "name-to-image",
  "letter-input",
  "cry-guess",
  "pokedle",
  "description-guess",
  "blur-guess",
  "zoom-guess",
];

function parseInterfaceMode(value: string | string[] | undefined): GameInterfaceMode {
  if (value === "bac-training") {
    return "bac-training";
  }

  return "arena";
}

function isAllowedGameMode(mode: string, interfaceMode: GameInterfaceMode): mode is GameMode {
  const allowedModes = interfaceMode === "bac-training" ? TRAINING_MODES : ARENA_MODES;
  return allowedModes.includes(mode as GameMode);
}

export default async function GamePage({
  params,
  searchParams,
}: PageProps<"/game/[mode]">) {
  const { mode } = await params;
  const resolvedSearchParams = await searchParams;
  const interfaceMode = parseInterfaceMode(resolvedSearchParams?.interface);

  if (!isAllowedGameMode(mode, interfaceMode)) {
    notFound();
  }

  const selectedShuffleRoundTypes =
    mode === "shuffle"
      ? parseShuffleGamesParam(
          resolvedSearchParams?.games,
          interfaceMode === "bac-training",
        )
      : [];

  return (
    <GameClient
      mode={mode}
      interfaceMode={interfaceMode}
      selectedShuffleRoundTypes={selectedShuffleRoundTypes}
    />
  );
}
