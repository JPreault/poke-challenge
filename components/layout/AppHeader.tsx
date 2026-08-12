import { HeaderNav } from "@/components/layout/HeaderNav";
import { SITE_SHELL_CLASS } from "@/lib/layout/site-shell";
import { cn } from "@/lib/utils";

export function AppHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-999 safe-top pt-2 sm:pt-4">
      <div className={cn(SITE_SHELL_CLASS, "flex h-12 items-center")}>
        <HeaderNav />
      </div>
    </header>
  );
}
