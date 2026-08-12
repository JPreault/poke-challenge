"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
        return <span>{userName}</span>;
    }

    return (
        <Link href={`/joueur/${publicId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {userName}
        </Link>
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
        <main className="flex w-full flex-col gap-8 pb-16 pt-4">
            <header className="space-y-2">
                <h1 className="font-heading text-3xl font-bold">Leaderboard</h1>
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
                <div className="overflow-hidden rounded-xl border border-border/60">
                    <table className="w-full text-sm">
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
                                    <td className="px-4 py-3">
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
                                        <td className="px-4 py-3">
                                            {selfOutsideTop.publicId ? (
                                                <Link
                                                    href={`/joueur/${selfOutsideTop.publicId}`}
                                                    className="font-medium underline-offset-4 hover:underline"
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
            ) : null}

            {!loading && !data?.entries?.length && !data?.self ? (
                <p className="text-sm text-muted-foreground">Aucun score enregistré pour {modeLabel} pour l&apos;instant.</p>
            ) : null}

            {!loading && !data?.entries?.length && data?.self ? (
                <div className="overflow-hidden rounded-xl border border-border/60">
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
            ) : null}
        </main>
    );
}
