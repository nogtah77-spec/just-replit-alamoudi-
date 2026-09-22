import { useState, useRef, useCallback } from "react";
import { useData } from "@/context/DataContext";
import type { Ad, AdType } from "@/context/DataContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import {
  Pencil, Trash2, Plus, Image as ImageIcon, ExternalLink,
  Eye, EyeOff, Clock, GripVertical, Monitor, Tablet, Smartphone,
  CheckCircle2, CalendarClock, XCircle, MinusCircle, MousePointerClick, TrendingUp,
  AlertTriangle, UploadCloud, BarChart2, Download, LayoutTemplate, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  type AdTemplate,
  type AdSlotType,
  SLOT_TEMPLATES,
  downloadTemplateGuide,
} from "@/lib/adTemplates";

// ─── حساب حالة الإعلان ──────────────────────────────────────────────────────

/** يفسّر تاريخ YYYY-MM-DD كتوقيت محلي لتجنب فروق المنطقة الزمنية */
function localDate(dateStr: string, endOfDay = false): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getAdStatus(ad: Ad): "active" | "scheduled" | "expired" | "disabled" {
  if (!ad.active) return "disabled";
  const now = new Date();
  if (ad.startDate && localDate(ad.startDate)       > now) return "scheduled";
  if (ad.endDate   && localDate(ad.endDate, true)   < now) return "expired";
  return "active";
}

const STATUS_CONFIG = {
  active:   { label: "نشط",   color: "bg-green-100 text-green-800 border-green-200",      icon: CheckCircle2 },
  scheduled:{ label: "مجدول", color: "bg-blue-100 text-blue-800 border-blue-200",         icon: CalendarClock },
  expired:  { label: "منتهي", color: "bg-red-100 text-red-800 border-red-200",            icon: XCircle },
  disabled: { label: "معطّل", color: "bg-neutral-100 text-neutral-600 border-neutral-200", icon: MinusCircle },
};

// ─── معالجة الصورة تلقائياً + تحويل WebP ────────────────────────────────────
// يقبل أي صورة بأي أبعاد ويعالجها إلى المقاس المستهدف تلقائياً.
// الخوارزمية:
//   • نسبة العرض قريبة (< 15% فرق) → Smart Cover Crop من المركز
//   • نسبة العرض مختلفة (≥ 15% فرق) → Fit داخل الإطار + خلفية blurred تملأ الباقي
// الإدخال: حتى 20 MB — الإخراج: WebP < 3 MB بضغط تلقائي.

const MAX_INPUT_BYTES  = 20 * 1024 * 1024;   // 20 MB مدخل
const MAX_OUTPUT_B64   = 3 * 1024 * 1024 * 1.38; // ≈ 3 MB binary → base64 overhead

type ProcessMode = "resize" | "crop" | "fit+blur";

interface ImageResult {
  dataUrl:     string;
  width:       number;
  height:      number;
  origW?:      number;
  origH?:      number;
  processMode?: ProcessMode;
  finalQuality?: number;
  error?:      string;
}

async function processImage(
  file: File,
  template: AdTemplate,
): Promise<ImageResult> {
  if (file.size > MAX_INPUT_BYTES)
    return { dataUrl: "", width: 0, height: 0, error: "حجم الملف كبير — الحد الأقصى للإدخال 20 ميجابايت" };

  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const tw = template.width;
      const th = template.height;

      // ── تقليص بنسبة الأبعاد الأصلية — لا اقتطاع، لا blur ──
      // الـ box الإعلاني يتكيف مع ارتفاع الصورة تلقائياً في العرض
      const MAX_H = 800;                               // حد أقصى للارتفاع
      const scale = Math.min(1, tw / sw, MAX_H / sh); // لا تكبير، لا تصغير إلا للحاجة
      const outW  = Math.round(sw * scale);
      const outH  = Math.round(sh * scale);

      const canvas = document.createElement("canvas");
      canvas.width  = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, outW, outH);

      const mode: ProcessMode = "resize";

      // ── ضغط تلقائي إلى WebP < 3 MB ──
      const qualities = [0.92, 0.82, 0.72, 0.60, 0.48, 0.36];
      let dataUrl = "";
      let usedQuality = 0.92;

      for (const q of qualities) {
        dataUrl = canvas.toDataURL("image/webp", q);
        usedQuality = q;
        if (dataUrl.length <= MAX_OUTPUT_B64) break;
      }

      if (dataUrl.length > MAX_OUTPUT_B64) {
        resolve({ dataUrl: "", width: 0, height: 0, error: "لا يمكن ضغط الصورة إلى أقل من 3 ميجابايت — جرّب صورة أبسط أو أصغر" });
        return;
      }

      resolve({
        dataUrl,
        width: outW, height: outH,
        origW: sw, origH: sh,
        processMode: mode,
        finalQuality: Math.round(usedQuality * 100),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ dataUrl: "", width: 0, height: 0, error: "تعذّر قراءة الصورة" });
    };
    img.src = url;
  });
}

// ─── مكوّن رفع الصورة ─────────────────────────────────────────────────────────

function ImageUploader({
  label,
  sublabel,
  value,
  template,
  onResult,
  required,
}: {
  label:    string;
  sublabel: string;
  value:    string;
  template: AdTemplate;
  onResult: (dataUrl: string, error?: string) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string>();
  const [dragging,    setDragging]    = useState(false);
  const [processInfo, setProcessInfo] = useState<Pick<ImageResult, "origW"|"origH"|"processMode"|"finalQuality"> | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(undefined);
    setProcessInfo(null);
    const result = await processImage(file, template);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      onResult("", result.error);
    } else {
      setError(undefined);
      setProcessInfo({ origW: result.origW, origH: result.origH, processMode: result.processMode, finalQuality: result.finalQuality });
      onResult(result.dataUrl);
    }
  };

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  // مستطيل توضيحي بعرض 80px وارتفاع محسوب من النسبة الفعلية (حد أدنى 18px)
  const diagW = 80;
  const diagH = Math.max(18, Math.round(diagW * template.height / template.width));

  return (
    <div className="space-y-2.5">

      {/* ── رأس: العنوان الوصفي ── */}
      <Label className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive mr-1">*</span>}
      </Label>

      {/* ══ بطاقة المواصفات الاحترافية ══ */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">

        {/* ─ الصف الأول: اسم القالب + الأبعاد + الرسم التوضيحي ─ */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-bold text-sm text-foreground leading-none">{template.name}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                ✦ يُعالج تلقائياً
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                {template.width} × {template.height} px
              </span>
              <span className="text-xs text-muted-foreground">
                Ratio: <strong className="text-foreground">{template.ratio}</strong>
              </span>
            </div>
          </div>
          {/* مستطيل توضيحي */}
          <div className="shrink-0">
            <div
              className="relative border border-accent/40 rounded-sm overflow-hidden bg-white/80"
              style={{ width: `${diagW}px`, height: `${diagH}px` }}
            >
              {template.zones.map(zone => (
                <div
                  key={zone.label}
                  className="absolute"
                  style={{
                    left:       `${(zone.x / template.width)  * 100}%`,
                    top:        `${(zone.y / template.height) * 100}%`,
                    width:      `${(zone.w / template.width)  * 100}%`,
                    height:     `${(zone.h / template.height) * 100}%`,
                    background: zone.color,
                    border:     `1px solid ${zone.strokeColor}50`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─ الصف الثاني: صيغ الملفات ─ */}
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 font-medium">صيغ مقبولة</p>
          <div className="flex gap-2">
            {["PNG", "JPG", "WEBP"].map(fmt => (
              <span
                key={fmt}
                className="flex-1 text-center text-xs font-bold py-1.5 rounded-lg border border-border bg-muted text-foreground tracking-widest"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>

        {/* ─ الصف الثالث: الإدخال / الإخراج ─ */}
        <div className="px-4 py-2.5 border-b border-border grid grid-cols-2 divide-x divide-x-reverse divide-border">
          <div className="pl-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 font-medium">الإدخال</p>
            <p className="text-xs font-bold text-foreground">أي حجم حتى 20 MB</p>
          </div>
          <div className="pr-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 font-medium">الإخراج</p>
            <p className="text-xs font-bold text-foreground">WebP &lt; 3 MB</p>
          </div>
        </div>

        {/* ─ الصف الرابع: المنطقة الآمنة + زر التحميل ─ */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 font-medium">Safe Area</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {template.zones.map(zone => (
                <span key={zone.label} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: zone.strokeColor }}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {zone.label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadTemplateGuide(template)}
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/15 px-3 py-2 rounded-lg transition-colors border border-accent/20"
          >
            <Download className="h-3.5 w-3.5" />
            تحميل القالب
          </button>
        </div>
      </div>

      {/* ── منطقة الرفع (drag & drop) ── */}
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-3 space-y-2 transition-all duration-200",
          dragging
            ? "border-accent bg-accent/5 scale-[1.01]"
            : "border-border bg-muted/30 hover:border-muted-foreground/40"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragging && (
          <div className="text-center py-1 text-xs text-accent font-semibold animate-pulse">
            ↓ أسقط الصورة هنا
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="https://... أو ارفع ملفاً"
            value={value}
            onChange={e => { setProcessInfo(null); onResult(e.target.value); }}
            className="flex-1 text-sm h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 h-9"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {loading ? "جارٍ المعالجة…" : "رفع"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {!dragging && !value && (
          <p className="text-[11px] text-muted-foreground text-center">
            اسحب وأسقط الصورة أو انقر «رفع» · أي حجم أو أبعاد — تُعالج تلقائياً إلى {template.width}×{template.height}px
          </p>
        )}
      </div>

      {/* ── رسالة الخطأ ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">تعذّرت المعالجة</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ── معاينة الصورة المرفوعة ── */}
      {value && !error && (
        <div className="space-y-1.5">
          {/* زر حذف الصورة */}
          <button
            type="button"
            onClick={() => {
              setProcessInfo(null);
              setError(undefined);
              onResult("");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-semibold py-2 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            حذف الصورة
          </button>

          {/* المعاينة */}
          <div
            className="relative rounded-lg overflow-hidden border border-border bg-muted shadow-sm"
            style={{ aspectRatio: `${template.width}/${template.height}` }}
          >
            <img
              src={value}
              alt="معاينة"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* مصدر الأبعاد الأصلية */}
            {processInfo?.origW && (
              <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm">
                {processInfo.origW}×{processInfo.origH}px → {template.width}×{template.height}px
              </div>
            )}

            {/* شارة نتيجة المعالجة */}
            {processInfo && (
              <div className="absolute top-1.5 left-1.5 bg-green-500/90 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                ✓{" "}
                {processInfo.processMode === "resize"   && "WebP محسّن"}
                {processInfo.processMode === "crop"     && "Crop ذكي · WebP"}
                {processInfo.processMode === "fit+blur" && "Fit + خلفية · WebP"}
                {processInfo.finalQuality !== undefined && processInfo.finalQuality < 92 && ` · جودة ${processInfo.finalQuality}%`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── معاينة مباشرة (Desktop / Tablet / Mobile) ──────────────────────────────

type DeviceTab = "desktop" | "tablet" | "mobile";

function LivePreview({
  adType,
  desktopSrc,
  mobileSrc,
  title,
}: {
  adType:     AdType;
  desktopSrc: string;
  mobileSrc:  string;
  title:      string;
}) {
  const [device,     setDevice]     = useState<DeviceTab>("desktop");
  const [showGuides, setShowGuides] = useState(true);

  const isPremium  = adType === "premium";
  const slotConfig = SLOT_TEMPLATES[adType as AdSlotType];

  // الـ template المناسب للجهاز
  const template = device === "desktop" ? slotConfig.desktop : slotConfig.mobile;

  // الصورة المناسبة للجهاز (desktop preview uses desktop image, tablet/mobile use mobile image)
  const src = device === "desktop"
    ? (desktopSrc || mobileSrc)
    : (mobileSrc  || desktopSrc);

  const devices: { key: DeviceTab; label: string; icon: typeof Monitor }[] = [
    { key: "desktop", label: "ديسكتوب", icon: Monitor },
    { key: "tablet",  label: "تابلت",   icon: Tablet },
    { key: "mobile",  label: "جوال",    icon: Smartphone },
  ];

  // حدود المنطقة الآمنة بالنسبة المئوية
  const safeEdge = (template.bleed + template.safeInset);
  const safePct  = {
    top:    `${(safeEdge / template.height) * 100}%`,
    right:  `${(safeEdge / template.width)  * 100}%`,
    bottom: `${(safeEdge / template.height) * 100}%`,
    left:   `${(safeEdge / template.width)  * 100}%`,
  };

  return (
    <div className="space-y-3">
      {/* ── رأس: عنوان + تبويب الأجهزة + زر الأدلة ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-semibold">معاينة مباشرة</Label>
        <div className="flex items-center gap-2">
          {/* زر toggle الأدلة */}
          <button
            type="button"
            onClick={() => setShowGuides(g => !g)}
            className={cn(
              "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors",
              showGuides
                ? "bg-accent/10 border-accent/30 text-accent"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutTemplate className="h-3 w-3" />
            {showGuides ? "إخفاء الأدلة" : "إظهار الأدلة"}
          </button>

          {/* تبويب الأجهزة */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {devices.map(d => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
                  device === d.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <d.icon className="h-3.5 w-3.5" />
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── صندوق المعاينة — الارتفاع يتكيف مع الصورة تلقائياً ── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-neutral-200 mx-auto transition-all",
          device === "mobile"  && "max-w-[280px]",
          device === "tablet"  && "max-w-[480px]",
          device === "desktop" && "w-full"
        )}
      >
        {src ? (
          <img
            src={src}
            alt="معاينة"
            className="w-full h-auto block"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40 py-10">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">ارفع صورة لرؤية المعاينة</span>
          </div>
        )}

        {/* ── أدلة التصميم (admin only) ── */}
        {showGuides && (
          <div className="absolute inset-0 pointer-events-none">
            {/* المنطقة الآمنة — حد متقطع أحمر */}
            <div
              className="absolute border border-dashed border-red-400/70 rounded-sm"
              style={safePct}
            >
              <span className="absolute top-0 right-0 translate-y-[-100%] text-[7px] font-bold text-red-400/90 px-1 bg-black/20 rounded-t leading-tight">
                Safe
              </span>
            </div>

            {/* مناطق Logo / Title / CTA */}
            {template.zones.map(zone => (
              <div
                key={zone.label}
                className="absolute rounded-sm"
                style={{
                  left:       `${(zone.x / template.width)  * 100}%`,
                  top:        `${(zone.y / template.height) * 100}%`,
                  width:      `${(zone.w / template.width)  * 100}%`,
                  height:     `${(zone.h / template.height) * 100}%`,
                  background: zone.color,
                  border:     `1px solid ${zone.strokeColor}60`,
                }}
              >
                <span
                  className="absolute top-0 left-0 text-[6px] font-bold text-white px-0.5 leading-tight rounded-br"
                  style={{ background: zone.strokeColor }}
                >
                  {zone.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* عنوان الإعلان */}
        {title && src && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 pointer-events-none">
            <p className="text-white text-xs font-semibold text-right line-clamp-1">{title}</p>
          </div>
        )}
      </div>

      {/* معلومات القالب */}
      <p className="text-xs text-muted-foreground text-center">
        {template.name} · {template.width}×{template.height}px ({template.ratio})
        {device !== "desktop" && <span className="text-muted-foreground/60"> · صورة الجوال/التابلت</span>}
      </p>
    </div>
  );
}

// ─── بيانات الإعلان الافتراضية ──────────────────────────────────────────────

type AdForm = Omit<Ad, "id" | "views" | "clicks">;

function emptyAd(type: AdType = "secondary"): AdForm {
  return {
    type,
    desktopImageUrl: "",
    mobileImageUrl:  "",
    imageUrl:        "",
    linkUrl:         "",
    whatsappNumber:  "",
    whatsappMessage: "",
    linkPriority:    "whatsapp",
    title:           "",
    order:           1,
    duration:        6,
    startDate:       "",
    endDate:         "",
    active:          true,
  };
}

// ─── نافذة الإضافة / التعديل ──────────────────────────────────────────────────

function AdDialog({
  open,
  title,
  initial,
  onSave,
  onClose,
}: {
  open:    boolean;
  title:   string;
  initial: AdForm;
  onSave:  (form: AdForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdForm>(initial);
  const patch = (p: Partial<AdForm>) => setForm(v => ({ ...v, ...p }));

  const prevOpen = useRef(false);
  if (open && !prevOpen.current) { setForm(initial); }
  prevOpen.current = open;

  const isPremium       = form.type === "premium";
  const slotConfig      = SLOT_TEMPLATES[form.type as AdSlotType];
  const desktopTemplate = slotConfig.desktop;
  const mobileTemplate  = slotConfig.mobile;

  const [desktopErr, setDesktopErr] = useState<string>();

  const hasAnyImage = !!(form.desktopImageUrl?.trim() || form.mobileImageUrl?.trim());

  // ─── التحقق من التواريخ ──────────────────────────────────────────────────
  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const parsedEnd  = form.endDate   ? new Date(form.endDate   + "T00:00:00") : null;
  const parsedStart= form.startDate ? new Date(form.startDate + "T00:00:00") : null;
  const dateErr: string | null =
    parsedEnd && parsedEnd < today
      ? "تاريخ الانتهاء في الماضي — سيظهر الإعلان كـ «منتهي» فوراً"
      : parsedStart && parsedEnd && parsedEnd <= parsedStart
        ? "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية"
        : null;

  const handleSave = () => {
    if (!hasAnyImage) return;
    if (form.desktopImageUrl?.trim() && desktopErr) return;
    if (dateErr) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* نوع الإعلان */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">نوع الإعلان</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["premium", "secondary"] as AdType[]).map(t => {
                const cfg = SLOT_TEMPLATES[t as AdSlotType];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (form.type !== t) {
                        patch({ type: t, desktopImageUrl: "", mobileImageUrl: "" });
                        setDesktopErr(undefined);
                      }
                    }}
                    className={cn(
                      "rounded-xl border-2 p-3 text-right transition-all",
                      form.type === t
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <div className="font-semibold text-sm mb-0.5">
                      {t === "premium" ? "🏆 Premium" : "📌 Secondary"}
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>ديسكتوب: {cfg.desktop.width}×{cfg.desktop.height}px ({cfg.desktop.ratio})</div>
                      <div>جوال: {cfg.mobile.width}×{cfg.mobile.height}px ({cfg.mobile.ratio})</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* رفع الصور */}
          <ImageUploader
            key={`desktop-${form.type}`}
            label={`صورة الديسكتوب — ${desktopTemplate.width}×${desktopTemplate.height}px`}
            sublabel="تظهر على الشاشات ≥1024px"
            value={form.desktopImageUrl}
            template={desktopTemplate}
            required
            onResult={(url, err) => {
              patch({ desktopImageUrl: url || "" });
              setDesktopErr(err);
            }}
          />

          <ImageUploader
            key={`mobile-${form.type}`}
            label={`صورة الجوال والتابلت — ${mobileTemplate.width}×${mobileTemplate.height}px — اختياري`}
            sublabel="تظهر على الشاشات <1024px · اختياري — بدونها لن يظهر الإعلان على الجوال"
            value={form.mobileImageUrl || ""}
            template={mobileTemplate}
            onResult={(url) => patch({ mobileImageUrl: url || "" })}
          />

          <div className="border-t border-border" />

          {/* معاينة مباشرة */}
          <LivePreview
            adType={form.type}
            desktopSrc={form.desktopImageUrl}
            mobileSrc={form.mobileImageUrl || ""}
            title={form.title || ""}
          />

          <div className="border-t border-border" />

          {/* بيانات الإعلان */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>العنوان <span className="text-muted-foreground text-xs">(اختياري — يظهر فوق الصورة)</span></Label>
              <Input
                placeholder="مثال: مجمع سكني فاخر — الساحل الشمالي"
                value={form.title ?? ""}
                onChange={e => patch({ title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>رقم واتساب <span className="text-muted-foreground text-xs">(اختياري — عند النقر يفتح محادثة مباشرة)</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="مثال: 201234567890 (بدون +)"
                  value={form.whatsappNumber ?? ""}
                  onChange={e => patch({ whatsappNumber: e.target.value })}
                  className="flex-1 text-left"
                  dir="ltr"
                />
                {form.whatsappNumber && (
                  <Button type="button" variant="outline" size="icon" asChild>
                    <a href={`https://wa.me/${form.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* رسالة الواتساب — تظهر فقط لو في رقم */}
            {!!form.whatsappNumber?.trim() && (
              <div className="space-y-1.5">
                <Label>رسالة الواتساب <span className="text-muted-foreground text-xs">(تظهر جاهزة للعميل عند الضغط)</span></Label>
                <textarea
                  rows={2}
                  placeholder={"السلام عليكم\nرأيت إعلانكم على منصة العمودي العقارية وأريد الاستفسار عن التشطيبات والديكور 🏠"}
                  value={form.whatsappMessage ?? ""}
                  onChange={e => patch({ whatsappMessage: e.target.value })}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>رابط الإعلان <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={form.linkUrl ?? ""}
                  onChange={e => patch({ linkUrl: e.target.value })}
                  className="flex-1"
                />
                {form.linkUrl && (
                  <Button type="button" variant="outline" size="icon" asChild>
                    <a href={form.linkUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* أولوية النقر — يظهر فقط لو الاثنان موجودان */}
            {!!(form.whatsappNumber?.trim() && form.linkUrl?.trim()) && (
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                <Label className="text-sm font-medium">عند النقر على الإعلان افتح:</Label>
                <div className="flex gap-2">
                  {(["whatsapp", "url"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => patch({ linkPriority: opt })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        (form.linkPriority ?? "whatsapp") === opt
                          ? "border-accent bg-accent text-accent-foreground font-medium"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      )}
                    >
                      {opt === "whatsapp" ? <><span>💬</span> واتساب</> : <><ExternalLink className="h-3.5 w-3.5" /> الرابط</>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  مدة الظهور (ثانية)
                </Label>
                <Input
                  type="number" min={2} max={60}
                  value={form.duration === 0 ? "" : (form.duration ?? "")}
                  onChange={e => {
                    const raw = e.target.value;
                    patch({ duration: raw === "" ? 0 : Number(raw) });
                  }}
                  onBlur={e => {
                    const v = Math.max(2, Math.min(60, Number(e.target.value) || 2));
                    patch({ duration: v });
                  }}
                  placeholder="6"
                />
              </div>
              <div className="space-y-1.5">
                <Label>ترتيب الظهور</Label>
                <Input
                  type="number" min={1}
                  value={form.order === 0 ? "" : (form.order ?? "")}
                  onChange={e => {
                    const raw = e.target.value;
                    patch({ order: raw === "" ? 0 : Number(raw) });
                  }}
                  onBlur={e => {
                    const v = Math.max(1, Number(e.target.value) || 1);
                    patch({ order: v });
                  }}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>تاريخ البداية <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
                  <Input type="date" value={form.startDate ?? ""} onChange={e => patch({ startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الانتهاء <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
                  <Input
                    type="date"
                    value={form.endDate ?? ""}
                    onChange={e => patch({ endDate: e.target.value })}
                    className={dateErr ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                </div>
              </div>
              {dateErr && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <span>⚠️</span> {dateErr}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="dlg-active"
                checked={form.active}
                onCheckedChange={v => patch({ active: v })}
              />
              <Label htmlFor="dlg-active" className="cursor-pointer">
                {form.active ? "مفعّل — يظهر للزوار فوراً" : "معطّل — مخفي عن الزوار"}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!hasAnyImage || (!!form.desktopImageUrl?.trim() && !!desktopErr) || !!dateErr}
            onClick={handleSave}
          >
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function Ads() {
  const { settings, addAd, updateAd, deleteAd, reorderAds } = useData();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const ads = [...(settings.ads ?? [])].sort((a, b) => a.order - b.order);

  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState<Ad | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [addType,      setAddType]      = useState<AdType>("secondary");

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const onDrop      = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === dropIdx) { setDragOver(null); return; }
    const reordered = [...ads];
    const [moved]   = reordered.splice(dragIdx.current, 1);
    reordered.splice(dropIdx, 0, moved);
    reorderAds(reordered);
    dragIdx.current = null;
    setDragOver(null);
  };
  const onDragEnd = () => { dragIdx.current = null; setDragOver(null); };

  const handleAdd = useCallback((form: Omit<Ad, "id" | "views" | "clicks">) => {
    addAd({ ...form, views: 0, clicks: 0, order: ads.length + 1 });
    setShowAdd(false);
    toast({ title: "تم إضافة الإعلان ✓" });
  }, [addAd, ads.length, toast]);

  const handleEdit = useCallback((form: Omit<Ad, "id" | "views" | "clicks">) => {
    if (!editTarget) return;
    updateAd(editTarget.id, form);
    setEditTarget(null);
    toast({ title: "تم تحديث الإعلان ✓" });
  }, [editTarget, updateAd, toast]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAd(deleteTarget.id);
    setDeleteTarget(null);
    toast({ title: "تم حذف الإعلان" });
  };

  const handleToggle = (ad: Ad) => updateAd(ad.id, { active: !ad.active });

  const totalViews  = ads.reduce((s, a) => s + (a.views  ?? 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks ?? 0), 0);
  const avgCTR      = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">

        <AdminPageHeader
          title="إدارة الإعلانات"
          subtitle={`${ads.length} إعلان — ${ads.filter(a => getAdStatus(a) === "active").length} نشط`}
          eyebrow="الترويج والظهور"
          icon={LayoutTemplate}
          actions={
            <>
              <Button
                variant="outline"
                className="h-10 gap-2 border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 hover:text-white"
                onClick={() => { setAddType("secondary"); setShowAdd(true); }}
              >
                <Plus className="h-4 w-4" /> إضافة إعلان ثانوي
              </Button>
              <Button
                className="h-10 gap-2 border border-[#C7B6A6] bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]"
                onClick={() => { setAddType("premium"); setShowAdd(true); }}
              >
                <Plus className="h-4 w-4" /> إضافة إعلان مميز
              </Button>
            </>
          }
        />

        {/* ─── بطاقات الإحصائيات ─── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "المشاهدات",  value: totalViews.toLocaleString("en-US"),  icon: Eye,              color: "text-blue-600" },
            { label: "النقرات",    value: totalClicks.toLocaleString("en-US"), icon: MousePointerClick, color: "text-green-600" },
            { label: "معدّل النقر", value: `${avgCTR}%`,               icon: TrendingUp,        color: "text-accent" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <s.icon className={cn("h-5 w-5 shrink-0", s.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold leading-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── قوالب الأدلة + شرح الأنواع ─── */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <p className="font-semibold">كيف يعمل نظام الإعلانات؟</p>

          {/* قوالب التحميل */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.values(SLOT_TEMPLATES) as { desktop: AdTemplate; mobile: AdTemplate }[]).flatMap(
              (s): AdTemplate[] => [s.desktop, s.mobile]
            ).map(tpl => (
              <button
                key={tpl.key}
                type="button"
                onClick={() => downloadTemplateGuide(tpl)}
                className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-2.5 hover:border-accent/40 hover:bg-accent/5 transition-colors text-right"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <Download className="h-3 w-3 text-accent shrink-0" />
                  <span className="text-[11px] font-semibold truncate">{tpl.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{tpl.width}×{tpl.height}px · {tpl.ratio}</span>
                <div className="flex gap-1 flex-wrap">
                  {tpl.zones.map(z => (
                    <span key={z.label} className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0 rounded-full border"
                      style={{ borderColor: `${z.strokeColor}40`, color: z.strokeColor, background: z.color }}>
                      {z.label}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-1.5 text-muted-foreground text-[13px] leading-relaxed border-t border-border pt-3">
            <p>🏆 <strong className="text-foreground">Premium:</strong> بانر رئيسي بعرض كامل — ديسكتوب <code className="text-[11px] bg-muted px-1 rounded">{SLOT_TEMPLATES.premium.desktop.width}×{SLOT_TEMPLATES.premium.desktop.height}px</code> · جوال <code className="text-[11px] bg-muted px-1 rounded">{SLOT_TEMPLATES.premium.mobile.width}×{SLOT_TEMPLATES.premium.mobile.height}px</code></p>
            <p>📌 <strong className="text-foreground">Secondary:</strong> إعلانان جنباً إلى جنب — ديسكتوب <code className="text-[11px] bg-muted px-1 rounded">{SLOT_TEMPLATES.secondary.desktop.width}×{SLOT_TEMPLATES.secondary.desktop.height}px</code> · جوال <code className="text-[11px] bg-muted px-1 rounded">{SLOT_TEMPLATES.secondary.mobile.width}×{SLOT_TEMPLATES.secondary.mobile.height}px</code></p>
            <p>🤖 <strong className="text-foreground">معالجة تلقائية:</strong> أي صورة بأي أبعاد تُقبل — تُحوَّل تلقائياً إلى المقاس المستهدف (Crop ذكي أو Fit + خلفية blurred).</p>
            <p>📦 <strong className="text-foreground">الحجم:</strong> إدخال حتى <code className="text-[11px] bg-muted px-1 rounded">20 MB</code> · إخراج WebP مضغوط تلقائياً &lt; <code className="text-[11px] bg-muted px-1 rounded">3 MB</code></p>
            <p>📱 <strong className="text-foreground">صورة الجوال:</strong> اختياري — تظهر على الشاشات &lt;1024px · بدونها لن يظهر الإعلان على الجوال.</p>
            <p>🔀 <strong className="text-foreground">الترتيب:</strong> اسحب الإعلانات لتغيير ترتيبها.</p>
          </div>
        </div>

        {/* ─── جدول الإعلانات ─── */}
        {ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-20 gap-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground font-medium">لا توجد إعلانات بعد</p>
            <div className="flex gap-2 mt-1">
              <Button variant="outline" className="gap-2" onClick={() => { setAddType("secondary"); setShowAdd(true); }}>
                <Plus className="h-4 w-4" /> إضافة إعلان ثانوي
              </Button>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setAddType("premium"); setShowAdd(true); }}>
                <Plus className="h-4 w-4" /> إضافة إعلان مميز
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* ── رأس الجدول (md+) ── */}
            <div
              className="hidden md:grid bg-muted/60 border-b border-border px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide"
              style={{ gridTemplateColumns: "2rem 5rem 1fr 6rem 7rem 5rem 5rem 4.5rem 9rem" }}
            >
              <span />
              <span>صورة</span>
              <span>الإعلان</span>
              <span className="text-center">النوع</span>
              <span className="text-center">الحالة</span>
              <span className="text-center">مشاهدات</span>
              <span className="text-center">نقرات</span>
              <span className="text-center">CTR</span>
              <span className="text-center">إجراءات</span>
            </div>

            {/* ── صفوف ── */}
            {ads.map((ad, idx) => {
              const status     = getAdStatus(ad);
              const cfg        = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              const ctr        = (ad.views ?? 0) > 0
                ? (((ad.clicks ?? 0) / (ad.views ?? 1)) * 100).toFixed(1) + "%"
                : "—";
              const thumb     = ad.desktopImageUrl || ad.mobileImageUrl || ad.imageUrl || "";
              const typeLabel = ad.type === "premium" ? "🏆 Premium" : "📌 Secondary";
              const typeCls   = ad.type === "premium"
                ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                : "border-blue-300 text-blue-700 bg-blue-50";

              const dragProps = {
                draggable:   true,
                onDragStart: () => onDragStart(idx),
                onDragOver:  (e: React.DragEvent) => onDragOver(e, idx),
                onDrop:      (e: React.DragEvent) => onDrop(e, idx),
                onDragEnd,
              };

              const actions = (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="إحصائيات"
                    onClick={() => navigate(`/admin/ads/${ad.id}/analytics`)}>
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title={ad.active ? "تعطيل" : "تفعيل"}
                    onClick={() => handleToggle(ad)}>
                    {ad.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="تعديل"
                    onClick={() => setEditTarget(ad)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="حذف"
                    onClick={() => setDeleteTarget(ad)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              );

              return (
                <div
                  key={ad.id}
                  className={cn(
                    "border-b border-border last:border-b-0 transition-colors",
                    dragOver === idx && "bg-accent/5",
                    !ad.active && "opacity-60"
                  )}
                >
                  {/* ── Desktop (md+): صف جدول ── */}
                  <div
                    {...dragProps}
                    className="hidden md:grid items-center gap-x-3 px-4 py-3 cursor-default"
                    style={{ gridTemplateColumns: "2rem 5rem 1fr 6rem 7rem 5rem 5rem 4.5rem 9rem" }}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="rounded-md overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
                      {thumb
                        ? <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground/30" /></div>
                      }
                    </div>

                    <div className="min-w-0">
                      {ad.title
                        ? <p className="font-semibold text-sm truncate">{ad.title}</p>
                        : <p className="text-sm text-muted-foreground italic">بدون عنوان</p>
                      }
                      {ad.linkUrl && (
                        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline inline-flex items-center gap-1 max-w-full truncate mt-0.5">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{ad.linkUrl}</span>
                        </a>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                        {ad.startDate && <span>من {ad.startDate}</span>}
                        {ad.endDate   && <span>حتى {ad.endDate}</span>}
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{ad.duration}ث</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn("text-[11px] whitespace-nowrap", typeCls)}>
                        {typeLabel}
                      </Badge>
                    </div>

                    <div className="flex justify-center">
                      <span className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap", cfg.color)}>
                        <StatusIcon className="h-3 w-3" />{cfg.label}
                      </span>
                    </div>

                    <div className="flex justify-center text-sm font-semibold tabular-nums">
                      {(ad.views ?? 0).toLocaleString("en-US")}
                    </div>
                    <div className="flex justify-center text-sm font-semibold tabular-nums">
                      {(ad.clicks ?? 0).toLocaleString("en-US")}
                    </div>
                    <div className="flex justify-center text-sm font-semibold tabular-nums">{ctr}</div>
                    <div className="flex items-center justify-center gap-0.5">{actions}</div>
                  </div>

                  {/* ── Mobile (< md): بطاقة ── */}
                  <div {...dragProps} className="md:hidden p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/30 mt-0.5 shrink-0">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="w-[4.5rem] h-10 rounded-md overflow-hidden bg-muted shrink-0">
                        {thumb
                          ? <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-3.5 w-3.5 text-muted-foreground/30" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        {ad.title
                          ? <p className="font-semibold text-sm leading-snug truncate">{ad.title}</p>
                          : <p className="text-sm text-muted-foreground italic">بدون عنوان</p>
                        }
                        {ad.whatsappNumber && (
                          <a href={`https://wa.me/${ad.whatsappNumber.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline inline-flex items-center gap-1 max-w-full truncate mt-0.5">
                            <span className="shrink-0">💬</span>
                            <span className="truncate">{ad.whatsappNumber}</span>
                          </a>
                        )}
                        {ad.linkUrl && (
                          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline inline-flex items-center gap-1 max-w-full truncate mt-0.5">
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{ad.linkUrl}</span>
                          </a>
                        )}
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
                          {ad.startDate && <span>من {ad.startDate}</span>}
                          {ad.endDate   && <span>حتى {ad.endDate}</span>}
                          <span className="inline-flex items-center gap-0.5"><Clock className="h-2 w-2" />{ad.duration}ث</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pr-6">
                      <Badge variant="outline" className={cn("text-[10px] h-5", typeCls)}>
                        {typeLabel}
                      </Badge>
                      <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border h-5", cfg.color)}>
                        <StatusIcon className="h-2.5 w-2.5" />{cfg.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden bg-border pr-6">
                      {[
                        { label: "مشاهدات", value: (ad.views  ?? 0).toLocaleString("en-US") },
                        { label: "نقرات",   value: (ad.clicks ?? 0).toLocaleString("en-US") },
                        { label: "CTR",     value: ctr },
                      ].map(stat => (
                        <div key={stat.label} className="bg-muted/50 text-center py-1.5">
                          <p className="text-[9px] text-muted-foreground leading-none mb-0.5">{stat.label}</p>
                          <p className="text-xs font-bold tabular-nums">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-0.5 pt-1.5 border-t border-border pr-6">
                      {actions}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── نافذة الإضافة ─── */}
      <AdDialog
        open={showAdd}
        title="إضافة إعلان جديد"
        initial={emptyAd(addType)}
        onSave={form => handleAdd(form as Omit<Ad, "id" | "views" | "clicks">)}
        onClose={() => setShowAdd(false)}
      />

      {/* ─── نافذة التعديل ─── */}
      {editTarget && (
        <AdDialog
          open={!!editTarget}
          title="تعديل الإعلان"
          initial={{
            type:            editTarget.type ?? "secondary",
            desktopImageUrl: editTarget.desktopImageUrl || editTarget.imageUrl || "",
            mobileImageUrl:  editTarget.mobileImageUrl ?? "",
            imageUrl:        editTarget.imageUrl ?? "",
            linkUrl:         editTarget.linkUrl        ?? "",
            whatsappNumber:  editTarget.whatsappNumber  ?? "",
            whatsappMessage: editTarget.whatsappMessage ?? "",
            linkPriority:    editTarget.linkPriority    ?? "whatsapp",
            title:           editTarget.title    ?? "",
            order:           editTarget.order,
            duration:        editTarget.duration ?? 6,
            startDate:       editTarget.startDate ?? "",
            endDate:         editTarget.endDate   ?? "",
            active:          editTarget.active,
          }}
          onSave={form => handleEdit(form as Omit<Ad, "id" | "views" | "clicks">)}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ─── تأكيد الحذف ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الإعلان</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف{" "}
              <strong>{deleteTarget?.title || "هذا الإعلان"}</strong>؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
