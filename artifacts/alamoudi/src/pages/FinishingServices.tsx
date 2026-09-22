import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, CheckCircle2, Play, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { supabaseService } from "@/lib/supabaseService";
import { useData } from "@/context/DataContext";
import { getVideoThumbnailUrl, hasVideo } from "@/lib/videoThumbnail";
import { getCardImageUrl, getDetailImageUrl } from "@/lib/cloudinaryService";
import { VideoPlayerModal } from "@/components/ui/VideoPlayerModal";
import { suppressGhostClicks } from "@/lib/utils";
import { ZoomableLightbox } from "@/components/ui/ZoomableLightbox";
import { Link } from "wouter";

const finishingTypes = ["سوبر لوكس", "لوكس", "كلاسيك", "مودرن", "بسيط", "متكامل مع الأثاث"];

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

interface GalleryImage { id: string; url: string; title: string }
interface GalleryVideo { id: string; url: string; title: string }
interface GalleryConfig { interval: number; images: GalleryImage[]; videos: GalleryVideo[] }

// ─── Image Slideshow ──────────────────────────────────────────────────────────

function ImageSlideshow({ images, interval }: { images: GalleryImage[]; interval: number }) {
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPages = Math.max(1, Math.ceil(images.length / 4));

  useEffect(() => {
    if (images.length <= 4) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPage(p => (p + 1) % totalPages);
        setVisible(true);
      }, 550);
    }, interval * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length, interval, totalPages]);

  const startIdx = page * 4;
  const slots: (GalleryImage | null)[] = images.length > 0
    ? Array.from({ length: 4 }, (_, i) =>
        images.length > 0 ? images[(startIdx + i) % images.length] : null
      )
    : [null, null, null, null];

  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aspect-square bg-muted rounded-xl border border-dashed border-border flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Wrench className="h-6 w-6 mx-auto mb-1 opacity-30" />
              <p className="text-xs opacity-50">قريباً</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.55s cubic-bezier(0.4,0,0.2,1)" }}
      >
        {slots.map((img, i) =>
          img ? (
            <div
              key={`${img.id}-${i}`}
              onClick={() => setLightbox(img.url)}
              className="group aspect-square rounded-[10px] overflow-hidden border border-[#C5A059]/30 hover:border-[#C5A059]/70 bg-muted cursor-zoom-in transition-all duration-300 shadow-md"
            >
              <img
                src={getCardImageUrl(img.url)}
                alt={img.title || "صورة تشطيب"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ) : (
            <div key={i} className="aspect-square rounded-[10px] border border-dashed border-[#C5A059]/20 bg-muted/40" />
          )
        )}
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setPage(i); setVisible(true); }, 300); }}
              className={`rounded-full transition-all duration-300 ${
                i === page
                  ? "w-5 h-2 bg-accent"
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Zoomable Lightbox */}
      <ZoomableLightbox
        images={images.map(img => img.url)}
        currentIndex={lightbox ? images.findIndex(img => img.url === lightbox) : null}
        onClose={() => setLightbox(null)}
        onChangeIndex={(idx) => {
          if (images[idx]) setLightbox(images[idx].url);
        }}
      />
    </>
  );
}

// ─── Video Grid ───────────────────────────────────────────────────────────────

function VideoGrid({ videos }: { videos: GalleryVideo[] }) {
  const [thumbErrors, setThumbErrors] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<GalleryVideo | null>(null);

  if (videos.length === 0) return null;

  const displayVideos = videos.slice(0, 8); // show max 8

  return (
    <>
      <section className="py-8 bg-muted/30">
        <div className="container px-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">فيديوهات أعمالنا</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayVideos.map(vid => {
              const thumb = !thumbErrors[vid.id] ? getVideoThumbnailUrl(vid.url) : null;
              return (
                <div
                  key={vid.id}
                  onClick={() => setActive(vid)}
                  className="group relative aspect-square rounded-[10px] overflow-hidden border border-[#C5A059]/30 hover:border-[#C5A059]/70 bg-[#0F1317]/80 cursor-pointer shadow-md transition-all duration-300"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={vid.title || "فيديو"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={() => setThumbErrors(p => ({ ...p, [vid.id]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <ImageIcon className="h-8 w-8 text-[#C5A059]/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-[#C5A059] group-hover:bg-[#B38E46] group-hover:scale-110 flex items-center justify-center shadow-lg transition-all duration-200">
                      <Play className="h-5 w-5 text-[#10202D] fill-[#10202D] translate-x-px" />
                    </span>
                  </div>
                  {vid.title && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2.5 pt-6 pb-2 translate-y-full group-hover:translate-y-0 transition-transform duration-250">
                      <p className="text-white text-xs font-bold line-clamp-2">{vid.title}</p>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 backdrop-blur-sm border border-white/10">
                      <Play className="h-2.5 w-2.5 fill-white" />فيديو
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {active && (
        <VideoPlayerModal
          open={!!active}
          videoUrl={active.url}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinishingServices() {
  const { toast } = useToast();
  const { addFinishingRequest } = useData();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", location: "", area: "", finishingType: "", description: "" });

  const [gallery, setGallery] = useState<GalleryConfig>({ interval: 4, images: [], videos: [] });
  const [galleryLoading, setGalleryLoading] = useState(true);

  useEffect(() => {
    // 1. Instant local cache load (0ms)
    try {
      const raw = localStorage.getItem("alm_finishing_gallery");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed.images) || Array.isArray(parsed.videos))) {
          setGallery(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh from Supabase Cloud
    supabaseService.fetchFinishingGallery()
      .then(cloudData => {
        if (cloudData && (Array.isArray(cloudData.images) || Array.isArray(cloudData.videos))) {
          const validConfig: GalleryConfig = {
            interval: typeof cloudData.interval === "number" ? cloudData.interval : 4,
            images: Array.isArray(cloudData.images) ? cloudData.images : [],
            videos: Array.isArray(cloudData.videos) ? cloudData.videos : [],
          };
          setGallery(validConfig);
          try { localStorage.setItem("alm_finishing_gallery", JSON.stringify(validConfig)); } catch {}
        } else {
          api.get<GalleryConfig>("/finishing-gallery")
            .then(data => {
              if (data && (Array.isArray(data.images) || Array.isArray(data.videos))) {
                setGallery(data);
                try { localStorage.setItem("alm_finishing_gallery", JSON.stringify(data)); } catch {}
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setGalleryLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast({ title: "يجب الموافقة على سياسة الخصوصية وشروط الاستخدام", variant: "destructive" });
      return;
    }
    if (!form.name || !form.phone || !form.finishingType) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      addFinishingRequest({
        name: form.name,
        phone: form.phone,
        location: form.location,
        area: form.area,
        finishingType: form.finishingType,
        description: form.description,
      });
      setSubmitted(true);
      toast({ title: "تم إرسال طلبك بنجاح ✓", description: "سنتواصل معك قريباً لمناقشة تفاصيل التشطيب." });
    } catch {
      toast({ title: "خطأ في الإرسال", description: "فشل إرسال الطلب، يرجى المحاولة مرة أخرى", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background">

        {/* Hero */}
        <div className="relative border-b border-[#C5A059]/20 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] py-12 md:py-16 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
          <div className="container px-6 text-center relative z-10">
            <span className="inline-block text-xs font-semibold tracking-wider text-[#C5A059] uppercase mb-2 px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30">
              خدمات حصرية راقية
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">خدمات التشطيبات</h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              نقدم خدمات تشطيب متكاملة لجميع أنواع الوحدات السكنية والإدارية بأعلى مستوى من الجودة وأفضل الأسعار.
            </p>
          </div>
        </div>

        {/* Photo Gallery */}
        <section className="py-8 bg-background">
          <div className="container px-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">أعمالنا السابقة</h2>
            {galleryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <ImageSlideshow images={gallery.images} interval={gallery.interval} />
            )}
          </div>
        </section>

        {/* Video Gallery */}
        {!galleryLoading && gallery.videos.length > 0 && (
          <VideoGrid videos={gallery.videos} />
        )}

        {/* Request Form */}
        <section className="py-12">
          <div className="container px-6 max-w-2xl mx-auto">
            {submitted ? (
              <Card className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] text-center py-16">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                <CardContent>
                  <div className="w-16 h-16 bg-[#C5A059]/15 border border-[#C5A059]/30 rounded-full flex items-center justify-center text-[#C5A059] mx-auto mb-4 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">تم إرسال طلبك بنجاح</h2>
                  <p className="text-sm text-muted-foreground">سيتواصل معك فريقنا خلال 24 ساعة.</p>
                  <Button className="mt-6 bg-[#C5A059] text-[#10202D] hover:bg-[#B38E46] font-bold rounded-[10px] px-8 transition-all"
                    onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", location: "", area: "", finishingType: "", description: "" }); }}>
                    إرسال طلب آخر
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="relative overflow-hidden rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C5A059] inline-block shadow-[0_0_8px_rgba(197,160,89,0.8)]" />
                    اطلب خدمة تشطيب
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">الاسم *</Label>
                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="الاسم الكامل" className="bg-[#0F1317]/70 border-white/10 rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#C5A059]/50 focus-visible:ring-[#C5A059]/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">الهاتف *</Label>
                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+20 10 0000 0000" dir="ltr" className="bg-[#0F1317]/70 border-white/10 rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#C5A059]/50 focus-visible:ring-[#C5A059]/20 text-right" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">الموقع</Label>
                        <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="المنطقة / الكمباوند" className="bg-[#0F1317]/70 border-white/10 rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#C5A059]/50 focus-visible:ring-[#C5A059]/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">المساحة (م²)</Label>
                        <Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="مثال: 120" className="bg-[#0F1317]/70 border-white/10 rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#C5A059]/50 focus-visible:ring-[#C5A059]/20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium">نوع التشطيب *</Label>
                      <Select value={form.finishingType} onValueChange={v => setForm({ ...form, finishingType: v })}>
                        <SelectTrigger className="bg-[#0F1317]/70 border-white/10 rounded-[10px] text-foreground focus:border-[#C5A059]/50 focus:ring-[#C5A059]/20"><SelectValue placeholder="اختر نوع التشطيب" /></SelectTrigger>
                        <SelectContent className="bg-[#181C20] border-[#C5A059]/30 text-foreground rounded-[10px]">{finishingTypes.map(t => <SelectItem key={t} value={t} className="focus:bg-[#C5A059]/20 focus:text-white">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium">وصف إضافي</Label>
                      <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="أي تفاصيل إضافية أو متطلبات خاصة..." className="min-h-[100px] bg-[#0F1317]/70 border-white/10 rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#C5A059]/50 focus-visible:ring-[#C5A059]/20" />
                    </div>
                    {/* Terms agreement */}
                    <div className={`flex items-start gap-3 rounded-[10px] border p-4 transition-colors ${agreed ? "border-[#C5A059]/40 bg-[#C5A059]/5" : "border-white/10 bg-[#0F1317]/50"}`}>
                      <Checkbox
                        id="finishing-terms-agree"
                        checked={agreed}
                        onCheckedChange={v => setAgreed(!!v)}
                        className="mt-0.5 shrink-0 data-[state=checked]:bg-[#C5A059] data-[state=checked]:border-[#C5A059] border-white/30"
                      />
                      <label htmlFor="finishing-terms-agree" className="text-xs md:text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
                        أقر بأنني قرأت ووافقت على{" "}
                        <Link href="/privacy" className="text-[#C5A059] font-medium underline underline-offset-2 hover:text-[#B38E46]" onClick={e => e.stopPropagation()}>
                          سياسة الخصوصية
                        </Link>
                        {" "}و{" "}
                        <Link href="/privacy" className="text-[#C5A059] font-medium underline underline-offset-2 hover:text-[#B38E46]" onClick={e => e.stopPropagation()}>
                          شروط الاستخدام
                        </Link>
                        {" "}الخاصة بمنصة العمودي للتسويق العقاري.
                      </label>
                    </div>

                    <Button type="submit" disabled={loading || !agreed} className="w-full h-11 bg-[#C5A059] text-[#10202D] hover:bg-[#B38E46] font-bold rounded-[10px] shadow-[0_4px_16px_rgba(197,160,89,0.25)] transition-all disabled:opacity-50">
                      {loading ? "جاري الإرسال..." : "إرسال الطلب"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
