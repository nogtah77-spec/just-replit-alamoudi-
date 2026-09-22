import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { Button } from "@/components/ui/button";
import {
  Search,
  UserCheck,
  Plus,
  ChevronLeft,
  X,
  ExternalLink,
  Play,
  Building2,
  Paintbrush,
  MessageSquareText,
  MessageCircle,
} from "lucide-react";
import { TikTokIcon } from "@/components/icons/BrandIcons";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useData, type TiktokVideo } from "@/context/DataContext";
import { extractVideoUrl } from "@/lib/videoThumbnail";
import { Link } from "wouter";
import { PublicBannerSlot } from "@/components/ui/AdsBanner";
import { PropertyCarousel } from "@/components/ui/PropertyCarousel";
import { PropertyFilterPanel } from "@/components/ui/PropertyFilterPanel";
import { StickyQuickSearch } from "@/components/ui/StickyQuickSearch";
import { HomeQrSection } from "@/components/home/HomeQrSection";
import { HomeLuxuryBackground } from "@/components/ui/HomeLuxuryBackground";
import {
  DEFAULT_PROPERTY_FILTERS,
  filterProperties,
  hasActivePropertyFilters,
  PROPERTY_CARD_SIZE_KEY,
  type PropertyFilterState,
} from "@/lib/propertyFilters";
import { updatePageMeta } from "@/lib/meta";

function tiktokId(url: string): string | null {
  const m = url.match(/\/video\/(\d{6,})/);
  return m ? m[1] : null;
}

function TiktokPlayer({ video }: { video: TiktokVideo }) {
  const cleanUrl = extractVideoUrl(video.videoUrl);
  const local = tiktokId(cleanUrl);
  const [id, setId] = useState<string | null>(local);
  const [state, setState] = useState<"ready" | "loading" | "failed">(
    local ? "ready" : "loading",
  );

  useEffect(() => {
    const direct = tiktokId(cleanUrl);
    if (direct) {
      setId(direct);
      setState("ready");
      return;
    }
    let cancelled = false;
    setId(null);
    setState("loading");
    fetch(`/api/tiktok/resolve?url=${encodeURIComponent(cleanUrl)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { videoId?: string }) => {
        if (cancelled) return;
        if (data.videoId) {
          setId(data.videoId);
          setState("ready");
        } else {
          setState("failed");
        }
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [cleanUrl]);

  return (
    <>
      {state === "loading" ? (
        <div className="w-full h-[60vh] min-h-[480px] bg-black flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      ) : state === "ready" && id ? (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${id}`}
          title={video.title}
          className="w-full h-[60vh] min-h-[480px] bg-black"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="p-10 text-center">
          <Play className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            لا يمكن تشغيل هذا الفيديو داخل الموقع. افتحه على تيك توك.
          </p>
        </div>
      )}
      <div className="p-3 flex items-center justify-between gap-2 border-t border-border bg-card">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {video.title}
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1.5 flex-shrink-0"
        >
          <a href={cleanUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            فتح في تيك توك
          </a>
        </Button>
      </div>
    </>
  );
}

function TiktokCard({
  video,
  onPlay,
}: {
  video: TiktokVideo;
  onPlay: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = video.thumbnail
    ? video.thumbnail
    : `/api/tiktok/thumbnail?url=${encodeURIComponent(extractVideoUrl(video.videoUrl))}`;
  return (
    <button
      onClick={onPlay}
      className="group block w-full text-right rounded-[10px] overflow-hidden border border-[#C5A059]/30 bg-[#0F1317]/80 hover:border-[#C5A059]/70 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="relative aspect-[4/5] bg-muted overflow-hidden">
        {!failed ? (
          <img
            src={src}
            alt={video.title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="(max-width: 640px) 30vw, 180px"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Play className="h-7 w-7 text-[#C5A059]/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#C5A059] flex items-center justify-center shadow-lg">
            <Play className="h-4 w-4 text-[#10202D] fill-[#10202D] mr-[-2px]" />
          </div>
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs font-bold text-foreground group-hover:text-[#C5A059] transition-colors line-clamp-2 leading-snug">
          {video.title}
        </p>
      </div>
    </button>
  );
}

export default function Home() {
  const { properties, regions, propertyTypes, settings } = useData();
  const [filters, setFilters] = useState<PropertyFilterState>(() => {
    try {
      const cardSize = localStorage.getItem(PROPERTY_CARD_SIZE_KEY);
      const medium = cardSize === "medium";
      return { ...DEFAULT_PROPERTY_FILTERS, viewMode: medium ? "grid" : "list", cardSize: medium ? "medium" : "compact" };
    } catch {
      return DEFAULT_PROPERTY_FILTERS;
    }
  });
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilterState>(() => {
    try {
      const cardSize = localStorage.getItem(PROPERTY_CARD_SIZE_KEY);
      const medium = cardSize === "medium";
      return { ...DEFAULT_PROPERTY_FILTERS, viewMode: medium ? "grid" : "list", cardSize: medium ? "medium" : "compact" };
    } catch {
      return DEFAULT_PROPERTY_FILTERS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(PROPERTY_CARD_SIZE_KEY, filters.cardSize);
    } catch {}
  }, [filters.cardSize]);

  useEffect(() => {
    updatePageMeta({
      title: "الرئيسية | العمودي للتسويق العقاري",
      description: "منصة العمودي للتسويق العقاري — تصفح أفضل الفلل والشقق والعقارات الفاخرة والتجارية في مصر.",
    });
  }, []);
  const resolve = (p: any) => ({
    ...p,
    typeName: propertyTypes.find((t) => t.id === p.typeId)?.name,
    regionName: regions.find((r) => r.id === p.regionId)?.name,
  });

  const featuredProps = useMemo(
    () =>
      properties
        .filter((p) => p.featured && (p.status as string) !== "archived")
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
          const timeB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
          return timeB - timeA;
        })
        .map(resolve),
    [properties, propertyTypes, regions],
  );

  const latestProps = useMemo(() => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. Available active properties
    const activeCandidates = [...properties].filter(
      (p) => (p.status as string) !== "archived" && p.status !== "sold" && p.status !== "rented" && p.status !== "draft"
    );

    // 2. Sort all by newest creation date first
    const sorted = activeCandidates.sort((a, b) => {
      const timeA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return String(b.id).localeCompare(String(a.id));
    });

    // 3. Properties added within the last 7 days
    const recentWithin7Days = sorted.filter((p) => {
      const time = new Date(p.createdAt || (p as any).created_at || 0).getTime();
      return time > 0 && now - time <= SEVEN_DAYS_MS;
    });

    // 4. If there are properties added within 7 days, display them (up to 8).
    // If a week passes without new properties, fallback to the latest 6 active properties to prevent an empty section!
    const finalItems = recentWithin7Days.length > 0
      ? recentWithin7Days.slice(0, 8)
      : sorted.slice(0, 6);

    return finalItems.map(resolve);
  }, [properties, propertyTypes, regions]);

  const propertiesByRegion = useMemo(() => {
    const groups = new Map<string, { name: string; items: any[] }>();
    for (const p of properties) {
      const region = regions.find((r) => r.id === p.regionId);
      if (!region || !region.active) continue;
      if (!groups.has(p.regionId))
        groups.set(p.regionId, { name: region.name, items: [] });
      groups.get(p.regionId)!.items.push(resolve(p));
    }
    return [...groups.entries()]
      .map(([id, { name, items }]) => ({ id, name, items }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length);
  }, [properties, regions, propertyTypes]);

  const isFiltering = hasActivePropertyFilters(appliedFilters);
  const filterResults = useMemo(
    () => filterProperties(properties, appliedFilters, regions, propertyTypes).map(resolve),
    [properties, appliedFilters, regions, propertyTypes],
  );

  const applyFilters = (next: PropertyFilterState) => {
    setFilters(next);
    setAppliedFilters(next);
  };

  const clearFilters = () => {
    const viewMode = filters.viewMode;
    const reset = { ...DEFAULT_PROPERTY_FILTERS, viewMode, cardSize: filters.cardSize };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  const heroImage =
    settings.heroImageUrl ||
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80";
  const heroOverlay =
    Math.min(100, Math.max(0, settings.heroOverlayOpacity ?? 85)) / 100;
  const tiktokVideos = (settings.tiktokVideos ?? []).slice(0, 3);
  const [activeVideo, setActiveVideo] = useState<TiktokVideo | null>(null);
  const [showStickySearch, setShowStickySearch] = useState(false);

  // Instant local lock check to guarantee zero flicker on reload or tab switch
  let localTiktokEnabled: boolean | undefined;
  try {
    const raw = localStorage.getItem("alm_tiktok_enabled");
    if (raw !== null) {
      localTiktokEnabled = JSON.parse(raw);
    }
  } catch {}

  const isTiktokSectionVisible = localTiktokEnabled !== undefined
    ? localTiktokEnabled
    : (settings.tiktokSectionEnabled !== undefined ? settings.tiktokSectionEnabled : true);

  useEffect(() => {
    const handleScroll = () => {
      // Reveal sticky search pill when scrolled past 220px
      setShowStickySearch(window.scrollY > 220);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4";

  const videoGridClass =
    "grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5";

  return (
    <div className="min-h-screen flex flex-col relative bg-transparent">
      {/* ── Ambient Luxury Fixed Background (Anchored to Viewport) ── */}
      <HomeLuxuryBackground isFixed />
      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />
      <StickyQuickSearch
        filters={filters}
        regions={regions}
        propertyTypes={propertyTypes}
        visible={showStickySearch}
        isFiltering={isFiltering}
        resultCount={filterResults.length}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={clearFilters}
      />
      <main className="flex-1 relative bg-transparent">

        {/* ── 3 Action Buttons — Luxury Quick Actions ── */}
        <div className="container px-2 sm:px-6 pt-3 sm:pt-5 pb-3 sm:pb-4">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3.5 max-w-4xl mx-auto">
            <Link
              href="/add-property"
              className="action-btn-add-property group relative flex items-center justify-center rounded-[10px] py-2 px-1 sm:py-3 sm:px-3.5 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] text-foreground shadow-sm hover:shadow-md hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer border border-[#C5A059]/30 hover:border-[#C5A059]/60 overflow-hidden backdrop-blur-md"
            >
              {/* Subtle luxury top ambient highlight & contained micro radial glow */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent pointer-events-none" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-16 bg-[#C5A059]/2 rounded-full blur-md pointer-events-none group-hover:bg-[#C5A059]/6 transition-all duration-500" />

              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 w-full">
                <div className="text-right shrink-0">
                  <span className="block text-[10.5px] sm:text-[14px] font-bold text-[#F8FAFC] group-hover:text-[#C5A059] transition-colors leading-tight whitespace-nowrap">اعرض عقارك</span>
                  <span className="action-subtitle block text-[8px] sm:text-[10.5px] text-[#C5A059] font-medium mt-0.5 whitespace-nowrap">بيع أو تأجير وحدتك</span>
                </div>
                <div className="action-icon-badge w-6 h-6 sm:w-7 sm:h-7 rounded-[6px] sm:rounded-[7px] flex items-center justify-center shrink-0 transition-all duration-300">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
                </div>
              </div>
            </Link>

            <Link
              href="/finishing-services"
              className="action-btn-finishing group relative flex items-center justify-center rounded-[10px] py-2 px-1 sm:py-3 sm:px-3.5 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] text-foreground shadow-sm hover:shadow-md hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer border border-[#C5A059]/30 hover:border-[#C5A059]/60 overflow-hidden backdrop-blur-md"
            >
              {/* Subtle luxury top ambient highlight & contained micro radial glow */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent pointer-events-none" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-16 bg-[#C5A059]/2 rounded-full blur-md pointer-events-none group-hover:bg-[#C5A059]/6 transition-all duration-500" />

              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 w-full">
                <div className="text-right shrink-0">
                  <span className="block text-[10.5px] sm:text-[14px] font-bold text-[#F8FAFC] group-hover:text-[#C5A059] transition-colors leading-tight whitespace-nowrap">خدمات التشطيبات</span>
                  <span className="action-subtitle block text-[8px] sm:text-[10.5px] text-[#C5A059] font-medium mt-0.5 whitespace-nowrap">تصميم وديكورات فاخرة</span>
                </div>
                <div className="action-icon-badge w-6 h-6 sm:w-7 sm:h-7 rounded-[6px] sm:rounded-[7px] flex items-center justify-center shrink-0 transition-all duration-300">
                  <Paintbrush className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
                </div>
              </div>
            </Link>

            <Link
              href="/consultation"
              className="action-btn-consultation group relative flex items-center justify-center rounded-[10px] py-2 px-1 sm:py-3 sm:px-3.5 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] text-foreground shadow-sm hover:shadow-md hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer border border-[#C5A059]/30 hover:border-[#C5A059]/60 overflow-hidden backdrop-blur-md"
            >
              {/* Subtle luxury top ambient highlight & contained micro radial glow */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent pointer-events-none" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-16 bg-[#C5A059]/2 rounded-full blur-md pointer-events-none group-hover:bg-[#C5A059]/6 transition-all duration-500" />

              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 w-full">
                <div className="text-right shrink-0">
                  <span className="block text-[10.5px] sm:text-[14px] font-bold text-[#F8FAFC] group-hover:text-[#C5A059] transition-colors leading-tight whitespace-nowrap">اطرح استفسارك</span>
                  <span className="action-subtitle block text-[8px] sm:text-[10.5px] text-[#C5A059] font-medium mt-0.5 whitespace-nowrap">استشارة عقارية فورية</span>
                </div>
                <div className="action-icon-badge w-6 h-6 sm:w-7 sm:h-7 rounded-[6px] sm:rounded-[7px] flex items-center justify-center shrink-0 transition-all duration-300">
                  <MessageSquareText className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── الصندوق العلوي: بانرات ذكية (top slot) — يختفي تلقائيًا لو فاضي ── */}
        {!isFiltering && <PublicBannerSlot slot="top" ads={[]} />}

        {/* ── الصندوق السفلي: إعلانات عادية + بانرات ذكية (bottom slot) — يختفي تلقائيًا لو فاضي ── */}
        {!isFiltering && (
          <PublicBannerSlot slot="bottom" ads={settings.ads ?? []} />
        )}

        {/* ── Search / Filter Widget ── */}
        <div className="container px-3 sm:px-6">
          <PropertyFilterPanel
            filters={filters}
            regions={regions}
            propertyTypes={propertyTypes}
            onChange={setFilters}
            onApply={applyFilters}
            onReset={clearFilters}
            resultCount={filterResults.length}
            showMatched={isFiltering}
          />
        </div>

        {/* ── Filter / Search Results ── */}
        {isFiltering && (
          <section className="py-10 md:py-12 bg-transparent relative z-10">
            <div className="container px-3 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
                <div>
                  <p className="text-accent text-xs font-medium tracking-widest mb-1 uppercase">
                    نتائج البحث
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    العقارات المطابقة
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filterResults.length} عقار
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="h-8 gap-1.5 rounded-xl border-accent/40 text-accent hover:bg-accent/10 text-sm"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4" />
                    مسح الفلاتر
                  </Button>
                </div>
              </div>
              {filterResults.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm">لا توجد عقارات مطابقة لبحثك.</p>
                </div>
              ) : (
                <div className={filters.viewMode === "list" ? "grid grid-cols-1 gap-3" : gridClass}>
                  {filterResults.map((p) => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      size={filters.cardSize}
                      layout={filters.viewMode}
                      emphasized
                      detailsScale="home"
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TikTok Section ── */}
        {!isFiltering && isTiktokSectionVisible && (
          <section className="py-4 md:py-5 bg-transparent relative z-10">
              <div className="container px-3 sm:px-6">
              <div className="max-w-3xl mx-auto">
                <div className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] p-3 sm:p-4">
                  {/* Top Ambient Highlight Line */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none z-10" />

                  <div className="relative flex flex-row items-center gap-3 sm:gap-4">
                    {/* ── عمود البروفايل (يمين في RTL) ── */}
                    <div className="flex flex-col items-center gap-2 shrink-0 border-l border-white/10 pl-3 sm:pl-4">
                      {/* صورة الحساب */}
                      <div className="relative">
                        <a
                          href={settings.tiktok || "#"}
                          {...(settings.tiktok
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="block w-16 h-16 sm:w-20 sm:h-20 rounded-[10px] overflow-hidden border-2 border-[#C5A059]/50 shadow-md bg-muted hover:scale-105 transition-transform duration-300"
                          aria-label="حساب تيك توك"
                        >
                          {settings.tiktokAvatar ? (
                            <img
                              src={settings.tiktokAvatar}
                              alt={settings.tiktokName || "تيك توك"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center bg-[#C5A059]/10 text-[#C5A059]">
                              <TikTokIcon className="h-5 w-5" />
                            </span>
                          )}
                        </a>
                        {/* شارة تيك توك */}
                        <span className="absolute -bottom-1 -left-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-black text-white shadow border border-[#C5A059]/40">
                          <TikTokIcon className="h-2 w-2" />
                        </span>
                      </div>

                      {/* اسم الحساب — سطر واحد دائماً */}
                      <a
                        href={settings.tiktok || "#"}
                        {...(settings.tiktok
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="text-center hover:text-[#C5A059] transition-colors"
                      >
                        <p className="text-[10px] sm:text-[11px] font-bold text-foreground leading-snug whitespace-nowrap text-center">
                          {settings.tiktokName || "العمودي للتسويق العقاري"}
                        </p>
                      </a>

                      {/* زر المتابعة */}
                      <a
                        href={settings.tiktok || "#"}
                        {...(settings.tiktok
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="w-full inline-flex items-center justify-center gap-1 rounded-[7px] bg-[#C5A059] text-[#10202D] hover:bg-[#B38E46] transition-colors text-[11px] font-bold h-7 px-2 shadow-sm"
                      >
                        <TikTokIcon className="h-2.5 w-2.5 shrink-0" />
                        <span>متابعة</span>
                      </a>
                    </div>

                    {/* ── الفيديوهات (يسار في RTL) ── */}
                    <div className="flex-1 min-w-0">
                      {tiktokVideos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 gap-2 h-full min-h-[120px]">
                          <Play className="h-5 w-5 text-accent/40" />
                          <p className="text-xs text-muted-foreground">
                            لا توجد فيديوهات حالياً
                          </p>
                          <a
                            href={settings.tiktok || "#"}
                            {...(settings.tiktok
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                          >
                            زيارة الحساب <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ) : (
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                          {tiktokVideos.map((video) => (
                            <TiktokCard
                              key={video.id}
                              video={video}
                              onPlay={() => setActiveVideo(video)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TikTok player modal */}
        {isTiktokSectionVisible && (
          <Dialog
            open={!!activeVideo}
            onOpenChange={(o) => {
              if (!o) setActiveVideo(null);
            }}
          >
            <DialogContent className="max-w-[360px] p-0 overflow-hidden gap-0">
              <DialogTitle className="sr-only">
                {activeVideo?.title || "فيديو تيك توك"}
              </DialogTitle>
              {activeVideo && (
                <TiktokPlayer key={activeVideo.id} video={activeVideo} />
              )}
            </DialogContent>
          </Dialog>
        )}

        {!isFiltering && (
          <>
            {/* ── Featured Properties — VIP Carousel ── */}
            <section className="py-10 md:py-14 bg-transparent border-b border-border/30 relative z-10">
              <div className="container px-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-0.5 relative inline-block">
                      عقارات مميزة
                      <div className="absolute -bottom-2 right-0 w-12 h-0.5 bg-accent rounded-full" />
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      فرص استثمارية وسكنية مميزة تم انتقاؤها بعناية
                    </p>
                  </div>
                </div>
                {featuredProps.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">لا توجد عقارات مميزة حالياً.</p>
                  </div>
                ) : (
                  <PropertyCarousel
                    properties={featuredProps}
                    size={filters.cardSize}
                    layout={filters.viewMode}
                    emphasized
                    detailsScale="home"
                    glass
                    autoPlay
                    autoPlayDelay={(settings.carouselAutoPlayDelay ?? 4) * 1000}
                    motionSpeed={settings.carouselMotionSpeed}
                    infinite
                  />
                )}
              </div>
            </section>

            {/* ── Latest Properties — Carousel ── */}
            <section className="py-12 md:py-14 bg-transparent relative z-10">
              <div className="container px-6">
                <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      أحدث العقارات
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      تصفح أحدث ما أضيف لمجموعتنا العقارية
                    </p>
                  </div>
                </div>
                {latestProps.length === 0 ? (
                  <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-[82vw] sm:w-[46vw] md:w-[268px] lg:w-[280px]"
                      >
                        <PropertyCard isLoading size={filters.cardSize} emphasized />
                      </div>
                    ))}
                  </div>
                ) : (
                  <PropertyCarousel
                    properties={latestProps}
                    size={filters.cardSize}
                    layout={filters.viewMode}
                    emphasized
                     detailsScale="home"
                    autoPlay
                    autoPlayDelay={(settings.carouselAutoPlayDelay ?? 3.5) * 1000}
                    motionSpeed={settings.carouselMotionSpeed}
                    infinite
                  />
                )}
              </div>
            </section>

            {/* ── Explore All Properties — grouped by region ── */}
            {propertiesByRegion.length > 0 && (
              <section className="py-12 md:py-14 bg-transparent relative z-10">
                <div className="container px-6">
                  <div className="mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground relative inline-block">
                      استكشف جميع العقارات
                      <div className="absolute -bottom-2 right-0 w-12 h-0.5 bg-accent rounded-full" />
                    </h2>
                    <p className="text-sm text-muted-foreground mt-4">
                      تصفح عقاراتنا مرتبةً حسب المدينة والمنطقة
                    </p>
                  </div>

                  <div className="space-y-12">
                    {propertiesByRegion.map(({ id, name, items }) => (
                      <div key={id}>
                        <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-3 mb-5">
                          <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2.5">
                            <h3 className="min-w-0 truncate text-lg font-bold text-foreground">
                              {name}
                            </h3>
                            <span className="shrink-0 text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-sm">
                              {items.length} عقار
                            </span>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1 border-accent/30 text-accent hover:bg-accent/10 rounded-md whitespace-nowrap text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                          >
                            <Link href={`/region/${id}`}>
                              عرض عقارات {name}
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                        <PropertyCarousel
                          properties={items.slice(0, 8)}
                           size={filters.cardSize}
                           layout={filters.viewMode}
                           emphasized
                           detailsScale="home"
                          autoPlay
                          autoPlayDelay={(settings.carouselAutoPlayDelay ?? 3.5) * 1000}
                          motionSpeed={settings.carouselMotionSpeed}
                          infinite
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Finishing Services Preview ── */}
            <section className="py-12 md:py-14 bg-transparent relative z-10">
              <div className="container px-6">
                <div className="text-center mb-5">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    خدمات التشطيبات
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    نقدم خدمات تشطيب متكاملة لجميع أنواع الوحدات بأعلى مستوى من
                    الجودة وأفضل الأسعار
                  </p>
                </div>
                <div className="text-center">
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-md px-8 gap-2 border-accent/40 text-accent hover:bg-accent/10"
                  >
                    <Link href="/finishing-services">
                      <Building2 className="h-4 w-4" />
                      استعرض خدمات التشطيبات
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Add Property CTA ── */}
            <section className="py-12 md:py-14 bg-transparent relative z-10">
              <div className="container px-6">
                <div className="relative overflow-hidden max-w-2xl mx-auto text-center rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] p-6 sm:p-8">
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                  <div className="w-14 h-14 bg-[#C5A059]/15 border border-[#C5A059]/30 rounded-[10px] flex items-center justify-center text-[#C5A059] mx-auto mb-4 backdrop-blur-md">
                    <UserCheck className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                    هل تمتلك عقاراً للبيع أو الإيجار؟
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md mx-auto">
                    أعرض عقارك لدينا واحصل على أفضل عرض سعر. نتواصل معك في أقرب
                    وقت.
                  </p>
                  <div className="flex flex-nowrap justify-center gap-2 sm:gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="h-9 sm:h-11 px-4 sm:px-8 rounded-[10px] font-bold text-xs sm:text-sm bg-[#C5A059] text-[#10202D] hover:bg-[#B38E46] gap-1.5 sm:gap-2 shrink-0 shadow-md border-0 transition-all cursor-pointer"
                    >
                      <Link href="/add-property">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        أعرض عقارك الآن
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-9 sm:h-11 px-4 sm:px-8 rounded-[10px] text-xs sm:text-sm border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-muted-foreground hover:text-foreground backdrop-blur-md shrink-0 cursor-pointer transition-all"
                    >
                      <Link href="/consultation">اطرح استفسارك</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Home QR Codes Showcase ── */}
            <HomeQrSection />
          </>
        )}
      </main>
        <Footer />
      </div>
    </div>
  );
}
