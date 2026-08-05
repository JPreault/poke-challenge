"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { Button } from "@/components/ui/button";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getZoomScale, isFullyDezoomed } from "@/lib/games/zoom-levels";
import { getBacPokemon, getCatalogPokemon, getFrenchIndex } from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const bacPokemon = useMemo(() => getBacPokemon(), []);
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const frenchIndex = useMemo(() => getFrenchIndex(), []);
  const searchCatalog = useMemo(
    () =>
      useBacPool
        ? catalog.filter((entry) => bacPokemon.some((bac) => bac.id === entry.id))
        : catalog,
    [bacPokemon, catalog, useBacPool],
  );
  const catalogById = useMemo(
    () => new Map(catalog.map((pokemon) => [pokemon.id, pokemon])),
    [catalog],
  );

  const [target, setTarget] = useState<QuizPokemon | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState<QuizPokemon[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [guessName, setGuessName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSolved, setIsSolved] = useState(false);

  const excludedIds = useMemo(
    () => wrongGuesses.map((pokemon) => pokemon.id),
    [wrongGuesses],
  );

  const pickPokemon = useCallback(() => {
    return useBacPool
      ? catalog.find((entry) => entry.id === pickRandom(bacPokemon).id)
      : pickRandom(catalog);
  }, [bacPokemon, catalog, useBacPool]);

  const startRound = useCallback(() => {
    setTarget(pickPokemon() ?? null);
    setWrongGuesses([]);
    setWrongAttempts(0);
    setGuessName("");
    setFeedback("");
    setIsSolved(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [pickPokemon]);

  const advanceRound = useCallback(() => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    startRound();
  }, [onRoundComplete, startRound]);

  useEffect(() => {
    const timeoutId = window.setTimeout(startRound, 0);
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

    if (useBacPool && !bacPokemon.some((bac) => bac.id === guessedPokemon.id)) {
      setFeedback("Ce Pokémon ne fait pas partie de la liste du bac.");
      return;
    }

    const isCorrect = guessedPokemon.id === target.id;

    session.recordRound({
      question: "Quel est ce Pokémon zoomé ?",
      userAnswer: guessedPokemon.nameFr,
      correctAnswer: target.nameFr,
      isCorrect,
      questionImage: target.artwork,
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

    setWrongAttempts((current) => current + 1);

    setGuessName("");
    setFeedback("Ce n'est pas le bon Pokémon. Réessaie !");
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  if (!target) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  const zoomScale = isSolved ? 1 : getZoomScale(wrongAttempts);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <div className="display-frame flex h-56 w-56 items-center justify-center overflow-hidden">
          <div
            className={cn(
              (wrongAttempts > 0 || isSolved) && "transition-transform duration-500",
            )}
            style={{ transform: `scale(${zoomScale})` }}
          >
            <Image
              src={target.artwork}
              alt="Pokémon mystère"
              width={192}
              height={192}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {!isSolved && isFullyDezoomed(wrongAttempts) ? (
          <p className="text-sm text-muted-foreground">Image entièrement dévoilée</p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label htmlFor="zoom-guess" className="block text-sm font-medium">
          Quel est ce Pokémon ?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PokemonSearchInput
            id="zoom-guess"
            value={guessName}
            onChange={setGuessName}
            onInputActivity={() => setFeedback("")}
            catalog={searchCatalog}
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

      <p
        className={cn(
          "min-h-6 text-sm",
          isSolved && "feedback-success",
          !isSolved && feedback.includes("introuvable") && "feedback-error",
          !isSolved &&
            feedback.includes("liste du bac") &&
            "feedback-error",
          !isSolved &&
            feedback &&
            !feedback.includes("introuvable") &&
            !feedback.includes("liste du bac") &&
            "text-muted-foreground",
        )}
      >
        {feedback}
      </p>

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
      <ZoomGuessRound session={session} useBacPool={useBacPool} />
    </GameShell>
  );
}
