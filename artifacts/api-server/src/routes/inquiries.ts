import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, inquiriesTable, insertInquirySchema } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

const statusSchema = z.object({ status: z.string() });

router.get("/inquiries", requireStaff, async (_req, res): Promise<void> => {
  const rows = await db.select().from(inquiriesTable);
  res.json(rows);
});

router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = insertInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(inquiriesTable).values(parsed.data).returning();
  await logActivity({
    action: "created",
    entityType: "inquiry",
    title: `استفسار جديد من ${row.name || "زائر"}`,
    actor: "زائر",
  });
  res.status(201).json(row);
});

router.patch("/inquiries/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(inquiriesTable)
    .set({ status: parsed.data.status })
    .where(eq(inquiriesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await logActivity({
    action: "status",
    entityType: "inquiry",
    title: `تم تحديث حالة استفسار من ${row.name || "زائر"}`,
    actor: actorFromReq(req),
  });
  res.json(row);
});

router.delete("/inquiries/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [existing] = await db
    .select({ name: inquiriesTable.name })
    .from(inquiriesTable)
    .where(eq(inquiriesTable.id, id))
    .limit(1);
  await db.delete(inquiriesTable).where(eq(inquiriesTable.id, id));
  if (existing) {
    await logActivity({
      action: "deleted",
      entityType: "inquiry",
      title: `تم حذف استفسار من ${existing.name || "زائر"}`,
      actor: actorFromReq(req),
    });
  }
  res.sendStatus(204);
});

export default router;
