import { useState, useMemo, useCallback, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { updatePageMeta } from "@/lib/meta";
import { getDetailImageUrl } from "@/lib/cloudinaryService";

function clampPercent(value: number | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

function hexToRgba(hex: string | undefined, opacity: number): string {
  const normalized = (hex ?? "").trim().replace(/^#/, "");
  const match = normalized.match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const safeHex = match?.[1] ?? "000000";
  const fullHex = safeHex.length === 3
    ? safeHex.split("").map((part) => part + part).join("")
    : safeHex;
  const red = parseInt(fullHex.slice(0, 2), 16);
  const green = parseInt(fullHex.slice(2, 4), 16);
  const blue = parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(100, Math.max(0, opacity)) / 100})`;
}
import { PropertyFilterPanel } from "@/components/ui/PropertyFilterPanel";
import { StickyQuickSearch } from "@/components/ui/StickyQuickSearch";
import {
  DEFAULT_PROPERTY_FILTERS,
  filterProperties,
  hasActivePropertyFilters,
  PROPERTY_CARD_SIZE_KEY,
  type PropertyFilterState,
} from "@/lib/propertyFilters";

export default function RegionPage({ params }: { params: { regionId: string } }) {
  const { regionId } = params;
  const { properties, regions, propertyTypes, settings } = useData();

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const region = regions.find(r => r.id === regionId);

  useEffect(() => {
    if (region) {
      updatePageMeta({
        title: `عقارات ${region.name} | العمودي للتسويق العقاري`,
        description: `تصفح أفضل العقارات والوحدات المتاحة للبيع والإيجار في ${region.name} من شركة العمودي للتسويق العقاري.`,
        image: region.heroImage,
      });
    }
  }, [region]);

  const getInitialCardSize = () => {
    try {
      const stored = localStorage.getItem(PROPERTY_CARD_SIZE_KEY);
      return stored === "medium" ? "medium" as const : "compact" as const;
    } catch {
      return "compact" as const;
    }
  };

  const [filters, setFilters] = useState<PropertyFilterState>({
    ...DEFAULT_PROPERTY_FILTERS,
    regionId,
    viewMode: getInitialCardSize() === "medium" ? "grid" : "list",
    cardSize: getInitialCardSize(),
  });
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilterState>({
    ...DEFAULT_PROPERTY_FILTERS,
    regionId,
    viewMode: getInitialCardSize() === "medium" ? "grid" : "list",
    cardSize: getInitialCardSize(),
  });
  useEffect(() => {
    try {
      localStorage.setItem(PROPERTY_CARD_SIZE_KEY, filters.cardSize);
    } catch {}
  }, [filters.cardSize]);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const resolve = useCallback((p: any) => ({
    ...p,
    typeName:   propertyTypes.find(t => t.id === p.typeId)?.name,
    regionName: region?.name,
  }), [propertyTypes, region]);

  const filtered = useMemo(() => {
    return filterProperties(properties, appliedFilters, regions, propertyTypes).map(resolve);
  }, [properties, appliedFilters, regions, propertyTypes, resolve]);

  const listGridClass = "grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4";
  const cardGridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4";
  const applyFilters = (next: PropertyFilterState) => {
    const fixed = { ...next, regionId };
    setFilters(fixed);
    setAppliedFilters(fixed);
  };
  const resetFilters = () => {
    const reset = { ...DEFAULT_PROPERTY_FILTERS, regionId, viewMode: filters.viewMode, cardSize: filters.cardSize };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  const overlayColor = settings.regionHeroOverlayColor || "#000000";
  const overlayOpacity = clampPercent(settings.regionHeroOverlayOpacity, 25);
  const gradientOpacity = clampPercent(settings.regionHeroGradientOpacity, 60);

  /* ── Not found ── */
  if (!region) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-2">لم يتم العثور على المنطقة</p>
            <Button asChild variant="outline" className="gap-2 rounded-md">
              <Link href="/">
                <ChevronRight className="h-4 w-4" />
                العودة للرئيسية
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Floating Sticky Quick Search on Scroll */}
      <StickyQuickSearch
        filters={filters}
        regions={regions}
        propertyTypes={propertyTypes}
        visible={scrollY > 160}
        isFiltering={hasActivePropertyFilters({ ...appliedFilters, regionId: "" })}
        resultCount={filtered.length}
        onChange={(next) => setFilters({ ...next, regionId })}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      <main className="flex-1">
        <section className="relative isolate h-[clamp(180px,22vw,280px)] w-full overflow-hidden bg-muted shadow-xs">
          {region.heroImage && !heroImageFailed ? (
            <img
              src={getDetailImageUrl(region.heroImage)}
              alt={region.name}
              className="absolute inset-0 h-full w-full object-cover object-center"
              onError={() => setHeroImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: hexToRgba(overlayColor, Math.min(overlayOpacity, 15)) }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${hexToRgba(overlayColor, Math.min(gradientOpacity, 35))} 0%, transparent 100%)`,
            }}
          />
        </section>

        <section className="py-3 sm:py-4 md:py-5">
          <div className="container px-3 sm:px-6">

            <div className="mb-5 sm:mb-7">
              {/* عنوان النتائج وبطاقة التنقل */}
              <div className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.45)] sm:px-6 sm:py-5">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                  <div>
                    {/* رابط التنقل السريع للرئيسية */}
                    <nav aria-label="التنقل" className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-[#C5A059] hover:text-[#C5A059]/80 transition-colors"
                      >
                        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                        <span>الرئيسية</span>
                      </Link>
                      <span className="text-white/20">/</span>
                      <span className="text-foreground">{region.name}</span>
                    </nav>

                    <h1 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">
                      عقارات {region.name}
                    </h1>
                    <div className="mt-2 h-0.5 w-12 rounded-full bg-[#C5A059]" />
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground hidden md:block">
                      استخدم الفلاتر للوصول إلى العقار المناسب
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8.5 rounded-[10px] text-xs gap-1.5 border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-[#C5A059] hover:text-[#C5A059] backdrop-blur-md cursor-pointer transition-all"
                    >
                      <Link href="/">
                        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                        <span>العودة للرئيسية</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-7 sm:mb-9">
              <PropertyFilterPanel
                filters={filters}
                regions={regions}
                propertyTypes={propertyTypes}
                fixedRegionId={regionId}
                cityName={region.name}
                resultCount={filtered.length}
                showMatched={hasActivePropertyFilters({ ...appliedFilters, regionId: "" })}
                onChange={(next) => setFilters({ ...next, regionId })}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            </div>

            {/* ── Results ── */}
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-sm">لا توجد عقارات تطابق التصفية المحددة في {region.name}.</p>
                <button
                  onClick={resetFilters}
                  className="mt-4 text-accent text-sm hover:underline"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              <div className={filters.viewMode === "list" ? listGridClass : cardGridClass}>
                {filtered.map(p => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    size={filters.cardSize}
                    layout={filters.viewMode}
                    emphasized
                    detailsScale="city"
                  />
                ))}
              </div>
            )}

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
