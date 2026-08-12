"use client";

import { Smartphone } from "lucide-react";
import { useState } from "react";

import { InstallWebAppModal } from "@/components/pwa/InstallWebAppModal";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

export function InstallWebAppNavButton() {
  const {
    platform,
    canNativeInstall,
    canShowInstallUi,
    prompting,
    promptNativeInstall,
  } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (!canShowInstallUi) {
    return null;
  }

  const handleInstallClick = async () => {
    if (canNativeInstall) {
      const result = await promptNativeInstall();
      if (result.ok) return;
      if (result.reason === "dismissed" || result.reason === "error") {
        setModalOpen(true);
      }
      return;
    }

    setModalOpen(true);
  };

  const handleTryNativeInstall = async () => {
    const result = await promptNativeInstall();
    if (result.ok) {
      setModalOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Installer l'application"
        title="Installer l'application"
        disabled={prompting}
        onClick={() => void handleInstallClick()}
        className={cn(
          "surface flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
          "text-muted-foreground transition hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Smartphone className="size-4" aria-hidden />
      </button>

      <InstallWebAppModal
        open={modalOpen}
        platform={platform}
        onClose={() => setModalOpen(false)}
        onTryNativeInstall={() => void handleTryNativeInstall()}
        canNativeInstall={canNativeInstall}
        prompting={prompting}
      />
    </>
  );
}
