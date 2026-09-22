import type { Property, PropertyType, Region } from "@/context/DataContext";
import { toNumericString, formatNumber } from "@/lib/utils";

export type ListingCategory = "all" | "sale" | "rent" | "furnished";
export type PropertySector = "all" | "residential" | "commercial" | "administrative" | "medical";
export type SortOption = "newest" | "priceAsc" | "priceDesc" | "areaDesc";
export type ViewMode = "grid" | "list";
export type FilterCardSize = "compact" | "medium";
export const PROPERTY_VIEW_MODE_KEY = "alamoudi-property-view-mode";
export const PROPERTY_CARD_SIZE_KEY = "alamoudi-property-card-size";

export interface PropertyFilterState {
  searchText: string;
  category: ListingCategory;
  sector: PropertySector;
  regionId: string;
  typeId: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  beds: string;
  baths: string;
  location: string;
  finishing: string;
  floor: string;
  elevator: string;
  parking: string;
  additionalFeatures: string;
  sort: SortOption;
  viewMode: ViewMode;
  cardSize: FilterCardSize;
}

export const DEFAULT_PROPERTY_FILTERS: PropertyFilterState = {
  searchText: "",
  category: "all",
  sector: "all",
  regionId: "",
  typeId: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  beds: "",
  baths: "",
  location: "",
  finishing: "",
  floor: "",
  elevator: "",
  parking: "",
  additionalFeatures: "",
  sort: "newest",
  viewMode: "grid",
  cardSize: "compact",
};

export const SECTOR_OPTIONS: Array<{ value: PropertySector; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "residential", label: "سكني" },
  { value: "commercial", label: "تجاري" },
  { value: "administrative", label: "إداري" },
  { value: "medical", label: "طبي" },
];

export const CATEGORY_OPTIONS: Array<{ value: ListingCategory; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "sale", label: "للبيع" },
  { value: "rent", label: "للإيجار" },
  { value: "furnished", label: "مفروش" },
];

const SECTOR_TYPE_GROUPS: Record<Exclude<PropertySector, "all" | "residential">, string[]> = {
  commercial: ["shop", "restaurant", "cafe"],
  administrative: ["office"],
  medical: ["clinic", "medical_center", "pharmacy"],
};

// ── Normalization & Arabic Linguistics ──────────────────────────────
export const normalise = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const normaliseFinishing = (value: unknown) => normalise(value).replace(/\s+/g, "");
export const numberValue = (value: string) => (value.trim() ? Number(toNumericString(value)) : null);

export function normalizeArabicSearch(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    // Strip Arabic diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Strip Tatweel (kashida)
    .replace(/\u0640/g, "")
    // Normalize Alef variants
    .replace(/[إأآٱ]/g, "ا")
    // Normalize Taa Marbuta to Haa
    .replace(/ة/g, "ه")
    // Normalize Alif Maqsura to Yaa
    .replace(/ى/g, "ي")
    // Normalize Hamza forms
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // Normalize Arabic-Indic digits to standard western digits (0-9)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    // Remove unwanted punctuation but preserve spaces
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟?«»"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const normaliseArabic = normalizeArabicSearch;

// ── Egyptian Real Estate Synonyms & Equivalencies ──────────────────
export const REAL_ESTATE_SYNONYMS: Record<string, string[]> = {
  // Types
  "شقه": ["شقه", "شقة", "شقق", "استوديو", "استديو", "فلات", "apartment", "flat", "studio"],
  "شقق": ["شقه", "شقة", "شقق", "استوديو", "استديو", "apartment", "flat"],
  "فيلا": ["فيلا", "فلل", "فيلات", "قصر", "قصور", "villa", "mansion", "palace"],
  "فلل": ["فيلا", "فلل", "فيلات", "قصر", "قصور", "villa"],
  "دوبلكس": ["دوبلكس", "دوبلكسات", "duplex"],
  "دوبلكسات": ["دوبلكس", "دوبلكسات", "duplex"],
  "بنتهاوس": ["بنتهاوس", "بنت هاوس", "روف", "سطح", "penthouse", "roof"],
  "روف": ["بنتهاوس", "بنت هاوس", "روف", "سطح", "penthouse", "roof"],
  "تاون هاوس": ["تاون هاوس", "تاون", "توين هاوس", "townhouse", "town house"],
  "توين هاوس": ["توين هاوس", "توين", "تاون هاوس", "twinhouse", "twin house"],
  "محل": ["محل", "محلات", "متجر", "تجاري", "مطعم", "كافيه", "shop", "store", "commercial"],
  "محلات": ["محل", "محلات", "متجر", "تجاري", "shop", "commercial"],
  "عياده": ["عياده", "عيادة", "عيادات", "طبي", "مركز طبي", "صيدليه", "clinic", "medical"],
  "عيادات": ["عياده", "عيادة", "عيادات", "طبي", "clinic", "medical"],
  "مكتب": ["مكتب", "مكاتب", "اداري", "شركه", "مقر اداري", "office", "administrative"],
  "مكاتب": ["مكتب", "مكاتب", "اداري", "office", "administrative"],
  "عماره": ["عماره", "عمارة", "عمارات", "مبني", "مبنى", "building"],
  "عمارات": ["عماره", "عمارة", "عمارات", "مبني", "مبنى", "building"],
  "ارض": ["ارض", "اراضي", "قطعه ارض", "land"],
  "اراضي": ["ارض", "اراضي", "قطعه ارض", "land"],
  "شاليه": ["شاليه", "شاليهات", "مصيف", "chalet"],

  // Listing / Deal Types
  "بيع": ["بيع", "للبيع", "شراء", "تمليك", "كاش", "تقسيط", "sale", "buy"],
  "للبيع": ["بيع", "للبيع", "شراء", "تمليك", "كاش", "تقسيط", "sale", "buy"],
  "تمليك": ["بيع", "للبيع", "شراء", "تمليك", "sale"],
  "ايجار": ["ايجار", "للايجار", "للإيجار", "تأجير", "تاجير", "اجار", "rent", "lease"],
  "للايجار": ["ايجار", "للايجار", "للإيجار", "تأجير", "تاجير", "اجار", "rent", "lease"],
  "مفروش": ["مفروش", "مفروشه", "مفروشة", "اثاث", "مؤثث", "فرش", "furnished"],
  "مفروشه": ["مفروش", "مفروشه", "مفروشة", "اثاث", "مؤثث", "فرش", "furnished"],

  // Finishing
  "الترا سوبر لوكس": ["الترا سوبر لوكس", "الترا", "سوبر لوكس", "الترا لوكس", "هاي لوكس", "التراسوبرلوكس", "ultra super lux", "ultra"],
  "سوبر لوكس": ["سوبر لوكس", "سوبرلوكس", "لوكس", "تشطيب كامل", "super lux", "lux"],
  "لوكس": ["لوكس", "تشطيب لوكس", "تشطيب عادي", "lux"],
  "نص تشطيب": ["نص تشطيب", "نصف تشطيب", "محاره وحلوق", "نص", "semi finished"],
  "طوب احمر": ["طوب احمر", "طوب", "بدون تشطيب", "على المحارة", "ع المحاره", "red brick"],

  // Rooms / Beds
  "غرفه": ["غرفه", "غرفة", "اوضه", "اوضة", "استوديو", "غرفه واحده", "1 غرفه", "1غرفه", "1 غرف"],
  "غرفتين": ["غرفتين", "اوضتين", "2 غرف", "2غرف", "2 اوض", "غرفتان", "اثنين غرف"],
  "3 غرف": ["3 غرف", "3غرف", "ثلاث غرف", "ثلاثه غرف", "3 اوض", "3اوض"],
  "4 غرف": ["4 غرف", "4غرف", "اربع غرف", "اربعه غرف", "4 اوض", "4اوض"],
  "5 غرف": ["5 غرف", "5غرف", "خمس غرف", "خمسه غرف", "5 اوض", "5اوض"],

  // Features & Amenities
  "مسبح": ["مسبح", "حمام سباحه", "حمام سباحة", "بسين", "pool", "swimming pool"],
  "حمام سباحه": ["مسبح", "حمام سباحه", "حمام سباحة", "بسين", "pool", "swimming pool"],
  "حديقه": ["حديقه", "حديقة", "جاردن", "garden"],
  "اسانسير": ["اسانسير", "أسانسير", "مصعد", "elevator", "lift"],
  "مصعد": ["اسانسير", "أسانسير", "مصعد", "elevator", "lift"],
  "جراج": ["جراج", "موقف", "باركينج", "باكيه", "موقف سيارات", "موقف سيارة", "parking", "garage"],
  "موقف": ["جراج", "موقف", "باركينج", "باكيه", "موقف سيارات", "parking", "garage"],
  "باركينج": ["جراج", "موقف", "باركينج", "باكيه", "موقف سيارات", "parking", "garage"],
  "امن": ["امن", "أمن", "حراسه", "حراسة", "كاميرات مراقبه", "security", "guard"],
  "جيم": ["جيم", "نادي صحي", "gym", "fitness"],
  "اطلاله": ["بلكونه", "تراس", "شرفه", "فيو", "اطلاله", "اطلالة", "فيو مفتوح", "بانوراما", "بانوراميه", "بانورامية", "بحري", "بحريه", "واجهه", "امامي", "أمامي"],

  // Major Regions & Cities
  "التجمع": ["التجمع", "التجمع الخامس", "القاهره الجديده", "القاهرة الجديدة", "تجمع", "اللوتس", "النرجس", "الياسمين", "البنفسج", "الاندلس", "الرحاب"],
  "التجمع الخامس": ["التجمع", "التجمع الخامس", "القاهره الجديده", "القاهرة الجديدة", "تجمع"],
  "القاهره الجديده": ["التجمع", "التجمع الخامس", "القاهره الجديده", "القاهرة الجديدة", "تجمع"],
  "الشروق": ["الشروق", "مدينه الشروق", "مدينة الشروق", "شروق"],
  "بدر": ["بدر", "مدينه بدر", "مدينة بدر"],
  "مدينتي": ["مدينتي", "مدينتي"],
  "وصال": ["وصال", "كمبوند وصال", "كمباوند وصال"],
  "بيت الوطن": ["بيت الوطن", "بيت وطن"],
  "مدينه نصر": ["مدينه نصر", "مدينة نصر", "نصر"],
  "هليوبوليس": ["هليوبوليس", "هليوبوليس الجديده", "هليوبوليس الجديدة"],
  "العاصمة الإدارية": ["العاصمة الإدارية", "العاصمه الاداريه", "العاصمة الادارية", "العاصمة", "العاصمه", "new capital"],
};

// Words to treat as descriptive qualifiers/soft words (do not break matching if omitted from listing)
export const SEARCH_STOP_WORDS = new Set([
  "في", "من", "على", "عن", "الى", "الي", "مع", "بـ", "ب", "و", "او", "يا", "هو", "هي", "ذات", "ذو", "كل", "جميع",
  "تشطيب", "موقع", "بموقع", "متميز", "مميز", "راقي", "فاخر", "استثماري", "خاص", "خاصه", "خاصة", "مستقلة", "مستقله",
  "استلام", "فوري", "كمبوند", "بانورامية", "بانوراميه", "اطلالة", "اطلاله", "بإطلالة", "باطلالة", "عقار", "عقارات", "وحدة", "وحدات",
  "دور", "الدور", "مساحة", "مساحه", "سعر", "مدينة", "مدينه", "حي", "الحي", "منطقة", "منطقه", "شارع"
]);

export function getSynonymsForTerm(rawTerm: string): string[] {
  const norm = normalizeArabicSearch(rawTerm);
  if (!norm) return [];
  const set = new Set<string>([norm]);

  // Check direct synonym keys
  for (const [key, list] of Object.entries(REAL_ESTATE_SYNONYMS)) {
    const normKey = normalizeArabicSearch(key);
    const normList = list.map(normalizeArabicSearch);
    if (norm === normKey || normList.includes(norm) || norm.includes(normKey) || normKey.includes(norm)) {
      normList.forEach((s) => set.add(s));
    }
  }

  // Also strip leading 'ال' or add 'ال'
  if (norm.startsWith("ال") && norm.length > 3) {
    set.add(norm.slice(2));
  } else if (!norm.startsWith("ال") && norm.length >= 3) {
    set.add("ال" + norm);
  }

  return [...set].filter(Boolean);
}

export function buildPropertySearchHaystack(
  property: Property,
  regionName?: string,
  typeName?: string
): string {
  if (!property) return "";
  try {
    const code = property.code || "";
    const title = property.title || "";
    const desc = property.description || "";
    const location = property.location || "";
    const subArea = property.subArea || "";
    const view = property.view || "";
    const unitType = property.unitType || "";
    const layout = property.layout || "";
    const master = property.master || "";
    const finishing = property.finishing || "";
    const parking = property.parking || "";
    const elevator = property.elevator || "";
    const features = property.additionalFeatures || "";

    // Category labels & synonyms
    const category = property.category || "";
    const categoryLabel = category === "residential" ? "سكني"
      : category === "commercial" ? "تجاري"
      : category === "administrative" ? "إداري"
      : category === "medical" ? "طبي" : "";

    // Listing type labels & synonyms
    const listingType = property.listingType || "";
    const listingLabel = listingType === "sale" ? "للبيع بيع تمليك شراء"
      : listingType === "rent" ? "للإيجار للايجار ايجار تأجير"
      : listingType === "furnished" ? "مفروش مفروشة للايجار المفروش" : "";

    // Bedrooms representations
    const beds = Number(property.beds) || 0;
    const bedsVariants = beds > 0 ? [
      `${beds}`,
      `${beds} غرف`,
      `${beds}غرف`,
      `${beds} اوض`,
      beds === 1 ? "غرفة استوديو اوضة" : "",
      beds === 2 ? "غرفتين اوضتين غرفتان" : "",
      beds === 3 ? "ثلاث غرف ثلاثة غرف" : "",
      beds === 4 ? "أربع غرف اربعة غرف" : "",
      beds === 5 ? "خمس غرف خمسة غرف" : "",
    ].filter(Boolean).join(" ") : "";

    // Baths representations
    const baths = Number(property.baths) || 0;
    const bathsVariants = baths > 0 ? `${baths} حمام ${baths} حمامات` : "";

    // Area representations
    const area = Number(property.area) || 0;
    const areaVariants = area > 0 ? `${area} ${area}م ${area} متر ${area}متر` : "";

    // Floor representations
    const floor = property.floor !== undefined && property.floor !== null ? `الدور ${property.floor} ${property.floor}` : "";
    const floorText = property.floorText || "";

    // Region synonyms
    const rName = regionName || "";
    const rSynonyms = getSynonymsForTerm(rName).join(" ");

    // Type synonyms
    const tName = typeName || "";
    const tSynonyms = getSynonymsForTerm(tName).join(" ");

    // Price representations
    let priceVariants = "";
    if (property.price) {
      try {
        priceVariants = `${property.price} ${formatNumber(property.price)}`;
      } catch {
        priceVariants = `${property.price}`;
      }
    }

    return [
      code,
      title,
      desc,
      location,
      subArea,
      view,
      unitType,
      layout,
      master,
      finishing,
      parking,
      elevator,
      features,
      category,
      categoryLabel,
      listingType,
      listingLabel,
      bedsVariants,
      bathsVariants,
      areaVariants,
      floor,
      floorText,
      rName,
      rSynonyms,
      tName,
      tSynonyms,
      priceVariants,
    ].join(" ");
  } catch (err) {
    console.warn("buildPropertySearchHaystack error:", err);
    return `${property.code || ""} ${property.title || ""} ${property.description || ""}`;
  }
}

export function matchesSmartPropertySearch(
  property: Property,
  searchQuery: string,
  regionName?: string,
  typeName?: string
): boolean {
  if (!property) return false;
  const trimmed = String(searchQuery ?? "").trim();
  if (!trimmed) return true;

  try {
    // 1. Exact or prefix code match (case-insensitive)
    const normQuery = normalizeArabicSearch(trimmed);
    const codeRaw = String(property.code || "").trim().toLowerCase();
    const cleanCodeQuery = trimmed.toLowerCase().replace(/\s+/g, "");
    if (cleanCodeQuery && (codeRaw === cleanCodeQuery || codeRaw.startsWith(cleanCodeQuery))) {
      return true;
    }

    // 2. Build full haystack
    const rawHaystack = buildPropertySearchHaystack(property, regionName, typeName);
    const normHaystack = normalizeArabicSearch(rawHaystack);

    // Fast path: if unbroken normalized query is in haystack
    if (normHaystack.includes(normQuery)) {
      return true;
    }

    // 3. Extract query tokens
    const rawTokens = normQuery.split(" ").filter(Boolean);
    if (rawTokens.length === 0) return true;

    // Detect compound phrase concepts first (e.g., "الترا سوبر لوكس", "سوبر لوكس", "مدينة نصر", "بيت الوطن", "كمبوند وصال", "3 غرف")
    const compoundCandidates = [
      "الترا سوبر لوكس",
      "سوبر لوكس",
      "نص تشطيب",
      "طوب احمر",
      "مدينة نصر",
      "بيت الوطن",
      "كمبوند وصال",
      "القاهرة الجديدة",
      "التجمع الخامس",
      "تاون هاوس",
      "توين هاوس",
      "حمام سباحة",
      "3 غرف",
      "4 غرف",
      "5 غرف",
      "2 غرف",
    ].map(normalizeArabicSearch);

    const matchedCompoundTerms = new Set<string>();
    let workingQuery = normQuery;

    for (const compound of compoundCandidates) {
      if (workingQuery.includes(compound)) {
        matchedCompoundTerms.add(compound);
        workingQuery = workingQuery.replace(compound, " ");
      }
    }

    const remainingTokens = workingQuery.split(" ").filter(Boolean);
    const allTokens = [...matchedCompoundTerms, ...remainingTokens];

    // Separate core tokens from stop words / qualifiers
    const coreTokens = allTokens.filter((token) => !SEARCH_STOP_WORDS.has(token));
    const tokensToMatch = coreTokens.length > 0 ? coreTokens : allTokens;

    // 4. Verify that each concept/token is satisfied in the property haystack
    return tokensToMatch.every((token) => {
      // Check direct substring
      if (normHaystack.includes(token)) return true;

      // Try without leading 'ال'
      if (token.startsWith("ال") && token.length > 3) {
        const withoutAl = token.slice(2);
        if (normHaystack.includes(withoutAl)) return true;
      }

      // Try with leading 'ال'
      if (!token.startsWith("ال") && token.length >= 3) {
        const withAl = "ال" + token;
        if (normHaystack.includes(withAl)) return true;
      }

      // Strip leading 'و' or 'ب' prefix if remainder is valid word (e.g., 'بحديقة' -> 'حديقة', 'ومسبح' -> 'مسبح')
      if ((token.startsWith("و") || token.startsWith("ب")) && token.length > 3) {
        const rootWord = token.slice(1);
        if (normHaystack.includes(rootWord)) return true;
        if (getSynonymsForTerm(rootWord).some((syn) => normHaystack.includes(syn))) return true;
      }

      // Check all expanded synonyms
      const synonyms = getSynonymsForTerm(token);
      return synonyms.some((synonym) => normHaystack.includes(synonym));
    });
  } catch (err) {
    console.warn("matchesSmartPropertySearch error:", err);
    return true;
  }
}

function featureTerms(query: string): string[] {
  const value = normalizeArabicSearch(query);
  const terms = new Set([value]);
  for (const [key, synonyms] of Object.entries(REAL_ESTATE_SYNONYMS)) {
    if (value.includes(normalizeArabicSearch(key)) || synonyms.some((term) => value.includes(normalizeArabicSearch(term)))) {
      synonyms.forEach((term) => terms.add(normalizeArabicSearch(term)));
    }
  }
  return [...terms].filter(Boolean);
}

function matchesFeatureQuery(property: Property, query: string): boolean {
  const terms = featureTerms(query);
  const text = normalizeArabicSearch([
    property.description,
    property.title,
    property.location,
    property.subArea,
    property.view,
    property.unitType,
    property.layout,
    property.master,
    property.finishing,
    property.parking,
    property.additionalFeatures,
  ].join(" "));
  const negativeMarkers = ["لا يوجد", "بدون", "غير متوفر", "لايتوفر", "منغير"];
  return terms.some((term) => {
    const index = text.indexOf(term);
    if (index < 0) return false;
    const nearby = text.slice(Math.max(0, index - 18), index);
    return !negativeMarkers.some((marker) => nearby.includes(marker));
  });
}

function matchesParking(property: Property, requested: string): boolean {
  const value = normalizeArabicSearch(property.parking);
  const wanted = normalizeArabicSearch(requested);
  if (!wanted) return true;
  if (wanted === "يوجد" || wanted === "نعم") {
    return Boolean(value) && !["لا", "لايوجد", "بدون", "غيرمتوفر"].some((word) => value.includes(word));
  }
  if (wanted === "لايوجد" || wanted === "لا" || wanted === "بدون") {
    return !value || ["لا", "لايوجد", "بدون", "غيرمتوفر"].some((word) => value.includes(word));
  }
  return value.includes(wanted);
}

function matchesSector(property: Property, sector: PropertySector): boolean {
  if (sector === "all") return true;
  if (property.category === sector) return true;
  if (sector === "residential") {
    if (property.category === "residential" || !property.category) return true;
    return !Object.values(SECTOR_TYPE_GROUPS).some((ids) => ids.includes(property.typeId));
  }
  return SECTOR_TYPE_GROUPS[sector]?.includes(property.typeId) || property.category === sector;
}

export function filterProperties(
  properties: Property[],
  filters: PropertyFilterState,
  regions: Region[],
  propertyTypes: PropertyType[],
): Property[] {
  const q = normalise(filters.searchText);
  const minPrice = numberValue(filters.minPrice);
  const maxPrice = numberValue(filters.maxPrice);
  const minArea = numberValue(filters.minArea);
  const maxArea = numberValue(filters.maxArea);
  const beds = numberValue(filters.beds);
  const baths = numberValue(filters.baths);
  const typeNames = new Map(propertyTypes.map((type) => [type.id, type.name]));
  const regionNames = new Map(regions.map((region) => [region.id, region.name]));

  const filtered = properties.filter((property) => {
    if (filters.regionId && property.regionId !== filters.regionId) return false;
    if (filters.category !== "all") {
      const isMatch = property.listingType === filters.category || property.category === (filters.category as any);
      if (!isMatch) return false;
    }
    if (!matchesSector(property, filters.sector)) return false;
    if (filters.typeId && property.typeId !== filters.typeId) return false;
    if (minPrice !== null && property.price < minPrice) return false;
    if (maxPrice !== null && property.price > maxPrice) return false;
    if (minArea !== null && property.area < minArea) return false;
    if (maxArea !== null && property.area > maxArea) return false;
    if (beds !== null && property.beds < beds) return false;
    if (baths !== null && property.baths < baths) return false;
    if (filters.finishing && normaliseFinishing(property.finishing) !== normaliseFinishing(filters.finishing)) return false;
    if (filters.floor && ![String(property.floor), property.floorText ?? ""].some((value) => normalise(value).includes(normalise(filters.floor)))) return false;
    if (filters.elevator && normalise(property.elevator) !== normalise(filters.elevator)) return false;
    if (filters.parking && !matchesParking(property, filters.parking)) return false;
    if (filters.additionalFeatures && !matchesFeatureQuery(property, filters.additionalFeatures)) return false;
    if (filters.location) {
      const location = normalise(filters.location);
      const searchableLocation = normalise([property.location, property.subArea, property.view].join(" "));
      if (!searchableLocation.includes(location)) return false;
    }
    if (filters.searchText.trim()) {
      const regionName = regionNames.get(property.regionId);
      const typeName = typeNames.get(property.typeId);
      if (!matchesSmartPropertySearch(property, filters.searchText, regionName, typeName)) {
        return false;
      }
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "priceAsc") return a.price - b.price;
    if (filters.sort === "priceDesc") return b.price - a.price;
    if (filters.sort === "areaDesc") return b.area - a.area;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

export function hasActivePropertyFilters(filters: PropertyFilterState): boolean {
  return Boolean(
    filters.searchText.trim() ||
    filters.regionId ||
    filters.typeId ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minArea ||
    filters.maxArea ||
    filters.beds ||
    filters.baths ||
    filters.location ||
    filters.finishing ||
    filters.floor ||
    filters.elevator ||
    filters.parking ||
    filters.additionalFeatures ||
    filters.category !== "all" ||
    filters.sector !== "all",
  );
}