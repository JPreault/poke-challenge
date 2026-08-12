import Link from "next/link";

import { LEGAL_ROUTES } from "@/lib/legal/site-config";
import { cn } from "@/lib/utils";

export function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="legal-prose w-full pb-16 pt-8">
      <header className="mb-8 space-y-4 border-b border-border/60 pb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="font-heading text-3xl font-bold">{title}</h1>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Link
            href={LEGAL_ROUTES.mentionsLegales}
            className="underline-offset-4 hover:underline"
          >
            Mentions légales
          </Link>
          <Link
            href={LEGAL_ROUTES.confidentialite}
            className="underline-offset-4 hover:underline"
          >
            Confidentialité
          </Link>
          <Link href={LEGAL_ROUTES.cgu} className="underline-offset-4 hover:underline">
            CGU
          </Link>
          <Link href={LEGAL_ROUTES.cookies} className="underline-offset-4 hover:underline">
            Cookies
          </Link>
        </nav>
      </header>
      <div className={cn("space-y-6 break-words text-sm leading-7 text-foreground/90")}>
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
