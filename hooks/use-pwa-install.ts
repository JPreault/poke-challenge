"use client";

import { useCallback, useEffect, useState } from "react";

import type { BeforeInstallPromptEvent } from "@/lib/pwa/before-install-prompt";
import {
  detectPwaPlatform,
  isStandaloneDisplayMode,
  supportsNativeInstallPrompt,
  type PwaPlatform,
} from "@/lib/pwa/platform";

export function usePwaInstall() {
  const [platform, setPlatform] = useState<PwaPlatform>("desktop-other");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    setPlatform(detectPwaPlatform(navigator.userAgent));
    setIsStandalone(isStandaloneDisplayMode());

    const media = window.matchMedia("(display-mode: standalone)");

    const syncStandalone = () => {
      setIsStandalone(isStandaloneDisplayMode());
    };

    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    media.addEventListener("change", syncStandalone);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      media.removeEventListener("change", syncStandalone);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canNativeInstall = Boolean(deferredPrompt) && !isStandalone;

  const promptNativeInstall = useCallback(async () => {
    if (!deferredPrompt || prompting) {
      return { ok: false as const, reason: "unavailable" as const };
    }

    setPrompting(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        setIsStandalone(isStandaloneDisplayMode());
        return { ok: true as const };
      }

      return { ok: false as const, reason: "dismissed" as const };
    } catch {
      return { ok: false as const, reason: "error" as const };
    } finally {
      setPrompting(false);
    }
  }, [deferredPrompt, prompting]);

  return {
    platform,
    isStandalone,
    canNativeInstall,
    canShowInstallUi: !isStandalone,
    expectsNativePrompt:
      supportsNativeInstallPrompt(platform) && !isStandalone,
    prompting,
    promptNativeInstall,
  };
}
