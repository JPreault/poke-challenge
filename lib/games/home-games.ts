import type { GameMode } from "@/lib/games/types";

export interface GameCard {
  mode: GameMode;
  title: string;
  description: string;
  tag: string;
}

export const TRAINING_GAMES: GameCard[] = [
  {
    mode: "image-to-name",
    title: "Image → Nom",
    description:
      "Une image s'affiche, choisis le bon nom parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "name-to-image",
    title: "Nom → Image",
    description:
      "Un nom s'affiche, choisis la bonne image parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "letter-input",
    title: "Lettre → Nom",
    description:
      "La lettre est tirée de ta liste. En mode strict, seuls tes Pokémon sont acceptés ; en mode libre, tous les Pokémon le sont.",
    tag: "Saisie",
  },
  {
    mode: "blur-guess",
    title: "Image flou",
    description:
      "Devine le Pokémon à partir d'une image floutée. À chaque tentative, l'image se dévoile légèrement.",
    tag: "Visuel",
  },
  {
    mode: "zoom-guess",
    title: "Image zoomer",
    description:
      "Devine le Pokémon à partir d'une image ultra zoomée. À chaque tentative, l'image se dézoome légèrement.",
    tag: "Visuel",
  },
];

export const ARENA_GAMES: GameCard[] = [
  {
    mode: "image-to-name",
    title: "Image → Nom",
    description:
      "Une image s'affiche, choisis le bon nom parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "name-to-image",
    title: "Nom → Image",
    description:
      "Un nom s'affiche, choisis la bonne image parmi 4 propositions.",
    tag: "QCM",
  },
  {
    mode: "cry-guess",
    title: "Pokémon → Cri",
    description:
      "Un Pokémon aléatoire s'affiche : trouve son cri parmi 4 propositions audio.",
    tag: "Audio",
  },
  {
    mode: "pokedle",
    title: "Pokédle",
    description:
      "Trouve le Pokémon mystère grâce à des indices colorés qui se dévoilent à chaque proposition.",
    tag: "Déduction",
  },
  {
    mode: "description-guess",
    title: "Description",
    description:
      "Lis une description Pokédex aléatoire et retrouve le Pokémon correspondant.",
    tag: "Déduction",
  },
  {
    mode: "blur-guess",
    title: "Image flou",
    description:
      "Devine le Pokémon à partir d'une image floutée. À chaque tentative, l'image se dévoile légèrement.",
    tag: "Visuel",
  },
  {
    mode: "zoom-guess",
    title: "Image zoomer",
    description:
      "Devine le Pokémon à partir d'une image ultra zoomée. À chaque tentative, l'image se dézoome légèrement.",
    tag: "Visuel",
  },
];

export const RANKED_GAMES: GameCard[] = [
  ...ARENA_GAMES,
  {
    mode: "shuffle",
    title: "Shuffle",
    description:
      "Un mini-jeu aléatoire à chaque manche, parmi toutes les épreuves classées.",
    tag: "Mix",
  },
];
