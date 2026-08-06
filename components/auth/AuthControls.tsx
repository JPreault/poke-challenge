"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { formatPlayerLabel } from "@/lib/profile/display-name";

export function AuthControls() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="text-xs text-muted-foreground">Connexion…</div>;
  }

  if (!session?.user) {
    return (
      <Button size="sm" onClick={() => signIn("google", { callbackUrl: "/" })}>
        Connexion Google
      </Button>
    );
  }

  const label = formatPlayerLabel({
    pseudo: session.user.pseudo,
    publicId: session.user.publicId,
    fallbackName: session.user.name,
  });

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {label}
      </Link>
      <Link
        href="/leaderboard"
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Leaderboard
      </Link>
      <Button size="sm" variant="outline" onClick={() => signOut()}>
        Deconnexion
      </Button>
    </div>
  );
}
