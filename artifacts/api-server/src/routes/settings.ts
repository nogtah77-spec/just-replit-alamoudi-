import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  try {
    const [row] = await db.select().from(settingsTable).limit(1);
    const data = {
      ...(row?.data ?? {}),
      allowCustomerImageDownloads: (row?.data as Record<string, unknown> | undefined)?.allowCustomerImageDownloads ?? true,
      allowStaffImageDownloads: (row?.data as Record<string, unknown> | undefined)?.allowStaffImageDownloads ?? true,
    } as Record<string, unknown>;
    delete data.finishingGallery;
    delete data.regionHeroImages;
    delete data.bannerServices;
    res.json(data);
  } catch (err: any) {
    res.json({});
  }
});

router.put("/settings", async (req, res): Promise<void> => {
  const body = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ error: "settings must be an object" });
    return;
  }
  try {
    const [row] = await db.select().from(settingsTable).limit(1);
    const existing = (row?.data ?? {}) as Record<string, unknown>;
    const merged = {
      ...existing,
      ...body,
      allowCustomerImageDownloads: body.allowCustomerImageDownloads ?? true,
      allowStaffImageDownloads: body.allowStaffImageDownloads ?? true,
      finishingGallery: existing.finishingGallery,
      regionHeroImages: existing.regionHeroImages,
      bannerServices: existing.bannerServices,
    };
    await db
      .insert(settingsTable)
      .values({ id: "main", data: merged })
      .onConflictDoUpdate({ target: settingsTable.id, set: { data: merged } });
    try {
      await logActivity({
        action: "updated",
        entityType: "settings",
        title: "تم تعديل إعدادات المنصة",
        actor: actorFromReq(req),
      });
    } catch {}
    res.json(merged);
  } catch (err: any) {
    console.error("Error saving settings to db:", err);
    res.status(500).json({ error: err.message || "Failed to save settings" });
  }
});

export default router;
