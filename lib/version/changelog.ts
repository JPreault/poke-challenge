/**
 * Historique éditorial des versions.
 *
 * Processus de release :
 * 1. Bumper package.json (npm version minor | major | patch)
 * 2. Ajouter une entrée en tête de RELEASE_NOTES
 * 3. Seules les entrées major/minor sont affichées sur /versions
 */

export type ReleaseKind = "major" | "minor" | "patch";

export interface ReleaseNote {
  version: string;
  kind: ReleaseKind;
  date?: string;
  title?: string;
  highlights: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "0.1.0",
    kind: "minor",
    date: "2026-08-14",
    title: "Première beta publique",
    highlights: [
      "Mode non classé avec 7 mini-jeux (QCM, audio, Pokédle, description, image flou / zoomer) et mode shuffle",
      "Mode entraînement sur liste personnalisée (connexion requise)",
      "Mode classé avec matchmaking et classements",
      "Leaderboard et profils joueurs publics",
      "Connexion Google, profil et statistiques de parties",
      "Installation PWA et pages légales",
    ],
  },
];

export function getPublicReleaseNotes(): ReleaseNote[] {
  return RELEASE_NOTES.filter(
    (note) => note.kind === "major" || note.kind === "minor",
  );
}

export function getReleaseKindLabel(kind: ReleaseKind): string {
  if (kind === "major") return "Majeure";
  if (kind === "minor") return "Mineure";
  return "Correctif";
}
