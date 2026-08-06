"use client";

import { useEffect, useMemo, useState } from "react";

import { PokemonSearchInput } from "@/components/game/PokemonSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSearchCatalog } from "@/lib/pokemon/client-data";

interface TrainingPokemon {
  id: number;
  nameFr: string;
}

interface ProfileResponse {
  profile: {
    preferredInterfaceMode: "arena" | "bac-training";
    pseudo: string;
    publicId: string;
    trainingPokemonIds: number[];
    trainingPokemon: TrainingPokemon[];
  };
}

export default function ProfilePage() {
  const catalog = useMemo(() => getSearchCatalog(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [preferred, setPreferred] = useState<"arena" | "bac-training">("arena");
  const [pseudo, setPseudo] = useState("");
  const [publicId, setPublicId] = useState("");
  const [trainingPokemon, setTrainingPokemon] = useState<TrainingPokemon[]>([]);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          setError("Impossible de charger le profil.");
          setLoading(false);
          return;
        }
        const payload = (await response.json()) as ProfileResponse;
        setPreferred(payload.profile.preferredInterfaceMode);
        setPseudo(payload.profile.pseudo);
        setPublicId(payload.profile.publicId);
        setTrainingPokemon(payload.profile.trainingPokemon);
      } catch {
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const excludedIds = useMemo(
    () => trainingPokemon.map((pokemon) => pokemon.id),
    [trainingPokemon],
  );

  const addPokemonByName = () => {
    const match = catalog.find(
      (pokemon) =>
        pokemon.nameFr.toLocaleLowerCase("fr") === draftName.trim().toLocaleLowerCase("fr"),
    );
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
    setTrainingPokemon((current) => [...current, match]);
    setDraftName("");
  };

  const removePokemon = (id: number) => {
    setTrainingPokemon((current) => current.filter((pokemon) => pokemon.id !== id));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredInterfaceMode: preferred,
          pseudo,
          trainingPokemonIds: trainingPokemon.map((pokemon) => pokemon.id),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Échec de sauvegarde du profil.");
        return;
      }

      const payload = (await response.json()) as ProfileResponse;
      setPseudo(payload.profile.pseudo);
      setPublicId(payload.profile.publicId);
      setPreferred(payload.profile.preferredInterfaceMode);
      setTrainingPokemon(payload.profile.trainingPokemon);
      setSuccess("Profil enregistré.");
    } catch {
      setError("Échec de sauvegarde du profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">Chargement du profil…</div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold">Profil</h1>
        <p className="text-muted-foreground">
          Définis ton pseudo et la liste de Pokémon pour le mode Entraînement.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-6">
        <h2 className="font-semibold">Identité</h2>
        <label className="block space-y-2 text-sm">
          <span>Pseudo</span>
          <Input
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            maxLength={24}
            className="max-w-sm"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Affichage public :{" "}
          <span className="font-medium text-foreground">
            {pseudo || "—"} #{publicId}
          </span>
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-6">
        <h2 className="font-semibold">Interface par défaut</h2>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={preferred === "arena" ? "default" : "outline"}
            onClick={() => setPreferred("arena")}
          >
            Mode Arène
          </Button>
          <Button
            type="button"
            variant={preferred === "bac-training" ? "default" : "outline"}
            onClick={() => setPreferred("bac-training")}
          >
            Entraînement
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/60 bg-background/80 p-6">
        <div className="space-y-1">
          <h2 className="font-semibold">Liste d&apos;entraînement</h2>
          <p className="text-sm text-muted-foreground">
            Ces Pokémon seront utilisés dans le mode Entraînement.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <PokemonSearchInput
            id="training-pokemon-search"
            value={draftName}
            onChange={setDraftName}
            catalog={catalog}
            excludedIds={excludedIds}
            placeholder="Ajouter un Pokémon…"
            className="sm:max-w-xl"
          />
          <Button type="button" onClick={addPokemonByName} disabled={!draftName.trim()}>
            Ajouter
          </Button>
        </div>

        {trainingPokemon.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun Pokémon pour l&apos;instant. Ajoute-en au moins un pour jouer
            en entraînement.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {trainingPokemon.map((pokemon) => (
              <li
                key={pokemon.id}
                className="surface flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
              >
                <span>{pokemon.nameFr}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => removePokemon(pokemon.id)}
                  aria-label={`Retirer ${pokemon.nameFr}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <div>
        <Button onClick={() => void save()} disabled={saving || !pseudo.trim()}>
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>
    </main>
  );
}
