"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { GameInterfaceMode } from "@/lib/games/types";

export function useInterfaceMode(): GameInterfaceMode {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === "/entrainement" || pathname.startsWith("/entrainement/")) {
    return "bac-training";
  }

  if (searchParams.get("interface") === "bac-training") {
    return "bac-training";
  }

  return "arena";
}

export function getInterfaceHomeHref(mode: GameInterfaceMode): string {
  return mode === "bac-training" ? "/entrainement" : "/";
}
