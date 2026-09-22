import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyGallery } from "@/components/ui/PropertyGallery";
import { ZoomableLightbox } from "@/components/ui/ZoomableLightbox";
import {
  Bed, Bath, Square, MapPin, Share2, Heart, Scale, Phone, Play,
  Copy, Video, ExternalLink, ChevronRight, ChevronLeft, X, Building2, Layers, Pencil,
  Mail, Link as LinkIcon, FileText, Camera
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { normalizePhoneForWa } from "@/lib/phone";
import { getVideoThumbnailUrl, hasVideo } from "@/lib/videoThumbnail";
import { VideoPlayerModal } from "@/components/ui/VideoPlayerModal";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { checkUserPermission } from "@/lib/permissions";
import { useData, type Property } from "@/context/DataContext";
import { formatNumber } from "@/lib/utils";
import { useUserPrefs } from "@/context/UserPrefsContext";
import { useToast } from "@/hooks/use-toast";
import { cn, suppressGhostClicks } from "@/lib/utils";
import { downloadImage, downloadImagesAsZip } from "@/lib/imageDownloads";
import { PropertyBrochureModal } from "@/components/property/PropertyBrochureModal";
import { PropertyShareModal } from "@/components/property/PropertyShareModal";
import { updatePageMeta } from "@/lib/meta";
import { supabaseService, rowToProperty, parsePropertyImages } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabaseClient";
import { getDetailImageUrl, getCardImageUrl } from "@/lib/cloudinaryService";

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

const finishingLabels: Record<string, string> = {
  "super-lux": "سوبر لوكس", "lux": "لوكس", "semi-finished": "نص تشطيب",
  "ultra": "ألترا سوبر لوكس", "finished": "متشطب", "red-brick": "طوب أحمر",
  "under-construction": "تحت الإنشاء", "core-shell": "تحت الإنشاء",
};

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { properties, propertyTypes, regions, settings, trackPropertyView, ready, users } = useData();
  const { isStaff, currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canViewBrochure = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-بروشور العقار PDF");
  const { toggleFavorite, isFavorite, toggleCompare, isInCompare } = useUserPrefs();
  const { toast } = useToast();

  const cleanId = useMemo(() => {
    if (!id) return "";
    try {
      let val = decodeURIComponent(id);
      // Strip any query strings (?...) or hashes (#...)
      val = val.split("?")[0].split("#")[0];
      // Strip trailing slashes, dots, commas, parentheses
      val = val.replace(/[\/.,);]+$/, "").trim();
      return val;
    } catch {
      let val = String(id).split("?")[0].split("#")[0];
      val = val.replace(/[\/.,);]+$/, "").trim();
      return val;
    }
  }, [id]);

  const [directProperty, setDirectProperty] = useState<any>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directChecked, setDirectChecked] = useState(false);

  useEffect(() => {
    setDirectProperty(null);
    setDirectChecked(false);
  }, [cleanId]);

  // 1. Find by ID or by Code (case-insensitive) across all properties
  const property = useMemo(() => {
    if (!cleanId) return null;
    const cleanLower = cleanId.toLowerCase();
    const matches = (properties || []).filter(
      (p) =>
        p &&
        ((p.id && String(p.id).trim() === cleanId) ||
         (p.code && String(p.code).trim().toLowerCase() === cleanLower) ||
         (p.id && String(p.id).toLowerCase() === cleanLower))
    );

    let bestFound: Property | null = null;
    for (const m of matches) {
      if (!bestFound || (m.images?.length || 0) > (bestFound.images?.length || 0)) {
        bestFound = m;
      }
    }

    if (directProperty) {
      return { ...bestFound, ...directProperty };
    }
    return bestFound;
  }, [properties, cleanId, directProperty]);

  // 2. Direct fallback to Supabase if not in memory or if memory has <= 1 image
  useEffect(() => {
    if (!cleanId) {
      setDirectChecked(true);
      return;
    }

    const currentImgs = property && Array.isArray(property.images) ? property.images : [];
    // Only skip fetching if we already have the full multi-image gallery (> 1 image)
    if (property && currentImgs.length > 1) {
      setDirectChecked(true);
      return;
    }

    if (!supabase) {
      setDirectChecked(true);
      return;
    }

    let cancelled = false;
    setDirectLoading(true);

    void (async () => {
      try {
        // Query by id OR by code, order by created_at desc
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .or(`id.eq.${cleanId},code.ilike.${cleanId}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (cancelled) return;
        if (data && data.length > 0) {
          const primaryProp = rowToProperty(data[0]);
          setDirectProperty(primaryProp);
        }
      } catch (err) {
        console.warn("Direct property fetch error:", err);
      } finally {
        if (!cancelled) {
          setDirectLoading(false);
          setDirectChecked(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cleanId, property?.images?.length || 0]);

  const images = useMemo(() => {
    if (!property?.images) return [];
    return parsePropertyImages(property.images);
  }, [property?.images]);

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [detailThumbFailed, setDetailThumbFailed] = useState(false);
  const [downloadAllPending, setDownloadAllPending] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  useEffect(() => { setDetailThumbFailed(false); }, [id]);

  // Track property view ONCE per visit / session — never infinite loop
  const trackedPropIdRef = useRef<string | null>(null);
  useEffect(() => {
    const targetId = property?.id || id;
    if (!targetId || trackedPropIdRef.current === targetId) return;

    try {
      const sessionKey = `alm_view_${targetId}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        trackPropertyView(targetId);
      }
    } catch {
      trackPropertyView(targetId);
    }
    trackedPropIdRef.current = targetId;
  }, [id, property?.id, trackPropertyView]);

  // Update page meta independently without re-triggering view tracking
  useEffect(() => {
    if (property) {
      try {
        const propCode = property.code ? `${property.code} | العمودي للتسويق العقاري` : (property.title ? `${property.title} | العمودي للتسويق العقاري` : "العمودي للتسويق العقاري");
        updatePageMeta({
          title: propCode,
          description: property.description || `${property.title || property.code} - السعر: ${formatNumber(property.price)} ج.م`,
          image: property.images?.[0],
        });
      } catch (e) {
        console.warn("Error updating meta:", e);
      }
    }
  }, [property?.title, property?.code, property?.description, property?.price, property?.images, id]);

  // Smart Multi-Factor Similarity Algorithm (Unconditionally declared to obey React Hook Rules)
  const similar = useMemo(() => {
    if (!property || !properties || properties.length <= 1) return [];

    const candidates = properties.filter(p => p && p.id !== property.id);

    const scored = candidates.map(p => {
      let score = 0;

      // 1. Same Region / City (Highest Priority: +50 pts)
      if (property.regionId && p.regionId === property.regionId) {
        score += 50;
      }

      // 2. Same Sub-area / District (+30 pts)
      const pSub = typeof p.subArea === "string" ? p.subArea.toLowerCase().trim() : "";
      const curSub = typeof property.subArea === "string" ? property.subArea.toLowerCase().trim() : "";
      if (pSub && curSub && (pSub === curSub || pSub.includes(curSub) || curSub.includes(pSub))) {
        score += 30;
      }

      // 3. Same Listing Type (Sale with Sale, Rent with Rent: +25 pts)
      if (p.listingType === property.listingType || p.category === property.category) {
        score += 25;
      }

      // 4. Same Property Type (Apartment, Villa, etc.: +20 pts)
      if (property.typeId && p.typeId === property.typeId) {
        score += 20;
      }

      // 5. Price proximity (within price range: up to +15 pts)
      const propPrice = Number(property.price) || 0;
      const pPrice = Number(p.price) || 0;
      if (propPrice > 0 && pPrice > 0) {
        const priceRatio = Math.min(propPrice, pPrice) / Math.max(propPrice, pPrice);
        score += Math.round(priceRatio * 15);
      }

      // 6. Area proximity (up to +10 pts)
      const propArea = Number(property.area) || 0;
      const pArea = Number(p.area) || 0;
      if (propArea > 0 && pArea > 0) {
        const areaRatio = Math.min(propArea, pArea) / Math.max(propArea, pArea);
        score += Math.round(areaRatio * 10);
      }

      // 7. Same number of bedrooms (+5 pts)
      if (property.beds > 0 && p.beds === property.beds) {
        score += 5;
      }

      // Small deterministic tie-breaker to balance variety
      const hash = (p.id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const tieBreaker = (hash % 9) * 0.1;

      return { property: p, score: score + tieBreaker };
    });

    // Sort descending by match score
    scored.sort((a, b) => b.score - a.score);

    // Pick top 6 most relevant matching properties
    return scored.slice(0, 6).map(s => s.property);
  }, [property, properties]);

  // Handle Loading & Not Found states AFTER all hooks are evaluated
  if (!property) {
    if (!ready || directLoading || !directChecked) {
      return (
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">جارٍ تحميل بيانات العقار…</p>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">العقار غير موجود</h1>
            <p className="text-muted-foreground mb-6">لم يتم العثور على هذا العقار أو قد يكون تم نقله.</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
              <Link href="/">العودة للرئيسية</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const typeName = propertyTypes?.find(t => t.id === property?.typeId)?.name || "";
  const regionName = regions?.find(r => r.id === property?.regionId)?.name || "";

  const waNum = normalizePhoneForWa(settings?.whatsapp || settings?.phone1 || "");
  const waMsg = encodeURIComponent(`السلام عليكم، أرغب بالاستفسار عن العقار رقم (${property.code || ""}).`);
  const waHref = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : null;

  const handleShare = async () => {
    const propKey = (/^[A-Za-z0-9_-]+$/.test(property.code || "")) ? property.code : property.id;
    const url = `${window.location.origin}/properties/${propKey}`;
    if (navigator.share) { try { await navigator.share({ title: property.title || property.code, url }); return; } catch {} }
    await navigator.clipboard.writeText(url);
    toast({ title: "تم نسخ رابط العقار" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(property.code);
    toast({ title: "تم نسخ الكود", description: property.code });
  };

  const canDownloadImages = currentUser?.role === "admin"
    || (isStaff
      ? settings.allowStaffImageDownloads
      : settings.allowCustomerImageDownloads);

  const handleDownloadImage = async (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl) return;
    await downloadImage(imageUrl, `${property.code}-image-${index + 1}`);
    toast({ title: "تم بدء تحميل الصورة" });
  };

  const handleDownloadAllImages = async () => {
    if (downloadAllPending || images.length < 2) return;
    setDownloadAllPending(true);
    try {
      const result = await downloadImagesAsZip(images, `${property.code}-images`);
      if (result.downloaded === 0) {
        toast({
          title: "تعذر تحميل الصور",
          description: "لم يسمح مصدر الصور بالتحميل من المتصفح.",
          variant: "destructive",
        });
      } else if (result.failed > 0) {
        toast({
          title: "تم تحميل بعض الصور",
          description: `تمت إضافة ${result.downloaded} صورة، وتعذر الوصول إلى ${result.failed} صورة خارجية.`,
        });
      } else {
        toast({ title: "تم تجهيز ملف صور العقار" });
      }
    } finally {
      setDownloadAllPending(false);
    }
  };

  const propHasVideo = hasVideo(property.videoUrl);
  const detailVideoThumb = images.length === 0 ? getVideoThumbnailUrl(property.videoUrl) : null;
  const showDetailVideoCover = images.length === 0 && !!detailVideoThumb && !detailThumbFailed;
  const showDetailVideoPoster = images.length === 0 && propHasVideo && (!detailVideoThumb || detailThumbFailed);

  const isNew = () => {
    if (!property) return false;
    try {
      const created = property.createdAt || (property as any).created_at;
      if (!created) return false;
      const time = new Date(created).getTime();
      return time > 0 && Date.now() - time <= 7 * 86400000;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Zoomable Lightbox with Pinch-to-zoom & Double-click */}
      <ZoomableLightbox
        images={images}
        currentIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onChangeIndex={(i) => setLightboxIdx(i)}
      />

      <main className="flex-1 pb-16">
        {/* Breadcrumb */}
        <div className="container px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent transition-colors">الرئيسية</Link>
            <ChevronLeft className="h-3 w-3" />
            <span className="text-foreground font-medium line-clamp-1">{property.code}</span>
          </div>
        </div>

        <div className="container px-3 sm:px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {typeName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black text-white bg-black/55 backdrop-blur-md border border-white/35 shadow-[0_2px_8px_rgba(0,0,0,0.35)] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {typeName}
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-accent/40 text-white backdrop-blur-md border border-white/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {listingTypeLabels[property.listingType || ""] || categoryLabels[property.category] || "للبيع"}
                </span>
                {isNew() && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black text-white bg-black/55 backdrop-blur-md border border-white/35 shadow-[0_3px_10px_rgba(0,0,0,0.35)] tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    جديد
                  </span>
                )}
                {property.featured && <Badge className="bg-accent text-accent-foreground font-black shadow-xs">مميز VIP</Badge>}
                {property.status === "rented" && <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">مؤجر</Badge>}
                {property.status === "sold" && <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 font-bold">مباع</Badge>}
                {property.status === "reserved" && <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 font-bold">محجوز</Badge>}
                {property.status === "draft" && <Badge className="bg-muted text-muted-foreground border border-border font-bold">مسودة</Badge>}
              </div>
              <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-widest text-accent">{property.code}</h1>
              </div>
              {regionName && (
                <div className="flex items-center text-muted-foreground text-sm gap-1">
                  <MapPin className="h-4 w-4" />{regionName}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
              <div className="text-3xl font-bold text-accent">{formatNumber(property.price)} <span className="text-base font-normal text-foreground/70">EGP</span></div>
              <div className="flex flex-wrap items-center gap-2">
                {isStaff && (
                  <Button
                    onClick={() => navigate(`/admin/properties/${property.id}/edit`)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 rounded-xl font-bold"
                    title="تعديل هذا العقار">
                    <Pencil className="h-4 w-4" />تعديل العقار
                  </Button>
                )}
                {canViewBrochure && (
                  <PropertyBrochureModal
                    property={property}
                    region={regions?.find(r => r.id === property.regionId)}
                    propertyType={propertyTypes?.find(t => t.id === property.typeId)}
                    categoryLabel={categoryLabels[property.category] || property.category || ""}
                    finishingLabel={finishingLabels[property.finishing] || property.finishing || ""}
                    companyName={settings?.companyName}
                    phone={settings?.phone1}
                    whatsapp={settings?.whatsapp}
                    email={settings?.email}
                    qrCodes={settings?.qrCodes}
                  />
                )}
                <PropertyShareModal
                  property={property}
                  regionName={regionName}
                  typeName={typeName}
                />
                <Button variant="outline" size="icon"
                  className={cn("rounded-[10px] border border-white/10 bg-[#161B20]/60 hover:bg-white/5 backdrop-blur-md cursor-pointer transition-all", isFavorite(property.id) ? "text-red-500 border-red-500/40 bg-red-500/10" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => { toggleFavorite(property.id); toast({ title: isFavorite(property.id) ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة" }); }}
                  title="المفضلة">
                  <Heart className={cn("h-4 w-4", isFavorite(property.id) ? "fill-red-500" : "")} />
                </Button>
                <Button variant="outline" size="icon"
                  className={cn("rounded-[10px] border border-white/10 bg-[#161B20]/60 hover:bg-white/5 backdrop-blur-md cursor-pointer transition-all", isInCompare(property.id) ? "text-[#C5A059] border-[#C5A059]/40 bg-[#C5A059]/10" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => { toggleCompare(property.id); toast({ title: isInCompare(property.id) ? "تمت الإزالة من المقارنة" : "تمت الإضافة للمقارنة" }); }}
                  title="مقارنة">
                  <Scale className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Specs chips — mobile only, shown above gallery */}
          <div className="flex flex-wrap gap-2 mb-4 lg:hidden">
            {property.beds > 0 && (
              <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                <Bed className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                <span className="font-bold text-foreground">{property.beds}</span>
                <span className="text-muted-foreground text-xs">غرف</span>
              </div>
            )}
            {property.baths > 0 && (
              <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                <Bath className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                <span className="font-bold text-foreground">{property.baths}</span>
                <span className="text-muted-foreground text-xs">حمام</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
              <Square className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
              <span className="font-bold text-foreground">{property.area}</span>
              <span className="text-muted-foreground text-xs">م²</span>
            </div>
            {property.floor !== undefined && property.floor !== null && property.floor !== "" && (
              <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                <Layers className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                <span className="font-bold text-foreground">{property.floor === 0 || property.floor === "0" ? "أرضي" : property.floor}</span>
                {typeof property.floor === "number" && property.floor > 0 && <span className="text-muted-foreground text-xs">دور</span>}
              </div>
            )}
            {property.finishing && (
              <div className="flex items-center gap-1.5 bg-[#C5A059]/15 border border-[#C5A059]/30 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                <span className="text-[#C5A059] text-xs font-bold">{finishingLabels[property.finishing] || property.finishing}</span>
              </div>
            )}
            {property.videoUrl && (
              <button
                onClick={() => setVideoModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#C5A059] text-[#10202D] font-bold rounded-[10px] px-3 py-2 text-sm hover:bg-[#B38E46] transition-colors cursor-pointer shadow-md"
              >
                <Play className="h-3.5 w-3.5 fill-[#10202D] flex-shrink-0" />
                <span className="text-xs font-bold">فيديو العقار</span>
              </button>
            )}
          </div>

          {/* Gallery */}
          {images.length > 0 ? (
            <PropertyGallery
              images={images}
              title={property.title}
              onClickImage={(i) => setLightboxIdx(i)}
              allowDownload={canDownloadImages}
              downloadAllPending={downloadAllPending}
              onDownloadImage={handleDownloadImage}
              onDownloadAll={handleDownloadAllImages}
              className="mb-10"
            />
          ) : showDetailVideoCover || showDetailVideoPoster ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setVideoModalOpen(true)}
              onKeyDown={e => e.key === "Enter" && setVideoModalOpen(true)}
              className="group relative block h-[300px] sm:h-[380px] rounded-lg overflow-hidden mb-10 bg-muted cursor-pointer"
              data-testid="link-video-cover"
            >
              {showDetailVideoCover ? (
                <>
                  <img src={detailVideoThumb!} aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50" />
                  <img
                    src={detailVideoThumb!}
                    alt={property.title}
                    onError={() => setDetailThumbFailed(true)}
                    className="relative w-full h-full object-contain"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent/25 via-muted to-muted/40 flex items-center justify-center">
                  <Video className="h-16 w-16 text-accent/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3">
                <span className="w-20 h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Play className="h-9 w-9 text-accent fill-accent translate-x-0.5" />
                </span>
                <span className="text-white font-semibold text-sm bg-black/40 backdrop-blur-sm px-3 py-1 rounded-md">مشاهدة فيديو العقار</span>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center mb-10 border border-dashed border-border">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد صور لهذا العقار</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            <div className="lg:col-span-2 space-y-5">

              {/* Compact specs row — desktop only (mobile version is above gallery) */}
              <div className="hidden lg:flex flex-wrap gap-2">
                {property.beds > 0 && (
                  <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                    <Bed className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                    <span className="font-bold text-foreground">{property.beds}</span>
                    <span className="text-muted-foreground text-xs">غرف</span>
                  </div>
                )}
                {property.baths > 0 && (
                  <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                    <Bath className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                    <span className="font-bold text-foreground">{property.baths}</span>
                    <span className="text-muted-foreground text-xs">حمام</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                  <Square className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                  <span className="font-bold text-foreground">{property.area}</span>
                  <span className="text-muted-foreground text-xs">م²</span>
                </div>
                {property.floor !== undefined && property.floor !== null && property.floor !== "" && (
                  <div className="flex items-center gap-1.5 bg-[#0F1317]/70 border border-white/10 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                    <Layers className="h-4 w-4 text-[#C5A059] flex-shrink-0" />
                    <span className="font-bold text-foreground">{property.floor === 0 || property.floor === "0" ? "أرضي" : property.floor}</span>
                    {typeof property.floor === "number" && property.floor > 0 && <span className="text-muted-foreground text-xs">دور</span>}
                  </div>
                )}
                {property.finishing && (
                  <div className="flex items-center gap-1.5 bg-[#C5A059]/15 border border-[#C5A059]/30 rounded-[10px] px-3 py-2 text-sm backdrop-blur-md">
                    <span className="text-[#C5A059] text-xs font-bold">{finishingLabels[property.finishing] || property.finishing}</span>
                  </div>
                )}
                {property.videoUrl && (
                  <button
                    onClick={() => setVideoModalOpen(true)}
                    data-testid="link-watch-video"
                    className="flex items-center gap-1.5 bg-[#C5A059] text-[#10202D] font-bold rounded-[10px] px-3 py-2 text-sm hover:bg-[#B38E46] transition-colors cursor-pointer shadow-md"
                  >
                    <Play className="h-3.5 w-3.5 fill-[#10202D] flex-shrink-0" />
                    <span className="text-xs font-bold">فيديو العقار</span>
                  </button>
                )}
              </div>

              {/* Description — before full details */}
              {property.description && (
                <Card className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                  <CardHeader className="pb-3 border-b border-white/10">
                    <CardTitle className="text-base text-[#C5A059] font-bold">وصف العقار</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-foreground/90 leading-relaxed text-sm whitespace-pre-line break-words [overflow-wrap:anywhere]">{property.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Full specs table */}
              <Card className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                <CardHeader className="pb-3 border-b border-white/10">
                  <CardTitle className="text-base text-[#C5A059] font-bold">تفاصيل ومواصفات العقار</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="flex flex-col">
                    {[
                      { label: "كود العقار", value: property.code, copy: true },
                      { label: "نوع العقار", value: typeName || property.unitType || null },
                      { label: "فئة العقار", value: categoryLabels[property.category] || property.category },
                      { label: "نوع العرض", value: listingTypeLabels[property.listingType || ""] || categoryLabels[property.category] || "للبيع" },
                      { label: "المنطقة", value: regionName || null },
                      { label: "المنطقة الفرعية", value: property.subArea || null },
                      { label: "المساحة", value: property.area ? `${property.area} م²` : null },
                      { label: "غرف النوم", value: property.beds || null },
                      { label: "الحمامات", value: property.baths || null },
                      {
                        label: "الدور",
                        value: (() => {
                          if (property.floor === null || property.floor === undefined || property.floor === "" || property.floor === "__NONE__" || property.floor === -1) {
                            return null;
                          }
                          const str = String(property.floor).trim();
                          if (!str || str === "__NONE__" || str === "-1") return null;
                          if (/^\d+$/.test(str)) {
                            const num = parseInt(str, 10);
                            return num > 0 ? `الدور ${num}` : "أرضي";
                          }
                          return str;
                        })()
                      },
                      { label: "عدد طوابق العقار", value: Number(property.floors) > 0 ? property.floors : null },
                      { label: "الواجهة", value: property.unitType || null },
                      { label: "الفيو", value: property.view || null },
                      { label: "ماستر", value: property.master || null },
                      { label: "الدريسنج", value: property.floorText || null },
                      { label: "أسانسير", value: property.elevator || null },
                      { label: "موقف سيارة", value: property.parking || null },
                      { label: "المميزات الإضافية", value: property.additionalFeatures || null },
                      { label: "التشطيب", value: property.finishing ? (finishingLabels[property.finishing] || property.finishing) : null },
                      { label: "الموقع", value: property.location || null },
                    ].filter(r => r.value != null && r.value !== "").map((row, i) => (
                      <div key={i} className="flex justify-between items-start gap-3 py-2.5 border-b border-white/10 last:border-0">
                        <span className="text-sm text-muted-foreground flex-shrink-0">{row.label}</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {row.copy
                            ? <span className="text-sm font-mono font-bold text-[#C5A059] tracking-wide">{String(row.value)}</span>
                            : <span className="text-sm font-medium text-start break-words [overflow-wrap:anywhere] text-foreground">{String(row.value)}</span>
                          }
                          {row.copy && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 text-[#C5A059]/70 hover:text-[#C5A059] cursor-pointer" onClick={handleCopy}><Copy className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Source info — admin only */}
              {isStaff && (
                Boolean(
                  property.sourcePhones?.some((ph: string) => ph.trim()) ||
                  property.sourceEmail?.trim() ||
                  property.sourceLocation?.trim() ||
                  property.sourceNotes?.trim() ||
                  property.source?.trim()
                ) && (
                  <Card className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                    <CardHeader className="pb-3 border-b border-white/10">
                      <CardTitle className="text-base flex items-center gap-2 text-[#C5A059] font-bold">
                        <FileText className="h-4 w-4 text-[#C5A059]" />
                        بيانات المصدر
                        <span className="text-[10px] font-bold bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30 px-2 py-0.5 rounded-full">للمدير فقط</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-24 flex-shrink-0">نوع المصدر</span>
                        <span className="font-semibold text-[#C5A059]">{property.agentType === "broker" ? "بروكر / وسيط" : "مباشر"}</span>
                      </div>
                      {property.assignedStaffId && property.assignedStaffId !== "none" && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-24 flex-shrink-0">الموظف المسؤول</span>
                          <span className="font-medium text-foreground">
                            {users?.find(u => u.id === property.assignedStaffId)?.name || property.assignedStaffId}
                          </span>
                        </div>
                      )}
                      {property.source?.trim() && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-24 flex-shrink-0">اسم المالك</span>
                          <span className="font-medium text-foreground">{property.source}</span>
                        </div>
                      )}
                      {(Array.isArray(property.sourcePhones) ? property.sourcePhones : []).filter((ph: any) => ph && String(ph).trim()).map((ph: any, i: number) => {
                        const phStr = String(ph).trim();
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground w-20 flex-shrink-0">{i === 0 ? "رقم التواصل" : " "}</span>
                            <a href={`tel:${phStr.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-foreground hover:text-[#C5A059] hover:underline font-medium transition-colors" dir="ltr">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#C5A059]" />{phStr}
                            </a>
                          </div>
                        );
                      })}
                      {property.sourceEmail?.trim() && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-20 flex-shrink-0">البريد</span>
                          <a href={`mailto:${property.sourceEmail}`} className="flex items-center gap-1.5 text-foreground hover:text-[#C5A059] hover:underline transition-colors" dir="ltr">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#C5A059]" />{property.sourceEmail}
                          </a>
                        </div>
                      )}
                      {property.sourceLocation?.trim() && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-20 flex-shrink-0">الموقع</span>
                          <a href={property.sourceLocation} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[#C5A059] hover:underline">
                            <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />افتح الرابط
                          </a>
                        </div>
                      )}
                      {property.sourceNotes?.trim() && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-muted-foreground w-20 flex-shrink-0">ملاحظات</span>
                          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{property.sourceNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              )}

              {/* Map */}
              {property.mapsUrl && (
                <div>
                  <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-foreground"><MapPin className="h-5 w-5 text-[#C5A059]" />الموقع على الخريطة</h2>
                  <button
                    onClick={() => window.open(property.mapsUrl!, "_blank", "noopener,noreferrer")}
                    className="w-full flex items-center gap-2 p-4 rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl hover:border-[#C5A059]/60 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all text-sm text-right cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-muted-foreground flex-1">افتح الموقع على خرائط جوجل</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#C5A059] flex-shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/40 bg-gradient-to-b from-[#22272D]/95 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] sticky top-24">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent pointer-events-none" />
                <CardHeader className="pb-3 border-b border-white/10">
                  <CardTitle className="text-base text-[#C5A059] font-bold">تواصل بشأن العقار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  <div className="bg-[#0F1317]/80 border border-white/10 rounded-[10px] p-3 text-center backdrop-blur-md">
                    <p className="text-xs text-muted-foreground mb-1">كود العقار</p>
                    <p className="font-bold text-[#C5A059] text-xl font-mono tracking-widest">{property.code}</p>
                  </div>

                  {waHref && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-2 rounded-[10px] shadow-md cursor-pointer transition-all">
                        <WhatsAppIcon className="h-4 w-4" />
                        تواصل عبر واتساب
                      </Button>
                    </a>
                  )}
                  {settings.phone1 && (
                    <a href={`tel:${settings.phone1.replace(/\s/g, "")}`}>
                      <Button variant="outline" className="w-full gap-2 rounded-[10px] mt-2 border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-foreground font-semibold backdrop-blur-md cursor-pointer transition-all">
                        <Phone className="h-4 w-4 text-[#C5A059]" />
                        {settings.phone1}
                      </Button>
                    </a>
                  )}
                  <Button variant="outline" className="w-full gap-2 rounded-[10px] border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-foreground backdrop-blur-md cursor-pointer transition-all" onClick={handleCopy}>
                    <Copy className="h-4 w-4 text-[#C5A059]" />
                    نسخ كود العقار
                  </Button>
                  <Button variant="outline" className="w-full gap-2 rounded-[10px] border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-foreground backdrop-blur-md cursor-pointer transition-all" onClick={handleShare}>
                    <Share2 className="h-4 w-4 text-[#C5A059]" />
                    مشاركة العقار
                  </Button>

                  {property.externalUrl && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl text-accent border-accent/30 hover:bg-accent/10 mt-2"
                      onClick={() => window.open(property.externalUrl!, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      رابط العقار الخارجي
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Similar Properties Mini Luxury Boxes */}
          {similar.length > 0 && (
            <div className="mt-14 pt-10 border-t border-border/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-accent" />
                    عقارات مشابهة
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    عقارات في نفس المنطقة أو من نفس الفئة العقارية
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {similar.length} عقارات
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                {similar.map(p => {
                  const tName = propertyTypes?.find(t => t.id === p.typeId)?.name || p.unitType || "عقار";
                  const rName = regions?.find(r => r.id === p.regionId)?.name || p.location || "";
                  const thumb = p.images?.[0] || (p.videoUrl ? getVideoThumbnailUrl(p.videoUrl) : null);
                  const isSale = p.listingType === "sale" || p.category === "sale";

                  return (
                    <Link
                      key={p.id}
                      href={`/properties/${p.id}`}
                      className="group flex items-stretch gap-3 p-2.5 rounded-[10px] bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl border border-[#C5A059]/30 hover:border-[#C5A059]/70 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative"
                    >
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />

                      {/* Image Thumbnail */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[8px] overflow-hidden bg-muted flex-shrink-0 relative">
                        {thumb ? (
                          <img
                            src={getCardImageUrl(thumb)}
                            alt={p.code || p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/70">
                            <Building2 className="h-6 w-6 mb-1" />
                            <span className="text-[10px]">بدون صورة</span>
                          </div>
                        )}

                        {/* Listing type badge */}
                        <div className="absolute top-1.5 right-1.5">
                          <span
                            className={cn(
                              "text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm",
                              isSale
                                ? "bg-accent text-accent-foreground font-black"
                                : "bg-blue-600 text-white"
                            )}
                          >
                            {isSale ? "للبيع" : "للإيجار"}
                          </span>
                        </div>

                        {/* Image count pill */}
                        {p.images?.length > 1 && (
                          <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Camera className="h-2.5 w-2.5" />
                            <span>{p.images.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                          {/* Code & Region */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-[#C5A059] font-mono bg-[#C5A059]/15 border border-[#C5A059]/30 px-1.5 py-0.5 rounded">
                              {p.code}
                            </span>
                            {rName && (
                              <span className="text-[11px] text-muted-foreground truncate flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0 text-[#C5A059]" />
                                <span className="truncate">{rName}</span>
                              </span>
                            )}
                          </div>

                          {/* Unit Title / Type */}
                          <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-[#C5A059] transition-colors">
                            {tName} {p.subArea ? `- ${p.subArea}` : ""}
                          </h3>
                        </div>

                        {/* Specs Mini Chips */}
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground my-1">
                          {p.area > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Square className="h-2.5 w-2.5 text-[#C5A059]" />
                              <span>{p.area}م²</span>
                            </span>
                          )}
                          {p.beds > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Bed className="h-2.5 w-2.5 text-[#C5A059]" />
                              <span>{p.beds}غ</span>
                            </span>
                          )}
                          {p.baths > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Bath className="h-2.5 w-2.5 text-[#C5A059]" />
                              <span>{p.baths}ح</span>
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline justify-between mt-auto">
                          <p className="text-xs sm:text-sm font-black text-[#C5A059]">
                            {p.price > 0 ? `${formatNumber(p.price)} ج.م` : "عند الطلب"}
                          </p>
                          <span className="text-[10px] text-muted-foreground group-hover:translate-x-[-2px] transition-transform font-medium">
                            التفاصيل ←
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {property.videoUrl && (
        <VideoPlayerModal
          open={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          videoUrl={property.videoUrl}
        />
      )}
    </div>
  );
}
