// ─── Ads Management Routes ────────────────────────────────────────────────────
// CRUD routes for ads stored inside the settings JSON.
// Each mutation is atomic (read → modify → write) and writes an activity log.
// These routes replace the generic PUT /settings for ad operations so we can
// produce specific, human-readable log entries per action.

import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db, settingsTable } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

type AdRecord = Record<string, unknown>;

async function readAds(): Promise<{ data: Record<string, unknown>; ads: AdRecord[] }> {
  const [row] = await db.select().from(settingsTable).limit(1);
  const data = (row?.data ?? {}) as Record<string, unknown>;
  const ads  = (data.ads ?? []) as AdRecord[];
  return { data, ads };
}

async function writeAds(data: Record<string, unknown>, ads: AdRecord[]): Promise<void> {
  const next = { ...data, ads };
  await db
    .insert(settingsTable)
    .values({ id: "main", data: next })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: next } });
}

// ─── POST /ads/manage — إضافة إعلان ─────────────────────────────────────────

router.post("/ads/manage", requireStaff, async (req, res): Promise<void> => {
  const body = req.body as AdRecord;
  const newAd: AdRecord = {
    ...body,
    id:     randomUUID(),
    views:  0,
    clicks: 0,
  };

  const { data, ads } = await readAds();
  await writeAds(data, [...ads, newAd]);

  await logActivity({
    action:     "created",
    entityType: "ad",
    title:      `تم إضافة إعلان جديد: ${(newAd.title as string) || (newAd.type as string) || "إعلان"}`,
    actor:      actorFromReq(req),
  });

  res.status(201).json(newAd);
});

// ─── PATCH /ads/manage/:id — تعديل إعلان ────────────────────────────────────

router.patch("/ads/manage/:id", requireStaff, async (req, res): Promise<void> => {
  const { id } = req.params;
  const patch   = req.body as Partial<AdRecord>;

  const { data, ads } = await readAds();
  const target = ads.find(a => a.id === id);
  if (!target) { res.status(404).json({ error: "ad not found" }); return; }

  const updated = ads.map(a => a.id === id ? { ...a, ...patch, id } : a);
  await writeAds(data, updated);

  await logActivity({
    action:     "updated",
    entityType: "ad",
    title:      `تم تعديل إعلان: ${(target.title as string) || (target.type as string) || id}`,
    actor:      actorFromReq(req),
  });

  res.json(updated.find(a => a.id === id));
});

// ─── DELETE /ads/manage/:id — حذف إعلان ─────────────────────────────────────

router.delete("/ads/manage/:id", requireStaff, async (req, res): Promise<void> => {
  const { id } = req.params;

  const { data, ads } = await readAds();
  const target = ads.find(a => a.id === id);
  if (!target) { res.status(404).json({ error: "ad not found" }); return; }

  await writeAds(data, ads.filter(a => a.id !== id));

  await logActivity({
    action:     "deleted",
    entityType: "ad",
    title:      `تم حذف إعلان: ${(target.title as string) || (target.type as string) || id}`,
    actor:      actorFromReq(req),
  });

  res.json({ ok: true });
});

// ─── PATCH /ads/manage/:id/toggle — تفعيل/تعطيل ────────────────────────────

router.patch("/ads/manage/:id/toggle", requireStaff, async (req, res): Promise<void> => {
  const { id } = req.params;

  const { data, ads } = await readAds();
  const target = ads.find(a => a.id === id);
  if (!target) { res.status(404).json({ error: "ad not found" }); return; }

  const newActive = !target.active;
  const updated   = ads.map(a => a.id === id ? { ...a, active: newActive } : a);
  await writeAds(data, updated);

  await logActivity({
    action:     "updated",
    entityType: "ad",
    title:      `${newActive ? "تم تفعيل" : "تم تعطيل"} إعلان: ${(target.title as string) || (target.type as string) || id}`,
    actor:      actorFromReq(req),
  });

  res.json({ ok: true, active: newActive });
});

// ─── PATCH /ads/manage/reorder — إعادة ترتيب ─────────────────────────────────

router.patch("/ads/manage/reorder", requireStaff, async (req, res): Promise<void> => {
  const { ordered } = req.body as { ordered: AdRecord[] };
  if (!Array.isArray(ordered)) {
    res.status(400).json({ error: "ordered must be an array" });
    return;
  }

  const { data, ads } = await readAds();
  const orderedIds = new Set(ordered.map(a => a.id as string));
  const unchanged  = ads.filter(a => !orderedIds.has(a.id as string));
  const reordered  = ordered.map((a, i) => ({ ...a, order: i + 1 }));

  await writeAds(data, [...reordered, ...unchanged]);

  await logActivity({
    action:     "updated",
    entityType: "ad",
    title:      "تم إعادة ترتيب الإعلانات",
    actor:      actorFromReq(req),
  });

  res.json({ ok: true });
});

export default router;
