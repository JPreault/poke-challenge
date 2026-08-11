import data from "../data/pokemon.json";
import { censorPokemonNameInText } from "../lib/pokemon/censor";
import { normalizeFrenchName } from "../lib/pokemon/normalize";

const leaks: { name: string; desc: string }[] = [];

for (const p of data.catalog) {
  if (!p.descriptionsFr?.length) continue;
  const normName = normalizeFrenchName(p.nameFr);
  for (const desc of p.descriptionsFr) {
    const censored = censorPokemonNameInText(desc, p.nameFr);
    const normDesc = normalizeFrenchName(desc);
    if (normDesc.includes(normName) && censored === desc) {
      leaks.push({ name: p.nameFr, desc });
    }
  }
}

console.log("Leaks count:", leaks.length);

const pluralExamples: string[] = [];
for (const p of data.catalog) {
  const n = normalizeFrenchName(p.nameFr);
  if (n.endsWith("s") || n.endsWith("x") || n.endsWith("z")) continue;
  for (const desc of p.descriptionsFr ?? []) {
    const nd = normalizeFrenchName(desc);
    if (nd.includes(`${n}s`)) {
      pluralExamples.push(`${p.nameFr}: ...${desc.slice(Math.max(0, desc.toLowerCase().indexOf(p.nameFr.toLowerCase()) - 5), desc.toLowerCase().indexOf(p.nameFr.toLowerCase()) + p.nameFr.length + 8)}...`);
      break;
    }
  }
}
console.log("Plural examples:", pluralExamples.length);
pluralExamples.slice(0, 10).forEach((x) => console.log(x));
