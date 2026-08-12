import {
  createTokenJti,
  decryptTokenPayload,
  encryptTokenPayload,
  tokenExpiry,
} from "@/lib/games/token-crypto";
import type { RankedTokenFields } from "@/lib/games/token-fields";
import { validateRankedTokenFields } from "@/lib/games/token-fields";
import type { ChoiceQuizMode, QuizPool } from "@/lib/games/choice-quiz-types";

export interface ChoiceQuizPayload extends RankedTokenFields {
  targetId: number;
  choiceIds: number[];
  mode: ChoiceQuizMode;
  pool: QuizPool;
  userId?: string;
  exp: number;
}

const VERSION = 1;

function isValidPool(pool: unknown): pool is QuizPool {
  return pool === "training" || pool === "catalog" || pool === "bac";
}

export function createChoiceQuizToken(
  payload: Omit<
    ChoiceQuizPayload,
    "exp" | "jti" | "wrongAttempts" | "maxAttempts"
  > &
    Partial<Pick<ChoiceQuizPayload, "jti" | "wrongAttempts" | "maxAttempts">>,
): string {
  const ranked = payload.ranked === true;
  const fullPayload: ChoiceQuizPayload = {
    ...payload,
    jti: payload.jti ?? createTokenJti(),
    wrongAttempts: payload.wrongAttempts ?? 0,
    maxAttempts: payload.maxAttempts ?? (ranked ? 1 : 99),
    exp: tokenExpiry(ranked),
  };

  return encryptTokenPayload(fullPayload, VERSION);
}

export function verifyChoiceQuizToken(token: string): ChoiceQuizPayload | null {
  const payload = decryptTokenPayload<ChoiceQuizPayload>(token, VERSION);
  if (!payload) return null;

  if (
    typeof payload.targetId !== "number" ||
    !Array.isArray(payload.choiceIds) ||
    (payload.mode !== "image-to-name" &&
      payload.mode !== "name-to-image" &&
      payload.mode !== "cry-guess") ||
    !isValidPool(payload.pool) ||
    typeof payload.exp !== "number" ||
    !validateRankedTokenFields(payload)
  ) {
    return null;
  }

  if (Date.now() > payload.exp) {
    return null;
  }

  return payload;
}
