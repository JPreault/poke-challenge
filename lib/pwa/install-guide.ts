import type { PwaPlatform } from "@/lib/pwa/platform";
import { PWA_SITE_NAME } from "@/lib/pwa/site-name";

export interface InstallGuideStep {
  title: string;
  detail?: string;
}

export interface InstallGuide {
  title: string;
  subtitle: string;
  steps: InstallGuideStep[];
  note?: string;
}

export function getInstallGuide(platform: PwaPlatform): InstallGuide {
  const appName = PWA_SITE_NAME;

  switch (platform) {
    case "ios":
      return {
        title: "Ajouter à l'écran d'accueil",
        subtitle: `Sur iPhone ou iPad, ${appName} s'installe via Safari.`,
        steps: [
          {
            title: "Ouvre le menu Partager",
            detail:
              "Appuie sur l'icône carré avec une flèche vers le haut (en bas de l'écran sur iPhone, en haut sur iPad).",
          },
          {
            title: "Choisis « Sur l'écran d'accueil »",
            detail:
              "Fais défiler les actions si besoin. Tu peux aussi utiliser « Ajouter au Dock » sur iPad.",
          },
          {
            title: "Confirme avec « Ajouter »",
            detail: `L'icône ${appName} apparaîtra sur ton écran d'accueil.`,
          },
        ],
        note: "Si tu utilises Chrome ou Firefox sur iOS, ouvre cette page dans Safari pour installer l'application.",
      };

    case "android-chrome":
      return {
        title: "Installer l'application",
        subtitle: `Ajoute ${appName} à ton téléphone avec Chrome.`,
        steps: [
          {
            title: "Ouvre le menu du navigateur",
            detail: "Appuie sur ⋮ en haut à droite.",
          },
          {
            title: "Sélectionne « Installer l'application »",
            detail:
              "Sinon, choisis « Ajouter à l'écran d'accueil » ou « Installer » selon ta version de Chrome.",
          },
          {
            title: "Valide l'installation",
            detail: "Confirme pour créer l'icône sur ton écran d'accueil.",
          },
        ],
      };

    case "android-samsung":
      return {
        title: "Installer l'application",
        subtitle: `Ajoute ${appName} avec Samsung Internet.`,
        steps: [
          {
            title: "Ouvre le menu",
            detail: "Appuie sur les trois barres ou le menu en bas de l'écran.",
          },
          {
            title: "Choisis « Ajouter page à »",
            detail: "Puis « Écran d'accueil » ou « Installer ».",
          },
          {
            title: "Confirme",
            detail: "L'application sera accessible comme une app native.",
          },
        ],
      };

    case "android-firefox":
      return {
        title: "Ajouter à l'écran d'accueil",
        subtitle: `Firefox propose un raccourci vers ${appName}.`,
        steps: [
          {
            title: "Ouvre le menu Firefox",
            detail: "Appuie sur ⋮ en haut à droite.",
          },
          {
            title: "Choisis « Installer » ou « Ajouter à l'écran d'accueil »",
            detail: "Libellé variable selon la version de Firefox Android.",
          },
          {
            title: "Confirme l'ajout",
            detail: "Le raccourci ouvrira le site en plein écran.",
          },
        ],
        note: "Pour une expérience optimale, Chrome ou Samsung Internet est recommandé.",
      };

    case "android-other":
      return {
        title: "Ajouter à l'écran d'accueil",
        subtitle: `Installe ${appName} depuis le menu de ton navigateur.`,
        steps: [
          {
            title: "Ouvre le menu du navigateur",
            detail: "Repère ⋮ ou l'icône de menu.",
          },
          {
            title: "Cherche « Ajouter à l'écran d'accueil » ou « Installer »",
            detail: "Le libellé dépend de ton navigateur.",
          },
          {
            title: "Confirme",
            detail: "Tu pourras lancer le jeu depuis ton écran d'accueil.",
          },
        ],
      };

    case "desktop-chrome":
    case "desktop-edge":
      return {
        title: "Installer l'application",
        subtitle: `Installe ${appName} sur ton ordinateur.`,
        steps: [
          {
            title: "Repère l'icône d'installation",
            detail:
              "Dans la barre d'adresse, clique sur l'icône « Installer » ou « + » si elle apparaît.",
          },
          {
            title: "Ou utilise le menu du navigateur",
            detail: "⋮ → « Installer Poke Challenge » / « Installer cette application ».",
          },
          {
            title: "Confirme",
            detail: "L'application s'ouvrira dans sa propre fenêtre.",
          },
        ],
      };

    case "desktop-safari":
      return {
        title: "Ajouter au Dock",
        subtitle: `Safari sur Mac peut épingler ${appName}.`,
        steps: [
          {
            title: "Ouvre le menu Fichier",
            detail: "Dans la barre de menus en haut de l'écran.",
          },
          {
            title: "Choisis « Ajouter au Dock »",
            detail: "Disponible sur macOS Sonoma et versions ultérieures.",
          },
          {
            title: "Confirme",
            detail: "L'icône sera accessible depuis le Dock.",
          },
        ],
      };

    case "desktop-firefox":
      return {
        title: "Créer un raccourci",
        subtitle: `Firefox ne propose pas d'installation PWA complète pour ${appName}.`,
        steps: [
          {
            title: "Épingle l'onglet",
            detail: "Clic droit sur l'onglet → « Épingler l'onglet ».",
          },
          {
            title: "Ou crée un marque-page",
            detail: "Ajoute cette page à ta barre de favoris pour un accès rapide.",
          },
        ],
        note: "Pour une vraie application, utilise Chrome ou Edge.",
      };

    default:
      return {
        title: "Installer l'application",
        subtitle: `Ajoute ${appName} depuis le menu de ton navigateur.`,
        steps: [
          {
            title: "Ouvre le menu du navigateur",
            detail: "Cherche une option « Installer » ou « Ajouter à l'écran d'accueil ».",
          },
          {
            title: "Suis les instructions à l'écran",
            detail: "Le libellé varie selon le navigateur et l'appareil.",
          },
        ],
      };
  }
}
