"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { Button } from "@/components/ui/button";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { censorPokemonNameInText } from "@/lib/pokemon/censor";
import { getCatalogPokemon, getFrenchIndex } from "@/lib/pokemon/data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
    session: GameSession;
    onRoundComplete?: () => void;
}

const EXTRA_DESCRIPTION_EVERY = 3;

function truncateDescription(text: string, maxLength = 120): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
}

function pickRandomWithDescription(catalog: QuizPokemon[]): QuizPokemon {
    const withDescription = catalog.filter((pokemon) => pokemon.descriptionsFr.length > 0);
    return pickRandom(withDescription);
}

function visibleDescriptionCount(wrongAttempts: number, total: number): number {
    const unlocked = 1 + Math.floor(wrongAttempts / EXTRA_DESCRIPTION_EVERY);
    return Math.min(unlocked, total);
}

export function DescriptionGuessRound({ session, onRoundComplete }: RoundProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const catalog = useMemo(() => getCatalogPokemon(), []);
    const frenchIndex = useMemo(() => getFrenchIndex(), []);
    const catalogById = useMemo(() => new Map(catalog.map((pokemon) => [pokemon.id, pokemon])), [catalog]);

    const [target, setTarget] = useState<QuizPokemon | null>(null);
    const [wrongGuesses, setWrongGuesses] = useState<QuizPokemon[]>([]);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [guessName, setGuessName] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isSolved, setIsSolved] = useState(false);
    const [wasAbandoned, setWasAbandoned] = useState(false);

    const excludedIds = useMemo(() => wrongGuesses.map((pokemon) => pokemon.id), [wrongGuesses]);

    const startRound = useCallback(() => {
        setTarget(pickRandomWithDescription(catalog));
        setWrongGuesses([]);
        setWrongAttempts(0);
        setGuessName("");
        setFeedback("");
        setIsSolved(false);
        setWasAbandoned(false);
        window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    }, [catalog]);

    const advanceRound = useCallback(() => {
        if (onRoundComplete) {
            onRoundComplete();
            return;
        }
        startRound();
    }, [onRoundComplete, startRound]);

    useEffect(() => {
        startRound();
        // Mount-only init (also re-runs when Shuffle remounts the round via key).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

        const isCorrect = guessedPokemon.id === target.id;
        const primaryDescription = target.descriptionsFr[0] ?? "";

        session.recordRound({
            question: truncateDescription(primaryDescription),
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

        const nextAttempts = wrongAttempts + 1;
        const previousVisible = visibleDescriptionCount(wrongAttempts, target.descriptionsFr.length);
        const nextVisible = visibleDescriptionCount(nextAttempts, target.descriptionsFr.length);

        setWrongGuesses((current) => {
            if (current.some((pokemon) => pokemon.id === guessedPokemon.id)) {
                return current;
            }
            return [...current, guessedPokemon];
        });
        setWrongAttempts(nextAttempts);
        setGuessName("");
        setFeedback(
            nextVisible > previousVisible
                ? "Ce n'est pas le bon Pokémon. Une nouvelle description a été dévoilée !"
                : "Ce n'est pas le bon Pokémon. Réessaie !",
        );
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSkip = () => {
    if (!target || isSolved) return;

    const primaryDescription = target.descriptionsFr[0] ?? "";

    session.recordRound({
      question: truncateDescription(primaryDescription),
      userAnswer: "Abandon",
      correctAnswer: target.nameFr,
      isCorrect: false,
    });

    setGuessName("");
    setWasAbandoned(true);
    setIsSolved(true);
    setFeedback(`Abandonné. C'était ${target.nameFr}.`);
  };

  if (!target || target.descriptionsFr.length === 0) {
        return <div className="flex h-64 items-center justify-center text-muted-foreground">Préparation de la manche…</div>;
    }

    const visibleCount = visibleDescriptionCount(wrongAttempts, target.descriptionsFr.length);
    const visibleDescriptions = target.descriptionsFr.slice(0, visibleCount);
    const canUnlockMore = visibleCount < target.descriptionsFr.length;
    const attemptsUntilNextHint = EXTRA_DESCRIPTION_EVERY - (wrongAttempts % EXTRA_DESCRIPTION_EVERY);

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                {visibleDescriptions.map((description, index) => {
                    const displayText = isSolved ? description : censorPokemonNameInText(description, target.nameFr);

                    return (
                        <div key={`${target.id}-${index}`} className="display-frame max-h-56 overflow-y-auto px-6 py-5">
                            {visibleDescriptions.length > 1 ? (
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Description {index + 1}</p>
                            ) : null}
                            <p className="text-sm leading-relaxed text-muted-foreground italic">« {displayText} »</p>
                        </div>
                    );
                })}
                {!isSolved && canUnlockMore ? (
                    <p className="text-center text-sm text-muted-foreground">
                        Nouvelle description dans {attemptsUntilNextHint} essai
                        {attemptsUntilNextHint > 1 ? "s" : ""}.
                    </p>
                ) : null}
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
                            <Image src={target.artwork} alt={target.nameFr} fill sizes="160px" className="object-contain" />
                        </div>
                    </div>
                ) : null}

                <p
                    className={cn(
                        "min-h-6 text-sm",
                        isSolved && !wasAbandoned && "feedback-success",
                        isSolved && wasAbandoned && "text-muted-foreground",
                        !isSolved && feedback.includes("introuvable") && "feedback-error",
                        !isSolved && feedback && !feedback.includes("introuvable") && "text-muted-foreground",
                    )}
                >
                    {feedback}
                </p>
            </div>

            {wrongGuesses.length > 0 ? (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Propositions incorrectes</p>
                    <ul className="flex flex-wrap gap-2">
                        {wrongGuesses.map((pokemon) => (
                            <li key={pokemon.id} className="surface flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
                                <div className="relative h-6 w-6 shrink-0">
                                    <Image src={pokemon.sprite} alt={pokemon.nameFr} fill sizes="24px" className="object-contain" />
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
            description="Lis la description Pokédex et retrouve le Pokémon correspondant. Une description supplémentaire est dévoilée tous les 3 essais."
        >
            <DescriptionGuessRound session={session} />
        </GameShell>
    );
}
