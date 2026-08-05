"use client";

import { useCallback, useEffect, useState } from "react";

import { CryGuessRound } from "@/components/game/CryGuessQuiz";
import { GameShell } from "@/components/game/GameShell";
import { ImageToNameRound } from "@/components/game/ImageToNameQuiz";
import { LetterInputRound } from "@/components/game/LetterInputQuiz";
import { NameToImageRound } from "@/components/game/NameToImageQuiz";
import { PokedleRound } from "@/components/game/PokedleQuiz";
import { pickShuffleRoundType } from "@/lib/games/shuffle";
import {
  getShuffleRoundDescription,
  getShuffleRoundLabel,
  type ShuffleRoundType,
} from "@/lib/games/types";
import type { GameSession } from "@/lib/games/useGameSession";

interface ShuffleQuizProps {
  session: GameSession;
  useBacPool?: boolean;
}

export function ShuffleQuiz({ session, useBacPool = true }: ShuffleQuizProps) {
  const [roundType, setRoundType] = useState<ShuffleRoundType | null>(null);
  const [roundKey, setRoundKey] = useState(0);

  const nextShuffleRound = useCallback(() => {
    setRoundType(pickShuffleRoundType(useBacPool));
    setRoundKey((current) => current + 1);
  }, [useBacPool]);

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
      maxWidthClassName={roundType === "pokedle" ? "max-w-7xl" : "max-w-2xl"}
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
              useBacPool={useBacPool}
            />
          ) : null}
          {roundType === "name-to-image" ? (
            <NameToImageRound
              session={session}
              onRoundComplete={nextShuffleRound}
              useBacPool={useBacPool}
            />
          ) : null}
          {roundType === "letter-input" ? (
            <LetterInputRound
              session={session}
              onRoundComplete={nextShuffleRound}
              validationMode={useBacPool ? "free" : "catalog"}
            />
          ) : null}
          {roundType === "cry-guess" ? (
            <CryGuessRound
              session={session}
              onRoundComplete={nextShuffleRound}
            />
          ) : null}
          {roundType === "pokedle" ? (
            <PokedleRound
              session={session}
              onRoundComplete={nextShuffleRound}
            />
          ) : null}
        </div>
      )}
    </GameShell>
  );
}
