import sharp from "sharp";
import { NextResponse } from "next/server";

import {
  getMysteryBlurSigma,
  getMysteryZoomCropRatio,
} from "@/lib/games/mystery-image";
import {
  resolveMysteryArtworkPayload,
  resolveMysteryArtworkUrl,
} from "@/lib/games/mystery-round";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });
  }

  const payload = resolveMysteryArtworkPayload(token);
  const artworkUrl = resolveMysteryArtworkUrl(token);
  if (!payload || !artworkUrl) {
    return NextResponse.json(
      { error: "Manche expirée ou invalide." },
      { status: 404 },
    );
  }

  try {
    const upstream = await fetch(artworkUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Image indisponible." },
        { status: 502 },
      );
    }

    const input = Buffer.from(await upstream.arrayBuffer());
    const size = 512;
    let pipeline = sharp(input).resize(size, size, { fit: "contain" });

    if (payload.solved) {
      const png = await pipeline.png().toBuffer();
      return new NextResponse(new Uint8Array(png), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, max-age=60",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (payload.kind === "blur") {
      const sigma = getMysteryBlurSigma(payload.wrongAttempts);
      if (sigma > 0) {
        pipeline = pipeline.blur(sigma);
      }
    } else {
      const ratio = getMysteryZoomCropRatio(payload.wrongAttempts);
      if (ratio < 1) {
        const cropSize = Math.max(8, Math.round(size * ratio));
        const left = Math.floor((size - cropSize) / 2);
        const top = Math.floor((size - cropSize) / 2);
        pipeline = pipeline
          .extract({ left, top, width: cropSize, height: cropSize })
          .resize(size, size);
      }
    }

    const png = await pipeline.png().toBuffer();

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
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
