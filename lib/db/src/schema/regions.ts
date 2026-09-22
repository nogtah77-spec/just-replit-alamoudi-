import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regionsTable = pgTable("regions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  heroImage: text("hero_image").notNull().default(""),
});

export const insertRegionSchema = createInsertSchema(regionsTable);
export type Region = typeof regionsTable.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
