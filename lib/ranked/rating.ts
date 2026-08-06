export interface ComputeRatingInput {
  ratingBefore: number;
  correctCount: number;
  totalRounds: number;
  durationMs?: number | null;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function computePerformance({
  correctCount,
  totalRounds,
  durationMs,
}: Omit<ComputeRatingInput, "ratingBefore">): number {
  const rounds = Math.max(1, totalRounds);
  const accuracy = clamp(correctCount / rounds);

  const baselineSeconds = rounds * 22;
  const durationSeconds = (durationMs ?? baselineSeconds * 1000) / 1000;
  const speedFactor = clamp(baselineSeconds / Math.max(1, durationSeconds), 0.75, 1.15);

  return clamp(accuracy * speedFactor, 0, 1);
}

export function computeRatingDelta(input: ComputeRatingInput): number {
  const K = 24;
  const perf = computePerformance(input);
  const centered = perf - 0.5;
  const skillWeight = input.ratingBefore >= 1300 ? 0.8 : input.ratingBefore <= 900 ? 1.2 : 1;
  return Math.round(K * centered * skillWeight);
}
