export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function maxAllowedTypos(nameLength: number): number {
  return Math.max(1, Math.floor(nameLength * 0.1));
}

export function isWithinTypoTolerance(
  input: string,
  expected: string,
): boolean {
  const normalizedInput = input.trim().toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();

  if (normalizedInput === normalizedExpected) return true;

  const allowed = maxAllowedTypos(normalizedExpected.length);
  return levenshteinDistance(normalizedInput, normalizedExpected) <= allowed;
}
