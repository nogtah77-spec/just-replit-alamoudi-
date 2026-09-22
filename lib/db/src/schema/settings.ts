import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().default("main"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
});

export type SettingsRow = typeof settingsTable.$inferSelect;
