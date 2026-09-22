import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertyTypesTable = pgTable("property_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertPropertyTypeSchema = createInsertSchema(propertyTypesTable);
export type PropertyType = typeof propertyTypesTable.$inferSelect;
export type InsertPropertyType = z.infer<typeof insertPropertyTypeSchema>;
