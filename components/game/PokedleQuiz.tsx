"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function PokedleQuiz({ session }: { session: GameSession }) {
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState<number>(-1);

  const filteredSuggestions = useMemo(() => {
    const normalized = normalizeFrenchName(guessName);
    if (!normalized) return [];

    return catalog
      .filter((pokemon) => normalizeFrenchName(pokemon.nameFr).includes(normalized))
      .sort((a, b) => a.nameFr.localeCompare(b.nameFr))
      .slice(0, 8);
  }, [catalog, guessName]);

  const canShowSuggestions = showSuggestions && filteredSuggestions.length > 0 && !isSolved;

  const resetRound = () => {
    setTarget(pickRandom(catalog));
    setAttempts([]);
    setGuessName("");
    setFeedback("");
    setIsSolved(false);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
  };

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
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
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

  const handleSelectSuggestion = (pokemon: QuizPokemon) => {
    setGuessName(pokemon.nameFr);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSolved) return;

    if (event.key === "ArrowDown") {
      if (filteredSuggestions.length === 0) return;
      event.preventDefault();
      setShowSuggestions(true);
      setHighlightedSuggestionIndex((current) =>
        current < filteredSuggestions.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      if (filteredSuggestions.length === 0) return;
      event.preventDefault();
      setShowSuggestions(true);
      setHighlightedSuggestionIndex((current) =>
        current > 0 ? current - 1 : filteredSuggestions.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      if (canShowSuggestions && highlightedSuggestionIndex >= 0) {
        event.preventDefault();
        handleSelectSuggestion(filteredSuggestions[highlightedSuggestionIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedSuggestionIndex(-1);
    }
  };

  const handleSuggestionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = index < filteredSuggestions.length - 1 ? index + 1 : 0;
      setHighlightedSuggestionIndex(nextIndex);
      const nextButton = document.getElementById(
        `pokedle-suggestion-${nextIndex}`,
      ) as HTMLButtonElement | null;
      nextButton?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = index > 0 ? index - 1 : filteredSuggestions.length - 1;
      setHighlightedSuggestionIndex(nextIndex);
      const nextButton = document.getElementById(
        `pokedle-suggestion-${nextIndex}`,
      ) as HTMLButtonElement | null;
      nextButton?.focus();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setShowSuggestions(false);
      setHighlightedSuggestionIndex(-1);
      const input = document.getElementById("pokedle-guess") as HTMLInputElement | null;
      input?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelectSuggestion(filteredSuggestions[index]);
    }
  };

  return (
    <GameShell
      session={session}
      title="Pokédle"
      description="Propose un Pokémon et compare ses caractéristiques pour trouver le Pokémon mystère."
      maxWidthClassName="max-w-7xl"
    >
      <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <label htmlFor="pokedle-guess" className="block text-sm font-medium">
            Nom du Pokémon
          </label>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative w-full lg:max-w-xl">
              <Input
                id="pokedle-guess"
                ref={inputRef}
                value={guessName}
                onChange={(event) => {
                  setGuessName(event.target.value);
                  setShowSuggestions(true);
                  setHighlightedSuggestionIndex(-1);
                  setFeedback("");
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleInputKeyDown}
                placeholder="Tape le nom du Pokémon..."
                autoComplete="off"
                readOnly={isSolved}
                className="h-12"
              />
              {canShowSuggestions ? (
                <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border/70 bg-background p-1 shadow-lg">
                  {filteredSuggestions.map((pokemon, index) => (
                    <li key={pokemon.id}>
                      <button
                        id={`pokedle-suggestion-${index}`}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSelectSuggestion(pokemon);
                        }}
                        onFocus={() => setHighlightedSuggestionIndex(index)}
                        onKeyDown={(event) => handleSuggestionKeyDown(event, index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/60",
                          highlightedSuggestionIndex >= 0 &&
                            filteredSuggestions[highlightedSuggestionIndex]?.id ===
                              pokemon.id &&
                            "bg-muted/70",
                        )}
                      >
                        <div className="relative h-8 w-8 shrink-0">
                          <Image
                            src={pokemon.sprite}
                            alt={pokemon.nameFr}
                            fill
                            sizes="32px"
                            className="object-contain"
                          />
                        </div>
                        <span>{pokemon.nameFr}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button type="submit" size="lg" disabled={!guessName.trim() || isSolved}>
              Valider
            </Button>
            {isSolved ? (
              <Button type="button" size="lg" variant="outline" onClick={resetRound}>
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
              isSolved ? "feedback-success" : "text-muted-foreground",
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
