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

  return (
    <div className="surface inline-flex gap-1 p-1 shadow-sm">
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "whitespace-nowrap",
          selectedInterface === "arena" && "bg-muted",
        )}
        onClick={() => router.push(getInterfaceHomeHref("arena"))}
      >
        Mode Arène
      </button>
      {isAuthenticated ? (
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "whitespace-nowrap",
            selectedInterface === "bac-training" && "bg-muted",
          )}
          onClick={() => router.push(getInterfaceHomeHref("bac-training"))}
        >
          Entraînement
        </button>
      ) : null}
    </div>
  );
}
