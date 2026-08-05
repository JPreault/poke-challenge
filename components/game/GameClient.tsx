"use client";

import { ImageToNameQuiz } from "@/components/game/ImageToNameQuiz";
import { LetterInputQuiz } from "@/components/game/LetterInputQuiz";
import { NameToImageQuiz } from "@/components/game/NameToImageQuiz";
import { CryGuessQuiz } from "@/components/game/CryGuessQuiz";
import { ShuffleQuiz } from "@/components/game/ShuffleQuiz";
import type { GameMode } from "@/lib/games/types";
import { useGameSession } from "@/lib/games/useGameSession";

interface GameClientProps {
  mode: GameMode;
}

export function GameClient({ mode }: GameClientProps) {
  const session = useGameSession(mode);

  switch (mode) {
    case "image-to-name":
      return <ImageToNameQuiz session={session} />;
    case "name-to-image":
      return <NameToImageQuiz session={session} />;
    case "letter-input":
      return <LetterInputQuiz session={session} />;
    case "cry-guess":
      return <CryGuessQuiz session={session} />;
    case "shuffle":
      return <ShuffleQuiz session={session} />;
  }
}
