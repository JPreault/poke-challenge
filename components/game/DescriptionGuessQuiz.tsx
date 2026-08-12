"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { DescriptionSwiper } from "@/components/game/DescriptionSwiper";
import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { useRankedSession } from "@/components/game/RankedSessionContext";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { useAwaitingAdvance } from "@/components/game/useAwaitingAdvance";
import { useRankedRoundFlow } from "@/components/game/useRankedRoundFlow";
import { useStartRoundWhenReady } from "@/components/game/useStartRoundWhenReady";
import { Button } from "@/components/ui/button";
import type {
    DescriptionGuessResult,
    DescriptionStartResult,
} from "@/lib/games/description-types";
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
    const endActionRef = useRef<"advance" | "fail">("advance");
    const ranked = useRankedSession();
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
        endActionRef.current = "advance";

        try {
            const response = await fetch("/api/games/description/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(ranked?.matchId ? { matchId: ranked.matchId } : {}),
                }),
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
    }, [ranked?.matchId]);

    const advanceRound = useCallback(() => {
        if (onRoundComplete) {
            onRoundComplete();
            return;
        }
        void startRound();
    }, [onRoundComplete, startRound]);

    const { isRanked, allowSkip, onSuccess, onFailure, onWrongAttempt } =
        useRankedRoundFlow(session, advanceRound);

    const handleResolvedAdvance = useCallback(() => {
        if (endActionRef.current === "fail") {
            onFailure();
            return;
        }
        advanceRound();
    }, [advanceRound, onFailure]);

    const { showNextButton, goNext } = useAwaitingAdvance(isSolved, handleResolvedAdvance);

    useStartRoundWhenReady(startRound);

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
                }),
            });
            const result = (await response.json()) as DescriptionGuessResult;

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
                if (isRanked) {
                    onSuccess();
                }
                endActionRef.current = "advance";
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
                setVisibleDescriptions(result.visibleDescriptions);
                setGuessName("");

                if (result.roundFailed) {
                    setWrongAttempts((current) => current + 1);
                    session.recordRound({
                        question: visibleDescriptions[0] ?? "",
                        userAnswer: result.wrongGuess.nameFr,
                        correctAnswer: result.nameFr,
                        isCorrect: false,
                        attemptCount: wrongAttempts + 1,
                        chosenLabel: result.wrongGuess.nameFr,
                        correctImage: result.artworkUrl,
                    });
                    endActionRef.current = isRanked ? "fail" : "advance";
                    setSolvedName(result.nameFr);
                    setSolvedArtworkUrl(result.artworkUrl);
                    setIsSolved(true);
                    setFeedback(`Raté. C'était ${result.nameFr}.`);
                    return;
                }

                setToken(result.nextToken);
                setWrongAttempts(result.wrongAttempts);
                if (isRanked) {
                    onWrongAttempt();
                }
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
                body: JSON.stringify({ token }),
            });
            if (!response.ok) return;
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
            endActionRef.current = "advance";
            setIsSolved(true);
            setFeedback(`Abandonné. C'était ${result.nameFr}.`);
        } catch {
            setFeedback("Impossible d'abandonner la manche.");
        }
    }, [isSolved, session, token, visibleDescriptions, wrongAttempts, wrongGuesses]);

    useRegisterSkip(handleSkip, allowSkip && Boolean(token) && !isSolved);

    if (isLoading || !token || visibleDescriptions.length === 0) {
        return <div className="flex h-64 items-center justify-center text-muted-foreground">Préparation de la manche…</div>;
    }

    const visibleCount = visibleDescriptions.length;
    const canUnlockMore = visibleCount < totalDescriptions;
    const attemptsUntilNextHint = EXTRA_DESCRIPTION_EVERY - (wrongAttempts % EXTRA_DESCRIPTION_EVERY);

    return (
        <div className="space-y-8">
            <div className="space-y-3">
            <DescriptionSwiper
                descriptions={visibleDescriptions}
                slideKey={token}
            />
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
                        className="min-w-0 flex-1 sm:max-w-xl"
                    />
                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!guessName.trim() || isSolved}>
                        Valider
                    </Button>
                    {showNextButton ? (
                        <Button type="button" size="lg" variant="outline" className="w-full sm:w-auto" onClick={goNext}>
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
            title="Description"
            description="Lis la description Pokédex et retrouve le Pokémon correspondant. Une description supplémentaire est dévoilée tous les 3 essais."
        >
            <DescriptionGuessRound session={session} />
        </GameShell>
    );
}
