import { Suspense } from "react";

import { AuthControls } from "@/components/auth/AuthControls";
import { InterfaceModeSwitcher } from "@/components/layout/InterfaceModeSwitcher";
import { LeaderboardNavLink } from "@/components/layout/LeaderboardNavLink";

export function AppHeader() {
    return (
        <header className="pointer-events-none fixed inset-x-0 pt-4 top-0 z-999">
            <div className="flex h-12 items-center justify-end gap-2 px-4 sm:px-6">
                <div className="pointer-events-auto flex items-center gap-2">
                    <LeaderboardNavLink />
                    <Suspense fallback={null}>
                        <InterfaceModeSwitcher />
                    </Suspense>
                    <Suspense fallback={null}>
                        <AuthControls />
                    </Suspense>
                </div>
            </div>
        </header>
    );
}
