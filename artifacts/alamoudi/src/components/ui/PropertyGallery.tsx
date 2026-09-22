import { useState, useRef, useCallback, useMemo } from "react";
import { ChevronRight, ChevronLeft, Download, Images, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDetailImageUrl, getThumbnailImageUrl } from "@/lib/cloudinaryService";

interface PropertyGalleryProps {
  images: string[];
  title?: string;
  onClickImage?: (index: number) => void;
  allowDownload?: boolean;
  downloadAllPending?: boolean;
  onDownloadImage?: (index: number) => void;
  onDownloadAll?: () => void;
  className?: string;
}

export function PropertyGallery({
  images,
  title,
  onClickImage,
  allowDownload = false,
  downloadAllPending = false,
  onDownloadImage,
  onDownloadAll,
  className,
}: PropertyGalleryProps) {
  // Deduplicate and filter out base64 strings if valid URLs exist
  const cleanImages = useMemo(() => {
    const arr = Array.isArray(images) ? images : [];
    const unique = Array.from(new Set(arr.filter(Boolean)));
    const hasRealUrls = unique.some(u => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/"));
    if (hasRealUrls) {
      return unique.filter(u => !u.startsWith("data:image/"));
    }
    return unique;
  }, [images]);

  const [current, setCurrent] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean; moved: boolean }>({
    startX: 0, startY: 0, dragging: false, moved: false,
  });

  const prev = useCallback(() => setCurrent(i => (i - 1 + cleanImages.length) % cleanImages.length), [cleanImages.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % cleanImages.length), [cleanImages.length]);

  const DRAG_THRESHOLD = 35;
  const AXIS_LOCK = 10;

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, dragging: true, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > AXIS_LOCK || dy > AXIS_LOCK) dragRef.current.moved = true;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) >= DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev();
      else next();
    }
  };

  const handleClick = () => {
    if (!dragRef.current.moved) onClickImage?.(current);
  };

  if (cleanImages.length === 0) return null;

  const showNav = cleanImages.length > 1;

  return (
    <div className={cn("rounded-2xl overflow-hidden bg-muted select-none", className)}>
      {/* Main row: [prev] [image] [next] */}
      <div className="flex items-stretch">
        {/* Prev arrow (RTL: right side = previous) */}
        {showNav ? (
          <button
            onClick={prev}
            className="w-10 flex-shrink-0 flex items-center justify-center bg-black/10 hover:bg-black/20 active:bg-black/30 transition-colors z-10"
            aria-label="الصورة السابقة"
          >
            <ChevronRight className="h-6 w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
          </button>
        ) : (
          <div className="w-0" />
        )}

        {/* Image area */}
        <div
          className="flex-1 relative h-[240px] xs:h-[280px] sm:h-[400px] cursor-pointer touch-pan-y overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleClick}
          draggable={false}
        >
          {/* Blurred background fill */}
          <img
            src={getThumbnailImageUrl(cleanImages[current])}
            aria-hidden
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="low"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40 pointer-events-none"
          />
          {/* Main image — object-contain, never clipped */}
          <img
            src={getDetailImageUrl(cleanImages[current])}
            alt={title}
            draggable={false}
            decoding="async"
            fetchPriority="high"
            sizes="(max-width: 640px) calc(100vw - 80px), 800px"
            className="relative w-full h-full object-contain pointer-events-none"
          />

          {/* Dots (bottom of image) */}
          {showNav && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
              {cleanImages.length <= 12 && cleanImages.map((_: string, i: number) => (
                <span
                  key={i}
                  className={cn(
                    "block rounded-full transition-all duration-200",
                    i === current
                      ? "w-4 h-1.5 bg-white shadow"
                      : "w-1.5 h-1.5 bg-white/50"
                  )}
                />
              ))}
              {cleanImages.length > 12 && (
                <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {current + 1} / {cleanImages.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Next arrow (RTL: left side = next) */}
        {showNav ? (
          <button
            onClick={next}
            className="w-10 flex-shrink-0 flex items-center justify-center bg-black/10 hover:bg-black/20 active:bg-black/30 transition-colors z-10"
            aria-label="الصورة التالية"
          >
            <ChevronLeft className="h-6 w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
          </button>
        ) : (
          <div className="w-0" />
        )}
      </div>

      {/* Thumbnail strip */}
      {showNav && (
        <div className="flex gap-1.5 p-2 bg-black/25 backdrop-blur-sm overflow-x-auto scrollbar-none">
          {/* counter chip */}
          <div className="flex-shrink-0 flex items-center px-2 text-white/70 text-xs font-medium">
            {current + 1}/{cleanImages.length}
          </div>
          {cleanImages.map((img: string, i: number) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "flex-shrink-0 h-14 w-20 rounded overflow-hidden border-2 transition-all",
                i === current ? "border-white opacity-100 scale-105" : "border-transparent opacity-55 hover:opacity-85"
              )}
            >
              <img
                src={getThumbnailImageUrl(img)}
                alt=""
                loading={i === current ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === current ? "high" : "low"}
                sizes="80px"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}

      {allowDownload && (
        <div className="flex flex-wrap items-center justify-end gap-2 p-2 border-t border-white/10 bg-black/15">
          <button
            type="button"
            onClick={() => onDownloadImage?.(current)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs text-white/90 transition-colors hover:bg-white/20"
            aria-label="تحميل الصورة الحالية"
          >
            <Download className="h-3.5 w-3.5" />
            تحميل الصورة
          </button>
          {cleanImages.length > 1 && (
            <button
              type="button"
              onClick={onDownloadAll}
              disabled={downloadAllPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-70"
              aria-label="تحميل جميع صور العقار"
            >
              {downloadAllPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Images className="h-3.5 w-3.5" />
              )}
              {downloadAllPending ? "جاري التجهيز..." : "تحميل كل الصور"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
