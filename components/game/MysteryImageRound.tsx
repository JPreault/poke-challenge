"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { Button } from "@/components/ui/button";
import {
  getBlurPx,
  isFullyDeblurred,
} from "@/lib/games/blur-levels";
import type {
  MysteryGuessResult,
  MysteryKind,
  MysteryReveal,
  MysterySkipResult,
  MysteryStartResult,
} from "@/lib/games/mystery-types";
import type { GameSession } from "@/lib/games/useGameSession";
import { getZoomScale, isFullyDezoomed } from "@/lib/games/zoom-levels";
import { getBacPokemon, getCatalogPokemon } from "@/lib/pokemon/data";
import { cn } from "@/lib/utils";

interface MysteryImageRoundProps {
  session: GameSession;
  kind: MysteryKind;
  question: string;
  inputId: string;
  useBacPool?: boolean;
  onRoundComplete?: () => void;
  /** Blur-only: grayscale toggle. */
  enableGrayscaleToggle?: boolean;
}

export function MysteryImageRound({
  session,
  kind,
  question,
  inputId,
  useBacPool = true,
  onRoundComplete,
  enableGrayscaleToggle = false,
}: MysteryImageRoundProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bacPokemon = useMemo(() => getBacPokemon(), []);
  const catalog = useMemo(() => getCatalogPokemon(), []);
  const searchCatalog = useMemo(
    () =>
      useBacPool
        ? catalog.filter((entry) => bacPokemon.some((bac) => bac.id === entry.id))
        : catalog,
    [bacPokemon, catalog, useBacPool],
  );

  const [token, setToken] = useState<string | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [reveal, setReveal] = useState<MysteryReveal | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState<MysteryReveal[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [guessName, setGuessName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSolved, setIsSolved] = useState(false);
  const [wasAbandoned, setWasAbandoned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRound, setIsLoadingRound] = useState(true);
  const [grayscaleEnabled, setGrayscaleEnabled] = useState(true);

  const excludedIds = useMemo(
    () => wrongGuesses.map((pokemon) => pokemon.id),
    [wrongGuesses],
  );

  const startRound = useCallback(async () => {
    setIsLoadingRound(true);
    setToken(null);
    setArtworkUrl(null);
    setReveal(null);
    setWrongGuesses([]);
    setWrongAttempts(0);
    setGuessName("");
    setFeedback("");
    setIsSolved(false);
    setWasAbandoned(false);
    setGrayscaleEnabled(true);

    try {
      const response = await fetch("/api/games/mystery/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          pool: useBacPool ? "bac" : "catalog",
        }),
      });

      if (!response.ok) {
        setFeedback("Impossible de démarrer la manche.");
        setIsLoadingRound(false);
        return;
      }

      const result = (await response.json()) as MysteryStartResult;
      setToken(result.token);
      setArtworkUrl(result.artworkUrl);
      setIsLoadingRound(false);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch {
      setFeedback("Impossible de démarrer la manche.");
      setIsLoadingRound(false);
    }
  }, [kind, useBacPool]);

  const advanceRound = useCallback(() => {
    if (onRoundComplete) {
      onRoundComplete();
      return;
    }
    void startRound();
  }, [onRoundComplete, startRound]);

  useEffect(() => {
    void startRound();
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isSolved || isSubmitting || !guessName.trim()) return;

    setIsSubmitting(true);
    setFeedback("");

    try {
      const response = await fetch("/api/games/mystery/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answer: guessName }),
      });

      const result = (await response.json()) as MysteryGuessResult;

      if (result.status === "correct") {
        session.recordRound({
          question,
          userAnswer: result.reveal.nameFr,
          correctAnswer: result.reveal.nameFr,
          isCorrect: true,
          attemptCount: wrongAttempts + 1,
          chosenImage: result.reveal.artwork,
          chosenLabel: result.reveal.nameFr,
          correctImage: result.reveal.artwork,
          questionImage: result.reveal.artwork,
        });
        setReveal(result.reveal);
        setArtworkUrl(result.reveal.artwork);
        setIsSolved(true);
        setGuessName("");
        setFeedback(`Bravo ! C'était ${result.reveal.nameFr}.`);
        setIsSubmitting(false);
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
        setGuessName("");
        setFeedback("Ce n'est pas le bon Pokémon. Réessaie !");
        setIsSubmitting(false);
        window.setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
        return;
      }

      setFeedback(result.message);
      setIsSubmitting(false);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch {
      setFeedback("Erreur de validation. Réessaie.");
      setIsSubmitting(false);
    }
  };

  const handleSkip = useCallback(async () => {
    if (!token || isSolved || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/games/mystery/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = (await response.json()) as MysterySkipResult;

      if (result.status !== "ok") {
        setFeedback(result.message);
        setIsSubmitting(false);
        return;
      }

      const lastGuess = wrongGuesses[wrongGuesses.length - 1];

      session.recordRound({
        question,
        userAnswer: "Abandon",
        correctAnswer: result.reveal.nameFr,
        isCorrect: false,
        skipped: true,
        attemptCount: wrongAttempts,
        chosenImage: lastGuess?.artwork,
        chosenLabel: lastGuess?.nameFr,
        correctImage: result.reveal.artwork,
        questionImage: result.reveal.artwork,
      });

      setReveal(result.reveal);
      setArtworkUrl(result.reveal.artwork);
      setGuessName("");
      setWasAbandoned(true);
      setIsSolved(true);
      setFeedback(`Abandonné. C'était ${result.reveal.nameFr}.`);
      setIsSubmitting(false);
    } catch {
      setFeedback("Impossible d'abandonner la manche.");
      setIsSubmitting(false);
    }
  }, [
    isSolved,
    isSubmitting,
    question,
    session,
    token,
    wrongAttempts,
    wrongGuesses,
  ]);

  useRegisterSkip(() => {
    void handleSkip();
  }, Boolean(token) && !isSolved && !isSubmitting);

  if (isLoadingRound || !artworkUrl) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  const blurPx = kind === "blur" ? (isSolved ? 0 : getBlurPx(wrongAttempts)) : 0;
  const zoomScale = kind === "zoom" ? (isSolved ? 1 : getZoomScale(wrongAttempts)) : 1;
  const showGrayscale = enableGrayscaleToggle && !isSolved && grayscaleEnabled;
  const displaySrc = isSolved && reveal ? reveal.artwork : artworkUrl;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <div className="display-frame flex h-56 w-56 select-none items-center justify-center overflow-hidden">
          <div
            className={cn(
              kind === "blur" &&
                (wrongAttempts > 0 || isSolved) &&
                "transition-[filter] duration-500",
              kind === "zoom" &&
                (wrongAttempts > 0 || isSolved) &&
                "transition-transform duration-500",
            )}
            style={{
              ...(kind === "blur"
                ? {
                    filter:
                      [
                        blurPx > 0 ? `blur(${blurPx}px)` : "",
                        showGrayscale ? "grayscale(100%)" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || "none",
                  }
                : { transform: `scale(${zoomScale})` }),
            }}
          >
            {/* unoptimized: opaque proxy URL must not be rewritten by the image optimizer */}
            <Image
              src={displaySrc}
              alt="Pokémon mystère"
              width={192}
              height={192}
              draggable={false}
              unoptimized={!isSolved}
              className="pointer-events-none object-contain select-none"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {enableGrayscaleToggle && !isSolved ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setGrayscaleEnabled((current) => !current)}
            >
              {grayscaleEnabled ? "Passer en couleur" : "Passer en noir & blanc"}
            </Button>
          ) : null}
          {kind === "blur" && !isSolved && isFullyDeblurred(wrongAttempts) ? (
            <p className="text-sm text-muted-foreground">Image entièrement dévoilée</p>
          ) : null}
          {kind === "zoom" && !isSolved && isFullyDezoomed(wrongAttempts) ? (
            <p className="text-sm text-muted-foreground">Image entièrement dévoilée</p>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label htmlFor={inputId} className="block text-sm font-medium">
          Quel est ce Pokémon ?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PokemonSearchInput
            id={inputId}
            value={guessName}
            onChange={setGuessName}
            onInputActivity={() => setFeedback("")}
            catalog={searchCatalog}
            excludedIds={excludedIds}
            readOnly={isSolved}
            disabled={isSubmitting}
            inputRef={inputRef}
            className="sm:max-w-xl"
          />
          <Button
            type="submit"
            size="lg"
            disabled={!guessName.trim() || isSolved || isSubmitting}
          >
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
          isSolved && !wasAbandoned && "feedback-success",
          isSolved && wasAbandoned && "text-muted-foreground",
          !isSolved && feedback.includes("introuvable") && "feedback-error",
          !isSolved && feedback.includes("liste du bac") && "feedback-error",
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
