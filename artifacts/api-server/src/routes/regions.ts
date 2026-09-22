import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, pool, regionsTable, insertRegionSchema } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

function isMissingColumnError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703"
  );
}

router.get("/regions", async (_req, res): Promise<void> => {
  try {
    let rows: Array<{ id: string; name: string; active: boolean; heroImage: string }>;
    try {
      const result = await pool.query(
        `SELECT id, name, active, hero_image AS "heroImage" FROM regions`,
      );
      rows = result.rows;
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;
      const result = await pool.query(
        `SELECT id, name, active, ''::text AS "heroImage" FROM regions`,
      );
      rows = result.rows;
    }
    res.json(rows.map((row) => ({
      ...row,
      heroImage: row.heroImage || "",
    })));
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "unknown")
      : "unknown";
    res.status(503).json({ error: "regions_read_failed", code });
  }
});

router.post("/regions", requireStaff, async (req, res): Promise<void> => {
  const parsed = insertRegionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { heroImage, ...legacyData } = parsed.data;
  let row;
  try {
    [row] = await db.insert(regionsTable).values(parsed.data).returning();
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    [row] = await db.insert(regionsTable).values(legacyData).returning();
    if (row) {
      row = { ...row, heroImage: heroImage ?? "" };
    }
  }
  await logActivity({
    action: "created",
    entityType: "region",
    title: `إضافة منطقة جديدة: ${row?.name ?? parsed.data.name}`,
    actor: actorFromReq(req),
  });
  res.status(201).json(row);
});

router.patch("/regions/:id", requireStaff, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const parsed = insertRegionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { heroImage, ...legacyPatch } = parsed.data;
  let row;
  try {
    [row] = await db
      .update(regionsTable)
      .set(parsed.data)
      .where(eq(regionsTable.id, id))
      .returning();
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    const updates: string[] = [];
    const values: unknown[] = [];
    if (legacyPatch.name !== undefined) {
      values.push(legacyPatch.name);
      updates.push(`name = $${values.length}`);
    }
    if (legacyPatch.active !== undefined) {
      values.push(legacyPatch.active);
      updates.push(`active = $${values.length}`);
    }
    if (updates.length > 0) {
      values.push(id);
      const result = await pool.query(
        `UPDATE regions
         SET ${updates.join(", ")}
         WHERE id = $${values.length}
         RETURNING id, name, active`,
        values,
      );
      row = result.rows[0];
    } else {
      const result = await pool.query(
        `SELECT id, name, active FROM regions WHERE id = $1 LIMIT 1`,
        [id],
      );
      row = result.rows[0];
    }
    if (row) {
      row = { ...row, heroImage: heroImage ?? "" };
    }
  }
  if (!row) {
    res.status(404).json({ error: "Region not found" });
    return;
  }
  await logActivity({
    action: "updated",
    entityType: "region",
    title: `تعديل المنطقة: ${row.name}`,
    actor: actorFromReq(req),
  });
  res.json(row);
});

router.delete("/regions/:id", requireStaff, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [row] = await db.delete(regionsTable).where(eq(regionsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Region not found" });
    return;
  }
  await logActivity({
    action: "deleted",
    entityType: "region",
    title: `حذف المنطقة: ${row.name}`,
    actor: actorFromReq(req),
  });
  res.json({ success: true, region: row });
});

router.post("/regions/:id/toggle", requireStaff, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [existing] = await db.select().from(regionsTable).where(eq(regionsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Region not found" });
    return;
  }
  const [updated] = await db
    .update(regionsTable)
    .set({ active: !existing.active })
    .where(eq(regionsTable.id, id))
    .returning();
  await logActivity({
    action: "status",
    entityType: "region",
    title: `${updated.active ? "تفعيل" : "تعطيل"} المنطقة: ${updated.name}`,
    actor: actorFromReq(req),
  });
  res.json(updated);
});

export default router;
