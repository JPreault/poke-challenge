"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { useRankedSession } from "@/components/game/RankedSessionContext";
import { useRegisterSkip } from "@/components/game/RoundActionsContext";
import { useAwaitingAdvance } from "@/components/game/useAwaitingAdvance";
import { usePrefetchedRound } from "@/components/game/usePrefetchedRound";
import { useRankedRoundFlow } from "@/components/game/useRankedRoundFlow";
import { useStartRoundWhenReady } from "@/components/game/useStartRoundWhenReady";
import { warmImage } from "@/components/game/warmMedia";
import { Button } from "@/components/ui/button";
import { isFullyDeblurred } from "@/lib/games/blur-levels";
import type {
  MysteryGuessResult,
  MysteryKind,
  MysteryReveal,
  MysterySkipResult,
  MysteryStartResult,
} from "@/lib/games/mystery-types";
import type { GameSession } from "@/lib/games/useGameSession";
import { isFullyDezoomed } from "@/lib/games/zoom-levels";
import { getSearchCatalog } from "@/lib/pokemon/client-data";
import { cn } from "@/lib/utils";

interface MysteryStartPayload {
  token: string;
  artworkUrl: string;
}

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
  const endActionRef = useRef<"advance" | "fail">("advance");
  const ranked = useRankedSession();
  const [searchCatalog, setSearchCatalog] = useState(() =>
    useBacPool ? [] : getSearchCatalog(),
  );

  useEffect(() => {
    if (!useBacPool) {
      setSearchCatalog(getSearchCatalog());
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/training/pool", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          catalog: Array<{ id: number; nameFr: string }>;
        };
        if (active) setSearchCatalog(payload.catalog);
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [useBacPool]);

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
  const prefetchEnabled = !ranked?.matchId && !onRoundComplete;
  const lastFetchErrorRef = useRef<string | null>(null);

  const excludedIds = useMemo(
    () => wrongGuesses.map((pokemon) => pokemon.id),
    [wrongGuesses],
  );

  const fetchPayload = useCallback(async (): Promise<MysteryStartPayload | null> => {
    lastFetchErrorRef.current = null;
    try {
      const response = await fetch("/api/games/mystery/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          pool: useBacPool ? "training" : "catalog",
          ...(ranked?.matchId ? { matchId: ranked.matchId } : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        lastFetchErrorRef.current =
          payload?.error ?? "Impossible de démarrer la manche.";
        return null;
      }

      const result = (await response.json()) as MysteryStartResult;
      return { token: result.token, artworkUrl: result.artworkUrl };
    } catch {
      lastFetchErrorRef.current = "Impossible de démarrer la manche.";
      return null;
    }
  }, [kind, ranked?.matchId, useBacPool]);

  const warmPayload = useCallback(async (payload: MysteryStartPayload) => {
    await warmImage(payload.artworkUrl);
  }, []);

  const { prefetch, takeOrFetch } = usePrefetchedRound({
    enabled: prefetchEnabled,
    fetchPayload,
    warm: warmPayload,
  });

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
    endActionRef.current = "advance";

    const payload = await takeOrFetch();
    if (!payload) {
      setFeedback(
        lastFetchErrorRef.current ?? "Impossible de démarrer la manche.",
      );
      setIsLoadingRound(false);
      return;
    }

    setToken(payload.token);
    setArtworkUrl(payload.artworkUrl);
    setIsLoadingRound(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [takeOrFetch]);

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

  const { showNextButton, goNext } = useAwaitingAdvance(
    isSolved,
    handleResolvedAdvance,
  );

  useStartRoundWhenReady(startRound);

  useEffect(() => {
    if (!isSolved || !prefetchEnabled) return;
    prefetch();
  }, [isSolved, prefetch, prefetchEnabled]);

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
        if (isRanked) {
          onSuccess();
        }
        endActionRef.current = "advance";
        await warmImage(result.reveal.artwork);
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
        setGuessName("");

        if (result.roundFailed) {
          setWrongAttempts((current) => current + 1);
          await warmImage(result.targetReveal.artwork);
          setReveal(result.targetReveal);
          setArtworkUrl(result.targetReveal.artwork);
          session.recordRound({
            question,
            userAnswer: result.wrongGuess.nameFr,
            correctAnswer: result.targetReveal.nameFr,
            isCorrect: false,
            attemptCount: wrongAttempts + 1,
            chosenImage: result.wrongGuess.artwork,
            chosenLabel: result.wrongGuess.nameFr,
            correctImage: result.targetReveal.artwork,
            questionImage: result.targetReveal.artwork,
          });
          setIsSubmitting(false);
          endActionRef.current = isRanked ? "fail" : "advance";
          setIsSolved(true);
          setFeedback(`Raté. C'était ${result.targetReveal.nameFr}.`);
          return;
        }

        await warmImage(result.artworkUrl);
        setToken(result.nextToken);
        setArtworkUrl(result.artworkUrl);
        setWrongAttempts(result.wrongAttempts);
        if (isRanked) {
          onWrongAttempt();
        }
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

      endActionRef.current = "advance";
      await warmImage(result.reveal.artwork);
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

  useRegisterSkip(handleSkip, allowSkip && Boolean(token) && !isSolved && !isSubmitting);

  if (isLoadingRound || !artworkUrl) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Préparation de la manche…
      </div>
    );
  }

  const forceGrayscale = kind === "blur" && isRanked && !isSolved;
  const showGrayscaleToggle = enableGrayscaleToggle && !isRanked && !isSolved;
  const showGrayscale =
    !isSolved &&
    (forceGrayscale || (enableGrayscaleToggle && grayscaleEnabled));
  const displaySrc = isSolved && reveal ? reveal.artwork : artworkUrl;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <div className="display-frame flex h-56 w-56 select-none items-center justify-center overflow-hidden">
          <div
            className={cn(showGrayscale && "grayscale")}
            style={
              showGrayscale ? { filter: "grayscale(100%)" } : undefined
            }
          >
            <Image
              key={displaySrc}
              src={displaySrc}
              alt="Pokémon mystère"
              width={192}
              height={192}
              draggable={false}
              unoptimized
              className="pointer-events-none object-contain select-none"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {showGrayscaleToggle ? (
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
            className="min-w-0 flex-1 sm:max-w-xl"
          />
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!guessName.trim() || isSolved || isSubmitting}
          >
            Valider
          </Button>
          {showNextButton ? (
            <Button type="button" size="lg" variant="outline" className="w-full sm:w-auto" onClick={goNext}>
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
                    unoptimized
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
