import * as XLSX from "xlsx";
import type { PropertyCategory, PropertyStatus } from "@/context/DataContext";

export interface ParsedProperty {
  code: string;
  title: string;
  description: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  floors: number;
  floor: number;
  finishing: string;
  view: string;
  typeId: string;
  regionId: string;
  category: PropertyCategory;
  status: PropertyStatus;
  featured: boolean;
  agentType: "direct" | "broker";
  images: string[];
  videoUrl: string;
  externalUrl: string;
  mapsUrl: string;
  unitType?: string;
  subArea?: string;
  layout?: string;
  master?: string;
  elevator?: string;
  parking?: string;
  additionalFeatures?: string;
  floorText?: string;
  location?: string;
  source?: string;
}

export interface ParseResult {
  items: ParsedProperty[];
  sheets: { name: string; count: number }[];
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function arabicToWestern(input: string): string {
  return String(input ?? "")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/٬/g, "");
}

export function cleanCell(v: unknown): string {
  const s = String(v ?? "").trim();
  if (s === "—" || s === "-" || s === "–" || s === "_") return "";
  return s;
}

export function parseArea(raw: unknown): number {
  const s = arabicToWestern(cleanCell(raw));
  const m = s.match(/[\d.]+/);
  return m ? Math.round(parseFloat(m[0])) : 0;
}

export function parsePrice(raw: unknown): number {
  const cleaned = arabicToWestern(cleanCell(raw)).replace(/[,،]/g, "").trim();
  if (!cleaned) return 0;
  const segment = cleaned.split(/[|\n]/)[0];
  let total = 0;
  let hasUnit = false;
  for (const m of segment.matchAll(/([\d.]+)\s*مليون/g)) {
    const v = parseFloat(m[1]);
    if (!Number.isNaN(v)) { total += v * 1_000_000; hasUnit = true; }
  }
  for (const m of segment.matchAll(/([\d.]+)\s*(?:ألف|الف)/g)) {
    const v = parseFloat(m[1]);
    if (!Number.isNaN(v)) { total += v * 1000; hasUnit = true; }
  }
  if (hasUnit) return Math.round(total);
  const m = segment.match(/[\d.]+/);
  if (!m) return 0;
  let token = m[0];
  if (/^\d{1,3}(\.\d{3})+$/.test(token)) token = token.replace(/\./g, "");
  const num = parseFloat(token);
  return Number.isNaN(num) ? 0 : Math.round(num);
}

export function parseLayout(raw: unknown): { beds: number; baths: number } {
  const s = arabicToWestern(cleanCell(raw));
  const bedsM = s.match(/(\d+)\s*غر/);
  const bathsM = s.match(/(\d+)\s*حمام/);
  return {
    beds: bedsM ? parseInt(bedsM[1], 10) : 0,
    baths: bathsM ? parseInt(bathsM[1], 10) : 0,
  };
}

function parseFloorNumber(raw: unknown): number {
  const s = arabicToWestern(cleanCell(raw));
  if (/أرضي|ارضي/.test(s)) return 0;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function sourceToAgentType(source: string): "direct" | "broker" {
  const s = source.trim().toLowerCase();
  if (!s) return "direct";
  if (/(مباشر|مالك|صاحب|direct|owner)/.test(s)) return "direct";
  if (/(بروكر|سمسار|وسيط|مكتب|شركة|broker|agent|agency|office)/.test(s)) return "broker";
  return "direct";
}

interface SheetMeta {
  regionId: string;
  regionName: string;
  category: PropertyCategory;
}

// Known region patterns — ordered by specificity (longest/most-specific first).
// Compounds that belong inside a city come AFTER the city so the city wins when both appear.
const REGION_PATTERNS: Array<{ pattern: RegExp; id: string; name: string }> = [
  { pattern: /عاصمة|العاصمة الإدارية|new.?capital/i, id: "new_capital",   name: "العاصمة الإدارية الجديدة" },
  { pattern: /بيت الوطن|beit.?el.?watan/i,            id: "beit_elwatan", name: "بيت الوطن" },
  { pattern: /مدينتي|madinaty/i,                       id: "madinaty",     name: "مدينتي" },
  { pattern: /شروق|shorouk/i,                          id: "shorouk",      name: "مدينة الشروق" },
  { pattern: /بدر|badr/i,                              id: "badr",         name: "مدينة بدر" },
  { pattern: /نصر|nasr/i,                              id: "nasr_city",    name: "مدينة نصر" },
  { pattern: /رحاب|rehab/i,                            id: "rehab",        name: "مدينة الرحاب" },
  { pattern: /تجمع|tagamoa/i,                          id: "tagamoa",      name: "التجمع الخامس" },
  { pattern: /زايد|sheikh.?zayed/i,                    id: "sheikh_zayed", name: "الشيخ زايد" },
  { pattern: /أكتوبر|اكتوبر|oct/i,                    id: "oct6",         name: "مدينة 6 أكتوبر" },
  { pattern: /مهندسين|mohandeseen/i,                   id: "mohandeseen",  name: "المهندسين" },
  // Compounds come last — if the sheet also contains a city name the city wins above.
  { pattern: /وصال|wasal/i,                            id: "wasal",        name: "كمباوند وصال" },
];

export function sheetMeta(sheetName: string): SheetMeta {
  const n = sheetName;
  let regionId = "";
  let regionName = "";

  for (const { pattern, id, name } of REGION_PATTERNS) {
    if (pattern.test(n)) { regionId = id; regionName = name; break; }
  }
  if (!regionId) {
    regionId = n.trim().replace(/\s*\(.*\)\s*/, "").replace(/\s+/g, "_") || "other";
    regionName = n.replace(/\s*\(.*\)\s*/, "").trim();
  }

  let category: PropertyCategory = "sale";
  if (/إيجار|ايجار/.test(n)) category = "rent";
  else if (/مفروش/.test(n)) category = "furnished";
  else if (/بيع/.test(n)) category = "sale";

  return { regionId, regionName, category };
}

/** Fuzzy-match a free-text region name against a list of known regions.
 *  Returns the matching regionId, or "" if nothing is found. */
export function resolveRegionId(raw: string, regions: RegionLite[]): string {
  if (!raw.trim()) return "";

  // 1. Exact match on registered region name
  const exact = regions.find(r => r.name.trim() === raw.trim());
  if (exact) return exact.id;

  // 2. Contains match (region name contains query or vice-versa)
  const lower = raw.trim();
  const contains = regions.find(r =>
    r.name.includes(lower) || lower.includes(r.name.trim()),
  );
  if (contains) return contains.id;

  // 3. Pattern match against our known list
  for (const { pattern, id } of REGION_PATTERNS) {
    if (pattern.test(raw)) return id;
  }

  return "";
}

// ─── Smart header mapping ───────────────────────────────────────────
// Normalise: strip diacritics, spaces, convert to lowercase.
function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Arabic diacritics
    .replace(/\s+/g, "")
    .toLowerCase();
}

// All valid aliases per internal field name (normalised).
const FIELD_ALIASES: Record<string, string[]> = {
  // Facade / Orientation (الواجهة / اتجاه الوحدة)
  unitType:  ["الواجهة", "واجهة", "اتجاه_الوحدة", "اتجاهالوحدة", "اتجاه", "نوع_الواجهة", "facade", "orientation", "unittype"],
  // Property Type (نوع العقار)
  propertyType: ["النوع", "نوع العقار", "نوع_العقار", "نوع_الوحدة", "نوعالوحدة", "فئة_العقار", "type", "propertytype"],
  code:      ["الكود", "كود", "رقم الوحدة", "رقم_الوحدة", "code", "رقم"],
  subArea:   ["المنطقة", "المنطقة الفرعية", "منطقة_فرعية", "المنطقةالفرعية", "subarea", "حي", "الحي"],
  area:      ["المساحة", "مساحة", "area", "م2", "م²"],
  floor:     ["الدور", "دور", "floor", "الطابق", "طابق", "رقم_الدور", "رقم الدور"],
  floorText: ["الدريسنج", "دريسنج", "غرفة_ملابس", "غرفة ملابس", "غرفةالملابس", "dressing", "floortext"],
  floors:    ["عدد طوابق العقار", "عدد_طوابق_العقار", "عدد الطوابق", "عدد_الطوابق", "عدد طوابق العمارة", "طوابق", "floors"],
  layout:    ["التوزيع", "توزيع", "layout", "الغرف", "غرف"],
  master:    ["ماستر", "ماستر روم", "ماستر_روم", "غرفة_ماستر", "غرفة ماستر", "master", "masterroom"],
  finishing: ["التشطيب", "تشطيب", "finishing"],
  elevator:  ["أسانسير", "اسانسير", "مصعد", "elevator", "lift"],
  parking:   ["موقف سيارة", "موقف سيارات", "موقف_سيارة", "جراج", "باركينج", "parking", "garage"],
  additionalFeatures: ["مميزات إضافية", "المميزات الإضافية", "مميزات_إضافية", "المميزات_الإضافية", "additional features", "additionalfeatures", "features"],
  view:      ["الفيو", "فيو", "الإطلالة", "إطلالة", "view"],
  price:     ["السعر", "سعر", "price"],
  source:    ["المصدر", "مصدر", "source"],
  location:  ["الموقع", "موقع", "location"],
  listingType: ["نوع_العقد", "نوع العقد", "listingtype", "contracttype"],
  images:    ["الصور", "صور", "روابط_الصور", "روابط الصور", "images", "photos"],
  // Extended CSV fields
  title:      ["العنوان", "عنوان", "title"],
  description:["الوصف", "وصف", "description"],
  regionName: ["المنطقة_الرئيسية", "منطقة", "region", "المنطقةالرئيسية"],
  category:   ["الفئة", "فئة", "category"],
  status:     ["الحالة", "حالة", "status"],
  beds:       ["غرف_النوم", "غرفالنوم", "الغرف", "beds", "غرف"],
  baths:      ["الحمامات", "حمامات", "baths"],
  featured:   ["مميز", "مُميز", "featured"],
  agentType:  ["نوع_العرض", "نوعالعرض", "agenttype"],
  videoUrl:   ["رابط_الفيديو", "الفيديو", "رابطالفيديو", "videourl", "tiktok"],
  mapsUrl:    ["رابط_الخريطة", "الخريطة", "رابطالخريطة", "mapsurl"],
  externalUrl:["رابط_خارجي", "رابطخارجي", "externalurl"],
};

// Build reverse lookup: normalised alias → internal field name
const ALIAS_TO_FIELD: Map<string, string> = new Map();
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_FIELD.set(normalizeHeader(alias), field);
  }
}

function mapHeader(raw: string): string | undefined {
  return ALIAS_TO_FIELD.get(normalizeHeader(raw));
}

// Universal Image Parser for CSV/JSON
export function parseImagesList(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
  }
  return trimmed
    .split(/[\n,;]+/)
    .map(s => s.trim().replace(/^['"]+|['"]+$/g, ""))
    .filter(s => s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image/"));
}

export const KNOWN_PROPERTY_TYPES = new Set([
  "شقة", "فيلا", "دوبلكس", "تاون هاوس", "تاونهاوس", "بنتهاوس", "روف", "شاليه", "محل", "مكتب", "إداري", "تجاري", "عمارة", "أرض", "استوديو",
  "apartment", "villa", "duplex", "townhouse", "penthouse", "roof", "chalet", "commercial", "office", "administrative", "building", "land", "studio"
]);

export function sanitizeDressing(raw: string, floorNum?: number): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // If it's a pure number identical to the floor number or simply a floor digit, it's a floor number not a dressing!
  if (/^\d+$/.test(arabicToWestern(trimmed))) {
    const n = parseInt(arabicToWestern(trimmed), 10);
    if (floorNum === undefined || n === floorNum || n <= 20) return "";
  }
  return trimmed;
}

// ─── Excel sheet parsing ──────────────────────────────────────────
const HEADER_FIELD: Record<string, string> = {
  "النوع": "propertyType",
  "نوع العقار": "propertyType",
  "الواجهة": "unitType",
  "واجهة": "unitType",
  "الكود": "code",
  "المنطقة": "subArea",
  "المساحة": "area",
  "الدور": "floor",
  "الدريسنج": "floorText",
  "غرفة ملابس": "floorText",
  "عدد طوابق العقار": "floors",
  "عدد الطوابق": "floors",
  "التوزيع": "layout",
  "ماستر": "master",
  "ماستر روم": "master",
  "التشطيب": "finishing",
  "أسانسير": "elevator",
  "اسانسير": "elevator",
  "مصعد": "elevator",
  "موقف سيارة": "parking",
  "موقف سيارات": "parking",
  "جراج": "parking",
  "باركينج": "parking",
  "مميزات إضافية": "additionalFeatures",
  "المميزات الإضافية": "additionalFeatures",
  "الفيو": "view",
  "السعر": "price",
  "المصدر": "source",
  "الموقع": "location",
  "نوع_العقد": "listingType",
  "نوع العقد": "listingType",
  "الصور": "images",
};

const CATEGORY_LABEL: Record<string, string> = {
  sale: "للبيع",
  rent: "للإيجار",
  furnished: "مفروش",
};

function buildTitle(p: {
  area: number;
  regionName: string;
  subArea?: string;
  category: PropertyCategory;
}): string {
  const parts: string[] = ["شقة"];
  if (p.area) parts.push(`${p.area}م²`);
  const loc = p.subArea && p.subArea !== p.regionName ? `${p.regionName} - ${p.subArea}` : p.regionName;
  return `${parts.join(" ")} (${CATEGORY_LABEL[p.category]}) - ${loc}`;
}

function buildDescription(parts: (string | undefined)[]): string {
  return parts.map((x) => (x ?? "").trim()).filter(Boolean).join("، ");
}

function rowToProperty(
  fieldByIndex: Record<number, string>,
  row: unknown[],
  meta: SheetMeta,
): ParsedProperty | null {
  const get = (field: string): string => {
    const idx = Object.keys(fieldByIndex).find((k) => fieldByIndex[Number(k)] === field);
    return idx !== undefined ? cleanCell(row[Number(idx)]) : "";
  };

  let unitType = get("unitType");
  const propTypeRaw = get("propertyType");
  const code = get("code");
  const subArea = get("subArea");
  const areaRaw = get("area");
  const floorRaw = get("floor");
  const floorTextRaw = get("floorText");
  const floorsRaw = get("floors");
  const layoutRaw = get("layout");
  const master = get("master");
  const finishing = get("finishing");
  const elevator = get("elevator");
  const parking = get("parking");
  const additionalFeatures = get("additionalFeatures");
  const view = get("view");
  const priceRaw = get("price");
  const source = get("source");
  const location = get("location");
  const listingTypeRaw = get("listingType");
  const imagesRaw = get("images");

  const hasData = [unitType, propTypeRaw, code, subArea, areaRaw, layoutRaw, priceRaw].some(Boolean);
  if (!hasData) return null;

  const area = parseArea(areaRaw);
  const { beds, baths } = parseLayout(layoutRaw);
  const price = parsePrice(priceRaw);
  const layout = arabicToWestern(layoutRaw);

  // Smart check: If unitType is actually a property type (e.g. "شقة"), do NOT set it as facade
  const candidateType = (propTypeRaw || (KNOWN_PROPERTY_TYPES.has(unitType.trim().toLowerCase()) ? unitType : "")).trim().toLowerCase();
  let typeId = "apartment";
  if (candidateType) {
    if (candidateType.includes("فيلا") || candidateType === "villa") typeId = "villa";
    else if (candidateType.includes("دوبلكس") || candidateType === "duplex") typeId = "duplex";
    else if (candidateType.includes("تاون") || candidateType === "townhouse") typeId = "townhouse";
    else if (candidateType.includes("بنتهاوس") || candidateType === "penthouse") typeId = "penthouse";
    else if (candidateType.includes("روف") || candidateType === "roof") typeId = "roof";
    else if (candidateType.includes("شاليه") || candidateType === "chalet") typeId = "chalet";
    else if (candidateType.includes("محل") || candidateType.includes("تجاري") || candidateType === "commercial") typeId = "commercial";
    else if (candidateType.includes("مكتب") || candidateType.includes("إداري") || candidateType === "administrative" || candidateType === "office") typeId = "administrative";
    else if (candidateType.includes("عمارة") || candidateType === "building") typeId = "building";
    else if (candidateType.includes("أرض") || candidateType === "land") typeId = "land";
    else typeId = "apartment";
  }
  if (KNOWN_PROPERTY_TYPES.has(unitType.trim().toLowerCase())) {
    unitType = "";
  }

  const numericFloor = parseFloorNumber(floorRaw || floorTextRaw);
  const dressing = sanitizeDressing(floorTextRaw, numericFloor);
  const images = parseImagesList(imagesRaw);

  return {
    code: code || "",
    title: buildTitle({ area, regionName: meta.regionName, subArea, category: meta.category }),
    description: buildDescription([
      unitType ? `الواجهة: ${unitType}` : "",
      layout || "",
      finishing ? `التشطيب: ${finishing}` : "",
      view ? `الفيو: ${view}` : "",
      additionalFeatures ? `مميزات إضافية: ${additionalFeatures}` : "",
    ]),
    price,
    area,
    beds,
    baths,
    floors: parseInt(arabicToWestern(floorsRaw), 10) || 0,
    floor: numericFloor,
    finishing,
    view,
    typeId,
    regionId: meta.regionId,
    category: meta.category,
    status: "active",
    featured: false,
    agentType: sourceToAgentType(source),
    images,
    videoUrl: "",
    externalUrl: "",
    mapsUrl: "",
    unitType,
    subArea,
    layout,
    master,
    elevator,
    parking,
    additionalFeatures,
    floorText: dressing,
    location,
    source,
  };
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const cells = rows[i].map((c) => cleanCell(c));
    if (cells.includes("النوع") && cells.includes("الكود")) return i;
  }
  return -1;
}

function isNumberingRow(row: unknown[]): boolean {
  const cells = row.map((c) => cleanCell(c)).filter(Boolean);
  if (cells.length === 0) return true;
  return cells.every((c) => c === "#" || /^\d+$/.test(arabicToWestern(c)));
}

export function parseSheet(rows: unknown[][], sheetName: string): ParsedProperty[] {
  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) return [];
  const meta = sheetMeta(sheetName);
  const headerRow = rows[headerIdx].map((c) => cleanCell(c));
  const fieldByIndex: Record<number, string> = {};
  headerRow.forEach((h, i) => {
    const field = HEADER_FIELD[h];
    if (field) fieldByIndex[i] = field;
  });

  const out: ParsedProperty[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isNumberingRow(row)) continue;
    const labels = row.map((c) => cleanCell(c));
    if (labels.includes("النوع") && labels.includes("الكود")) continue;
    const item = rowToProperty(fieldByIndex, row, meta);
    if (item) out.push(item);
  }
  return out;
}

export function parseWorkbookBytes(bytes: Uint8Array): ParseResult {
  const wb = XLSX.read(bytes, { type: "array" });
  const items: ParsedProperty[] = [];
  const sheets: { name: string; count: number }[] = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      defval: "",
      raw: false,
    });
    const parsed = parseSheet(rows, name);
    if (parsed.length > 0) {
      items.push(...parsed);
      sheets.push({ name, count: parsed.length });
    }
  }
  return { items, sheets };
}

// ─── Proper CSV row splitter (handles quoted multi-line fields) ──────
function splitCsvIntoRows(text: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cell += '"'; i++; }
      else inQ = !inQ;
    } else if ((ch === "," || ch === "\t") && !inQ) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\r" && !inQ) {
      if (text[i + 1] === "\n") i++;
      cells.push(cell);
      if (cells.some(c => c.trim())) rows.push(cells);
      cells = [];
      cell = "";
    } else if (ch === "\n" && !inQ) {
      cells.push(cell);
      if (cells.some(c => c.trim())) rows.push(cells);
      cells = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // Trailing row
  cells.push(cell);
  if (cells.some(c => c.trim())) rows.push(cells);
  return rows;
}

interface RegionLite {
  id: string;
  name: string;
}

const STATUS_VALUES = new Set([
  "active", "listed", "draft", "sold", "rented", "reserved",
]);

export function parseDelimitedText(
  text: string,
  regions: RegionLite[],
  types: RegionLite[] = [],
): ParseResult {
  const clean = text.replace(/^\uFEFF/, ""); // strip BOM
  const rows = splitCsvIntoRows(clean);
  if (rows.length < 2) return { items: [], sheets: [] };

  // Detect delimiter from first row (most tabs or most commas)
  // Already handled by splitCsvIntoRows which uses both

  const rawHeaders = rows[0].map(h => h.trim());
  // Map each header to an internal field using smart alias matching
  const fieldByIdx: (string | undefined)[] = rawHeaders.map(h => mapHeader(h));

  const regionByName = new Map(regions.map((r) => [r.name.trim(), r.id]));
  const typeByName = new Map(types.map((t) => [t.name.trim(), t.id]));
  const typeIds = new Set(types.map((t) => t.id));

  const catByLabel: Record<string, PropertyCategory> = {
    "للبيع": "sale", "بيع": "sale", sale: "sale",
    "للإيجار": "rent", "إيجار": "rent", rent: "rent",
    "مفروش": "furnished", furnished: "furnished",
    "إداري": "administrative", administrative: "administrative",
    "طبي": "medical", medical: "medical",
    "تجاري": "commercial", commercial: "commercial",
  };

  const pick = (cells: string[], ...fieldNames: string[]): string => {
    for (const fn of fieldNames) {
      const idx = fieldByIdx.findIndex(f => f === fn);
      if (idx !== -1 && cells[idx] !== undefined) return cleanCell(cells[idx]);
    }
    return "";
  };

  const items: ParsedProperty[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].map(c => c.trim());

    // Skip totally empty rows
    if (cells.every(c => !c)) continue;

    const code = pick(cells, "code");
    const title = pick(cells, "title");
    const priceRaw = pick(cells, "price");
    const areaRaw = pick(cells, "area");
    const layoutRaw = pick(cells, "layout");
    const bedsRaw = pick(cells, "beds");
    const bathsRaw = pick(cells, "baths");
    const regionName = pick(cells, "regionName", "subArea");
    const catRaw = pick(cells, "category");
    const source = pick(cells, "source");
    const finishing = pick(cells, "finishing");
    const view = pick(cells, "view");
    const facadeRaw = pick(cells, "unitType");
    const propTypeRaw = pick(cells, "propertyType");
    const statusRaw = pick(cells, "status").trim().toLowerCase();
    const featuredRaw = pick(cells, "featured").trim();
    const agentRaw = pick(cells, "agentType").trim().toLowerCase();
    const description = pick(cells, "description");
    const floorRaw = pick(cells, "floor");
    const dressingRaw = pick(cells, "floorText");
    const floorsRaw = pick(cells, "floors");
    const location = pick(cells, "location");
    const master = pick(cells, "master");
    const elevator = pick(cells, "elevator");
    const parking = pick(cells, "parking");
    const additionalFeatures = pick(cells, "additionalFeatures");
    const subArea = pick(cells, "subArea");
    const videoUrl = pick(cells, "videoUrl");
    const mapsUrl = pick(cells, "mapsUrl");
    const externalUrl = pick(cells, "externalUrl");
    const listingTypeRaw = pick(cells, "listingType");
    const imagesRaw = pick(cells, "images");

    // Skip rows without any useful data
    if (!code && !title && !priceRaw && !areaRaw) continue;

    const area = parseArea(areaRaw);
    const price = parsePrice(priceRaw);
    const { beds: lb, baths: lba } = parseLayout(layoutRaw);

    const regionId = regionByName.get(regionName.trim()) || resolveRegionId(regionName, regions);
    const category = catByLabel[catRaw.trim()] || "sale";

    // Smart Facade vs Property Type separation:
    let unitType = facadeRaw.trim();
    const candidateType = (propTypeRaw || (KNOWN_PROPERTY_TYPES.has(unitType.toLowerCase()) ? unitType : "")).trim();
    if (KNOWN_PROPERTY_TYPES.has(unitType.toLowerCase())) {
      unitType = "";
    }
    const typeKey = candidateType || "شقة";
    const typeId = typeByName.get(typeKey) || (typeIds.has(typeKey) ? typeKey : "apartment");

    const status = (STATUS_VALUES.has(statusRaw) ? statusRaw : "active") as PropertyStatus;
    const featured = /^(نعم|true|1|yes)$/i.test(featuredRaw);
    const agentType: "direct" | "broker" =
      agentRaw === "broker" || agentRaw === "بروكر" ? "broker"
      : agentRaw === "direct" || agentRaw === "مباشر" ? "direct"
      : sourceToAgentType(source);

    const numericFloor = parseFloorNumber(floorRaw || (fieldByIdx.includes("floorText") ? "" : dressingRaw));
    const floorText = sanitizeDressing(dressingRaw, numericFloor);
    const images = parseImagesList(imagesRaw);
    const floors = parseInt(arabicToWestern(floorsRaw), 10) || 0;

    // Build a clean title if not provided
    const finalTitle = title || buildTitle({ area, regionName, category });

    items.push({
      code,
      title: finalTitle,
      description,
      price,
      area,
      beds: bedsRaw ? parseInt(arabicToWestern(bedsRaw), 10) || 0 : lb,
      baths: bathsRaw ? parseInt(arabicToWestern(bathsRaw), 10) || 0 : lba,
      floors,
      floor: numericFloor,
      finishing,
      view,
      typeId,
      regionId,
      category,
      status,
      featured,
      agentType,
      images,
      videoUrl,
      externalUrl,
      mapsUrl,
      unitType,
      subArea,
      layout: arabicToWestern(layoutRaw),
      master,
      elevator,
      parking,
      additionalFeatures,
      floorText,
      location,
      source,
    });
  }

  return { items, sheets: [{ name: "ملف", count: items.length }] };
}

// ─── Export detected header mapping for import preview ───────────────
export function detectHeaders(text: string): { raw: string; field: string | undefined }[] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = splitCsvIntoRows(clean);
  if (rows.length === 0) return [];
  return rows[0].map(h => ({ raw: h.trim(), field: mapHeader(h.trim()) }));
}
