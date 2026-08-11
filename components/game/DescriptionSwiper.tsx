"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DescriptionSwiperProps {
  descriptions: string[];
  /** Identifiant de manche pour réinitialiser le carrousel. */
  slideKey: string;
  className?: string;
}

function getSlides(slideRefs: RefObject<(HTMLElement | null)[]>) {
  return slideRefs.current.filter((slide): slide is HTMLElement => slide != null);
}

function getClosestSlideIndex(
  container: HTMLElement,
  slides: HTMLElement[],
): number {
  const scrollLeft = container.scrollLeft;
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let index = 0; index < slides.length; index += 1) {
    const distance = Math.abs(slides[index].offsetLeft - scrollLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function DescriptionSwiper({
  descriptions,
  slideKey,
  className,
}: DescriptionSwiperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const pendingIndexRef = useRef<number | null>(null);
  const scrollSyncTimerRef = useRef<number | null>(null);
  const prevLengthRef = useRef(0);
  const prevSlideKeyRef = useRef(slideKey);

  const syncActiveIndex = useCallback(() => {
    const container = scrollRef.current;
    const slides = getSlides(slideRefs);
    if (!container || slides.length === 0) return;

    const index = getClosestSlideIndex(container, slides);
    setActiveIndex((current) => (current === index ? current : index));
  }, []);

  const finishScroll = useCallback(() => {
    if (scrollSyncTimerRef.current != null) {
      window.clearTimeout(scrollSyncTimerRef.current);
      scrollSyncTimerRef.current = null;
    }

    pendingIndexRef.current = null;
    setIsAnimating(false);
    syncActiveIndex();
  }, [syncActiveIndex]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollRef.current;
      const slides = getSlides(slideRefs);
      if (!container || slides.length === 0) return;

      const clamped = Math.max(0, Math.min(index, slides.length - 1));
      const targetLeft = slides[clamped].offsetLeft;

      pendingIndexRef.current = clamped;
      setActiveIndex(clamped);
      setIsAnimating(behavior === "smooth");

      container.scrollTo({ left: targetLeft, behavior });

      if (behavior === "auto") {
        finishScroll();
        return;
      }

      if (scrollSyncTimerRef.current != null) {
        window.clearTimeout(scrollSyncTimerRef.current);
      }
      scrollSyncTimerRef.current = window.setTimeout(finishScroll, 500);
    },
    [finishScroll],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      if (pendingIndexRef.current !== null) return;

      if (scrollSyncTimerRef.current != null) {
        window.clearTimeout(scrollSyncTimerRef.current);
      }
      scrollSyncTimerRef.current = window.setTimeout(finishScroll, 120);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scrollend", finishScroll);
    window.addEventListener("resize", finishScroll);

    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("scrollend", finishScroll);
      window.removeEventListener("resize", finishScroll);
      if (scrollSyncTimerRef.current != null) {
        window.clearTimeout(scrollSyncTimerRef.current);
      }
    };
  }, [descriptions.length, finishScroll, slideKey]);

  useEffect(() => {
    slideRefs.current.length = descriptions.length;
  }, [descriptions.length]);

  useEffect(() => {
    const runAfterLayout = (action: () => void) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(action);
      });
    };

    if (slideKey !== prevSlideKeyRef.current) {
      prevSlideKeyRef.current = slideKey;
      prevLengthRef.current = 0;
      pendingIndexRef.current = null;
      setIsAnimating(false);
      setActiveIndex(0);
      runAfterLayout(() => scrollToIndex(0, "auto"));
      return;
    }

    const previousLength = prevLengthRef.current;
    prevLengthRef.current = descriptions.length;

    if (descriptions.length === 0) return;

    if (previousLength === 0) {
      runAfterLayout(() => scrollToIndex(0, "auto"));
      return;
    }

    if (descriptions.length === previousLength + 1) {
      runAfterLayout(() => scrollToIndex(descriptions.length - 1));
      return;
    }

    if (descriptions.length > previousLength) {
      runAfterLayout(() => {
        const container = scrollRef.current;
        const slides = getSlides(slideRefs);
        if (!container || slides.length === 0) return;

        const current = getClosestSlideIndex(container, slides);
        const clamped = Math.min(current, descriptions.length - 1);
        scrollToIndex(clamped, "auto");
      });
    }
  }, [descriptions.length, scrollToIndex, slideKey]);

  const showNav = descriptions.length > 1;
  const navDisabled = isAnimating;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        {showNav ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Description précédente"
              disabled={navDisabled || activeIndex === 0}
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="absolute top-1/2 left-2 z-10 size-8 -translate-y-1/2 bg-background/95 shadow-sm backdrop-blur-sm"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Description suivante"
              disabled={navDisabled || activeIndex === descriptions.length - 1}
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute top-1/2 right-2 z-10 size-8 -translate-y-1/2 bg-background/95 shadow-sm backdrop-blur-sm"
            >
              <ChevronRight />
            </Button>
          </>
        ) : null}

        <div
          ref={scrollRef}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          style={{ touchAction: "pan-x pinch-zoom" }}
        >
          {descriptions.map((description, index) => (
            <article
              key={`${slideKey}-${index}`}
              ref={(element) => {
                slideRefs.current[index] = element;
              }}
              className="w-full shrink-0 snap-start snap-always"
              aria-label={`Description ${index + 1}`}
            >
              <div className="display-frame mx-1 flex max-h-56 min-h-40 flex-col overflow-y-auto px-6 py-5 sm:mx-10">
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

      {showNav ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <p
            className="text-xs font-medium text-muted-foreground tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            Description {activeIndex + 1} / {descriptions.length}
          </p>
          <div className="flex items-center gap-1.5">
            {descriptions.map((_, index) => (
              <button
                key={`${slideKey}-dot-${index}`}
                type="button"
                aria-label={`Aller à la description ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                disabled={navDisabled}
                onClick={() => scrollToIndex(index)}
                className={cn(
                  "size-2 rounded-full transition-colors disabled:opacity-50",
                  index === activeIndex
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
