import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  username: text("username").notNull().default(""),
  passwordHash: text("password_hash").notNull().default(""),
  role: text("role").notNull().default("customer"),
  active: boolean("active").notNull().default(true),
  canClearActivityLogs: boolean("can_clear_activity_logs").notNull().default(false),
  joinedAt: text("joined_at").notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export type DbUser = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
