import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { getTrainingSearchCatalog } from "@/lib/pokemon/training-pool";
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

  if (
    mode !== "strict" &&
    mode !== "free" &&
    mode !== "catalog" &&
    mode !== "training"
  ) {
    return NextResponse.json(
      { error: "Le mode doit être 'strict', 'free', 'catalog' ou 'training'." },
      { status: 400 },
    );
  }

  let trainingNames: string[] = [];
  if (mode === "training") {
    const session = await getRequiredSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    const catalog = await getTrainingSearchCatalog(session.user.id);
    trainingNames = catalog.map((pokemon) => pokemon.nameFr);
    if (trainingNames.length === 0) {
      return NextResponse.json(
        {
          correct: false,
          preferred: false,
          expected: undefined,
        },
      );
    }
  }

  const result = validateAnswer(letter, answer, mode, trainingNames);
  return NextResponse.json(result);
}
