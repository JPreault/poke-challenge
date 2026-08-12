export interface SiteLegalConfig {
  siteName: string;
  ownerName: string;
  contactEmail: string;
  hostingProvider: string;
  hostingUrl: string;
  databaseProvider: string;
}

const DEFAULTS: SiteLegalConfig = {
  siteName: "Poke Challenge",
  ownerName: "Éditeur du site",
  contactEmail: "contact@example.com",
  hostingProvider: "Vercel Inc.",
  hostingUrl: "https://vercel.com",
  databaseProvider: "Supabase (PostgreSQL, région AWS eu-west-3)",
};

export function getSiteLegalConfig(): SiteLegalConfig {
  return {
    siteName: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || DEFAULTS.siteName,
    ownerName:
      process.env.NEXT_PUBLIC_SITE_OWNER_NAME?.trim() || DEFAULTS.ownerName,
    contactEmail:
      process.env.NEXT_PUBLIC_SITE_CONTACT_EMAIL?.trim() ||
      DEFAULTS.contactEmail,
    hostingProvider:
      process.env.NEXT_PUBLIC_SITE_HOSTING_PROVIDER?.trim() ||
      DEFAULTS.hostingProvider,
    hostingUrl:
      process.env.NEXT_PUBLIC_SITE_HOSTING_URL?.trim() ||
      DEFAULTS.hostingUrl,
    databaseProvider:
      process.env.NEXT_PUBLIC_SITE_DATABASE_PROVIDER?.trim() ||
      DEFAULTS.databaseProvider,
  };
}

export const LEGAL_ROUTES = {
  mentionsLegales: "/legal/mentions-legales",
  confidentialite: "/legal/confidentialite",
  cgu: "/legal/cgu",
  cookies: "/legal/confidentialite#cookies",
} as const;
