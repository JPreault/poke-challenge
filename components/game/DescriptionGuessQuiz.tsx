"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { Button } from "@/components/ui/button";
import type { DescriptionStartResult } from "@/lib/games/description-types";
import type { GameSession } from "@/lib/games/useGameSession";
import { getSearchCatalog } from "@/lib/pokemon/client-data";
import { cn } from "@/lib/utils";

interface RoundProps {
    session: GameSession;
    onRoundComplete?: () => void;
}

const EXTRA_DESCRIPTION_EVERY = 3;

interface WrongGuess {
    id: number;
    nameFr: string;
    spriteUrl: string;
}

export function DescriptionGuessRound({ session, onRoundComplete }: RoundProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const catalog = useMemo(() => getSearchCatalog(), []);

    const [token, setToken] = useState<string | null>(null);
    const [totalDescriptions, setTotalDescriptions] = useState(0);
    const [visibleDescriptions, setVisibleDescriptions] = useState<string[]>([]);
    const [wrongGuesses, setWrongGuesses] = useState<WrongGuess[]>([]);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [guessName, setGuessName] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isSolved, setIsSolved] = useState(false);
    const [wasAbandoned, setWasAbandoned] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [solvedName, setSolvedName] = useState<string | null>(null);
    const [solvedArtworkUrl, setSolvedArtworkUrl] = useState<string | null>(null);

    const excludedIds = useMemo(() => wrongGuesses.map((pokemon) => pokemon.id), [wrongGuesses]);

    const startRound = useCallback(async () => {
        setIsLoading(true);
        setToken(null);
        setTotalDescriptions(0);
        setVisibleDescriptions([]);
        setWrongGuesses([]);
        setWrongAttempts(0);
        setGuessName("");
        setFeedback("");
        setIsSolved(false);
        setWasAbandoned(false);
        setSolvedName(null);
        setSolvedArtworkUrl(null);

        try {
            const response = await fetch("/api/games/description/start", {
                method: "POST",
            });

            if (!response.ok) {
                setIsLoading(false);
                return;
            }

            const result = (await response.json()) as DescriptionStartResult;
            setToken(result.token);
            setTotalDescriptions(result.totalDescriptions);
            setVisibleDescriptions(result.visibleDescriptions);
            setIsLoading(false);
            window.setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        } catch {
            setIsLoading(false);
        }
    }, []);

    const advanceRound = useCallback(() => {
        if (onRoundComplete) {
            onRoundComplete();
            return;
        }
        void startRound();
    }, [onRoundComplete, startRound]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void startRound();
        }, 0);
        return () => window.clearTimeout(timeoutId);
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token || isSolved) return;

        try {
            const response = await fetch("/api/games/description/guess", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    answer: guessName,
                    wrongAttempts,
                }),
            });
            const result = await response.json();

            if (result.status === "not_found" || result.status === "invalid_token") {
                setFeedback(result.message);
                return;
            }

            if (result.status === "correct") {
                session.recordRound({
                    question: visibleDescriptions[0] ?? "",
                    userAnswer: result.nameFr,
                    correctAnswer: result.nameFr,
                    isCorrect: true,
                    attemptCount: wrongAttempts + 1,
                    chosenLabel: result.nameFr,
                    correctImage: result.artworkUrl,
                });
                setVisibleDescriptions(result.visibleDescriptions);
                setSolvedName(result.nameFr);
                setSolvedArtworkUrl(result.artworkUrl);
                setIsSolved(true);
                setGuessName("");
                setFeedback(`Bravo ! C'était ${result.nameFr}.`);
                return;
            }

            if (result.status === "wrong") {
                setWrongGuesses((current) => {
                    if (current.some((pokemon) => pokemon.id === result.wrongGuess.id)) {
                        return current;
                    }
                    return [...current, result.wrongGuess];
                });
                setWrongAttempts((current) => current + 1);
                setVisibleDescriptions(result.visibleDescriptions);
                setGuessName("");
                setFeedback(
                    result.unlockedNewDescription
                        ? "Ce n'est pas le bon Pokémon. Une nouvelle description a été dévoilée !"
                        : "Ce n'est pas le bon Pokémon. Réessaie !",
                );
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
            const response = await fetch("/api/games/description/skip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, wrongAttempts }),
            });
            const result = await response.json();

            if (result.status !== "ok") {
                setFeedback(result.message);
                return;
            }

            const lastGuess = wrongGuesses[wrongGuesses.length - 1];

            session.recordRound({
                question: visibleDescriptions[0] ?? "",
                userAnswer: "Abandon",
                correctAnswer: result.nameFr,
                isCorrect: false,
                skipped: true,
                attemptCount: wrongAttempts,
                chosenLabel: lastGuess?.nameFr,
                correctImage: result.artworkUrl,
            });

            setVisibleDescriptions(result.visibleDescriptions);
            setSolvedName(result.nameFr);
            setSolvedArtworkUrl(result.artworkUrl);
            setGuessName("");
            setWasAbandoned(true);
            setIsSolved(true);
            setFeedback(`Abandonné. C'était ${result.nameFr}.`);
        } catch {
            setFeedback("Impossible d'abandonner la manche.");
        }
    }, [isSolved, session, token, visibleDescriptions, wrongAttempts, wrongGuesses]);

    useRegisterSkip(handleSkip, Boolean(token) && !isSolved);

    if (isLoading || !token || visibleDescriptions.length === 0) {
        return <div className="flex h-64 items-center justify-center text-muted-foreground">Préparation de la manche…</div>;
    }

    const visibleCount = visibleDescriptions.length;
    const canUnlockMore = visibleCount < totalDescriptions;
    const attemptsUntilNextHint = EXTRA_DESCRIPTION_EVERY - (wrongAttempts % EXTRA_DESCRIPTION_EVERY);

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                {visibleDescriptions.map((description, index) => (
                    <div key={`${token}-${index}`} className="display-frame max-h-56 overflow-y-auto px-6 py-5">
                        {visibleDescriptions.length > 1 ? (
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Description {index + 1}</p>
                        ) : null}
                        <p className="text-sm leading-relaxed text-muted-foreground italic">« {description} »</p>
                    </div>
                ))}
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
                            <Image src={solvedArtworkUrl} alt={solvedName ?? "Pokémon"} fill sizes="160px" unoptimized className="object-contain" />
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
                                    <Image src={pokemon.spriteUrl} alt={pokemon.nameFr} fill sizes="24px" unoptimized className="object-contain" />
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
