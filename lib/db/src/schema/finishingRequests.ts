import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const finishingRequestsTable = pgTable("finishing_requests", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  area: text("area").notNull().default(""),
  finishingType: text("finishing_type").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const insertFinishingRequestSchema = createInsertSchema(finishingRequestsTable);
export type FinishingRequest = typeof finishingRequestsTable.$inferSelect;
export type InsertFinishingRequest = z.infer<typeof insertFinishingRequestSchema>;
