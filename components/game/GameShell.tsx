"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import {
    RoundAdvanceProvider,
    useRoundAdvancePreference,
} from "@/components/game/RoundAdvanceContext";
import { useRankedSession } from "@/components/game/RankedSessionContext";
import { RoundActionsProvider, useRoundActions } from "@/components/game/RoundActionsContext";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RoundRecord } from "@/lib/games/types";
import { computeBlurGuessStats, getGameModeLabel, getInterfaceModeLabel } from "@/lib/games/types";
import type { GameSession } from "@/lib/games/useGameSession";
import { cn } from "@/lib/utils";

function isOpaqueMediaUrl(src: string) {
    return src.startsWith("/api/media/") || src.startsWith("/api/games/mystery/");
}

interface GameShellProps {
    session: GameSession;
    title: string;
    description?: string;
    modeLabel?: string;
    homeHref?: string;
    replayHref?: string;
    children: React.ReactNode;
}

export function GameShell(props: GameShellProps) {
    return (
        <RoundActionsProvider>
            <RoundAdvanceProvider>
                <GameShellInner {...props} />
            </RoundAdvanceProvider>
        </RoundActionsProvider>
    );
}

function GameShellInner({ session, title, description, modeLabel, homeHref, replayHref, children }: GameShellProps) {
    const { stats, isFinished, stopGame, mode } = session;
    const { skipAction } = useRoundActions();
    const { autoAdvanceEnabled, setAutoAdvanceEnabled } = useRoundAdvancePreference();
    const ranked = useRankedSession();
    const searchParams = useSearchParams();
    const isBacTraining = searchParams.get("interface") === "bac-training";
    const isRankedPlay = searchParams.get("interface") === "ranked";
    const interfaceMode = isRankedPlay ? "ranked" : isBacTraining ? "bac-training" : "arena";
    const resolvedHomeHref = homeHref ?? (isRankedPlay ? "/partie-classee" : isBacTraining ? "/entrainement" : "/");
    const resolvedReplayHref =
        replayHref ?? (isRankedPlay ? `/game/${mode}?interface=ranked` : isBacTraining ? `/game/${mode}?interface=bac-training` : `/game/${mode}`);
    const displayedModeLabel = modeLabel ?? getGameModeLabel(mode);
    const interfaceLabel = getInterfaceModeLabel(interfaceMode);
    const contextLabel = `${interfaceLabel} · ${displayedModeLabel}`;

    const handleReplay = useCallback(() => {
        window.location.assign(resolvedReplayHref);
    }, [resolvedReplayHref]);

    if (isRankedPlay && ranked?.loading) {
        return (
            <div className="flex w-full flex-col gap-8 pb-16 pt-4 sm:pb-20 sm:pt-6">
                <p className="text-muted-foreground">Préparation du mode classé…</p>
            </div>
        );
    }

    if (isRankedPlay && ranked?.error) {
        return (
            <div className="flex w-full flex-col gap-8 pb-16 pt-4 sm:pb-20 sm:pt-6">
                <p className="text-poke-red">{ranked.error}</p>
                <Link href="/partie-classee" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                    Retour
                </Link>
            </div>
        );
    }

    if (isFinished) {
        return (
            <GameRecap
                session={session}
                homeHref={resolvedHomeHref}
                onReplay={handleReplay}
                isRankedPlay={isRankedPlay}
                contextLabel={contextLabel}
            />
        );
    }

    const attemptsRemaining = ranked ? Math.max(0, ranked.attemptLimit - ranked.roundAttempts) : null;

    return (
        <div className="flex w-full flex-col gap-8 pb-16 pt-4 sm:pb-20 sm:pt-6">
            <header className="space-y-6">
                <Link href={resolvedHomeHref} className="inline-flex text-sm font-medium text-muted-foreground transition hover:text-foreground">
                    ← Retour
                </Link>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">{contextLabel}</p>
                        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{title}</h1>
                        {description ? <p className="max-w-md text-base leading-7 text-muted-foreground">{description}</p> : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {isRankedPlay && ranked ? (
                                <>
                                    <div className="rounded-full bg-muted px-4 py-2 text-sm">
                                        <span className="text-muted-foreground">Série </span>
                                        <span className="font-semibold">{ranked.winStreak}</span>
                                    </div>
                                    <div className="rounded-full bg-muted px-4 py-2 text-sm">
                                        <span className="text-muted-foreground">Record #1 </span>
                                        <span className="font-semibold">{ranked.topStreak}</span>
                                    </div>
                                    {attemptsRemaining != null ? (
                                        <div className="rounded-full bg-muted px-4 py-2 text-sm">
                                            <span className="text-muted-foreground">Essais </span>
                                            <span className="font-semibold">{attemptsRemaining}</span>
                                        </div>
                                    ) : null}
                                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => void ranked.abandon()}>
                                        Abandonner
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="rounded-full bg-muted px-4 py-2 text-sm">
                                        <span className="text-muted-foreground">Manche </span>
                                        <span className="font-semibold">{stats.totalRounds + 1}</span>
                                    </div>
                                    <div className="rounded-full bg-muted px-4 py-2 text-sm">
                                        <span className="font-semibold">{stats.correctCount}</span>
                                        <span className="text-muted-foreground"> / {stats.totalRounds}</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={stopGame}>
                                        Stop
                                    </Button>
                                </>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    className="size-3.5 accent-foreground"
                                    checked={autoAdvanceEnabled}
                                    onChange={(event) =>
                                        setAutoAdvanceEnabled(event.target.checked)
                                    }
                                    aria-label="Enchaînement automatique"
                                />
                                <span className="font-medium">Auto</span>
                            </label>
                            {!isRankedPlay && skipAction ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="sm:w-fit"
                                    disabled={skipAction.disabled}
                                    onClick={skipAction.onSkip}
                                >
                                    Passer
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </header>

            <div className="surface p-4 sm:p-8 lg:p-10">{children}</div>
        </div>
    );
}

function playCryUrl(url: string) {
    const audio = new Audio(url);
    audio.volume = 0.35;
    audio.play().catch(() => undefined);
}

function GameRecap({
    session,
    homeHref,
    onReplay,
    isRankedPlay,
    contextLabel,
}: {
    session: GameSession;
    homeHref: string;
    onReplay: () => void;
    isRankedPlay: boolean;
    contextLabel: string;
}) {
    const { stats, mode, rounds } = session;
    const ranked = useRankedSession();
    const blurStats = mode === "blur-guess" || mode === "zoom-guess" ? computeBlurGuessStats(rounds) : null;

    if (isRankedPlay && ranked) {
        const finalStreak = ranked.finalWinStreak ?? ranked.winStreak;
        const endedLabel = ranked.endedReason === "abandon" ? "Partie abandonnée" : "Partie terminée";

        return (
            <div className="w-full pb-16 pt-4 sm:pb-20 sm:pt-6">
                <div className="surface p-4 sm:p-8 lg:p-10">
                    <div className="mb-10 space-y-2">
                        <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">{contextLabel}</p>
                        <h1 className="font-heading text-3xl font-bold">{endedLabel}</h1>
                    </div>

                    <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <StatBlock label="Win streak" value={finalStreak} />
                        <StatBlock label="Ton record" value={ranked.playerBestStreak} />
                        <StatBlock label="Record #1" value={ranked.topStreak} />
                    </div>

                    {ranked.isNewRecord ? (
                        <p className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                            Nouveau record personnel ! {finalStreak} victoires consécutives.
                        </p>
                    ) : (
                        <p className="mb-8 text-sm text-muted-foreground">
                            {ranked.topPlayerName
                                ? `Le record du classement est détenu par ${ranked.topPlayerName} (${ranked.topStreak}).`
                                : "Sois le premier à inscrire un score sur cette épreuve."}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <Button type="button" size="lg" onClick={onReplay}>
                            Rejouer
                        </Button>
                        <Link href="/leaderboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex")}>
                            Leaderboard
                        </Link>
                        <Link href={homeHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex")}>
                            Changer d&apos;épreuve
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-16 pt-4 sm:pb-20 sm:pt-6">
            <div className="surface p-4 sm:p-8 lg:p-10">
                <div className="mb-10 space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">{contextLabel}</p>
                    <h1 className="font-heading text-3xl font-bold">Récapitulatif</h1>
                </div>

                <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatBlock label="Manches" value={stats.totalRounds} />
                    <StatBlock label="Bonnes" value={stats.correctCount} />
                    <StatBlock label="Erreurs" value={stats.incorrectCount} />
                    <StatBlock label="Réussite" value={`${stats.successRate}%`} />
                </div>

                {blurStats && blurStats.averageAttempts !== null ? (
                    <p className="mb-8 text-sm text-muted-foreground">
                        Tentatives moyennes (manches réussies) :{" "}
                        <span className="font-medium text-foreground">
                            {blurStats.averageAttempts.toLocaleString("fr-FR", {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                            })}
                        </span>
                    </p>
                ) : null}

                {stats.errors.length > 0 ? (
                    <div className="mb-10 space-y-4">
                        <h2 className="font-heading text-lg font-semibold">Erreurs</h2>
                        <ul className="space-y-3">
                            {stats.errors.map((round) => (
                                <ErrorRoundItem key={round.round} round={round} mode={mode} />
                            ))}
                        </ul>
                    </div>
                ) : rounds.length > 0 ? (
                    <p className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        Parfait ! Aucune erreur sur cette partie.
                    </p>
                ) : (
                    <p className="mb-10 text-sm text-muted-foreground">Aucune manche jouée.</p>
                )}

                <div className="flex flex-wrap gap-3">
                    <Button type="button" size="lg" onClick={onReplay}>
                        Rejouer
                    </Button>
                    <Link href={homeHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex")}>
                        Changer de jeu
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ErrorRoundItem({ round, mode }: { round: RoundRecord; mode: GameSession["mode"] }) {
    const isCry = mode === "cry-guess" || Boolean(round.userAnswerCry || round.correctAnswerCry);
    // Deduction games (and their shuffle rounds) record attemptCount / hint % on skip only.
    const isDeductionRecap = Boolean(round.skipped) && (round.hintAccuracyPercent != null || round.attemptCount != null);

    return (
        <li className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4 text-sm leading-6">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <p className="font-medium">{round.question}</p>
                    {round.questionImage && !isDeductionRecap ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/60 bg-background">
                            <Image
                                src={round.questionImage}
                                alt={round.correctAnswer}
                                fill
                                sizes="40px"
                                unoptimized={isOpaqueMediaUrl(round.questionImage)}
                                className="object-contain"
                            />
                        </div>
                    ) : null}
                </div>

                {isDeductionRecap ? (
                    <div className="flex flex-wrap gap-6">
                        <AnswerCard
                            label="Dernière proposition"
                            name={round.chosenLabel ?? (round.userAnswer !== "Abandon" ? round.userAnswer : null)}
                            image={round.chosenImage}
                            hint={round.hintAccuracyPercent != null ? `${round.hintAccuracyPercent}% d'indices trouvés` : null}
                        />
                        <AnswerCard label="Bonne réponse" name={round.correctAnswer} image={round.correctImage} />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                            <span>Ta réponse : {round.userAnswer || "—"}</span>
                            {isCry && round.userAnswerCry ? <CryPlayButton cryUrl={round.userAnswerCry} label="Écouter ta réponse" /> : null}
                        </div>

                        {round.chosenImage ? (
                            <div className="space-y-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Image choisie</p>
                                <div className="inline-flex flex-col items-center gap-1 rounded-md border border-border/60 bg-background p-2">
                                    <div className="relative h-16 w-16">
                                        <Image
                                            src={round.chosenImage}
                                            alt={round.chosenLabel ?? round.userAnswer}
                                            fill
                                            sizes="64px"
                                            unoptimized={isOpaqueMediaUrl(round.chosenImage)}
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">{round.chosenLabel ?? round.userAnswer}</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">Bonne réponse : {round.correctAnswer}</p>
                            {(mode === "cry-guess" || round.correctAnswerCry) && round.correctAnswerCry ? (
                                <CryPlayButton cryUrl={round.correctAnswerCry} label="Écouter la bonne réponse" />
                            ) : null}
                        </div>

                        {round.correctImage ? (
                            <div className="inline-flex flex-col items-center gap-1 rounded-md border border-border/60 bg-background p-2">
                                <div className="relative h-16 w-16">
                                    <Image
                                        src={round.correctImage}
                                        alt={round.correctAnswer}
                                        fill
                                        sizes="64px"
                                        unoptimized={isOpaqueMediaUrl(round.correctImage)}
                                        className="object-contain"
                                    />
                                </div>
                                <span className="text-xs font-medium text-foreground">{round.correctAnswer}</span>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </li>
    );
}

function AnswerCard({ label, name, image, hint }: { label: string; name: string | null | undefined; image?: string; hint?: string | null }) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            {name || image ? (
                <div className="inline-flex flex-col items-center gap-1 rounded-md border border-border/60 bg-background p-2">
                    {image ? (
                        <div className="relative h-16 w-16">
                            <Image
                                src={image}
                                alt={name ?? label}
                                fill
                                sizes="64px"
                                unoptimized={isOpaqueMediaUrl(image)}
                                className="object-contain"
                            />
                        </div>
                    ) : null}
                    {name ? (
                        <span className="text-xs font-medium text-foreground">{name}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">Aucune</span>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground">Aucune proposition</p>
            )}
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

function CryPlayButton({ cryUrl, label }: { cryUrl: string; label: string }) {
    return (
        <Button type="button" variant="outline" size="icon-sm" aria-label={label} title={label} onClick={() => playCryUrl(cryUrl)}>
            <PlayIcon />
        </Button>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden>
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
    );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-3xl font-bold">{value}</p>
        </div>
    );
}
