"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Silent: install UI still shows manual instructions if SW fails.
    });
  }, []);

  return null;
}
