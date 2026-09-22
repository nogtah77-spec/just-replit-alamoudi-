import React, { useState, useRef, ChangeEvent, useCallback } from "react";
import {
  Sparkles,
  Moon,
  Sun,
  Palette,
  Upload,
  RotateCcw,
  Save,
  Check,
  Sliders,
  Eye,
  Layers,
  Image as ImageIcon,
  Trash2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageOptimizer";
import { uploadToCloudinary, getBrandingCloudinaryFolder } from "@/lib/cloudinaryService";
import { useData, type SiteSettings, type HomeBackgroundSettings } from "@/context/DataContext";
import { HomeLuxuryBackground } from "@/components/ui/HomeLuxuryBackground";

interface HomeBackgroundManagerProps {
  form: SiteSettings;
  setForm: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

// ── 🎨 قوالب طبقات ألوان التعتيم الملكية الجاهزة (Preset Luxury Overlay Tints) ──
const DARK_OVERLAY_PRESETS = [
  { label: "أسود ملكي فاحم", color: "#000000", desc: "أعلى درجات الفخامة والتباين الصريح" },
  { label: "كحلي ليلي عميق", color: "#07101C", desc: "عمق بحري ملكي متناسق مع هوية المنصة" },
  { label: "رمادي فحمي هادئ", color: "#18181B", desc: "هدوء عصري وتوازن بصري فائق" },
  { label: "كحلي إنديغو فاخر", color: "#0B1528", desc: "لمسة زرقاء ملكية ساحرة" },
  { label: "رمادي جرافيت راقي", color: "#1E293B", desc: "تباين ثلاثي الأبعاد مع إضاءة ناعمة" },
  { label: "برونزي معتم دافئ", color: "#1A140E", desc: "دفء كلاسيكي فاخر يبرز العناصر الذهبية" },
];

const LIGHT_OVERLAY_PRESETS = [
  { label: "أبيض لؤلؤي ناصع", color: "#FFFFFF", desc: "نقاء وإشراق فندقي مبهج" },
  { label: "أوف وايت عاجي", color: "#FDFBF7", desc: "دفء كلاسيكي مريح للعين" },
  { label: "رمادي بلاتيني ناعم", color: "#F1F5F9", desc: "لمسة عصرية راقية متناسقة" },
  { label: "ثلجي بارد منعش", color: "#F8FAFC", desc: "صفاء عالي وإضاءة نهارية نظيفة" },
  { label: "بيج رملي دافئ", color: "#F7F4EE", desc: "طابع سكني راقي ومريح" },
];

export function HomeBackgroundManager({
  form,
  setForm,
  onSave,
  saving = false,
}: HomeBackgroundManagerProps) {
  const { updateSettings, updateHomeBackground, settings } = useData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dark" | "light">("dark");
  const [isUploading, setIsUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read current background config safely from live settings or form or persistent storage
  const cachedBg = typeof window !== "undefined" ? (() => {
    try {
      const raw = localStorage.getItem("alm_home_bg");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })() : null;

  const bgConfig: HomeBackgroundSettings = {
    enabled: true,
    bgImageDark: form.homeBackgroundSettings?.bgImageDark || settings.homeBackgroundSettings?.bgImageDark || cachedBg?.bgImageDark || "",
    overlayColorDark: form.homeBackgroundSettings?.overlayColorDark || settings.homeBackgroundSettings?.overlayColorDark || cachedBg?.overlayColorDark || "#000000",
    overlayOpacityDark: form.homeBackgroundSettings?.overlayOpacityDark ?? settings.homeBackgroundSettings?.overlayOpacityDark ?? cachedBg?.overlayOpacityDark ?? 30,
    blurDark: form.homeBackgroundSettings?.blurDark ?? settings.homeBackgroundSettings?.blurDark ?? cachedBg?.blurDark ?? 0,
    imageOpacityDark: form.homeBackgroundSettings?.imageOpacityDark ?? settings.homeBackgroundSettings?.imageOpacityDark ?? cachedBg?.imageOpacityDark ?? 100,
    bgImageLight: form.homeBackgroundSettings?.bgImageLight || settings.homeBackgroundSettings?.bgImageLight || cachedBg?.bgImageLight || "",
    overlayColorLight: form.homeBackgroundSettings?.overlayColorLight || settings.homeBackgroundSettings?.overlayColorLight || cachedBg?.overlayColorLight || "#FFFFFF",
    overlayOpacityLight: form.homeBackgroundSettings?.overlayOpacityLight ?? settings.homeBackgroundSettings?.overlayOpacityLight ?? cachedBg?.overlayOpacityLight ?? 35,
    blurLight: form.homeBackgroundSettings?.blurLight ?? settings.homeBackgroundSettings?.blurLight ?? cachedBg?.blurLight ?? 0,
    imageOpacityLight: form.homeBackgroundSettings?.imageOpacityLight ?? settings.homeBackgroundSettings?.imageOpacityLight ?? cachedBg?.imageOpacityLight ?? 100,
  };

  const isDark = activeTab === "dark";
  const currentImage = isDark
    ? (bgConfig.bgImageDark || bgConfig.bgImageLight)
    : (bgConfig.bgImageLight || bgConfig.bgImageDark);
  const currentOverlayColor = isDark ? (bgConfig.overlayColorDark || "#000000") : (bgConfig.overlayColorLight || "#FFFFFF");
  const currentOverlayOpacity = isDark ? (bgConfig.overlayOpacityDark ?? 30) : (bgConfig.overlayOpacityLight ?? 35);
  const currentBlur = isDark ? (bgConfig.blurDark ?? 0) : (bgConfig.blurLight ?? 0);
  const currentImageOpacity = isDark ? (bgConfig.imageOpacityDark ?? 100) : (bgConfig.imageOpacityLight ?? 100);

  // Update background fields safely without clearing image, with debounced auto-sync
  const updateBgField = useCallback((fields: Partial<HomeBackgroundSettings>, immediateSync = false) => {
    const updated: HomeBackgroundSettings = {
      ...bgConfig,
      ...fields,
      enabled: true,
    };
    
    // Always preserve images unless explicitly passed
    if (fields.bgImageDark === undefined) {
      updated.bgImageDark = bgConfig.bgImageDark || "";
    }
    if (fields.bgImageLight === undefined) {
      updated.bgImageLight = bgConfig.bgImageLight || "";
    }

    // Instant local UI state update for 60fps smooth slider drag
    setForm(prev => ({
      ...prev,
      homeBackgroundSettings: updated,
    }));

    // Debounce cloud network persistence so slider movements don't flood the server
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (immediateSync) {
      updateHomeBackground(updated);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        updateHomeBackground(updated);
      }, 350);
    }
  }, [bgConfig, setForm, updateSettings]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "نوع الملف غير صالح",
        description: "يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "حجم الصورة كبير جداً",
        description: "يرجى اختيار صورة بحجم أقل من 50 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Adaptive smart compression supporting any desktop or mobile portrait aspect ratio
      const optimizedDataUrl = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.78,
        format: "image/webp",
      });

      toast({ title: "جاري رفع خلفية الصفحة الرئيسية إلى Cloudinary..." });
      const folder = getBrandingCloudinaryFolder("home_bg");
      const cloudUrl = await uploadToCloudinary(optimizedDataUrl, folder);

      // Synchronize both modes if counterpart was empty so background is visible across all themes
      const patch: Partial<HomeBackgroundSettings> = isDark
        ? {
            bgImageDark: cloudUrl,
            bgImageLight: bgConfig.bgImageLight || cloudUrl,
            enabled: true,
          }
        : {
            bgImageLight: cloudUrl,
            bgImageDark: bgConfig.bgImageDark || cloudUrl,
            enabled: true,
          };

      updateBgField(patch, true);

      toast({
        title: "تم رفع وتطبيق الخلفية بنجاح ✓",
        description: "تم رفع الصورة إلى Cloudinary وتفعيلها فورياً على جميع الأجهزة.",
      });
    } catch (err: any) {
      console.error("[HomeBackgroundManager] Upload error:", err);
      toast({
        title: "تعذر معالجة أو رفع الصورة",
        description: err.message || "حدث خطأ أثناء الرفع. يرجى تجربة صورة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    updateBgField({ bgImageDark: "", bgImageLight: "" }, true);
    toast({
      title: "تم حذف صورة الخلفية",
      description: "تمت العودة للخلفية النظيفة الافتراضية بدون صور.",
    });
  };

  const currentPresets = isDark ? DARK_OVERLAY_PRESETS : LIGHT_OVERLAY_PRESETS;

  return (
    <div className="space-y-6">
      {/* ── 1. Top Header & Mode Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-card to-background border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">خلفية الصفحة الرئيسية</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ارفع صورة من جهازك (الجوال أو الكمبيوتر) وتحكم بطبقات التعتيم والألوان لتنسيق مظهر المنصة.
          </p>
        </div>

        {/* Dark / Light Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "dark" ? "default" : "ghost"}
            onClick={() => setActiveTab("dark")}
            className="h-8 px-3 rounded-lg text-xs gap-1.5 font-bold transition-all"
          >
            <Moon className="h-3.5 w-3.5" />
            الوضع الليلي
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "light" ? "default" : "ghost"}
            onClick={() => setActiveTab("light")}
            className="h-8 px-3 rounded-lg text-xs gap-1.5 font-bold transition-all"
          >
            <Sun className="h-3.5 w-3.5" />
            الوضع النهاري
          </Button>
        </div>
      </div>

      {/* ── 2. Live Simulator & Upload Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Upload & Control Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Upload Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="h-4 w-4 text-accent" />
                رفع صورة الخلفية من جهازك
              </CardTitle>
              <CardDescription className="text-xs">
                اختر صورة عالية الدقة من هاتفك أو حاسوبك، سيتم ضغطها وتطبيقها تلقائياً.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {currentImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-border/80 h-44 group">
                    <img
                      src={currentImage}
                      alt="Current Background"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-xs gap-1.5 font-bold"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        تغيير الصورة
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleRemoveImage}
                        className="text-xs gap-1.5 font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف الخلفية
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="h-3.5 w-3.5" />
                      تم تفعيل صورتك كخلفية
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                      إلغاء الصورة
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-accent/80 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-accent/5 group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6 text-accent" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    {isUploading ? "جارٍ معالجة وضغط الصورة..." : "اضغط هنا لرفع صورة من جهازك"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    يدعم JPG, PNG, WEBP حتى 20MB (يتم التحسين تلقائياً)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 🎨 Ready-Made Luxury Color Tint Presets Card ── */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Palette className="h-4 w-4 text-accent" />
                قوالب ألوان التعتيم الجاهزة (Luxury Color Tints)
              </CardTitle>
              <CardDescription className="text-xs">
                اختر نغمة اللون الملكي لطبقة التعتيم بضغطة زر واحدة لتتناغم مع صورتك ونصوص المنصة.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {currentPresets.map((preset) => {
                  const isSelected = currentOverlayColor.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => {
                        if (isDark) updateBgField({ overlayColorDark: preset.color }, true);
                        else updateBgField({ overlayColorLight: preset.color }, true);
                        toast({ title: `تم اختيار لون: ${preset.label}` });
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent/50"
                          : "border-border/70 hover:border-accent/40 bg-card/60 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="h-7 w-7 rounded-lg border border-white/20 shadow-xs shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: preset.color }}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{preset.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{preset.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-bold">أو اختر لون مخصص يدوياً:</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentOverlayColor}
                    onChange={(e) => {
                      if (isDark) updateBgField({ overlayColorDark: e.target.value }, true);
                      else updateBgField({ overlayColorLight: e.target.value }, true);
                    }}
                    className="w-9 h-8 p-0.5 rounded-lg cursor-pointer border-border shrink-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground uppercase">
                    {currentOverlayColor}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 🎛️ Full Effect Sliders Card ── */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                مؤثرات العتامة والتغبيش والوضوح (Filters & Adjustments)
              </CardTitle>
              <CardDescription className="text-xs">
                تحكم دقيق في نسبة التعتيم والشفافية والتغبيش لجعل محتوى الموقع مقروءاً وفاخراً.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overlay Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <Label className="text-xs">نسبة التعتيم اللوني (Overlay Darkening)</Label>
                  <span className="text-accent font-mono">{currentOverlayOpacity}%</span>
                </div>
                <Slider
                  min={0}
                  max={90}
                  step={1}
                  value={[currentOverlayOpacity]}
                  onValueChange={([val]) => {
                    if (isDark) updateBgField({ overlayOpacityDark: val });
                    else updateBgField({ overlayOpacityLight: val });
                  }}
                  className="py-1"
                />
              </div>

              {/* Image Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <Label className="text-xs">شفافية وظهور الصورة (Image Visibility)</Label>
                  <span className="text-accent font-mono">{currentImageOpacity}%</span>
                </div>
                <Slider
                  min={10}
                  max={100}
                  step={1}
                  value={[currentImageOpacity]}
                  onValueChange={([val]) => {
                    if (isDark) updateBgField({ imageOpacityDark: val });
                    else updateBgField({ imageOpacityLight: val });
                  }}
                  className="py-1"
                />
              </div>

              {/* Blur Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <Label className="text-xs">تغبيش وضبابية الصورة (Background Blur)</Label>
                  <span className="text-accent font-mono">{currentBlur}px</span>
                </div>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[currentBlur]}
                  onValueChange={([val]) => {
                    if (isDark) updateBgField({ blurDark: val });
                    else updateBgField({ blurLight: val });
                  }}
                  className="py-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Live Simulator Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent" />
              <h4 className="text-xs font-bold text-foreground">معاينة حية ومباشرة</h4>
            </div>

            {/* Device Switcher for Preview */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1.5 rounded-md transition-colors ${previewDevice === "desktop" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}
                title="معاينة سطح المكتب"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1.5 rounded-md transition-colors ${previewDevice === "mobile" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}
                title="معاينة الجوال"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Simulator Box */}
          <div
            className={`relative mx-auto rounded-2xl overflow-hidden border border-border shadow-md transition-all duration-300 ${
              previewDevice === "mobile" ? "w-[260px] h-[460px]" : "w-full h-[400px]"
            }`}
          >
            {/* Background Layer inside Simulator */}
            <HomeLuxuryBackground
              forcedTheme={activeTab}
              overrideConfig={bgConfig}
            />

            {/* Simulated Hero Foreground Content */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none select-none text-right">
              {/* Top Simulated Nav */}
              <div className="flex items-center justify-between">
                <div className="h-6 w-20 rounded-md bg-white/20 backdrop-blur-md" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur-md" />
                  <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur-md" />
                </div>
              </div>

              {/* Middle Simulated Hero Text */}
              <div className="space-y-2 text-center my-auto">
                <div className="inline-block px-3 py-1 rounded-full bg-accent/30 backdrop-blur-md border border-accent/40 text-[10px] font-bold text-accent">
                  منصة العقارات الفاخرة
                </div>
                <h3 className="text-base sm:text-lg font-black text-white drop-shadow-md leading-tight">
                  العمودي للتسويق العقاري
                </h3>
                <p className="text-[10px] text-white/80 max-w-xs mx-auto line-clamp-2">
                  اكتشف أرقى الوحدات العقارية والفرص الاستثمارية الحصرية في القاهرة الجديدة
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <div className="h-7 w-20 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold shadow-xs">
                    تصفح الوحدات
                  </div>
                  <div className="h-7 w-16 rounded-md bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-[10px] font-bold">
                    تواصل معنا
                  </div>
                </div>
              </div>

              {/* Bottom Simulated Search Bar */}
              <div className="h-8 w-full rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-between px-3 text-[10px] text-white/60">
                <span>ابحث بالمنطقة، الكود، نوع العقار...</span>
                <div className="h-5 w-5 rounded-lg bg-accent/80" />
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          {onSave && (
            <Button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-10 rounded-xl gap-2 mt-3 shadow-xs"
            >
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ والمزامنة..." : "حفظ وتثبيت التعديلات"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
