"use client";

import { GameShell } from "@/components/game/GameShell";
import { MysteryImageRound } from "@/components/game/MysteryImageRound";
import type { GameSession } from "@/lib/games/useGameSession";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
  useBacPool?: boolean;
}

interface ZoomGuessQuizProps {
  session: GameSession;
  useBacPool?: boolean;
}

export function ZoomGuessRound({
  session,
  onRoundComplete,
  useBacPool = true,
}: RoundProps) {
  return (
    <MysteryImageRound
      session={session}
      kind="zoom"
      question="Quel est ce Pokémon zoomé ?"
      inputId="zoom-guess"
      useBacPool={useBacPool}
      onRoundComplete={onRoundComplete}
    />
  );
}

export function ZoomGuessQuiz({
  session,
  useBacPool = true,
}: ZoomGuessQuizProps) {
  return (
    <GameShell
      session={session}
      title="Image zoomer"
      description="Devine le Pokémon à partir d'une image ultra zoomée. À chaque tentative, l'image se dézoome légèrement."
    >
      <ZoomGuessRound
        key={session.sessionEpoch}
        session={session}
        useBacPool={useBacPool}
      />
    </GameShell>
  );
}
