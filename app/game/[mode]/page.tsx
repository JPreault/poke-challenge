import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GameClient } from "@/components/game/GameClient";
import { authOptions } from "@/lib/auth/config";
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
  "cry-guess",
  "pokedle",
  "description-guess",
  "blur-guess",
  "zoom-guess",
];
const RANKED_MODES: GameMode[] = [
  "image-to-name",
  "name-to-image",
  "cry-guess",
  "pokedle",
  "description-guess",
  "blur-guess",
  "zoom-guess",
  "shuffle",
];

function parseInterfaceMode(
  value: string | string[] | undefined,
): GameInterfaceMode | null {
  if (value === "bac-training") {
    return "bac-training";
  }
  if (value === "ranked") {
    return "ranked";
  }
  if (value === "arena") {
    return "arena";
  }
  return null;
}

function isAllowedGameMode(
  mode: string,
  interfaceMode: GameInterfaceMode,
): mode is GameMode {
  const allowedModes =
    interfaceMode === "bac-training"
      ? TRAINING_MODES
      : interfaceMode === "ranked"
        ? RANKED_MODES
        : ARENA_MODES;
  return allowedModes.includes(mode as GameMode);
}

export default async function GamePage({
  params,
  searchParams,
}: PageProps<"/game/[mode]">) {
  const { mode } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user?.id);

  const queryInterface = parseInterfaceMode(resolvedSearchParams?.interface);
  let interfaceMode: GameInterfaceMode = queryInterface ?? "arena";

  if (!isAuthenticated) {
    if (queryInterface === "bac-training") {
      redirect(`/game/${mode}`);
    }
    if (queryInterface === "ranked") {
      redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/game/${mode}?interface=ranked`)}`);
    }
    interfaceMode = "arena";
  }

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
