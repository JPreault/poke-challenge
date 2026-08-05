"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BlurGuessRound } from "@/components/game/BlurGuessQuiz";
import { ZoomGuessRound } from "@/components/game/ZoomGuessQuiz";
import { CryGuessRound } from "@/components/game/CryGuessQuiz";
import { DescriptionGuessRound } from "@/components/game/DescriptionGuessQuiz";
import { GameShell } from "@/components/game/GameShell";
import { ImageToNameRound } from "@/components/game/ImageToNameQuiz";
import { LetterInputRound } from "@/components/game/LetterInputQuiz";
import { NameToImageRound } from "@/components/game/NameToImageQuiz";
import { PokedleRound } from "@/components/game/PokedleQuiz";
import {
  buildShuffleGamesQuery,
  createShuffleDeck,
  drawNextShuffleRoundType,
} from "@/lib/games/shuffle";
import {
  getShuffleRoundDescription,
  getShuffleRoundLabel,
  type GameInterfaceMode,
  type ShuffleRoundType,
} from "@/lib/games/types";
import type { GameSession } from "@/lib/games/useGameSession";

interface ShuffleQuizProps {
  session: GameSession;
  selectedRoundTypes: ShuffleRoundType[];
  useBacPool?: boolean;
  interfaceMode?: GameInterfaceMode;
}

export function ShuffleQuiz({
  session,
  selectedRoundTypes,
  useBacPool = true,
  interfaceMode = "arena",
}: ShuffleQuizProps) {
  const [roundType, setRoundType] = useState<ShuffleRoundType | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const deckRef = useRef<ShuffleRoundType[]>([]);

  const drawRound = useCallback(() => {
    const { nextType, remainingDeck } = drawNextShuffleRoundType(
      deckRef.current,
      selectedRoundTypes,
    );
    deckRef.current = remainingDeck;
    setRoundType(nextType);
    setRoundKey((current) => current + 1);
  }, [selectedRoundTypes]);

  useEffect(() => {
    deckRef.current = createShuffleDeck(selectedRoundTypes);
    const timeoutId = window.setTimeout(drawRound, 0);
    return () => window.clearTimeout(timeoutId);
  }, [drawRound, selectedRoundTypes]);

  const roundLabel = roundType ? getShuffleRoundLabel(roundType) : "Shuffle";
  const roundDescription = roundType
    ? getShuffleRoundDescription(roundType)
    : "Un mini-jeu aléatoire à chaque manche.";

  const gamesQuery = buildShuffleGamesQuery(selectedRoundTypes);
  const replayParams = new URLSearchParams({ games: gamesQuery });
  if (interfaceMode === "bac-training") {
    replayParams.set("interface", "bac-training");
  }
  const homeHref =
    interfaceMode === "bac-training" ? "/?interface=bac-training" : "/";
  const replayHref = `/game/shuffle?${replayParams.toString()}`;

  return (
    <GameShell
      session={session}
      title={roundLabel}
      description={roundDescription}
      modeLabel="Shuffle"
      homeHref={homeHref}
      replayHref={replayHref}
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
              onRoundComplete={drawRound}
              useBacPool={useBacPool}
            />
          ) : null}
          {roundType === "name-to-image" ? (
            <NameToImageRound
              session={session}
              onRoundComplete={drawRound}
              useBacPool={useBacPool}
            />
          ) : null}
          {roundType === "letter-input" ? (
            <LetterInputRound
              session={session}
              onRoundComplete={drawRound}
              validationMode={useBacPool ? "free" : "catalog"}
            />
          ) : null}
          {roundType === "cry-guess" ? (
            <CryGuessRound session={session} onRoundComplete={drawRound} />
          ) : null}
          {roundType === "pokedle" ? (
            <PokedleRound session={session} onRoundComplete={drawRound} />
          ) : null}
          {roundType === "description-guess" ? (
            <DescriptionGuessRound
              session={session}
              onRoundComplete={drawRound}
            />
          ) : null}
          {roundType === "blur-guess" ? (
            <BlurGuessRound
              session={session}
              onRoundComplete={drawRound}
              useBacPool={useBacPool}
            />
          ) : null}
          {roundType === "zoom-guess" ? (
            <ZoomGuessRound
              session={session}
              onRoundComplete={drawRound}
              useBacPool={useBacPool}
            />
          ) : null}
        </div>
      )}
    </GameShell>
  );
}
