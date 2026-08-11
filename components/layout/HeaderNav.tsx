"use client";

import { Suspense } from "react";

import { AuthControls } from "@/components/auth/AuthControls";
import { InterfaceModeSwitcher } from "@/components/layout/InterfaceModeSwitcher";
import { LeaderboardNavLink } from "@/components/layout/LeaderboardNavLink";
import { PlayerSearchOverlay } from "@/components/layout/PlayerSearchOverlay";

export function HeaderNav() {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <PlayerSearchOverlay />
      <LeaderboardNavLink />
      <Suspense fallback={null}>
        <InterfaceModeSwitcher />
      </Suspense>
      <Suspense fallback={null}>
        <AuthControls />
      </Suspense>
    </div>
  );
}
