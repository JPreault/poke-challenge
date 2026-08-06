import { randomBytes } from "crypto";

import { prisma } from "@/lib/db/prisma";

/** Alphabet without ambiguous characters (0/O, 1/I/L). */
const PUBLIC_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_ID_LENGTH = 6;

export function generatePublicIdCandidate(): string {
  const bytes = randomBytes(PUBLIC_ID_LENGTH);
  let result = "";
  for (let i = 0; i < PUBLIC_ID_LENGTH; i += 1) {
    result += PUBLIC_ID_ALPHABET[bytes[i]! % PUBLIC_ID_ALPHABET.length];
  }
  return result;
}

export async function allocatePublicId(maxAttempts = 12): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generatePublicIdCandidate();
    const existing = await prisma.userProfile.findUnique({
      where: { publicId: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Impossible de générer un identifiant public unique.");
}

export function sanitizePseudo(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 24) return null;
  if (!/^[\p{L}\p{N} _.-]+$/u.test(trimmed)) return null;
  return trimmed;
}

export function defaultPseudoFromName(name: string | null | undefined, publicId: string): string {
  const cleaned = (name ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (cleaned.length >= 2) return cleaned;
  return `Dresseur${publicId.slice(0, 4)}`;
}

export function formatDisplayName(pseudo: string, publicId: string): string {
  return `${pseudo} #${publicId}`;
}
