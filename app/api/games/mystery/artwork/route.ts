import { NextResponse } from "next/server";

import { resolveMysteryArtworkUrl } from "@/lib/games/mystery-round";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json(
      { error: "Jeton manquant." },
      { status: 400 },
    );
  }

  const artworkUrl = resolveMysteryArtworkUrl(token);
  if (!artworkUrl) {
    return NextResponse.json(
      { error: "Manche expirée ou invalide." },
      { status: 404 },
    );
  }

  try {
    const upstream = await fetch(artworkUrl, {
      // Artwork is public CDN content; cache at the edge briefly.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Image indisponible." },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Keep opaque: do not expose upstream URL; allow short private cache.
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer l'image." },
      { status: 502 },
    );
  }
}
