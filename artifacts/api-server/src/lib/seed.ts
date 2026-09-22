import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  pool,
  regionsTable,
  propertyTypesTable,
  propertiesTable,
  usersTable,
  settingsTable,
} from "@workspace/db";
import { SEED_PROPERTIES } from "../data/seedProperties";
import { hashPassword } from "./auth";
import { logger } from "./logger";

const DEFAULT_REGIONS = [
  { id: "badr", name: "مدينة بدر", active: true },
  { id: "shorouk", name: "مدينة الشروق", active: true, heroImage: "/city-heroes/shorouk.jpg" },
  { id: "madinaty", name: "مدينتي", active: true },
  { id: "wasal", name: "كمبوند وصال", active: true },
  { id: "tagamoa", name: "التجمع", active: true },
  { id: "beit_elwatan", name: "بيت الوطن", active: true },
  { id: "nasr_city", name: "مدينة نصر", active: true },
  { id: "new_heliopolis", name: "هليوبوليس الجديدة", active: true },
];

const DEFAULT_PROPERTY_TYPES = [
  { id: "apartment", name: "شقة", active: true },
  { id: "duplex", name: "دوبلكس", active: true },
  { id: "villa", name: "فيلا", active: true },
  { id: "townhouse", name: "تاون هاوس", active: true },
  { id: "twinhouse", name: "توين هاوس", active: true },
  { id: "penthouse", name: "بنتهاوس", active: true },
  { id: "shop", name: "محل", active: true },
  { id: "clinic", name: "عيادة", active: true },
  { id: "office", name: "مكتب", active: true },
  { id: "building", name: "عمارة", active: true },
  { id: "entire_building", name: "مبنى", active: true },
];

const DEFAULT_SETTINGS = {
  companyName: "العمودي للتسويق العقاري",
  companyDescription:
    "شريكك الموثوق في عالم العقارات الفاخرة. نقدم لك أفضل الفرص الاستثمارية في مصر.",
  phone1: "+20 10 0000 0000",
  phone2: "",
  whatsapp: "+20 10 0000 0000",
  email: "info@alamoudi.com",
  tiktok: "",
  tiktokName: "العمودي للتسويق العقاري",
  tiktokAvatar: "",
  facebook: "",
  instagram: "",
  mapsUrl: "https://maps.google.com",
  heroImageUrl:
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80",
  heroOverlayOpacity: 85,
  tiktokVideos: [],
  carouselAutoPlayDelay: 3.5,
  carouselMotionSpeed: 1,
  allowCustomerImageDownloads: true,
  allowStaffImageDownloads: true,
};

function isMissingColumnError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error as { code?: string }).code === "42703") {
    return true;
  }
  if ("cause" in error) {
    return isMissingColumnError((error as { cause?: unknown }).cause);
  }
  return false;
}

async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL,
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`,
  );
}

export async function seedDatabase(): Promise<void> {
  await ensureSessionTable();

  const existingRegions = await db.select({ id: regionsTable.id }).from(regionsTable).limit(1);
  if (existingRegions.length === 0) {
    try {
      await db.insert(regionsTable).values(DEFAULT_REGIONS);
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;
      const legacyRegions = DEFAULT_REGIONS.map(({ id, name, active }) => ({
        id,
        name,
        active,
      }));
      await db.insert(regionsTable).values(legacyRegions);
    }
    logger.info("Seeded default regions");
  }

  // Add the supplied city hero to an existing database without overwriting
  // any image an administrator may already have chosen.
  // Older production schemas do not have hero_image. The regions route
  // already stores/retrieves hero images through settings in that case, so
  // seeding must not prevent the API from starting.
  try {
    const [shorouk] = await db
      .select({ heroImage: regionsTable.heroImage })
      .from(regionsTable)
      .where(eq(regionsTable.id, "shorouk"))
      .limit(1);
    if (shorouk && !shorouk.heroImage) {
      await db
        .update(regionsTable)
        .set({ heroImage: "/city-heroes/shorouk.jpg" })
        .where(eq(regionsTable.id, "shorouk"));
    }
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    logger.info("Skipping region hero image seed for legacy regions schema");
  }

  const existingTypes = await db
    .select({ id: propertyTypesTable.id })
    .from(propertyTypesTable)
    .limit(1);
  if (existingTypes.length === 0) {
    await db.insert(propertyTypesTable).values(DEFAULT_PROPERTY_TYPES);
    logger.info("Seeded default property types");
  }

  const existingProps = await db
    .select({ id: propertiesTable.id })
    .from(propertiesTable)
    .limit(1);
  if (existingProps.length === 0 && SEED_PROPERTIES.length > 0) {
    await db.insert(propertiesTable).values(SEED_PROPERTIES);
    logger.info({ count: SEED_PROPERTIES.length }, "Seeded properties");
  }

  const admin = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.role, "admin"), eq(usersTable.active, true)))
    .limit(1);

  if (admin.length === 0) {
    const adminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";

    // In production, require an explicit ADMIN_PASSWORD to prevent a predictable
    // privileged account from being created with a well-known default password.
    // In development, fall back to "admin1234" for convenience.
    const isProduction = !!process.env.REPLIT_DEPLOYMENT;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (isProduction && !adminPassword) {
      logger.error(
        "No admin account exists and ADMIN_PASSWORD is not set. " +
        "Set the ADMIN_PASSWORD secret before deploying to create the initial admin account. " +
        "The application will continue but the admin panel will be inaccessible until an admin is created.",
      );
      // Do not create an account with a predictable password — skip admin seeding.
    } else {
      const password = adminPassword || "admin1234";
      await db
        .insert(usersTable)
        .values({
          id: "admin-root",
          name: "مدير النظام",
          email: "admin@alamoudi.com",
          username: adminUsername,
          passwordHash: await hashPassword(password),
          role: "admin",
          active: true,
          joinedAt: new Date("2026-01-01").toISOString(),
        })
        .onConflictDoNothing();
      logger.info("Seeded default admin user");
    }
  }

  const existingSettings = await db
    .select({ id: settingsTable.id })
    .from(settingsTable)
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(settingsTable).values({ id: "main", data: DEFAULT_SETTINGS });
    logger.info("Seeded default settings");
  }
}

// Idempotent cleanup: normalise finishing values that were imported with
// inconsistent spelling so they always match the canonical FINISHING_OPTIONS list.
const FINISHING_FIXES: Array<{ from: string[]; to: string }> = [
  { from: ["ألترا سوبرلوكس", "ألترا"], to: "ألترا سوبر لوكس" },
  { from: ["٥٠%"], to: "تشطيب 50%" },
  { from: ["٧٥%"], to: "تشطيب 75%" },
  { from: ["semi-finished", "Semi-finished", "نصف تشطيب"], to: "نص تشطيب" },
];

export async function normalizeFinishingValues(): Promise<void> {
  for (const { from, to } of FINISHING_FIXES) {
    const updated = await db
      .update(propertiesTable)
      .set({ finishing: to })
      .where(inArray(propertiesTable.finishing, from))
      .returning({ id: propertiesTable.id });
    if (updated.length > 0) {
      logger.info({ count: updated.length, to }, "Normalised finishing values");
    }
  }
}
