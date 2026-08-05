import { NextResponse } from "next/server";

import type { ValidationMode } from "@/lib/pokemon/types";
import { validateAnswer } from "@/lib/pokemon/validate";

interface ValidateBody {
  letter?: string;
  answer?: string;
  mode?: ValidationMode;
}

export async function POST(request: Request) {
  let body: ValidateBody;

  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { letter, answer, mode } = body;

  if (!letter || typeof letter !== "string") {
    return NextResponse.json(
      { error: "La lettre est requise." },
      { status: 400 },
    );
  }

  if (!answer || typeof answer !== "string") {
    return NextResponse.json(
      { error: "La réponse est requise." },
      { status: 400 },
    );
  }

  if (mode !== "strict" && mode !== "free" && mode !== "catalog") {
    return NextResponse.json(
      { error: "Le mode doit être 'strict', 'free' ou 'catalog'." },
      { status: 400 },
    );
  }

  const result = validateAnswer(letter, answer, mode);
  return NextResponse.json(result);
}
