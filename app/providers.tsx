"use client";

import { SessionProvider } from "next-auth/react";

import { PwaServiceWorkerRegister } from "@/components/pwa/PwaServiceWorkerRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaServiceWorkerRegister />
      {children}
    </SessionProvider>
  );
}
