"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ARENA_RANKED_MODES,
  getRankedModeLabel,
} from "@/lib/games/ranked-limits";
import { cn } from "@/lib/utils";
import type { RankedMode } from "@prisma/client";

interface LeaderboardRow {
  rank: number;
  matchId: string;
  userId: string;
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
}

interface LeaderboardResponse {
  season?: {
    name: string;
  };
  modeLabel?: string | null;
  entries: LeaderboardRow[];
  self?: LeaderboardSelf | null;
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
        const response = await fetch(
          `/api/leaderboard?mode=${mode}&page=1&pageSize=20`,
          { cache: "no-store" },
        );
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

  const selfOutsideTop =
    data?.self && !data.self.inTop ? data.self : null;
  const selfAlreadyVisible =
    selfOutsideTop != null &&
    data?.entries.some((entry) => entry.matchId === selfOutsideTop.matchId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-16 pt-4">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Top 20 des meilleures parties classées par épreuve. Un joueur peut
          apparaître plusieurs fois s&apos;il a plusieurs scores dans le
          classement.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="leaderboard-mode" className="text-sm font-medium">
          Épreuve
        </label>
        <select
          id="leaderboard-mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as RankedMode)}
          className="h-11 min-w-[16rem] rounded-xl border border-input bg-background px-3 text-sm"
        >
          {ARENA_RANKED_MODES.map((entry) => (
            <option key={entry} value={entry}>
              {getRankedModeLabel(entry)}
            </option>
          ))}
        </select>
      </div>

      {data?.season ? (
        <p className="text-sm text-muted-foreground">Saison : {data.season.name}</p>
      ) : null}

      {loading ? <p className="text-muted-foreground">Chargement…</p> : null}

      {!loading && data?.self ? (
        <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
          {data.self.inTop ? (
            <>
              Ta meilleure position sur{" "}
              <span className="font-medium">{modeLabel}</span> :{" "}
              <span className="font-semibold">#{data.self.bestRank}</span> avec{" "}
              <span className="font-semibold">{data.self.winStreak}</span> victoires
              consécutives
              {data.self.entriesInTop > 1
                ? ` (${data.self.entriesInTop} parties dans le top 20)`
                : ""}
              .
            </>
          ) : (
            <>
              Tu es <span className="font-semibold">#{data.self.bestRank}</span> sur{" "}
              <span className="font-medium">{modeLabel}</span> avec{" "}
              <span className="font-semibold">{data.self.winStreak}</span> victoires
              consécutives (hors top 20).
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
                  <td className="px-4 py-3">{entry.userName}</td>
                  <td className="px-4 py-3 font-semibold">{entry.winStreak}</td>
                </tr>
              ))}
              {selfOutsideTop && !selfAlreadyVisible ? (
                <>
                  <tr className="border-t border-border/50 bg-muted/20">
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-center text-xs text-muted-foreground"
                    >
                      …
                    </td>
                  </tr>
                  <tr
                    className={cn(
                      "border-t border-border/50 bg-primary/5 font-medium",
                    )}
                  >
                    <td className="px-4 py-3">{selfOutsideTop.bestRank}</td>
                    <td className="px-4 py-3">
                      {selfOutsideTop.userName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (toi)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {selfOutsideTop.winStreak}
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !data?.entries?.length && !data?.self ? (
        <p className="text-sm text-muted-foreground">
          Aucun score enregistré pour {modeLabel} pour l&apos;instant.
        </p>
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
