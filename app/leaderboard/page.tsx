"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  RANKED_MODES,
  type RankedModeValue,
} from "@/lib/ranked/constants";

interface LeaderboardRow {
  rank: number;
  userName: string;
  rating: number;
  gamesCount: number;
  winsCount: number;
  lossesCount: number;
}

interface LeaderboardResponse {
  season?: {
    name: string;
  };
  entries: LeaderboardRow[];
  page: number;
  total: number;
  pageSize: number;
}

const MODES = [...RANKED_MODES];

export default function LeaderboardPage() {
  const [mode, setMode] = useState<RankedModeValue>("IMAGE_TO_NAME");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const modeLabel = useMemo(
    () => mode.toLowerCase().replaceAll("_", " "),
    [mode],
  );

  const load = async (nextMode: RankedModeValue) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?mode=${nextMode}&page=1&pageSize=25`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LeaderboardResponse;
      setData(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Classement des parties classees par mode.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {MODES.map((entry) => (
          <Button
            key={entry}
            type="button"
            variant={mode === entry ? "default" : "outline"}
            onClick={() => {
              setMode(entry);
              void load(entry);
            }}
          >
            {entry.toLowerCase().replaceAll("_", " ")}
          </Button>
        ))}
      </div>

      {!data && !loading ? (
        <Button className="w-fit" onClick={() => void load(mode)}>
          Charger le classement {modeLabel}
        </Button>
      ) : null}

      {loading ? <p>Chargement…</p> : null}

      {data?.entries?.length ? (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3">Victoires</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={`${entry.rank}-${entry.userName}`} className="border-t border-border/50">
                  <td className="px-4 py-3">{entry.rank}</td>
                  <td className="px-4 py-3">{entry.userName}</td>
                  <td className="px-4 py-3">{entry.rating}</td>
                  <td className="px-4 py-3">{entry.gamesCount}</td>
                  <td className="px-4 py-3">{entry.winsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
