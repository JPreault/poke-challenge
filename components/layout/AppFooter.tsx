import Link from "next/link";

import {
  getSiteLegalConfig,
  LEGAL_ROUTES,
} from "@/lib/legal/site-config";
import { SITE_SHELL_CLASS } from "@/lib/layout/site-shell";
import { formatAppVersion, VERSIONS_ROUTE } from "@/lib/version";
import { cn } from "@/lib/utils";

export function AppFooter() {
  const config = getSiteLegalConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 overflow-hidden border-t border-border/50 safe-bottom">
      <div
        className={cn(
          SITE_SHELL_CLASS,
          "flex flex-col gap-3 py-4 text-xs text-muted-foreground sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0",
        )}
      >
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>© {year} {config.siteName}</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <Link
            href={VERSIONS_ROUTE}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {formatAppVersion()}
          </Link>
        </p>
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
