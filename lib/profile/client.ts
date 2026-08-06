"use client";

import { useEffect, useState } from "react";

import type { GameInterfaceMode } from "@/lib/games/types";

export interface ClientProfilePrefs {
  preferredInterfaceMode: GameInterfaceMode;
  pseudo?: string;
  publicId?: string;
  trainingPokemonIds?: number[];
}

export function useProfilePreferences() {
  const [prefs, setPrefs] = useState<ClientProfilePrefs | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile: ClientProfilePrefs;
        };
        if (!active) return;
        setPrefs(payload.profile);
      } catch {
        // ignore guest / unavailable profile
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return prefs;
}
