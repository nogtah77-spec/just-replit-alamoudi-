import React, { useState, useEffect } from "react";
import {
  Palette,
  Sparkles,
  Check,
  Eye,
  Search,
  Plus,
  Building2,
  Globe,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  Send,
  Laptop,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useData, type SiteSettings } from "@/context/DataContext";
import { syncThemeColor } from "@/lib/meta";

interface ThemeAppearanceManagerProps {
  form: SiteSettings;
  setForm: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

export function ThemeAppearanceManager({
  form,
  setForm,
  saving = false,
}: ThemeAppearanceManagerProps) {
  const { toast } = useToast();
  const { updateSettings, settings } = useData();

  // Public theme stored in cloud settings
  const publicTheme = settings.activeThemeId || "midnight";

  // Scope mode: "all" (Default: publish to all visitors) vs "admin_only" (Private Admin Preview)
  const [themeScope, setThemeScope] = useState<"all" | "admin_only">(() => {
    if (typeof window !== "undefined") {
      const savedScope = localStorage.getItem("alm_theme_scope");
      if (savedScope === "admin_only" || savedScope === "all") return savedScope;
    }
    return "all";
  });

  // Current active theme on this device
  const [currentDeviceTheme, setCurrentDeviceTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const local = localStorage.getItem("alm_active_theme");
      if (local) return local;
    }
    return publicTheme;
  });

  const [isApplying, setIsApplying] = useState(false);

  // Sync state if public theme changes and not in private preview
  useEffect(() => {
    if (themeScope !== "admin_only" && settings.activeThemeId) {
      setCurrentDeviceTheme(settings.activeThemeId);
    }
  }, [settings.activeThemeId, themeScope]);

  // Handle switching scope mode
  const handleScopeChange = (newScope: "all" | "admin_only") => {
    setThemeScope(newScope);
    try {
      localStorage.setItem("alm_theme_scope", newScope);
    } catch {}

    if (newScope === "all") {
      toast({
        title: "نطاق التطبيق: لجميع الزوار",
        description: "أي ثيم تختاره الآن سيتم اعتماده ونشره فوراً لكافة زوار المنصة والأجهزة.",
      });
    } else {
      toast({
        title: "نطاق التطبيق: معاينة خاصة بك كمدير",
        description: "أنت الآن في وضع المعاينة الخاصة، التغييرات ستظهر على متصفحك الحالي فقط ولن يراها زوار الموقع.",
      });
    }
  };

  // Apply or Preview a theme
  const handleApplyTheme = async (themeId: "classic" | "charcoal" | "midnight") => {
    setIsApplying(true);
    setCurrentDeviceTheme(themeId);

    // 1. Instant DOM application with zero latency
    document.documentElement.setAttribute("data-theme", themeId);
    try {
      localStorage.setItem("alm_active_theme", themeId);
    } catch {}
    syncThemeColor(themeId);

    // 2. If scope is "admin_only": Apply locally only, DO NOT push to cloud
    if (themeScope === "admin_only") {
      try {
        localStorage.setItem("alm_theme_scope", "admin_only");
      } catch {}
      setIsApplying(false);
      toast({
        title: "تم تفعيل المعاينة الخاصة بك كمدير ✓",
        description: `أنت الآن تعاين ثيم (${getThemeName(themeId)}) على هذا الجهاز فقط. لن يراه زوار الموقع حتى تختار "تطبيق للجميع".`,
      });
      return;
    }

    // 3. If scope is "all": Save to cloud settings and broadcast worldwide
    try {
      localStorage.setItem("alm_theme_scope", "all");
      setForm((prev) => ({ ...prev, activeThemeId: themeId }));
      await updateSettings({ activeThemeId: themeId });
      toast({
        title: "تم نشر الثيم للجميع بنجاح ✓",
        description: `تم اعتماد ثيم (${getThemeName(themeId)}) وتطبيقه على كافة زوار المنصة وجميع الأجهزة حول العالم لحظياً.`,
      });
    } catch {
      toast({
        title: "تم التطبيق محلياً",
        description: "تم تفعيل الثيم في المتصفح وجاري حفظه سحابياً.",
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Publish current private preview to all visitors
  const handlePublishPreviewToAll = async () => {
    setIsApplying(true);
    const themeToPublish = currentDeviceTheme as "classic" | "charcoal" | "midnight";
    try {
      setThemeScope("all");
      localStorage.setItem("alm_theme_scope", "all");
      setForm((prev) => ({ ...prev, activeThemeId: themeToPublish }));
      await updateSettings({ activeThemeId: themeToPublish });
      toast({
        title: "تم نشر الثيم لكافة الزوار بنجاح ✓",
        description: `تم تحويل ثيم (${getThemeName(themeToPublish)}) من معاينة خاصة إلى الثيم المعتمد الرسمي لكافة زوار المنصة والأجهزة.`,
      });
    } catch {
      toast({
        title: "تعذر النشر السحابي",
        description: "يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Discard private preview and return to public cloud theme
  const handleDiscardPreview = () => {
    const target = (settings.activeThemeId || "midnight") as "classic" | "charcoal" | "midnight";
    setThemeScope("all");
    setCurrentDeviceTheme(target);
    try {
      localStorage.setItem("alm_theme_scope", "all");
      localStorage.setItem("alm_active_theme", target);
      document.documentElement.setAttribute("data-theme", target);
      syncThemeColor(target);
    } catch {}
    toast({
      title: "تم إلغاء المعاينة الخاصة",
      description: `تمت استعادة ثيم الموقع العام المعتمد (${getThemeName(target)}) على جهازك.`,
    });
  };

  function getThemeName(id: string) {
    if (id === "midnight") return "الليل الفولاذي وذهب الصحراء";
    if (id === "charcoal") return "الفحم والذهب الساتان العصري";
    return "الثيم الملكي الكلاسيكي";
  }

  const isPreviewingDifferentTheme = themeScope === "admin_only" && currentDeviceTheme !== publicTheme;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* ── 1. Top Header & Live Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">محرك الثيمات والهوية اللونية</h3>
            <p className="text-[11px] text-muted-foreground">تبديل فوري ومستقل بين ثيمات المنصة مع تحكم دقيق في نطاق العرض.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {themeScope === "admin_only" ? (
            <Badge variant="outline" className="px-2.5 py-1 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              معاينة خاصة نشطة
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2.5 py-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              نشر عام للزوار
            </Badge>
          )}

          <Badge variant="secondary" className="px-2.5 py-1 text-[11px] font-mono">
            {getThemeName(currentDeviceTheme)}
          </Badge>
        </div>
      </div>

      {/* ── 2. Interactive Theme Scope Selector (خيار نطاق التطبيق) ── */}
      <div className="p-3.5 rounded-xl bg-card border border-border/70 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold text-foreground">نطاق تطبيق الثيم عند التغيير:</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            اختر لمن يظهر الثيم عند التبديل
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option A: Public / All Visitors */}
          <button
            type="button"
            onClick={() => handleScopeChange("all")}
            className={`p-3 rounded-xl border text-right transition-all flex items-start gap-3 relative ${
              themeScope === "all"
                ? "border-accent bg-accent/10 ring-1 ring-accent/30 shadow-xs"
                : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              themeScope === "all" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <Globe className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-foreground">تطبيق على كامل المنصة (لجميع الزوار)</span>
                {themeScope === "all" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                يُحفظ سحابياً فوراً ويُطبّق على كافة زوار الموقع وجميع الأجهزة المتصلة حول العالم لحظياً.
              </p>
            </div>
          </button>

          {/* Option B: Admin Private Preview Only */}
          <button
            type="button"
            onClick={() => handleScopeChange("admin_only")}
            className={`p-3 rounded-xl border text-right transition-all flex items-start gap-3 relative ${
              themeScope === "admin_only"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30 shadow-xs"
                : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              themeScope === "admin_only" ? "bg-amber-500 text-black font-bold" : "bg-muted text-muted-foreground"
            }`}>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-foreground">معاينة خاصة بي كمدير فقط</span>
                {themeScope === "admin_only" && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                يُطبّق على متصفحك وجهازك الحالي فقط للتجربة والمعاينة، دون التأثير على زوار الموقع إطلاقاً.
              </p>
            </div>
          </button>
        </div>

        {/* Informational Banner if in Admin Preview */}
        {themeScope === "admin_only" && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Eye className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-bold">وضع المعاينة الخاصة نشط: </span>
                <span>
                  أنت ترى الآن ثيم <strong>({getThemeName(currentDeviceTheme)})</strong>، بينما يرى زوار الموقع العام ثيم <strong>({getThemeName(publicTheme)})</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={isApplying}
                onClick={handlePublishPreviewToAll}
                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs"
              >
                <Send className="h-3 w-3" />
                نشر هذا الثيم للجميع الآن
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isApplying}
                onClick={handleDiscardPreview}
                className="h-7 px-2.5 rounded-lg border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                إلغاء المعاينة
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Theme Selection Cards Grid (3 Themes) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Theme 1: Midnight Steel & Desert Gold */}
        <div 
          className={`p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer relative bg-card ${
            currentDeviceTheme === "midnight"
              ? "border-[#BC9876] shadow-sm ring-1 ring-[#BC9876]/30" 
              : "border-border/70 hover:border-border"
          }`}
          onClick={() => handleApplyTheme("midnight")}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#202332] border border-[#BC9876]/50 flex items-center justify-center text-[#BC9876] shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground leading-tight">الليل الفولاذي وذهب الصحراء</h4>
                <span className="text-[10px] text-muted-foreground font-mono">Midnight Steel & Desert Gold</span>
              </div>
            </div>

            {currentDeviceTheme === "midnight" ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                themeScope === "admin_only"
                  ? "bg-amber-500 text-black"
                  : "bg-[#BC9876] text-[#1C1E2B]"
              }`}>
                <Check className="h-2.5 w-2.5 stroke-[3]" />
                {themeScope === "admin_only" ? "قيد المعاينة" : "مفعّل للجميع"}
              </span>
            ) : publicTheme === "midnight" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-medium shrink-0">
                المعتمد للزوار
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">انقر للتفعيل</span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            كحلي ليلي فحمي (#202332)، بطاقات فولاذية زجاجية ناعمة (#434E60)، ذهب رملي دافئ (#BC9876)، وفضي ضبابي (#8B9A9F).
          </p>

          {/* Mini Color Dots */}
          <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#202332] border border-white/20 shadow-2xs" title="خلفية #202332" />
              <span className="w-4 h-4 rounded-full bg-[#434E60] border border-white/20 shadow-2xs" title="بطاقة فولاذية #434E60" />
              <span className="w-4 h-4 rounded-full bg-[#BC9876] border border-white/20 shadow-2xs" title="ذهب رملي #BC9876" />
              <span className="w-4 h-4 rounded-full bg-[#8B9A9F] border border-white/20 shadow-2xs" title="فضي ضبابي #8B9A9F" />
            </div>

            <Button
              type="button"
              size="sm"
              disabled={isApplying || currentDeviceTheme === "midnight"}
              onClick={(e) => {
                e.stopPropagation();
                handleApplyTheme("midnight");
              }}
              className="h-7 px-2.5 rounded-lg bg-[#BC9876] hover:bg-[#A88563] text-[#1C1E2B] font-bold text-[11px]"
            >
              {currentDeviceTheme === "midnight" 
                ? (themeScope === "admin_only" ? "معاين حالياً" : "مفعّل للجميع")
                : (themeScope === "admin_only" ? "معاينة على جهازي" : "تفعيل للجميع")}
            </Button>
          </div>
        </div>
        
        {/* Theme 2: Modern Dark Charcoal & Royal Satin Gold */}
        <div 
          className={`p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer relative bg-card ${
            currentDeviceTheme === "charcoal"
              ? "border-[#C5A059] shadow-sm ring-1 ring-[#C5A059]/30" 
              : "border-border/70 hover:border-border"
          }`}
          onClick={() => handleApplyTheme("charcoal")}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#181C20] border border-[#C5A059]/50 flex items-center justify-center text-[#C5A059] shrink-0">
                <Palette className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground leading-tight">الفحم والذهب الساتان العصري</h4>
                <span className="text-[10px] text-muted-foreground font-mono">Dark Charcoal & Royal Satin Gold</span>
              </div>
            </div>

            {currentDeviceTheme === "charcoal" ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                themeScope === "admin_only"
                  ? "bg-amber-500 text-black"
                  : "bg-[#C5A059] text-[#181C20]"
              }`}>
                <Check className="h-2.5 w-2.5 stroke-[3]" />
                {themeScope === "admin_only" ? "قيد المعاينة" : "مفعّل للجميع"}
              </span>
            ) : publicTheme === "charcoal" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-medium shrink-0">
                المعتمد للزوار
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">انقر للتفعيل</span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            رمادي فحمي هادئ (#181C20)، لوحة فحمية زجاجية (#22272D)، وأزرار ولمسات ذهب ساتان ملكي متزن (#C5A059).
          </p>

          {/* Mini Color Dots */}
          <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#181C20] border border-white/20 shadow-2xs" title="خلفية #181C20" />
              <span className="w-4 h-4 rounded-full bg-[#22272D] border border-white/20 shadow-2xs" title="لوحة #22272D" />
              <span className="w-4 h-4 rounded-full bg-[#333C46] border border-white/20 shadow-2xs" title="إطار #333C46" />
              <span className="w-4 h-4 rounded-full bg-[#C5A059] border border-white/20 shadow-2xs" title="ذهب ساتان #C5A059" />
            </div>

            <Button
              type="button"
              size="sm"
              disabled={isApplying || currentDeviceTheme === "charcoal"}
              onClick={(e) => {
                e.stopPropagation();
                handleApplyTheme("charcoal");
              }}
              className="h-7 px-2.5 rounded-lg bg-[#C5A059] hover:bg-[#B38E47] text-[#181C20] font-bold text-[11px]"
            >
              {currentDeviceTheme === "charcoal" 
                ? (themeScope === "admin_only" ? "معاين حالياً" : "مفعّل للجميع")
                : (themeScope === "admin_only" ? "معاينة على جهازي" : "تفعيل للجميع")}
            </Button>
          </div>
        </div>

        {/* Theme 3: Classic Imperial Gold & Midnight Navy */}
        <div 
          className={`p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer relative bg-card ${
            currentDeviceTheme === "classic" 
              ? "border-[#A9927D] shadow-sm ring-1 ring-[#A9927D]/30" 
              : "border-border/70 hover:border-border"
          }`}
          onClick={() => handleApplyTheme("classic")}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#10202D] border border-[#A9927D]/50 flex items-center justify-center text-[#A9927D] shrink-0">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground leading-tight">الثيم الملكي الكلاسيكي</h4>
                <span className="text-[10px] text-muted-foreground font-mono">Warm Sand Taupe & Navy</span>
              </div>
            </div>

            {currentDeviceTheme === "classic" ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                themeScope === "admin_only"
                  ? "bg-amber-500 text-black"
                  : "bg-[#A9927D] text-[#10202D]"
              }`}>
                <Check className="h-2.5 w-2.5 stroke-[3]" />
                {themeScope === "admin_only" ? "قيد المعاينة" : "مفعّل للجميع"}
              </span>
            ) : publicTheme === "classic" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-medium shrink-0">
                المعتمد للزوار
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">انقر للتفعيل</span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            كحلي ليلي فاخر (#10202D)، كحلي ثانوي (#173044)، بيج رملي دافئ (#A9927D)، ونصوص عاجية دافئة.
          </p>

          {/* Mini Color Dots */}
          <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#10202D] border border-white/20 shadow-2xs" title="خلفية #10202D" />
              <span className="w-4 h-4 rounded-full bg-[#173044] border border-white/20 shadow-2xs" title="لوحة #173044" />
              <span className="w-4 h-4 rounded-full bg-[#A9927D] border border-white/20 shadow-2xs" title="رملي دافئ #A9927D" />
              <span className="w-4 h-4 rounded-full bg-[#F5F3EE] border border-slate-300 shadow-2xs" title="عاجي #F5F3EE" />
            </div>

            <Button
              type="button"
              size="sm"
              disabled={isApplying || currentDeviceTheme === "classic"}
              onClick={(e) => {
                e.stopPropagation();
                handleApplyTheme("classic");
              }}
              className="h-7 px-2.5 rounded-lg bg-[#10202D] hover:bg-[#183144] border border-[#A9927D]/50 text-[#A9927D] font-bold text-[11px]"
            >
              {currentDeviceTheme === "classic" 
                ? (themeScope === "admin_only" ? "معاين حالياً" : "مفعّل للجميع")
                : (themeScope === "admin_only" ? "معاينة على جهازي" : "تفعيل للجميع")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── 4. Ultra-Compact Live Preview Strip ── */}
      <div className="p-3 rounded-xl bg-card border border-border/70 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Eye className="h-3.5 w-3.5 text-accent" />
            <span>معاينة حية سريعة للعناصر</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {getThemeName(currentDeviceTheme)} {themeScope === "admin_only" && "(معاينة خاصة)"}
          </span>
        </div>

        {currentDeviceTheme === "midnight" ? (
          /* Compact Midnight Mockup */
          <div className="p-2.5 rounded-lg bg-[#202332] border border-[#434E60] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-md bg-[#BC9876] text-[#1C1E2B] text-[10px] font-bold shadow-2xs flex items-center gap-1">
                <Plus className="h-3 w-3 stroke-[2.5]" />
                أعرض عقارك
              </div>
              <div className="px-2 py-1 rounded-md bg-[#2B3140] border border-[#434E60] text-[#FFFFFF] text-[10px] font-medium">
                التشطيبات
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 px-2 rounded-md bg-[#2B3140] border border-[#434E60] flex-1 max-w-sm w-full justify-between">
              <div className="flex items-center gap-1 text-[10px] text-[#8B9A9F]">
                <Search className="h-3 w-3 text-[#BC9876]" />
                <span>ابحث عن عقار...</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#BC9876] text-[#1C1E2B] text-[9px] font-bold">
                بحث
              </span>
            </div>
          </div>
        ) : currentDeviceTheme === "charcoal" ? (
          /* Compact Charcoal Mockup */
          <div className="p-2.5 rounded-lg bg-[#181C20] border border-[#333C46] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-md bg-[#C5A059] text-[#181C20] text-[10px] font-bold shadow-2xs flex items-center gap-1">
                <Plus className="h-3 w-3 stroke-[2.5]" />
                أعرض عقارك
              </div>
              <div className="px-2 py-1 rounded-md bg-[#22272D] border border-[#333C46] text-[#F8FAFC] text-[10px] font-medium">
                التشطيبات
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 px-2 rounded-md bg-[#22272D] border border-[#333C46] flex-1 max-w-sm w-full justify-between">
              <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                <Search className="h-3 w-3 text-[#C5A059]" />
                <span>ابحث عن عقار...</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#C5A059] text-[#181C20] text-[9px] font-bold">
                بحث
              </span>
            </div>
          </div>
        ) : (
          /* Compact Classic Mockup */
          <div className="p-2.5 rounded-lg bg-[#10202D] border border-[#A9927D]/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-md bg-[#10202D] border border-[#A9927D]/50 text-[#A9927D] text-[10px] font-bold shadow-2xs flex items-center gap-1">
                <Plus className="h-3 w-3 stroke-[2.5]" />
                أعرض عقارك
              </div>
              <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">
                التشطيبات
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 px-2 rounded-md bg-[#173044] border border-white/10 flex-1 max-w-sm w-full justify-between">
              <div className="flex items-center gap-1 text-[10px] text-white/60">
                <Search className="h-3 w-3 text-[#A9927D]" />
                <span>ابحث عن عقار...</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#A9927D] text-[#10202D] text-[9px] font-bold">
                بحث
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
