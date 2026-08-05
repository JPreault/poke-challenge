"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { Button } from "@/components/ui/button";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getCatalogPokemon, getFrenchIndex } from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
  session: GameSession;
  onRoundComplete?: () => void;
}

function truncateDescription(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function pickRandomWithDescription(catalog: QuizPokemon[]): QuizPokemon {
  const withDescription = catalog.filter(
    (pokemon) => pokemon.descriptionFr && pokemon.descriptionFr.length > 0,
  );
  return pickRandom(withDescription);
}

export function DescriptionGuessRound({ session, onRoundComplete }: RoundProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const frenchIndex = useMemo(() => getFrenchIndex(), []);
  const catalogById = useMemo(
    () => new Map(catalog.map((pokemon) => [pokemon.id, pokemon])),
    [catalog],
  );

  const [target, setTarget] = useState<QuizPokemon | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState<QuizPokemon[]>([]);
  const [guessName, setGuessName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSolved, setIsSolved] = useState(false);

  const excludedIds = useMemo(
    () => wrongGuesses.map((pokemon) => pokemon.id),
    [wrongGuesses],
  );

  const startRound = () => {
    setTarget(pickRandomWithDescription(catalog));
    setWrongGuesses([]);
    setGuessName("");
    setFeedback("");
    setIsSolved(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const advanceRound = () => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    startRound();
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(startRound, 0);
    return () => window.clearTimeout(timeoutId);
  }, [catalog]);

  useEffect(() => {
    if (!isSolved || !onRoundComplete) return;

    const timeoutId = window.setTimeout(onRoundComplete, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [isSolved, onRoundComplete]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!target || isSolved) return;

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

    session.recordRound({
      question: truncateDescription(target.descriptionFr ?? ""),
      userAnswer: guessedPokemon.nameFr,
      correctAnswer: target.nameFr,
      isCorrect,
    });

    if (isCorrect) {
      setIsSolved(true);
      setGuessName("");
      setFeedback(`Bravo ! C'était ${target.nameFr}.`);
      return;
    }

    setWrongGuesses((current) => {
      if (current.some((pokemon) => pokemon.id === guessedPokemon.id)) {
        return current;
      }
      return [...current, guessedPokemon];
    });
    setGuessName("");
    setFeedback("Ce n'est pas le bon Pokémon. Réessaie !");
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  if (!target?.descriptionFr) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="display-frame max-h-56 overflow-y-auto px-6 py-5">
        <p className="text-sm leading-relaxed text-muted-foreground italic">
          « {target.descriptionFr} »
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label htmlFor="description-guess" className="block text-sm font-medium">
          Quel Pokémon correspond à cette description ?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PokemonSearchInput
            id="description-guess"
            value={guessName}
            onChange={setGuessName}
            onInputActivity={() => setFeedback("")}
            catalog={catalog}
            excludedIds={excludedIds}
            readOnly={isSolved}
            inputRef={inputRef}
            className="sm:max-w-xl"
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
            isSolved && "feedback-success",
            !isSolved && feedback.includes("introuvable") && "feedback-error",
            !isSolved &&
              feedback &&
              !feedback.includes("introuvable") &&
              "text-muted-foreground",
          )}
        >
          {feedback}
        </p>
      </div>

      {wrongGuesses.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Propositions incorrectes
          </p>
          <ul className="flex flex-wrap gap-2">
            {wrongGuesses.map((pokemon) => (
              <li
                key={pokemon.id}
                className="surface flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
              >
                <div className="relative h-6 w-6 shrink-0">
                  <Image
                    src={pokemon.sprite}
                    alt={pokemon.nameFr}
                    fill
                    sizes="24px"
                    className="object-contain"
                  />
                </div>
                <span>{pokemon.nameFr}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface DescriptionGuessQuizProps {
  session: GameSession;
}

export function DescriptionGuessQuiz({ session }: DescriptionGuessQuizProps) {
  return (
    <GameShell
      session={session}
      title="Description → Pokémon"
      description="Lis la description Pokédex et retrouve le Pokémon correspondant."
    >
      <DescriptionGuessRound session={session} />
    </GameShell>
  );
}
