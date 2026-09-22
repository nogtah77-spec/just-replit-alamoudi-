import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiLeadsTable = pgTable("ai_leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  preferredLanguage: text("preferred_language").notNull().default(""),
  requirements: text("requirements").notNull().default(""),
  budget: text("budget").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const insertAiLeadSchema = createInsertSchema(aiLeadsTable);
export type AiLead = typeof aiLeadsTable.$inferSelect;
export type InsertAiLead = z.infer<typeof insertAiLeadSchema>;
