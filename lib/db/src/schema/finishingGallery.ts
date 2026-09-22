import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";

export const finishingGalleryTable = pgTable("finishing_gallery", {
  id:           text("id").primaryKey(),
  title:        text("title").notNull().default(""),
  description:  text("description").notNull().default(""),
  imageUrl:     text("image_url").notNull().default(""),
  videoUrl:     text("video_url").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  active:       boolean("active").notNull().default(true),
  createdAt:    text("created_at").notNull(),
});

export type FinishingGalleryItem        = typeof finishingGalleryTable.$inferSelect;
export type InsertFinishingGalleryItem  = typeof finishingGalleryTable.$inferInsert;
