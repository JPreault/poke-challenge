"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameShell } from "@/components/game/GameShell";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { useAwaitingAdvance } from "@/components/game/useAwaitingAdvance";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pickRandom } from "@/lib/games/random";
import type { GameSession } from "@/lib/games/useGameSession";
import { getSearchCatalog } from "@/lib/pokemon/client-data";
import { getFirstLetter } from "@/lib/pokemon/normalize";
import type { ValidationMode, ValidationResult } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface RoundProps {
    session: GameSession;
    onRoundComplete?: () => void;
    validationMode?: ValidationMode;
}

interface LetterInputQuizProps {
    session: GameSession;
    validationMode?: ValidationMode;
}

type FeedbackState =
    | { type: "idle" }
    | {
          type: "success";
          message: string;
          preferred: boolean;
          userAnswer: string;
          hasTypo: boolean;
          correctSpelling?: string;
      }
    | {
          type: "error";
          message: string;
          userAnswer: string;
          correctSpelling?: string;
      };

function buildFeedback(
    result: ValidationResult,
    userAnswer: string,
    roundLetter: string,
    validationMode: ValidationMode,
    fallbackExpected?: string,
    exampleName?: string,
): FeedbackState {
    const example = exampleName ?? fallbackExpected ?? roundLetter;

    if (validationMode === "catalog" || validationMode === "training") {
        if (!result.correct) {
            if (result.failureReason === "not_in_training_list" && result.matched) {
                return {
                    type: "error",
                    message: `${result.matched} ne fait pas partie de ta liste.`,
                    userAnswer,
                    correctSpelling: example,
                };
            }

            if (result.failureReason === "wrong_letter" && result.matched) {
                return {
                    type: "error",
                    message: `${result.matched} ne commence pas par ${roundLetter}.`,
                    userAnswer,
                };
            }

            return {
                type: "error",
                message: `Ce nom de Pokémon n'existe pas, voici un exemple de nom : ${example}.`,
                userAnswer,
                correctSpelling: example,
            };
        }

        return {
            type: "success",
            message: "Bravo !",
            preferred: true,
            userAnswer,
            hasTypo: Boolean(result.hasTypo),
            correctSpelling: result.matched,
        };
    }

    const expected = result.expected ?? fallbackExpected ?? "";

    if (!result.correct) {
        if (result.matched) {
            return {
                type: "error",
                message: `${result.matched} ne commence pas par ${roundLetter}.`,
                userAnswer,
            };
        }

        return {
            type: "error",
            message: `Ce nom de Pokémon n'existe pas, voici un exemple de nom : ${example}.`,
            userAnswer,
            correctSpelling: example,
        };
    }

    if (!result.preferred) {
        return {
            type: "success",
            message: `Valide, mais pour cette lettre c'était ${expected}.`,
            preferred: false,
            userAnswer,
            hasTypo: Boolean(result.hasTypo),
            correctSpelling: result.matched ?? expected,
        };
    }

    return {
        type: "success",
        message: "Bravo !",
        preferred: true,
        userAnswer,
        hasTypo: Boolean(result.hasTypo),
        correctSpelling: result.matched ?? expected,
    };
}

function FeedbackMessage({ feedback }: { feedback: FeedbackState }) {
    if (feedback.type === "idle") {
        return <div className="h-6" />;
    }

    const showSpellingHint =
        feedback.type === "success" &&
        feedback.hasTypo &&
        feedback.correctSpelling &&
        feedback.userAnswer.trim().toLowerCase() !== feedback.correctSpelling.trim().toLowerCase();

    return (
        <div className="space-y-2 text-center">
            <p
                className={cn(
                    "text-base",
                    feedback.type === "success" && feedback.preferred && "feedback-success",
                    feedback.type === "success" && !feedback.preferred && "feedback-warn",
                    feedback.type === "error" && "feedback-error",
                )}
            >
                {feedback.message}
            </p>
            {showSpellingHint ? (
                <p className="text-sm text-muted-foreground">
                    Ta réponse : <span className="font-medium text-foreground">{feedback.userAnswer}</span>
                    {" → "}
                    <span className="font-medium text-foreground">{feedback.correctSpelling}</span>
                </p>
            ) : null}
        </div>
    );
}

export function LetterInputRound({ session, onRoundComplete, validationMode = "training" }: RoundProps) {
    const useTrainingPool = validationMode === "training";
    const [strictMode, setStrictMode] = useState(true);
    const [trainingNames, setTrainingNames] = useState<string[]>([]);
    const [poolReady, setPoolReady] = useState(!useTrainingPool);
    const [poolError, setPoolError] = useState<string | null>(null);

    const effectiveValidationMode: ValidationMode = useTrainingPool ? (strictMode ? "training" : "catalog") : validationMode;

    useEffect(() => {
        if (!useTrainingPool) return;

        let active = true;
        const load = async () => {
            try {
                const response = await fetch("/api/training/pool", { cache: "no-store" });
                if (!response.ok) {
                    if (active) {
                        setPoolError("Impossible de charger ta liste d'entraînement.");
                        setPoolReady(true);
                    }
                    return;
                }
                const payload = (await response.json()) as {
                    catalog: Array<{ id: number; nameFr: string }>;
                };
                if (!active) return;
                setTrainingNames(payload.catalog.map((entry) => entry.nameFr));
                if (payload.catalog.length === 0) {
                    setPoolError("Ta liste d'entraînement est vide. Ajoute des Pokémon dans ton profil.");
                }
                setPoolReady(true);
            } catch {
                if (active) {
                    setPoolError("Impossible de charger ta liste d'entraînement.");
                    setPoolReady(true);
                }
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [useTrainingPool]);

    const availableLetters = useMemo(() => {
        if (useTrainingPool) {
            return Array.from(new Set(trainingNames.map((name) => getFirstLetter(name)).filter(Boolean)));
        }

        const uniqueLetters = new Set(getSearchCatalog().map((pokemon) => getFirstLetter(pokemon.nameFr)));
        return Array.from(uniqueLetters).filter(Boolean);
    }, [trainingNames, useTrainingPool]);

    const inputRef = useRef<HTMLInputElement>(null);
    const [currentLetter, setCurrentLetter] = useState<string | null>(null);
    const [expectedName, setExpectedName] = useState<string | undefined>(undefined);
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getExampleNameForLetter = useCallback(
        (letter: string) => {
            if (useTrainingPool) {
                const matches = trainingNames.filter((name) => getFirstLetter(name) === letter.toUpperCase());
                return matches.length > 0 ? pickRandom(matches) : letter;
            }

            const matches = getSearchCatalog().filter((pokemon) => getFirstLetter(pokemon.nameFr) === letter.toUpperCase());
            return matches.length > 0 ? pickRandom(matches).nameFr : letter;
        },
        [trainingNames, useTrainingPool],
    );

    const startRound = useCallback(() => {
        if (availableLetters.length === 0) return;
        const letter = pickRandom(availableLetters);
        setCurrentLetter(letter);
        setExpectedName(getExampleNameForLetter(letter));
        setAnswer("");
        setFeedback({ type: "idle" });
        setIsSubmitting(false);
    }, [availableLetters, getExampleNameForLetter]);

    const advanceRound = useCallback(() => {
        if (onRoundComplete) {
            onRoundComplete();
            return;
        }
        startRound();
    }, [onRoundComplete, startRound]);

    const isAwaitingAdvance = feedback.type !== "idle";
    const { goNext } = useAwaitingAdvance(isAwaitingAdvance, advanceRound);

    useEffect(() => {
        if (!poolReady || availableLetters.length === 0) return;
        const timeoutId = window.setTimeout(startRound, 0);
        return () => window.clearTimeout(timeoutId);
    }, [availableLetters.length, poolReady, startRound]);

    useEffect(() => {
        if (!currentLetter || feedback.type !== "idle") return;
        inputRef.current?.focus();
    }, [feedback.type, currentLetter]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (feedback.type !== "idle") {
            goNext();
            return;
        }

        if (!currentLetter || isSubmitting || !answer.trim()) return;

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/pokemon/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    letter: currentLetter,
                    answer,
                    mode: effectiveValidationMode,
                }),
            });

            const result = (await response.json()) as ValidationResult;
            const exampleName = getExampleNameForLetter(currentLetter);

            session.recordRound({
                question: `Nom de Pokémon pour la lettre ${currentLetter}`,
                userAnswer: answer,
                correctAnswer: result.expected ?? result.matched ?? exampleName,
                isCorrect: result.correct,
                preferred: result.preferred,
            });

            setFeedback(buildFeedback(result, answer, currentLetter, effectiveValidationMode, expectedName, exampleName));
            setIsSubmitting(false);
        } catch {
            setIsSubmitting(false);
            setFeedback({
                type: "error",
                message: "Erreur de validation. Réessaie.",
                userAnswer: answer,
            });
            inputRef.current?.focus();
        }
    };

    const handleSkip = useCallback(() => {
        if (!currentLetter || feedback.type !== "idle") return;

        const exampleName = expectedName ?? getExampleNameForLetter(currentLetter);

        session.recordRound({
            question: `Nom de Pokémon pour la lettre ${currentLetter}`,
            userAnswer: "Abandon",
            correctAnswer: exampleName,
            isCorrect: false,
            skipped: true,
        });

        setFeedback({
            type: "error",
            message: `Abandonné. Exemple : ${exampleName}.`,
            userAnswer: "Abandon",
            correctSpelling: exampleName,
        });
    }, [currentLetter, expectedName, feedback.type, getExampleNameForLetter, session]);

    useRegisterSkip(handleSkip, Boolean(currentLetter) && feedback.type === "idle");

    if (!poolReady) {
        return <div className="flex h-64 items-center justify-center text-muted-foreground">Préparation de la manche…</div>;
    }

    if (poolError) {
        return <div className="flex h-64 items-center justify-center px-6 text-center text-muted-foreground">{poolError}</div>;
    }

    if (!currentLetter) {
        return <div className="flex h-64 items-center justify-center text-muted-foreground">Préparation de la manche…</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-10">
            {useTrainingPool ? (
                <div className="flex flex-col items-center gap-2">
                    <div className="surface inline-flex gap-1 p-1" role="group" aria-label="Mode de validation">
                        <button
                            type="button"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), strictMode && "bg-muted")}
                            aria-pressed={strictMode}
                            onClick={() => setStrictMode(true)}
                        >
                            Strict
                        </button>
                        <button
                            type="button"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), !strictMode && "bg-muted")}
                            aria-pressed={!strictMode}
                            onClick={() => setStrictMode(false)}
                        >
                            Libre
                        </button>
                    </div>
                    <p className="max-w-sm text-center text-sm text-muted-foreground">
                        {strictMode ? "Seuls les Pokémon de ta liste sont acceptés." : "Tous les Pokémon sont acceptés."}
                    </p>
                </div>
            ) : null}

            <div className="letter-disc">
                <span>{currentLetter}</span>
            </div>

            <div className="w-full max-w-sm space-y-4">
                <label htmlFor="pokemon-answer" className="sr-only">
                    Nom du Pokémon
                </label>
                <Input
                    ref={inputRef}
                    id="pokemon-answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Nom du Pokémon..."
                    autoComplete="off"
                    autoFocus
                    readOnly={isSubmitting || isAwaitingAdvance}
                    className="h-12 border-border/70 bg-background px-4 text-base"
                />
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || (!isAwaitingAdvance && !answer.trim())}>
                    {isAwaitingAdvance ? "Suivant" : "Valider"}
                </Button>
            </div>

            <FeedbackMessage feedback={feedback} />
        </form>
    );
}

export function LetterInputQuiz({ session, validationMode = "training" }: LetterInputQuizProps) {
    const isTraining = validationMode === "training";

    return (
        <GameShell
            session={session}
            title="Lettre → Nom"
            description={
                isTraining
                    ? "La lettre est toujours tirée de ta liste. En mode strict, seuls tes Pokémon sont acceptés."
                    : "Entre un Pokémon existant dont le nom français commence par la lettre affichée."
            }
        >
            <LetterInputRound session={session} validationMode={validationMode} />
        </GameShell>
    );
}
