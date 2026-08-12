"use client";

import { Suspense } from "react";

import { AuthControls } from "@/components/auth/AuthControls";
import { InstallWebAppNavButton } from "@/components/layout/InstallWebAppNavButton";
import { InterfaceModeSwitcher } from "@/components/layout/InterfaceModeSwitcher";
import { LeaderboardNavLink } from "@/components/layout/LeaderboardNavLink";
import { PlayerSearchOverlay } from "@/components/layout/PlayerSearchOverlay";

export function HeaderNav() {
  return (
    <div className="pointer-events-auto flex w-full items-center gap-1.5 sm:gap-3">
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Suspense fallback={null}>
          <InterfaceModeSwitcher />
        </Suspense>
        <LeaderboardNavLink />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <PlayerSearchOverlay />
        <InstallWebAppNavButton />
        <Suspense fallback={null}>
          <AuthControls />
        </Suspense>
      </div>
    </div>
  );
}
