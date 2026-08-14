import type { Metadata } from "next";
import Link from "next/link";

import {
  APP_VERSION,
  formatAppVersion,
  getPublicReleaseNotes,
  getReleaseKindLabel,
  isPreReleaseVersion,
} from "@/lib/version";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Versions",
  robots: { index: false },
};

function formatReleaseDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export default function VersionsPage() {
  const notes = getPublicReleaseNotes();

  return (
    <article className="w-full pb-16 pt-8">
      <header className="mb-8 space-y-3 border-b border-border/60 pb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="font-heading text-3xl font-bold">Notes de version</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Version actuelle : {formatAppVersion()}
          {isPreReleaseVersion() ? " (pré-version)" : null}
        </p>
      </header>

      <div className="space-y-8">
        {notes.map((note) => (
          <section
            key={note.version}
            className="space-y-3 border-b border-border/40 pb-8 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                  note.kind === "major"
                    ? "border-foreground/20 bg-muted text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {getReleaseKindLabel(note.kind)}
              </span>
              <h2 className="font-heading text-lg font-semibold">
                v{note.version}
              </h2>
              {note.date ? (
                <span className="text-xs text-muted-foreground">
                  {formatReleaseDate(note.date)}
                </span>
              ) : null}
            </div>

            {note.title ? (
              <p className="text-sm font-medium text-foreground/90">
                {note.title}
              </p>
            ) : null}

            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground/90">
              {note.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune note de version publiée pour le moment.
        </p>
      ) : null}

      <p className="mt-10 text-xs text-muted-foreground">
        Version affichée : {APP_VERSION}
      </p>
    </article>
  );
}
