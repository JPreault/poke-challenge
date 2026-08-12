import type { MetadataRoute } from "next";

import { PWA_SITE_NAME } from "@/lib/pwa/site-name";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_SITE_NAME,
    short_name: PWA_SITE_NAME,
    description:
      "Entraîne tes connaissances Pokémon avec des mini-jeux classés et non classés.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "fr",
    dir: "ltr",
    background_color: "#faf9f7",
    theme_color: "#b91c1c",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
