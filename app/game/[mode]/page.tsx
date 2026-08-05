import { notFound } from "next/navigation";

import { GameClient } from "@/components/game/GameClient";
import type { GameMode } from "@/lib/games/types";

const VALID_MODES: GameMode[] = [
  "image-to-name",
  "name-to-image",
  "letter-input",
  "cry-guess",
  "shuffle",
  "pokedle",
];

function isGameMode(value: string): value is GameMode {
  return VALID_MODES.includes(value as GameMode);
}

export default async function GamePage({
  params,
}: PageProps<"/game/[mode]">) {
  const { mode } = await params;

  if (!isGameMode(mode)) {
    notFound();
  }

  return <GameClient mode={mode} />;
}
