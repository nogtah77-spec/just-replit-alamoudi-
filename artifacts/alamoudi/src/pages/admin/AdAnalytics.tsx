import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/context/DataContext";
import { api } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Eye, MousePointerClick, TrendingUp, Users, Clock, ChevronRight,
  Monitor, Smartphone, Tablet, Globe, BarChart2, RefreshCw, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ad } from "@/context/DataContext";

// ─── أنواع بيانات الـ API ────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalClicks: number;
    ctr: number;
    uniqueVisitors: number;
    uniqueClickers: number;
    avgViewDuration: number;
    periodViews: number;
    periodClicks: number;
  };
  visitors: { today: number; last7d: number; last30d: number; all: number };
  devices:    Record<string, number>;
  browsers:   Record<string, number>;
  os:         Record<string, number>;
  languages:  Record<string, number>;
  referrerTypes: Record<string, number>;
  referrerPages: Record<string, number>;
  countries:  Array<{ name: string; code: string; count: number }>;
  cities:     Array<{ city: string; country: string; countryCode: string; count: number }>;
  regions:    Array<{ region: string; country: string; countryCode: string; count: number }>;
  screenSizes: Record<string, number>;
  timeline: Array<{ date: string; views: number; clicks: number; ctr: number }>;
  peakHours: number[];
  weekdays:  number[];
  clickHeatmap: Array<{ x: number; y: number }>;
  period: { from: string; to: string };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mobile:  Smartphone,
  tablet:  Tablet,
  desktop: Monitor,
};

const DEVICE_LABELS: Record<string, string> = {
  mobile:  "جوال",
  tablet:  "تابلت",
  desktop: "ديسكتوب",
};

const REFERRER_LABELS: Record<string, string> = {
  direct:   "رابط مباشر",
  internal: "صفحة داخلية",
  search:   "محرك بحث",
  social:   "سوشيال ميديا",
  external: "موقع خارجي",
};

const WEEKDAY_LABELS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const CHART_COLORS = ["#A9927D", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// تحويل كود الدولة (مثل EG) إلى إيموجي علم
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const offset = 127397;
  return String.fromCodePoint(
    code.toUpperCase().charCodeAt(0) + offset,
    code.toUpperCase().charCodeAt(1) + offset,
  );
}

function msToReadable(ms: number): string {
  if (ms < 1000) return `${ms} مللي ث`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} ث`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m} د ${sec} ث` : `${m} د`;
}

function percent(val: number, total: number): string {
  if (!total) return "0%";
  return `${((val / total) * 100).toFixed(1)}%`;
}

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
  active:   { label: "نشط",    color: "bg-green-100 text-green-800 border-green-200"  },
  scheduled:{ label: "مجدول",  color: "bg-blue-100  text-blue-800  border-blue-200"   },
  expired:  { label: "منتهي",  color: "bg-red-100   text-red-800   border-red-200"    },
  disabled: { label: "معطّل",  color: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

// ─── Period filter ────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "all";

function getPeriodDates(period: Period): { from: string; to: string } {
  const to  = new Date();
  const from = new Date();
  if (period === "7d")  from.setDate(from.getDate() - 7);
  if (period === "30d") from.setDate(from.getDate() - 30);
  if (period === "90d") from.setDate(from.getDate() - 90);
  if (period === "all") from.setFullYear(2020);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = "text-accent",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 flex items-start gap-4">
      <div className={cn("rounded-xl p-2.5 bg-accent/10", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── BreakdownList ─────────────────────────────────────────────────────────────

function BreakdownList({ data, total, labelMap }: {
  data: Record<string, number>;
  total: number;
  labelMap?: Record<string, string>;
}) {
  const sorted = Object.entries(data)
    .filter(([k]) => k && k !== "null" && k !== "undefined" && k !== "Unknown")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  if (sorted.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات بعد</p>
  );

  return (
    <div className="space-y-2.5">
      {sorted.map(([key, val], idx) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[60%]">
              {labelMap?.[key] ?? key}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {val.toLocaleString("en-US")} ({percent(val, total)})
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: percent(val, total),
                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── GeoBreakdownList ──────────────────────────────────────────────────────────

function GeoBreakdownList({
  items, total, labelKey, subKey, codeKey, limit = 10,
}: {
  items: Array<Record<string, string | number>>;
  total: number;
  labelKey: string;
  subKey?: string;
  codeKey?: string;
  limit?: number;
}) {
  const top = items.slice(0, limit);
  if (top.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-4">
      لا توجد بيانات جغرافية — ستظهر تلقائياً مع أول زيارة حقيقية
    </p>
  );
  return (
    <div className="space-y-2.5">
      {top.map((item, idx) => {
        const label = String(item[labelKey] ?? "");
        const code  = codeKey ? String(item[codeKey] ?? "") : "";
        const sub   = subKey  ? String(item[subKey]  ?? "") : "";
        const val   = Number(item.count ?? 0);
        const flag  = code.length === 2 ? countryFlag(code) : "";
        return (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[65%] flex items-center gap-1.5">
                {flag && <span className="text-base leading-none">{flag}</span>}
                <span>{label}</span>
                {sub && <span className="text-xs text-muted-foreground">({sub})</span>}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {val.toLocaleString("en-US")} ({percent(val, total)})
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: percent(val, total),
                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Click Heatmap ─────────────────────────────────────────────────────────────

function ClickHeatmap({ points, adImageUrl }: { points: Array<{ x: number; y: number }>; adImageUrl: string }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات نقرات بعد</p>;
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-100" style={{ aspectRatio: "16/9" }}>
      {adImageUrl && (
        <img src={adImageUrl} alt="الإعلان" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x * 100}
            cy={p.y * 100}
            r="2.5"
            fill={CHART_COLORS[0]}
            fillOpacity="0.6"
          />
        ))}
      </svg>
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
        {points.length} نقرة
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function AdAnalytics() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { settings } = useData();

  const ad = useMemo(
    () => (settings.ads ?? []).find(a => a.id === id),
    [settings.ads, id]
  );

  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getPeriodDates(period);
      const res = await api.get<AnalyticsData>(
        `/ads/${id}/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      setData(res);
    } catch {
      setError("تعذّر تحميل الإحصائيات، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [id, period]);

  if (!ad) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p>الإعلان غير موجود</p>
        <Button variant="outline" onClick={() => navigate("/admin/ads")}>العودة للإعلانات</Button>
      </div>
    </AdminLayout>
  );

  const status  = getAdStatus(ad);
  const statusCfg = STATUS_CONFIG[status];
  const totalViews  = data?.overview.totalViews  ?? 0;
  const totalClicks = data?.overview.totalClicks ?? 0;
  const periodViews  = data?.overview.periodViews  ?? 0;
  const periodClicks = data?.overview.periodClicks ?? 0;

  const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "7d",  label: "٧ أيام" },
    { value: "30d", label: "٣٠ يوماً" },
    { value: "90d", label: "٩٠ يوماً" },
    { value: "all", label: "الكل" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10" dir="rtl">

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/ads")} className="w-fit gap-1.5">
            <ChevronRight className="w-4 h-4" />
            الإعلانات
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("border text-xs px-2.5 py-0.5", statusCfg.color)}>{statusCfg.label}</Badge>
            <div className="flex rounded-lg border overflow-hidden">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    period === opt.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={loadData} disabled={loading} className="gap-1.5">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              تحديث
            </Button>
          </div>
        </div>

        {/* ─── Campaign Summary ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
            {(ad.desktopImageUrl || ad.imageUrl) && (
              <img
                src={ad.desktopImageUrl || ad.imageUrl}
                alt={ad.title}
                className="w-full sm:w-48 h-28 object-cover rounded-xl shrink-0"
              />
            )}
            <div className="flex-1 space-y-1.5">
              <h2 className="text-lg font-bold">{ad.title || "بدون عنوان"}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {ad.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    البداية: {new Date(ad.startDate).toLocaleDateString("ar-SA-u-nu-latn")}
                  </span>
                )}
                {ad.endDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    النهاية: {new Date(ad.endDate).toLocaleDateString("ar-SA-u-nu-latn")}
                  </span>
                )}
                {ad.endDate && new Date(ad.endDate) > new Date() && (
                  <span className="text-green-600 font-medium">
                    متبقي: {Math.ceil((new Date(ad.endDate).getTime() - Date.now()) / 86400000)} يوم
                  </span>
                )}
                {ad.linkUrl && (
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate max-w-xs">
                    {ad.linkUrl}
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                النوع: {(ad.type ?? "premium") === "premium" ? "رئيسي (Premium)" : "ثانوي (Secondary)"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ─── Overview Cards ───────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">ملخص الفترة المحددة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={Eye} label="مشاهدات الفترة" value={loading ? "—" : periodViews.toLocaleString("en-US")} />
            <StatCard icon={MousePointerClick} label="نقرات الفترة" value={loading ? "—" : periodClicks.toLocaleString("en-US")} />
            <StatCard
              icon={TrendingUp}
              label="معدل النقر (CTR)"
              value={loading ? "—" : `${data?.overview.ctr ?? 0}%`}
              color="text-green-600"
            />
            <StatCard
              icon={Users}
              label="زوار فريدون"
              value={loading ? "—" : (data?.overview.uniqueVisitors ?? 0).toLocaleString("en-US")}
              color="text-blue-600"
            />
            <StatCard
              icon={Clock}
              label="متوسط وقت المشاهدة"
              value={loading ? "—" : msToReadable(data?.overview.avgViewDuration ?? 0)}
              color="text-purple-600"
            />
            <StatCard icon={Eye} label="إجمالي المشاهدات" value={loading ? "—" : totalViews.toLocaleString("en-US")} sub="منذ إنشاء الإعلان" />
            <StatCard icon={MousePointerClick} label="إجمالي النقرات" value={loading ? "—" : totalClicks.toLocaleString("en-US")} sub="منذ إنشاء الإعلان" />
            <StatCard
              icon={TrendingUp}
              label="إجمالي CTR"
              value={loading ? "—" : (totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(2)}%` : "0%")}
              sub="منذ إنشاء الإعلان"
            />
          </div>
        </div>

        {/* ─── Visitors breakdown ──────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">الزوار</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "اليوم",     value: data?.visitors.today ?? 0 },
              { label: "آخر 7 أيام", value: data?.visitors.last7d ?? 0 },
              { label: "آخر 30 يوماً", value: data?.visitors.last30d ?? 0 },
              { label: "الإجمالي",  value: data?.visitors.all ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold">{loading ? "—" : value.toLocaleString("en-US")}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Timeline ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h3 className="font-semibold mb-4">المخطط الزمني (يومي)</h3>
          {loading ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">جارٍ التحميل…</div>
          ) : (data?.timeline?.length ?? 0) === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => v.slice(5)}
                  reversed
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    val,
                    name === "views" ? "مشاهدات" : name === "clicks" ? "نقرات" : "CTR%",
                  ]}
                  labelFormatter={l => `يوم ${l}`}
                />
                <Legend formatter={v => v === "views" ? "مشاهدات" : v === "clicks" ? "نقرات" : "CTR%"} />
                <Line type="monotone" dataKey="views"  stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── Devices + Browsers ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">الأجهزة</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={Object.entries(data?.devices ?? {}).map(([k, v]) => ({ name: DEVICE_LABELS[k] ?? k, value: v }))}
                        cx="50%" cy="50%" outerRadius={65}
                        dataKey="value"
                        label={({ name, percent: pct }) => `${name} ${(pct * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {Object.keys(data?.devices ?? {}).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <BreakdownList data={data?.devices ?? {}} total={periodViews} labelMap={DEVICE_LABELS} />
              </>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">المتصفحات</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <BreakdownList data={data?.browsers ?? {}} total={periodViews} />
            )}
          </div>
        </div>

        {/* ─── OS + Languages ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">نظام التشغيل</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <BreakdownList data={data?.os ?? {}} total={periodViews} />
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">اللغات</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <BreakdownList data={data?.languages ?? {}} total={periodViews} />
            )}
          </div>
        </div>

        {/* ─── Traffic Sources ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">مصادر الزيارة</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <BreakdownList data={data?.referrerTypes ?? {}} total={periodViews} labelMap={REFERRER_LABELS} />
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">الصفحات الداخلية المصدر</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <BreakdownList data={data?.referrerPages ?? {}} total={periodViews} />
            )}
          </div>
        </div>

        {/* ─── Countries ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-accent" />
            <h3 className="font-semibold">الدول</h3>
            {(data?.countries?.length ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-auto">
                {data!.countries.length} دولة
              </span>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
          ) : (
            <GeoBreakdownList
              items={data?.countries as Array<Record<string, string | number>> ?? []}
              total={periodViews}
              labelKey="name"
              codeKey="code"
            />
          )}
        </div>

        {/* ─── Cities + Regions ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">المدن</h3>
              {(data?.cities?.length ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-auto">
                  {data!.cities.length} مدينة
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <GeoBreakdownList
                items={data?.cities as Array<Record<string, string | number>> ?? []}
                total={periodViews}
                labelKey="city"
                subKey="country"
                codeKey="countryCode"
              />
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold">المناطق</h3>
              {(data?.regions?.length ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-auto">
                  {data!.regions.length} منطقة
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
            ) : (
              <GeoBreakdownList
                items={data?.regions as Array<Record<string, string | number>> ?? []}
                total={periodViews}
                labelKey="region"
                subKey="country"
                codeKey="countryCode"
              />
            )}
          </div>
        </div>

        {/* ─── Screen Sizes ────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h3 className="font-semibold mb-4">أحجام الشاشة</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <BreakdownList data={data?.screenSizes ?? {}} total={periodViews} />
            </div>
          )}
        </div>

        {/* ─── Peak Hours ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h3 className="font-semibold mb-4">أفضل ساعات المشاهدة</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">جارٍ التحميل…</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={(data?.peakHours ?? Array(24).fill(0)).map((v, i) => ({ hour: `${i}:00`, views: v }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "مشاهدات"]} />
                <Bar dataKey="views" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── Weekdays ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h3 className="font-semibold mb-4">أفضل أيام الأسبوع</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">جارٍ التحميل…</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={(data?.weekdays ?? Array(7).fill(0)).map((v, i) => ({ day: WEEKDAY_LABELS[i], views: v }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "مشاهدات"]} />
                <Bar dataKey="views" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── Click Heatmap ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h3 className="font-semibold mb-4">خريطة حرارة النقرات</h3>
          <p className="text-xs text-muted-foreground mb-3">
            يُظهر المناطق الأكثر ضغطاً على الإعلان — كل نقطة تمثل نقرة حقيقية
          </p>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">جارٍ التحميل…</div>
          ) : (
            <ClickHeatmap
              points={data?.clickHeatmap ?? []}
              adImageUrl={ad.desktopImageUrl || ad.imageUrl || ""}
            />
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
