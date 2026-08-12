import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { getSiteLegalConfig } from "@/lib/legal/site-config";

export default function CguPage() {
  const config = getSiteLegalConfig();

  return (
    <LegalDocument title="Conditions générales d'utilisation">
      <LegalSection title="Objet">
        <p>
          Les présentes conditions générales d&apos;utilisation (CGU) régissent
          l&apos;accès et l&apos;utilisation du site {config.siteName}, service
          de mini-jeux Pokémon en ligne (modes non classé, entraînement et
          classé).
        </p>
      </LegalSection>

      <LegalSection title="Accès au service">
        <p>
          Le site est accessible gratuitement. Certaines fonctionnalités
          (profil, entraînement personnalisé, mode classé, leaderboard)
          nécessitent une connexion via un compte Google.
        </p>
        <p>
          L&apos;éditeur se réserve le droit de suspendre ou modifier le service
          pour maintenance, amélioration ou force majeure, sans préavis.
        </p>
      </LegalSection>

      <LegalSection title="Création de compte">
        <p>
          En vous connectant avec Google, vous garantissez que les informations
          transmises sont exactes et que vous êtes autorisé à utiliser ce
          compte. Vous êtes responsable de l&apos;activité effectuée depuis
          votre compte.
        </p>
        <p>
          En créant un compte, vous acceptez les présentes CGU et reconnaissez
          avoir pris connaissance de la{" "}
          <Link
            href="/legal/confidentialite"
            className="text-foreground underline-offset-4 hover:underline"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Règles d'utilisation">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Choisir un pseudo respectueux, sans contenu illicite, diffamatoire,
            haineux ou trompeur.
          </li>
          <li>
            Ne pas tenter de contourner les règles du jeu, d&apos;exploiter des
            failles ou de perturber le service.
          </li>
          <li>
            Ne pas utiliser de robots, scripts ou automatisations non autorisés
            pour fausser les scores classés.
          </li>
          <li>
            Respecter les droits de propriété intellectuelle de tiers (notamment
            Nintendo / The Pokémon Company).
          </li>
        </ul>
        <p>
          Tout manquement peut entraîner la suspension ou la suppression du
          compte, sans préjudice d&apos;éventuelles actions légales.
        </p>
      </LegalSection>

      <LegalSection title="Visibilité publique">
        <p>
          En utilisant le mode classé, votre pseudo, votre identifiant public
          (#publicId) et vos scores peuvent apparaître sur le leaderboard et
          sur votre profil public accessible via{" "}
          <code className="text-foreground">/joueur/[publicId]</code>. Cette
          visibilité fait partie du fonctionnement du service.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          {config.siteName} est un projet de fan non commercial. Pokémon et
          éléments associés appartiennent à leurs propriétaires respectifs. Aucun
          lien d&apos;affiliation avec Nintendo ou The Pokémon Company n&apos;est
          revendiqué.
        </p>
        <p>
          Les contenus originaux du site ne peuvent être reproduits sans
          autorisation préalable de l&apos;éditeur.
        </p>
      </LegalSection>

      <LegalSection title="Limitation de responsabilité">
        <p>
          Le service est fourni « en l&apos;état ». L&apos;éditeur s&apos;efforce
          d&apos;assurer la disponibilité et la fiabilité du site, sans garantie
          d&apos;absence d&apos;erreurs ou d&apos;interruptions.
        </p>
        <p>
          L&apos;éditeur ne saurait être tenu responsable des dommages indirects
          liés à l&apos;utilisation du site, dans les limites autorisées par la
          loi.
        </p>
      </LegalSection>

      <LegalSection title="Suppression de compte">
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis{" "}
          <Link href="/profile" className="text-foreground underline-offset-4 hover:underline">
            votre profil
          </Link>
          . La suppression entraîne l&apos;effacement de vos données et votre
          retrait du classement public.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable et litiges">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige,
          une solution amiable sera recherchée en priorité en contactant{" "}
          <a
            href={`mailto:${config.contactEmail}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {config.contactEmail}
          </a>
          .
        </p>
        <p>
          Conformément aux dispositions du Code de la consommation, le
          consommateur peut recourir gratuitement à un médiateur de la
          consommation. Coordonnées du médiateur compétent :{" "}
          <a
            href="https://www.mediation-conso.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            www.mediation-conso.fr
          </a>
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
