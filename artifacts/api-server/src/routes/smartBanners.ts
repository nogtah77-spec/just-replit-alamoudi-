import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db, smartBannersTable, settingsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireStaff, requireAdmin } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

// ─── Simple TTL cache ─────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expires: number }>();
function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  return e && Date.now() < e.expires ? (e.data as T) : null;
}
function setCached(key: string, data: unknown, ttlMs = 5 * 60_000): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// ─── Read stored service settings ────────────────────────────────────────────

async function getBannerServices(): Promise<Record<string, Record<string, string>>> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, "main")).limit(1);
  const data = (row?.data ?? {}) as Record<string, unknown>;
  return (data.bannerServices ?? {}) as Record<string, Record<string, string>>;
}

// ─── Service settings (API keys) — admin-only ────────────────────────────────
// These routes manage third-party API credentials stored in the settings record.
// They are restricted to admins to prevent agents from reading or overwriting keys.

/** Return per-service metadata only — never return the stored key value. */
router.get("/smart-banners/services", requireAdmin, async (_req, res): Promise<void> => {
  const svc = await getBannerServices();
  // Mask actual key values: return { configured: boolean } per service instead.
  const masked: Record<string, Record<string, unknown>> = {};
  for (const [name, cfg] of Object.entries(svc)) {
    masked[name] = {};
    for (const [k, v] of Object.entries(cfg)) {
      masked[name][k] = k.toLowerCase().includes("key") || k.toLowerCase().includes("token")
        ? (v ? "••••••••" : "")
        : v;
    }
  }
  res.json(masked);
});

router.put("/smart-banners/services", requireAdmin, async (req, res): Promise<void> => {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, "main")).limit(1);
  const data = (row?.data ?? {}) as Record<string, unknown>;
  const existing = (data.bannerServices ?? {}) as Record<string, Record<string, string>>;

  // Merge incoming config per-service, preserving existing secrets when the
  // caller sends the masked placeholder ("••••••••") or an empty value.
  const incoming = req.body as Record<string, Record<string, string>>;
  const merged: Record<string, Record<string, string>> = { ...existing };
  for (const [svcName, cfg] of Object.entries(incoming)) {
    merged[svcName] = { ...(existing[svcName] ?? {}) };
    for (const [k, v] of Object.entries(cfg)) {
      const isSecret = k.toLowerCase().includes("key") || k.toLowerCase().includes("token");
      // Skip masked placeholder or blank secret — keep the stored value.
      if (isSecret && (!v || v === "••••••••")) continue;
      merged[svcName][k] = v;
    }
  }

  const newData = { ...data, bannerServices: merged };
  await db.insert(settingsTable).values({ id: "main", data: newData })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: newData } });
  await logActivity({ action: "updated", entityType: "settings", title: "تم تحديث إعدادات خدمات البانر الذكي", actor: actorFromReq(req) });
  res.json({ ok: true });
});

router.post("/smart-banners/services/test/:service", requireAdmin, async (req, res): Promise<void> => {
  const { service } = req.params;
  const svc = await getBannerServices();
  try {
    switch (service) {
      case "football": {
        const key = svc.football?.apiKey;
        if (!key) { res.json({ ok: false, error: "مفتاح API غير موجود" }); return; }
        const r = await fetch("https://api.football-data.org/v4/competitions",
          { headers: { "X-Auth-Token": key }, signal: AbortSignal.timeout(6000) });
        res.json(r.ok ? { ok: true, message: "الاتصال ناجح بـ Football-Data.org" } : { ok: false, error: `خطأ ${r.status}` });
        break;
      }
      case "weather": {
        const key = svc.weather?.apiKey;
        const city = svc.weather?.defaultCity || "Cairo";
        if (!key) { res.json({ ok: false, error: "مفتاح API غير موجود" }); return; }
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`,
          { signal: AbortSignal.timeout(6000) });
        res.json(r.ok ? { ok: true, message: "الاتصال ناجح بـ OpenWeatherMap" } : { ok: false, error: `خطأ ${r.status}` });
        break;
      }
      case "news": {
        const key = svc.news?.apiKey;
        if (!key) { res.json({ ok: false, error: "مفتاح API غير موجود" }); return; }
        const r = await fetch(`https://gnews.io/api/v4/search?q=news&token=${key}&max=1`,
          { signal: AbortSignal.timeout(6000) });
        res.json(r.ok ? { ok: true, message: "الاتصال ناجح بـ GNews API" } : { ok: false, error: `خطأ ${r.status}` });
        break;
      }
      case "gold": {
        const key = svc.gold?.apiKey;
        if (!key) { res.json({ ok: false, error: "مفتاح API غير موجود" }); return; }
        const r = await fetch("https://www.goldapi.io/api/XAU/USD",
          { headers: { "x-access-token": key }, signal: AbortSignal.timeout(6000) });
        res.json(r.ok ? { ok: true, message: "الاتصال ناجح بـ GoldAPI.io" } : { ok: false, error: `خطأ ${r.status}` });
        break;
      }
      case "currency": {
        const r = await fetch("https://api.frankfurter.app/latest?from=USD",
          { signal: AbortSignal.timeout(6000) });
        res.json(r.ok ? { ok: true, message: "الاتصال ناجح — لا يحتاج مفتاح" } : { ok: false, error: "تعذر الاتصال" });
        break;
      }
      default:
        res.status(400).json({ ok: false, error: "خدمة غير معروفة" });
    }
  } catch (e: unknown) {
    res.json({ ok: false, error: e instanceof Error ? e.message : "تعذر الاتصال" });
  }
});

// ─── Proxy: Football-Data.org ─────────────────────────────────────────────────

router.get("/smart-banners/proxy/football", async (req, res): Promise<void> => {
  const { competition = "PL", type = "live" } = req.query as Record<string, string>;
  const cacheKey = `football:${competition}:${type}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  const svc = await getBannerServices();
  const key = svc.football?.apiKey;
  if (!key) { res.status(400).json({ error: "مفتاح API مطلوب", needsKey: true }); return; }

  try {
    let url: string;
    if (type === "standings") {
      url = `https://api.football-data.org/v4/competitions/${competition}/standings`;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (type === "live") {
        // IN_PLAY + PAUSED = مباشر الآن
        url = `https://api.football-data.org/v4/competitions/${competition}/matches?status=IN_PLAY,PAUSED`;
      } else if (type === "today") {
        // كل مباريات اليوم بغض النظر عن الحالة (قادمة + مباشرة + منتهية)
        url = `https://api.football-data.org/v4/competitions/${competition}/matches?dateFrom=${today}&dateTo=${today}`;
      } else {
        // results = المنتهية
        url = `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED`;
      }
    }
    const r = await fetch(url, { headers: { "X-Auth-Token": key }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { res.status(r.status).json({ error: `Football API: ${r.status}` }); return; }
    const data = await r.json();
    setCached(cacheKey, data, type === "live" ? 60_000 : 5 * 60_000);
    res.json(data);
  } catch { res.status(500).json({ error: "تعذر الاتصال بـ Football API" }); }
});

// ─── Proxy: OpenWeatherMap ────────────────────────────────────────────────────

router.get("/smart-banners/proxy/weather", async (req, res): Promise<void> => {
  const { city = "Cairo", unit = "metric" } = req.query as Record<string, string>;
  const cacheKey = `weather:${city}:${unit}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  const svc = await getBannerServices();
  const key = svc.weather?.apiKey;
  if (!key) { res.status(400).json({ error: "مفتاح API مطلوب", needsKey: true }); return; }

  try {
    const r = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=${unit}&lang=ar`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!r.ok) { res.status(r.status).json({ error: `Weather API: ${r.status}` }); return; }
    const data = await r.json();
    setCached(cacheKey, data, 10 * 60_000);
    res.json(data);
  } catch { res.status(500).json({ error: "تعذر جلب بيانات الطقس" }); }
});

// ─── Proxy: Currency (free, no key) ──────────────────────────────────────────

router.get("/smart-banners/proxy/currency", async (req, res): Promise<void> => {
  const { from = "USD", to = "EGP,EUR,GBP,SAR,AED,KWD" } = req.query as Record<string, string>;
  const cacheKey = `currency:${from}:${to}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { signal: AbortSignal.timeout(6000) });
    if (!r.ok) { res.status(r.status).json({ error: `Currency API: ${r.status}` }); return; }
    const data = await r.json();
    setCached(cacheKey, data, 30 * 60_000);
    res.json(data);
  } catch { res.status(500).json({ error: "تعذر جلب أسعار العملات" }); }
});

// ─── Proxy: Gold (GoldAPI.io) ─────────────────────────────────────────────────

router.get("/smart-banners/proxy/gold", async (req, res): Promise<void> => {
  const { currency = "USD" } = req.query as Record<string, string>;
  const cacheKey = `gold:${currency}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  const svc = await getBannerServices();
  const key = svc.gold?.apiKey;
  if (!key) { res.status(400).json({ error: "مفتاح API مطلوب", needsKey: true }); return; }

  try {
    const r = await fetch(`https://www.goldapi.io/api/XAU/${currency}`,
      { headers: { "x-access-token": key, "Content-Type": "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) { res.status(r.status).json({ error: `Gold API: ${r.status}` }); return; }
    const data = await r.json();
    setCached(cacheKey, data, 30 * 60_000);
    res.json(data);
  } catch { res.status(500).json({ error: "تعذر جلب أسعار الذهب" }); }
});

// ─── Proxy: News (GNews) ──────────────────────────────────────────────────────

router.get("/smart-banners/proxy/news", async (req, res): Promise<void> => {
  const { q = "أخبار", lang = "ar", max = "8" } = req.query as Record<string, string>;
  const cacheKey = `news:${q}:${lang}:${max}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  const svc = await getBannerServices();
  const key = svc.news?.apiKey;
  if (!key) { res.status(400).json({ error: "مفتاح API مطلوب", needsKey: true }); return; }

  try {
    const r = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&max=${max}&token=${key}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!r.ok) { res.status(r.status).json({ error: `News API: ${r.status}` }); return; }
    const data = await r.json();
    setCached(cacheKey, data, 15 * 60_000);
    res.json(data);
  } catch { res.status(500).json({ error: "تعذر جلب الأخبار" }); }
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

router.get("/smart-banners", async (req, res): Promise<void> => {
  const sess = req.session as { userId?: string; role?: string };
  const isStaff = !!sess?.userId && (sess.role === "admin" || sess.role === "agent");
  const rows = await db.select().from(smartBannersTable).orderBy(asc(smartBannersTable.order));
  res.json(isStaff ? rows : rows.filter(b => b.active));
});

router.post("/smart-banners", requireStaff, async (req, res): Promise<void> => {
  const { type, title, config, active = true, order = 0, slot = "top", pinned = false, duration = 10 } = req.body as {
    type?: string; title?: string; config?: Record<string, unknown>;
    active?: boolean; order?: number; slot?: string; pinned?: boolean; duration?: number;
  };
  const banner: InsertBanner = {
    id:        randomUUID(),
    type:      type      ?? "countdown",
    title:     title     ?? "",
    config:    config    ?? {},
    active:    !!active,
    order:     Number(order),
    slot:      slot      ?? "top",
    pinned:    !!pinned,
    duration:  Number(duration) || 10,
    createdAt: new Date().toISOString(),
  };
  await db.insert(smartBannersTable).values(banner);
  await logActivity({ action: "created", entityType: "smart_banner",
    title: `تم إضافة بانر ذكي: ${banner.title || banner.type}`, actor: actorFromReq(req) });
  res.status(201).json(banner);
});

router.patch("/smart-banners/reorder", requireStaff, async (req, res): Promise<void> => {
  const { ordered } = req.body as { ordered: { id: string; order: number }[] };
  if (!Array.isArray(ordered)) { res.status(400).json({ error: "ordered must be array" }); return; }
  await Promise.all(ordered.map(({ id, order }) =>
    db.update(smartBannersTable).set({ order }).where(eq(smartBannersTable.id, id))
  ));
  await logActivity({ action: "updated", entityType: "smart_banner",
    title: "تم إعادة ترتيب البانرات الذكية", actor: actorFromReq(req) });
  res.json({ ok: true });
});

router.get("/smart-banners/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [b] = await db.select().from(smartBannersTable).where(eq(smartBannersTable.id, id)).limit(1);
  if (!b) { res.status(404).json({ error: "not found" }); return; }
  res.json(b);
});

router.patch("/smart-banners/:id", requireStaff, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [b] = await db.select().from(smartBannersTable).where(eq(smartBannersTable.id, id)).limit(1);
  if (!b) { res.status(404).json({ error: "not found" }); return; }
  await db.update(smartBannersTable).set(req.body).where(eq(smartBannersTable.id, id));
  await logActivity({ action: "updated", entityType: "smart_banner",
    title: `تم تعديل بانر ذكي: ${b.title || b.type}`, actor: actorFromReq(req) });
  res.json({ ...b, ...req.body });
});

router.delete("/smart-banners/:id", requireStaff, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [b] = await db.select().from(smartBannersTable).where(eq(smartBannersTable.id, id)).limit(1);
  if (!b) { res.status(404).json({ error: "not found" }); return; }
  await db.delete(smartBannersTable).where(eq(smartBannersTable.id, id));
  await logActivity({ action: "deleted", entityType: "smart_banner",
    title: `تم حذف بانر ذكي: ${b.title || b.type}`, actor: actorFromReq(req) });
  res.json({ ok: true });
});

type InsertBanner = {
  id: string; type: string; title: string;
  config: Record<string, unknown>; active: boolean;
  order: number; slot: string; pinned: boolean;
  duration: number; createdAt: string;
};

export default router;
