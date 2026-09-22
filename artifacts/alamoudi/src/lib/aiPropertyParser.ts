/**
 * Universal Multilingual Real Estate NLP & Pattern-Matching Engine (Arabic & English)
 * Expertly engineered for Egyptian New Cities & Standard Real Estate Fields:
 * - Eastern Arabic Numerals (٠-٩) normalization
 * - Compound million + thousand prices (e.g. 4 مليون و400 ألف)
 * - Apartment vs Building isolation (avoids 'العمارة مكونة من' choosing building)
 * - Area priority: Unit Area > Garden/Garage area
 * - SubArea isolation (strictly rejects garden, balcony, price, meters)
 * - Deep Sub-Area dictionary (Madinaty B1-B16, Shorouk 1-9, Tagamoa 1-6, Badr, Nasr City, New Heliopolis)
 * - Safe finishing mapping (سباكة وكهرباء وجبس بورد -> تشطيب 50%)
 * - Parking (جراج / كراج / موقف خاص)
 * - Dressing / Master / Floor / View / Facade separation
 */

export interface ParsedPropertyData {
  title?: string;
  code?: string;
  description?: string;
  price?: number;
  area?: number;
  beds?: number;
  baths?: number;
  floors?: number;
  floor?: number;
  floorText?: string; // used for الدريسنج
  finishing?: string;
  regionId?: string;
  typeId?: string;
  unitType?: string; // used for الواجهة (Facade/Orientation)
  category?: "residential" | "administrative" | "medical" | "commercial";
  listingType?: "sale" | "rent" | "furnished";
  agentType?: "direct" | "broker";
  master?: string;
  elevator?: string;
  parking?: string;
  view?: string; // used for الفيو / الإطلالة
  layout?: string;
  additionalFeatures?: string;
  source?: string;
  sourcePhones?: string[];
  sourceNotes?: string;
  location?: string;
  subArea?: string;
  assignedStaffName?: string;
}

function normalizeEasternArabicNumerals(str: string): string {
  const easternDigits: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  return str.replace(/[٠-٩۰-۹]/g, d => easternDigits[d] || d);
}

export function parsePropertyText(text: string): ParsedPropertyData {
  if (!text || !text.trim()) return {};

  const cleanText = normalizeEasternArabicNumerals(text.replace(/[\u200B-\u200D\uFEFF]/g, ""));
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result: ParsedPropertyData = {};
  const addFeaturesList: string[] = [];

  // ── 0. Property Code (e.g. V 721, ALM-880, S72, S79, CODE: S79, كود: 504) ──
  const codeExplicitMatch = cleanText.match(/(?:كود\s*العقار|كود|code)\s*[:=\-]?\s*([A-Za-z0-9\-_]{2,15})/i);
  if (codeExplicitMatch) {
    result.code = codeExplicitMatch[1].trim();
  } else if (lines.length > 0) {
    const firstLine = lines[0];
    const codeFirstMatch = firstLine.match(/^([A-Za-z]{1,6}\s*[-_]?\s*\d{2,6})\b/);
    if (codeFirstMatch) {
      result.code = codeFirstMatch[1].replace(/\s+/g, " ").trim();
    }
  }

  // ── 1. Price (Millions + Thousands Compound & Standalone) ──
  // 1.1 Compound: e.g. 4 مليون و400 ألف / 4 مليون و نصف / 4 مليون و ربع
  const compoundMillionMatch = cleanText.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|ملايين)\s*(?:و|\+|\s+)?\s*(?:(\d+(?:[.,]\d+)?)\s*(?:ألف|الف|k\b)|(نصف|ربع|تلت|ثلث))/i);
  if (compoundMillionMatch) {
    const mNum = parseFloat(compoundMillionMatch[1].replace(",", "."));
    let extra = 0;
    if (compoundMillionMatch[2]) {
      extra = parseFloat(compoundMillionMatch[2].replace(",", ".")) * 1000;
    } else if (compoundMillionMatch[3]) {
      const frac = compoundMillionMatch[3];
      if (frac === "نصف") extra = 500000;
      else if (frac === "ربع") extra = 250000;
      else if (frac === "تلت" || frac === "ثلث") extra = 333333;
    }
    if (!isNaN(mNum)) {
      result.price = Math.round(mNum * 1000000 + extra);
    }
  }

  // 1.2 Standalone Millions (e.g. 5 مليون / 4.8 مليون)
  if (!result.price) {
    const millionMatch = cleanText.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|ملايين|مليار|million|m\b)/i);
    if (millionMatch) {
      const num = parseFloat(millionMatch[1].replace(",", "."));
      if (!isNaN(num)) result.price = Math.round(num * 1000000);
    }
  }

  // 1.3 Standalone Thousands (e.g. 400 ألف)
  if (!result.price) {
    const kMatch = cleanText.match(/(\d+(?:[.,]\d+)?)\s*(?:ألف|الف|k\b)/i);
    if (kMatch) {
      const num = parseFloat(kMatch[1].replace(",", "."));
      if (!isNaN(num) && num > 20) result.price = Math.round(num * 1000);
    }
  }

  // 1.4 Explicit Price Numbers (e.g. 5000,000 / 4,850,000 / السعر المطلوب: 4750000)
  if (!result.price) {
    const rawPriceMatch = cleanText.match(/(?:سعر|مطلوب|المطلوب|السعر\s*المطلوب|بمقدم|إجمالي|كاش|بـ|ب|price|total)\s*[:=\-]?\s*(\d[\d,.\s]{3,})/i) ||
      cleanText.match(/(\d[\d,]{4,})\s*(?:جنيه|ج\.م|جم|ج|egp|le|usd|\$)/i) ||
      cleanText.match(/(\d{6,})/);
    if (rawPriceMatch) {
      const parsed = parseInt(rawPriceMatch[1].replace(/[,.\s]/g, ""), 10);
      if (!isNaN(parsed) && parsed > 5000) result.price = parsed;
    }
  }

  // ── 2. Area (م², متر, sqm) - Prioritizes Unit Area over Garden/Garage ──
  const unitAreaMatch = cleanText.match(/(?:مساحة\s*الشقة|مساحة\s*الوحدة|مساحة\s*العقار|المساحة\s*الإجمالية|المساحة\s*الكلية|مساحة\s*الفيلا|مساحة\s*الدوبلكس)\s*[:=\-]?\s*(\d+)/i);
  if (unitAreaMatch) {
    const area = parseInt(unitAreaMatch[1], 10);
    if (!isNaN(area) && area > 10) result.area = area;
  } else {
    for (const line of lines) {
      if (/حديقة|جنينة|جراج|كراج|بلكونة|تراس|روف|تحميل/i.test(line)) continue;
      const areaMatch = line.match(/(?:مساحة|المساحة|area|space|size)\s*[:=\-]?\s*(\d+)/i) ||
        line.match(/(\d+)\s*(?:متر|م²|م2|sqm|m2|sq\.m)/i);
      if (areaMatch) {
        const area = parseInt(areaMatch[1], 10);
        if (!isNaN(area) && area > 10 && area < 50000) {
          result.area = area;
          break;
        }
      }
    }
  }

  // ── 3. Bedrooms ──
  const bedsMatch = cleanText.match(/(?:عدد\s*غرف\s*النوم|غرف\s*النوم|عدد\s*الغرف|غرف|غرفة|نوم|غرفه|bedrooms?|beds?|br\b)\s*[:=\-]?\s*(\d+)/i) ||
    cleanText.match(/(\d+)\s*(?:غرف|غرفة|نوم|غرفه|bedrooms?|beds?|br\b)/i);
  if (bedsMatch) {
    const beds = parseInt(bedsMatch[1], 10);
    if (!isNaN(beds) && beds > 0 && beds <= 20) result.beds = beds;
  } else if (/استوديو|أستوديو|استديو|studio/i.test(cleanText)) {
    result.beds = 1;
  }

  // ── 4. Bathrooms ──
  const bathsMatch = cleanText.match(/(?:عدد\s*الحمامات|حمامات|حمام|تواليت|bathrooms?|baths?|wc\b)\s*[:=\-]?\s*(\d+)/i) ||
    cleanText.match(/(\d+)\s*(?:حمامات|حمام|تواليت|bathrooms?|baths?|wc\b)/i);
  if (bathsMatch) {
    const baths = parseInt(bathsMatch[1], 10);
    if (!isNaN(baths) && baths > 0 && baths <= 15) result.baths = baths;
  } else if (/حمامين|حمامان/i.test(cleanText)) {
    result.baths = 2;
  }

  // ── 5. Master Bedrooms (نعم / لا) ──
  if (
    /(?:غرفة\s*ماستر|غرفه\s*ماستر|غرفتان\s*ماستر|غرفتين\s*ماستر|\d+\s*ماستر|ماستر\s*روم|ماستر\s*:\s*(?:نعم|يوجد|١|1|متوفر)|master\s*bedroom|master\s*:\s*yes|en-?suite|غرفة\s*بحمام\s*خاص|\bماستر\b)/i.test(cleanText)
  ) {
    if (/ماستر\s*:\s*(?:لا|بدون|0|غير\s*متوفر)/i.test(cleanText)) {
      result.master = "لا";
    } else {
      result.master = "نعم";
    }
  }

  // ── 5.5 Dressing Room (الدريسنج / الدريسينج / Dressing) ──
  const dressingLineMatch = cleanText.match(/(?:الدريسينج|الدريسنج|دريسينج\s*روم|دريسنج\s*روم|دريسينج|دريسنج|dressing\s*room|dressing|walk-?in\s*closet)\s*[:=\-]?\s*([^\n\r,;:]{2,30})/i);
  if (dressingLineMatch) {
    const rawD = dressingLineMatch[1].trim();
    if (/(?:نعم|يوجد|متوفر|yes)/i.test(rawD)) result.floorText = "يوجد";
    else if (/(?:غرفة\s*دريس|غرفة\s*ملابس)/i.test(rawD)) result.floorText = "غرفة دريسنج";
    else if (/(?:لا|غير\s*متوفر|no)/i.test(rawD)) result.floorText = "لا";
    else result.floorText = rawD;
  } else if (/(?:غرفة\s*دريسينج|غرفة\s*دريسنج|غرفة\s*ملابس|دريسينج\s*روم|دريسنج\s*روم|dressing\s*room|walk-?in\s*closet)/i.test(cleanText)) {
    result.floorText = "غرفة دريسنج";
  } else if (/(?:دريسينج|دريسنج|dressing)/i.test(cleanText)) {
    result.floorText = "يوجد";
  }

  // ── 6. Building Total Floors (عدد طوابق العقار / العمارة) ──
  const buildingFloorsMatch = cleanText.match(/(?:عدد\s*(?:طوابق|أدوار)\s*(?:العقار|العمارة|المبنى|الفيلا)|(?:عمارة|مبنى|فيلا)\s*(?:مكونة\s*من|من))\s*[:=\-]?\s*(\d+)/i) ||
    cleanText.match(/(?:عمارة|مبنى|فيلا)\s*(?:بـ|ب|من)?\s*(\d+)\s*(?:أدوار|طوابق)/i);
  if (buildingFloorsMatch) {
    const parsedFloors = parseInt(buildingFloorsMatch[1], 10);
    if (!isNaN(parsedFloors) && parsedFloors > 0) {
      result.floors = parsedFloors;
    }
  }

  // ── 7. Unit Floor (الدور كـ رقم) ──
  if (/(?:أرضي\s*مرتفع|أرضي|ارضي|ground\s*floor|ground|الدور\s*الأرضي)/i.test(cleanText)) {
    result.floor = 0;
  } else {
    const floorMatch = cleanText.match(/(?:طابق|الطابق|دور|الدور|floor)\s*[:=\-]?\s*(?:الـ|ال)?(\d+|أول\s*علوي|اول\s*علوي|أول|اول|ثاني|تالت|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر|1st|2nd|3rd|4th|5th|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)/i);
    if (floorMatch) {
      const val = floorMatch[1].toLowerCase().replace(/^ال/, "");
      const numMap: Record<string, number> = {
        "1": 1, "1st": 1, "اول": 1, "أول": 1, "أول علوي": 1, "اول علوي": 1,
        "2": 2, "2nd": 2, "ثاني": 2, "تاني": 2,
        "3": 3, "3rd": 3, "تالت": 3, "ثالث": 3,
        "4": 4, "4th": 4, "رابع": 4,
        "5": 5, "5th": 5, "خامس": 5,
        "6": 6, "6th": 6, "سادس": 6,
        "7": 7, "7th": 7, "سابع": 7,
        "8": 8, "8th": 8, "ثامن": 8,
        "9": 9, "9th": 9, "تاسع": 9,
        "10": 10, "10th": 10, "عاشر": 10,
      };
      result.floor = numMap[val] || parseInt(val, 10) || 1;
    }
  }

  // ── 8. الواجهة (Facade / Orientation: أمامي / خلفي / جانبي / بانورامي / ركني) ──
  const facadeLineMatch = cleanText.match(/(?:الواجهة|واجهة|الاتجاه)\s*[:=\-]?\s*([^\n\r,;:]{2,40})/i);
  if (facadeLineMatch) {
    const rawF = facadeLineMatch[1].trim();
    if (/(?:أمامية|امامية|أمامي|front)/i.test(rawF)) result.unitType = "أمامي";
    else if (/(?:خلفي\s*جانبي|جانبي\s*خلفي)/i.test(rawF)) result.unitType = "خلفي جانبي";
    else if (/(?:خلفية|خلفي|back)/i.test(rawF)) result.unitType = "خلفي";
    else if (/(?:بانورامية|بانورامي|panoramic)/i.test(rawF)) result.unitType = "بانورامي";
    else if (/(?:ركني|ناصية|corner)/i.test(rawF)) result.unitType = "ناصية / ركني";
    else if (/(?:جانبية|جانبي|side)/i.test(rawF)) result.unitType = "جانبي";
    else if (/(?:بحرية|بحري|north)/i.test(rawF)) result.unitType = "بحرية";
    else if (!/(?:دور|طابق|أرضي|اول|ثاني|ثالث|رابع)/i.test(rawF)) result.unitType = rawF;
  } else {
    if (/(?:واجهة\s*أمامية|واجهة\s*امامية|شقة\s*أمامية)/i.test(cleanText)) {
      result.unitType = "أمامي";
    } else if (/(?:خلفي\s*جانبي|جانبي\s*خلفي)/i.test(cleanText)) {
      result.unitType = "خلفي جانبي";
    } else if (/(?:واجهة\s*خلفية|شقة\s*خلفية)/i.test(cleanText)) {
      result.unitType = "خلفي";
    } else if (/(?:واجهة\s*بانورامية|فيو\s*بانورامي)/i.test(cleanText)) {
      result.unitType = "بانورامي";
    } else if (/(?:ناصية|شقة\s*ناصية|ركني)/i.test(cleanText)) {
      result.unitType = "ناصية / ركني";
    } else if (/(?:بحرية|بحري|north\s*facing)/i.test(cleanText)) {
      result.unitType = "بحرية";
    }
  }

  // ── 9. الفيو / الإطلالة (View: حديقة / مفتوح / مول / مسبح / نيل / باركينج / شارع رئيسي) ──
  const viewLineMatch = cleanText.match(/(?:الفيو|الفيو\s*على|الإطلالة|إطلالة\s*على|view)\s*[:=\-]?\s*([^\n\r,;:]{2,40})/i);
  if (viewLineMatch) {
    const rawV = viewLineMatch[1].trim();
    if (/(?:حديقة|جنينة|جاردن|garden)/i.test(rawV)) result.view = "فيو حديقة";
    else if (/(?:مفتوح|مفتوحة|open)/i.test(rawV)) result.view = "فيو مفتوح";
    else if (/(?:مول|مركز\s*تجاري|mall)/i.test(rawV)) result.view = "فيو على مول";
    else if (/(?:مسبح|حمام\s*سباحة|pool)/i.test(rawV)) result.view = "فيو مسبح";
    else if (/(?:نيل|النيل|nile)/i.test(rawV)) result.view = "فيو على النيل";
    else if (/(?:باركينج|جراج|parking)/i.test(rawV)) result.view = "فيو باركينج";
    else if (/(?:شارع\s*رئيسي|street)/i.test(rawV)) result.view = "على شارع رئيسي";
    else if (!/(?:دور|طابق|أرضي|اول|ثاني|ثالث|رابع|أمامي|خلفي)/i.test(rawV)) result.view = rawV;
  } else {
    if (/(?:فيو\s*حديقة|فيو\s*جنينة|فيو\s*جاردن|وايد\s*جاردن|إطلالة\s*على\s*حديقة|garden\s*view)/i.test(cleanText)) {
      result.view = "فيو حديقة";
    } else if (/(?:فيو\s*مفتوح|إطلالة\s*مفتوحة|open\s*view)/i.test(cleanText)) {
      result.view = "فيو مفتوح";
    } else if (/(?:فيو\s*على\s*مول|إطلالة\s*على\s*مول)/i.test(cleanText)) {
      result.view = "فيو على مول";
    } else if (/(?:فيو\s*مسبح|فيو\s*حمام\s*سباحة|بول\s*فيو|pool\s*view)/i.test(cleanText)) {
      result.view = "فيو مسبح";
    } else if (/(?:فيو\s*على\s*النيل|إطلالة\s*نيلية|nile\s*view)/i.test(cleanText)) {
      result.view = "فيو على النيل";
    } else if (/(?:فيو\s*باركينج|إطلالة\s*على\s*الجراج)/i.test(cleanText)) {
      result.view = "فيو باركينج";
    } else if (/(?:على\s*شارع\s*رئيسي|إطلالة\s*على\s*الشارع)/i.test(cleanText)) {
      result.view = "على شارع رئيسي";
    }
  }

  // ── 10. Parking & Elevator (جراج / كراج / موقف خاص) ──
  if (/(?:موقف\s*سيارة|موقف\s*خاص|موقف|جراج|الجراج|كراج|الكراج|بارك|باكية|parking|garage)/i.test(cleanText)) {
    result.parking = "يوجد";
  }
  if (/(?:أسانسير|اسانسير|مصعد|المصعد|elevator|lift)/i.test(cleanText)) {
    result.elevator = "نعم";
  }

  // ── 11. Finishing Type ──
  if (/(?:ألترا\s*سوبر\s*لوكس|الترا\s*سوبر\s*لوكس|ultra\s*super\s*lux)/i.test(cleanText)) {
    result.finishing = "ألترا سوبر لوكس";
  } else if (/(?:سوبر\s*لوكس|super\s*lux)/i.test(cleanText)) {
    result.finishing = "سوبر لوكس";
  } else if (/(?:تشطيب\s*كامل|متشطب|تشطيب\s*حديث|fully\s*finished|تشطيب\s*فاخر)/i.test(cleanText)) {
    result.finishing = "تشطيب كامل";
  } else if (/(?:تشطيب\s*75%|75%\s*تشطيب)/i.test(cleanText)) {
    result.finishing = "تشطيب 75%";
  } else if (/(?:تشطيب\s*50%|50%\s*تشطيب|سباكة\s*وكهرباء|سباكه\s*وكهرباء|تأسيس\s*سباكة|جبس\s*بورد|جبسبورد)/i.test(cleanText)) {
    result.finishing = "تشطيب 50%";
  } else if (/(?:نصف\s*تشطيب|نص\s*تشطيب|semi\s*finished)/i.test(cleanText)) {
    result.finishing = "نصف تشطيب";
  } else if (/(?:على\s*المحارة|core\s*&?\s*shell|محارة)/i.test(cleanText)) {
    result.finishing = "على المحارة";
  } else if (/(?:طوب\s*أحمر|طوب\s*احمر|بدون\s*تشطيب)/i.test(cleanText)) {
    result.finishing = "طوب أحمر";
  } else if (/(?:تحت\s*الإنشاء|تحت\s*الانشاء|قيد\s*الإنشاء|under\s*construction)/i.test(cleanText)) {
    result.finishing = "تحت الإنشاء";
  }

  // ── 12. Property Type (Apartment vs Building Isolation) ──
  let explicitTypeFound = false;

  for (const line of lines) {
    if (line.match(/^(?:نوع\s*العقار|نوع\s*الوحدة|الوحدة|العقار)\s*[:=\-]?/i)) {
      const val = line.replace(/^(?:نوع\s*العقار|نوع\s*الوحدة|الوحدة|العقار)\s*[:=\-]?\s*/i, "").trim();
      if (/(?:دوبلكس|دبلكس|duplex)/i.test(val)) {
        result.typeId = "duplex";
        result.category = "residential";
        explicitTypeFound = true;
      } else if (/(?:بنتهاوس|penthouse|روف)/i.test(val)) {
        result.typeId = "penthouse";
        result.category = "residential";
        explicitTypeFound = true;
      } else if (/(?:تاون\s*هاوس|townhouse)/i.test(val)) {
        result.typeId = "townhouse";
        result.category = "residential";
        explicitTypeFound = true;
      } else if (/(?:توين\s*هاوس|twinhouse)/i.test(val)) {
        result.typeId = "twinhouse";
        result.category = "residential";
        explicitTypeFound = true;
      } else if (/(?:فيلا|villa)/i.test(val)) {
        result.typeId = "villa";
        result.category = "residential";
        explicitTypeFound = true;
      } else if (/(?:محل|تجاري|متجر|store|shop)/i.test(val)) {
        result.typeId = "store";
        result.category = "commercial";
        explicitTypeFound = true;
      } else if (/(?:مركز\s*طبي|عيادة|عياده|clinic)/i.test(val)) {
        result.typeId = "clinic";
        result.category = "medical";
        explicitTypeFound = true;
      } else if (/(?:مكتب|مقر\s*إداري|office)/i.test(val)) {
        result.typeId = "office";
        result.category = "administrative";
        explicitTypeFound = true;
      } else if (/(?:عمارة\s*كاملة|عمارة\s*للبيع|عمارة\s*سكنية\s*للبيع)/i.test(val)) {
        result.typeId = "building";
        result.category = "residential";
        explicitTypeFound = true;
      } else if (/(?:شقة|شقه|استوديو|apartment)/i.test(val)) {
        result.typeId = "apartment";
        result.category = "residential";
        explicitTypeFound = true;
      }
      break;
    }
  }

  if (!explicitTypeFound) {
    const firstTwoLines = lines.slice(0, 2).join(" ");
    if (/(?:شقة|شقه|apartment|استوديو|studio)/i.test(firstTwoLines) || /(?:مواصفات\s*الشقة|تتكون\s*الشقة|الشقة\s*فيها|شقة\s*مميزة|شقة\s*للبيع)/i.test(cleanText)) {
      if (/(?:دوبلكس|دبلكس|duplex)/i.test(cleanText)) {
        result.typeId = "duplex";
        result.category = "residential";
      } else if (/(?:بنتهاوس|penthouse|روف)/i.test(cleanText)) {
        result.typeId = "penthouse";
        result.category = "residential";
      } else {
        result.typeId = "apartment";
        result.category = "residential";
      }
    } else if (/(?:فيلا|فيلات|villa)/i.test(cleanText)) {
      result.typeId = "villa";
      result.category = "residential";
    } else if (/(?:تاون\s*هاوس|townhouse)/i.test(cleanText)) {
      result.typeId = "townhouse";
      result.category = "residential";
    } else if (/(?:توين\s*هاوس|twinhouse)/i.test(cleanText)) {
      result.typeId = "twinhouse";
      result.category = "residential";
    } else if (/(?:عمارة\s*كاملة|عمارة\s*للبيع|عمارة\s*سكنية\s*للبيع|بيع\s*عمارة|مبنى\s*للبيع)/i.test(cleanText)) {
      result.typeId = "building";
      result.category = "residential";
    } else if (/(?:محل\s*تجاري|محل\s*للبيع|محل\s*للإيجار|متجر|store|shop)/i.test(cleanText)) {
      result.typeId = "store";
      result.category = "commercial";
    } else if (/(?:مركز\s*طبي|عيادة|عياده|clinic)/i.test(cleanText)) {
      result.typeId = "clinic";
      result.category = "medical";
    } else if (/(?:مكتب\s*إداري|مقر\s*إداري|office)/i.test(cleanText)) {
      result.typeId = "office";
      result.category = "administrative";
    } else {
      result.typeId = "apartment";
      result.category = "residential";
    }

    if (!result.category) {
      if (/(?:مركز\s*طبي|مجمع\s*طبي|عيادة|عياده|clinic|medical|\bطبي\b(?!\s*عي))/i.test(cleanText)) {
        result.category = "medical";
      } else if (/(?:إداري|اداري|مكتب\s*إداري|مقر\s*شركة)/i.test(cleanText)) {
        result.category = "administrative";
      } else if (/(?:محل\s*تجاري|مول\s*تجاري|نشاط\s*تجاري)/i.test(cleanText)) {
        result.category = "commercial";
      } else {
        result.category = "residential";
      }
    }
  }

  // ── 13. Listing Type ──
  if (/(?:مفروش|مفروشة|furnished)/i.test(cleanText)) {
    result.listingType = "furnished";
  } else if (/(?:إيجار|ايجار|للايجار|للإيجار|rent)/i.test(cleanText)) {
    result.listingType = "rent";
  } else {
    result.listingType = "sale";
  }

  // ── 14. Main Region (المنطقة الرئيسية) ──
  if (/(?:مدينة\s*بدر|بدر|badr)/i.test(cleanText)) {
    result.regionId = "badr";
  } else if (/(?:مدينة\s*الشروق|الشروق|شروق|shorouk)/i.test(cleanText)) {
    result.regionId = "shorouk";
  } else if (/(?:مدينتي|madinaty)/i.test(cleanText)) {
    result.regionId = "madinaty";
  } else if (/(?:وصال|wesal)/i.test(cleanText)) {
    result.regionId = "wasal";
  } else if (/(?:بيت\s*الوطن|beit\s*el\s*watan)/i.test(cleanText)) {
    result.regionId = "beit_elwatan";
  } else if (/(?:مدينة\s*نصر|nasr\s*city)/i.test(cleanText)) {
    result.regionId = "nasr_city";
  } else if (/(?:هليوبوليس|new\s*heliopolis)/i.test(cleanText)) {
    result.regionId = "new_heliopolis";
  } else if (/(?:العاصمة\s*الإدارية|العاصمة\s*الادارية|العاصمة|new\s*capital)/i.test(cleanText)) {
    result.regionId = "new_capital";
  } else if (/(?:تجمع|التجمع|new\s*cairo|القاهرة\s*الجديدة)/i.test(cleanText)) {
    result.regionId = "tagamoa";
  }

  // ── 15. Sub-Area (المنطقة الفرعية) ──
  // Check Madinaty block / group
  const madinatyBlockGroupMatch = cleanText.match(/\b(B\d{1,2})\s*(?:G\s*(\d{1,2})|مجموعة\s*(\d{1,2}))\b/i);
  if (madinatyBlockGroupMatch) {
    const block = madinatyBlockGroupMatch[1].toUpperCase();
    const groupNum = madinatyBlockGroupMatch[2] || madinatyBlockGroupMatch[3];
    result.subArea = `${block} مجموعة ${groupNum}`;
    result.regionId = "madinaty";
  }

  // Check explicit subarea lines (e.g. 📍 المنطقة السادسة)
  if (!result.subArea) {
    for (const line of lines) {
      if (/^(?:كود|code|ALM|السعر|price|المساحة|area|اسم|المالك|الموظف)/i.test(line)) continue;
      if (/حديقة|جنينة|بلكونة|غرفة|حمام|مساحة|متر|سعر|كود|دور|طابق|عدادات|جراج|كراج/i.test(line)) continue;

      if (line.match(/(?:المنطقة|المنطقه|الموقع|العنوان|حي|كمبوند)/i) || (line.includes("في") && line.match(/[–\-]/))) {
        const subMatch = line.match(/(?:المنطقة|منطقة|الحي|حي|كمبوند)\s+([ء-يa-zA-Z0-9\s]{2,25})$/i);
        if (subMatch && !/حديقة|جنينة|بلكونة|متر|مساحة/i.test(subMatch[0])) {
          result.subArea = subMatch[0].trim();
          break;
        }
        const sepMatch = line.match(/[–\-]\s*([ء-يa-zA-Z0-9\s]{2,30})$/);
        if (sepMatch && sepMatch[1]) {
          let candidate = sepMatch[1].trim();
          candidate = candidate.replace(/\s+(?:المساحة|السعر|الدور|كود|الموظف|المالك).*$/, "").trim();
          if (candidate.length >= 2 && !/حديقة|جنينة|بلكونة|متر|مساحة/i.test(candidate)) {
            result.subArea = candidate;
            break;
          }
        }
      }
    }
  }

  // Match numbered areas (المنطقة الأولى إلى التاسعة) or neighborhoods
  if (!result.subArea) {
    const numberedAreaMatch = cleanText.match(/(?:المنطقة|المنطقه)\s*(?:الأولى|الاولى|الثانية|التانية|الثالثة|التالتة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|\d+)/i);
    if (numberedAreaMatch) {
      result.subArea = numberedAreaMatch[0].trim();
    }

    const numberedDistrictMatch = cleanText.match(/(?:الحي|حي)\s*(?:الأول|الاول|الثاني|التاني|الثالث|التالت|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|المتميز|العائلي|الجولف|النادي|النخيل|الزهور|الكوثر|الفردوس|الأشجار|البنفسج|الياقوت|غرناطة|\d+)/i);
    if (numberedDistrictMatch && !result.subArea) {
      result.subArea = numberedDistrictMatch[0].trim();
    }

    const neighborhoods = [
      "النرجس الجديدة", "حي النرجس", "منطقة النرجس", "حي اللوتس", "اللوتس الجنوبية", "اللوتس الشمالية",
      "الياسمين", "البنفسج", "الأندلس", "المستثمرين الشمالية", "المستثمرين الجنوبية", "المستثمرين",
      "جنوب الأكاديمية", "شمال الأكاديمية", "المربع الذهبي", "الدبلوماسيين", "الرحاب",
      "مثلث الأمل", "زيزينيا", "القرنفل", "القطامية", "التمر حنة", "المصراوية", "زهراء مدينة نصر",
      "مكرم عبيد", "عباس العقاد", "حدائق العاصمة", "كمبوند النخيل"
    ];
    for (const nh of neighborhoods) {
      if (cleanText.includes(nh)) {
        result.subArea = nh;
        break;
      }
    }
  }

  // ── 16. Location Proximity & Landmarks (الموقع ونقاط الجذب) ──
  for (const line of lines) {
    if (line.match(/(?:الموقع|العنوان|مميزات\s*الموقع)\s*[:=\-]?\s*(?:.*(?:خطوات|بجوار|بجانب|بالقرب|قريب|قرب|سهولة\s*الوصول|على\s*محور|على\s*المحور|على\s*شارع|مقابل|أمام|خلف).*)/i)) {
      const match = line.replace(/^(?:الموقع|العنوان|مميزات\s*الموقع)\s*[:=\-]?\s*/i, "").trim();
      if (match.length >= 4) {
        result.location = match;
        break;
      }
    } else {
      const pMatch = line.match(/(?:أمام|خلف|بجوار|بجانب|خطوات\s*من|بالقرب\s*من|قريب\s*من|قرب|سهولة\s*الوصول\s*إلى|على\s*شارع|على\s*محور|على\s*المحور|إطلالة\s*على|مقابل)\s+([^\n\r,;:]{4,70})/i);
      if (pMatch && !result.location) {
        result.location = pMatch[0].trim();
      }
    }
  }

  // ── 17. Additional Features (المميزات الحقيقية المنفصلة) ──
  if (/(?:مدخل\s*خاص|private\s*entrance)/i.test(cleanText)) addFeaturesList.push("مدخل خاص");
  if (/(?:حديقتين|بحديقتين)/i.test(cleanText)) addFeaturesList.push("حديقة خاصة (أمامية وخلفية)");
  else if (/(?:حديقة\s*أمامية|حديقة\s*خاصة|جنينة\s*خاصة|حديقة\s*خلفية)/i.test(cleanText)) addFeaturesList.push("حديقة خاصة");
  if (/(?:حمام\s*سباحة\s*خاص|مسبح\s*خاص)/i.test(cleanText)) addFeaturesList.push("حمام سباحة خاص");
  if (/(?:عدادات\s*مستقلة|عداد\s*كهرباء|عداد\s*مياه|جميع\s*العدادات)/i.test(cleanText)) addFeaturesList.push("عدادات مستقلة");
  if (/(?:تراس\s*خاص|تراس\s*واسع|روف\s*خاص|بلكونة|بلكونات)/i.test(cleanText)) addFeaturesList.push("تراس وبلكونة");
  if (/(?:أمن\s*وحراسة|حراسة\s*24|أمن\s*24|حارس\s*للعمارة|حارس)/i.test(cleanText)) addFeaturesList.push("أمن وحراسة");
  if (/(?:غاز\s*طبيعي|توصيل\s*الغاز)/i.test(cleanText)) addFeaturesList.push("غاز طبيعي");
  if (/(?:كاميرات\s*مراقبة)/i.test(cleanText)) addFeaturesList.push("كاميرات مراقبة");
  if (/(?:انتركم|إنتركم\s*مرئي)/i.test(cleanText)) addFeaturesList.push("انتركم");
  if (/(?:موقع\s*هادئ|منطقة\s*هادئة)/i.test(cleanText)) addFeaturesList.push("منطقة هادئة");
  if (/(?:قريب\s*من\s*الخدمات|قريب\s*من\s*المواصلات)/i.test(cleanText)) addFeaturesList.push("قريب من الخدمات والمواصلات");
  if (addFeaturesList.length > 0) {
    result.additionalFeatures = Array.from(new Set(addFeaturesList)).join(" · ");
  }

  // ── 18. Source / Owner Name ──
  let hasExplicitOwnerName = false;
  let isAgencySource = false;

  for (const line of lines) {
    if (line.match(/^(?:اسم\s*المالك|المالك|صاحب\s*العقار|المعلن|للتواصل\s*مع|للتواصل)\s*[:=\-]?/i)) {
      let rawName = line.replace(/^(?:اسم\s*المالك|المالك|صاحب\s*العقار|المعلن|للتواصل\s*مع|للتواصل)\s*[:=\-]?\s*/i, "").trim();
      rawName = rawName.replace(/\s+(?:الموظف|المسؤول|رقم|هاتف|تليفون|واتساب|السعر|كود|عمولة).*$/i, "").trim();
      rawName = rawName.replace(/^(?:أ\/|م\/|د\/|أستاذ|استاذ|المهندس|مهندس|دكتور|د\.|السيد|الحاج|كابتن)\s+/i, "").trim();

      if (/(?:شركة|مكتب|تسويق|broker|agency)/i.test(rawName)) {
        isAgencySource = true;
        result.source = rawName;
        break;
      }

      if (rawName.length >= 2) {
        result.source = rawName;
        hasExplicitOwnerName = true;
        break;
      }
    }
  }

  // ── 19. Source Phone Numbers ──
  const phoneMatches = cleanText.match(/(?:(?:\+?20|0020)?\s*(?:0?1[0125][\d\s]{8,12}))/g);
  if (phoneMatches) {
    result.sourcePhones = Array.from(new Set(phoneMatches.map(p => p.replace(/\s+/g, "").replace(/^(\+?20|0020)/, "0"))))
      .filter(p => p.length >= 10 && p.length <= 13);
  }

  // ── 20. Assigned Staff ──
  for (const line of lines) {
    if (line.match(/^(?:اسم\s*الموظف\s*المسؤول|اسم\s*الموظف|الموظف\s*المسؤول|الموظف|مسؤول\s*العقار|مسؤول\s*المبيعات|مبيعات)\s*[:=\-]?/i)) {
      let rawStaff = line.replace(/^(?:اسم\s*الموظف\s*المسؤول|اسم\s*الموظف|الموظف\s*المسؤول|الموظف|مسؤول\s*العقار|مسؤول\s*المبيعات|مبيعات)\s*[:=\-]?\s*/i, "").trim();
      rawStaff = rawStaff.replace(/\s+(?:رقم|هاتف|تليفون|واتساب|السعر|كود|وسيط|بروكر|المالك).*$/i, "").trim();
      if (rawStaff.length >= 2) {
        result.assignedStaffName = rawStaff;
        break;
      }
    }
  }

  // ── 21. Agent Type ──
  if (hasExplicitOwnerName) {
    result.agentType = "direct";
  } else if (isAgencySource) {
    result.agentType = "broker";
  } else {
    const hasBrokerKeyword = lines.some(l => /^(?:وسيط|بروكر|سمسار|شركة\s*تسويق|broker|agent)$/i.test(l)) ||
      /(?:نوع\s*المصدر|المصدر)\s*[:=\-]?\s*(?:وسيط|بروكر)/i.test(cleanText);

    if (hasBrokerKeyword) {
      result.agentType = "broker";
    } else {
      result.agentType = "direct";
    }
  }

  // ── 22. Clean Marketing Description ──
  const cleanDescriptionLines = lines.filter(l => !/^(?:CODE|كود|السعر|price|اسم\s*المالك|رقم\s*المالك|اسم\s*الموظف|الموظف\s*المسؤول)/i.test(l));
  if (cleanDescriptionLines.length > 0) {
    result.description = cleanDescriptionLines.join("\n");
  }

  return result;
}
