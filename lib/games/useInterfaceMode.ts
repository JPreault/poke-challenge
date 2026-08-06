"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { useProfilePreferences } from "@/lib/profile/client";
import type { GameInterfaceMode } from "@/lib/games/types";

export function useInterfaceMode(): GameInterfaceMode {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const profilePrefs = useProfilePreferences();
  const hasQueryInterface = searchParams.has("interface");
  const forcedMode =
    searchParams.get("interface") === "bac-training" ? "bac-training" : "arena";

  if (status !== "authenticated") {
    return "arena";
  }

  if (hasQueryInterface) {
    return forcedMode;
  }

  return profilePrefs?.preferredInterfaceMode ?? "arena";
}

export function getInterfaceHomeHref(mode: GameInterfaceMode): string {
  return mode === "bac-training" ? "/?interface=bac-training" : "/";
}
