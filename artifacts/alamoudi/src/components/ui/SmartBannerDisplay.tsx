import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CloudSun, Coins, Newspaper, Code2, Trophy, Calendar, Wifi, Clock,
  AlertCircle, Loader2, RefreshCw,
} from "lucide-react";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type BannerType =
  | "live-matches" | "today-matches" | "results" | "standings"
  | "news" | "weather" | "gold" | "currency" | "countdown" | "html";

export interface OverlayConfig {
  type: "none" | "dark" | "light" | "blur" | "gradient";
  opacity: number;
  color: string;
}

export interface CountdownConfig {
  targetDate:      string;
  targetTime:      string;
  backgroundImage: string;
  bgPosition:      "cover" | "contain" | "fill";
  headline:        string;
  description:     string;
  headlineSize:    number;
  descriptionSize: number;
  textColor:       string;
  textOpacity:     number;
  textAlign:       "right" | "center" | "left";
  logo:            string;
  logoSize:        number;
  logoX:           number;
  logoY:           number;
  overlay:         OverlayConfig;
  aspectRatio:     "16/9" | "21/9" | "4/3" | "1/1" | "3/1" | "9/16";
  showSeconds:     boolean;
  digitStyle:      "boxed" | "plain";
  digitColor:      string;
  digitBg:         string;
  fonts:           unknown[];
  stickers:        unknown[];
  emojis:          unknown[];
}

export const defaultCountdownConfig = (): CountdownConfig => ({
  targetDate:      "",
  targetTime:      "00:00:00",
  backgroundImage: "",
  bgPosition:      "cover",
  headline:        "",
  description:     "",
  headlineSize:    36,
  descriptionSize: 16,
  textColor:       "#ffffff",
  textOpacity:     100,
  textAlign:       "center",
  logo:            "",
  logoSize:        20,
  logoX:           50,
  logoY:           12,
  overlay:         { type: "dark", opacity: 45, color: "#000000" },
  aspectRatio:     "16/9",
  showSeconds:     true,
  digitStyle:      "boxed",
  digitColor:      "#ffffff",
  digitBg:         "rgba(0,0,0,0.55)",
  fonts:           [],
  stickers:        [],
  emojis:          [],
});

export interface SmartBannerShape {
  id:        string;
  type:      BannerType;
  title:     string;
  config:    Record<string, unknown>;
  active:    boolean;
  order:     number;
  slot:      "top" | "bottom";
  pinned:    boolean;
  duration:  number;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function calcTimeLeft(targetDate: string, targetTime: string) {
  const target = new Date(`${targetDate}T${targetTime}`);
  const diff   = Math.max(0, target.getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000)  / 60_000),
    seconds: Math.floor((diff % 60_000)     / 1_000),
    ended:   diff === 0,
  };
}

function overlayStyle(cfg: OverlayConfig): React.CSSProperties {
  const a = cfg.opacity / 100;
  switch (cfg.type) {
    case "dark":     return { background: `rgba(0,0,0,${a})` };
    case "light":    return { background: `rgba(255,255,255,${a})` };
    case "gradient": return { background: `linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,${a}) 100%)` };
    case "blur":     return { backdropFilter: `blur(${a * 20}px)` };
    default:         return {};
  }
}

// ─── NeedsKey / Error / Loading placeholders ──────────────────────────────────

function NeedsKeyCard({ label }: { label: string }) {
  return (
    <div className="w-full rounded-xl border-2 border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-900/10 flex flex-col items-center justify-center gap-3 p-8 text-center" dir="rtl">
      <AlertCircle className="w-10 h-10 text-amber-500" />
      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
        يحتاج مفتاح API لخدمة <strong>{label}</strong>
      </p>
      <p className="text-xs text-muted-foreground">أضف المفتاح من إعدادات الخدمات</p>
    </div>
  );
}

function ErrorCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="w-full rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 flex flex-col items-center gap-2 p-6 text-center" dir="rtl">
      <AlertCircle className="w-8 h-8 text-red-500" />
      <p className="text-sm text-red-700 dark:text-red-400">{msg}</p>
      <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-500 hover:underline mt-1">
        <RefreshCw className="w-3 h-3" /> إعادة المحاولة
      </button>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="w-full rounded-xl bg-muted/30 flex items-center justify-center p-10">
      <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── Countdown Display ────────────────────────────────────────────────────────

function CountdownUnit({ value, label, scale, cfg }: {
  value: number; label: string; scale: number; cfg: CountdownConfig;
}) {
  const num = String(value).padStart(2, "0");
  const boxed = cfg.digitStyle === "boxed";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={cn("font-bold tabular-nums leading-none transition-all",
          boxed && "rounded-lg border border-white/20 flex items-center justify-center")}
        style={{
          fontSize:   `${cfg.headlineSize * scale * 1.15}px`,
          color:      cfg.digitColor || "#fff",
          background: boxed ? cfg.digitBg || "rgba(0,0,0,0.5)" : "transparent",
          padding:    boxed ? `${Math.max(4, 8 * scale)}px ${Math.max(6, 14 * scale)}px` : "0",
          minWidth:   boxed ? `${Math.max(36, cfg.headlineSize * scale * 1.6)}px` : undefined,
          textShadow: !boxed ? "0 2px 8px rgba(0,0,0,0.7)" : undefined,
        }}
      >
        {num}
      </div>
      <span style={{
        fontSize: `${Math.max(9, cfg.descriptionSize * scale * 0.8)}px`,
        color:    cfg.textColor || "#fff",
        opacity:  0.8,
      }}>
        {label}
      </span>
    </div>
  );
}

function CountdownDisplay({ config }: { config: CountdownConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale        = useContainerWidth(containerRef) / 800;
  const [tl, setTl]  = useState(() => calcTimeLeft(config.targetDate, config.targetTime));

  useEffect(() => {
    if (!config.targetDate) return;
    const id = setInterval(() => setTl(calcTimeLeft(config.targetDate, config.targetTime)), 1000);
    return () => clearInterval(id);
  }, [config.targetDate, config.targetTime]);

  const units = [
    { value: tl.days,    label: "يوم"    },
    { value: tl.hours,   label: "ساعة"   },
    { value: tl.minutes, label: "دقيقة"  },
    ...(config.showSeconds ? [{ value: tl.seconds, label: "ثانية" }] : []),
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none"
      style={{ aspectRatio: config.aspectRatio?.replace("/", " / ") || "16 / 9" }}
    >
      {/* Background */}
      {config.backgroundImage ? (
        <img
          src={config.backgroundImage}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: config.bgPosition || "cover" }}
          alt=""
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0" style={overlayStyle(config.overlay)} />

      {/* Logo */}
      {config.logo && (
        <img
          src={config.logo}
          className="absolute object-contain pointer-events-none"
          style={{
            left:      `${config.logoX ?? 50}%`,
            top:       `${config.logoY ?? 12}%`,
            width:     `${config.logoSize ?? 20}%`,
            transform: "translate(-50%, -50%)",
          }}
          alt="logo"
        />
      )}

      {/* Content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3"
        style={{ textAlign: config.textAlign || "center" }}
        dir="rtl"
      >
        {config.headline && (
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize:   `${config.headlineSize * scale}px`,
              color:      config.textColor  || "#fff",
              opacity:    (config.textOpacity ?? 100) / 100,
              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            }}
          >
            {config.headline}
          </h2>
        )}

        {/* Countdown digits */}
        {config.targetDate ? (
          tl.ended ? (
            <p style={{ fontSize: `${config.headlineSize * scale * 0.8}px`, color: config.textColor || "#fff" }}>
              انتهى العداد
            </p>
          ) : (
            <div
              className="flex flex-wrap justify-center"
              style={{ gap: `${Math.max(6, 12 * scale)}px` }}
            >
              {units.map(u => (
                <CountdownUnit key={u.label} {...u} scale={scale} cfg={config} />
              ))}
            </div>
          )
        ) : (
          <div className="flex gap-3">
            {["يوم","ساعة","دقيقة","ثانية"].map(l => (
              <CountdownUnit key={l} value={0} label={l} scale={scale} cfg={config} />
            ))}
          </div>
        )}

        {config.description && (
          <p
            className="max-w-[80%] leading-snug"
            style={{
              fontSize:   `${config.descriptionSize * scale}px`,
              color:      config.textColor  || "#fff",
              opacity:    (config.textOpacity ?? 100) / 100,
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              marginTop:  `${4 * scale}px`,
            }}
          >
            {config.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Weather Display ──────────────────────────────────────────────────────────

function WeatherDisplay({ config, hasBg = false }: { config: Record<string, unknown>; hasBg?: boolean }) {
  const city = (config.city as string) || "Cairo";
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err,  setErr]  = useState("");
  const load = useCallback(() => {
    setErr(""); setData(null);
    api.get<Record<string, unknown>>(`/smart-banners/proxy/weather?city=${encodeURIComponent(city)}&unit=metric`)
      .then(setData).catch(e => setErr(e?.message || "تعذر جلب بيانات الطقس"));
  }, [city]);
  useEffect(() => { load(); }, [load]);

  if (err.includes("مفتاح")) return <NeedsKeyCard label="OpenWeatherMap" />;
  if (err) return <ErrorCard msg={err} onRetry={load} />;
  if (!data) return <LoadingCard />;

  const temp  = Math.round((data.main as Record<string, number>)?.temp ?? 0);
  const desc  = ((data.weather as Record<string, string>[])?.[0]?.description) || "";
  const icon  = ((data.weather as Record<string, string>[])?.[0]?.icon) || "";
  const wind  = Math.round(((data.wind as Record<string, number>)?.speed ?? 0) * 3.6);
  const humid = (data.main as Record<string, number>)?.humidity ?? 0;

  const base = hasBg
    ? "text-white"
    : "bg-gradient-to-br from-sky-500 to-blue-700 text-white rounded-2xl";

  return (
    <div className={cn("w-full p-4 sm:p-5 flex items-center gap-4", base)} dir="rtl">
      {icon && (
        <img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={desc}
          className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg flex-shrink-0" />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">{temp}°</p>
          <p className="text-sm opacity-80 capitalize truncate">{desc}</p>
        </div>
        <p className="text-sm opacity-70 mt-0.5 truncate">{data.name as string}</p>
        <div className="flex gap-3 mt-2 text-xs opacity-75 flex-wrap">
          <span className="flex items-center gap-1">💨 {wind} كم/س</span>
          <span className="flex items-center gap-1">💧 {humid}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Currency Display ─────────────────────────────────────────────────────────

const CURRENCY_NAMES: Record<string, string> = {
  EGP: "جنيه مصري", EUR: "يورو", GBP: "إسترليني", SAR: "ريال سعودي",
  AED: "درهم إماراتي", KWD: "دينار كويتي", USD: "دولار أمريكي",
};
const CURRENCY_FLAGS: Record<string, string> = {
  EGP: "🇪🇬", EUR: "🇪🇺", GBP: "🇬🇧", SAR: "🇸🇦",
  AED: "🇦🇪", KWD: "🇰🇼", USD: "🇺🇸",
};

function CurrencyDisplay({ config, hasBg = false }: { config: Record<string, unknown>; hasBg?: boolean }) {
  const from = (config.from as string) || "USD";
  const to   = (config.to   as string) || "EGP,EUR,GBP,SAR,AED,KWD";
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err,  setErr]  = useState("");
  const load = useCallback(() => {
    setErr(""); setData(null);
    api.get<Record<string, unknown>>(`/smart-banners/proxy/currency?from=${from}&to=${to}`)
      .then(setData).catch(e => setErr(e?.message || "تعذر جلب العملات"));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  if (err) return <ErrorCard msg={err} onRetry={load} />;
  if (!data) return <LoadingCard />;

  const rates = (data.rates as Record<string, number>) || {};

  const wrap = hasBg ? "text-white p-4" : "rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4";
  const pill = hasBg ? "bg-white/15 backdrop-blur-sm border border-white/20" : "bg-white/10";

  return (
    <div className={cn("w-full", wrap)} dir="rtl">
      <div className="flex items-center gap-2 mb-3 opacity-80">
        <Coins className="w-4 h-4" />
        <p className="text-xs font-semibold">أسعار الصرف · 1 {from}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(rates).map(([code, rate]) => (
          <div key={code} className={cn("rounded-xl px-3 py-2 flex flex-col", pill)}>
            <span className="text-[10px] opacity-70">{CURRENCY_FLAGS[code]} {code}</span>
            <span className="font-bold text-sm tabular-nums">{rate.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gold Display ─────────────────────────────────────────────────────────────

function GoldDisplay({ config, hasBg = false }: { config: Record<string, unknown>; hasBg?: boolean }) {
  const currency = (config.currency as string) || "USD";
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err,  setErr]  = useState("");
  const load = useCallback(() => {
    setErr(""); setData(null);
    api.get<Record<string, unknown>>(`/smart-banners/proxy/gold?currency=${currency}`)
      .then(setData).catch(e => setErr(e?.message || "تعذر جلب أسعار الذهب"));
  }, [currency]);
  useEffect(() => { load(); }, [load]);

  if (err.includes("مفتاح")) return <NeedsKeyCard label="GoldAPI.io" />;
  if (err) return <ErrorCard msg={err} onRetry={load} />;
  if (!data) return <LoadingCard />;

  const price    = data.price as number;
  const prevClose = data.prev_close_price as number;
  const change   = price - prevClose;
  const up       = change >= 0;

  const base = hasBg
    ? "text-white p-4 sm:p-5 flex items-center gap-5"
    : "rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white p-4 sm:p-5 flex items-center gap-5";

  return (
    <div className={cn("w-full", base)} dir="rtl">
      <span className="text-4xl sm:text-5xl flex-shrink-0 drop-shadow">🥇</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs opacity-70 mb-1">سعر الذهب · أونصة × {currency}</p>
        <p className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight">
          {price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className={cn("text-sm mt-1 font-semibold", up ? "text-green-300" : "text-red-300")}>
          {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}{" "}
          <span className="opacity-70 font-normal">({((change / prevClose) * 100).toFixed(2)}%)</span>
        </p>
      </div>
    </div>
  );
}

// ─── News Display ─────────────────────────────────────────────────────────────

function NewsDisplay({ config, hasBg = false }: { config: Record<string, unknown>; hasBg?: boolean }) {
  const q   = (config.q   as string) || "أخبار";
  const max = (config.max as number) || 6;
  const [data, setData] = useState<{ articles?: Record<string, unknown>[] } | null>(null);
  const [err,  setErr]  = useState("");
  const load = useCallback(() => {
    setErr(""); setData(null);
    api.get<{ articles?: Record<string, unknown>[] }>(
      `/smart-banners/proxy/news?q=${encodeURIComponent(q)}&max=${max}`
    ).then(setData).catch(e => setErr(e?.message || "تعذر جلب الأخبار"));
  }, [q, max]);
  useEffect(() => { load(); }, [load]);

  if (err.includes("مفتاح")) return <NeedsKeyCard label="GNews API" />;
  if (err) return <ErrorCard msg={err} onRetry={load} />;
  if (!data) return <LoadingCard />;

  const articles = data.articles || [];

  if (articles.length === 0) {
    return (
      <div className={cn("w-full rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground", hasBg && "bg-black/30 border-white/20 text-white/70")} dir="rtl">
        لا توجد أخبار
      </div>
    );
  }

  const wrap = hasBg
    ? "w-full overflow-hidden text-white"
    : "w-full rounded-2xl border bg-card overflow-hidden";
  const header = hasBg
    ? "flex items-center gap-2 px-4 py-3 bg-black/30 backdrop-blur-sm border-b border-white/20"
    : "flex items-center gap-2 px-4 py-3 bg-rose-600 text-white";
  const row = hasBg
    ? "flex gap-3 p-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-0"
    : "flex gap-3 p-3 hover:bg-muted/40 transition-colors";

  return (
    <div className={wrap} dir="rtl">
      <div className={header}>
        <Newspaper className="w-4 h-4" />
        <p className="text-sm font-bold">آخر الأخبار</p>
      </div>
      <div>
        {articles.slice(0, 5).map((a, i) => (
          <div key={i} className={row}>
            {!!a.image && (
              <img src={a.image as string} alt="" className="w-16 h-12 object-cover rounded-md flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-semibold line-clamp-2 leading-snug", hasBg && "text-white/90")}>{a.title as string}</p>
              <p className={cn("text-[10px] mt-1", hasBg ? "text-white/50" : "text-muted-foreground")}>{a.source as string}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Football Displays ────────────────────────────────────────────────────────

function FootballDisplay({ config, hasBg = false }: { config: Record<string, unknown>; hasBg?: boolean }) {
  const competition = (config.competition as string) || "WC";
  const type        = (config.type        as string) || "live";
  const [data,     setData]     = useState<Record<string, unknown> | null>(null);
  const [err,      setErr]      = useState("");
  const [isFallback, setIsFallback] = useState(false); // true when live→today fallback used

  const load = useCallback(async () => {
    setErr(""); setData(null); setIsFallback(false);
    try {
      const d = await api.get<Record<string, unknown>>(
        `/smart-banners/proxy/football?competition=${competition}&type=${type}`
      );
      // لو النوع "مباشر" وما فيه مباريات حالياً، نرجع مباريات اليوم كـ fallback
      if (type === "live") {
        const liveMatches = (d.matches as Record<string, unknown>[]) || [];
        if (liveMatches.length === 0) {
          setIsFallback(true);
          const today = await api.get<Record<string, unknown>>(
            `/smart-banners/proxy/football?competition=${competition}&type=today`
          );
          setData(today);
          return;
        }
      }
      setData(d);
    } catch(e: unknown) {
      setErr((e as Error)?.message || "تعذر جلب البيانات");
    }
  }, [competition, type]);
  useEffect(() => { void load(); }, [load]);

  if (err.includes("مفتاح")) return <NeedsKeyCard label="Football-Data.org" />;
  if (err) return <ErrorCard msg={err} onRetry={load} />;
  if (!data) return <LoadingCard />;

  // ─── Empty state (يظهر دائماً بدل الاختفاء) ───────────────────────────────
  const emptyState = (label: string) => (
    <div className={cn(
      "w-full flex flex-col items-center justify-center py-5 gap-2 rounded-2xl",
      hasBg ? "text-white/70" : "border bg-card text-muted-foreground"
    )} dir="rtl">
      <span className="text-2xl">⚽</span>
      <p className="text-xs font-medium">{competition} · {label}</p>
    </div>
  );

  if (type === "standings") {
    const allGroups = (data.standings as Record<string, unknown>[]) || [];
    if (allGroups.length === 0) return emptyState("لا يوجد جدول متاح");
    const standings = (allGroups[0]?.table as Record<string, unknown>[]) || [];
    if (standings.length === 0) return emptyState("لا يوجد جدول متاح");
    const groupName = (allGroups[0]?.group as string) || "";
    const tw = hasBg
      ? { wrap: "text-white overflow-hidden", head: "border-b border-white/20 px-3 py-1.5", tHead: "bg-white/10", row: "hover:bg-white/10 border-b border-white/10", text: "text-white/70" }
      : { wrap: "rounded-2xl border bg-card overflow-hidden", head: "border-b bg-muted/50 px-3 py-1.5", tHead: "bg-muted/30", row: "hover:bg-muted/30", text: "text-muted-foreground" };
    return (
      <div className={cn("w-full", tw.wrap)} dir="rtl">
        {groupName && (
          <div className={tw.head}>
            <p className={cn("text-[11px] font-semibold", tw.text)}>{competition} · {groupName}</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={tw.tHead}>
              <tr>
                <th className="px-2 py-1.5 text-right">#</th>
                <th className="px-2 py-1.5 text-right">الفريق</th>
                <th className="px-2 py-1.5 text-center">لع</th>
                <th className="px-2 py-1.5 text-center">فز</th>
                <th className="px-2 py-1.5 text-center">خس</th>
                <th className="px-2 py-1.5 text-center font-bold">نق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.slice(0, 8).map((s) => {
                const team = s.team as Record<string, unknown>;
                return (
                  <tr key={s.position as number} className={tw.row}>
                    <td className="px-2 py-1.5 font-bold">{s.position as number}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {!!team.crest && <img src={team.crest as string} className="w-4 h-4 object-contain" alt="" />}
                        <span className="truncate max-w-[120px]">{team.shortName as string || team.name as string}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">{s.playedGames as number}</td>
                    <td className={cn("px-2 py-1.5 text-center", hasBg ? "text-green-400" : "text-emerald-600")}>{s.won as number}</td>
                    <td className={cn("px-2 py-1.5 text-center", hasBg ? "text-red-400" : "text-red-500")}>{s.lost as number}</td>
                    <td className="px-2 py-1.5 text-center font-bold">{s.points as number}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const matches = (data.matches as Record<string, unknown>[]) || [];

  // العنوان: مباريات اليوم للـ today/fallback، مباشر للـ live الحقيقي، النتائج للـ results
  const headerLabel =
    type === "results" ? "النتائج" :
    (type === "live" && !isFallback) ? "مباشر 🔴" :
    "مباريات اليوم";

  if (matches.length === 0) return emptyState(
    type === "live" ? "لا توجد مباريات مجدولة اليوم"
    : type === "today" ? "لا توجد مباريات اليوم"
    : "لا توجد نتائج متاحة"
  );

  // ألوان موحّدة حسب hasBg
  const wrapCls   = hasBg
    ? "w-full h-full flex flex-col overflow-hidden text-white"
    : "w-full h-full flex flex-col rounded-2xl border overflow-hidden bg-card";
  const headerCls = hasBg
    ? "flex items-center justify-between px-3 shrink-0 bg-black/30 backdrop-blur-sm border-b border-white/20"
    : "flex items-center justify-between px-3 shrink-0 bg-muted/40 border-b";
  const cardBorder = hasBg
    ? "border-r border-white/15 last:border-0"
    : "border-r last:border-0";
  const mutedTxt  = hasBg ? "text-white/55" : "text-muted-foreground";
  const teamTxt   = hasBg ? "text-white/90"  : "text-foreground";

  return (
    <div className={wrapCls} dir="rtl">
      {/* ── Header ── */}
      <div className={headerCls} style={{ height: 26 }}>
        <span className={cn("text-[11px] font-bold leading-none", teamTxt)}>
          {headerLabel}
        </span>
        <span className={cn("text-[10px] font-mono leading-none", mutedTxt)}>
          {competition}
        </span>
      </div>

      {/* ── Horizontal match cards — overflow-x scroll, no scrollbar ── */}
      <div
        className="flex-1 flex flex-row-reverse overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {matches.slice(0, 10).map((m, i) => {
          const home        = m.homeTeam as Record<string, unknown>;
          const away        = m.awayTeam as Record<string, unknown>;
          const score       = m.score    as Record<string, unknown>;
          const ft          = score?.fullTime as Record<string, number | null> | null;
          const hasScore    = ft && (ft.home !== null || ft.away !== null);
          const matchStatus = m.status  as string;
          const utcDate     = m.utcDate as string;
          const isLive      = matchStatus === "IN_PLAY" || matchStatus === "PAUSED" || matchStatus === "HALFTIME";

          let timeLabel = "";
          if (matchStatus === "TIMED" || matchStatus === "SCHEDULED") {
            try { timeLabel = new Date(utcDate).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }); }
            catch { timeLabel = ""; }
          } else if (isLive)                                          { timeLabel = "🔴"; }
          else if (matchStatus === "FINISHED" || matchStatus === "AWARDED") { timeLabel = "انتهت"; }
          else if (matchStatus === "HALFTIME")                        { timeLabel = "استراحة"; }

          const homeName = (home.shortName as string) || (home.name as string) || "";
          const awayName = (away.shortName as string) || (away.name as string) || "";

          return (
            <div
              key={i}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3",
                cardBorder,
              )}
              style={{ minWidth: 110 }}
            >
              {/* فريق المضيف */}
              <div className="flex items-center gap-1 max-w-[96px]">
                {!!home.crest && (
                  <img src={home.crest as string} className="w-4 h-4 object-contain flex-shrink-0" alt="" />
                )}
                <span className={cn("text-[11px] font-semibold truncate", teamTxt)}>{homeName}</span>
              </div>

              {/* نتيجة / وقت */}
              {hasScore ? (
                <span className={cn(
                  "text-[11px] font-bold rounded px-1.5 py-px leading-none",
                  isLive
                    ? "bg-green-600 text-white"
                    : hasBg ? "bg-white/15 text-white" : "bg-muted text-foreground",
                )}>
                  {ft!.home} : {ft!.away}
                </span>
              ) : (
                <span className={cn("text-[11px] font-medium leading-none", mutedTxt)}>
                  {timeLabel || "vs"}
                </span>
              )}

              {/* فريق الضيف */}
              <div className="flex items-center gap-1 max-w-[96px]">
                {!!away.crest && (
                  <img src={away.crest as string} className="w-4 h-4 object-contain flex-shrink-0" alt="" />
                )}
                <span className={cn("text-[11px] font-semibold truncate", teamTxt)}>{awayName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HTML Display ─────────────────────────────────────────────────────────────

function HtmlDisplay({ config }: { config: Record<string, unknown> }) {
  const html   = (config.html   as string) || "";
  const height = (config.height as number) || 200;
  if (!html) {
    return (
      <div className="w-full rounded-xl border-2 border-dashed flex items-center justify-center gap-3 p-8 text-muted-foreground" style={{ height }}>
        <Code2 className="w-6 h-6" />
        <p className="text-sm">لم يتم إضافة HTML بعد</p>
      </div>
    );
  }
  return (
    <div
      className="w-full overflow-hidden rounded-xl"
      style={{ height }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Background Image Wrapper ─────────────────────────────────────────────────

function BannerBgWrapper({
  config,
  children,
  className,
}: {
  config:    Record<string, unknown>;
  children:  React.ReactNode;
  className?: string;
}) {
  const bgImage = (config.backgroundImage as string) || "";
  const opacity = typeof config.bgOverlayOpacity === "number" ? config.bgOverlayOpacity : 55;

  if (!bgImage) return <>{children}</>;

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <img
        src={bgImage}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        alt=""
        draggable={false}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `rgba(0,0,0,${opacity / 100})` }}
      />
      <div className="relative z-10 w-full h-full overflow-auto">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  banner:    SmartBannerShape;
  className?: string;
}

const FOOTBALL_TYPE_MAP: Record<string, string> = {
  "live-matches":  "live",
  "today-matches": "today",
  "results":       "results",
  "standings":     "standings",
};

export function SmartBannerDisplay({ banner, className }: Props) {
  const cfg    = banner.config;
  const hasBg  = !!(cfg.backgroundImage as string);

  const inner = (() => {
    if (banner.type === "countdown") {
      return <CountdownDisplay config={{ ...defaultCountdownConfig(), ...cfg } as CountdownConfig} />;
    }
    if (FOOTBALL_TYPE_MAP[banner.type]) {
      return (
        <FootballDisplay
          hasBg={hasBg}
          config={{
            competition: "WC",
            ...cfg,
            type: FOOTBALL_TYPE_MAP[banner.type] ?? "live",
          }}
        />
      );
    }
    if (banner.type === "weather")  return <WeatherDisplay  hasBg={hasBg} config={cfg} />;
    if (banner.type === "currency") return <CurrencyDisplay hasBg={hasBg} config={cfg} />;
    if (banner.type === "gold")     return <GoldDisplay     hasBg={hasBg} config={cfg} />;
    if (banner.type === "news")     return <NewsDisplay     hasBg={hasBg} config={cfg} />;
    if (banner.type === "html")     return <HtmlDisplay     config={cfg} />;
    return null;
  })();

  if (banner.type === "countdown") {
    // Countdown has its own bg system
    return <div className={cn("w-full", className)}>{inner}</div>;
  }

  return (
    <div className={cn("w-full", hasBg ? "h-full" : "", className)}>
      <BannerBgWrapper config={cfg} className="min-h-full">
        {inner}
      </BannerBgWrapper>
    </div>
  );
}

// ─── Type label/icon helpers (exported for the admin page) ────────────────────

export const BANNER_TYPE_META: Record<BannerType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  "live-matches":  { label: "مباشر 🔴",         icon: Wifi,     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  "today-matches": { label: "مباريات اليوم",    icon: Calendar, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "results":       { label: "نتائج المباريات",  icon: Trophy,   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "standings":     { label: "ترتيب الدوريات",  icon: Trophy,   color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  "news":          { label: "الأخبار",          icon: Newspaper, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  "weather":       { label: "الطقس",            icon: CloudSun, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  "gold":          { label: "أسعار الذهب",      icon: Coins,    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  "currency":      { label: "أسعار العملات",    icon: Coins,    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "countdown":     { label: "عداد تنازلي",      icon: Clock,    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "html":          { label: "HTML مخصص",        icon: Code2,    color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
};
