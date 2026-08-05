"use client";

import { useSearchParams } from "next/navigation";

import type { GameInterfaceMode } from "@/lib/games/types";

export function useInterfaceMode(): GameInterfaceMode {
  const searchParams = useSearchParams();
  return searchParams.get("interface") === "bac-training" ? "bac-training" : "arena";
}

export function getInterfaceHomeHref(mode: GameInterfaceMode): string {
  return mode === "bac-training" ? "/?interface=bac-training" : "/";
}
