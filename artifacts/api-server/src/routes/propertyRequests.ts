import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, propertyRequestsTable, insertPropertyRequestSchema } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

const statusSchema = z.object({ status: z.string() });

router.get("/property-requests", requireStaff, async (_req, res): Promise<void> => {
  const rows = await db.select().from(propertyRequestsTable);
  res.json(rows);
});

router.post("/property-requests", async (req, res): Promise<void> => {
  const parsed = insertPropertyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(propertyRequestsTable).values(parsed.data).returning();
  await logActivity({
    action: "created",
    entityType: "property_request",
    title: `طلب إضافة عقار من ${row.ownerName || "زائر"}`,
    actor: "زائر",
  });
  res.status(201).json(row);
});

router.patch("/property-requests/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(propertyRequestsTable)
    .set({ status: parsed.data.status })
    .where(eq(propertyRequestsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await logActivity({
    action: "status",
    entityType: "property_request",
    title: `تم تحديث حالة طلب إضافة عقار من ${row.ownerName || "زائر"}`,
    actor: actorFromReq(req),
  });
  res.json(row);
});

router.delete("/property-requests/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [existing] = await db
    .select({ ownerName: propertyRequestsTable.ownerName })
    .from(propertyRequestsTable)
    .where(eq(propertyRequestsTable.id, id))
    .limit(1);
  await db.delete(propertyRequestsTable).where(eq(propertyRequestsTable.id, id));
  if (existing) {
    await logActivity({
      action: "deleted",
      entityType: "property_request",
      title: `تم حذف طلب إضافة عقار من ${existing.ownerName || "زائر"}`,
      actor: actorFromReq(req),
    });
  }
  res.sendStatus(204);
});

export default router;
