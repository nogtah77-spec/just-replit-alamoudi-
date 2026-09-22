import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStaff } from "../lib/auth";
import { logActivity, actorFromReq } from "../lib/activityLog";

export interface AboutValue { id: string; title: string; desc: string }
export interface AboutPageConfig {
  heroSubtitle: string;
  storyTitle: string;
  storyParagraphs: string[];
  valuesTitle: string;
  valuesSubtitle: string;
  values: AboutValue[];
}

const DEFAULT_CONFIG: AboutPageConfig = {
  heroSubtitle: "العمودي للتسويق العقاري — شريكك الموثوق في عالم العقارات الفاخرة",
  storyTitle: "قصتنا",
  storyParagraphs: [
    "العمودي للتسويق العقاري شركة متخصصة في التسويق والاستثمار العقاري، تأسست عام 2018، وتمتلك خبرة واسعة في سوق العقارات المصري والسعودي.",
    "نسعى لتقديم أفضل الفرص العقارية والاستثمارية لعملائنا من خلال خدمات احترافية وحلول مبتكرة تلبي مختلف الاحتياجات السكنية والاستثمارية.",
    "يقودنا فريق من أمهر المستشارين العقاريين الذين يتمتعون بخبرات عميقة في السوق وشبكة علاقات واسعة تُمكّننا من تقديم فرص حصرية لعملائنا.",
  ],
  valuesTitle: "قيمنا",
  valuesSubtitle: "نلتزم بمجموعة من القيم الراسخة التي توجه كل خطوة نخطوها.",
  values: [
    { id: "1", title: "الجودة والحصرية", desc: "نوفر وصولاً لأرقى العقارات والفرص الاستثمارية غير المتاحة في السوق العام." },
    { id: "2", title: "الثقة والموثوقية", desc: "فريق من المستشارين ذوي المعرفة العميقة بالسوق العقاري المصري والسعودي." },
    { id: "3", title: "الخدمة المتكاملة", desc: "نرافق العميل من البحث والمقارنة حتى إتمام كافة الإجراءات القانونية ونقل الملكية." },
    { id: "4", title: "الشفافية الكاملة", desc: "وضوح كامل في التسعير والمواصفات لضمان قرار استثماري سليم وآمن." },
  ],
};

async function getAboutConfig(): Promise<AboutPageConfig> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, "main")).limit(1);
  const data = (row?.data ?? {}) as Record<string, unknown>;
  const cfg = data.aboutPage as AboutPageConfig | undefined;
  if (!cfg) return DEFAULT_CONFIG;
  return {
    heroSubtitle: String(cfg.heroSubtitle ?? DEFAULT_CONFIG.heroSubtitle),
    storyTitle: String(cfg.storyTitle ?? DEFAULT_CONFIG.storyTitle),
    storyParagraphs: Array.isArray(cfg.storyParagraphs)
      ? cfg.storyParagraphs.map(String)
      : DEFAULT_CONFIG.storyParagraphs,
    valuesTitle: String(cfg.valuesTitle ?? DEFAULT_CONFIG.valuesTitle),
    valuesSubtitle: String(cfg.valuesSubtitle ?? DEFAULT_CONFIG.valuesSubtitle),
    values: Array.isArray(cfg.values)
      ? cfg.values.map((v: AboutValue) => ({ id: String(v.id), title: String(v.title ?? ""), desc: String(v.desc ?? "") }))
      : DEFAULT_CONFIG.values,
  };
}

const router: IRouter = Router();

router.get("/about-page", async (_req, res): Promise<void> => {
  res.json(await getAboutConfig());
});

router.put("/about-page", requireStaff, async (req, res): Promise<void> => {
  const body = req.body as AboutPageConfig;
  const config: AboutPageConfig = {
    heroSubtitle: String(body.heroSubtitle ?? ""),
    storyTitle: String(body.storyTitle ?? "قصتنا"),
    storyParagraphs: Array.isArray(body.storyParagraphs) ? body.storyParagraphs.map(String) : [],
    valuesTitle: String(body.valuesTitle ?? "قيمنا"),
    valuesSubtitle: String(body.valuesSubtitle ?? ""),
    values: Array.isArray(body.values)
      ? body.values.map((v: AboutValue) => ({ id: String(v.id), title: String(v.title ?? ""), desc: String(v.desc ?? "") }))
      : [],
  };
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, "main")).limit(1);
  const existing = (row?.data ?? {}) as Record<string, unknown>;
  const newData = { ...existing, aboutPage: config };
  await db.insert(settingsTable).values({ id: "main", data: newData })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: newData } });
  await logActivity({
    action: "updated",
    entityType: "about_page",
    title: "تم تعديل صفحة من نحن",
    actor: actorFromReq(req),
  });
  res.json(config);
});

export default router;
