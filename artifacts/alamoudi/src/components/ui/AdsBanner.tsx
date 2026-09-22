// ─── AdsBanner — Public Display Component ────────────────────────────────────
//
// DISPLAY CONTRACT:
//   • Images are NEVER cropped, stretched, or modified.
//   • The correct image (desktop / mobile) is selected based on viewport width.
//   • Images scale proportionally (width: 100%; height: auto).
//   • Guide overlays are NEVER shown on the public site.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Ad } from "@/context/DataContext";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { buildEventPayload } from "@/lib/adTracking";
import { SLOT_TEMPLATES } from "@/lib/adTemplates";
import { api } from "@/lib/api";
import { SmartBannerDisplay } from "@/components/ui/SmartBannerDisplay";
import type { SmartBannerShape } from "@/components/ui/SmartBannerDisplay";

// نسب عرض Secondary مشتقة مباشرةً من التمبلتات — تتحدث تلقائياً عند تغيير الأبعاد
const SEC_DESKTOP_RATIO =
  `${SLOT_TEMPLATES.secondary.desktop.width}/${SLOT_TEMPLATES.secondary.desktop.height}` as const;
const SEC_MOBILE_RATIO  =
  `${SLOT_TEMPLATES.secondary.mobile.width}/${SLOT_TEMPLATES.secondary.mobile.height}`  as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

/** كل إعلان فعّال عنده صورة ديسكتوب أو صورة جوال على الأقل */
/** يفسّر تاريخ YYYY-MM-DD كتوقيت محلي (مش UTC) لتجنب فروق المنطقة الزمنية */
function localDate(dateStr: string, endOfDay = false): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getActiveAds(ads: Ad[]): Ad[] {
  const now = new Date();
  return [...ads]
    .filter(ad => {
      if (!ad.active) return false;
      if (!(ad.desktopImageUrl || ad.mobileImageUrl || ad.imageUrl)) return false;
      if (ad.startDate && localDate(ad.startDate)          > now) return false;
      if (ad.endDate   && localDate(ad.endDate, true)      < now) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

/** صورة الديسكتوب فقط — بدون fallback للجوال */
function getDesktopSrc(ad: Ad) { return ad.desktopImageUrl || ""; }
/** صورة الجوال — يدعم mobileImageUrl والقديم imageUrl — بدون fallback للديسكتوب */
function getMobileSrc(ad: Ad)  { return ad.mobileImageUrl || ad.imageUrl || ""; }

/** هل عنده صورة تخص الديسكتوب؟ */
function hasDesktopImage(ad: Ad) { return !!ad.desktopImageUrl; }
/** هل عنده صورة تخص الجوال؟ */
function hasMobileImage(ad: Ad)  { return !!(ad.mobileImageUrl || ad.imageUrl); }

/** يرصد تغير الـ breakpoint (lg = 1024px) */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq      = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// ─── AdPicture ────────────────────────────────────────────────────────────────
// Serves desktop image (≥1024px) or mobile image (<1024px).
// mode="proportional" → width:100%; height:auto (Premium).
// mode="cover"        → fills a fixed aspect-ratio box via object-cover (Secondary).

function AdPicture({
  ad,
  priority,
  mode = "proportional",
  coverRatio = SEC_DESKTOP_RATIO,
}: {
  ad: Ad;
  priority?: boolean;
  mode?: "proportional" | "cover" | "fill";
  coverRatio?: string;
}) {
  const desktop = getDesktopSrc(ad);
  const mobile  = getMobileSrc(ad);

  if (mode === "fill") {
    return (
      <picture className="absolute inset-0 block w-full h-full">
        {desktop && <source media="(min-width: 1024px)" srcSet={desktop} />}
        <img
          src={mobile || undefined}
          alt={ad.title || "إعلان"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover block"
        />
      </picture>
    );
  }

  if (mode === "cover") {
    return (
      <picture className="block w-full" style={{ aspectRatio: coverRatio }}>
        {desktop && <source media="(min-width: 1024px)" srcSet={desktop} />}
        <img
          src={mobile || undefined}
          alt={ad.title || "إعلان"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover block"
        />
      </picture>
    );
  }

  return (
    <picture className="block">
      {desktop && <source media="(min-width: 1024px)" srcSet={desktop} />}
      <img
        src={mobile || undefined}
        alt={ad.title || "إعلان"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="w-full h-auto block"
      />
    </picture>
  );
}

// ─── AdSlot ───────────────────────────────────────────────────────────────────
// Wraps one ad image with view / click tracking and optional title overlay.

function AdSlot({
  ad,
  className,
  priority,
  pictureMode = "proportional",
  coverRatio,
  onView,
  onClick,
}: {
  ad: Ad;
  className?: string;
  priority?: boolean;
  pictureMode?: "proportional" | "cover" | "fill";
  coverRatio?: string;
  onView?: (viewDuration: number) => void;
  onClick?: (clickX: number, clickY: number) => void;
}) {
  const ref       = useRef<HTMLDivElement>(null);
  const viewed    = useRef(false);

  useEffect(() => {
    if (!onView) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !viewed.current) {
          viewed.current = true;
          onView(0);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [onView]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick || !ref.current) return;
    const rect   = ref.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left)  / rect.width;
    const clickY = (e.clientY - rect.top)   / rect.height;
    onClick(
      Math.min(1, Math.max(0, clickX)),
      Math.min(1, Math.max(0, clickY)),
    );
  }, [onClick]);

  return (
    <div
      ref={ref}
      role="button"
      className={cn(
        "relative overflow-hidden bg-neutral-100 transition-opacity duration-300 cursor-pointer",
        className,
      )}
      onClick={handleClick}
    >
      <AdPicture ad={ad} priority={priority} mode={pictureMode} coverRatio={coverRatio} />

      {/* Title overlay — positioned over bottom of fluid-height container */}
      {ad.title && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none px-4 pb-3 pt-10 z-10">
          <p className="text-white font-semibold text-sm leading-snug drop-shadow line-clamp-1 text-right">
            {ad.title}
          </p>
        </div>
      )}

      {/* Subtle hover shimmer */}
      {ad.linkUrl && (
        <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors duration-200 pointer-events-none" />
      )}
    </div>
  );
}

// ─── PremiumSlot ──────────────────────────────────────────────────────────────
// Auto-rotating carousel. Drag/swipe to navigate. Dot indicators only.
// Rounded box, no arrows, no progress bar.

function PremiumSlot({
  premiums,
  onView,
  onClick,
}: {
  premiums: Ad[];
  onView:  (id: string, d: number) => void;
  onClick: (ad: Ad, x: number, y: number) => void;
}) {
  const count                     = premiums.length;
  const [current, setCur]         = useState(0);
  const [paused,  setPause]       = useState(false);
  const [isDragging, setDragging] = useState(false);
  const [dragDelta,  setDelta]    = useState(0);
  const dragStartX                = useRef<number | null>(null);
  const containerRef              = useRef<HTMLDivElement>(null);
  const ad                        = premiums[current];

  const next = useCallback(() => setCur(i => (i + 1) % count), [count]);
  const prev = useCallback(() => setCur(i => (i - 1 + count) % count), [count]);

  // ref لتجنب إعادة تشغيل تايمر التوقيت عند تغيير reference الـ array
  const premiumsRef = useRef(premiums);
  useEffect(() => { premiumsRef.current = premiums; });

  useEffect(() => { setCur(0); }, [count]);
  useEffect(() => {
    if (count <= 1 || paused) return;
    const ms = (premiumsRef.current[current]?.duration ?? 6) * 1000;
    const t  = setTimeout(next, ms);
    return () => clearTimeout(t);
  }, [count, paused, current, next]);

  // ── Touch ──────────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    setDelta(0);
    setPause(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    setDelta(e.touches[0].clientX - dragStartX.current);
  };
  const handleTouchEnd = () => {
    if (dragStartX.current !== null) {
      if (dragDelta >  50) prev();
      else if (dragDelta < -50) next();
    }
    dragStartX.current = null;
    setDelta(0);
    setPause(false);
  };

  // ── Mouse ──────────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    setDelta(0);
    setDragging(true);
    setPause(true);
    e.preventDefault();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX.current === null) return;
    setDelta(e.clientX - dragStartX.current);
  };
  const finishMouseDrag = () => {
    if (!isDragging) return;
    if (dragDelta >  50) prev();
    else if (dragDelta < -50) next();
    dragStartX.current = null;
    setDelta(0);
    setDragging(false);
    setPause(false);
  };

  if (!ad) return null;

  const trackStyle: React.CSSProperties = {
    transform:  `translateX(calc(-${current * 100}% + ${dragDelta}px))`,
    transition: isDragging ? "none" : "transform 520ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => count > 1 && setPause(true)}
      onMouseLeave={() => { setPause(false); finishMouseDrag(); }}
    >
      {/* ── Track ── */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 select-none",
          "aspect-[800/204] lg:aspect-[960/138]",
          count > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
        )}
        onTouchStart={count > 1 ? handleTouchStart : undefined}
        onTouchMove={count > 1 ? handleTouchMove   : undefined}
        onTouchEnd={count > 1 ? handleTouchEnd     : undefined}
        onMouseDown={count > 1 ? handleMouseDown   : undefined}
        onMouseMove={count > 1 ? handleMouseMove   : undefined}
        onMouseUp={count > 1 ? finishMouseDrag     : undefined}
      >
        <div dir="ltr" className="flex h-full" style={trackStyle}>
          {premiums.map((p, i) => (
            <div
              key={p.id}
              className="relative flex-shrink-0 w-full h-full overflow-hidden"
              onClick={(e) => {
                if (Math.abs(dragDelta) > 8) return;
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const y = Math.min(1, Math.max(0, (e.clientY - rect.top)  / rect.height));
                onClick(p, x, y);
              }}
            >
              <AdSlot
                ad={p}
                className="absolute inset-0"
                pictureMode="fill"
                priority={i === 0}
                onView={(d) => onView(p.id, d)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Dot indicators (خطوط رفيعة) ── */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {premiums.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCur(i); }}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-[2.5px] bg-white"
                  : "w-4 h-[1.5px] bg-white/45 hover:bg-white/70"
              )}
              aria-label={`إعلان ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SecondarySlide ───────────────────────────────────────────────────────────
// Single slide inside the SecondaryCarousel.
// Responsive aspect-ratio: mobile 800/400 → desktop 960/300.

function SecondarySlide({
  ad,
  priority,
  onClick,
}: {
  ad: Ad;
  priority?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const desktop = getDesktopSrc(ad);
  const mobile  = getMobileSrc(ad);

  return (
    // جوال: ارتفاع طبيعي متكيف مع الصورة | ديسكتوب: ارتفاع ثابت 960×138 مع object-cover
    <div
      role="button"
      className="relative w-full overflow-hidden select-none lg:h-full cursor-pointer"
      onClick={onClick}
    >
      <picture className="block w-full lg:absolute lg:inset-0">
        {desktop && <source media="(min-width: 1024px)" srcSet={desktop} />}
        <img
          src={mobile || undefined}
          alt={ad.title || "إعلان"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="w-full h-auto block lg:h-full lg:object-cover"
        />
      </picture>

      {ad.title && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none px-4 pb-3 pt-10 z-10">
          <p className="text-white font-semibold text-sm leading-snug drop-shadow line-clamp-1 text-right">
            {ad.title}
          </p>
        </div>
      )}
      {ad.linkUrl && (
        <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors duration-200 pointer-events-none" />
      )}
    </div>
  );
}

// ─── SecondaryCarousel ────────────────────────────────────────────────────────
// Crossfade carousel: smooth opacity transition between slides.
// Auto-play uses per-slide duration. Touch + mouse swipe supported.

function SecondaryCarousel({
  ads,
  onView,
  onClick,
}: {
  ads:     Ad[];
  onView:  (id: string, d: number) => void;
  onClick: (ad: Ad, x: number, y: number) => void;
}) {
  const isDesktop = useIsDesktop();

  // فلتر حسب الجهاز: إعلان بدون صورة جوال لا يظهر على الجوال، وبالعكس
  const visibleAds = useMemo(
    () => ads.filter(ad => isDesktop ? hasDesktopImage(ad) : hasMobileImage(ad)),
    [ads, isDesktop],
  );

  const count                 = visibleAds.length;
  const [current, setCurrent] = useState(0);
  const [paused,  setPaused]  = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);
  const touchStartX           = useRef<number | null>(null);
  const mouseStartX           = useRef<number | null>(null);
  const swipeDelta            = useRef(0);
  const viewed                = useRef<Set<string>>(new Set());

  const next = useCallback(() => setCurrent(i => (i + 1) % count), [count]);
  const prev = useCallback(() => setCurrent(i => (i - 1 + count) % count), [count]);

  // ref لتجنب reset التايمر عند تغيير reference الـ array بدون تغيير البيانات
  const adsRef = useRef(visibleAds);
  useEffect(() => { adsRef.current = visibleAds; });

  useEffect(() => { setCurrent(0); }, [count]);

  // Auto-play — مدة مستقلة لكل إعلان
  useEffect(() => {
    if (count <= 1 || paused) return;
    const ms = (adsRef.current[current]?.duration ?? 6) * 1000;
    const t  = setTimeout(next, ms);
    return () => clearTimeout(t);
  }, [count, paused, current, next]);

  // View tracking
  useEffect(() => {
    const ad = visibleAds[current];
    if (!ad || viewed.current.has(ad.id)) return;
    viewed.current.add(ad.id);
    onView(ad.id, 0);
  }, [current, visibleAds, onView]);

  // ── Touch swipe ────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff >  50) prev();
    else if (diff < -50) next();
    touchStartX.current = null;
    setPaused(false);
  };

  // ── Mouse swipe ────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    swipeDelta.current  = 0;
    setPaused(true);
    e.preventDefault();
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diff = e.clientX - mouseStartX.current;
    swipeDelta.current = diff;
    if (diff >  50) prev();
    else if (diff < -50) next();
    mouseStartX.current = null;
    setPaused(false);
  };

  // ── Click tracking ─────────────────────────────────────────────────────────
  const handleSlideClick = (ad: Ad) => (e: React.MouseEvent) => {
    if (Math.abs(swipeDelta.current) > 8) return;
    const el = containerRef.current;
    if (!el) return;
    const rect   = el.getBoundingClientRect();
    const clickX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const clickY = Math.min(1, Math.max(0, (e.clientY - rect.top)  / rect.height));
    onClick(ad, clickX, clickY);
  };

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/8 select-none grid",
        "lg:aspect-[960/138]",
        count > 1 ? "cursor-pointer" : "cursor-default",
      )}
      onMouseEnter={() => count > 1 && setPaused(true)}
      onMouseLeave={() => { setPaused(false); mouseStartX.current = null; }}
      onTouchStart={count > 1 ? handleTouchStart : undefined}
      onTouchEnd={count > 1 ? handleTouchEnd   : undefined}
      onMouseDown={count > 1 ? handleMouseDown  : undefined}
      onMouseUp={count > 1 ? handleMouseUp    : undefined}
    >
      {/* ── Crossfade slides — CSS Grid stacking (يحدد الارتفاع تلقائياً من الصورة) ── */}
      {visibleAds.map((ad, i) => (
        <div
          key={ad.id}
          className="transition-opacity duration-700 ease-in-out"
          style={{
            gridArea:      "1/1",
            opacity:       i === current ? 1 : 0,
            zIndex:        i === current ? 2 : 1,
            pointerEvents: i === current ? "auto" : "none",
          }}
        >
          <SecondarySlide
            ad={ad}
            priority={i === 0}
            onClick={handleSlideClick(ad)}
          />
        </div>
      ))}

      {/* ── Dot indicators (خطوط — منطقة ضغط واسعة) ─────────────────── */}
      {count > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex z-20">
          {visibleAds.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              className="p-2.5 flex items-center justify-center"
              aria-label={`إعلان ${i + 1}`}
            >
              <span className={cn(
                "block rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-[2.5px] bg-white shadow-sm"
                  : "w-4 h-[1.5px] bg-white/45 hover:bg-white/70",
              )} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared tracking factory ──────────────────────────────────────────────────

function useAdTracking() {
  const { trackAdView, trackAdClick } = useData();
  const { isStaff } = useAuth();

  const onView = useCallback((id: string, viewDuration: number) => {
    if (isStaff) return;
    const payload = { ...buildEventPayload(), viewDuration };
    trackAdView(id, payload as Record<string, unknown>);
  }, [isStaff, trackAdView]);

  const onClick = useCallback((ad: Ad, clickX: number, clickY: number) => {
    // حدد الـ action قبل التتبع
    let actionType: string | undefined;
    let openUrl: string | undefined;

    const priority = ad.linkPriority ?? "whatsapp";
    const hasWa    = !!ad.whatsappNumber;
    const hasUrl   = !!ad.linkUrl;

    // تحويل كل سطر في الرسالة إلى بولد (واتساب: *نص*)
    const boldify = (text: string) =>
      text.split("\n").map(line => line.trim() ? `*${line.trim()}*` : "").join("\n");

    if (hasWa && hasUrl) {
      // كلاهما موجود — نحترم الأولوية
      if (priority === "whatsapp") {
        actionType = "whatsapp";
        const phone = ad.whatsappNumber!.replace(/\D/g, "");
        const msg   = ad.whatsappMessage?.trim();
        openUrl     = `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(boldify(msg))}` : ""}`;
      } else {
        actionType = "url";
        openUrl    = ad.linkUrl;
      }
    } else if (hasWa) {
      actionType = "whatsapp";
      const phone = ad.whatsappNumber!.replace(/\D/g, "");
      const msg   = ad.whatsappMessage?.trim();
      openUrl     = `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(boldify(msg))}` : ""}`;
    } else if (hasUrl) {
      actionType = "url";
      openUrl    = ad.linkUrl;
    }

    if (!isStaff) {
      const payload = { ...buildEventPayload(), clickX, clickY, ...(actionType ? { actionType } : {}) };
      trackAdClick(ad.id, payload as Record<string, unknown>);
    }
    if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
  }, [isStaff, trackAdClick]);

  return { onView, onClick };
}

// ─── useActiveSmartBanners ────────────────────────────────────────────────────

function useActiveSmartBanners(slot: "top" | "bottom"): SmartBannerShape[] {
  const [banners, setBanners] = useState<SmartBannerShape[]>([]);
  useEffect(() => {
    const load = () =>
      api.get<SmartBannerShape[]>("/smart-banners")
        .then(list =>
          setBanners((list ?? []).filter(b => b.active && (b.slot ?? "top") === slot))
        )
        .catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [slot]);
  return banners;
}

// ─── MixedItem ────────────────────────────────────────────────────────────────

type MixedItem =
  | { kind: "ad";    data: Ad;               id: string; order: number; duration: number }
  | { kind: "smart"; data: SmartBannerShape; id: string; order: number; duration: number };

// ─── MixedCarousel ────────────────────────────────────────────────────────────
// كاروسيل موحّد: إعلانات بالصور + بانرات ذكية.
// الارتفاع: h-[100px] جوال/تابليت — lg:h-[96px] كمبيوتر (30% أقل من الحالي).

function MixedCarousel({
  items,
  onView,
  onClick,
  heightClass = "h-[100px] lg:h-[96px]",
}: {
  items:       MixedItem[];
  onView:      (id: string, d: number) => void;
  onClick:     (ad: Ad, x: number, y: number) => void;
  heightClass?: string;
}) {
  const count                = items.length;
  const [current, setCur]    = useState(0);
  const [paused,  setPaused] = useState(false);
  const containerRef         = useRef<HTMLDivElement>(null);
  const touchStartX          = useRef<number | null>(null);
  const mouseStartX          = useRef<number | null>(null);
  const swipeDelta           = useRef(0);
  const viewed               = useRef<Set<string>>(new Set());
  const itemsRef             = useRef(items);
  useEffect(() => { itemsRef.current = items; });

  const next = useCallback(() => setCur(i => (i + 1) % count), [count]);
  const prev = useCallback(() => setCur(i => (i - 1 + count) % count), [count]);

  useEffect(() => { setCur(0); }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const ms = (itemsRef.current[current]?.duration ?? 8) * 1000;
    const t  = setTimeout(next, ms);
    return () => clearTimeout(t);
  }, [count, paused, current, next]);

  useEffect(() => {
    const item = items[current];
    if (!item || item.kind !== "ad" || viewed.current.has(item.id)) return;
    viewed.current.add(item.id);
    onView(item.id, 0);
  }, [current, items, onView]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; setPaused(true); };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const d = e.changedTouches[0].clientX - touchStartX.current;
    if (d > 50) prev(); else if (d < -50) next();
    touchStartX.current = null; setPaused(false);
  };
  const handleMouseDown  = (e: React.MouseEvent) => { mouseStartX.current = e.clientX; swipeDelta.current = 0; setPaused(true); e.preventDefault(); };
  const handleMouseUp    = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const d = e.clientX - mouseStartX.current;
    swipeDelta.current = d;
    if (d > 50) prev(); else if (d < -50) next();
    mouseStartX.current = null; setPaused(false);
  };

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/8 select-none grid",
        heightClass,
        count > 1 ? "cursor-pointer" : "cursor-default",
      )}
      onMouseEnter={() => count > 1 && setPaused(true)}
      onMouseLeave={() => { setPaused(false); mouseStartX.current = null; }}
      onTouchStart={count > 1 ? handleTouchStart : undefined}
      onTouchEnd={count > 1 ? handleTouchEnd   : undefined}
      onMouseDown={count > 1 ? handleMouseDown  : undefined}
      onMouseUp={count > 1 ? handleMouseUp    : undefined}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className="overflow-hidden transition-opacity duration-700 ease-in-out"
          style={{
            gridArea:      "1/1",
            opacity:       i === current ? 1 : 0,
            zIndex:        i === current ? 2 : 1,
            pointerEvents: i === current ? "auto" : "none",
          }}
        >
          {item.kind === "ad" ? (
            <div
              className="relative w-full lg:h-full"
              onClick={(e) => {
                if (Math.abs(swipeDelta.current) > 8) return;
                const el = containerRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const y = Math.min(1, Math.max(0, (e.clientY - rect.top)  / rect.height));
                onClick(item.data, x, y);
              }}
            >
              <picture className="block w-full lg:absolute lg:inset-0">
                {item.data.desktopImageUrl && <source media="(min-width: 1024px)" srcSet={item.data.desktopImageUrl} />}
                <img
                  src={getMobileSrc(item.data) || undefined}
                  alt={item.data.title || "إعلان"}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="w-full h-auto block lg:h-full lg:object-cover"
                />
              </picture>
              {item.data.title && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none px-3 pb-2 pt-6 z-10">
                  <p className="text-white font-semibold text-xs leading-snug drop-shadow line-clamp-1 text-right">
                    {item.data.title}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full overflow-hidden">
              <SmartBannerDisplay banner={item.data} />
            </div>
          )}
        </div>
      ))}

      {count > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex z-20">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCur(i); }}
              className="p-2 flex items-center justify-center"
              aria-label={`شريحة ${i + 1}`}
            >
              <span className={cn(
                "block rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-[2.5px] bg-white shadow-sm"
                  : "w-3.5 h-[1.5px] bg-white/45 hover:bg-white/70",
              )} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PublicBannerSlot ─────────────────────────────────────────────────────────
// صندوق إعلاني واحد — يقبل بانرات ذكية + إعلانات عادية.
// slot="top"    → بانرات ذكية فقط (مخصصة لهذا الصندوق).
// slot="bottom" → إعلانات عادية + بانرات ذكية (مخصصة له).
// pinned=true   → ثابت دائماً (فوق الـ carousel).
// pinned=false  → يدور في الـ carousel بمدته المحددة.

export function PublicBannerSlot({ slot, ads }: { slot: "top" | "bottom"; ads: Ad[] }) {
  const smartBanners        = useActiveSmartBanners(slot);
  const { onView, onClick } = useAdTracking();
  const isDesktop           = useIsDesktop();

  // الصندوق العلوي: ارتفاع ثابت صغير على كل الأجهزة.
  // الصندوق السفلي: ارتفاع ثابت على الجوال/تابليت، ونسبة العرض الأصلية على الكمبيوتر.
  const slotHeightClass = slot === "top"
    ? "h-[100px] lg:h-[96px]"
    : "lg:aspect-[960/138] lg:h-auto";

  const pinnedBanners = useMemo(
    () => smartBanners.filter(b => b.pinned).sort((a, b) => a.order - b.order),
    [smartBanners],
  );

  const rotatingItems = useMemo((): MixedItem[] => {
    const items: MixedItem[] = smartBanners
      .filter(b => !b.pinned)
      .map(b => ({ kind: "smart" as const, data: b, id: b.id, order: b.order, duration: b.duration }));

    if (slot === "bottom") {
      getActiveAds(ads)
        .filter(ad => isDesktop ? hasDesktopImage(ad) : hasMobileImage(ad))
        .slice(0, 10)
        .forEach(ad => {
          items.push({ kind: "ad" as const, data: ad, id: ad.id, order: ad.order, duration: 6 });
        });
    }
    return items.sort((a, b) => a.order - b.order);
  }, [smartBanners, ads, slot, isDesktop]);

  if (pinnedBanners.length === 0 && rotatingItems.length === 0) return null;

  return (
    <div className={cn(
      "container px-4 sm:px-6 space-y-2",
      slot === "top" ? "pb-2" : "pb-3 sm:pb-4",
    )}>
      {pinnedBanners.map(b => (
        <div key={b.id} className={cn("rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/8", slotHeightClass)}>
          <SmartBannerDisplay banner={b} className="h-full overflow-hidden" />
        </div>
      ))}
      {rotatingItems.length > 0 && (
        <MixedCarousel items={rotatingItems} onView={onView} onClick={onClick} heightClass={slotHeightClass} />
      )}
    </div>
  );
}

// ─── UnifiedBanner (backward-compat wrapper) ──────────────────────────────────

interface BannerProps { ads: Ad[]; }

export function UnifiedBanner({ ads }: BannerProps) {
  return <PublicBannerSlot slot="bottom" ads={ads} />;
}

// ─── PremiumBanner / SecondaryBanner — backward compat ────────────────────────
export function PremiumBanner({ ads }: BannerProps) {
  const { onView, onClick } = useAdTracking();
  const active   = getActiveAds(ads);
  const premiums = active.filter(a => (a.type ?? "premium") === "premium");
  if (premiums.length === 0) return null;
  return (
    <div className="w-full">
      <PremiumSlot premiums={premiums} onView={onView} onClick={onClick} />
    </div>
  );
}

export function SecondaryBanner({ ads }: BannerProps) {
  const { onView, onClick } = useAdTracking();
  const active      = getActiveAds(ads);
  const secondaries = active.filter(a => a.type === "secondary").slice(0, 6);
  if (secondaries.length === 0) return null;
  return (
    <div className="container px-4 sm:px-6">
      <SecondaryCarousel ads={secondaries} onView={onView} onClick={onClick} />
    </div>
  );
}

// ─── AdsBanner (Public Entry Point — backward compat) ─────────────────────────

interface Props { ads: Ad[]; }

export function AdsBanner({ ads }: Props) {
  const { onView, onClick } = useAdTracking();

  const active      = getActiveAds(ads);
  if (active.length === 0) return null;

  const premiums    = active.filter(a => (a.type ?? "premium") === "premium");
  const secondaries = active.filter(a =>  a.type               === "secondary").slice(0, 6);

  return (
    <section
      className="container px-4 sm:px-6 pt-4 sm:pt-5 pb-6 space-y-3"
      aria-label="إعلانات"
    >
      {premiums.length > 0 && (
        <PremiumSlot premiums={premiums} onView={onView} onClick={onClick} />
      )}
      {secondaries.length > 0 && (
        <SecondaryCarousel ads={secondaries} onView={onView} onClick={onClick} />
      )}
    </section>
  );
}
