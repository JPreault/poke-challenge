export function normalizeFrenchName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getFirstLetter(name: string): string {
  const normalized = name.trim();
  if (!normalized) return "";
  return normalized[0].toUpperCase();
}
