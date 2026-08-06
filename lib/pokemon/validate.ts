import { getBacPokemonByLetter, getFrenchIndex } from "@/lib/pokemon/data";
import { isWithinTypoTolerance } from "@/lib/pokemon/levenshtein";
import { getFirstLetter, normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { ValidationMode, ValidationResult } from "@/lib/pokemon/types";

function isExactSpelling(input: string, officialName: string): boolean {
  return normalizeFrenchName(input) === normalizeFrenchName(officialName);
}

function findMatchingFrenchName(input: string): string | null {
  const normalizedInput = normalizeFrenchName(input);
  const frenchIndex = getFrenchIndex();

  if (frenchIndex[normalizedInput]) {
    return frenchIndex[normalizedInput].nameFr;
  }

  for (const [key, entry] of Object.entries(frenchIndex)) {
    if (isWithinTypoTolerance(normalizedInput, key)) {
      return entry.nameFr;
    }
  }

  return null;
}

function validateStrict(letter: string, answer: string): ValidationResult {
  const expectedPokemon = getBacPokemonByLetter(letter);

  if (!expectedPokemon) {
    return { correct: false, preferred: false };
  }

  const expected = expectedPokemon.nameFr;
  const matched = isWithinTypoTolerance(answer, expected) ? expected : undefined;

  return {
    correct: Boolean(matched),
    preferred: Boolean(matched),
    expected,
    matched,
    hasTypo: matched ? !isExactSpelling(answer, matched) : false,
  };
}

function validateFree(letter: string, answer: string): ValidationResult {
  const expectedPokemon = getBacPokemonByLetter(letter);
  const matchedName = findMatchingFrenchName(answer);

  if (!matchedName) {
    return {
      correct: false,
      preferred: false,
      expected: expectedPokemon?.nameFr,
    };
  }

  const startsWithLetter =
    getFirstLetter(matchedName).toUpperCase() === letter.toUpperCase();

  if (!startsWithLetter) {
    return {
      correct: false,
      preferred: false,
      expected: expectedPokemon?.nameFr,
      matched: matchedName,
    };
  }

  const preferred = expectedPokemon
    ? isWithinTypoTolerance(matchedName, expectedPokemon.nameFr)
    : false;

  return {
    correct: true,
    preferred,
    expected: expectedPokemon?.nameFr,
    matched: matchedName,
    hasTypo: !isExactSpelling(answer, matchedName),
  };
}

function validateCatalog(letter: string, answer: string): ValidationResult {
  const matchedName = findMatchingFrenchName(answer);

  if (!matchedName) {
    return {
      correct: false,
      preferred: false,
    };
  }

  const startsWithLetter =
    getFirstLetter(matchedName).toUpperCase() === letter.toUpperCase();

  if (!startsWithLetter) {
    return {
      correct: false,
      preferred: false,
      matched: matchedName,
    };
  }

  return {
    correct: true,
    preferred: true,
    matched: matchedName,
    hasTypo: !isExactSpelling(answer, matchedName),
  };
}

function validateTraining(
  letter: string,
  answer: string,
  trainingNames: string[],
): ValidationResult {
  const matchedName = findMatchingFrenchName(answer);
  const preferredName =
    trainingNames.find(
      (name) => getFirstLetter(name).toUpperCase() === letter.toUpperCase(),
    ) ?? trainingNames[0];

  if (!matchedName) {
    return {
      correct: false,
      preferred: false,
      expected: preferredName,
    };
  }

  const startsWithLetter =
    getFirstLetter(matchedName).toUpperCase() === letter.toUpperCase();
  if (!startsWithLetter) {
    return {
      correct: false,
      preferred: false,
      expected: preferredName,
      matched: matchedName,
    };
  }

  const inTraining = trainingNames.some((name) =>
    isWithinTypoTolerance(matchedName, name),
  );
  if (!inTraining) {
    return {
      correct: false,
      preferred: false,
      expected: preferredName,
      matched: matchedName,
    };
  }

  return {
    correct: true,
    preferred: true,
    expected: preferredName,
    matched: matchedName,
    hasTypo: !isExactSpelling(answer, matchedName),
  };
}

export function validateAnswer(
  letter: string,
  answer: string,
  mode: ValidationMode,
  trainingNames: string[] = [],
): ValidationResult {
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return {
      correct: false,
      preferred: false,
      expected:
        mode === "training"
          ? trainingNames.find(
              (name) => getFirstLetter(name).toUpperCase() === letter.toUpperCase(),
            )
          : getBacPokemonByLetter(letter)?.nameFr,
    };
  }

  if (mode === "strict") {
    return validateStrict(letter, trimmedAnswer);
  }

  if (mode === "catalog") {
    return validateCatalog(letter, trimmedAnswer);
  }

  if (mode === "training") {
    return validateTraining(letter, trimmedAnswer, trainingNames);
  }

  return validateFree(letter, trimmedAnswer);
}
