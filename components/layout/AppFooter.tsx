import Link from "next/link";

import {
  getSiteLegalConfig,
  LEGAL_ROUTES,
} from "@/lib/legal/site-config";
import { SITE_SHELL_CLASS } from "@/lib/layout/site-shell";
import { cn } from "@/lib/utils";

export function AppFooter() {
  const config = getSiteLegalConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 overflow-hidden border-t border-border/50">
      <div
        className={cn(
          SITE_SHELL_CLASS,
          "flex h-12 flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        )}
      >
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
