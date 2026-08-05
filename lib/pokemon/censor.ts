import { normalizeFrenchName } from "@/lib/pokemon/normalize";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a case/accent-insensitive regex that matches a French Pokémon name. */
function toNamePattern(name: string): RegExp {
  const base = normalizeFrenchName(name);
  const pattern = [...base]
    .map((char) => {
      if (/[a-z]/i.test(char)) {
        return `${escapeRegExp(char)}\\p{M}*`;
      }
      return escapeRegExp(char);
    })
    .join("");

  return new RegExp(pattern, "giu");
}

export function censorPokemonNameInText(text: string, nameFr: string): string {
  const trimmedName = nameFr.trim();
  if (!trimmedName || !text) {
    return text;
  }

  const censored = "*".repeat(Math.max(trimmedName.length, 4));
  return text.replace(toNamePattern(trimmedName), censored);
}
