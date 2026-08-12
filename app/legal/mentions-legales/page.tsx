import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { getSiteLegalConfig } from "@/lib/legal/site-config";

export default function MentionsLegalesPage() {
  const config = getSiteLegalConfig();

  return (
    <LegalDocument title="Mentions légales">
      <LegalSection title="Éditeur du site">
        <p>
          Le site {config.siteName} est édité par {config.ownerName}, agissant en
          qualité de particulier.
        </p>
        <p>
          Contact :{" "}
          <a
            href={`mailto:${config.contactEmail}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {config.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <p>{config.ownerName}</p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          L&apos;application web est hébergée par{" "}
          <a
            href={config.hostingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {config.hostingProvider}
          </a>
          .
        </p>
        <p>
          Les données utilisateurs sont stockées dans une base de données gérée
          par {config.databaseProvider}.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les contenus originaux du site (textes, interface, code) sont la
          propriété de {config.ownerName}, sauf mention contraire.
        </p>
        <p>
          Pokémon, ainsi que les noms, images et autres éléments associés, sont
          des marques et propriétés de Nintendo, Creatures Inc. et GAME FREAK
          inc. {config.siteName} est un projet de fan à but non commercial, non
          affilié, approuvé ou sponsorisé par Nintendo ou The Pokémon Company.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Pour toute information relative à la collecte et au traitement de vos
          données, consultez la{" "}
          <Link
            href="/legal/confidentialite"
            className="text-foreground underline-offset-4 hover:underline"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <p className="text-xs text-muted-foreground">
        Dernière mise à jour : août 2026. Document rédigé pour un projet
        personnel ; en cas d&apos;activité commerciale, faire valider par un
        juriste.
      </p>
    </LegalDocument>
  );
}
