import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityLogsTable = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull().default(""),
  entityType: text("entity_type").notNull().default(""),
  title: text("title").notNull().default(""),
  actor: text("actor").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable);
export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
