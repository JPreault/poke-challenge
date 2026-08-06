export function formatPlayerLabel(input: {
  pseudo?: string | null;
  publicId?: string | null;
  fallbackName?: string | null;
}): string {
  const fallback = input.fallbackName?.trim() || "Dresseur";
  const pseudo = input.pseudo?.trim() || fallback;
  if (input.publicId) {
    return `${pseudo} #${input.publicId}`;
  }
  return pseudo;
}
