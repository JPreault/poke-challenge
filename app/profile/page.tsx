"use client";

import { Check, Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PokemonSearchInput } from "@/components/pokemon/PokemonSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSearchCatalog } from "@/lib/pokemon/client-data";
import { getPokemonSpriteUrl } from "@/lib/pokemon/sprite";

interface TrainingPokemon {
    id: number;
    nameFr: string;
}

interface ProfileResponse {
    profile: {
        pseudo: string;
        publicId: string;
        trainingPokemonIds: number[];
        trainingPokemon: TrainingPokemon[];
    };
}

export default function ProfilePage() {
    const router = useRouter();
    const { status } = useSession();
    const catalog = useMemo(() => getSearchCatalog(), []);

    const [loading, setLoading] = useState(true);
    const [savingPseudo, setSavingPseudo] = useState(false);
    const [savingList, setSavingList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [listFeedback, setListFeedback] = useState<string | null>(null);

    const [pseudo, setPseudo] = useState("");
    const [savedPseudo, setSavedPseudo] = useState("");
    const [publicId, setPublicId] = useState("");
    const [trainingPokemon, setTrainingPokemon] = useState<TrainingPokemon[]>([]);
    const [draftName, setDraftName] = useState("");

    const pseudoDirty = pseudo.trim() !== savedPseudo.trim() && pseudo.trim().length > 0;

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/auth/signin?callbackUrl=/profile");
        }
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;

        const load = async () => {
            try {
                const response = await fetch("/api/profile", { cache: "no-store" });
                if (!response.ok) {
                    setError("Impossible de charger le profil.");
                    setLoading(false);
                    return;
                }
                const payload = (await response.json()) as ProfileResponse;
                setPseudo(payload.profile.pseudo);
                setSavedPseudo(payload.profile.pseudo);
                setPublicId(payload.profile.publicId);
                setTrainingPokemon(payload.profile.trainingPokemon);
            } catch {
                setError("Impossible de charger le profil.");
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [status]);

    const excludedIds = useMemo(() => trainingPokemon.map((pokemon) => pokemon.id), [trainingPokemon]);

    const saveTrainingList = async (nextList: TrainingPokemon[]) => {
        setSavingList(true);
        setError(null);
        setListFeedback(null);
        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trainingPokemonIds: nextList.map((pokemon) => pokemon.id),
                }),
            });

            if (!response.ok) {
                const payload = (await response.json()) as { error?: string };
                setError(payload.error ?? "Échec de sauvegarde de la liste.");
                return false;
            }

            const payload = (await response.json()) as ProfileResponse;
            setTrainingPokemon(payload.profile.trainingPokemon);
            setListFeedback("Liste enregistrée.");
            return true;
        } catch {
            setError("Échec de sauvegarde de la liste.");
            return false;
        } finally {
            setSavingList(false);
        }
    };

    const savePseudo = async () => {
        if (!pseudoDirty || savingPseudo) return;

        setSavingPseudo(true);
        setError(null);
        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pseudo }),
            });

            if (!response.ok) {
                const payload = (await response.json()) as { error?: string };
                setError(payload.error ?? "Échec de sauvegarde du pseudo.");
                return;
            }

            const payload = (await response.json()) as ProfileResponse;
            setPseudo(payload.profile.pseudo);
            setSavedPseudo(payload.profile.pseudo);
            setPublicId(payload.profile.publicId);
        } catch {
            setError("Échec de sauvegarde du pseudo.");
        } finally {
            setSavingPseudo(false);
        }
    };

    const addPokemonByName = async () => {
        const match = catalog.find((pokemon) => pokemon.nameFr.toLocaleLowerCase("fr") === draftName.trim().toLocaleLowerCase("fr"));
        if (!match) {
            setError("Choisis un Pokémon dans les suggestions.");
            return;
        }
        if (trainingPokemon.some((pokemon) => pokemon.id === match.id)) {
            setError("Ce Pokémon est déjà dans ta liste.");
            return;
        }
        if (trainingPokemon.length >= 100) {
            setError("Maximum 100 Pokémon dans la liste.");
            return;
        }

        setError(null);
        const nextList = [...trainingPokemon, match].sort((a, b) =>
            a.nameFr.localeCompare(b.nameFr, "fr"),
        );
        setTrainingPokemon(nextList);
        setDraftName("");
        const ok = await saveTrainingList(nextList);
        if (!ok) {
            setTrainingPokemon(trainingPokemon);
        }
    };

    const removePokemon = async (id: number) => {
        const previous = trainingPokemon;
        const nextList = previous.filter((pokemon) => pokemon.id !== id);
        setTrainingPokemon(nextList);
        setError(null);
        const ok = await saveTrainingList(nextList);
        if (!ok) {
            setTrainingPokemon(previous);
        }
    };

    if (status === "loading" || status === "unauthenticated" || loading) {
        return <div className="mx-auto max-w-3xl px-6 pb-16 pt-4">Chargement du profil…</div>;
    }

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 pb-16 pt-4">
            <header className="space-y-2">
                <h1 className="font-heading text-3xl font-bold">Profil</h1>
                <p className="text-muted-foreground">Définis ton pseudo et la liste de Pokémon pour le mode Entraînement.</p>
            </header>

            <section className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-6">
                <h2 className="font-semibold">Identité</h2>
                <label className="block space-y-2 text-sm">
                    <div className="flex max-w-sm items-center gap-2">
                        <span>Pseudo</span>
                        <Input
                            value={pseudo}
                            onChange={(event) => setPseudo(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && pseudoDirty) {
                                    event.preventDefault();
                                    void savePseudo();
                                }
                            }}
                            maxLength={24}
                            className="flex-1"
                        />
                        {pseudoDirty ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                aria-label="Sauvegarder le pseudo"
                                title="Sauvegarder le pseudo"
                                disabled={savingPseudo}
                                onClick={() => void savePseudo()}
                            >
                                {savingPseudo ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            </Button>
                        ) : null}
                    </div>
                </label>
                <p className="text-sm text-muted-foreground">
                    Affichage public :{" "}
                    <span className="font-medium text-foreground">
                        {savedPseudo || "—"} #{publicId}
                    </span>
                </p>
            </section>

            <section className="space-y-4 rounded-xl border border-border/60 bg-background/80 p-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold">Liste d&apos;entraînement</h2>
                        {savingList ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">Les ajouts et retraits sont enregistrés automatiquement.</p>
                </div>

                <div className="flex items-center gap-3">
                    <PokemonSearchInput
                        id="training-pokemon-search"
                        value={draftName}
                        onChange={setDraftName}
                        catalog={catalog}
                        excludedIds={excludedIds}
                        placeholder="Ajouter un Pokémon…"
                        className="min-w-0 flex-1 sm:max-w-xl"
                        disabled={savingList}
                    />
                    <Button
                        type="button"
                        size="icon"
                        aria-label="Ajouter le Pokémon"
                        title="Ajouter le Pokémon"
                        className="size-12 shrink-0 cursor-pointer"
                        onClick={() => void addPokemonByName()}
                        disabled={!draftName.trim() || savingList}
                    >
                        <Check className="size-5" />
                    </Button>
                </div>

                {trainingPokemon.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Aucun Pokémon pour l&apos;instant. Ajoute-en au moins un pour jouer en entraînement.
                    </p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {trainingPokemon.map((pokemon) => (
                            <li key={pokemon.id} className="surface flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm">
                                <Image
                                    src={getPokemonSpriteUrl(pokemon.id)}
                                    alt=""
                                    width={28}
                                    height={28}
                                    className="rounded-full object-contain"
                                    unoptimized
                                />
                                <span>{pokemon.nameFr}</span>
                                <button
                                    type="button"
                                    className="flex size-6 items-center justify-center rounded-full text-lg leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
                                    onClick={() => void removePokemon(pokemon.id)}
                                    aria-label={`Retirer ${pokemon.nameFr}`}
                                    disabled={savingList}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {listFeedback ? <p className="text-sm text-emerald-600">{listFeedback}</p> : null}
        </main>
    );
}
