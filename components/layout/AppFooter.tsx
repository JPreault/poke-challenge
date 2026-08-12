import Link from "next/link";

import {
  getSiteLegalConfig,
  LEGAL_ROUTES,
} from "@/lib/legal/site-config";

export function AppFooter() {
  const config = getSiteLegalConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="flex h-12 shrink-0 items-center overflow-hidden border-t border-border/50 px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p>© {year} {config.siteName}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href={LEGAL_ROUTES.mentionsLegales}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Mentions légales
          </Link>
          <Link
            href={LEGAL_ROUTES.confidentialite}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Confidentialité
          </Link>
          <Link
            href={LEGAL_ROUTES.cgu}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            CGU
          </Link>
          <Link
            href={LEGAL_ROUTES.cookies}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Cookies
          </Link>
        </nav>
        <p>
          <a
            href={`mailto:${config.contactEmail}`}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {config.contactEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}
