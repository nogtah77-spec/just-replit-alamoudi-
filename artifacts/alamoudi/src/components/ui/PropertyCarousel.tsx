import { useRef, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PropertyCard, type CardSize } from "./PropertyCard";
import { cn } from "@/lib/utils";

interface PropertyCarouselProps {
  properties: any[];
  size?: CardSize;
  layout?: "grid" | "list";
  emphasized?: boolean;
  detailsScale?: "home" | "city";
  className?: string;
  autoPlay?: boolean;
  /** Waiting time between slides in ms */
  autoPlayDelay?: number;
  /** Movement speed multiplier (0.25 = slower/cinematic, 1 = normal, 4 = faster) */
  motionSpeed?: number;
  infinite?: boolean;
  glass?: boolean;
}

export function PropertyCarousel({
  properties,
  size = "compact",
  layout = "grid",
  emphasized = false,
  detailsScale = "home",
  className,
  autoPlay = false,
  autoPlayDelay = 3500,
  motionSpeed = 1,
  infinite = true,
  glass = true,
}: PropertyCarouselProps) {
  const safeSpeed = Math.min(4, Math.max(0.25, Number(motionSpeed) || 1));

  // Ultra-Soft Silk Physics (Damped Smooth Glide):
  // At 0.25x -> duration is ~76 (calm, velvet, cinematic glide)
  // At 0.50x -> duration is ~54
  // At 1.00x -> duration is ~38 (luxury smooth)
  // At 2.00x -> duration is ~27
  const emblaDuration = Math.round(38 / Math.sqrt(safeSpeed));

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: infinite && properties.length > 1,
    align: "start",
    direction: "rtl",
    duration: emblaDuration,
    skipSnaps: false,
    dragFree: false,
  });

  const isInteractingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (delay: number) => {
      clearTimer();
      if (!autoPlay || isInteractingRef.current || !emblaApi || properties.length < 2) {
        return;
      }
      timerRef.current = window.setTimeout(() => {
        if (isInteractingRef.current || !emblaApi) return;
        emblaApi.scrollNext();
      }, delay);
    },
    [autoPlay, clearTimer, emblaApi, properties.length],
  );

  const onStart = useCallback(() => {
    isInteractingRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const onEnd = useCallback(() => {
    isInteractingRef.current = false;
    clearTimer();
    if (!autoPlay || properties.length < 2) return;

    // Guaranteed full 4+ seconds grace period after removing mouse or finger
    const postInteractionDelay = Math.max(4000, Number(autoPlayDelay) || 4000);
    scheduleNext(postInteractionDelay);
  }, [autoPlay, autoPlayDelay, clearTimer, properties.length, scheduleNext]);

  // Hook into Embla's internal touch and pointer drag lifecycle
  useEffect(() => {
    if (!emblaApi) return;

    const handlePointerDown = () => {
      onStart();
    };

    const handlePointerUp = () => {
      onEnd();
    };

    const handleSettle = () => {
      // If user is currently touching or hovering, do NOT schedule
      if (isInteractingRef.current) {
        clearTimer();
        return;
      }
      // When a slide settles during normal autoplay, wait the full autoPlayDelay (min 3.5s)
      const standardDelay = Math.max(3500, Number(autoPlayDelay) || 3500);
      scheduleNext(standardDelay);
    };

    emblaApi.on("pointerDown", handlePointerDown);
    emblaApi.on("pointerUp", handlePointerUp);
    emblaApi.on("settle", handleSettle);

    // Initial autoplay start
    const initialDelay = Math.max(3500, Number(autoPlayDelay) || 3500);
    scheduleNext(initialDelay);

    return () => {
      clearTimer();
      emblaApi.off("pointerDown", handlePointerDown);
      emblaApi.off("pointerUp", handlePointerUp);
      emblaApi.off("settle", handleSettle);
    };
  }, [emblaApi, autoPlayDelay, clearTimer, onStart, onEnd, scheduleNext]);

  if (!properties || properties.length === 0) return null;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onPointerEnter={onStart}
      onPointerLeave={onEnd}
      onPointerDown={onStart}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
      dir="rtl"
    >
      <div ref={emblaRef} className="overflow-hidden py-3">
        <div className="flex gap-3 sm:gap-4 -mr-3 sm:-mr-4">
          {properties.map((property, index) => (
            <div
              key={`${property.id}-${index}`}
              className="flex-shrink-0 pr-3 sm:pr-4 w-[84vw] sm:w-[58vw] md:w-[380px] lg:w-[420px]"
            >
              <PropertyCard
                property={property}
                size={size}
                layout={layout}
                emphasized={emphasized}
                detailsScale={detailsScale}
                glass={glass}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
