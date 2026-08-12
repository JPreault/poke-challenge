"use client";

import { GameShell } from "@/components/game/GameShell";
import { MysteryImageRound } from "@/components/game/MysteryImageRound";
import type { GameSession } from "@/lib/games/useGameSession";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
  useBacPool?: boolean;
}

interface BlurGuessQuizProps {
  session: GameSession;
  useBacPool?: boolean;
}

export function BlurGuessRound({
  session,
  onRoundComplete,
  useBacPool = true,
}: RoundProps) {
  return (
    <MysteryImageRound
      session={session}
      kind="blur"
      question="Quel est ce Pokémon flouté ?"
      inputId="blur-guess"
      useBacPool={useBacPool}
      onRoundComplete={onRoundComplete}
      enableGrayscaleToggle
    />
  );
}

export function BlurGuessQuiz({
  session,
  useBacPool = true,
}: BlurGuessQuizProps) {
  return (
    <GameShell
      session={session}
      title="Image flou"
      description="Devine le Pokémon à partir d'une image floutée. À chaque tentative, l'image se dévoile légèrement."
    >
      <BlurGuessRound
        key={session.sessionEpoch}
        session={session}
        useBacPool={useBacPool}
      />
    </GameShell>
  );
}
