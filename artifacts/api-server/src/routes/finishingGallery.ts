import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

export interface GalleryImage { id: string; url: string; title: string }
export interface GalleryVideo { id: string; url: string; title: string }
export interface GalleryConfig {
  interval: number;
  images: GalleryImage[];
  videos: GalleryVideo[];
}

const DEFAULT_CONFIG: GalleryConfig = { interval: 4, images: [], videos: [] };

export async function getGalleryConfig(): Promise<GalleryConfig> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, "main")).limit(1);
  const data = (row?.data ?? {}) as Record<string, unknown>;
  const cfg = data.finishingGallery as GalleryConfig | undefined;
  if (!cfg) return DEFAULT_CONFIG;
  return {
    interval: typeof cfg.interval === "number" ? cfg.interval : 4,
    images: Array.isArray(cfg.images) ? cfg.images : [],
    videos: Array.isArray(cfg.videos) ? cfg.videos : [],
  };
}

async function saveGalleryConfig(config: GalleryConfig): Promise<void> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, "main")).limit(1);
  const existing = (row?.data ?? {}) as Record<string, unknown>;
  const newData = { ...existing, finishingGallery: config };
  await db.insert(settingsTable).values({ id: "main", data: newData })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: newData } });
}

const router: IRouter = Router();

router.get("/finishing-gallery", async (_req, res): Promise<void> => {
  const config = await getGalleryConfig();
  res.json(config);
});

router.put("/finishing-gallery", requireStaff, async (req, res): Promise<void> => {
  const body = req.body as GalleryConfig;
  const config: GalleryConfig = {
    interval: Math.max(1, Math.min(60, Number(body.interval) || 4)),
    images: Array.isArray(body.images) ? body.images.map((img: GalleryImage) => ({
      id: String(img.id),
      url: String(img.url),
      title: String(img.title ?? ""),
    })) : [],
    videos: Array.isArray(body.videos) ? body.videos.map((vid: GalleryVideo) => ({
      id: String(vid.id),
      url: String(vid.url),
      title: String(vid.title ?? ""),
    })) : [],
  };
  await saveGalleryConfig(config);
  await logActivity({
    action: "updated",
    entityType: "finishing_gallery",
    title: `تم تحديث معرض التشطيبات — ${config.images.length} صورة، ${config.videos.length} فيديو`,
    actor: actorFromReq(req),
  });
  res.json(config);
});

export default router;
