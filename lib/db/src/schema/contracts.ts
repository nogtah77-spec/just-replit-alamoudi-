import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractDocumentSchema = z.object({
  id: z.string(),
  objectPath: z.string(),
  name: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string(),
});

export const contractInstallmentSchema = z.object({
  id: z.string(),
  dueDate: z.string(),
  amount: z.string(),
  status: z.enum(["pending", "paid", "overdue"]),
  notes: z.string(),
});

export type ContractDocument = z.infer<typeof contractDocumentSchema>;
export type ContractInstallment = z.infer<typeof contractInstallmentSchema>;

export const contractsTable = pgTable("contracts", {
  id: text("id").primaryKey(),
  contractNumber: text("contract_number").notNull().default(""),
  contractType: text("contract_type").notNull().default("sale"),
  status: text("status").notNull().default("draft"),
  propertyId: text("property_id").notNull().default(""),
  propertyCode: text("property_code").notNull().default(""),
  propertyTitle: text("property_title").notNull().default(""),
  propertyType: text("property_type").notNull().default(""),
  propertyRegion: text("property_region").notNull().default(""),
  propertyAddress: text("property_address").notNull().default(""),
  assignedStaffId: text("assigned_staff_id").notNull().default(""),
  partyOneRole: text("party_one_role").notNull().default(""),
  partyOneName: text("party_one_name").notNull().default(""),
  partyOnePhone: text("party_one_phone").notNull().default(""),
  partyOneEmail: text("party_one_email").notNull().default(""),
  partyOneNationalId: text("party_one_national_id").notNull().default(""),
  partyOneAddress: text("party_one_address").notNull().default(""),
  partyTwoRole: text("party_two_role").notNull().default(""),
  partyTwoName: text("party_two_name").notNull().default(""),
  partyTwoPhone: text("party_two_phone").notNull().default(""),
  partyTwoEmail: text("party_two_email").notNull().default(""),
  partyTwoNationalId: text("party_two_national_id").notNull().default(""),
  partyTwoAddress: text("party_two_address").notNull().default(""),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  signingDate: text("signing_date").notNull().default(""),
  handoverDate: text("handover_date").notNull().default(""),
  renewalDate: text("renewal_date").notNull().default(""),
  noticePeriod: text("notice_period").notNull().default(""),
  totalAmount: text("total_amount").notNull().default(""),
  paidAmount: text("paid_amount").notNull().default(""),
  remainingAmount: text("remaining_amount").notNull().default(""),
  insuranceAmount: text("insurance_amount").notNull().default(""),
  depositAmount: text("deposit_amount").notNull().default(""),
  currency: text("currency").notNull().default("جنيه مصري"),
  paymentMethod: text("payment_method").notNull().default(""),
  paymentFrequency: text("payment_frequency").notNull().default(""),
  nextPaymentDate: text("next_payment_date").notNull().default(""),
  terms: text("terms").notNull().default(""),
  notes: text("notes").notNull().default(""),
  documents: jsonb("documents").$type<ContractDocument[]>().notNull().default([]),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const contractInstallmentsTable = pgTable("contract_installments", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull(),
  dueDate: text("due_date").notNull().default(""),
  amount: text("amount").notNull().default(""),
  status: text("status").notNull().default("pending"),
  notes: text("notes").notNull().default(""),
});

export const insertContractSchema = createInsertSchema(contractsTable);
export type Contract = typeof contractsTable.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type ContractInstallmentRow = typeof contractInstallmentsTable.$inferSelect;