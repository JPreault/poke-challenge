"use client";

import { BlurGuessQuiz } from "@/components/game/BlurGuessQuiz";
import { ImageToNameQuiz } from "@/components/game/ImageToNameQuiz";
import { LetterInputQuiz } from "@/components/game/LetterInputQuiz";
import { NameToImageQuiz } from "@/components/game/NameToImageQuiz";
import { CryGuessQuiz } from "@/components/game/CryGuessQuiz";
import { DescriptionGuessQuiz } from "@/components/game/DescriptionGuessQuiz";
import { ShuffleQuiz } from "@/components/game/ShuffleQuiz";
import { PokedleQuiz } from "@/components/game/PokedleQuiz";
import type { GameInterfaceMode, GameMode } from "@/lib/games/types";
import { useGameSession } from "@/lib/games/useGameSession";

interface GameClientProps {
  mode: GameMode;
  interfaceMode: GameInterfaceMode;
}

export function GameClient({ mode, interfaceMode }: GameClientProps) {
  const session = useGameSession(mode);
  const useBacPool = interfaceMode === "bac-training";

  switch (mode) {
    case "image-to-name":
      return (
        <ImageToNameQuiz
          session={session}
          useBacPool={useBacPool}
        />
      );
    case "name-to-image":
      return (
        <NameToImageQuiz
          session={session}
          useBacPool={useBacPool}
        />
      );
    case "letter-input":
      return (
        <LetterInputQuiz
          session={session}
          validationMode={useBacPool ? "free" : "catalog"}
        />
      );
    case "cry-guess":
      return <CryGuessQuiz session={session} />;
    case "shuffle":
      return <ShuffleQuiz session={session} useBacPool={useBacPool} />;
    case "pokedle":
      return <PokedleQuiz session={session} />;
    case "description-guess":
      return <DescriptionGuessQuiz session={session} />;
    case "blur-guess":
      return <BlurGuessQuiz session={session} useBacPool={useBacPool} />;
  }
}
