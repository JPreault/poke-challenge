"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { Button } from "@/components/ui/button";
import type {
  AttemptHints,
  Direction,
  PokedleAttempt,
} from "@/lib/games/pokedle-types";
import type { GameSession } from "@/lib/games/useGameSession";
import { getSearchCatalog } from "@/lib/pokemon/client-data";
import { cn } from "@/lib/utils";

const POKEDEX_COLUMNS = [
  "Pokémon",
  "Génération",
  "Type 1",
  "Type 2",
  "Habitat",
  "Couleur(s)",
  "Stade d'évolution",
  "Hauteur",
  "Poids",
] as const;

function formatList(values: string[]) {
  if (values.length === 0) return "Aucun";
  return values.join(", ");
}

function getHintAccuracyPercent(hints: AttemptHints): number {
  const values = Object.values(hints);
  const correctCount = values.filter((status) => status === "correct").length;
  return Math.round((correctCount / values.length) * 100);
}

function getDirectionSymbol(direction: Direction) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "•";
}

function hintCellClass(status: AttemptHints[keyof AttemptHints]) {
  return cn(
    "aspect-square w-28 min-w-28 rounded-lg border px-2 py-2 text-center text-[11px] leading-tight font-medium",
    status === "correct" &&
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    status === "partial" &&
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    status === "wrong" &&
      "border-poke-red/40 bg-poke-red/5 text-poke-red dark:bg-poke-red/10",
  );
}

export function PokedleRound({
  session,
  onRoundComplete,
}: {
  session: GameSession;
  onRoundComplete?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => getSearchCatalog(), []);
  const [token, setToken] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<PokedleAttempt[]>([]);
  const [guessName, setGuessName] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [isSolved, setIsSolved] = useState(false);
  const [wasAbandoned, setWasAbandoned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [solvedName, setSolvedName] = useState<string | null>(null);
  const [solvedArtworkUrl, setSolvedArtworkUrl] = useState<string | null>(null);

  const excludedIds = useMemo(
    () => attempts.map((attempt) => {
      const match = catalog.find((entry) => entry.nameFr === attempt.nameFr);
      return match?.id ?? -1;
    }).filter((id) => id >= 0),
    [attempts, catalog],
  );

  const startRound = useCallback(async () => {
    setIsLoading(true);
    setToken(null);
    setAttempts([]);
    setGuessName("");
    setFeedback("");
    setIsSolved(false);
    setWasAbandoned(false);
    setSolvedName(null);
    setSolvedArtworkUrl(null);

    try {
      const response = await fetch("/api/games/pokedle/start", {
        method: "POST",
      });

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      setToken(result.token);
      setIsLoading(false);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch {
      setIsLoading(false);
    }
  }, []);

  const resetRound = useCallback(() => {
    void startRound();
  }, [startRound]);

  const advanceRound = useCallback(() => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    resetRound();
  }, [onRoundComplete, resetRound]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void startRound();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [startRound]);

  useEffect(() => {
    if (!isSolved || !onRoundComplete) return;

    const timeoutId = window.setTimeout(onRoundComplete, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [isSolved, onRoundComplete]);

  useEffect(() => {
    if (!isSolved) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      event.preventDefault();
      advanceRound();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSolved, advanceRound]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isSolved || !guessName.trim()) return;

    try {
      const response = await fetch("/api/games/pokedle/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answer: guessName }),
      });
      const result = await response.json();

      if (result.status === "not_found" || result.status === "invalid_token") {
        setFeedback(result.message);
        return;
      }

      if (result.status === "correct") {
        setAttempts((current) => [result.attempt, ...current]);
        setGuessName("");
        setIsSolved(true);
        setSolvedName(result.targetNameFr);
        setSolvedArtworkUrl(result.targetArtworkUrl);
        setFeedback(`Bravo ! Le Pokémon à trouver était ${result.targetNameFr}.`);
        session.recordRound({
          question: "Trouve le Pokémon mystère",
          userAnswer: result.attempt.nameFr,
          correctAnswer: result.targetNameFr,
          isCorrect: true,
          attemptCount: attempts.length + 1,
          chosenLabel: result.attempt.nameFr,
          correctImage: result.targetArtworkUrl,
          hintAccuracyPercent: 100,
        });
        return;
      }

      if (result.status === "wrong") {
        setAttempts((current) => [result.attempt, ...current]);
        setGuessName("");
        setFeedback("Continue, les indices sont mis à jour.");
        window.setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    } catch {
      setFeedback("Erreur de validation. Réessaie.");
    }
  };

  const handleSkip = useCallback(async () => {
    if (!token || isSolved) return;

    try {
      const response = await fetch("/api/games/pokedle/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();

      if (result.status !== "ok") {
        setFeedback(result.message);
        return;
      }

      const lastAttempt = attempts[0];

      session.recordRound({
        question: "Trouve le Pokémon mystère",
        userAnswer: "Abandon",
        correctAnswer: result.targetNameFr,
        isCorrect: false,
        skipped: true,
        attemptCount: attempts.length,
        chosenLabel: lastAttempt?.nameFr,
        correctImage: result.targetArtworkUrl,
        hintAccuracyPercent: lastAttempt
          ? getHintAccuracyPercent(lastAttempt.hints)
          : 0,
      });

      setSolvedName(result.targetNameFr);
      setSolvedArtworkUrl(result.targetArtworkUrl);
      setGuessName("");
      setWasAbandoned(true);
      setIsSolved(true);
      setFeedback(`Abandonné. C'était ${result.targetNameFr}.`);
    } catch {
      setFeedback("Impossible d'abandonner la manche.");
    }
  }, [attempts, isSolved, session, token]);

  useRegisterSkip(handleSkip, Boolean(token) && !isSolved);

  if (isLoading || !token) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label htmlFor="pokedle-guess" className="block text-sm font-medium">
          Nom du Pokémon
        </label>
        <div className="flex flex-col gap-3 lg:flex-row">
          <PokemonSearchInput
            id="pokedle-guess"
            value={guessName}
            onChange={setGuessName}
            onInputActivity={() => setFeedback("")}
            catalog={catalog}
            excludedIds={excludedIds}
            readOnly={isSolved}
            inputRef={inputRef}
            className="lg:max-w-xl"
          />
          <Button type="submit" size="lg" disabled={!guessName.trim() || isSolved}>
            Valider
          </Button>
          {isSolved && !onRoundComplete ? (
            <Button type="button" size="lg" variant="outline" onClick={advanceRound}>
              Suivant
            </Button>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        {isSolved && solvedArtworkUrl ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-40 w-40">
              <Image
                src={solvedArtworkUrl}
                alt={solvedName ?? "Pokémon"}
                fill
                sizes="160px"
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        ) : null}

        <p
          className={cn(
            "min-h-6 text-sm",
            isSolved && !wasAbandoned && "feedback-success",
            isSolved && wasAbandoned && "text-muted-foreground",
            !isSolved && "text-muted-foreground",
            feedback.includes("introuvable") && "feedback-error",
          )}
        >
          {feedback}
        </p>
      </div>

      {attempts.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-275 grid-cols-9 gap-3">
            {POKEDEX_COLUMNS.map((column) => (
              <div
                key={column}
                className="aspect-square w-28 min-w-28 rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <div className="flex h-full items-center justify-center">{column}</div>
              </div>
            ))}

            {attempts.map((attempt, index) => (
              <AttemptCells key={`${attempt.nameFr}-${index}`} attempt={attempt} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PokedleQuiz({ session }: { session: GameSession }) {
  return (
    <GameShell
      session={session}
      title="Pokédle"
      description="Propose un Pokémon et compare ses caractéristiques pour trouver le Pokémon mystère."
      maxWidthClassName="max-w-7xl"
    >
      <PokedleRound session={session} />
    </GameShell>
  );
}

function AttemptCells({ attempt }: { attempt: PokedleAttempt }) {
  const { hints, isCorrect, directions } = attempt;

  return (
    <>
      <div className={hintCellClass(isCorrect ? "correct" : "wrong")}>
        <div className="flex h-full items-center justify-center">
          <div className="relative h-16 w-16">
            <Image
              src={attempt.spriteUrl}
              alt={attempt.nameFr}
              fill
              sizes="64px"
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
      </div>
      <div className={hintCellClass(hints.generation)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{`Gen ${attempt.generation}`}</span>
          {hints.generation !== "correct" ? (
            <span className="text-base">{getDirectionSymbol(directions.generation)}</span>
          ) : null}
        </div>
      </div>
      <div className={hintCellClass(hints.type1)}>
        <div className="flex h-full items-center justify-center">{attempt.types[0] ?? "Aucun"}</div>
      </div>
      <div className={hintCellClass(hints.type2)}>
        <div className="flex h-full items-center justify-center">{attempt.types[1] ?? "Aucun"}</div>
      </div>
      <div className={hintCellClass(hints.habitat)}>
        <div className="flex h-full items-center justify-center">
          {attempt.habitat ?? "Aucun"}
        </div>
      </div>
      <div className={hintCellClass(hints.colors)}>
        <div className="flex h-full items-center justify-center">{formatList(attempt.colors)}</div>
      </div>
      <div className={hintCellClass(hints.evolutionStage)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{attempt.evolutionStage}</span>
          {hints.evolutionStage !== "correct" ? (
            <span className="text-base">
              {getDirectionSymbol(directions.evolutionStage)}
            </span>
          ) : null}
        </div>
      </div>
      <div className={hintCellClass(hints.heightM)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{`${attempt.heightM} m`}</span>
          {hints.heightM !== "correct" ? (
            <span className="text-base">{getDirectionSymbol(directions.heightM)}</span>
          ) : null}
        </div>
      </div>
      <div className={hintCellClass(hints.weightKg)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{`${attempt.weightKg} kg`}</span>
          {hints.weightKg !== "correct" ? (
            <span className="text-base">{getDirectionSymbol(directions.weightKg)}</span>
          ) : null}
        </div>
      </div>
    </>
  );
}
