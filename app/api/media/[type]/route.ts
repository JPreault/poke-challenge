import { NextResponse } from "next/server";

import { resolveMediaUrl } from "@/lib/games/media-resolve";
import type { MediaKind } from "@/lib/games/media-token";

const VALID_KINDS = new Set<MediaKind>(["artwork", "sprite", "cry"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const { type } = await context.params;
  const kind = type as MediaKind;

  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "Type de média invalide." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });
  }

  const upstreamUrl = resolveMediaUrl(token, kind);
  if (!upstreamUrl) {
    return NextResponse.json(
      { error: "Média expiré ou invalide." },
      { status: 404 },
    );
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Média indisponible." },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") ??
      (kind === "cry" ? "audio/ogg" : "image/png");

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer le média." },
      { status: 502 },
    );
  }
}
