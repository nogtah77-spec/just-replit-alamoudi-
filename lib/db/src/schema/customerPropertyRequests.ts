import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerPropertyRequestsTable = pgTable("customer_property_requests", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  email: text("email").notNull().default(""),
  requestType: text("request_type").notNull().default(""),
  transactionType: text("transaction_type").notNull().default(""),
  preferredAreas: text("preferred_areas").notNull().default(""),
  budgetMin: text("budget_min").notNull().default(""),
  budgetMax: text("budget_max").notNull().default(""),
  bedrooms: text("bedrooms").notNull().default(""),
  bathrooms: text("bathrooms").notNull().default(""),
  areaMin: text("area_min").notNull().default(""),
  areaMax: text("area_max").notNull().default(""),
  finishing: text("finishing").notNull().default(""),
  furnished: text("furnished").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default(""),
  requiredFeatures: text("required_features").notNull().default(""),
  details: text("details").notNull().default(""),
  notes: text("notes").notNull().default(""),
  source: text("source").notNull().default(""),
  followUpDate: text("follow_up_date").notNull().default(""),
  assignedStaffId: text("assigned_staff_id").notNull().default(""),
  viewingDate: text("viewing_date").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const insertCustomerPropertyRequestSchema = createInsertSchema(customerPropertyRequestsTable);
export type CustomerPropertyRequest = typeof customerPropertyRequestsTable.$inferSelect;
export type InsertCustomerPropertyRequest = z.infer<typeof insertCustomerPropertyRequestSchema>;