"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { Button } from "@/components/ui/button";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getCatalogPokemon, getFrenchIndex } from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

type HintStatus = "correct" | "partial" | "wrong";
type Direction = "up" | "down" | "equal";

interface AttemptHints {
  generation: HintStatus;
  type1: HintStatus;
  type2: HintStatus;
  habitat: HintStatus;
  colors: HintStatus;
  evolutionStage: HintStatus;
  heightM: HintStatus;
  weightKg: HintStatus;
}

interface AttemptRow {
  guess: QuizPokemon;
  hints: AttemptHints;
  directions: {
    generation: Direction;
    evolutionStage: Direction;
    heightM: Direction;
    weightKg: Direction;
  };
  isCorrect: boolean;
}

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

function toUniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function areSameSets(left: string[], right: string[]) {
  const a = toUniqueSorted(left);
  const b = toUniqueSorted(right);
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function hasIntersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function getTypeSlotStatus(
  guessTypes: string[],
  targetTypes: string[],
  slotIndex: 0 | 1,
): HintStatus {
  const guessedType = guessTypes[slotIndex] ?? null;
  const targetType = targetTypes[slotIndex] ?? null;

  if (guessedType === targetType) {
    return "correct";
  }

  if (guessedType && targetTypes.includes(guessedType)) {
    return "partial";
  }

  return "wrong";
}

function getSetStatus(guessValues: string[], targetValues: string[]): HintStatus {
  if (areSameSets(guessValues, targetValues)) {
    return "correct";
  }

  if (hasIntersection(guessValues, targetValues)) {
    return "partial";
  }

  return "wrong";
}

function buildHints(guess: QuizPokemon, target: QuizPokemon): AttemptHints {
  return {
    generation: guess.generation === target.generation ? "correct" : "wrong",
    type1: getTypeSlotStatus(guess.types, target.types, 0),
    type2: getTypeSlotStatus(guess.types, target.types, 1),
    habitat: guess.habitat === target.habitat ? "correct" : "wrong",
    colors: getSetStatus(guess.colors, target.colors),
    evolutionStage:
      guess.evolutionStage === target.evolutionStage ? "correct" : "wrong",
    heightM: guess.heightM === target.heightM ? "correct" : "wrong",
    weightKg: guess.weightKg === target.weightKg ? "correct" : "wrong",
  };
}

function getDirection(guessValue: number, targetValue: number): Direction {
  if (guessValue === targetValue) return "equal";
  return guessValue < targetValue ? "up" : "down";
}

function getDirectionSymbol(direction: Direction) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "•";
}

function hintCellClass(status: HintStatus) {
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
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const frenchIndex = useMemo(() => getFrenchIndex(), []);
  const catalogById = useMemo(
    () => new Map(catalog.map((pokemon) => [pokemon.id, pokemon])),
    [catalog],
  );
  const [target, setTarget] = useState<QuizPokemon>(() => pickRandom(catalog));
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [guessName, setGuessName] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [isSolved, setIsSolved] = useState(false);
  const [wasAbandoned, setWasAbandoned] = useState(false);

  const excludedIds = useMemo(
    () => attempts.map((attempt) => attempt.guess.id),
    [attempts],
  );

  const resetRound = useCallback(() => {
    setTarget(pickRandom(catalog));
    setAttempts([]);
    setGuessName("");
    setFeedback("");
    setIsSolved(false);
    setWasAbandoned(false);
  }, [catalog]);

  const advanceRound = useCallback(() => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    resetRound();
  }, [onRoundComplete, resetRound]);

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeFrenchName(guessName);

    if (!normalized) return;

    const indexed = frenchIndex[normalized];
    if (!indexed) {
      setFeedback("Ce Pokémon est introuvable dans le Pokédex.");
      return;
    }

    const guessedPokemon = catalogById.get(indexed.id);
    if (!guessedPokemon) {
      setFeedback("Impossible de charger les données de ce Pokémon.");
      return;
    }

    const isCorrect = guessedPokemon.id === target.id;
    const nextAttempt: AttemptRow = {
      guess: guessedPokemon,
      hints: buildHints(guessedPokemon, target),
      directions: {
        generation: getDirection(guessedPokemon.generation, target.generation),
        evolutionStage: getDirection(
          guessedPokemon.evolutionStage,
          target.evolutionStage,
        ),
        heightM: getDirection(guessedPokemon.heightM, target.heightM),
        weightKg: getDirection(guessedPokemon.weightKg, target.weightKg),
      },
      isCorrect,
    };

    setAttempts((current) => [nextAttempt, ...current]);
    setGuessName("");
    setIsSolved(isCorrect);
    setFeedback(
      isCorrect
        ? `Bravo ! Le Pokémon à trouver était ${target.nameFr}.`
        : "Continue, les indices sont mis à jour.",
    );
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    session.recordRound({
      question: "Trouve le Pokémon mystère",
      userAnswer: guessedPokemon.nameFr,
      correctAnswer: target.nameFr,
      isCorrect,
    });
  };

  const handleSkip = () => {
    if (isSolved) return;

    session.recordRound({
      question: "Trouve le Pokémon mystère",
      userAnswer: "Abandon",
      correctAnswer: target.nameFr,
      isCorrect: false,
    });

    setGuessName("");
    setWasAbandoned(true);
    setIsSolved(true);
    setFeedback(`Abandonné. C'était ${target.nameFr}.`);
  };

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
          {!isSolved ? (
            <Button type="button" size="lg" variant="outline" onClick={handleSkip}>
              Passer
            </Button>
          ) : null}
          {isSolved && !onRoundComplete ? (
            <Button type="button" size="lg" variant="outline" onClick={advanceRound}>
              Suivant
            </Button>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        {isSolved ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-40 w-40">
              <Image
                src={target.artwork}
                alt={target.nameFr}
                fill
                sizes="160px"
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
              <AttemptCells key={`${attempt.guess.id}-${index}`} attempt={attempt} />
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

function AttemptCells({ attempt }: { attempt: AttemptRow }) {
  const { guess, hints, isCorrect, directions } = attempt;

  return (
    <>
      <div className={hintCellClass(isCorrect ? "correct" : "wrong")}>
        <div className="flex h-full items-center justify-center">
          <div className="relative h-16 w-16">
            <Image
              src={guess.sprite}
              alt={guess.nameFr}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
        </div>
      </div>
      <div className={hintCellClass(hints.generation)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{`Gen ${guess.generation}`}</span>
          {hints.generation !== "correct" ? (
            <span className="text-base">{getDirectionSymbol(directions.generation)}</span>
          ) : null}
        </div>
      </div>
      <div className={hintCellClass(hints.type1)}>
        <div className="flex h-full items-center justify-center">{guess.types[0] ?? "Aucun"}</div>
      </div>
      <div className={hintCellClass(hints.type2)}>
        <div className="flex h-full items-center justify-center">{guess.types[1] ?? "Aucun"}</div>
      </div>
      <div className={hintCellClass(hints.habitat)}>
        <div className="flex h-full items-center justify-center">
          {guess.habitat ?? "Aucun"}
        </div>
      </div>
      <div className={hintCellClass(hints.colors)}>
        <div className="flex h-full items-center justify-center">{formatList(guess.colors)}</div>
      </div>
      <div className={hintCellClass(hints.evolutionStage)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{guess.evolutionStage}</span>
          {hints.evolutionStage !== "correct" ? (
            <span className="text-base">
              {getDirectionSymbol(directions.evolutionStage)}
            </span>
          ) : null}
        </div>
      </div>
      <div className={hintCellClass(hints.heightM)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{`${guess.heightM} m`}</span>
          {hints.heightM !== "correct" ? (
            <span className="text-base">{getDirectionSymbol(directions.heightM)}</span>
          ) : null}
        </div>
      </div>
      <div className={hintCellClass(hints.weightKg)}>
        <div className="flex h-full items-center justify-center gap-1">
          <span>{`${guess.weightKg} kg`}</span>
          {hints.weightKg !== "correct" ? (
            <span className="text-base">{getDirectionSymbol(directions.weightKg)}</span>
          ) : null}
        </div>
      </div>
    </>
  );
}
