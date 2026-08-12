"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import type { RankedMode } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { ARENA_GAMES } from "@/lib/games/home-games";
import {
  ARENA_RANKED_MODES,
  getRankedModeLabel,
} from "@/lib/games/ranked-limits";
import { toGameMode } from "@/lib/ranked/mode";
import { cn } from "@/lib/utils";

const modeTags = Object.fromEntries(
  ARENA_GAMES.map((game) => [game.mode, game.tag]),
) as Partial<Record<ReturnType<typeof toGameMode>, string>>;

interface RankedModeSelectProps {
  value: RankedMode;
  onChange: (mode: RankedMode) => void;
  disabled?: boolean;
}

export function RankedModeSelect({
  value,
  onChange,
  disabled = false,
}: RankedModeSelectProps) {
  const selectedLabel = getRankedModeLabel(value);
  const selectedTag = modeTags[toGameMode(value)];

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        disabled={disabled}
        aria-label="Choisir une épreuve"
        className={cn(
          "group flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm",
          "transition hover:border-border hover:bg-muted/20",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-popup-open:border-primary/40 data-popup-open:ring-3 data-popup-open:ring-ring/30",
          "disabled:pointer-events-none disabled:opacity-50 sm:min-w-[18rem]",
        )}
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Épreuve
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {selectedLabel}
            </span>
            {selectedTag ? (
              <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                {selectedTag}
              </Badge>
            ) : null}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition group-data-popup-open:rotate-180"
          aria-hidden
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          positionMethod="fixed"
          className="z-1000 w-(--anchor-width) min-w-(--anchor-width)"
        >
          <Menu.Popup
            className={cn(
              "max-h-80 overflow-y-auto rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-lg outline-none",
              "data-starting-style:scale-[0.98] data-starting-style:opacity-0",
              "data-ending-style:scale-[0.98] data-ending-style:opacity-0",
              "transition-[transform,opacity] duration-150",
            )}
          >
            {ARENA_RANKED_MODES.map((entry) => {
              const label = getRankedModeLabel(entry);
              const tag = modeTags[toGameMode(entry)];
              const selected = entry === value;

              return (
                <Menu.Item
                  key={entry}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none",
                    "hover:bg-muted focus-visible:bg-muted data-highlighted:bg-muted",
                    selected && "bg-primary/8 text-foreground",
                  )}
                  onClick={() => onChange(entry)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0 text-primary",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {label}
                  </span>
                  {tag ? (
                    <Badge variant="outline" className="shrink-0">
                      {tag}
                    </Badge>
                  ) : null}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
