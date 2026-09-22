import { Router, type IRouter } from "express";
import { db, settingsTable, adEventsTable } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { requireStaff } from "../lib/auth";

const router: IRouter = Router();

// ─── helper: هل الطلب من موظف/أدمن؟ ────────────────────────────────────────

function isStaffReq(req: import("express").Request): boolean {
  const sess = req.session as { userId?: string; role?: string };
  return !!sess?.userId && (sess.role === "admin" || sess.role === "agent");
}

// ─── helper: استخراج IP الزائر الحقيقي ──────────────────────────────────────

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (typeof forwarded === "string" ? forwarded : forwarded[0])
      .split(",")[0]
      .trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? "";
}

// ─── helper: بحث جيولوكيشن من IP ────────────────────────────────────────────

interface GeoData {
  country: string;
  countryCode: string;
  city: string;
  region: string;
}

async function getGeoData(ip: string): Promise<GeoData | null> {
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("::ffff:127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.")
  ) {
    return null; // لا يمكن تحديد موقع الـ IPs المحلية
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city&lang=ar`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = (await res.json()) as {
      status: string;
      country?: string;
      countryCode?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status === "success") {
      return {
        country:     data.country     ?? "",
        countryCode: data.countryCode ?? "",
        city:        data.city        ?? "",
        region:      data.regionName  ?? "",
      };
    }
  } catch {
    /* best-effort — لا نوقف التتبع بسبب فشل الجيولوكيشن */
  }
  return null;
}

// ─── تتبّع مشاهدة إعلان ─────────────────────────────────────────────────────

router.post("/ads/:id/view", async (req, res): Promise<void> => {
  if (isStaffReq(req)) { res.json({ ok: true, skipped: "staff" }); return; }
  const { id } = req.params;
  const {
    sessionId, deviceType, browser, os,
    screenWidth, screenHeight, language,
    referrer, referrerType, referrerPage,
    viewDuration,
  } = req.body ?? {};

  try {
    // جلب الجيولوكيشن بالتوازي مع استعداد الـ DB
    const [geoData] = await Promise.all([
      getGeoData(getClientIp(req)),
    ]);

    // ١ — تخزين الحدث التفصيلي مع بيانات الجيولوكيشن
    await db.insert(adEventsTable).values({
      adId:         id,
      eventType:    "view",
      sessionId:    sessionId    ?? null,
      deviceType:   deviceType   ?? null,
      browser:      browser      ?? null,
      os:           os           ?? null,
      screenWidth:  screenWidth  ?? null,
      screenHeight: screenHeight ?? null,
      language:     language     ?? null,
      referrer:     referrer     ?? null,
      referrerType: referrerType ?? null,
      referrerPage: referrerPage ?? null,
      viewDuration: viewDuration ?? null,
      country:      geoData?.country     ?? null,
      countryCode:  geoData?.countryCode ?? null,
      city:         geoData?.city        ?? null,
      region:       geoData?.region      ?? null,
    });

    // ٢ — تحديث العداد السريع في settings
    const [row] = await db.select().from(settingsTable).limit(1);
    const data  = (row?.data ?? {}) as Record<string, unknown>;
    const ads   = (data.ads ?? []) as Array<Record<string, unknown>>;
    const newAds = ads.map(a =>
      a.id === id ? { ...a, views: ((a.views as number) ?? 0) + 1 } : a
    );
    const newData = { ...data, ads: newAds };
    await db.insert(settingsTable).values({ id: "main", data: newData })
      .onConflictDoUpdate({ target: settingsTable.id, set: { data: newData } });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "tracking failed" });
  }
});

// ─── تتبّع نقرة إعلان ───────────────────────────────────────────────────────

router.post("/ads/:id/click", async (req, res): Promise<void> => {
  if (isStaffReq(req)) { res.json({ ok: true, skipped: "staff" }); return; }
  const { id } = req.params;
  const {
    sessionId, deviceType, browser, os,
    screenWidth, screenHeight, language,
    referrer, referrerType, referrerPage,
    clickX, clickY,
    actionType, // 'url' | 'whatsapp' | 'phone' | undefined — موجود فقط لنقرات اللينك
  } = req.body ?? {};

  // نوع الحدث: link_click عند فتح رابط/واتساب/اتصال، click لأي نقرة عادية
  const eventType = actionType ? "link_click" : "click";

  try {
    const [geoData] = await Promise.all([
      getGeoData(getClientIp(req)),
    ]);

    await db.insert(adEventsTable).values({
      adId:         id,
      eventType,
      sessionId:    sessionId    ?? null,
      deviceType:   deviceType   ?? null,
      browser:      browser      ?? null,
      os:           os           ?? null,
      screenWidth:  screenWidth  ?? null,
      screenHeight: screenHeight ?? null,
      language:     language     ?? null,
      referrer:     referrer     ?? null,
      referrerType: referrerType ?? null,
      referrerPage: referrerPage ?? null,
      clickX:       clickX       ?? null,
      clickY:       clickY       ?? null,
      actionType:   actionType   ?? null,
      country:      geoData?.country     ?? null,
      countryCode:  geoData?.countryCode ?? null,
      city:         geoData?.city        ?? null,
      region:       geoData?.region      ?? null,
    });

    const [row] = await db.select().from(settingsTable).limit(1);
    const data  = (row?.data ?? {}) as Record<string, unknown>;
    const ads   = (data.ads ?? []) as Array<Record<string, unknown>>;
    const newAds = ads.map(a => {
      if (a.id !== id) return a;
      return {
        ...a,
        clicks: ((a.clicks as number) ?? 0) + 1,
        ...(actionType ? { linkClicks: ((a.linkClicks as number) ?? 0) + 1 } : {}),
      };
    });
    const newData = { ...data, ads: newAds };
    await db.insert(settingsTable).values({ id: "main", data: newData })
      .onConflictDoUpdate({ target: settingsTable.id, set: { data: newData } });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "tracking failed" });
  }
});

// ─── إحصائيات إعلان (للأدمن فقط) ───────────────────────────────────────────

router.get("/ads/:id/analytics", requireStaff, async (req, res): Promise<void> => {
  const id  = String(req.params.id);
  const { from, to } = req.query as { from?: string; to?: string };

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate   = to   ? new Date(to)   : new Date();

  const conditions = [
    eq(adEventsTable.adId, id),
    gte(adEventsTable.createdAt, fromDate),
  ];

  const allEvents = await db
    .select()
    .from(adEventsTable)
    .where(and(...conditions));

  const views      = allEvents.filter(e => e.eventType === "view");
  const clicks     = allEvents.filter(e => e.eventType === "click" || e.eventType === "link_click");
  const linkClicks = allEvents.filter(e => e.eventType === "link_click");

  // الزوار الفريدون
  const uniqueSessions = new Set(views.map(e => e.sessionId).filter(Boolean));
  const uniqueClickers = new Set(clicks.map(e => e.sessionId).filter(Boolean));

  // متوسط مدة المشاهدة
  const durationsMs = views.map(e => e.viewDuration).filter((d): d is number => d != null && d > 0);
  const avgDuration = durationsMs.length > 0
    ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length)
    : 0;

  // إجمالي منذ الإنشاء
  const [totalRow] = await db
    .select({ total: count() })
    .from(adEventsTable)
    .where(and(eq(adEventsTable.adId, id), eq(adEventsTable.eventType, "view")));
  // إجمالي النقرات = click + link_click
  const allClicksEver = await db
    .select({ eventType: adEventsTable.eventType })
    .from(adEventsTable)
    .where(and(eq(adEventsTable.adId, id)));
  const totalClicksAll  = allClicksEver.filter(e => e.eventType === "click" || e.eventType === "link_click").length;
  const totalLinkClicks = allClicksEver.filter(e => e.eventType === "link_click").length;

  // ─── تجميع حسب فئات ────────────────────────────────────────────────────

  function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of arr) {
      const k = String(item[key] ?? "Unknown");
      result[k] = (result[k] ?? 0) + 1;
    }
    return result;
  }

  const deviceBreakdown       = groupBy(views, "deviceType");
  const browserBreakdown      = groupBy(views, "browser");
  const osBreakdown           = groupBy(views, "os");
  const languageBreakdown     = groupBy(views, "language");
  const referrerTypeBreakdown = groupBy(views, "referrerType");
  const referrerPageBreakdown = groupBy(views, "referrerPage");
  // تجميع الدول مع كود الدولة لعرض العلم
  const countryMap: Record<string, { count: number; code: string }> = {};
  for (const e of views) {
    const name = e.country ?? "";
    const code = e.countryCode ?? "";
    if (!name) continue;
    if (!countryMap[name]) countryMap[name] = { count: 0, code };
    countryMap[name].count++;
  }
  const countryBreakdown = Object.entries(countryMap)
    .map(([name, { count, code }]) => ({ name, code, count }))
    .sort((a, b) => b.count - a.count);

  // تجميع المدن مع بلدها
  const cityMapRaw: Record<string, { count: number; country: string; countryCode: string }> = {};
  for (const e of views) {
    const city = e.city ?? "";
    if (!city) continue;
    if (!cityMapRaw[city]) cityMapRaw[city] = { count: 0, country: e.country ?? "", countryCode: e.countryCode ?? "" };
    cityMapRaw[city].count++;
  }
  const cityBreakdown = Object.entries(cityMapRaw)
    .map(([city, { count, country, countryCode }]) => ({ city, country, countryCode, count }))
    .sort((a, b) => b.count - a.count);

  // تجميع المناطق مع بلدها
  const regionMapRaw: Record<string, { count: number; country: string; countryCode: string }> = {};
  for (const e of views) {
    const region = e.region ?? "";
    if (!region) continue;
    if (!regionMapRaw[region]) regionMapRaw[region] = { count: 0, country: e.country ?? "", countryCode: e.countryCode ?? "" };
    regionMapRaw[region].count++;
  }
  const regionBreakdown = Object.entries(regionMapRaw)
    .map(([region, { count, country, countryCode }]) => ({ region, country, countryCode, count }))
    .sort((a, b) => b.count - a.count);

  // أحجام الشاشات
  const screenSizeMap: Record<string, number> = {};
  for (const e of views) {
    if (e.screenWidth && e.screenHeight) {
      const key = `${e.screenWidth}×${e.screenHeight}`;
      screenSizeMap[key] = (screenSizeMap[key] ?? 0) + 1;
    }
  }

  // ─── المخطط الزمني ───────────────────────────────────────────────────────

  const timelineMap: Record<string, { views: number; clicks: number }> = {};
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  for (const e of allEvents) {
    const day = toISO(e.createdAt);
    if (!timelineMap[day]) timelineMap[day] = { views: 0, clicks: 0 };
    if (e.eventType === "view")  timelineMap[day].views++;
    if (e.eventType === "click") timelineMap[day].clicks++;
  }

  const timeline: Array<{ date: string; views: number; clicks: number; ctr: number }> = [];
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= toDate) {
    const day = toISO(cursor);
    const v   = timelineMap[day]?.views  ?? 0;
    const c   = timelineMap[day]?.clicks ?? 0;
    timeline.push({ date: day, views: v, clicks: c, ctr: v > 0 ? +(c / v * 100).toFixed(1) : 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ─── ساعات الذروة وأيام الأسبوع ──────────────────────────────────────────

  const hourlyMap: number[] = Array(24).fill(0);
  const weekdayMap: number[] = Array(7).fill(0);
  for (const e of views) {
    hourlyMap[e.createdAt.getHours()]++;
    weekdayMap[e.createdAt.getDay()]++;
  }

  // ─── Heatmap النقرات ─────────────────────────────────────────────────────

  const clickHeatmap = clicks
    .filter(e => e.clickX != null && e.clickY != null)
    .map(e => ({ x: e.clickX!, y: e.clickY! }));

  // ─── الزوار حسب الفترة ───────────────────────────────────────────────────

  const now   = new Date();
  const day1  = new Date(now); day1.setHours(0, 0, 0, 0);
  const day7  = new Date(now); day7.setDate(now.getDate() - 7);
  const day30 = new Date(now); day30.setDate(now.getDate() - 30);

  const allViewsEver = await db
    .select()
    .from(adEventsTable)
    .where(and(eq(adEventsTable.adId, id), eq(adEventsTable.eventType, "view")));

  const visitorsToday = new Set(allViewsEver.filter(e => e.createdAt >= day1).map(e => e.sessionId)).size;
  const visitors7d    = new Set(allViewsEver.filter(e => e.createdAt >= day7).map(e => e.sessionId)).size;
  const visitors30d   = new Set(allViewsEver.filter(e => e.createdAt >= day30).map(e => e.sessionId)).size;
  const visitorsAll   = new Set(allViewsEver.map(e => e.sessionId)).size;

  // ─── الرد ────────────────────────────────────────────────────────────────

  const totalViews = totalRow?.total ?? 0;

  // تجميع أنواع اللينك (واتساب / رابط / اتصال)
  const actionTypeBreakdown: Record<string, number> = {};
  for (const e of linkClicks) {
    const k = e.actionType ?? "unknown";
    actionTypeBreakdown[k] = (actionTypeBreakdown[k] ?? 0) + 1;
  }

  res.json({
    overview: {
      totalViews:      Number(totalViews),
      totalClicks:     totalClicksAll,
      totalLinkClicks: totalLinkClicks,
      ctr:             Number(totalViews) > 0 ? +(totalClicksAll / Number(totalViews) * 100).toFixed(2) : 0,
      uniqueVisitors:  uniqueSessions.size,
      uniqueClickers:  uniqueClickers.size,
      avgViewDuration: avgDuration,
      periodViews:     views.length,
      periodClicks:    clicks.length,
      periodLinkClicks: linkClicks.length,
    },
    visitors: { today: visitorsToday, last7d: visitors7d, last30d: visitors30d, all: visitorsAll },
    devices:       deviceBreakdown,
    browsers:      browserBreakdown,
    os:            osBreakdown,
    languages:     languageBreakdown,
    referrerTypes: referrerTypeBreakdown,
    referrerPages: referrerPageBreakdown,
    countries:  countryBreakdown,
    cities:     cityBreakdown,
    regions:    regionBreakdown,
    screenSizes:   screenSizeMap,
    actionTypes:   actionTypeBreakdown,
    timeline,
    peakHours:     hourlyMap,
    weekdays:      weekdayMap,
    clickHeatmap,
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
  });
});

export default router;
