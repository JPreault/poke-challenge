"use client";

import { Suspense } from "react";

import { AuthControls } from "@/components/auth/AuthControls";
import { InstallWebAppNavButton } from "@/components/layout/InstallWebAppNavButton";
import { InterfaceModeSwitcher } from "@/components/layout/InterfaceModeSwitcher";
import { LeaderboardNavLink } from "@/components/layout/LeaderboardNavLink";
import { PlayerSearchOverlay } from "@/components/layout/PlayerSearchOverlay";

export function HeaderNav() {
  return (
    <div className="pointer-events-auto flex w-full flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:flex-nowrap sm:gap-3">
      <div className="order-2 w-full sm:order-1 sm:w-auto sm:shrink-0">
        <Suspense fallback={null}>
          <InterfaceModeSwitcher />
        </Suspense>
      </div>

      <div className="order-1 flex w-full items-center gap-1.5 sm:order-2 sm:min-w-0 sm:flex-1 sm:gap-2">
        <LeaderboardNavLink />

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PlayerSearchOverlay />
          <InstallWebAppNavButton />
          <Suspense fallback={null}>
            <AuthControls />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
