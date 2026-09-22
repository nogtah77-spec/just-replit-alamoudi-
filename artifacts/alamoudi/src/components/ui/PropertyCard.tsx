import { Card, CardContent, CardFooter } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Heart, Scale, Bed, Bath, Square, Share2, Phone, Copy, Camera, Play, Video, ExternalLink, MapPin, Star } from "lucide-react";
import { WhatsAppIcon, TikTokIcon } from "../icons/BrandIcons";
import { Skeleton } from "./skeleton";
import type { Property } from "@/context/DataContext";
import { useData } from "@/context/DataContext";
import { getTiktokUrl, getTiktokName } from "@/lib/socials";
import { normalizePhoneForWa } from "@/lib/phone";
import { useUserPrefs } from "@/context/UserPrefsContext";
import { useToast } from "@/hooks/use-toast";
import { cn, formatNumber } from "@/lib/utils";
import { getVideoThumbnailUrl, hasVideo } from "@/lib/videoThumbnail";
import { getCardImageUrl } from "@/lib/cloudinaryService";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export type CardSize = "large" | "medium" | "compact";

interface PropertyCardProps {
  isLoading?: boolean;
  property?: Property & { typeName?: string; regionName?: string };
  size?: CardSize;
  layout?: "grid" | "list";
  emphasized?: boolean;
  detailsScale?: "home" | "city";
  glass?: boolean;
}

const categoryLabels: Record<string, string> = {
  residential: "سكني",
  administrative: "إداري",
  medical: "طبي",
  commercial: "تجاري",
  sale: "للبيع",
  rent: "للإيجار",
  furnished: "مفروش",
};

const listingTypeLabels: Record<string, string> = {
  sale: "للبيع",
  rent: "للإيجار",
  furnished: "مفروش",
};

export function PropertyCard({
  isLoading = false,
  property,
  size = "large",
  layout = "grid",
  emphasized = false,
  detailsScale = "home",
  glass = true,
}: PropertyCardProps) {
  const { settings } = useData();
  const { compare, toggleFavorite, isFavorite, toggleCompare, isInCompare } = useUserPrefs();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [thumbFailed, setThumbFailed] = useState(false);
  const compactHomeCard = size === "compact" && layout === "list" && detailsScale === "home";
  const compactCityCard = size === "compact" && layout === "list" && detailsScale === "city";

  useEffect(() => { setThumbFailed(false); }, [property?.id]);

  if (isLoading || !property) {
    if (size === "compact" && layout === "list") {
      return (
        <Card className={cn(
          "flex flex-row h-[180px] overflow-hidden rounded-[10px]",
          glass
            ? "border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
            : "border-border/60 shadow-sm"
        )}>
          <Skeleton className="w-36 h-full rounded-none flex-shrink-0 bg-white/5" />
          <div className="flex-1 p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-white/5" />
            <Skeleton className="h-5 w-1/2 bg-white/5" />
            <Skeleton className="h-3 w-full bg-white/5" />
          </div>
        </Card>
      );
    }
    return (
      <Card className={cn(
        "overflow-hidden flex flex-col h-full rounded-[10px]",
        glass
          ? "border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
          : "border-border/60 shadow-sm"
      )}>
        <Skeleton className="w-full aspect-[16/10] rounded-none flex-shrink-0 bg-white/5" />
        <CardContent className="p-4 flex-1 space-y-3">
          <Skeleton className="h-4 w-3/4 bg-white/5" />
          <Skeleton className="h-6 w-1/2 bg-white/5" />
          <Skeleton className="h-3 w-full bg-white/5" />
        </CardContent>
        <CardFooter className="p-4 pt-0 flex gap-2">
          <Skeleton className="h-8 flex-1 bg-white/5" />
          <Skeleton className="h-8 w-8 bg-white/5" />
        </CardFooter>
      </Card>
    );
  }

  const heroImg = property.images?.[0];
  const propHasVideo = hasVideo(property.videoUrl);
  const videoFirst = property.coverPriority === "video" && propHasVideo;
  const videoThumb = (videoFirst || !heroImg) ? getVideoThumbnailUrl(property.videoUrl) : null;
  const showVideoCover = videoFirst
    ? !!videoThumb && !thumbFailed
    : !heroImg && !!videoThumb && !thumbFailed;
  const showVideoPoster = videoFirst
    ? (!videoThumb || thumbFailed)
    : !heroImg && propHasVideo && (!videoThumb || thumbFailed);
  const coverImg = videoFirst ? null : (heroImg ? getCardImageUrl(heroImg) : null);
  const imageCount = property.images?.length || 0;
  const isNew = () => {
    try {
      const created = property.createdAt || (property as any).created_at;
      if (!created) return false;
      const time = new Date(created).getTime();
      return time > 0 && Date.now() - time <= 7 * 86400000;
    } catch {
      return false;
    }
  };
  const goToDetails = () => navigate(`/properties/${property.id}`);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const propKey = (/^[A-Za-z0-9_-]+$/.test(property.code || "")) ? property.code : property.id;
    const url = `${window.location.origin}/properties/${propKey}`;
    if (navigator.share) { try { await navigator.share({ title: property.title || property.code, url }); return; } catch {} }
    await navigator.clipboard.writeText(url);
    toast({ title: "تم نسخ رابط العقار" });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasFav = isFavorite(property.id);
    toggleFavorite(property.id);
    toast({ title: wasFav ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة" });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInCompare(property.id) && compare.length >= 3) {
      toast({ title: "الحد الأقصى 3 عقارات للمقارنة", variant: "destructive" });
      return;
    }
    const wasIn = isInCompare(property.id);
    toggleCompare(property.id);
    toast({ title: wasIn ? "تمت الإزالة من المقارنة" : "تمت الإضافة للمقارنة" });
  };

  // ── 1. COMPACT HORIZONTAL CARD (Carousel & Compact City/Home rows) ──
  if (size === "compact" && layout === "list") {
    return (
      <Card
        dir="rtl"
        onClick={goToDetails}
        className={cn(
          "relative flex flex-row overflow-hidden group cursor-pointer rounded-[10px] transition-all duration-300 border",
          glass
            ? "border-[#C5A059]/40 hover:border-[#C5A059]/80 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl hover:-translate-y-0.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:shadow-[0_18px_48px_rgba(0,0,0,0.6)]"
            : cn(
                "bg-card/95 backdrop-blur hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(16,32,45,0.08)] hover:shadow-[0_12px_28px_rgba(16,32,45,0.14)]",
                property.featured
                  ? "border-accent/50 hover:border-accent"
                  : "border-border/70 hover:border-accent/50"
              ),
          emphasized
            ? "h-[185px] sm:h-[195px]"
            : "h-[175px] sm:h-[185px]"
        )}
      >
        {glass && (
          <>
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none z-30" />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#C5A059]/4 rounded-full blur-lg pointer-events-none group-hover:bg-[#C5A059]/8 transition-all duration-500 z-30" />
          </>
        )}
        {/* Right Side: Image Box (Locked size & aspect with absolute image) */}
        <div className={cn("relative self-stretch shrink-0 overflow-hidden bg-muted/80", emphasized ? "w-36 sm:w-44" : "w-32 sm:w-40")}>
          {showVideoCover ? (
            <img
              src={videoThumb!}
              alt={property.title}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              sizes="160px"
              onError={() => setThumbFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          ) : coverImg ? (
            <img
              src={coverImg}
              alt={property.title}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              sizes="160px"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          ) : showVideoPoster ? (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent/20 via-muted to-muted/40 flex items-center justify-center">
              <Video className="h-8 w-8 text-accent/50" />
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Subtle Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-[5]" />

          {/* Top Left Listing Type & Status Badges */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-accent/40 text-white backdrop-blur-md border border-white/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {listingTypeLabels[property.listingType || ""] || categoryLabels[property.category] || "للبيع"}
            </span>
            {isNew() && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black text-white bg-black/55 backdrop-blur-md border border-white/35 shadow-[0_3px_10px_rgba(0,0,0,0.35)] tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                جديد
              </span>
            )}
            {property.status === "rented" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/80 text-white shadow-xs border border-amber-400/30 backdrop-blur-md">
                مؤجر
              </span>
            )}
            {property.status === "sold" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-600/80 text-white shadow-xs border border-red-500/30 backdrop-blur-md">
                مباع
              </span>
            )}
            {property.status === "reserved" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-yellow-500/80 text-slate-950 shadow-xs border border-yellow-400/30 backdrop-blur-md">
                محجوز
              </span>
            )}
          </div>

          {/* Bottom Indicators inside Image */}
          <div className="absolute bottom-2 inset-x-2 z-20 flex flex-wrap items-center justify-between gap-1 text-[9px]">
            {property.typeName ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black text-white bg-black/55 backdrop-blur-md border border-white/35 shadow-[0_2px_8px_rgba(0,0,0,0.35)] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {property.typeName}
              </span>
            ) : <span />}

            <div className="flex items-center gap-1">
              {propHasVideo && (
                <span className="flex items-center gap-0.5 rounded bg-black/65 px-1.5 py-0.5 text-white backdrop-blur-sm">
                  <Play className="h-2 w-2 fill-white" />
                </span>
              )}
              {property.featured && (
                <span className="inline-flex items-center gap-0.5 rounded bg-[#A9927D] text-[#10202D] font-bold px-1.5 py-0.5 shadow-xs border border-[#10202D]/10">
                  <Star className="h-2 w-2 fill-[#10202D] text-[#10202D]" />
                  مميز
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Left Side: Content & Details (Redesigned with Luxury Layout) */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-3.5">
          {/* Top Row: Code & Quick Actions */}
          <div>
            <div className="flex items-center justify-between gap-2">
              {/* Property Code Pill */}
              <div dir="ltr" className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md shadow-xs",
                glass ? "border border-[#C5A059]/40 bg-[#C5A059]/15 text-[#C5A059]" : "border border-accent/40 bg-accent/10 text-accent"
              )}>
                <span className="text-[9px] font-black tracking-wider uppercase">CODE</span>
                <span className="text-xs font-mono font-black">{property.code}</span>
              </div>

              {/* Quick Action Buttons (Favorite / Share) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFavorite}
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center transition-colors border",
                    isFavorite(property.id)
                      ? "bg-red-500/15 border-red-500/30 text-red-500"
                      : "bg-muted/50 border-border/60 text-muted-foreground hover:text-accent hover:border-accent/40"
                  )}
                  title="المفضلة"
                >
                  <Heart className={cn("h-3 w-3", isFavorite(property.id) && "fill-current")} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-6 h-6 rounded-md flex items-center justify-center bg-muted/50 border border-border/60 text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
                  title="مشاركة"
                >
                  <Share2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Location & Title */}
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-bold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                <MapPin className="h-3 w-3 shrink-0 text-accent" />
                <span className="truncate">{[property.regionName, property.subArea].filter(Boolean).join(" - ") || property.title || "موقع العقار"}</span>
              </p>
              
              {property.finishing && (
                <div className="pt-0.5">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold",
                    glass ? "bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30" : "bg-accent/10 text-accent border border-accent/20"
                  )}>
                    {property.finishing}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Price & Specifications (Modern Golden Layout) */}
          <div className={cn("mt-3 pt-2 space-y-2", glass ? "border-t border-white/10" : "border-t border-border/60")}>
            {/* Price Display */}
            <div dir="ltr" className="flex items-baseline justify-start gap-1.5">
              <span className={cn("text-base sm:text-lg font-black tracking-tight", glass ? "text-[#C5A059]" : "text-accent")}>
                {formatNumber(property.price)}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider">EGP</span>
            </div>

            {/* Specs Row: Beds, Baths, Area (Clean Golden Line) */}
            <div dir="rtl" className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
              {property.beds > 0 ? (
                <div className={cn(
                  "flex items-center justify-center gap-1 py-1 rounded text-foreground/90",
                  glass ? "bg-[#0F1317]/65 border border-white/10 backdrop-blur-md" : "bg-muted/40 border border-border/40"
                )}>
                  <Bed className={cn("h-3 w-3 shrink-0", glass ? "text-[#C5A059]" : "text-accent")} />
                  <span>{property.beds} <span className="text-[9px] text-muted-foreground font-normal">غرف</span></span>
                </div>
              ) : <div />}

              {property.baths > 0 ? (
                <div className={cn(
                  "flex items-center justify-center gap-1 py-1 rounded text-foreground/90",
                  glass ? "bg-[#0F1317]/65 border border-white/10 backdrop-blur-md" : "bg-muted/40 border border-border/40"
                )}>
                  <Bath className={cn("h-3 w-3 shrink-0", glass ? "text-[#C5A059]" : "text-accent")} />
                  <span>{property.baths} <span className="text-[9px] text-muted-foreground font-normal">حمام</span></span>
                </div>
              ) : <div />}

              <div dir="ltr" className={cn(
                "flex items-center justify-center gap-1 py-1 rounded text-foreground/90",
                glass ? "bg-[#0F1317]/65 border border-white/10 backdrop-blur-md" : "bg-muted/40 border border-border/40"
              )}>
                <span className="text-[9px] text-muted-foreground font-normal">م²</span>
                <span>{property.area}</span>
                <Square className={cn("h-3 w-3 shrink-0", glass ? "text-[#C5A059]" : "text-accent")} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── 2. STANDARD GRID CARD (Grid Layout on Home & Catalog) ──
  return (
    <Card
      dir="rtl"
      onClick={goToDetails}
      className={cn(
        "relative overflow-hidden group cursor-pointer flex flex-col h-full rounded-[10px] transition-all duration-300 border",
        glass
          ? "border-[#C5A059]/40 hover:border-[#C5A059]/80 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl hover:-translate-y-1 shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:shadow-[0_18px_48px_rgba(0,0,0,0.6)]"
          : cn(
              "bg-card/95 backdrop-blur hover:-translate-y-1 shadow-[0_8px_24px_rgba(16,32,45,0.08)] hover:shadow-[0_16px_36px_rgba(16,32,45,0.14)]",
              property.featured
                ? "border-accent/50 hover:border-accent"
                : "border-border/70 hover:border-accent/60"
            ),
        emphasized && !glass && "shadow-[0_14px_36px_rgba(16,32,45,0.16)]"
      )}
    >
      {glass && (
        <>
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none z-30" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-16 bg-[#C5A059]/4 rounded-full blur-lg pointer-events-none group-hover:bg-[#C5A059]/8 transition-all duration-500 z-30" />
        </>
      )}
      {/* Card Header Media Container (Locked 16:10 Aspect Ratio with Absolute Image Fill) */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted flex-shrink-0">
        {showVideoCover ? (
          <img
            src={videoThumb!}
            alt={property.title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="(max-width: 640px) 90vw, 400px"
            onError={() => setThumbFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : coverImg ? (
          <img
            src={coverImg}
            alt={property.title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="(max-width: 640px) 90vw, 400px"
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : showVideoPoster ? (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent/20 via-muted to-muted/40 flex items-center justify-center">
            <Video className="h-10 w-10 text-accent/50" />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
            <Camera className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Subtle Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 z-[5]" />

        {/* Top Badges & Actions inside Image */}
        <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
          {/* Listing Type, Status & Featured Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black bg-accent/40 text-white backdrop-blur-md border border-white/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {listingTypeLabels[property.listingType || ""] || categoryLabels[property.category] || "للبيع"}
            </span>
            {isNew() && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-black text-white bg-black/55 backdrop-blur-md border border-white/35 shadow-[0_3px_10px_rgba(0,0,0,0.35)] tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                جديد
              </span>
            )}
            {property.status === "rented" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/80 text-white font-black text-xs shadow-md border border-amber-400/30 backdrop-blur-md">
                مؤجر
              </span>
            )}
            {property.status === "sold" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600/80 text-white font-black text-xs shadow-md border border-red-500/30 backdrop-blur-md">
                مباع
              </span>
            )}
            {property.status === "reserved" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-yellow-500/80 text-slate-950 font-black text-xs shadow-md border border-yellow-400/30 backdrop-blur-md">
                محجوز
              </span>
            )}
            {property.featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#A9927D]/85 text-[#10202D] font-black text-[11px] shadow-md border border-white/20 backdrop-blur-md">
                <Star className="h-3 w-3 fill-[#10202D] text-[#10202D]" />
                مميز VIP
              </span>
            )}
          </div>

          {/* Favorite & Share Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFavorite}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-md transition-colors border",
                isFavorite(property.id)
                  ? "bg-red-500/20 border-red-500/40 text-red-500"
                  : "bg-black/40 border-white/15 text-white/90 hover:text-accent hover:border-accent"
              )}
              title="المفضلة"
            >
              <Heart className={cn("h-3.5 w-3.5", isFavorite(property.id) && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/15 text-white/90 hover:text-accent hover:border-accent backdrop-blur-md transition-colors"
              title="مشاركة"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Badges inside Image */}
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2 text-xs">
          {/* Type Badge & Location */}
          <div className="flex items-center gap-1.5">
            {property.typeName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-black/55 backdrop-blur-md text-white font-black border border-white/35 shadow-[0_2px_8px_rgba(0,0,0,0.35)] text-[10.5px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {property.typeName}
              </span>
            )}
            {property.regionName && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md text-white/90 text-[11px]">
                <MapPin className="h-3 w-3 text-accent" />
                {property.regionName}
              </span>
            )}
          </div>

          {/* Media Indicators (Video/Photos) */}
          <div className="flex items-center gap-1">
            {propHasVideo && (
              <span className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] text-white">
                <Play className="h-2.5 w-2.5 fill-white" /> فيديو
              </span>
            )}
            {imageCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-md px-2 py-1 text-[10px] text-white/90">
                <Camera className="h-2.5 w-2.5" /> {imageCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Content & Details */}
      <CardContent className="flex-1 flex flex-col justify-between p-4 sm:p-5">
        <div>
          {/* Code & Finishing Row */}
          <div className="flex items-center justify-between gap-2">
            <div dir="ltr" className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md shadow-xs",
              glass ? "border border-[#C5A059]/40 bg-[#C5A059]/15 text-[#C5A059]" : "border border-accent/40 bg-accent/10 text-accent"
            )}>
              <span className="text-[10px] font-black tracking-wider uppercase">CODE</span>
              <span className="text-xs sm:text-sm font-mono font-black">{property.code}</span>
            </div>

            {property.finishing && (
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold",
                glass ? "bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30" : "bg-accent/10 text-accent border border-accent/20"
              )}>
                {property.finishing}
              </span>
            )}
          </div>

          {/* Title & SubArea */}
          <div className="mt-3">
            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-accent transition-colors line-clamp-1">
              {[property.regionName, property.subArea].filter(Boolean).join(" - ") || property.title}
            </h3>
            {property.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
                {property.description}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Section: Price & Specs */}
        <div className={cn("mt-4 pt-3 space-y-2.5", glass ? "border-t border-white/10" : "border-t border-border/60")}>
          {/* Price */}
          <div dir="ltr" className="flex items-baseline justify-start gap-1.5">
            <span className={cn("text-lg sm:text-xl font-black tracking-tight", glass ? "text-[#C5A059]" : "text-accent")}>
              {formatNumber(property.price)}
            </span>
            <span className="text-xs font-bold text-muted-foreground tracking-wider">EGP</span>
          </div>

          {/* Specs Grid */}
          <div dir="rtl" className="grid grid-cols-3 gap-2 text-xs font-bold">
            {property.beds > 0 ? (
              <div className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-foreground/90",
                glass ? "bg-[#0F1317]/65 border border-white/10 backdrop-blur-md" : "bg-muted/40 border border-border/40"
              )}>
                <Bed className={cn("h-3.5 w-3.5 shrink-0", glass ? "text-[#C5A059]" : "text-accent")} />
                <span>{property.beds} <span className="text-[10px] text-muted-foreground font-normal">غرف</span></span>
              </div>
            ) : <div />}

            {property.baths > 0 ? (
              <div className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-foreground/90",
                glass ? "bg-[#0F1317]/65 border border-white/10 backdrop-blur-md" : "bg-muted/40 border border-border/40"
              )}>
                <Bath className={cn("h-3.5 w-3.5 shrink-0", glass ? "text-[#C5A059]" : "text-accent")} />
                <span>{property.baths} <span className="text-[10px] text-muted-foreground font-normal">حمام</span></span>
              </div>
            ) : <div />}

            <div dir="ltr" className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-foreground/90",
              glass ? "bg-[#0F1317]/65 border border-white/10 backdrop-blur-md" : "bg-muted/40 border border-border/40"
            )}>
              <span className="text-[10px] text-muted-foreground font-normal">م²</span>
              <span>{property.area}</span>
              <Square className={cn("h-3.5 w-3.5 shrink-0", glass ? "text-[#C5A059]" : "text-accent")} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
