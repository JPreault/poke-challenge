"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ARENA_GAMES } from "@/lib/games/home-games";
import { cn } from "@/lib/utils";

export default function PartieClasseePage() {
  const router = useRouter();
  const { status } = useSession();
  const gameLinksRef = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/partie-classee");
    }
  }, [status, router]);

  const handleGameCardKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    const columns = 2;
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = index + 1;
    if (event.key === "ArrowLeft") nextIndex = index - 1;
    if (event.key === "ArrowDown") nextIndex = index + columns;
    if (event.key === "ArrowUp") nextIndex = index - columns;

    if (nextIndex === index) return;
    if (nextIndex < 0 || nextIndex >= ARENA_GAMES.length) return;

    event.preventDefault();
    gameLinksRef.current[nextIndex]?.focus();
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
        <p className="text-muted-foreground">Chargement du mode classé…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
      <header className="mb-20 max-w-2xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Poke Challenge
        </p>
        <h1 className="font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl">
          Classée
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Enchaîne les manches sans erreur pour battre ton record de win streak. La partie
          s&apos;arrête dès que tu échoues ou abandonnes.
        </p>
      </header>

      <section className="mb-24">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="font-heading text-base font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:text-lg">
            Épreuves
          </h2>
          <Link
            href="/leaderboard"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "shrink-0")}
          >
            Leaderboard
          </Link>
        </div>
        <div className="grid gap-4">
          {ARENA_GAMES.map((game, index) => (
            <article
              key={game.mode}
              className="surface-hover flex items-center gap-4 p-5 md:gap-6 md:p-6"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">
                  {game.title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                  {game.description}
                </p>
              </div>

              <Link
                href={`/game/${game.mode}?interface=ranked`}
                ref={(node) => {
                  gameLinksRef.current[index] = node;
                }}
                onKeyDown={(event) => handleGameCardKeyDown(event, index)}
                aria-label={`Jouer à ${game.title} en mode classé`}
                title={`Jouer à ${game.title} en mode classé`}
                className={cn(buttonVariants({ size: "icon-lg" }), "shrink-0")}
              >
                <Play className="size-5 fill-current" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
