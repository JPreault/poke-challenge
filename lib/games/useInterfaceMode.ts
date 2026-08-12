"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { GameInterfaceMode } from "@/lib/games/types";

export function useInterfaceMode(): GameInterfaceMode | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === "/entrainement" || pathname.startsWith("/entrainement/")) {
    return "bac-training";
  }

  if (pathname === "/partie-classee" || pathname.startsWith("/partie-classee/")) {
    return "ranked";
  }

  if (pathname === "/leaderboard" || pathname.startsWith("/leaderboard/")) {
    return "ranked";
  }

  if (searchParams.get("interface") === "bac-training") {
    return "bac-training";
  }

  if (searchParams.get("interface") === "ranked") {
    return "ranked";
  }

  if (pathname === "/") {
    return "arena";
  }

  return null;
}

export function getInterfaceHomeHref(mode: GameInterfaceMode): string {
  if (mode === "bac-training") return "/entrainement";
  if (mode === "ranked") return "/partie-classee";
  return "/";
}
