import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { formatPlayerLabel } from "@/lib/profile/display-name";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 32;
const MAX_RESULTS = 10;

const PUBLIC_ID_PATTERN = /^[A-HJ-NP-Z2-9]{2,6}$/i;

function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function extractPublicIdQuery(query: string): string | null {
  const hashMatch = query.match(/#([A-HJ-NP-Z2-9]{2,6})\b/i);
  if (hashMatch) {
    return hashMatch[1]!.toUpperCase();
  }

  if (PUBLIC_ID_PATTERN.test(query) && !query.includes(" ")) {
    return query.toUpperCase();
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalizeSearchQuery(searchParams.get("q") ?? "");

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ players: [] });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Requête trop longue." },
      { status: 400 },
    );
  }

  const publicIdQuery = extractPublicIdQuery(query);

  const profiles = await prisma.userProfile.findMany({
    where: publicIdQuery
      ? {
          publicId: {
            startsWith: publicIdQuery,
          },
        }
      : {
          pseudo: {
            contains: query,
            mode: "insensitive",
          },
        },
    select: {
      pseudo: true,
      publicId: true,
      user: { select: { name: true } },
    },
    orderBy: { pseudo: "asc" },
    take: MAX_RESULTS,
  });

  return NextResponse.json({
    players: profiles.map((profile) => ({
      publicId: profile.publicId,
      pseudo: profile.pseudo,
      userName: formatPlayerLabel({
        pseudo: profile.pseudo,
        publicId: profile.publicId,
        fallbackName: profile.user.name ?? "Dresseur inconnu",
      }),
    })),
  });
}
