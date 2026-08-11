import type { Metadata } from "next";

import { PlayerPublicPage } from "@/app/joueur/[publicId]/PlayerPublicPage";
import { prisma } from "@/lib/db/prisma";
import { formatPlayerLabel } from "@/lib/profile/display-name";

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId: rawPublicId } = await params;
  const publicId = rawPublicId.trim().toUpperCase();

  const profile = await prisma.userProfile.findUnique({
    where: { publicId },
    select: {
      pseudo: true,
      publicId: true,
      user: { select: { name: true } },
    },
  });

  if (!profile) {
    return { title: "Joueur introuvable — Poke Challenge" };
  }

  const userName = formatPlayerLabel({
    pseudo: profile.pseudo,
    publicId: profile.publicId,
    fallbackName: profile.user.name ?? "Dresseur inconnu",
  });

  return {
    title: `${userName} — Poke Challenge`,
  };
}

export default async function Page({ params }: PageProps) {
  const { publicId } = await params;
  return <PlayerPublicPage publicId={publicId.trim().toUpperCase()} />;
}
