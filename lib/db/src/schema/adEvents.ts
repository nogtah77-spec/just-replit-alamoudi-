import { pgTable, serial, text, integer, timestamp, real, index } from "drizzle-orm/pg-core";

export const adEventsTable = pgTable(
  "ad_events",
  {
    id:           serial("id").primaryKey(),
    adId:         text("ad_id").notNull(),
    eventType:    text("event_type").notNull(), // 'view' | 'click'
    sessionId:    text("session_id"),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deviceType:   text("device_type"),   // 'mobile' | 'tablet' | 'desktop'
    browser:      text("browser"),
    os:           text("os"),
    screenWidth:  integer("screen_width"),
    screenHeight: integer("screen_height"),
    language:     text("language"),
    referrer:     text("referrer"),
    referrerType: text("referrer_type"), // 'direct' | 'internal' | 'search' | 'social' | 'external'
    referrerPage: text("referrer_page"), // الصفحة التي جاء منها الزائر داخل المنصة
    viewDuration: integer("view_duration"), // مللي ثانية — لحوادث المشاهدة فقط
    clickX:       real("click_x"),       // نسبة أفقية 0–1 — لحوادث النقر فقط
    clickY:       real("click_y"),       // نسبة رأسية 0–1 — لحوادث النقر فقط
    actionType:   text("action_type"),   // 'url' | 'whatsapp' | 'phone' | null — لحوادث link_click فقط
    country:      text("country"),       // اسم الدولة — مثل: Egypt
    countryCode:  text("country_code"),  // كود الدولة — مثل: EG
    city:         text("city"),          // المدينة — مثل: Cairo
    region:       text("region"),        // المنطقة — مثل: Cairo Governorate
  },
  (t) => ({
    adIdIdx:      index("ad_events_ad_id_idx").on(t.adId),
    createdAtIdx: index("ad_events_created_at_idx").on(t.createdAt),
    sessionIdx:   index("ad_events_session_idx").on(t.sessionId),
    typeIdx:      index("ad_events_type_idx").on(t.eventType),
  }),
);

export type AdEvent       = typeof adEventsTable.$inferSelect;
export type InsertAdEvent = typeof adEventsTable.$inferInsert;
