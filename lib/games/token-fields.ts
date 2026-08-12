export interface RankedTokenFields {
  jti: string;
  wrongAttempts: number;
  maxAttempts: number;
  ranked?: boolean;
  matchId?: string;
  roundId?: string;
}

export function isRankedTokenFields(
  payload: Partial<RankedTokenFields>,
): boolean {
  return payload.ranked === true && Boolean(payload.matchId && payload.roundId);
}

export function validateRankedTokenFields(
  payload: Partial<RankedTokenFields>,
): boolean {
  if (typeof payload.jti !== "string" || payload.jti.length < 8) return false;
  if (typeof payload.wrongAttempts !== "number" || payload.wrongAttempts < 0) {
    return false;
  }
  if (typeof payload.maxAttempts !== "number" || payload.maxAttempts < 1) {
    return false;
  }
  if (payload.ranked) {
    return (
      typeof payload.matchId === "string" &&
      payload.matchId.length > 0 &&
      typeof payload.roundId === "string" &&
      payload.roundId.length > 0
    );
  }
  return true;
}
