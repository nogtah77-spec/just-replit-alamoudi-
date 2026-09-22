import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn, suppressGhostClicks } from "@/lib/utils";
import { getDetailImageUrl } from "@/lib/cloudinaryService";

interface ZoomableLightboxProps {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export function ZoomableLightbox({
  images,
  currentIndex,
  onClose,
  onChangeIndex,
}: ZoomableLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mouseDragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0, startY: 0, posX: 0, posY: 0,
  });

  const touchState = useRef<{
    initialDistance: number;
    initialScale: number;
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    lastTapTime: number;
    isTwoFingers: boolean;
    moved: boolean;
  }>({
    initialDistance: 0,
    initialScale: 1,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    lastTapTime: 0,
    isTwoFingers: false,
    moved: false,
  });

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Reset zoom when index changes
  useEffect(() => {
    resetZoom();
  }, [currentIndex, resetZoom]);

  const prev = useCallback(() => {
    if (currentIndex === null || images.length <= 1) return;
    resetZoom();
    onChangeIndex((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onChangeIndex, resetZoom]);

  const next = useCallback(() => {
    if (currentIndex === null || images.length <= 1) return;
    resetZoom();
    onChangeIndex((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onChangeIndex, resetZoom]);

  const handleSafeClose = useCallback((e?: React.SyntheticEvent | Event) => {
    if (e) {
      try {
        if ("preventDefault" in e && typeof e.preventDefault === "function") e.preventDefault();
        if ("stopPropagation" in e && typeof e.stopPropagation === "function") e.stopPropagation();
      } catch {}
    }
    suppressGhostClicks(450);
    resetZoom();
    onClose();
  }, [onClose, resetZoom]);

  // Keyboard navigation & body lock
  useEffect(() => {
    if (currentIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSafeClose(e);
      else if (e.key === "ArrowRight") prev();
      else if (e.key === "ArrowLeft") next();
      else if (e.key === "+" || e.key === "=") {
        setScale(s => Math.min(4, s + 0.5));
      } else if (e.key === "-") {
        setScale(s => {
          const nextS = Math.max(1, s - 0.5);
          if (nextS <= 1.05) setPosition({ x: 0, y: 0 });
          return nextS;
        });
      } else if (e.key === "0") {
        resetZoom();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [currentIndex, handleSafeClose, prev, next, resetZoom]);

  // Wheel zoom on desktop (wheel without scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || currentIndex === null) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      setScale(prevScale => {
        const factor = delta > 0 ? 1.15 : 0.87;
        const newScale = Math.min(4.5, Math.max(1, prevScale * factor));
        if (newScale <= 1.02) {
          setPosition({ x: 0, y: 0 });
          return 1;
        }
        return newScale;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [currentIndex]);

  if (currentIndex === null || images.length === 0 || typeof document === "undefined") return null;

  const currentRawImage = images[currentIndex];
  const currentImage = getDetailImageUrl(currentRawImage);

  // ── Touch Events (Mobile pinch & double-tap) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsInteracting(true);
    const now = Date.now();

    if (e.touches.length === 2) {
      // Pinch-to-zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchState.current.initialDistance = dist;
      touchState.current.initialScale = scale;
      touchState.current.isTwoFingers = true;
      touchState.current.moved = true;
    } else if (e.touches.length === 1) {
      touchState.current.isTwoFingers = false;
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.initialPosX = position.x;
      touchState.current.initialPosY = position.y;
      touchState.current.moved = false;

      // Double-tap detection
      if (now - touchState.current.lastTapTime < 320) {
        touchState.current.lastTapTime = 0;
        if (scale > 1.05) {
          resetZoom();
        } else {
          // Smooth zoom to 2.5x
          setScale(2.5);
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
            const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
            setPosition({ x: -tapX * 1.1, y: -tapY * 1.1 });
          }
        }
      } else {
        touchState.current.lastTapTime = now;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchState.current.isTwoFingers) {
      // 2 fingers pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchState.current.initialDistance > 0) {
        const factor = dist / touchState.current.initialDistance;
        const newScale = Math.min(4.5, Math.max(0.9, touchState.current.initialScale * factor));
        setScale(newScale);
        if (newScale <= 1.02) {
          setPosition({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && !touchState.current.isTwoFingers) {
      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        touchState.current.moved = true;
      }

      if (scale > 1.05) {
        // Panning when zoomed
        const maxPanX = (window.innerWidth * (scale - 1)) / 2 + 40;
        const maxPanY = (window.innerHeight * (scale - 1)) / 2 + 40;

        const nextX = touchState.current.initialPosX + dx;
        const nextY = touchState.current.initialPosY + dy;

        setPosition({
          x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsInteracting(false);

    if (touchState.current.isTwoFingers) {
      if (e.touches.length === 0) {
        touchState.current.isTwoFingers = false;
        if (scale < 1.05) {
          resetZoom();
        }
      }
      return;
    }

    if (e.touches.length === 0) {
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchState.current.startX;
      const dy = touch.clientY - touchState.current.startY;

      if (scale <= 1.05) {
        // Vertical swipe to dismiss
        if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          handleSafeClose(e);
          return;
        }

        // Horizontal swipe to navigate (RTL: right=prev, left=next)
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          if (dx > 0) prev();
          else next();
          return;
        }

        resetZoom();
      }
    }
  };

  // ── Desktop Mouse Events (Double Click, Click & Drag Panning) ──
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scale > 1.05) {
      resetZoom();
    } else {
      setScale(2.5);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const tapX = e.clientX - rect.left - rect.width / 2;
        const tapY = e.clientY - rect.top - rect.height / 2;
        setPosition({ x: -tapX * 1.1, y: -tapY * 1.1 });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1.05) {
      e.preventDefault();
      setIsMouseDown(true);
      setIsInteracting(true);
      mouseDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDown && scale > 1.05) {
      e.preventDefault();
      const dx = e.clientX - mouseDragRef.current.startX;
      const dy = e.clientY - mouseDragRef.current.startY;

      const maxPanX = (window.innerWidth * (scale - 1)) / 2 + 50;
      const maxPanY = (window.innerHeight * (scale - 1)) / 2 + 50;

      const nextX = mouseDragRef.current.posX + dx;
      const nextY = mouseDragRef.current.posY + dy;

      setPosition({
        x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsInteracting(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() !== "img" && !target.closest("button") && scale <= 1.05) {
      handleSafeClose(e);
    }
  };

  const zoomIn = () => setScale(s => Math.min(4.5, s + 0.6));
  const zoomOut = () => setScale(s => {
    const nextS = Math.max(1, s - 0.6);
    if (nextS <= 1.05) setPosition({ x: 0, y: 0 });
    return nextS;
  });

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000000] bg-black/95 flex flex-col items-center justify-center select-none overflow-hidden touch-none"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Top Bar Controls ── */}
      {/* Close Button X (Right side) */}
      <button
        type="button"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[1000005] w-12 h-12 rounded-full bg-[#161B20] hover:bg-black active:scale-95 text-white flex items-center justify-center border-2 border-white/80 shadow-[0_4px_25px_rgba(0,0,0,0.95)] cursor-pointer transition-all"
        onClick={handleSafeClose}
        onTouchEnd={handleSafeClose}
        aria-label="إغلاق"
        title="إغلاق (Esc)"
      >
        <X className="w-6 h-6 text-white stroke-[2.5]" />
      </button>

      {/* Top Counter Center */}
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[1000005] text-white/95 text-xs sm:text-sm font-bold tabular-nums px-4 py-1.5 rounded-full bg-[#161B20] border border-white/50 shadow-xl pointer-events-none select-none flex items-center gap-2">
        <span>{currentIndex + 1} / {images.length}</span>
        {scale > 1.05 && (
          <span className="text-[#C5A059] font-mono text-xs bg-[#C5A059]/20 px-1.5 py-0.5 rounded">
            {Math.round(scale * 100)}%
          </span>
        )}
      </div>

      {/* Quick Zoom Buttons (Top Left) */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[1000005] flex items-center gap-1.5 bg-[#161B20]/90 backdrop-blur-md border border-white/40 rounded-full p-1 shadow-xl">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="w-8 h-8 rounded-full hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-all"
          title="تكبير (+)"
          aria-label="تكبير"
        >
          <ZoomIn className="w-4 h-4 text-white" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="w-8 h-8 rounded-full hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-all"
          title="تصغير (-)"
          aria-label="تصغير"
        >
          <ZoomOut className="w-4 h-4 text-white" />
        </button>
        {scale > 1.05 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="w-8 h-8 rounded-full hover:bg-white/20 active:scale-90 flex items-center justify-center text-[#C5A059] transition-all"
            title="إعادة ضبط (100%)"
            aria-label="إعادة ضبط"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Navigation Arrows (Side) ── */}
      {images.length > 1 && scale <= 1.05 && (
        <>
          {/* Prev Arrow (Right in RTL) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            onTouchEnd={(e) => { e.stopPropagation(); prev(); }}
            className="fixed top-1/2 -translate-y-1/2 right-3 sm:right-6 z-[1000005] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#161B20] hover:bg-black active:scale-95 text-white flex items-center justify-center border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.95)] cursor-pointer transition-all"
            aria-label="الصورة السابقة"
            title="السابق"
          >
            <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.5]" />
          </button>

          {/* Next Arrow (Left in RTL) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            onTouchEnd={(e) => { e.stopPropagation(); next(); }}
            className="fixed top-1/2 -translate-y-1/2 left-3 sm:left-6 z-[1000005] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#161B20] hover:bg-black active:scale-95 text-white flex items-center justify-center border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.95)] cursor-pointer transition-all"
            aria-label="الصورة التالية"
            title="التالي"
          >
            <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.5]" />
          </button>
        </>
      )}

      {/* ── Main Zoomable Image Canvas ── */}
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center overflow-hidden",
          scale > 1.05 ? (isMouseDown ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"
        )}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imgRef}
          src={currentImage}
          alt=""
          draggable={false}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transition: isInteracting || isMouseDown ? "none" : "transform 0.24s cubic-bezier(0.2, 0, 0.2, 1)",
            transformOrigin: "center center",
            willChange: "transform",
            touchAction: "none",
          }}
          className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.95)] select-none pointer-events-auto"
        />
      </div>

      {/* ── Bottom Controls & Dots Bar (Only visible when scale <= 1.05) ── */}
      {scale <= 1.05 && (
        <div
          className="fixed z-[1000005] flex items-center gap-3 px-4 py-2 rounded-full bg-[#161B20] border border-white/50 shadow-2xl animate-in fade-in duration-200"
          style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 16px) + 16px))", left: "50%", transform: "translateX(-50%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 active:scale-90 flex items-center justify-center text-white cursor-pointer transition-all"
              aria-label="السابق"
            >
              <ChevronRight className="w-5 h-5 text-white stroke-[2.5]" />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2">
            {images.length > 1 && images.length <= 12 &&
              images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "block rounded-full transition-all duration-200",
                    i === currentIndex
                      ? "w-4 h-1.5 bg-[#C5A059] shadow"
                      : "w-1.5 h-1.5 bg-white/40"
                  )}
                />
              ))}
            <span className="text-white/95 text-xs font-bold tabular-nums pr-1">
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 active:scale-90 flex items-center justify-center text-white cursor-pointer transition-all"
              aria-label="التالي"
            >
              <ChevronLeft className="w-5 h-5 text-white stroke-[2.5]" />
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
