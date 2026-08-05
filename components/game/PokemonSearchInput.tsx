"use client";

import Image from "next/image";
import { useMemo, useState, type RefObject } from "react";

import { Input } from "@/components/ui/input";
import { normalizeFrenchName } from "@/lib/pokemon/normalize";
import type { QuizPokemon } from "@/lib/pokemon/types";
import { cn } from "@/lib/utils";

interface PokemonSearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onInputActivity?: () => void;
  catalog: QuizPokemon[];
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  excludedIds?: readonly number[];
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
      .sort((a, b) => a.nameFr.localeCompare(b.nameFr))
      .slice(0, 8);
  }, [catalog, excludedIdSet, value]);

  const canShowSuggestions =
    showSuggestions && filteredSuggestions.length > 0 && !readOnly && !disabled;

  const handleSelectSuggestion = (pokemon: QuizPokemon) => {
    onChange(pokemon.nameFr);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
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
      if (canShowSuggestions && highlightedSuggestionIndex >= 0) {
        event.preventDefault();
        handleSelectSuggestion(filteredSuggestions[highlightedSuggestionIndex]);
      }
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
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        className="h-12"
      />
      {canShowSuggestions ? (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border/70 bg-background p-1 shadow-lg">
          {filteredSuggestions.map((pokemon, index) => (
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
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/60",
                  highlightedSuggestionIndex >= 0 &&
                    filteredSuggestions[highlightedSuggestionIndex]?.id === pokemon.id &&
                    "bg-muted/70",
                )}
              >
                <div className="relative h-8 w-8 shrink-0">
                  <Image
                    src={pokemon.sprite}
                    alt={pokemon.nameFr}
                    fill
                    sizes="32px"
                    className="object-contain"
                  />
                </div>
                <span>{pokemon.nameFr}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
