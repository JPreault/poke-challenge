"use client";

import { Share2, Smartphone, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { getInstallGuide } from "@/lib/pwa/install-guide";
import type { PwaPlatform } from "@/lib/pwa/platform";
import { PWA_SITE_NAME } from "@/lib/pwa/site-name";
import { cn } from "@/lib/utils";

interface InstallWebAppModalProps {
  open: boolean;
  platform: PwaPlatform;
  onClose: () => void;
  onTryNativeInstall?: () => void;
  canNativeInstall?: boolean;
  prompting?: boolean;
}

export function InstallWebAppModal({
  open,
  platform,
  onClose,
  onTryNativeInstall,
  canNativeInstall = false,
  prompting = false,
}: InstallWebAppModalProps) {
  const guide = getInstallGuide(platform);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-1000 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-webapp-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl"
      >
        <div className="border-b border-border/60 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--poke-red)_10%,transparent),color-mix(in_oklch,var(--poke-gold)_12%,transparent))] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="surface flex size-11 shrink-0 items-center justify-center rounded-2xl text-primary shadow-sm">
                <Smartphone className="size-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <h2
                  id="install-webapp-title"
                  className="font-heading text-xl font-bold text-foreground"
                >
                  {guide.title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {guide.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {canNativeInstall && onTryNativeInstall ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-foreground">
                Ton navigateur permet une installation directe de{" "}
                <span className="font-medium">{PWA_SITE_NAME}</span>.
              </p>
              <Button
                type="button"
                className="mt-3 w-full sm:w-auto"
                disabled={prompting}
                onClick={() => void onTryNativeInstall()}
              >
                {prompting ? "Installation…" : "Installer maintenant"}
              </Button>
            </div>
          ) : null}

          <ol className="space-y-3">
            {guide.steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-xl border border-border/60 bg-muted/30 p-4"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">{step.title}</p>
                  {step.detail ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {platform === "ios" ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
              <Share2 className="size-4 shrink-0 text-primary" aria-hidden />
              <span>Le bouton Partager se trouve en bas (iPhone) ou en haut (iPad).</span>
            </div>
          ) : null}

          {guide.note ? (
            <p
              className={cn(
                "rounded-xl border border-border/60 px-4 py-3 text-sm leading-6",
                "text-muted-foreground",
              )}
            >
              {guide.note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
