import Link from "next/link";
import { Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

export function LeaderboardNavLink() {
  return (
    <Link
      href="/leaderboard"
      aria-label="Leaderboard"
      title="Leaderboard"
      className={cn(
        "surface flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
        "text-muted-foreground transition hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <Trophy className="size-4" aria-hidden />
    </Link>
  );
}
