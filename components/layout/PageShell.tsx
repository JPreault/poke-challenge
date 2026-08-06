import { Suspense } from "react";

import { AuthControls } from "@/components/auth/AuthControls";
import { InterfaceModeSwitcher } from "@/components/layout/InterfaceModeSwitcher";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full flex-1">
      <div aria-hidden className="pointer-events-none fixed inset-0 app-bg" />
      <div className="relative z-10 flex min-h-full flex-col">
        <div className="fixed top-0 right-0 z-50 p-4 sm:p-6">
          <div className="flex flex-col items-end gap-2">
            <Suspense fallback={null}>
              <AuthControls />
            </Suspense>
            <Suspense fallback={null}>
              <InterfaceModeSwitcher />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </div>
  );
}
