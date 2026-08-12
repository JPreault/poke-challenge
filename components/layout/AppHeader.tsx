import { HeaderNav } from "@/components/layout/HeaderNav";
import { SITE_SHELL_CLASS } from "@/lib/layout/site-shell";
import { cn } from "@/lib/utils";

export function AppHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-999 header-top-gap">
      <div className={cn(SITE_SHELL_CLASS, "flex items-center py-1")}>
        <HeaderNav />
      </div>
    </header>
  );
}
