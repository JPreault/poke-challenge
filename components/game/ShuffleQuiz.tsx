"use client";

import { useCallback, useEffect, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { ImageToNameRound } from "@/components/game/ImageToNameQuiz";
import { LetterInputRound } from "@/components/game/LetterInputQuiz";
import { NameToImageRound } from "@/components/game/NameToImageQuiz";
import { CryGuessRound } from "@/components/game/CryGuessQuiz";
import { pickShuffleRoundType } from "@/lib/games/shuffle";
import {
  getShuffleRoundDescription,
  getShuffleRoundLabel,
  type ShuffleRoundType,
} from "@/lib/games/types";
import type { GameSession } from "@/lib/games/useGameSession";

interface ShuffleQuizProps {
  session: GameSession;
}

export function ShuffleQuiz({ session }: ShuffleQuizProps) {
  const [roundType, setRoundType] = useState<ShuffleRoundType | null>(null);
  const [roundKey, setRoundKey] = useState(0);

  const nextShuffleRound = useCallback(() => {
    setRoundType(pickShuffleRoundType());
    setRoundKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(nextShuffleRound, 0);
    return () => window.clearTimeout(timeoutId);
  }, [nextShuffleRound]);

  const roundLabel = roundType ? getShuffleRoundLabel(roundType) : "Shuffle";
  const roundDescription = roundType
    ? getShuffleRoundDescription(roundType)
    : "Un mini-jeu aléatoire à chaque manche.";

  return (
    <GameShell
      session={session}
      title={roundLabel}
      description={roundDescription}
      modeLabel="Shuffle"
    >
      {!roundType ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Préparation de la manche…
        </div>
      ) : (
        <div key={roundKey}>
          {roundType === "image-to-name" ? (
            <ImageToNameRound
              session={session}
              onRoundComplete={nextShuffleRound}
            />
          ) : null}
          {roundType === "name-to-image" ? (
            <NameToImageRound
              session={session}
              onRoundComplete={nextShuffleRound}
            />
          ) : null}
          {roundType === "letter-input" ? (
            <LetterInputRound
              session={session}
              onRoundComplete={nextShuffleRound}
            />
          ) : null}
          {roundType === "cry-guess" ? (
            <CryGuessRound
              session={session}
              onRoundComplete={nextShuffleRound}
            />
          ) : null}
        </div>
      )}
    </GameShell>
  );
}
