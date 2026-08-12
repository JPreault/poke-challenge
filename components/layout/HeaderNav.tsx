"use client";

import { Suspense } from "react";

import { AuthControls } from "@/components/auth/AuthControls";
import { InstallWebAppNavButton } from "@/components/layout/InstallWebAppNavButton";
import { InterfaceModeSwitcher } from "@/components/layout/InterfaceModeSwitcher";
import { LeaderboardNavLink } from "@/components/layout/LeaderboardNavLink";
import { PlayerSearchOverlay } from "@/components/layout/PlayerSearchOverlay";

export function HeaderNav() {
  return (
    <div className="pointer-events-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Suspense fallback={null}>
          <InterfaceModeSwitcher />
        </Suspense>
        <LeaderboardNavLink />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <PlayerSearchOverlay />
        <InstallWebAppNavButton />
        <Suspense fallback={null}>
          <AuthControls />
        </Suspense>
      </div>
    </div>
  );
}
