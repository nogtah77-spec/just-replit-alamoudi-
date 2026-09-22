import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Plus, Pencil, Trash2, Eye, GripVertical,
  ChevronDown, ChevronUp, Settings2, CheckCircle2,
  XCircle, Loader2, ChevronRight, Wifi, Calendar,
  Trophy, Newspaper, CloudSun, Coins, Clock, Code2,
  KeyRound, TestTube2, LayoutTemplate, Megaphone,
} from "lucide-react";
import {
  SmartBannerDisplay,
  BANNER_TYPE_META,
  defaultCountdownConfig,
  type BannerType,
  type SmartBannerShape,
  type CountdownConfig,
} from "@/components/ui/SmartBannerDisplay";
import { CountdownDesigner } from "@/components/admin/CountdownDesigner";

// ─── Constants ────────────────────────────────────────────────────────────────

const FOOTBALL_COMPETITIONS = [
  { code: "WC",  name: "🏆 كأس العالم 2026",          free: true  },
  { code: "PL",  name: "الدوري الإنجليزي الممتاز",    free: true  },
  { code: "PD",  name: "الدوري الإسباني",              free: true  },
  { code: "BL1", name: "الدوري الألماني",               free: true  },
  { code: "SA",  name: "الدوري الإيطالي",               free: true  },
  { code: "FL1", name: "الدوري الفرنسي",               free: true  },
  { code: "CL",  name: "دوري أبطال أوروبا",             free: true  },
  { code: "SPL", name: "الدوري السعودي للمحترفين",    free: false },
  { code: "EGY", name: "الدوري المصري الممتاز",       free: false },
];

const FOOTBALL_TYPES = [
  { value: "live",      label: "مباشر 🔴"          },
  { value: "today",     label: "مباريات اليوم"      },
  { value: "results",   label: "نتائج المباريات"    },
  { value: "standings", label: "ترتيب الدوريات"    },
];

const WEATHER_UNITS = [
  { value: "metric",   label: "مئوية (°م)" },
  { value: "imperial", label: "فهرنهايت (°ف)" },
];

const CURRENCY_PAIRS = ["EGP","EUR","GBP","SAR","AED","KWD","CHF","JPY"];

const BANNER_TYPES: { type: BannerType; label: string; desc: string; icon: string; needsService?: string }[] = [
  { type: "countdown",    label: "عداد تنازلي",       desc: "مصمم بانر احترافي مع عداد",            icon: "⏱️" },
  { type: "live-matches", label: "مباريات مباشرة",    desc: "نتائج المباريات أولاً بأول",            icon: "⚽", needsService: "football" },
  { type: "today-matches",label: "مباريات اليوم",     desc: "جدول مباريات اليوم",                    icon: "📅", needsService: "football" },
  { type: "results",      label: "نتائج المباريات",   desc: "آخر النتائج والأهداف",                  icon: "🏆", needsService: "football" },
  { type: "standings",    label: "ترتيب الدوريات",    desc: "جدول ترتيب الدوري",                     icon: "📊", needsService: "football" },
  { type: "news",         label: "الأخبار",           desc: "أحدث الأخبار عبر GNews",               icon: "📰", needsService: "news" },
  { type: "weather",      label: "الطقس",             desc: "حالة الطقس الآن",                       icon: "🌤️", needsService: "weather" },
  { type: "gold",         label: "أسعار الذهب",       desc: "سعر الذهب الآن",                        icon: "🥇", needsService: "gold" },
  { type: "currency",     label: "أسعار العملات",     desc: "أسعار صرف مباشرة — مجاني",             icon: "💱" },
  { type: "html",         label: "HTML مخصص",         desc: "كود HTML خاص بك",                       icon: "⌨️" },
];

type BannerServices = Record<string, Record<string, string>>;

// ─── Service Settings Panel ───────────────────────────────────────────────────

const SERVICES = [
  {
    id: "football", label: "Football-Data.org", icon: "⚽", free: false,
    desc: "بيانات المباريات والدوريات", link: "https://www.football-data.org/",
    fields: [{ key: "apiKey", label: "API Token", type: "password" }],
  },
  {
    id: "weather", label: "OpenWeatherMap", icon: "🌤️", free: false,
    desc: "بيانات الطقس", link: "https://openweathermap.org/api",
    fields: [
      { key: "apiKey",      label: "API Key",    type: "password" },
      { key: "defaultCity", label: "المدينة الافتراضية", type: "text" },
    ],
  },
  {
    id: "news", label: "GNews API", icon: "📰", free: false,
    desc: "أخبار متعددة المصادر", link: "https://gnews.io/",
    fields: [{ key: "apiKey", label: "API Token", type: "password" }],
  },
  {
    id: "gold", label: "GoldAPI.io", icon: "🥇", free: false,
    desc: "أسعار الذهب والمعادن", link: "https://www.goldapi.io/",
    fields: [{ key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    id: "currency", label: "Frankfurter.app", icon: "💱", free: true,
    desc: "أسعار العملات — مجاني بدون مفتاح", link: "https://www.frankfurter.app/",
    fields: [],
  },
];

function ServiceSettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [services, setServices] = useState<BannerServices>({});
  const [testing,  setTesting]  = useState<Record<string, boolean>>({});
  const [results,  setResults]  = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get<BannerServices>("/smart-banners/services").then(setServices).catch(() => {});
  }, [open]);

  const patch = (svcId: string, key: string, value: string) =>
    setServices(prev => ({ ...prev, [svcId]: { ...(prev[svcId] ?? {}), [key]: value } }));

  const test = async (svcId: string) => {
    setTesting(p => ({ ...p, [svcId]: true }));
    try {
      const r = await api.post<{ ok: boolean; message?: string; error?: string }>(
        `/smart-banners/services/test/${svcId}`, {}
      );
      setResults(p => ({ ...p, [svcId]: { ok: r.ok, msg: r.ok ? (r.message ?? "✓") : (r.error ?? "فشل") } }));
    } catch {
      setResults(p => ({ ...p, [svcId]: { ok: false, msg: "تعذر الاتصال" } }));
    } finally {
      setTesting(p => ({ ...p, [svcId]: false }));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/smart-banners/services", services);
      toast({ title: "✓ تم الحفظ", description: "إعدادات الخدمات محدّثة" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-5 h-5 text-accent" /> إعدادات خدمات البانر الذكي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {SERVICES.map(svc => {
            const res = results[svc.id];
            return (
              <div key={svc.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{svc.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{svc.label}</p>
                      <p className="text-xs text-muted-foreground">{svc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {svc.free && <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">مجاني</Badge>}
                    {!svc.free && <a href={svc.link} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline flex items-center gap-0.5"><KeyRound className="w-3 h-3" /> احصل على مفتاح</a>}
                    <Button
                      size="sm" variant="outline"
                      className={cn("h-7 text-xs gap-1", res?.ok && "border-emerald-400 text-emerald-600", res && !res.ok && "border-red-400 text-red-600")}
                      onClick={() => test(svc.id)}
                      disabled={testing[svc.id]}
                    >
                      {testing[svc.id]
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : res?.ok ? <CheckCircle2 className="w-3 h-3" />
                        : res ? <XCircle className="w-3 h-3" />
                        : <TestTube2 className="w-3 h-3" />}
                      اختبار
                    </Button>
                  </div>
                </div>

                {res && (
                  <p className={cn("text-xs px-2 py-1 rounded", res.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400")}>
                    {res.msg}
                  </p>
                )}

                {svc.fields.length > 0 && (
                  <div className="grid gap-2">
                    {svc.fields.map(f => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          type={f.type as "text" | "password"}
                          value={services[svc.id]?.[f.key] ?? ""}
                          onChange={e => patch(svc.id, f.key, e.target.value)}
                          placeholder={f.type === "password" ? "••••••••••••••" : ""}
                          className="h-8 text-sm font-mono"
                          dir="ltr"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {svc.free && (
                  <p className="text-xs text-muted-foreground">يعمل تلقائياً — لا يحتاج إعداد.</p>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />} حفظ الإعدادات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Banner Type Selector (Step 1) ────────────────────────────────────────────

function TypeSelector({ onSelect }: { onSelect: (t: BannerType) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" dir="rtl">
      {BANNER_TYPES.map(bt => {
        const meta = BANNER_TYPE_META[bt.type];
        return (
          <button
            key={bt.type}
            onClick={() => onSelect(bt.type)}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border hover:border-accent hover:bg-accent/5 transition-all text-right group"
          >
            <span className="text-2xl">{bt.icon}</span>
            <div>
              <p className="text-sm font-semibold group-hover:text-accent transition-colors">{bt.label}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">{bt.desc}</p>
            </div>
            {bt.needsService && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", meta.color)}>
                يحتاج مفتاح
              </Badge>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent mr-auto transition-colors" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Type-specific config forms ───────────────────────────────────────────────

function FootballForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const selected = (config.competition as string) || "WC";
  const selectedComp = FOOTBALL_COMPETITIONS.find(c => c.code === selected);
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">الدوري / البطولة</Label>
        <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {FOOTBALL_COMPETITIONS.map(c => (
            <button
              key={c.code}
              onClick={() => onChange({ ...config, competition: c.code })}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors text-right",
                selected === c.code
                  ? "bg-accent text-accent-foreground border-accent"
                  : "hover:bg-muted border-border"
              )}
            >
              <span>{c.name}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mr-2",
                c.free
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {c.free ? "مجاني" : "مدفوع"}
              </span>
            </button>
          ))}
        </div>
        {selectedComp && !selectedComp.free && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            ⚠️ هذا الدوري يحتاج باقة مدفوعة من football-data.org
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">نوع البيانات</Label>
        <div className="grid grid-cols-2 gap-2">
          {FOOTBALL_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => onChange({ ...config, type: t.value })}
              className={cn(
                "text-sm py-2 rounded-md border transition-colors",
                (config.type as string) === t.value ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeatherForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">المدينة</Label>
        <Input
          value={(config.city as string) || "Cairo"}
          onChange={e => onChange({ ...config, city: e.target.value })}
          placeholder="مثال: Cairo, Dubai, Riyadh"
          dir="ltr"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">وحدة الحرارة</Label>
        <div className="flex gap-2">
          {WEATHER_UNITS.map(u => (
            <button
              key={u.value}
              onClick={() => onChange({ ...config, unit: u.value })}
              className={cn(
                "flex-1 text-sm py-2 rounded-md border transition-colors",
                (config.unit as string) === u.value ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CurrencyForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const selected = ((config.to as string) || "EGP,EUR,GBP,SAR,AED,KWD").split(",");
  const toggle = (code: string) => {
    const next = selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code];
    onChange({ ...config, to: next.join(",") || "EGP" });
  };
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">العملة الأساسية</Label>
        <select
          value={(config.from as string) || "USD"}
          onChange={e => onChange({ ...config, from: e.target.value })}
          className="w-full border rounded-md px-3 h-9 text-sm bg-background"
        >
          {["USD","EUR","GBP","SAR","AED"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">العملات المستهدفة</Label>
        <div className="flex flex-wrap gap-1.5">
          {CURRENCY_PAIRS.map(c => (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selected.includes(c) ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoldForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">عملة العرض</Label>
        <select
          value={(config.currency as string) || "USD"}
          onChange={e => onChange({ ...config, currency: e.target.value })}
          className="w-full border rounded-md px-3 h-9 text-sm bg-background"
        >
          {["USD","EUR","EGP","SAR","AED","GBP"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}

function NewsForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">كلمات البحث</Label>
        <Input
          value={(config.q as string) || "أخبار"}
          onChange={e => onChange({ ...config, q: e.target.value })}
          placeholder="مثال: عقارات، مصر، أخبار"
          dir="rtl"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">عدد المقالات</Label>
        <select
          value={String(config.max || 6)}
          onChange={e => onChange({ ...config, max: Number(e.target.value) })}
          className="w-full border rounded-md px-3 h-9 text-sm bg-background"
        >
          {[4,6,8,10].map(n => <option key={n} value={n}>{n} مقالات</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Background Image Form (shared for all non-countdown types) ───────────────

function BannerBgForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const bgImage = (config.backgroundImage as string) || "";
  const opacity = typeof config.bgOverlayOpacity === "number" ? config.bgOverlayOpacity : 55;
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...config, backgroundImage: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3 border rounded-xl p-3 bg-muted/20" dir="rtl">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">🖼️ صورة الخلفية</Label>
        {bgImage && (
          <button
            onClick={() => onChange({ ...config, backgroundImage: "" })}
            className="text-xs text-red-500 hover:text-red-700"
          >
            حذف الصورة
          </button>
        )}
      </div>

      {bgImage ? (
        <div className="relative rounded-lg overflow-hidden h-20 cursor-pointer" onClick={() => fileRef.current?.click()}>
          <img src={bgImage} className="w-full h-full object-cover" alt="خلفية" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-medium">تغيير الصورة</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <p className="text-xl mb-1">🖼️</p>
          <p className="text-xs text-muted-foreground">انقر لرفع صورة خلفية</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">JPG · PNG · WebP — يُفضّل 1200×300px</p>
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {bgImage && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">شدة الطبقة الداكنة</Label>
            <span className="text-xs text-muted-foreground font-mono">{opacity}%</span>
          </div>
          <input
            type="range" min={0} max={90} step={5} value={opacity}
            onChange={e => onChange({ ...config, bgOverlayOpacity: Number(e.target.value) })}
            className="w-full accent-accent h-1.5"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>شفاف</span><span>داكن</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HtmlForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">كود HTML</Label>
        <textarea
          value={(config.html as string) || ""}
          onChange={e => onChange({ ...config, html: e.target.value })}
          rows={8}
          placeholder="<div>...</div>"
          dir="ltr"
          className="w-full border rounded-md p-3 text-sm font-mono bg-background resize-y focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">الارتفاع (px)</Label>
        <Input
          type="number"
          min={50} max={1200}
          value={(config.height as number) || 200}
          onChange={e => onChange({ ...config, height: Number(e.target.value) })}
          dir="ltr"
        />
      </div>
    </div>
  );
}

// ─── Banner Dialog ────────────────────────────────────────────────────────────

function BannerDialog({
  open, onClose, initial, onSave,
}: {
  open:    boolean;
  onClose: () => void;
  initial: SmartBannerShape | null;
  onSave:  (data: Omit<SmartBannerShape, "id" | "createdAt" | "order">) => Promise<void>;
}) {
  const [step,     setStep]    = useState<"type" | "config">(initial ? "config" : "type");
  const [type,     setType]    = useState<BannerType>(initial?.type as BannerType ?? "countdown");
  const [title,    setTitle]   = useState(initial?.title ?? "");
  const [config,   setConfig]  = useState<Record<string, unknown>>(initial?.config ?? {});
  const [active,   setActive]  = useState(initial?.active ?? true);
  const [slot,     setSlot]    = useState<"top" | "bottom">((initial?.slot as "top" | "bottom") ?? "top");
  const [pinned,   setPinned]  = useState(initial?.pinned ?? false);
  const [duration, setDuration]= useState(initial?.duration ?? 10);
  const [saving,   setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setStep(initial ? "config" : "type");
      setType((initial?.type as BannerType) ?? "countdown");
      setTitle(initial?.title ?? "");
      setConfig(initial?.config ?? {});
      setActive(initial?.active ?? true);
      setSlot((initial?.slot as "top" | "bottom") ?? "top");
      setPinned(initial?.pinned ?? false);
      setDuration(initial?.duration ?? 10);
    }
  }, [open, initial]);

  const selectType = (t: BannerType) => {
    setType(t);
    if (t === "countdown") setConfig(defaultCountdownConfig() as unknown as Record<string, unknown>);
    else if (t === "live-matches" || t === "today-matches" || t === "results" || t === "standings")
      setConfig({ competition: "WC", type: t.replace("-matches","").replace("today-","today").replace("live-","live") });
    else if (t === "weather")  setConfig({ city: "Cairo", unit: "metric" });
    else if (t === "currency") setConfig({ from: "USD", to: "EGP,EUR,GBP,SAR,AED,KWD" });
    else if (t === "gold")     setConfig({ currency: "USD" });
    else if (t === "news")     setConfig({ q: "أخبار", lang: "ar", max: 6 });
    else setConfig({});
    setStep("config");
  };

  const isCountdown = type === "countdown";
  const meta        = BANNER_TYPE_META[type];

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ type, title: title || meta.label, config, active, slot, pinned, duration });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className={cn(
          "flex flex-col",
          isCountdown && step === "config"
            ? "max-w-5xl h-[90vh]"
            : "max-w-xl max-h-[90vh]"
        )}
        dir="rtl"
      >
        <DialogHeader className="flex-shrink-0 border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            {step === "type" ? (
              <><LayoutTemplate className="w-4 h-4 text-accent" /> اختر نوع البانر</>
            ) : (
              <>
                {!initial && (
                  <button onClick={() => setStep("type")} className="hover:text-accent transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", meta.color)}>
                  {meta.label}
                </span>
                {initial ? "تعديل البانر" : "إعداد البانر"}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 — type selector */}
        {step === "type" && (
          <div className="flex-1 overflow-y-auto px-1 py-3">
            <TypeSelector onSelect={selectType} />
          </div>
        )}

        {/* Step 2 — config */}
        {step === "config" && (
          <>
            {/* Common fields */}
            {!isCountdown && (
              <div className="flex-shrink-0 space-y-0 border-b">
                {/* Row 1: name + active */}
                <div className="flex items-center gap-3 px-1 pt-2 pb-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">اسم البانر</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={meta.label} className="h-8" />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 pt-4">
                    <Switch checked={active} onCheckedChange={setActive} />
                    <Label className="text-xs">مفعّل</Label>
                  </div>
                </div>
                {/* Row 2: slot + pinned + duration */}
                <div className="flex items-center gap-3 px-1 pb-3 flex-wrap">
                  <div className="flex gap-1.5 flex-shrink-0">
                    {(["top","bottom"] as const).map(s => (
                      <button key={s} onClick={() => setSlot(s)}
                        className={cn("text-xs px-2.5 py-1 rounded-lg border transition-colors",
                          slot === s ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-muted")}>
                        {s === "top" ? "⬆ الصندوق العلوي" : "⬇ الصندوق السفلي"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={pinned} onCheckedChange={setPinned} id="pinned-sw" className="scale-90" />
                    <Label htmlFor="pinned-sw" className="text-xs cursor-pointer whitespace-nowrap">ثابت دائماً</Label>
                  </div>
                  {!pinned && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Input type="number" min={3} max={120} value={duration}
                        onChange={e => setDuration(Math.max(3, Number(e.target.value)))}
                        className="h-7 w-16 text-xs text-center" />
                      <span className="text-xs text-muted-foreground">ثانية</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Type-specific form */}
            <div className={cn("flex-1 overflow-y-auto", isCountdown ? "p-0" : "py-3")}>
              {isCountdown ? (
                <div className="h-full">
                  {/* Countdown name + active above designer */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20 flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="اسم البانر" className="h-7 text-sm" />
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {(["top","bottom"] as const).map(s => (
                        <button key={s} onClick={() => setSlot(s)}
                          className={cn("text-[10px] px-2 py-1 rounded border transition-colors",
                            slot === s ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-muted")}>
                          {s === "top" ? "⬆ أعلى" : "⬇ أسفل"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch checked={pinned} onCheckedChange={setPinned} id="cd-pinned" className="scale-75" />
                      <Label htmlFor="cd-pinned" className="text-[10px] cursor-pointer">ثابت</Label>
                    </div>
                    {!pinned && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Input type="number" min={3} max={120} value={duration}
                          onChange={e => setDuration(Math.max(3, Number(e.target.value)))}
                          className="h-6 w-12 text-[10px] text-center" />
                        <span className="text-[10px] text-muted-foreground">ث</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch checked={active} onCheckedChange={setActive} id="cd-active" />
                      <Label htmlFor="cd-active" className="text-xs cursor-pointer">مفعّل</Label>
                    </div>
                  </div>
                  <div className="h-[calc(100%-44px)]">
                    <CountdownDesigner
                      config={config}
                      onChange={c => setConfig(c as unknown as Record<string, unknown>)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {(type === "live-matches" || type === "today-matches" || type === "results" || type === "standings") && (
                    <FootballForm config={config} onChange={setConfig} />
                  )}
                  {type === "weather"  && <WeatherForm  config={config} onChange={setConfig} />}
                  {type === "currency" && <CurrencyForm config={config} onChange={setConfig} />}
                  {type === "gold"     && <GoldForm     config={config} onChange={setConfig} />}
                  {type === "news"     && <NewsForm     config={config} onChange={setConfig} />}
                  {type === "html"     && <HtmlForm     config={config} onChange={setConfig} />}

                  {/* Background Image (all non-countdown types) */}
                  {type !== "html" && (
                    <BannerBgForm config={config} onChange={setConfig} />
                  )}

                  {/* Preview */}
                  <div className="border rounded-xl overflow-hidden">
                    <p className="text-xs text-muted-foreground px-3 py-2 border-b bg-muted/30">معاينة</p>
                    <div className="p-3">
                      <SmartBannerDisplay
                        banner={{ id: "_p", type, title, config, active, order: 0, createdAt: "", slot, pinned, duration }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-3 mt-0">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {initial ? "حفظ التعديلات" : "إضافة البانر"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Banner Card ──────────────────────────────────────────────────────────────

function BannerCard({
  banner, index, total,
  onEdit, onDelete, onToggle, onMove, onPreview,
}: {
  banner:   SmartBannerShape;
  index:    number;
  total:    number;
  onEdit:   () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMove:   (dir: -1 | 1) => void;
  onPreview:() => void;
}) {
  const meta = BANNER_TYPE_META[banner.type as BannerType] ?? BANNER_TYPE_META["html"];
  const Icon = meta.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all",
      !banner.active && "opacity-60"
    )}>
      {/* Reorder */}
      <div className="flex flex-col gap-0.5">
        <button disabled={index === 0}     onClick={() => onMove(-1)} className="disabled:opacity-30 hover:text-accent transition-colors"><ChevronUp   className="w-3.5 h-3.5" /></button>
        <button disabled={index === total-1} onClick={() => onMove(1)} className="disabled:opacity-30 hover:text-accent transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
      </div>
      <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />

      {/* Type badge */}
      <span className={cn("rounded-lg p-1.5 flex-shrink-0", meta.color)}>
        <Icon className="w-4 h-4" />
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{banner.title || meta.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {banner.slot === "bottom" ? "⬇ أسفل" : "⬆ أعلى"}
          </span>
          {banner.pinned ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">ثابت</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{banner.duration ?? 10}ث</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch checked={banner.active} onCheckedChange={onToggle} className="scale-90" />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPreview} title="معاينة">
          <Eye className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="تعديل">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete} title="حذف">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Preview Dialog ───────────────────────────────────────────────────────────

function PreviewDialog({ banner, onClose }: { banner: SmartBannerShape | null; onClose: () => void }) {
  return (
    <Dialog open={!!banner} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            معاينة: {banner?.title || BANNER_TYPE_META[banner?.type as BannerType]?.label || ""}
          </DialogTitle>
        </DialogHeader>
        {banner && <SmartBannerDisplay banner={banner} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SmartBanners() {
  const { toast } = useToast();

  const [banners,       setBanners]       = useState<SmartBannerShape[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editBanner,    setEditBanner]    = useState<SmartBannerShape | null>(null);
  const [previewBanner, setPreviewBanner] = useState<SmartBannerShape | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<SmartBannerShape[]>("/smart-banners")
      .then(setBanners)
      .catch(() => toast({ variant: "destructive", title: "خطأ في تحميل البانرات" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Omit<SmartBannerShape, "id" | "createdAt" | "order">) => {
    if (editBanner) {
      await api.patch(`/smart-banners/${editBanner.id}`, data);
      toast({ title: "✓ تم التعديل" });
    } else {
      await api.post("/smart-banners", { ...data, order: banners.length });
      toast({ title: "✓ تمت الإضافة" });
    }
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.del(`/smart-banners/${deleteId}`);
    toast({ title: "✓ تم الحذف" });
    setDeleteId(null);
    load();
  };

  const handleToggle = async (b: SmartBannerShape) => {
    await api.patch(`/smart-banners/${b.id}`, { active: !b.active });
    setBanners(prev => prev.map(x => x.id === b.id ? { ...x, active: !b.active } : x));
  };

  const handleMove = async (index: number, dir: -1 | 1) => {
    const next = [...banners];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((b, i) => ({ id: b.id, order: i }));
    setBanners(next.map((b, i) => ({ ...b, order: i })));
    await api.patch("/smart-banners/reorder", { ordered });
  };

  const FootballIcon = ({ className }: { className?: string }) =>
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0-6.56 17.28M12 2l4.16 5.17m-4.16 6.98L7.84 19.2M16.16 7.17l-4.16 6.98m0 0l5.13 4.63"/></svg>;
  void FootballIcon;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">

        <AdminPageHeader
          title="البانر الذكي"
          subtitle="أنشئ وأدر بانرات ديناميكية احترافية"
          eyebrow="المحتوى التفاعلي"
          icon={Megaphone}
          actions={
            <>
              <Button
                variant="outline"
                className="h-10 gap-2 border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 hover:text-white"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4" /> إعدادات الخدمات
              </Button>
              <Button
                className="h-10 gap-2 border border-[#C7B6A6] bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]"
                onClick={() => { setEditBanner(null); setCreateOpen(true); }}
              >
                <Plus className="h-4 w-4" /> إضافة بانر جديد
              </Button>
            </>
          }
        />

        {/* Banner types quick legend */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(BANNER_TYPE_META).map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <span key={type} className={cn("text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium", meta.color)}>
                <Icon className="w-3 h-3" /> {meta.label}
              </span>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-2xl">
            <LayoutTemplate className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">لا يوجد بانرات بعد</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">ابدأ بإضافة بانر ذكي جديد</p>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditBanner(null); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 ml-1" /> إضافة أول بانر
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {banners.map((b, i) => (
              <BannerCard
                key={b.id}
                banner={b}
                index={i}
                total={banners.length}
                onEdit={() => { setEditBanner(b); setCreateOpen(true); }}
                onDelete={() => setDeleteId(b.id)}
                onToggle={() => handleToggle(b)}
                onMove={dir => handleMove(i, dir)}
                onPreview={() => setPreviewBanner(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ServiceSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <BannerDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditBanner(null); }}
        initial={editBanner}
        onSave={handleSave}
      />

      <PreviewDialog banner={previewBanner} onClose={() => setPreviewBanner(null)} />

      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البانر؟</AlertDialogTitle>
            <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
