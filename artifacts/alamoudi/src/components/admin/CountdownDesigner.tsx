import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SmartBannerDisplay,
  defaultCountdownConfig,
  type CountdownConfig,
  type SmartBannerShape,
} from "@/components/ui/SmartBannerDisplay";
import {
  ImageIcon, Layers, Type, Image as LogoIcon, Timer,
  LayoutGrid, Trash2, Upload,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "timer" | "bg" | "overlay" | "text" | "logo" | "extend";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "timer",   label: "العداد",       icon: Timer     },
  { id: "bg",      label: "الخلفية",      icon: ImageIcon },
  { id: "overlay", label: "الطبقة",       icon: Layers    },
  { id: "text",    label: "النصوص",       icon: Type      },
  { id: "logo",    label: "الشعار",       icon: LogoIcon  },
  { id: "extend",  label: "توسعات",       icon: LayoutGrid },
];

const ASPECT_OPTIONS = [
  { value: "16/9",  label: "16:9 (أفقي)"  },
  { value: "21/9",  label: "21:9 (سينما)" },
  { value: "4/3",   label: "4:3 (كلاسيك)" },
  { value: "1/1",   label: "1:1 (مربع)"   },
  { value: "3/1",   label: "3:1 (بانر)"   },
  { value: "9/16",  label: "9:16 (عمودي)" },
];

const OVERLAY_OPTIONS = [
  { value: "none",     label: "بدون" },
  { value: "dark",     label: "تعتيم"   },
  { value: "light",    label: "إضاءة"   },
  { value: "blur",     label: "ضبابي"   },
  { value: "gradient", label: "تدرج"    },
];

const DIGIT_STYLES = [
  { value: "boxed", label: "مُؤطَّر" },
  { value: "plain", label: "بدون إطار" },
];

const TEXT_ALIGNS = [
  { value: "right",  label: "←" },
  { value: "center", label: "⎄" },
  { value: "left",   label: "→" },
];

const BG_POSITIONS = [
  { value: "cover",   label: "تغطية" },
  { value: "contain", label: "احتواء" },
  { value: "fill",    label: "ملء"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, onChange, unit = "" }: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <LabelRow label={`${label}${unit ? ` (${value}${unit})` : ` (${value})`}`}>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </LabelRow>
  );
}

function ImageUploadZone({ src, label, accept, onUpload, onClear }: {
  src: string; label: string; accept?: string;
  onUpload: (b64: string) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    onUpload(b64);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {src ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={src} alt={label} className="w-full h-28 object-cover" />
          <button
            onClick={onClear}
            className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-lg h-24 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs">{label}</span>
        </button>
      )}
      {src && (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => inputRef.current?.click()}>
          <Upload className="w-3 h-3 ml-1" /> تغيير الصورة
        </Button>
      )}
      <input ref={inputRef} type="file" accept={accept || "image/*"} className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function TimerPanel({ cfg, onChange }: { cfg: CountdownConfig; onChange: (p: Partial<CountdownConfig>) => void }) {
  return (
    <div className="space-y-4">
      <LabelRow label="التاريخ المستهدف">
        <Input type="date" value={cfg.targetDate} onChange={e => onChange({ targetDate: e.target.value })} />
      </LabelRow>
      <LabelRow label="الوقت المستهدف">
        <Input type="time" step="1" value={cfg.targetTime} onChange={e => onChange({ targetTime: e.target.value })} />
      </LabelRow>
      <LabelRow label="أبعاد البانر">
        <div className="grid grid-cols-2 gap-1.5">
          {ASPECT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => onChange({ aspectRatio: o.value as CountdownConfig["aspectRatio"] })}
              className={cn(
                "text-xs py-1.5 px-2 rounded-md border transition-colors text-center",
                cfg.aspectRatio === o.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "hover:bg-muted border-border"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </LabelRow>
      <LabelRow label="نمط الأرقام">
        <div className="flex gap-2">
          {DIGIT_STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => onChange({ digitStyle: s.value as "boxed" | "plain" })}
              className={cn(
                "flex-1 text-xs py-1.5 rounded-md border transition-colors",
                cfg.digitStyle === s.value ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </LabelRow>
      <div className="flex items-center gap-3">
        <input
          id="show-seconds"
          type="checkbox"
          checked={cfg.showSeconds}
          onChange={e => onChange({ showSeconds: e.target.checked })}
          className="w-4 h-4 rounded accent-accent"
        />
        <Label htmlFor="show-seconds" className="text-sm cursor-pointer">إظهار الثواني</Label>
      </div>
      <LabelRow label="لون أرقام العداد">
        <div className="flex gap-2 items-center">
          <input type="color" value={cfg.digitColor || "#ffffff"} onChange={e => onChange({ digitColor: e.target.value })} className="w-9 h-8 rounded border cursor-pointer" />
          <Input value={cfg.digitColor || "#ffffff"} onChange={e => onChange({ digitColor: e.target.value })} className="flex-1 font-mono text-xs h-8" maxLength={7} />
        </div>
      </LabelRow>
      {cfg.digitStyle === "boxed" && (
        <LabelRow label="خلفية صندوق الأرقام (CSS color)">
          <Input
            value={cfg.digitBg || "rgba(0,0,0,0.55)"}
            onChange={e => onChange({ digitBg: e.target.value })}
            placeholder="rgba(0,0,0,0.55)"
            className="font-mono text-xs h-8"
          />
        </LabelRow>
      )}
    </div>
  );
}

function BgPanel({ cfg, onChange }: { cfg: CountdownConfig; onChange: (p: Partial<CountdownConfig>) => void }) {
  return (
    <div className="space-y-4">
      <LabelRow label="صورة الخلفية">
        <ImageUploadZone
          src={cfg.backgroundImage}
          label="اضغط لرفع صورة خلفية"
          onUpload={b64 => onChange({ backgroundImage: b64 })}
          onClear={() => onChange({ backgroundImage: "" })}
        />
      </LabelRow>
      {cfg.backgroundImage && (
        <LabelRow label="ملاءمة الصورة">
          <div className="flex gap-1.5">
            {BG_POSITIONS.map(p => (
              <button
                key={p.value}
                onClick={() => onChange({ bgPosition: p.value as CountdownConfig["bgPosition"] })}
                className={cn(
                  "flex-1 text-xs py-1.5 rounded-md border transition-colors",
                  cfg.bgPosition === p.value ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </LabelRow>
      )}
      {!cfg.backgroundImage && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          بدون صورة خلفية، سيظهر تدرج رمادي داكن كخلفية افتراضية.
        </p>
      )}
    </div>
  );
}

function OverlayPanel({ cfg, onChange }: { cfg: CountdownConfig; onChange: (p: Partial<CountdownConfig>) => void }) {
  return (
    <div className="space-y-4">
      <LabelRow label="نوع الطبقة">
        <div className="grid grid-cols-3 gap-1.5">
          {OVERLAY_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => onChange({ overlay: { ...cfg.overlay, type: o.value as CountdownConfig["overlay"]["type"] } })}
              className={cn(
                "text-xs py-1.5 rounded-md border transition-colors",
                cfg.overlay.type === o.value ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </LabelRow>
      {cfg.overlay.type !== "none" && (
        <SliderRow
          label={cfg.overlay.type === "blur" ? "شدة الضبابية" : "الشفافية"}
          value={cfg.overlay.opacity} min={0} max={100}
          onChange={v => onChange({ overlay: { ...cfg.overlay, opacity: v } })}
          unit="%"
        />
      )}
      {(cfg.overlay.type === "dark" || cfg.overlay.type === "light") && (
        <LabelRow label="لون الطبقة">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={cfg.overlay.color || (cfg.overlay.type === "dark" ? "#000000" : "#ffffff")}
              onChange={e => onChange({ overlay: { ...cfg.overlay, color: e.target.value } })}
              className="w-9 h-8 rounded border cursor-pointer"
            />
            <Input
              value={cfg.overlay.color || "#000000"}
              onChange={e => onChange({ overlay: { ...cfg.overlay, color: e.target.value } })}
              className="flex-1 font-mono text-xs h-8"
            />
          </div>
        </LabelRow>
      )}
    </div>
  );
}

function TextPanel({ cfg, onChange }: { cfg: CountdownConfig; onChange: (p: Partial<CountdownConfig>) => void }) {
  return (
    <div className="space-y-4">
      <LabelRow label="العنوان الرئيسي">
        <Input value={cfg.headline} onChange={e => onChange({ headline: e.target.value })} placeholder="مثال: احسبوا الوقت..." dir="rtl" />
      </LabelRow>
      <LabelRow label="النص الوصفي">
        <Input value={cfg.description} onChange={e => onChange({ description: e.target.value })} placeholder="نص تفصيلي أسفل العداد" dir="rtl" />
      </LabelRow>
      <SliderRow
        label="حجم العنوان" value={cfg.headlineSize} min={14} max={100}
        onChange={v => onChange({ headlineSize: v })} unit="px"
      />
      <SliderRow
        label="حجم الوصف" value={cfg.descriptionSize} min={10} max={60}
        onChange={v => onChange({ descriptionSize: v })} unit="px"
      />
      <LabelRow label="لون النصوص">
        <div className="flex gap-2 items-center">
          <input type="color" value={cfg.textColor} onChange={e => onChange({ textColor: e.target.value })} className="w-9 h-8 rounded border cursor-pointer" />
          <Input value={cfg.textColor} onChange={e => onChange({ textColor: e.target.value })} className="flex-1 font-mono text-xs h-8" maxLength={7} />
        </div>
      </LabelRow>
      <SliderRow
        label="شفافية النصوص" value={cfg.textOpacity} min={0} max={100}
        onChange={v => onChange({ textOpacity: v })} unit="%"
      />
      <LabelRow label="محاذاة النصوص">
        <div className="flex gap-1.5">
          {TEXT_ALIGNS.map(a => (
            <button
              key={a.value}
              onClick={() => onChange({ textAlign: a.value as CountdownConfig["textAlign"] })}
              className={cn(
                "flex-1 text-sm py-1.5 rounded-md border transition-colors font-mono",
                cfg.textAlign === a.value ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </LabelRow>
    </div>
  );
}

function LogoPanel({ cfg, onChange }: { cfg: CountdownConfig; onChange: (p: Partial<CountdownConfig>) => void }) {
  return (
    <div className="space-y-4">
      <LabelRow label="صورة الشعار (PNG شفاف مستحسن)">
        <ImageUploadZone
          src={cfg.logo}
          label="اضغط لرفع شعار"
          accept="image/png,image/svg+xml,image/webp"
          onUpload={b64 => onChange({ logo: b64 })}
          onClear={() => onChange({ logo: "" })}
        />
      </LabelRow>
      {cfg.logo && (
        <>
          <SliderRow
            label="حجم الشعار" value={cfg.logoSize} min={5} max={60}
            onChange={v => onChange({ logoSize: v })} unit="%"
          />
          <SliderRow
            label="الموضع الأفقي (من اليسار)" value={cfg.logoX} min={0} max={100}
            onChange={v => onChange({ logoX: v })} unit="%"
          />
          <SliderRow
            label="الموضع الرأسي (من الأعلى)" value={cfg.logoY} min={0} max={100}
            onChange={v => onChange({ logoY: v })} unit="%"
          />
        </>
      )}
      {!cfg.logo && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          لا يوجد شعار. ارفع صورة بخلفية شفافة (PNG/SVG) للحصول على أفضل نتيجة.
        </p>
      )}
    </div>
  );
}

function ExtendPanel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        هذا القسم مخصص للتوسعات المستقبلية. النظام مُهيَّأ لإضافة:
      </p>
      <div className="space-y-2">
        {[
          { icon: "🔤", label: "خطوط مخصصة", desc: "إضافة خطوط عربية وأجنبية" },
          { icon: "🏷️", label: "ملصقات (Stickers)", desc: "إضافة وتحريك ملصقات فوق البانر" },
          { icon: "😀", label: "إيموجيات متحركة", desc: "رموز تعبيرية قابلة للتكبير والتحريك" },
        ].map(f => (
          <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-dashed bg-muted/20">
            <span className="text-xl">{f.icon}</span>
            <div>
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
            <span className="mr-auto text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">قريباً</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Designer ────────────────────────────────────────────────────────────

interface Props {
  config:   Partial<CountdownConfig>;
  onChange: (next: CountdownConfig) => void;
}

export function CountdownDesigner({ config, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("timer");

  const cfg: CountdownConfig = { ...defaultCountdownConfig(), ...config };

  const patch = (partial: Partial<CountdownConfig>) => onChange({ ...cfg, ...partial });

  const previewBanner: SmartBannerShape = {
    id: "_preview", type: "countdown", title: "", config: cfg as unknown as Record<string, unknown>,
    active: true, order: 0, createdAt: "", slot: "top", pinned: false, duration: 10,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-full" dir="rtl">
      {/* ── Preview ── */}
      <div className="flex-1 bg-muted/20 flex flex-col">
        <div className="px-3 py-2 border-b bg-background">
          <p className="text-xs text-muted-foreground font-medium">معاينة مباشرة</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-3 overflow-auto">
          <div className="w-full max-w-3xl">
            <SmartBannerDisplay banner={previewBanner} />
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="w-full lg:w-72 xl:w-80 border-r flex flex-col flex-shrink-0 bg-background">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2.5 py-2 text-[10px] flex-shrink-0 transition-colors border-b-2",
                  tab === t.id
                    ? "border-accent text-accent font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "timer"   && <TimerPanel   cfg={cfg} onChange={patch} />}
          {tab === "bg"      && <BgPanel      cfg={cfg} onChange={patch} />}
          {tab === "overlay" && <OverlayPanel cfg={cfg} onChange={patch} />}
          {tab === "text"    && <TextPanel    cfg={cfg} onChange={patch} />}
          {tab === "logo"    && <LogoPanel    cfg={cfg} onChange={patch} />}
          {tab === "extend"  && <ExtendPanel />}
        </div>
      </div>
    </div>
  );
}
