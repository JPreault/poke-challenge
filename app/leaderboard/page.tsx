"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { RankedModeSelect } from "@/components/leaderboard/RankedModeSelect";
import { getRankedModeLabel } from "@/lib/games/ranked-limits";
import { cn } from "@/lib/utils";
import type { RankedMode } from "@prisma/client";

interface LeaderboardRow {
    rank: number;
    matchId: string;
    userId: string;
    publicId: string | null;
    userName: string;
    winStreak: number;
}

interface LeaderboardSelf {
    bestRank: number;
    winStreak: number;
    bestWinStreak: number;
    matchId: string;
    entriesInTop: number;
    inTop: boolean;
    userName: string;
    publicId: string | null;
}

interface LeaderboardResponse {
    modeLabel?: string | null;
    entries: LeaderboardRow[];
    self?: LeaderboardSelf | null;
}

function PlayerNameLink({ publicId, userName }: { publicId: string | null; userName: string }) {
    if (!publicId) {
        return <span className="truncate">{userName}</span>;
    }

    return (
        <Link href={`/joueur/${publicId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {userName}
        </Link>
    );
}

function LeaderboardEntryRow({
    rank,
    publicId,
    userName,
    winStreak,
    highlight = false,
    suffix,
}: {
    rank: number;
    publicId: string | null;
    userName: string;
    winStreak: number;
    highlight?: boolean;
    suffix?: ReactNode;
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3",
                highlight && "border-primary/30 bg-primary/5",
            )}
        >
            <span className="w-8 shrink-0 font-semibold tabular-nums text-muted-foreground">#{rank}</span>
            <div className="min-w-0 flex-1">
                <PlayerNameLink publicId={publicId} userName={userName} />
                {suffix}
            </div>
            <span className="shrink-0 font-heading text-base font-semibold tabular-nums">{winStreak}</span>
        </div>
    );
}

export default function LeaderboardPage() {
    const [mode, setMode] = useState<RankedMode>("IMAGE_TO_NAME");
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const modeLabel = useMemo(() => getRankedModeLabel(mode), [mode]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/leaderboard?mode=${mode}&page=1&pageSize=20`, { cache: "no-store" });
                const payload = (await response.json()) as LeaderboardResponse;
                if (active) setData(payload);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [mode]);

    const selfOutsideTop = data?.self && !data.self.inTop ? data.self : null;
    const selfAlreadyVisible = selfOutsideTop != null && data?.entries.some((entry) => entry.matchId === selfOutsideTop.matchId);

    return (
        <main className="flex w-full flex-col gap-6 pb-16 pt-4 sm:gap-8">
            <header className="space-y-2">
                <h1 className="font-heading text-2xl font-bold sm:text-3xl">Leaderboard</h1>
                <p className="text-muted-foreground">
                    Top 20 des meilleures parties classées par épreuve. Un joueur peut apparaître plusieurs fois s&apos;il a plusieurs scores dans le
                    classement.
                </p>
            </header>

            <RankedModeSelect value={mode} onChange={setMode} disabled={loading} />
            {loading ? <p className="text-muted-foreground">Chargement…</p> : null}

            {!loading && data?.self ? (
                <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
                    {data.self.inTop ? (
                        <>
                            Ta meilleure position sur <span className="font-medium">{modeLabel}</span> :{" "}
                            <span className="font-semibold">#{data.self.bestRank}</span> avec{" "}
                            <span className="font-semibold">{data.self.winStreak}</span> victoires consécutives
                            {data.self.entriesInTop > 1 ? ` (${data.self.entriesInTop} parties dans le top 20)` : ""}.
                        </>
                    ) : (
                        <>
                            Tu es <span className="font-semibold">#{data.self.bestRank}</span> sur <span className="font-medium">{modeLabel}</span>{" "}
                            avec <span className="font-semibold">{data.self.winStreak}</span> victoires consécutives (hors top 20).
                        </>
                    )}
                </p>
            ) : null}

            {!loading && data?.entries?.length ? (
                <>
                    <div className="space-y-2 sm:hidden">
                        {data.entries.map((entry) => (
                            <LeaderboardEntryRow
                                key={entry.matchId}
                                rank={entry.rank}
                                publicId={entry.publicId}
                                userName={entry.userName}
                                winStreak={entry.winStreak}
                            />
                        ))}
                        {selfOutsideTop && !selfAlreadyVisible ? (
                            <>
                                <p className="py-1 text-center text-xs text-muted-foreground">…</p>
                                <LeaderboardEntryRow
                                    rank={selfOutsideTop.bestRank}
                                    publicId={selfOutsideTop.publicId}
                                    userName={selfOutsideTop.userName}
                                    winStreak={selfOutsideTop.winStreak}
                                    highlight
                                    suffix={<span className="ml-1 text-xs text-muted-foreground">(toi)</span>}
                                />
                            </>
                        ) : null}
                    </div>

                    <div className="hidden overflow-x-auto sm:block sm:overflow-hidden sm:rounded-xl sm:border sm:border-border/60">
                    <table className="w-full min-w-[20rem] text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Joueur</th>
                                <th className="px-4 py-3">Win streak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries.map((entry) => (
                                <tr key={entry.matchId} className="border-t border-border/50">
                                    <td className="px-4 py-3">{entry.rank}</td>
                                    <td className="max-w-40 truncate px-4 py-3 sm:max-w-none">
                                        <PlayerNameLink publicId={entry.publicId} userName={entry.userName} />
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{entry.winStreak}</td>
                                </tr>
                            ))}
                            {selfOutsideTop && !selfAlreadyVisible ? (
                                <>
                                    <tr className="border-t border-border/50 bg-muted/20">
                                        <td colSpan={3} className="px-4 py-2 text-center text-xs text-muted-foreground">
                                            …
                                        </td>
                                    </tr>
                                    <tr className={cn("border-t border-border/50 bg-primary/5 font-medium")}>
                                        <td className="px-4 py-3">{selfOutsideTop.bestRank}</td>
                                        <td className="max-w-40 truncate px-4 py-3 sm:max-w-none">
                                            {selfOutsideTop.publicId ? (
                                                <Link
                                                    href={`/joueur/${selfOutsideTop.publicId}`}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {selfOutsideTop.userName}
                                                </Link>
                                            ) : (
                                                selfOutsideTop.userName
                                            )}
                                            <span className="ml-2 text-xs text-muted-foreground">(toi)</span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{selfOutsideTop.winStreak}</td>
                                    </tr>
                                </>
                            ) : null}
                        </tbody>
                    </table>
                    </div>
                </>
            ) : null}

            {!loading && !data?.entries?.length && !data?.self ? (
                <p className="text-sm text-muted-foreground">Aucun score enregistré pour {modeLabel} pour l&apos;instant.</p>
            ) : null}

            {!loading && !data?.entries?.length && data?.self ? (
                <>
                    <LeaderboardEntryRow
                        rank={data.self.bestRank}
                        publicId={data.self.publicId}
                        userName={data.self.userName}
                        winStreak={data.self.winStreak}
                        highlight
                        suffix={<span className="ml-1 text-xs text-muted-foreground">(toi)</span>}
                    />
                    <div className="hidden overflow-hidden rounded-xl border border-border/60 sm:block">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Joueur</th>
                                <th className="px-4 py-3">Win streak</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-border/50 bg-primary/5 font-medium">
                                <td className="px-4 py-3">{data.self.bestRank}</td>
                                <td className="px-4 py-3">
                                    {data.self.userName}
                                    <span className="ml-2 text-xs text-muted-foreground">(toi)</span>
                                </td>
                                <td className="px-4 py-3 font-semibold">{data.self.winStreak}</td>
                            </tr>
                        </tbody>
                    </table>
                    </div>
                </>
            ) : null}
        </main>
    );
}
