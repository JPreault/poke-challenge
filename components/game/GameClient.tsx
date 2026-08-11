"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { BlurGuessQuiz } from "@/components/game/BlurGuessQuiz";
import { ZoomGuessQuiz } from "@/components/game/ZoomGuessQuiz";
import { ImageToNameQuiz } from "@/components/game/ImageToNameQuiz";
import { LetterInputQuiz } from "@/components/game/LetterInputQuiz";
import { NameToImageQuiz } from "@/components/game/NameToImageQuiz";
import { CryGuessQuiz } from "@/components/game/CryGuessQuiz";
import { DescriptionGuessQuiz } from "@/components/game/DescriptionGuessQuiz";
import { ShuffleQuiz } from "@/components/game/ShuffleQuiz";
import { ShuffleSetup } from "@/components/game/ShuffleSetup";
import { PokedleQuiz } from "@/components/game/PokedleQuiz";
import { RankedSessionProvider } from "@/components/game/RankedSessionContext";
import { parseShuffleGamesParam } from "@/lib/games/shuffle";
import type {
  GameInterfaceMode,
  GameMode,
  ShuffleRoundType,
} from "@/lib/games/types";
import { useGameSession } from "@/lib/games/useGameSession";

interface GameClientProps {
  mode: GameMode;
  interfaceMode: GameInterfaceMode;
  selectedShuffleRoundTypes?: ShuffleRoundType[];
}

export function GameClient({
  mode,
  interfaceMode,
  selectedShuffleRoundTypes = [],
}: GameClientProps) {
  const session = useGameSession(mode);
  const searchParams = useSearchParams();
  const isRanked = interfaceMode === "ranked";
  const useBacPool = interfaceMode === "bac-training";

  const gamesParam = searchParams.get("games") ?? "";
  const serverGamesKey = selectedShuffleRoundTypes.join(",");

  const selectedShuffleTypes = useMemo(() => {
    const fromUrl = parseShuffleGamesParam(gamesParam || undefined, useBacPool);
    if (fromUrl.length > 0) {
      return fromUrl;
    }
    return parseShuffleGamesParam(serverGamesKey || undefined, useBacPool);
  }, [gamesParam, useBacPool, serverGamesKey]);

  const content = (() => {
    switch (mode) {
      case "image-to-name":
        return <ImageToNameQuiz session={session} useBacPool={useBacPool} />;
      case "name-to-image":
        return <NameToImageQuiz session={session} useBacPool={useBacPool} />;
      case "letter-input":
        return (
          <LetterInputQuiz
            session={session}
            validationMode={useBacPool ? "training" : "catalog"}
          />
        );
      case "cry-guess":
        return <CryGuessQuiz session={session} />;
      case "shuffle":
        if (selectedShuffleTypes.length === 0) {
          return <ShuffleSetup interfaceMode={interfaceMode} />;
        }

        return (
          <ShuffleQuiz
            key={selectedShuffleTypes.join(",")}
            session={session}
            selectedRoundTypes={selectedShuffleTypes}
            useBacPool={useBacPool}
            interfaceMode={interfaceMode}
          />
        );
      case "pokedle":
        return <PokedleQuiz session={session} />;
      case "description-guess":
        return <DescriptionGuessQuiz session={session} />;
      case "blur-guess":
        return <BlurGuessQuiz session={session} useBacPool={useBacPool} />;
      case "zoom-guess":
        return <ZoomGuessQuiz session={session} useBacPool={useBacPool} />;
    }
  })();

  if (isRanked) {
    return (
      <RankedSessionProvider mode={mode} session={session}>
        {content}
      </RankedSessionProvider>
    );
  }

  return content;
}
