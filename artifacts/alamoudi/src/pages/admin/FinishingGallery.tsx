import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Upload, Link, Play, Image as ImageIcon, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { supabaseService } from "@/lib/supabaseService";
import { getVideoThumbnailUrl, hasVideo } from "@/lib/videoThumbnail";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

import { uploadMultipleToCloudinary, getFinishingCloudinaryFolder, getThumbnailImageUrl } from "@/lib/cloudinaryService";

interface GalleryImage { id: string; url: string; title: string }
interface GalleryVideo { id: string; url: string; title: string }
interface GalleryConfig { interval: number; images: GalleryImage[]; videos: GalleryVideo[] }

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,image/avif";

async function compressImage(file: File, maxW = 1400, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxW) { height = Math.round((height / width) * maxW); width = maxW; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function FinishingGallery() {
  const { toast } = useToast();
  const [config, setConfig] = useState<GalleryConfig>({ interval: 4, images: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState("");
  const [vidUrlInput, setVidUrlInput] = useState("");
  const [vidTitleInput, setVidTitleInput] = useState("");
  const [vidThumbErrors, setVidThumbErrors] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Instant local cache load (0ms)
    try {
      const raw = localStorage.getItem("alm_finishing_gallery");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed.images) || Array.isArray(parsed.videos))) {
          setConfig(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh from Supabase Cloud (with fallback to API)
    supabaseService.fetchFinishingGallery()
      .then(cloudData => {
        if (cloudData && (Array.isArray(cloudData.images) || Array.isArray(cloudData.videos))) {
          const validConfig: GalleryConfig = {
            interval: typeof cloudData.interval === "number" ? cloudData.interval : 4,
            images: Array.isArray(cloudData.images) ? cloudData.images : [],
            videos: Array.isArray(cloudData.videos) ? cloudData.videos : [],
          };
          setConfig(validConfig);
          try { localStorage.setItem("alm_finishing_gallery", JSON.stringify(validConfig)); } catch {}
        } else {
          api.get<GalleryConfig>("/finishing-gallery")
            .then(data => {
              if (data && (Array.isArray(data.images) || Array.isArray(data.videos))) {
                setConfig(data);
                try { localStorage.setItem("alm_finishing_gallery", JSON.stringify(data)); } catch {}
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Instant local persistence
      localStorage.setItem("alm_finishing_gallery", JSON.stringify(config));

      // 2. Supabase Cloud persistence (global across all devices)
      await supabaseService.saveFinishingGallery(config);

      // 3. Fallback API sync if server route available
      api.put("/finishing-gallery", config).catch(() => {});

      toast({
        title: "تم حفظ المعرض بنجاح ✓",
        description: "تمت مزامنة الصور والفيديوهات سحابياً وفورياً على جميع الأجهزة.",
      });
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      toast({ title: `جاري ضغط ومعالجة ${files.length} صورة...` });
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      toast({ title: `جاري رفع الصور إلى سحابة Cloudinary السريعة...` });
      const folder = getFinishingCloudinaryFolder();
      const cloudUrls = await uploadMultipleToCloudinary(compressed, folder);
      const newImgs: GalleryImage[] = cloudUrls.map(url => ({ id: uid(), url, title: "" }));
      setConfig(c => ({ ...c, images: [...c.images, ...newImgs] }));
      toast({ title: `تم رفع ${cloudUrls.length} ${cloudUrls.length === 1 ? "صورة بنجاح ✓" : "صور بنجاح ✓"}` });
    } catch (err: any) {
      console.error("[FinishingGallery] Upload error:", err);
      toast({ title: "فشل رفع الصور السحابية", description: err.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addImageUrl = () => {
    const url = imgUrlInput.trim();
    if (!url) return;
    setConfig(c => ({ ...c, images: [...c.images, { id: uid(), url, title: "" }] }));
    setImgUrlInput("");
  };

  const removeImage = useCallback((id: string) => {
    setConfig(c => ({ ...c, images: c.images.filter(img => img.id !== id) }));
  }, []);

  const addVideo = () => {
    const url = vidUrlInput.trim();
    if (!url) return;
    if (!hasVideo(url)) {
      toast({ title: "رابط غير صحيح — يدعم يوتيوب وتيك توك فقط", variant: "destructive" });
      return;
    }
    setConfig(c => ({ ...c, videos: [...c.videos, { id: uid(), url, title: vidTitleInput.trim() }] }));
    setVidUrlInput(""); setVidTitleInput("");
  };

  const removeVideo = useCallback((id: string) => {
    setConfig(c => ({ ...c, videos: c.videos.filter(v => v.id !== id) }));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">جارٍ التحميل...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <AdminPageHeader
          title="معرض أعمال التشطيبات"
          subtitle={`${config.images.length} صورة · ${config.videos.length} فيديو`}
          eyebrow="المحتوى المرئي"
          icon={ImageIcon}
          actions={
            <Button onClick={handleSave} disabled={saving} className="h-10 gap-2 bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]">
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          }
        />

        {/* Interval Setting */}
        <Card className="card-luxury border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              مدة التغيير بين الصور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Slider
                  min={1} max={15} step={1}
                  value={[config.interval]}
                  onValueChange={([v]) => setConfig(c => ({ ...c, interval: v }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 ثانية</span>
                  <span>15 ثانية</span>
                </div>
              </div>
              <div className="w-24 text-center bg-accent/10 rounded-lg py-2 px-3 flex-shrink-0">
                <p className="text-2xl font-bold text-accent">{config.interval}</p>
                <p className="text-xs text-muted-foreground">ثانية</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images Section */}
        <Card className="card-luxury border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-accent" />
              الصور ({config.images.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload + URL Inputs */}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="gap-2 border-accent/40 text-accent hover:bg-accent/10"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading ? "جارٍ الضغط..." : "رفع صور"}
              </Button>
              <p className="w-full text-xs text-muted-foreground">
                يدعم: JPG، PNG، WebP، AVIF — يتم ضغط الصور تلقائياً للحصول على أفضل جودة
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={imgUrlInput}
                onChange={e => setImgUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addImageUrl()}
                placeholder="أو الصق رابط صورة مباشر..."
                dir="ltr"
                className="flex-1"
              />
              <Button variant="outline" onClick={addImageUrl} className="gap-1.5 shrink-0">
                <Link className="h-3.5 w-3.5" />إضافة
              </Button>
            </div>

            {/* Image Grid */}
            {config.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {config.images.map((img) => (
                  <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img
                      src={getThumbnailImageUrl(img.url)}
                      alt={img.title || "صورة"}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      title="حذف"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">اضغط لرفع الصور أو اسحبها هنا</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Videos Section */}
        <Card className="card-luxury border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-accent" />
              الفيديوهات ({config.videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">رابط الفيديو (يوتيوب / تيك توك)</Label>
                <Input
                  value={vidUrlInput}
                  onChange={e => setVidUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addVideo()}
                  placeholder="https://youtube.com/watch?v=..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">عنوان (اختياري)</Label>
                <Input
                  value={vidTitleInput}
                  onChange={e => setVidTitleInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addVideo()}
                  placeholder="مثال: شقة 3 غرف..."
                />
              </div>
              <Button onClick={addVideo} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />إضافة
              </Button>
            </div>

            {config.videos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {config.videos.map((vid) => {
                  const thumb = !vidThumbErrors[vid.id] ? getVideoThumbnailUrl(vid.url) : null;
                  return (
                    <div key={vid.id} className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={vid.title || "فيديو"}
                          className="w-full h-full object-cover"
                          onError={() => setVidThumbErrors(p => ({ ...p, [vid.id]: true }))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Play className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-accent fill-accent translate-x-px" />
                        </span>
                      </div>
                      {vid.title && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                          <p className="text-white text-[10px] font-medium line-clamp-1">{vid.title}</p>
                        </div>
                      )}
                      <button
                        onClick={() => removeVideo(vid.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        title="حذف"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Play className="h-7 w-7 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">أضف روابط فيديو يوتيوب أو تيك توك</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Save */}
        <div className="flex justify-end pb-4">
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 px-8">
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
