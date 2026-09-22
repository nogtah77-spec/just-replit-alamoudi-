import { Router, type IRouter, type Request } from "express";
import { eq, sql, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { db, pool, propertiesTable, insertPropertySchema } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

const router: IRouter = Router();

type PropertyWriteRow = {
  id: string;
  title: string;
  code: string;
  assignedStaffId?: string;
};

const PROPERTY_COLUMN_MAP: Record<string, string> = {
  id: "id",
  code: "code",
  title: "title",
  description: "description",
  price: "price",
  area: "area",
  beds: "beds",
  baths: "baths",
  floors: "floors",
  floor: "floor",
  finishing: "finishing",
  view: "view",
  typeId: "type_id",
  regionId: "region_id",
  category: "category",
  status: "status",
  featured: "featured",
  agentType: "agent_type",
  images: "images",
  videoUrl: "video_url",
  externalUrl: "external_url",
  mapsUrl: "maps_url",
  createdAt: "created_at",
  unitType: "unit_type",
  subArea: "sub_area",
  layout: "layout",
  master: "master",
  elevator: "elevator",
  parking: "parking",
  additionalFeatures: "additional_features",
  floorText: "floor_text",
  location: "location",
  source: "source",
  sourcePhones: "source_phones",
  sourceEmail: "source_email",
  sourceLocation: "source_location",
  sourceNotes: "source_notes",
  assignedStaffId: "assigned_staff_id",
  views: "views",
  coverPriority: "cover_priority",
};

const PROPERTY_RETURNING = "id, title, code";

async function getPropertyColumns(): Promise<Set<string>> {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'properties'`,
  );
  return new Set(result.rows.map((row) => row.column_name));
}

function isMissingColumnError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703"
  );
}

const PROPERTY_DEFAULTS: Record<string, unknown> = {
  title: "",
  description: "",
  price: 0,
  area: 0,
  beds: 0,
  baths: 0,
  floors: 0,
  floor: 0,
  finishing: "",
  view: "",
  typeId: "",
  regionId: "",
  category: "sale",
  status: "active",
  featured: false,
  agentType: "direct",
  images: [],
  videoUrl: "",
  externalUrl: "",
  mapsUrl: "",
  createdAt: "",
  unitType: "",
  subArea: "",
  layout: "",
  master: "",
  elevator: "",
  parking: "",
  additionalFeatures: "",
  floorText: "",
  location: "",
  source: "",
  sourcePhones: [],
  sourceEmail: "",
  sourceLocation: "",
  sourceNotes: "",
  assignedStaffId: "",
  views: 0,
  coverPriority: "image",
};

function quoteIdentifier(identifier: string): string {
  // All callers pass names from PROPERTY_COLUMN_MAP, never request input.
  return `"${identifier.replaceAll('"', '""')}"`;
}

function buildPropertySelect(columns: Set<string>): string {
  const fields = Object.entries(PROPERTY_COLUMN_MAP)
    .filter(([, columnName]) => columns.has(columnName))
    .map(
      ([propertyKey, columnName]) =>
        `${quoteIdentifier(columnName)} AS ${quoteIdentifier(propertyKey)}`,
    );
  if (!fields.includes(`"id" AS "id"`)) {
    throw new Error("properties table is missing its required id column");
  }
  return fields.join(",\n  ");
}

const ASSIGNED_STAFF_MARKER = /\s*\[assigned_staff_id:([^\]\r\n]+)\]\s*$/;

function extractAssignedStaffId(notes: unknown): {
  notes: string;
  assignedStaffId: string;
} {
  const value = typeof notes === "string" ? notes : "";
  const match = value.match(ASSIGNED_STAFF_MARKER);
  return {
    notes: match ? value.slice(0, match.index).trimEnd() : value,
    assignedStaffId: match?.[1]?.trim() ?? "",
  };
}

function addAssignedStaffMarker(
  notes: unknown,
  assignedStaffId: unknown,
): string {
  const cleaned = extractAssignedStaffId(notes).notes;
  const staffId =
    typeof assignedStaffId === "string" ? assignedStaffId.trim() : "";
  return staffId
    ? `${cleaned}${cleaned ? "\n\n" : ""}[assigned_staff_id:${staffId}]`
    : cleaned;
}

function hasOwn(data: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function serializePropertyJsonValue(
  columnName: string,
  value: unknown,
): unknown {
  if (columnName !== "images" && columnName !== "source_phones") return value;
  if (value === null || typeof value === "string") return value;
  return JSON.stringify(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return normalizeStringArray(parsed);
  } catch {
    // Legacy text columns may contain a plain separator-delimited value.
  }

  return value
    .split(/\s*(?:\/|,|،|\r?\n)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPropertyWriteData(
  data: Record<string, unknown>,
  columns: Set<string>,
  existingNotes?: unknown,
): Record<string, unknown> {
  const writeData: Record<string, unknown> = {};
  for (const [propertyKey, columnName] of Object.entries(PROPERTY_COLUMN_MAP)) {
    if (hasOwn(data, propertyKey) && columns.has(columnName)) {
      writeData[columnName] = serializePropertyJsonValue(
        columnName,
        data[propertyKey],
      );
    }
  }

  // Keep the responsible staff assignment working on databases that have not
  // received assigned_staff_id yet. The migration later moves this marker into
  // the real column and removes it from source_notes.
  if (!columns.has("assigned_staff_id") && columns.has("source_notes")) {
    const existing = extractAssignedStaffId(existingNotes);
    const assignedStaffId = hasOwn(data, "assignedStaffId")
      ? data.assignedStaffId
      : existing.assignedStaffId;
    const sourceNotes = hasOwn(data, "sourceNotes")
      ? data.sourceNotes
      : existing.notes;
    writeData.source_notes = addAssignedStaffMarker(
      sourceNotes,
      assignedStaffId,
    );
  }

  return writeData;
}

async function getExistingSourceNotes(
  id: string,
  columns: Set<string>,
): Promise<string> {
  if (!columns.has("source_notes")) return "";
  const result = await pool.query<{ sourceNotes: string | null }>(
    `SELECT source_notes AS "sourceNotes" FROM properties WHERE id = $1`,
    [id],
  );
  return result.rows[0]?.sourceNotes ?? "";
}

async function insertPropertyCompat(
  data: Record<string, unknown>,
): Promise<PropertyWriteRow> {
  const columns = await getPropertyColumns();
  const writeData = buildPropertyWriteData(data, columns);
  const entries = Object.entries(writeData);
  if (entries.length === 0)
    throw new Error("No supported property fields to insert");

  const columnNames = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const result = await pool.query<PropertyWriteRow>(
    `INSERT INTO properties (${columnNames.join(", ")})
     VALUES (${placeholders})
     RETURNING ${PROPERTY_RETURNING}`,
    values,
  );
  if (!result.rows[0]) throw new Error("Property insert returned no row");
  return {
    ...result.rows[0],
    assignedStaffId: data.assignedStaffId as string | undefined,
  };
}

async function updatePropertyCompat(
  id: string,
  data: Record<string, unknown>,
): Promise<PropertyWriteRow | undefined> {
  const columns = await getPropertyColumns();
  const existingNotes = !columns.has("assigned_staff_id")
    ? await getExistingSourceNotes(id, columns)
    : undefined;
  const writeData = buildPropertyWriteData(data, columns, existingNotes);
  const entries = Object.entries(writeData);
  if (entries.length === 0)
    throw new Error("No supported property fields to update");

  const values = entries.map(([, value]) => value);
  const assignments = entries
    .map(([column], index) => `${column} = $${index + 1}`)
    .join(", ");
  const result = await pool.query<PropertyWriteRow>(
    `UPDATE properties
     SET ${assignments}
     WHERE id = $${values.length + 1}
     RETURNING ${PROPERTY_RETURNING}`,
    [...values, id],
  );
  const row = result.rows[0];
  return row
    ? { ...row, assignedStaffId: data.assignedStaffId as string | undefined }
    : undefined;
}

async function selectLegacyProperties(
  activeOnly: boolean,
): Promise<Array<Record<string, unknown>>> {
  const columns = await getPropertyColumns();
  const select = buildPropertySelect(columns);
  const where =
    activeOnly && columns.has("status") ? ` WHERE "status" = 'active'` : "";
  const result = await pool.query(`SELECT ${select} FROM "properties"${where}`);

  return result.rows.map((row) => {
    const normalized: Record<string, unknown> = { ...PROPERTY_DEFAULTS };
    for (const propertyKey of Object.keys(PROPERTY_COLUMN_MAP)) {
      if (row[propertyKey] !== undefined)
        normalized[propertyKey] = row[propertyKey];
    }
    normalized.images = normalizeStringArray(normalized.images);
    normalized.sourcePhones = normalizeStringArray(normalized.sourcePhones);
    const extracted = extractAssignedStaffId(normalized.sourceNotes);
    normalized.sourceNotes = extracted.notes;
    normalized.assignedStaffId =
      normalized.assignedStaffId || extracted.assignedStaffId;
    return normalized;
  });
}

function propertyLabel(p: {
  title?: string | null;
  code?: string | null;
}): string {
  return p.title?.trim() || p.code || "عقار";
}

function isStaffReq(req: Request): boolean {
  return !!(
    req.session?.userId &&
    (req.session.role === "admin" || req.session.role === "agent")
  );
}

router.get("/properties", async (req, res): Promise<void> => {
  try {
    // Read through the legacy-compatible projection. Production may still
    // have an older properties schema until its next schema migration.
    const rows = await selectLegacyProperties(!isStaffReq(req));
    if (isStaffReq(req)) {
      res.json(rows);
      return;
    }
    res.json(
      rows.map(
        ({
          source: _s,
          agentType: _a,
          sourcePhones: _sp,
          sourceEmail: _se,
          sourceLocation: _sl,
          sourceNotes: _sn,
          assignedStaffId: _as,
          ...rest
        }) => rest,
      ),
    );
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "unknown")
        : "unknown";
    res.status(503).json({ error: "properties_read_failed", code });
  }
});

router.post("/properties/:id/view", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db
    .update(propertiesTable)
    .set({ views: sql`${propertiesTable.views} + 1` })
    .where(eq(propertiesTable.id, id));
  res.sendStatus(204);
});

router.post("/properties", requireStaff, async (req, res): Promise<void> => {
  const parsed = insertPropertySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const row = await insertPropertyCompat(parsed.data);
  await logActivity({
    action: "created",
    entityType: "property",
    title: `تمت إضافة عقار: ${propertyLabel(row)}`,
    actor: actorFromReq(req),
  });
  res.status(201).json(row);
});

router.post(
  "/properties/import",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = z.array(insertPropertySchema).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    let added = 0;
    let updated = 0;
    for (const item of parsed.data) {
      const existing = await db
        .select({ id: propertiesTable.id })
        .from(propertiesTable)
        .where(eq(propertiesTable.code, item.code))
        .limit(1);
      if (existing.length > 0) {
        const { id: _ignore, ...rest } = item;
        await updatePropertyCompat(existing[0].id, rest);
        updated++;
      } else {
        await insertPropertyCompat(item);
        added++;
      }
    }
    await logActivity({
      action: "imported",
      entityType: "property",
      title: `تم استيراد العقارات (${added} جديد، ${updated} تحديث)`,
      actor: actorFromReq(req),
    });
    res.json({ added, updated });
  },
);

router.patch(
  "/properties/:id",
  requireStaff,
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = insertPropertySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const row = await updatePropertyCompat(id, parsed.data);
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    await logActivity({
      action: "updated",
      entityType: "property",
      title: `تم تعديل عقار: ${propertyLabel(row)}`,
      actor: actorFromReq(req),
    });
    res.json(row);
  },
);

router.delete(
  "/properties/bulk",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = z
      .object({ ids: z.array(z.string()).min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { ids } = parsed.data;
    await db.delete(propertiesTable).where(inArray(propertiesTable.id, ids));
    await logActivity({
      action: "deleted",
      entityType: "property",
      title: `تم حذف ${ids.length} عقار دفعة واحدة`,
      actor: actorFromReq(req),
    });
    res.json({ deleted: ids.length });
  },
);

router.patch(
  "/properties/bulk",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = z
      .object({
        ids: z.array(z.string()).min(1),
        updates: insertPropertySchema.partial(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { ids, updates } = parsed.data;
    // Do not use Drizzle's full schema here: production may still be missing
    // newer property columns. Each update uses the same column-aware writer as
    // the single-property edit and source-management screens.
    for (const id of ids) {
      await updatePropertyCompat(id, updates);
    }
    await logActivity({
      action: "updated",
      entityType: "property",
      title: `تم تحديث ${ids.length} عقار دفعة واحدة`,
      actor: actorFromReq(req),
    });
    res.json({ updated: ids.length });
  },
);

router.delete(
  "/properties/:id",
  requireStaff,
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const [existing] = await db
      .select({ title: propertiesTable.title, code: propertiesTable.code })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, id))
      .limit(1);
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    if (existing) {
      await logActivity({
        action: "deleted",
        entityType: "property",
        title: `تم حذف عقار: ${propertyLabel(existing)}`,
        actor: actorFromReq(req),
      });
    }
    res.sendStatus(204);
  },
);

export default router;
