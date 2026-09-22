import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { requireActivityLogClear, requireStaff } from "../lib/auth";

const router: IRouter = Router();

router.get("/activity-logs", requireStaff, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(activityLogsTable)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(500);
  res.json(rows);
});

router.post("/activity-logs", async (req, res): Promise<void> => {
  try {
    const { action, entityType, title, actor, createdAt, id } = req.body;
    const logId = id || crypto.randomUUID();
    const nowIso = createdAt || new Date().toISOString();
    await db.insert(activityLogsTable).values({
      id: logId,
      action: action || "updated",
      entityType: entityType || "system",
      title: title || "نشاط في النظام",
      actor: actor || "الإدارة",
      createdAt: nowIso,
    });
    res.json({ ok: true, id: logId });
  } catch (e) {
    res.json({ ok: true });
  }
});

router.delete("/activity-logs", requireActivityLogClear, async (_req, res): Promise<void> => {
  const result = await db.delete(activityLogsTable);
  res.json({ ok: true, deletedCount: result.rowCount ?? 0 });
});

export default router;
