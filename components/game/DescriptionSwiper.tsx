"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface DescriptionSwiperProps {
  descriptions: string[];
  /** Identifiant de manche pour réinitialiser le carrousel. */
  slideKey: string;
  className?: string;
}

export function DescriptionSwiper({
  descriptions,
  slideKey,
  className,
}: DescriptionSwiperProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const prevSlideKeyRef = useRef(slideKey);
  const prevLengthRef = useRef(descriptions.length);
  const touchStartXRef = useRef<number | null>(null);

  const count = descriptions.length;
  const maxIndex = Math.max(0, count - 1);
  const safeIndex = Math.min(activeIndex, maxIndex);
  const showNav = count > 1;
  const slideShare = count > 0 ? 100 / count : 100;

  useEffect(() => {
    if (slideKey !== prevSlideKeyRef.current) {
      prevSlideKeyRef.current = slideKey;
      prevLengthRef.current = count;
      setActiveIndex(0);
    }
  }, [slideKey, count]);

  useEffect(() => {
    const previousLength = prevLengthRef.current;
    if (count === previousLength) return;

    if (count === previousLength + 1) {
      setActiveIndex(count - 1);
    } else if (count > previousLength) {
      setActiveIndex((current) => Math.min(current, count - 1));
    }

    prevLengthRef.current = count;
  }, [count]);

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(maxIndex, current + 1));
  }, [maxIndex]);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(Math.max(0, Math.min(index, maxIndex)));
    },
    [maxIndex],
  );

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const startX = touchStartXRef.current;
      touchStartXRef.current = null;
      if (startX === null) return;

      const endX = event.changedTouches[0]?.clientX;
      if (endX === undefined) return;

      const delta = endX - startX;
      if (Math.abs(delta) < 40) return;

      if (delta < 0) {
        goNext();
      } else {
        goPrevious();
      }
    },
    [goNext, goPrevious],
  );

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        {showNav ? (
          <>
            <button
              type="button"
              aria-label="Description précédente"
              disabled={safeIndex === 0}
              onClick={goPrevious}
              className="absolute top-1/2 left-2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Description suivante"
              disabled={safeIndex >= maxIndex}
              onClick={goNext}
              className="absolute top-1/2 right-2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        ) : null}

        <div
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              width: `${count * 100}%`,
              transform: `translate3d(-${safeIndex * slideShare}%, 0, 0)`,
            }}
          >
            {descriptions.map((description, index) => (
              <article
                key={`${slideKey}-${index}`}
                className="min-w-0 shrink-0 grow-0 px-1 sm:px-8"
                style={{ width: `${slideShare}%` }}
                aria-hidden={index !== safeIndex}
                aria-label={`Description ${index + 1}`}
              >
                <div className="display-frame mx-1 flex max-h-56 min-h-40 flex-col overflow-y-auto px-6 py-5 sm:mx-0">
                  {showNav ? (
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Description {index + 1}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    « {description} »
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {showNav ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <p
            className="text-xs font-medium text-muted-foreground tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            Description {safeIndex + 1} / {count}
          </p>
          <div className="flex items-center gap-1.5">
            {descriptions.map((_, index) => (
              <button
                key={`${slideKey}-dot-${index}`}
                type="button"
                aria-label={`Aller à la description ${index + 1}`}
                aria-current={index === safeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  index === safeIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground sm:hidden">
            Glisse horizontalement pour changer de description
          </p>
        </div>
      ) : null}
    </div>
  );
}
