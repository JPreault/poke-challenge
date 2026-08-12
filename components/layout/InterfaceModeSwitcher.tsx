"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  getInterfaceHomeHref,
  useInterfaceMode,
} from "@/lib/games/useInterfaceMode";
import { cn } from "@/lib/utils";

export function InterfaceModeSwitcher() {
  const router = useRouter();
  const selectedInterface = useInterfaceMode();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const tabClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "shrink-0 px-2 text-xs sm:px-3 sm:text-sm",
      active && "bg-muted",
    );

  return (
    <div
      className={cn(
        "surface inline-flex w-auto max-w-[min(100%,calc(100vw-12rem))] shrink gap-0.5 overflow-x-auto p-0.5 shadow-sm sm:max-w-none sm:gap-1 sm:p-1",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {isAuthenticated ? (
        <button
          type="button"
          className={tabClass(selectedInterface === "bac-training")}
          onClick={() => router.push(getInterfaceHomeHref("bac-training"))}
        >
          Entraînement
        </button>
      ) : null}
      <button
        type="button"
        className={tabClass(selectedInterface === "arena")}
        onClick={() => router.push(getInterfaceHomeHref("arena"))}
      >
        <span className="sm:hidden">Libre</span>
        <span className="hidden sm:inline">Non classée</span>
      </button>
      {isAuthenticated ? (
        <button
          type="button"
          className={tabClass(selectedInterface === "ranked")}
          onClick={() => router.push(getInterfaceHomeHref("ranked"))}
        >
          Classée
        </button>
      ) : null}
    </div>
  );
}
