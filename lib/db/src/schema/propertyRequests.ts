import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertyRequestsTable = pgTable("property_requests", {
  id: text("id").primaryKey(),
  ownerName: text("owner_name").notNull().default(""),
  ownerPhone: text("owner_phone").notNull().default(""),
  ownerWhatsapp: text("owner_whatsapp").notNull().default(""),
  ownerEmail: text("owner_email").notNull().default(""),
  regionId: text("region_id").notNull().default(""),
  propertyTypeId: text("property_type_id").notNull().default(""),
  listingType: text("listing_type").notNull().default(""),
  area: text("area").notNull().default(""),
  price: text("price").notNull().default(""),
  description: text("description").notNull().default(""),
  mapsUrl: text("maps_url").notNull().default(""),
  notes: text("notes").notNull().default(""),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const insertPropertyRequestSchema = createInsertSchema(propertyRequestsTable);
export type PropertyRequest = typeof propertyRequestsTable.$inferSelect;
export type InsertPropertyRequest = z.infer<typeof insertPropertyRequestSchema>;
