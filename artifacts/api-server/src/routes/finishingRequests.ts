import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, finishingRequestsTable, insertFinishingRequestSchema } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

const statusSchema = z.object({ status: z.string() });

router.get("/finishing-requests", requireStaff, async (_req, res): Promise<void> => {
  const rows = await db.select().from(finishingRequestsTable);
  res.json(rows);
});

router.post("/finishing-requests", async (req, res): Promise<void> => {
  const parsed = insertFinishingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(finishingRequestsTable).values(parsed.data).returning();
  await logActivity({
    action: "created",
    entityType: "finishing_request",
    title: `طلب تشطيب جديد من ${row.name || "زائر"}`,
    actor: "زائر",
  });
  res.status(201).json(row);
});

router.patch("/finishing-requests/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(finishingRequestsTable)
    .set({ status: parsed.data.status })
    .where(eq(finishingRequestsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await logActivity({
    action: "status",
    entityType: "finishing_request",
    title: `تم تحديث حالة طلب تشطيب من ${row.name || "زائر"}`,
    actor: actorFromReq(req),
  });
  res.json(row);
});

router.delete("/finishing-requests/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [existing] = await db
    .select({ name: finishingRequestsTable.name })
    .from(finishingRequestsTable)
    .where(eq(finishingRequestsTable.id, id))
    .limit(1);
  await db.delete(finishingRequestsTable).where(eq(finishingRequestsTable.id, id));
  if (existing) {
    await logActivity({
      action: "deleted",
      entityType: "finishing_request",
      title: `تم حذف طلب تشطيب من ${existing.name || "زائر"}`,
      actor: actorFromReq(req),
    });
  }
  res.sendStatus(204);
});

export default router;
