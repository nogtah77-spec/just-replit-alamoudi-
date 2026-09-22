import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  price: bigint("price", { mode: "number" }).notNull().default(0),
  area: integer("area").notNull().default(0),
  beds: integer("beds").notNull().default(0),
  baths: integer("baths").notNull().default(0),
  floors: integer("floors").notNull().default(0),
  floor: integer("floor").notNull().default(0),
  finishing: text("finishing").notNull().default(""),
  view: text("view").notNull().default(""),
  typeId: text("type_id").notNull().default(""),
  regionId: text("region_id").notNull().default(""),
  category: text("category").notNull().default("residential"),
  listingType: text("listing_type").notNull().default("sale"),
  status: text("status").notNull().default("active"),
  featured: boolean("featured").notNull().default(false),
  agentType: text("agent_type").notNull().default("direct"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  videoUrl: text("video_url").notNull().default(""),
  externalUrl: text("external_url").notNull().default(""),
  mapsUrl: text("maps_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
  unitType: text("unit_type").notNull().default(""),
  subArea: text("sub_area").notNull().default(""),
  layout: text("layout").notNull().default(""),
  master: text("master").notNull().default(""),
  elevator: text("elevator").notNull().default(""),
  parking: text("parking").notNull().default(""),
  additionalFeatures: text("additional_features").notNull().default(""),
  floorText: text("floor_text").notNull().default(""),
  location: text("location").notNull().default(""),
  source: text("source").notNull().default(""),
  sourcePhones: jsonb("source_phones").$type<string[]>().notNull().default([]),
  sourceEmail: text("source_email").notNull().default(""),
  sourceLocation: text("source_location").notNull().default(""),
  sourceNotes: text("source_notes").notNull().default(""),
  assignedStaffId: text("assigned_staff_id").notNull().default(""),
  views: integer("views").notNull().default(0),
  coverPriority: text("cover_priority").notNull().default("image"),
});

export const insertPropertySchema = createInsertSchema(propertiesTable);
export type Property = typeof propertiesTable.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
