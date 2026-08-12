"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

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
        className="header-icon-btn"
      >
        <Search className="size-4" aria-hidden />
      </button>

      {open ? (
        <div className="pointer-events-auto fixed inset-0 z-1000 flex items-end justify-center sm:items-start sm:p-4 sm:pt-28">
          <button
            type="button"
            aria-label="Fermer la recherche"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative z-10 flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-2xl border border-border/70 bg-background shadow-2xl safe-bottom sm:max-h-none sm:rounded-2xl sm:p-0">
            <div className="border-b border-border/60 p-4 sm:border-0 sm:p-5">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pseudo ou #publicId…"
                  className="h-11 text-base"
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
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
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-muted"
                      >
                        <span className="min-w-0 truncate font-medium">{player.userName}</span>
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
