import { NextResponse } from "next/server";

import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { findCatalogPokemonById } from "@/lib/pokemon/data";
import {
  allocatePublicId,
  defaultPseudoFromName,
  sanitizePseudo,
} from "@/lib/profile/public-id";
import { toDbInterfaceMode, toInterfaceMode } from "@/lib/ranked/mode";

const MAX_TRAINING_POKEMON = 100;

async function ensureProfile(userId: string, name?: string | null) {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true } },
    },
  });

  if (existing) {
    return existing;
  }

  const publicId = await allocatePublicId();
  const pseudo = defaultPseudoFromName(name, publicId);

  return prisma.userProfile.create({
    data: {
      userId,
      publicId,
      pseudo,
      preferredInterface: "ARENA",
    },
    include: {
      user: { select: { name: true } },
    },
  });
}

async function serializeProfile(userId: string) {
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { userId },
  });
  const training = await prisma.trainingPokemon.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { pokemonId: true },
  });

  const trainingPokemon = training
    .map((row) => findCatalogPokemonById(row.pokemonId))
    .filter((pokemon): pokemon is NonNullable<typeof pokemon> => Boolean(pokemon))
    .map((pokemon) => ({
      id: pokemon.id,
      nameFr: pokemon.nameFr,
    }));

  return {
    pseudo: profile.pseudo,
    publicId: profile.publicId,
    preferredInterfaceMode: toInterfaceMode(profile.preferredInterface),
    trainingPokemonIds: training.map((row) => row.pokemonId),
    trainingPokemon,
    updatedAt: profile.updatedAt,
  };
}

export async function GET() {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  await ensureProfile(session.user.id, session.user.name);
  const profile = await serializeProfile(session.user.id);
  return NextResponse.json({ profile });
}

interface UpdateProfileBody {
  preferredInterfaceMode?: "arena" | "bac-training";
  pseudo?: string;
  trainingPokemonIds?: number[];
}

export async function PUT(request: Request) {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: UpdateProfileBody;
  try {
    body = (await request.json()) as UpdateProfileBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  await ensureProfile(session.user.id, session.user.name);

  let nextPseudo: string | undefined;
  if (typeof body.pseudo === "string") {
    const sanitized = sanitizePseudo(body.pseudo);
    if (!sanitized) {
      return NextResponse.json(
        {
          error:
            "Pseudo invalide (2 à 24 caractères, lettres/chiffres/espaces/._-).",
        },
        { status: 400 },
      );
    }
    nextPseudo = sanitized;
  }

  let nextTrainingIds: number[] | undefined;
  if (body.trainingPokemonIds !== undefined) {
    if (!Array.isArray(body.trainingPokemonIds)) {
      return NextResponse.json(
        { error: "Liste d'entraînement invalide." },
        { status: 400 },
      );
    }
    if (body.trainingPokemonIds.length > MAX_TRAINING_POKEMON) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TRAINING_POKEMON} Pokémon dans la liste.` },
        { status: 400 },
      );
    }

    const uniqueIds = Array.from(new Set(body.trainingPokemonIds.map(Number)));
    const validIds = uniqueIds.filter((id) => Boolean(findCatalogPokemonById(id)));
    if (validIds.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs Pokémon sont invalides." },
        { status: 400 },
      );
    }
    nextTrainingIds = validIds;
  }

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { userId: session.user.id },
      data: {
        ...(nextPseudo ? { pseudo: nextPseudo } : {}),
        ...(body.preferredInterfaceMode
          ? { preferredInterface: toDbInterfaceMode(body.preferredInterfaceMode) }
          : {}),
      },
    });

    if (nextTrainingIds) {
      await tx.trainingPokemon.deleteMany({ where: { userId: session.user.id } });
      if (nextTrainingIds.length > 0) {
        await tx.trainingPokemon.createMany({
          data: nextTrainingIds.map((pokemonId) => ({
            userId: session.user.id,
            pokemonId,
          })),
        });
      }
    }
  });

  const profile = await serializeProfile(session.user.id);
  return NextResponse.json({ profile });
}
