import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { getSiteLegalConfig } from "@/lib/legal/site-config";

export default function ConfidentialitePage() {
  const config = getSiteLegalConfig();

  return (
    <LegalDocument title="Politique de confidentialité">
      <LegalSection title="Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles est{" "}
          {config.ownerName}, éditeur du site {config.siteName}.
        </p>
        <p>
          Pour toute question ou pour exercer vos droits :{" "}
          <a
            href={`mailto:${config.contactEmail}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {config.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Données collectées et finalités">
        <p>Selon votre utilisation du site, nous traitons les données suivantes :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Compte Google</strong> (connexion
            OAuth) : adresse e-mail, nom, photo de profil — pour créer et
            authentifier votre compte.
          </li>
          <li>
            <strong className="text-foreground">Profil joueur</strong> : pseudo,
            identifiant public (#publicId), préférences d&apos;interface — pour
            personnaliser votre expérience et afficher votre identité en jeu.
          </li>
          <li>
            <strong className="text-foreground">Entraînement</strong> : liste de
            Pokémon choisis — pour le mode entraînement personnalisé.
          </li>
          <li>
            <strong className="text-foreground">Mode classé</strong> : parties
            jouées, séries de victoires, scores, dates — pour le classement et
            l&apos;historique de performance.
          </li>
          <li>
            <strong className="text-foreground">Profil public</strong> : pseudo,
            identifiant public et scores classés — accessibles via la page{" "}
            <code className="text-foreground">/joueur/[publicId]</code> et la
            recherche de joueurs.
          </li>
          <li>
            <strong className="text-foreground">Session</strong> : jeton de
            session technique — pour maintenir votre connexion (voir section
            Cookies).
          </li>
        </ul>
        <p>
          Vous pouvez jouer aux mini-jeux non classés sans compte. La connexion
          Google est requise pour le profil, l&apos;entraînement personnalisé et
          le mode classé.
        </p>
      </LegalSection>

      <LegalSection title="Bases légales (RGPD)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Exécution du contrat</strong> :
            création et gestion du compte, accès aux fonctionnalités connectées
            (profil, entraînement, classé).
          </li>
          <li>
            <strong className="text-foreground">Intérêt légitime</strong> :
            affichage public du pseudo et des scores au leaderboard et sur le
            profil public, recherche de joueurs par pseudo ou identifiant.
          </li>
          <li>
            <strong className="text-foreground">Obligation légale</strong> :
            conservation minimale des données en cas d&apos;obligation applicable.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Connexion Google">
        <p>
          L&apos;authentification s&apos;effectue via Google OAuth. Lors de la
          connexion, Google nous transmet les informations autorisées par votre
          compte Google (e-mail, nom, photo). Google traite également des
          données de son côté lors de l&apos;authentification.
        </p>
        <p>
          Consultez la politique de confidentialité de Google :{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            policies.google.com/privacy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Google LLC</strong> — authentification
            OAuth.
          </li>
          <li>
            <strong className="text-foreground">{config.hostingProvider}</strong> —
            hébergement de l&apos;application (
            <a
              href={config.hostingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              {config.hostingUrl}
            </a>
            ).
          </li>
          <li>
            <strong className="text-foreground">Supabase</strong> — hébergement de
            la base de données ({config.databaseProvider}).
          </li>
        </ul>
        <p>
          Ces prestataires peuvent traiter des données en dehors de l&apos;Union
          européenne. Le cas échéant, des garanties appropriées sont mises en
          place (clauses contractuelles types, mesures de sécurité).
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. Lors d&apos;une
          suppression de compte (depuis votre profil ou sur demande), vos données
          sont effacées dans un délai maximal de 30 jours, sous réserve des
          obligations légales de conservation.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Conformément au Règlement général sur la protection des données (RGPD),
          vous disposez des droits suivants :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>droit d&apos;accès et de rectification ;</li>
          <li>droit à l&apos;effacement (« droit à l&apos;oubli ») ;</li>
          <li>droit à la limitation et à l&apos;opposition ;</li>
          <li>droit à la portabilité des données ;</li>
          <li>
            droit d&apos;introduire une réclamation auprès de la CNIL (
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              www.cnil.fr
            </a>
            ).
          </li>
        </ul>
        <p>
          Vous pouvez supprimer votre compte directement depuis{" "}
          <Link href="/profile" className="text-foreground underline-offset-4 hover:underline">
            votre profil
          </Link>
          , ou nous contacter à{" "}
          <a
            href={`mailto:${config.contactEmail}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {config.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Politique cookies" id="cookies">
        <p>
          Un cookie est un petit fichier déposé sur votre terminal lors de la
          visite d&apos;un site.
        </p>
        <p>
          <strong className="text-foreground">Cookies utilisés</strong>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <code className="text-foreground">next-auth.session-token</code> (ou{" "}
            <code className="text-foreground">__Secure-next-auth.session-token</code>{" "}
            en HTTPS) — cookie de session strictement nécessaire au
            fonctionnement de la connexion. Durée : session ou selon configuration
            Auth.js. Pas de consentement requis (cookie exempté, recommandations
            CNIL).
          </li>
        </ul>
        <p>
          <strong className="text-foreground">Cookies non utilisés</strong> : pas
          de cookies publicitaires, pas de cookies de mesure d&apos;audience
          (analytics), pas de réseaux sociaux tiers sur les pages du site.
        </p>
        <p>
          Lors de la connexion Google, des cookies peuvent être déposés par
          Google sur le domaine google.com — consultez la politique Google
          mentionnée ci-dessus.
        </p>
        <p>
          Vous pouvez configurer votre navigateur pour refuser les cookies ou
          les supprimer via les paramètres de confidentialité de votre logiciel.
          Le refus du cookie de session empêche la connexion au site.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Des mesures techniques et organisationnelles raisonnables sont mises en
          œuvre pour protéger vos données (connexion HTTPS, accès restreint à la
          base de données, authentification sécurisée).
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
