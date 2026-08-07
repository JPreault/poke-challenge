"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  buildShuffleGamesQuery,
  getAvailableShuffleRoundTypes,
} from "@/lib/games/shuffle";
import {
  getShuffleRoundDescription,
  getShuffleRoundLabel,
  type GameInterfaceMode,
  type ShuffleRoundType,
} from "@/lib/games/types";
import { cn } from "@/lib/utils";

interface ShuffleSetupProps {
  interfaceMode: GameInterfaceMode;
}

export function ShuffleSetup({ interfaceMode }: ShuffleSetupProps) {
  const router = useRouter();
  const useBacPool = interfaceMode === "bac-training";
  const availableTypes = useMemo(
    () => getAvailableShuffleRoundTypes(useBacPool),
    [useBacPool],
  );
  const [selected, setSelected] = useState<ShuffleRoundType[]>([]);

  const homeHref =
    interfaceMode === "bac-training" ? "/entrainement" : "/";

  const toggleType = (type: ShuffleRoundType) => {
    setSelected((current) =>
      current.includes(type)
        ? current.filter((entry) => entry !== type)
        : [...current, type],
    );
  };

  const selectAll = () => {
    setSelected([...availableTypes]);
  };

  const clearAll = () => {
    setSelected([]);
  };

  const handleLaunch = () => {
    if (selected.length === 0) return;

    const games = buildShuffleGamesQuery(selected);
    const params = new URLSearchParams();
    params.set("games", games);
    if (interfaceMode === "bac-training") {
      params.set("interface", "bac-training");
    }

    const href = `/game/shuffle?${params.toString()}`;
    router.push(href);
    router.refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-16 pt-4 sm:px-8 sm:pb-20 sm:pt-6">
      <header className="space-y-6">
        <Link
          href={homeHref}
          className="inline-flex text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Retour
        </Link>

        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Shuffle
          </p>
          <h1 className="font-heading text-3xl font-bold">
            Choisis tes mini-jeux
          </h1>
          <p className="max-w-md text-base leading-7 text-muted-foreground">
            Sélectionne au moins un type de manche. Chaque tour en choisira un
            au hasard parmi ta liste.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" size="sm" onClick={selectAll}>
          Tout sélectionner
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={selected.length === 0}
        >
          Tout désélectionner
        </Button>
      </div>

      <ul className="space-y-3" role="list">
        {availableTypes.map((type) => {
          const isSelected = selected.includes(type);
          const inputId = `shuffle-type-${type}`;

          return (
            <li key={type}>
              <label
                htmlFor={inputId}
                className={cn(
                  "surface-hover flex cursor-pointer items-start gap-4 p-5 transition",
                  isSelected && "ring-2 ring-primary/40",
                )}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleType(type)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="space-y-1">
                  <span className="block font-heading text-base font-semibold text-foreground">
                    {getShuffleRoundLabel(type)}
                  </span>
                  <span className="block text-sm leading-6 text-muted-foreground">
                    {getShuffleRoundDescription(type)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          size="lg"
          onClick={handleLaunch}
          disabled={selected.length === 0}
          className="w-full sm:w-auto"
        >
          Lancer
        </Button>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sélectionne au moins un mini-jeu pour lancer.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {selected.length} type{selected.length > 1 ? "s" : ""} sélectionné
            {selected.length > 1 ? "s" : ""}.
          </p>
        )}
      </div>

      <Link
        href={homeHref}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}
      >
        Annuler
      </Link>
    </div>
  );
}
