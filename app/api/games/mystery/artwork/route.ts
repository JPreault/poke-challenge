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

const PROCESSED_SIZE = 256;
const MAX_CACHE_ENTRIES = 200;

type CacheEntry = { png: Buffer; createdAt: number };
const processedImageCache = new Map<string, CacheEntry>();

function cacheKey(
  pokemonId: number,
  kind: string,
  wrongAttempts: number,
  solved: boolean,
): string {
  return solved
    ? `${pokemonId}:solved`
    : `${pokemonId}:${kind}:${wrongAttempts}`;
}

function getCachedPng(key: string): Buffer | null {
  const entry = processedImageCache.get(key);
  return entry?.png ?? null;
}

function setCachedPng(key: string, png: Buffer) {
  if (processedImageCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = processedImageCache.keys().next().value;
    if (oldest) processedImageCache.delete(oldest);
  }
  processedImageCache.set(key, { png, createdAt: Date.now() });
}

function pngResponse(png: Buffer, maxAge: number) {
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `private, max-age=${maxAge}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

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

  const key = cacheKey(
    payload.pokemonId,
    payload.kind,
    payload.wrongAttempts,
    Boolean(payload.solved),
  );
  const cached = getCachedPng(key);
  if (cached) {
    return pngResponse(cached, payload.solved ? 60 : 120);
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
    let pipeline = sharp(input).resize(PROCESSED_SIZE, PROCESSED_SIZE, {
      fit: "contain",
    });

    if (payload.solved) {
      const png = await pipeline.png().toBuffer();
      setCachedPng(key, png);
      return pngResponse(png, 60);
    }

    if (payload.kind === "blur") {
      const sigma = getMysteryBlurSigma(payload.wrongAttempts);
      if (sigma > 0) {
        pipeline = pipeline.blur(sigma);
      }
    } else {
      const ratio = getMysteryZoomCropRatio(payload.wrongAttempts);
      if (ratio < 1) {
        const cropSize = Math.max(8, Math.round(PROCESSED_SIZE * ratio));
        const left = Math.floor((PROCESSED_SIZE - cropSize) / 2);
        const top = Math.floor((PROCESSED_SIZE - cropSize) / 2);
        pipeline = pipeline
          .extract({ left, top, width: cropSize, height: cropSize })
          .resize(PROCESSED_SIZE, PROCESSED_SIZE);
      }
    }

    const png = await pipeline.png().toBuffer();
    setCachedPng(key, png);
    return pngResponse(png, 120);
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer l'image." },
      { status: 502 },
    );
  }
}
