"use client";

import Image from "next/image";
import { useMemo, useState, type RefObject } from "react";

import { Input } from "@/components/ui/input";
import type { SearchPokemon } from "@/lib/pokemon/client-data";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import { getPokemonSpriteUrl } from "@/lib/pokemon/sprite";
import { cn } from "@/lib/utils";

export interface PokemonSearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onInputActivity?: () => void;
  /** Catalogue de recherche. Si omis, utilise le catalogue complet client. */
  catalog: SearchPokemon[];
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  /** IDs exclus des suggestions (déjà sélectionnés, mauvaises réponses, etc.). */
  excludedIds?: readonly number[];
  maxSuggestions?: number;
}

export function PokemonSearchInput({
  id,
  value,
  onChange,
  onInputActivity,
  catalog,
  disabled = false,
  readOnly = false,
  placeholder = "Tape le nom du Pokémon...",
  inputRef,
  className,
  excludedIds = [],
  maxSuggestions = 8,
}: PokemonSearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState<number>(-1);

  const excludedIdSet = useMemo(() => new Set(excludedIds), [excludedIds]);

  const filteredSuggestions = useMemo(() => {
    const normalized = normalizeFrenchName(value);
    if (!normalized) return [];

    return catalog
      .filter(
        (pokemon) =>
          !excludedIdSet.has(pokemon.id) &&
          normalizeFrenchName(pokemon.nameFr).includes(normalized),
      )
      .sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"))
      .slice(0, maxSuggestions);
  }, [catalog, excludedIdSet, maxSuggestions, value]);

  const canShowSuggestions =
    showSuggestions && filteredSuggestions.length > 0 && !readOnly && !disabled;

  const handleSelectSuggestion = (pokemon: SearchPokemon) => {
    onChange(pokemon.nameFr);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
  };

  const resolveEnterSelection = (): SearchPokemon | null => {
    if (filteredSuggestions.length === 0) return null;

    if (
      highlightedSuggestionIndex >= 0 &&
      filteredSuggestions[highlightedSuggestionIndex]
    ) {
      return filteredSuggestions[highlightedSuggestionIndex];
    }

    const normalized = normalizeFrenchName(value);
    const exactMatch = filteredSuggestions.find(
      (pokemon) => normalizeFrenchName(pokemon.nameFr) === normalized,
    );
    return exactMatch ?? filteredSuggestions[0] ?? null;
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly || disabled) return;

    if (event.key === "ArrowDown") {
      if (filteredSuggestions.length === 0) return;
      event.preventDefault();
      setShowSuggestions(true);
      setHighlightedSuggestionIndex((current) =>
        current < filteredSuggestions.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      if (filteredSuggestions.length === 0) return;
      event.preventDefault();
      setShowSuggestions(true);
      setHighlightedSuggestionIndex((current) =>
        current > 0 ? current - 1 : filteredSuggestions.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      const selection = resolveEnterSelection();
      if (!selection) return;
      event.preventDefault();
      event.stopPropagation();
      handleSelectSuggestion(selection);
      return;
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedSuggestionIndex(-1);
    }
  };

  const handleSuggestionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = index < filteredSuggestions.length - 1 ? index + 1 : 0;
      setHighlightedSuggestionIndex(nextIndex);
      const nextButton = document.getElementById(
        `${id}-suggestion-${nextIndex}`,
      ) as HTMLButtonElement | null;
      nextButton?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = index > 0 ? index - 1 : filteredSuggestions.length - 1;
      setHighlightedSuggestionIndex(nextIndex);
      const nextButton = document.getElementById(
        `${id}-suggestion-${nextIndex}`,
      ) as HTMLButtonElement | null;
      nextButton?.focus();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setShowSuggestions(false);
      setHighlightedSuggestionIndex(-1);
      const input = document.getElementById(id) as HTMLInputElement | null;
      input?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelectSuggestion(filteredSuggestions[index]);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setShowSuggestions(true);
          setHighlightedSuggestionIndex(-1);
          onInputActivity?.();
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          window.setTimeout(() => setShowSuggestions(false), 120);
        }}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        className="h-12 text-base"
      />
      {canShowSuggestions ? (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border/70 bg-background p-1 shadow-lg">
          {filteredSuggestions.map((pokemon, index) => {
            const highlighted =
              highlightedSuggestionIndex >= 0 &&
              filteredSuggestions[highlightedSuggestionIndex]?.id === pokemon.id;

            return (
              <li key={pokemon.id}>
                <button
                  id={`${id}-suggestion-${index}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelectSuggestion(pokemon);
                  }}
                  onFocus={() => setHighlightedSuggestionIndex(index)}
                  onKeyDown={(event) => handleSuggestionKeyDown(event, index)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base hover:bg-muted/60",
                    highlighted && "bg-muted/70",
                  )}
                >
                  <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50">
                    <Image
                      src={getPokemonSpriteUrl(pokemon.id)}
                      alt=""
                      width={32}
                      height={32}
                      className="pixelated object-contain"
                      unoptimized
                    />
                  </span>
                  <span>{pokemon.nameFr}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
