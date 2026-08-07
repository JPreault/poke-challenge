import { Suspense } from "react";

import { AppHeader } from "@/components/layout/AppHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full flex-1">
      <div aria-hidden className="pointer-events-none fixed inset-0 app-bg" />
      <AppHeader />
      <div className="relative z-10 flex min-h-full flex-col pt-12">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </div>
  );
}
