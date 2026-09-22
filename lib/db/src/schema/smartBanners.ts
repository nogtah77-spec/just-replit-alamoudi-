import { pgTable, text, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const smartBannersTable = pgTable("smart_banners", {
  id:        text("id").primaryKey(),
  type:      text("type").notNull().default("countdown"),
  title:     text("title").notNull().default(""),
  config:    jsonb("config").notNull().default({}),
  active:    boolean("active").notNull().default(true),
  order:     integer("order").notNull().default(0),
  slot:      text("slot").notNull().default("top"),
  pinned:    boolean("pinned").notNull().default(false),
  duration:  integer("duration").notNull().default(10),
  createdAt: text("created_at").notNull(),
});

export type SmartBanner       = typeof smartBannersTable.$inferSelect;
export type InsertSmartBanner = typeof smartBannersTable.$inferInsert;
