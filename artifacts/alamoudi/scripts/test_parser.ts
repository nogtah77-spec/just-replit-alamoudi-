import { parsePropertyText } from "../src/lib/aiPropertyParser";

// ── Test 1: شقة فاخرة بالتجمع الخامس (اللوتس) ──
const text1 = `
كود: T-101
شقة للبيع في التجمع الخامس – حي اللوتس
الموقع: خطوات من شارع التسعين وبجوار مول كونكورد
المساحة: 185 متر
3 غرف نوم + 2 حمام
غرفة ماستر: نعم
الدور: 3
الواجهة: واجهة أمامية
تشطيب: ألترا سوبر لوكس
أسانسير: يوجد
السعر: 5,200,000 جنيه
اسم المالك: د. طارق عبد الرحمن
الموظف المسؤول: محمد رمضان
`;

// ── Test 2: فيلا بالشروق (المنطقة الخامسة) ──
const text2 = `
ALM-880
فيلا مستقلة للبيع في مدينة الشروق - المنطقة الخامسة
عدد طوابق العقار: 3
مساحة 500 م2
5 غرف نوم منها غرفتان ماستر
6 حمامات
حديقة خاصة وحمام سباحة خاص
موقف سيارة خاص
السعر: 22 مليون
المعلن: شركة الأهرام العقارية
وسيط
`;

// ── Test 3: شقة بمدينتي (B6 G15 + دريسنج) ──
const text3 = `
شقة مميزة للبيع في مدينتي B6 G15
مساحة 140م
3 غرف و 2 حمام
الدور الثاني
الفيو: فيو حديقة
الواجهة: بحرية
الدريسينج: غرفة دريسنج
أسانسير نعم
تشطيب: سوبر لوكس
السعر: 4500000 ج.م
الموقع: بالقرب من النادي ومجمع الخدمات
صاحب العقار: أ/ مصطفى كامل
الموظف: نسرين
`;

// ── Test 4: شقة مدينة نصر – الحي السابع ──
const text4 = `
المنطقة: مدينة نصر – الحي السابع
نوع العقار: شقة سكنية
المساحة: 175 متر
الدور: الرابع
عدد الغرف: 3 غرف نوم
عدد الحمامات: 2
الريسبشن: 3 قطع
المطبخ: مستقل
التشطيب: سوبر لوكس
الواجهة: أمامية وتهوية جيدة
المصعد: متوفر
الجراج: متوفر
حالة الشقة: جيدة وجاهزة للسكن
سنة البناء: 2014 تقريبًا
حالة المرافق: كهرباء ومياه وغاز طبيعي

مميزات الموقع:
* موقع هادئ وقريب من الخدمات والمواصلات.
* بالقرب من المدارس والمطاعم والمحلات.
* سهولة الوصول إلى شارع عباس العقاد ومكرم عبيد.
* العقار مناسب للسكن العائلي.

السعر المطلوب: 4,850,000 جنيه
اسم الموظف المسؤول: محمد رمضان
اسم المالك: أحمد محمود
رقم المالك: 0100 123 4567
`;

// ── Test 5: الحالة الأولى للمستخدم (شقة الشروق S72) ──
const text5 = `
شقة للبيع ✨ مدينة الشروق

📍 المنطقة السادسة
خلف كمبوند المعادي فيو
قرب مدخل الشروق 2 من طريق السويس
أمام أوبن إير مول ومدخل مدينتي

✨ مواصفات الشقة

🛏️ 3 غرف نوم
🚿 3 حمامات
🛋️ ريسبشن كبير 3 قطع
🍽️ مطبخ
🌅 بلكونة
🏢 الدور الأول علوي
🛗 أسانسير
🏠 تشطيب سوبر لوكس
🚗 جراج خاص 40 متر مسجل بالعقد
🏗️ العمارة مكونة من 3 أدوار فقط
⚡ جميع العدادات متوفرة (كهرباء – مياه – غاز)

📐 المساحة

188 متر²
تحميل قديم بما يعادل أكثر من 210 متر بالمقاييس الحالية.

💰 السعر المطلوب

5000,000 جنيه

CODE: S72
`;

// ── Test 6: الحالة الثانية للمستخدم (شقة أرضي بحديقتين S79 - أرقام شرقية وأسعار مركبة) ──
const text6 = `
شقة مميزة بحديقتين خلفي وأمامي 🌴

أرضي مرتفع بمدخل خاص ✨
✨ الدور الأرضي على شقتين فقط 

- مساحة الشقة ٢٥٥ متر
- مساحة الحديقة الخلفية ٩٠ متر
- مساحة الحديقة الأمامية ٢٠ متر

تتكون الشقه من :
- ٣ غرف (غرفة ماستر بحمام ودريسنج)
- ٣ حمامات (ومتأسس حمام رابع)
- ٤ بلكونات
- مطبخ + ليفينج
- حديقة خلفيه 90 متر
- حديقة أمامية 20 متر

🚗  موقف خاص للشقة في الكراج 

الشقة فيها شغل سباكه وكهرباء وجبس بورد
تم توصيل الغاز 👌

✨ وتتميز الشقة بمدخل خاص من الجنينة الأمامية ومدخل خاص للجنينة الخلفية

ويوجد حارس  للعمارة

CODE: S79

السعر : 4 مليون و400 ألف
`;

function runTests() {
  console.log("==========================================");
  console.log("🚀 COMPREHENSIVE REAL ESTATE NLP TEST SUITE");
  console.log("==========================================\n");

  let passed = 0;
  const total = 6;

  // Test 1
  console.log("▶ TEST 1: شقة اللوتس بالتجمع الخامس");
  const res1 = parsePropertyText(text1);
  if (
    res1.code === "T-101" &&
    res1.regionId === "tagamoa" &&
    res1.subArea === "حي اللوتس" &&
    res1.typeId === "apartment" &&
    res1.price === 5200000 &&
    res1.unitType === "أمامي" &&
    res1.floor === 3 &&
    res1.master === "نعم"
  ) {
    console.log("✅ TEST 1 PASSED\n");
    passed++;
  } else {
    console.error("❌ TEST 1 FAILED\n");
  }

  // Test 2
  console.log("▶ TEST 2: فيلا الشروق");
  const res2 = parsePropertyText(text2);
  if (
    res2.code === "ALM-880" &&
    res2.typeId === "villa" &&
    res2.regionId === "shorouk" &&
    res2.subArea === "المنطقة الخامسة" &&
    res2.floors === 3 &&
    res2.master === "نعم" &&
    res2.agentType === "broker"
  ) {
    console.log("✅ TEST 2 PASSED\n");
    passed++;
  } else {
    console.error("❌ TEST 2 FAILED\n");
  }

  // Test 3
  console.log("▶ TEST 3: مدينتي B6 G15");
  const res3 = parsePropertyText(text3);
  if (
    res3.regionId === "madinaty" &&
    res3.subArea === "B6 مجموعة 15" &&
    res3.view === "فيو حديقة" &&
    res3.unitType === "بحرية" &&
    res3.floorText === "غرفة دريسنج" &&
    res3.floor === 2
  ) {
    console.log("✅ TEST 3 PASSED\n");
    passed++;
  } else {
    console.error("❌ TEST 3 FAILED\n");
  }

  // Test 4
  console.log("▶ TEST 4: شقة مدينة نصر – الحي السابع");
  const res4 = parsePropertyText(text4);
  if (
    res4.regionId === "nasr_city" &&
    res4.subArea === "الحي السابع" &&
    res4.typeId === "apartment" &&
    res4.category === "residential" &&
    res4.area === 175 &&
    res4.floor === 4 &&
    res4.unitType === "أمامي"
  ) {
    console.log("✅ TEST 4 PASSED\n");
    passed++;
  } else {
    console.error("❌ TEST 4 FAILED\n");
  }

  // Test 5 (User Test Case 1: S72)
  console.log("▶ TEST 5: شقة الشروق S72 (شقة وليست عمارة + دور أول + 5 مليون)");
  const res5 = parsePropertyText(text5);
  console.log("Parsed S72:", JSON.stringify(res5, null, 2));

  const t5_checks = {
    code: res5.code === "S72",
    typeIsApartment: res5.typeId === "apartment", // MUST be apartment NOT building!
    category: res5.category === "residential",
    regionId: res5.regionId === "shorouk",
    subArea: res5.subArea === "المنطقة السادسة",
    price: res5.price === 5000000,
    area: res5.area === 188,
    beds: res5.beds === 3,
    baths: res5.baths === 3,
    floor: res5.floor === 1,                      // "الدور الأول علوي" -> 1
    floors: res5.floors === 3,                    // "العمارة مكونة من 3 أدوار" -> 3
    finishing: res5.finishing === "سوبر لوكس",
    elevator: res5.elevator === "نعم",
    parking: res5.parking === "يوجد",
    hasDescription: !!res5.description,
  };
  console.log("Test 5 Details:", t5_checks);
  if (Object.values(t5_checks).every(Boolean)) {
    console.log("✅ TEST 5 (S72) PASSED 100% PERFECTLY!\n");
    passed++;
  } else {
    console.error("❌ TEST 5 (S72) FAILED\n");
  }

  // Test 6 (User Test Case 2: S79)
  console.log("▶ TEST 6: شقة أرضي بحديقتين S79 (أرقام شرقية ٢٥٥م + 4 مليون و400 ألف + سباكة وجبسبورد)");
  const res6 = parsePropertyText(text6);
  console.log("Parsed S79:", JSON.stringify(res6, null, 2));

  const t6_checks = {
    code: res6.code === "S79",
    typeIsApartment: res6.typeId === "apartment",   // MUST be apartment NOT building!
    category: res6.category === "residential",
    price: res6.price === 4400000,                  // 4 مليون و400 ألف = 4,400,000!
    area: res6.area === 255,                        // 255م مساحة الشقة (وليس 90م الحديقة)!
    beds: res6.beds === 3,                          // 3 غرف (من ٣ غرف)!
    baths: res6.baths === 3,                        // 3 حمامات (من ٣ حمامات)!
    floor: res6.floor === 0,                        // أرضي مرتفع = 0
    master: res6.master === "نعم",                  // غرفة ماستر
    dressing: res6.floorText === "يوجد" || res6.floorText === "غرفة دريسنج", // ودريسنج
    finishing: res6.finishing === "تشطيب 50%" || res6.finishing === "نصف تشطيب", // سباكة وكهرباء وجبسبورد
    parking: res6.parking === "يوجد",               // موقف خاص في الكراج
    subAreaIsNotGarden: !res6.subArea?.includes("حديقة"), // حظر الحديقة من دخول المنطقة الفرعية
    hasDescription: !!res6.description,
  };
  console.log("Test 6 Details:", t6_checks);
  if (Object.values(t6_checks).every(Boolean)) {
    console.log("✅ TEST 6 (S79) PASSED 100% PERFECTLY!\n");
    passed++;
  } else {
    console.error("❌ TEST 6 (S79) FAILED\n");
  }

  console.log("==========================================");
  console.log(`🏁 RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("==========================================");
}

runTests();
