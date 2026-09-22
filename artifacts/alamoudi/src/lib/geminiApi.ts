/**
 * Gemini Pro Real Estate Ingestion Client
 * Sends raw property text to Google Generative AI API (Gemini Pro / Flash)
 * and returns high-fidelity structured property data aligned with platform fields.
 */

import { ParsedPropertyData, parsePropertyText } from "./aiPropertyParser";

export interface GeminiPropertyPayload {
  code?: string;
  price?: number;
  area?: number;
  beds?: number;
  baths?: number;
  master?: string;
  floor?: number;
  floorText?: string; // used for dressing (الدريسنج)
  regionId?: string;
  subArea?: string;
  typeId?: string;
  unitType?: string; // used for facade (الواجهة: أمامي / خلفي / بانورامي)
  category?: "residential" | "administrative" | "medical" | "commercial";
  listingType?: "sale" | "rent" | "furnished";
  finishing?: string;
  parking?: string;
  elevator?: string;
  view?: string; // used for view (الفيو: فيو حديقة / مول / مسبح)
  layout?: string;
  additionalFeatures?: string;
  source?: string;
  sourcePhones?: string[];
  assignedStaffName?: string;
  description?: string;
}

export async function parsePropertyWithGemini(
  text: string,
  apiKey: string,
  model = "gemini-1.5-pro",
  regionsList: { id: string; name: string }[] = [],
  typesList: { id: string; name: string }[] = [],
  staffList: { id: string; name: string }[] = []
): Promise<ParsedPropertyData & { assignedStaffId?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return parsePropertyText(text);
  }

  const prompt = `
أنت وكيل ذكاء اصطناعي عقاري فائق الدقة متخصص في تحليل الإعلانات العقارية باللغتين العربية والإنجليزية وسوق العقارات المصري.
حلل النص العقاري التالي واستخرج منه كافة البيانات بدقة متناهية بصيغة JSON فقط:

النص المراد تحليله:
"""
${text}
"""

قائمة المناطق المتاحة (اختر أقرب معرف regionId مطابق):
${JSON.stringify(regionsList)}

قائمة أنواع العقارات المتاحة (اختر أقرب معرف typeId مطابق):
${JSON.stringify(typesList)}

قائمة الموظفين المسؤولين:
${JSON.stringify(staffList)}

تعليمات استخراج الحقول بدقة متناهية:
1. code: كود العقار إن وُجد (مثل S72 أو S79 أو ALM-123).
2. price: السعر الإجمالي كرقم صحيح (مثلاً "4 مليون و400 ألف" تكون 4400000، و "5000,000" تكون 5000000).
3. area: مساحة الشقة / الوحدة الأساسية بالمتر المربع كرقم صحيح (لا تأخذ مساحة الحديقة أو الجراج).
4. beds: عدد غرف النوم الإجمالي كرقم صحيح.
5. baths: عدد الحمامات كرقم صحيح.
6. master: إذا وُجدت غرفة ماستر ضع القيمة "نعم" فقط.
7. floorText: الدريسنج (ضع "يوجد" أو "غرفة دريسنج" إذا ذكرت).
8. floor: رقم الدور كرقم صحيح (0 للأرضي أو أرضي مرتفع، 1 للأول علوي).
9. regionId: معرف المنطقة من القائمة إن وُجدت.
10. subArea: المنطقة الفرعية أو الحي أو الكمبوند (احذر: لا تضع الحديقة أو المساحة هنا).
11. typeId: نوع العقار (إذا كانت شقة في عمارة اختر "apartment"، ولا تختر "building" إلا إذا كانت العمارة بالكامل معروضة للبيع).
12. category: فئة العقار ("residential" سكني، "commercial" تجاري، "administrative" إداري، "medical" طبي).
13. listingType: نوع العرض ("sale" للبيع، "rent" للإيجار، "furnished" مفروش).
14. finishing: حالة التشطيب ("سوبر لوكس"، "تشطيب 50%" للسباكة والجبسبورد، "تشطيب كامل").
15. unitType: الواجهة والاتجاه فقط ("أمامي"، "خلفي"، "بانورامي"، "ناصية").
16. view: الفيو والإطلالة فقط ("فيو حديقة"، "فيو على مول"، "فيو مسبح"، "فيو مفتوح").
17. parking: موقف السيارات / الجراج / الكراج ("يوجد" أو "لا").
18. elevator: المصعد / الأسانسير ("نعم" أو "لا").
19. additionalFeatures: المميزات المذكورة مجمعة بنقاط (مثل "مدخل خاص · حديقة خاصة · عدادات مستقلة").
20. source: اسم المالك أو البروكر فقط إن وُجد صراحة.
21. sourcePhones: مصفوفة بأرقام الهواتف إن وجدت.
22. assignedStaffName: اسم الموظف المسؤول المذكور في النص إن وجد.
23. description: وصف تسويقي منظم ومرتب للعقار من كامل النص.

أرجع فقط كائن JSON خالصاً بدون أي نصوص تمهيدية.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      console.warn("Gemini API error, falling back to local parser", response.status);
      return parsePropertyText(text);
    }

    const data = await response.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return parsePropertyText(text);

    const parsed: GeminiPropertyPayload = JSON.parse(rawJson);

    // Match assignedStaffName to staff id
    let matchedStaffId: string | undefined;
    if (parsed.assignedStaffName && staffList.length > 0) {
      const q = parsed.assignedStaffName.trim().toLowerCase();
      const found = staffList.find(s => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()));
      if (found) matchedStaffId = found.id;
    }

    return {
      title: parsed.code ? `${parsed.typeId || "عقار"} ${parsed.code}` : undefined,
      description: parsed.description || text,
      price: parsed.price,
      area: parsed.area,
      beds: parsed.beds,
      baths: parsed.baths,
      master: parsed.master === "نعم" || parsed.master ? "نعم" : undefined,
      floor: parsed.floor,
      floorText: parsed.floorText,
      regionId: parsed.regionId,
      subArea: parsed.subArea,
      typeId: parsed.typeId,
      category: parsed.category,
      listingType: parsed.listingType,
      finishing: parsed.finishing,
      unitType: parsed.unitType,
      view: parsed.view,
      parking: parsed.parking,
      elevator: parsed.elevator,
      additionalFeatures: parsed.additionalFeatures,
      source: parsed.source,
      sourcePhones: parsed.sourcePhones,
      assignedStaffName: parsed.assignedStaffName,
      assignedStaffId: matchedStaffId,
    };
  } catch (error) {
    console.error("Gemini Ingestion failed, falling back to rule-based parser:", error);
    return parsePropertyText(text);
  }
}
