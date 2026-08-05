"use client";

import Image from "next/image";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { getGameModeLabel } from "@/lib/games/types";
import type { GameSession } from "@/lib/games/useGameSession";
import { cn } from "@/lib/utils";

interface GameShellProps {
  session: GameSession;
  title: string;
  description?: string;
  modeLabel?: string;
  children: React.ReactNode;
}

export function GameShell({
  session,
  title,
  description,
  modeLabel,
  children,
}: GameShellProps) {
  const { stats, isFinished, stopGame } = session;
  const displayedModeLabel = modeLabel ?? getGameModeLabel(session.mode);

  if (isFinished) {
    return <GameRecap session={session} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16 sm:px-8 sm:py-20">
      <header className="space-y-6">
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Retour
        </Link>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {displayedModeLabel}
            </p>
            <h1 className="font-heading text-3xl font-bold">{title}</h1>
            {description ? (
              <p className="max-w-md text-base leading-7 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="rounded-full bg-muted px-4 py-2 text-sm">
              <span className="text-muted-foreground">Manche </span>
              <span className="font-semibold">{stats.totalRounds + 1}</span>
            </div>
            <div className="rounded-full bg-muted px-4 py-2 text-sm">
              <span className="font-semibold">{stats.correctCount}</span>
              <span className="text-muted-foreground">
                {" "}
                / {stats.totalRounds}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={stopGame}>
              Stop
            </Button>
          </div>
        </div>
      </header>

      <div className="surface p-8 sm:p-10">{children}</div>
    </div>
  );
}

function GameRecap({ session }: { session: GameSession }) {
  const { stats, mode, rounds } = session;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="surface p-8 sm:p-10">
        <div className="mb-10 space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {getGameModeLabel(mode)}
          </p>
          <h1 className="font-heading text-3xl font-bold">Récapitulatif</h1>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBlock label="Manches" value={stats.totalRounds} />
          <StatBlock label="Bonnes" value={stats.correctCount} />
          <StatBlock label="Erreurs" value={stats.incorrectCount} />
          <StatBlock label="Réussite" value={`${stats.successRate}%`} />
        </div>

        {stats.errors.length > 0 ? (
          <div className="mb-10 space-y-4">
            <h2 className="font-heading text-lg font-semibold">Erreurs</h2>
            <ul className="space-y-3">
              {stats.errors.map((round) => (
                <li
                  key={round.round}
                  className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4 text-sm leading-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{round.question}</p>
                      {round.questionImage ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/60 bg-background">
                          <Image
                            src={round.questionImage}
                            alt={round.correctAnswer}
                            fill
                            sizes="40px"
                            className="object-contain"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="text-muted-foreground">
                      Ta réponse : {round.userAnswer || "—"}
                    </div>

                    {round.chosenImage ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Image choisie
                        </p>
                        <div className="inline-flex flex-col items-center gap-1 rounded-md border border-border/60 bg-background p-2">
                          <div className="relative h-16 w-16">
                            <Image
                              src={round.chosenImage}
                              alt={round.chosenLabel ?? round.userAnswer}
                              fill
                              sizes="64px"
                              className="object-contain"
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {round.chosenLabel ?? round.userAnswer}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        Bonne réponse : {round.correctAnswer}
                      </p>
                      {round.correctImage ? (
                        <div className="inline-flex flex-col items-center gap-1 rounded-md border border-border/60 bg-background p-2">
                          <div className="relative h-16 w-16">
                            <Image
                              src={round.correctImage}
                              alt={round.correctAnswer}
                              fill
                              sizes="64px"
                              className="object-contain"
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {round.correctAnswer}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : rounds.length > 0 ? (
          <p className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            Parfait ! Aucune erreur sur cette partie.
          </p>
        ) : (
          <p className="mb-10 text-sm text-muted-foreground">
            Aucune manche jouée.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/game/${mode}`}
            className={cn(buttonVariants({ size: "lg" }), "inline-flex")}
          >
            Rejouer
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "inline-flex",
            )}
          >
            Changer de jeu
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-5 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl font-bold">{value}</p>
    </div>
  );
}