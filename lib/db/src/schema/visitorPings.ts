import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const visitorPingsTable = pgTable(
  "visitor_pings",
  {
    id: serial("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("visitor_pings_created_at_idx").on(t.createdAt),
    visitorIdx: index("visitor_pings_visitor_idx").on(t.visitorId),
  }),
);

export type VisitorPing = typeof visitorPingsTable.$inferSelect;
export type InsertVisitorPing = typeof visitorPingsTable.$inferInsert;
