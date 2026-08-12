"use client";

import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useState } from "react";

import { InstallWebAppModal } from "@/components/pwa/InstallWebAppModal";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { isMobilePlatform } from "@/lib/pwa/platform";
import { PWA_SITE_NAME } from "@/lib/pwa/site-name";

export function InstallWebAppSection() {
  const {
    platform,
    isStandalone,
    canNativeInstall,
    canShowInstallUi,
    prompting,
    promptNativeInstall,
  } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (!canShowInstallUi && !isStandalone) {
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

  const mobile = isMobilePlatform(platform);
  const buttonLabel = canNativeInstall
    ? "Installer l'application"
    : platform === "ios"
      ? "Ajouter à l'écran d'accueil"
      : mobile
        ? "Installer sur mon téléphone"
        : "Installer l'application";

  return (
    <>
      <section className="space-y-4 rounded-xl border border-border/60 bg-background/80 p-6">
        <div className="flex items-start gap-3">
          <span className="surface flex size-11 shrink-0 items-center justify-center rounded-2xl text-primary shadow-sm">
            {isStandalone ? (
              <CheckCircle2 className="size-5" aria-hidden />
            ) : (
              <Smartphone className="size-5" aria-hidden />
            )}
          </span>
          <div className="space-y-1">
            <h2 className="font-semibold">Application mobile</h2>
            {isStandalone ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {PWA_SITE_NAME} est déjà installé sur cet appareil. Tu peux le
                lancer depuis ton écran d&apos;accueil ou ton Dock.
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Installe {PWA_SITE_NAME} sur ton{" "}
                {mobile ? "téléphone" : "appareil"} pour y accéder en plein
                écran, comme une application native.
              </p>
            )}
          </div>
        </div>

        {!isStandalone ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={prompting}
            onClick={() => void handleInstallClick()}
          >
            <Download className="size-4" aria-hidden />
            {prompting ? "Installation…" : buttonLabel}
          </Button>
        ) : null}
      </section>

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
