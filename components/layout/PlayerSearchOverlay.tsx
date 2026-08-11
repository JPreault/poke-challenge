"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchPlayer {
  publicId: string;
  pseudo: string;
  userName: string;
}

export function PlayerSearchOverlay() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setPlayers([]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timeoutId);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPlayers([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/players/search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          players?: SearchPlayer[];
          error?: string;
        };

        if (!active) return;

        if (!response.ok) {
          setPlayers([]);
          setError(payload.error ?? "Recherche impossible.");
          return;
        }

        setPlayers(payload.players ?? []);
      } catch {
        if (active) {
          setPlayers([]);
          setError("Recherche impossible.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [open, query]);

  const selectPlayer = (publicId: string) => {
    close();
    router.push(`/joueur/${publicId}`);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Rechercher un joueur"
        title="Rechercher un joueur"
        onClick={() => setOpen(true)}
        className={cn(
          "surface flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
          "text-muted-foreground transition hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <Search className="size-4" aria-hidden />
      </button>

      {open ? (
        <div className="pointer-events-auto fixed inset-0 z-1000 flex items-start justify-center p-4 pt-20 sm:pt-28">
          <button
            type="button"
            aria-label="Fermer la recherche"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border/70 bg-background p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pseudo ou #publicId…"
                className="h-11"
                autoComplete="off"
              />
              <button
                type="button"
                aria-label="Fermer"
                onClick={close}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
              {loading ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  Recherche…
                </p>
              ) : null}

              {!loading && error ? (
                <p className="px-1 py-3 text-sm text-red-500">{error}</p>
              ) : null}

              {!loading && !error && query.trim().length < 2 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  Saisis au moins 2 caractères (pseudo ou #publicId).
                </p>
              ) : null}

              {!loading && !error && query.trim().length >= 2 && players.length === 0 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  Aucun joueur trouvé.
                </p>
              ) : null}

              {!loading && players.length > 0 ? (
                <ul className="space-y-1">
                  {players.map((player) => (
                    <li key={player.publicId}>
                      <button
                        type="button"
                        onClick={() => selectPlayer(player.publicId)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-muted"
                      >
                        <span className="font-medium">{player.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          #{player.publicId}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
