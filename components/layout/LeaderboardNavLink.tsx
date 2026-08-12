import Link from "next/link";
import { Trophy } from "lucide-react";

export function LeaderboardNavLink() {
  return (
    <Link
      href="/leaderboard"
      aria-label="Leaderboard"
      title="Leaderboard"
      className="header-icon-btn"
    >
      <Trophy className="size-4" aria-hidden />
    </Link>
  );
}
