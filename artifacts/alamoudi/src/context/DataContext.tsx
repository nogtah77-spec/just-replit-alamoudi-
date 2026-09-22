import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SEED_PROPERTIES } from "@/data/seedProperties";
import { supabaseService, rowToProperty, parsePropertyImages } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabaseClient";
import { enqueueOfflineAction, isOnline, processOfflineQueue } from "@/lib/offlineSync";
import { savePropertiesToIndexedDb, getPropertiesFromIndexedDb, clearPropertiesFromIndexedDb } from "@/lib/indexedDbStorage";
import { syncThemeColor } from "@/lib/meta";
import { deleteFromCloudinary, deleteFolderFromCloudinary, getPropertyCloudinaryFolder } from "@/lib/cloudinaryService";

export interface Region { id: string; name: string; active: boolean; heroImage?: string; }
export interface PropertyType { id: string; name: string; active: boolean; }

export type PropertyStatus = "active" | "listed" | "draft" | "sold" | "rented" | "reserved";
export type PropertyCategory = "residential" | "administrative" | "medical" | "commercial" | "sale" | "rent" | "furnished";
export type PropertyListingType = "sale" | "rent" | "furnished";
export type PropertySourceType = "direct" | "broker" | "unspecified";

export interface Property {
  id: string;
  code: string;
  title: string;
  description: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  floors: number;
  floor: number | string;
  finishing: string;
  view: string;
  typeId: string;
  regionId: string;
  category: PropertyCategory;
  listingType?: PropertyListingType;
  status: PropertyStatus;
  featured: boolean;
  agentType?: "direct" | "broker" | "unspecified" | string;
  images: string[];
  videoUrl: string;
  externalUrl: string;
  mapsUrl: string;
  createdAt: string;
  updatedAt?: string;
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
  sourcePhones?: string[];
  sourceEmail?: string;
  sourceLocation?: string;
  sourceNotes?: string;
  assignedStaffId?: string;
  brokerId?: string;
  views?: number;
  coverPriority?: "image" | "video";
}

export interface Broker {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  company?: string;
  specialty?: string;
  commission?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: "admin" | "agent" | "customer";
  active: boolean;
  canClearActivityLogs: boolean;
  joinedAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "reviewed" | "replied";
  createdAt: string;
}

export interface FinishingRequest {
  id: string;
  name: string;
  phone: string;
  location: string;
  area: string;
  finishingType: string;
  description: string;
  status: "new" | "reviewed" | "replied";
  createdAt: string;
}

export interface PropertyRequest {
  id: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsapp: string;
  ownerEmail: string;
  regionId: string;
  propertyTypeId: string;
  listingType: string;
  area: string;
  price: string;
  description: string;
  mapsUrl: string;
  notes: string;
  images: string[];
  status: "new" | "reviewed" | "replied";
  createdAt: string;
}

export interface AiLead {
  id: string;
  name: string;
  phone: string;
  preferredLanguage: string;
  requirements: string;
  budget: string;
  notes: string;
  status: "new" | "reviewed" | "replied";
  createdAt: string;
}

export type CustomerPropertyRequestStatus = "new" | "reviewed" | "replied" | "closed";

export interface CustomerPropertyRequest {
  id: string;
  customerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  requestType: string;
  transactionType: string;
  preferredAreas: string;
  budgetMin: string;
  budgetMax: string;
  bedrooms: string;
  bathrooms: string;
  areaMin: string;
  areaMax: string;
  finishing: string;
  furnished: string;
  paymentMethod: string;
  requiredFeatures: string;
  details: string;
  notes: string;
  source: string;
  followUpDate: string;
  assignedStaffId: string;
  viewingDate: string;
  status: CustomerPropertyRequestStatus;
  createdAt: string;
}

export type ContractType = "rent" | "furnished_rent" | "sale" | "installment";
export type ContractStatus = "draft" | "active" | "completed" | "cancelled";
export type ContractInstallmentStatus = "pending" | "paid" | "overdue";

export interface ContractDocument {
  id: string;
  objectPath: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface ContractInstallment {
  id: string;
  dueDate: string;
  amount: string;
  status: ContractInstallmentStatus;
  notes: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  contractType: ContractType;
  status: ContractStatus;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyType: string;
  propertyRegion: string;
  propertyAddress: string;
  assignedStaffId: string;
  partyOneRole: string;
  partyOneName: string;
  partyOnePhone: string;
  partyOneEmail: string;
  partyOneNationalId: string;
  partyOneAddress: string;
  partyTwoRole: string;
  partyTwoName: string;
  partyTwoPhone: string;
  partyTwoEmail: string;
  partyTwoNationalId: string;
  partyTwoAddress: string;
  startDate: string;
  endDate: string;
  signingDate: string;
  handoverDate: string;
  renewalDate: string;
  noticePeriod: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  insuranceAmount: string;
  depositAmount: string;
  currency: string;
  paymentMethod: string;
  paymentFrequency: string;
  nextPaymentDate: string;
  installments: ContractInstallment[];
  terms: string;
  notes: string;
  documents: ContractDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  title: string;
  actor: string;
  createdAt: string;
}

export interface TiktokVideo {
  id: string;
  thumbnail: string;
  title: string;
  videoUrl: string;
}

export type AdType = "premium" | "secondary";
export type AdStatus = "active" | "scheduled" | "expired" | "disabled";

export interface Ad {
  id: string;
  type: AdType;                  // premium = إعلان رئيسي (21:9) | secondary = إعلان صغير (16:9)
  desktopImageUrl: string;       // صورة الديسكتوب (مطلوبة)
  mobileImageUrl?: string;       // صورة الجوال (اختياري)
  linkUrl?: string;
  whatsappNumber?: string;       // رقم واتساب للتواصل المباشر عند النقر
  linkPriority?: "whatsapp" | "url"; // الأولوية لو الاثنان موجودان (افتراضي: whatsapp)
  whatsappMessage?: string;          // الرسالة الجاهزة اللي بتظهر للعميل عند فتح الواتساب
  title?: string;
  order: number;
  duration: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  views: number;
  clicks: number;
  linkClicks?: number;           // نقرات أدت لفتح لينك أو واتساب
  // للتوافق مع البيانات القديمة
  imageUrl?: string;
}

export interface QrCodeItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "url" | "image";
  url?: string;
  imageUrl?: string;
  icon?: "location" | "whatsapp" | "tiktok" | "website" | "phone" | "custom";
  active: boolean;
  showInHome?: boolean;
  showInPdf?: boolean;
  order?: number;
}

export interface HomeBackgroundSettings {
  enabled: boolean;
  // Dark Mode
  bgImageDark: string;
  overlayColorDark: string;
  overlayOpacityDark: number; // 0 - 100
  blurDark: number; // 0 - 25
  imageOpacityDark: number; // 0 - 100
  // Light Mode
  bgImageLight: string;
  overlayColorLight: string;
  overlayOpacityLight: number; // 0 - 100
  blurLight: number; // 0 - 25
  imageOpacityLight: number; // 0 - 100
}

export interface SiteSettings {
  companyName: string;
  companyDescription: string;
  heroLine1: string;
  heroLine2: string;
  phone1: string;
  phone2: string;
  whatsapp: string;
  email: string;
  tiktok: string;
  tiktokName: string;
  tiktokAvatar: string;
  facebook: string;
  instagram: string;
  telegram: string;
  mapsUrl: string;
  heroImageUrl: string;
  heroOverlayOpacity: number;
  /** Optional full-bleed image used only on the staff login screen. */
  loginBackgroundEnabled: boolean;
  loginBackgroundImageUrl: string;
  /** Login backdrop overlay color and opacity, 0-100. */
  loginOverlayColor: string;
  loginOverlayOpacity: number;
  /** Bottom-to-top contrast gradient strength, 0-100. */
  loginGradientOpacity: number;
  /** Login form card opacity, 10-100 (default: 88). */
  loginCardOpacity?: number;
  /** Login form card glass blur in px, 0-40 (default: 20). */
  loginCardBlur?: number;
  /** Shared overlay color for region cover heroes. */
  regionHeroOverlayColor: string;
  /** Opacity of the solid overlay over region cover images, 0-100. */
  regionHeroOverlayOpacity: number;
  /** Strength of the bottom-to-top gradient over region cover images, 0-100. */
  regionHeroGradientOpacity: number;
  /** Ambient luxury backgrounds for home page sections */
  homeBackgroundSettings?: HomeBackgroundSettings;
  tiktokVideos: TiktokVideo[];
  tiktokSectionEnabled?: boolean;
  ads: Ad[];
  qrCodes?: QrCodeItem[];
  qrSectionEnabled?: boolean;
  /** Seconds to wait after each card movement before starting the next one. */
  carouselAutoPlayDelay: number;
  /** Movement speed multiplier: 1 is the natural speed. */
  carouselMotionSpeed: number;
  /** Allow visitors/customers to download property images. */
  allowCustomerImageDownloads: boolean;
  /** Allow authenticated staff members to download property images. */
  allowStaffImageDownloads: boolean;
  themeMode?: "light" | "dark" | "user";
  activeThemeId?: "classic" | "charcoal" | "midnight" | string;
}

export function sanitizeDummyContact(val?: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (
    trimmed === "+20 10 0000 0000" ||
    trimmed === "+201000000000" ||
    trimmed === "+20 11 0000 0000" ||
    trimmed === "+201100000000" ||
    trimmed === "0000000000"
  ) {
    return "";
  }
  return trimmed;
}

const DEFAULT_SETTINGS: SiteSettings = {
  activeThemeId: "classic",
  companyName: "العمودي للتسويق العقاري",
  companyDescription: "شريكك الموثوق في عالم العقارات الفاخرة. نقدم لك أفضل الفرص الاستثمارية في مصر.",
  heroLine1: "شريكك الموثوق في عالم التسويق العقاري والتشطيبات",
  heroLine2: "نقدم لك أفضل الفرص العقارية والاستثمارية في مصر",
  phone1: "",
  phone2: "",
  whatsapp: "",
  email: "",
  tiktok: "https://www.tiktok.com/@alamoudi.realestate",
  tiktokName: "Alamoudi | الـعـمـودي",
  tiktokAvatar: "",
  facebook: "",
  instagram: "",
  telegram: "",
  mapsUrl: "https://maps.google.com",
  heroImageUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80",
  heroOverlayOpacity: 85,
  loginBackgroundEnabled: false,
  loginBackgroundImageUrl: "",
  loginOverlayColor: "#10202D",
  loginOverlayOpacity: 72,
  loginGradientOpacity: 58,
  loginCardOpacity: 88,
  loginCardBlur: 20,
  regionHeroOverlayColor: "#000000",
  regionHeroOverlayOpacity: 25,
  regionHeroGradientOpacity: 60,
  tiktokVideos: [],
  ads: [],
  qrCodes: [
    {
      id: "qr-wa",
      title: "تواصل واتساب مباشر",
      subtitle: "امسح للتحدث معنا فوراً على واتساب",
      type: "url",
      url: "https://wa.me/201000000000",
      icon: "whatsapp",
      active: true,
      showInHome: true,
      showInPdf: true,
      order: 1,
    },
    {
      id: "qr-maps",
      title: "موقعنا على الخريطة",
      subtitle: "امسح لفتح موقع مقر الشركة في خرائط جوجل",
      type: "url",
      url: "https://maps.google.com",
      icon: "location",
      active: true,
      showInHome: true,
      showInPdf: true,
      order: 2,
    },
    {
      id: "qr-web",
      title: "منصة العمودي العقارية",
      subtitle: "امسح لفتح المنصة وتصفح أحدث العقارات",
      type: "url",
      url: "https://alamoudi-real-estate.vercel.app/",
      icon: "website",
      active: true,
      showInHome: true,
      showInPdf: false,
      order: 3,
    },
  ],
  homeBackgroundSettings: {
    enabled: true,
    bgImageDark: "",
    overlayColorDark: "#000000",
    overlayOpacityDark: 30,
    blurDark: 0,
    imageOpacityDark: 100,
    bgImageLight: "",
    overlayColorLight: "#FFFFFF",
    overlayOpacityLight: 35,
    blurLight: 0,
    imageOpacityLight: 100,
  },
  qrSectionEnabled: true,
  tiktokSectionEnabled: true,
  carouselAutoPlayDelay: 3.5,
  carouselMotionSpeed: 1,
  allowCustomerImageDownloads: true,
  allowStaffImageDownloads: true,
  themeMode: "user",
};

export interface VisitorStats {
  online: number;
  today: number;
  week: number;
  month: number;
}

interface DataContextType {
  ready: boolean;
  fetching: boolean;
  reload: () => Promise<void>;
  regions: Region[];
  propertyTypes: PropertyType[];
  properties: Property[];
  users: User[];
  inquiries: Inquiry[];
  finishingRequests: FinishingRequest[];
  propertyRequests: PropertyRequest[];
  aiLeads: AiLead[];
  customerPropertyRequests: CustomerPropertyRequest[];
  contracts: Contract[];
  brokers: Broker[];
  activityLogs: ActivityLog[];
  visitorStats: VisitorStats;
  settings: SiteSettings;
  trackPropertyView: (id: string) => void;
  refreshVisitorStats: () => Promise<void>;
  updateSettings: (s: Partial<SiteSettings>) => Promise<boolean>;
  updateHomeBackground: (bg: Partial<HomeBackgroundSettings>) => Promise<boolean>;
  addBroker: (b: Omit<Broker, "id" | "createdAt">) => Promise<boolean>;
  updateBroker: (id: string, b: Partial<Broker>) => Promise<boolean>;
  deleteBroker: (id: string) => Promise<boolean>;
  addRegion: (name: string, heroImage?: string) => Promise<boolean>;
  updateRegion: (id: string, name: string, heroImage?: string) => Promise<boolean>;
  deleteRegion: (id: string) => Promise<boolean>;
  toggleRegion: (id: string) => Promise<boolean>;
  addPropertyType: (name: string) => void;
  updatePropertyType: (id: string, name: string) => void;
  deletePropertyType: (id: string) => void;
  togglePropertyType: (id: string) => void;
  addProperty: (p: Omit<Property, "id" | "createdAt" | "code"> & { code?: string }) => Promise<boolean>;
  updateProperty: (id: string, p: Partial<Property>) => Promise<boolean>;
  deleteProperty: (id: string) => void;
  bulkDeleteProperties: (ids: string[]) => void;
  bulkUpdateProperties: (ids: string[], updates: Partial<Property>) => void;
  importProperties: (items: Omit<Property, "id" | "createdAt">[]) => Promise<{ added: number; updated: number }>;
  addUser: (u: Omit<User, "id" | "joinedAt">) => Promise<boolean>;
  updateUser: (id: string, u: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => void;
  toggleUser: (id: string) => void;
  addInquiry: (i: Omit<Inquiry, "id" | "createdAt" | "status">) => void;
  updateInquiryStatus: (id: string, status: Inquiry["status"]) => void;
  deleteInquiry: (id: string) => void;
  addFinishingRequest: (r: Omit<FinishingRequest, "id" | "createdAt" | "status">) => void;
  updateFinishingRequestStatus: (id: string, status: FinishingRequest["status"]) => void;
  deleteFinishingRequest: (id: string) => void;
  addPropertyRequest: (r: Omit<PropertyRequest, "id" | "createdAt" | "status">) => void;
  updatePropertyRequestStatus: (id: string, status: PropertyRequest["status"]) => void;
  deletePropertyRequest: (id: string) => void;
  addCustomerPropertyRequest: (request: Omit<CustomerPropertyRequest, "id" | "createdAt" | "status">) => Promise<boolean>;
  updateCustomerPropertyRequest: (id: string, request: Partial<Omit<CustomerPropertyRequest, "id" | "createdAt">>) => Promise<boolean>;
  deleteCustomerPropertyRequest: (id: string) => void;
  addContract: (contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "contractNumber"> & { contractNumber?: string }) => Promise<boolean>;
  updateContract: (id: string, contract: Partial<Omit<Contract, "id" | "createdAt" | "updatedAt">>) => Promise<boolean>;
  deleteContract: (id: string) => Promise<boolean>;
  reloadAiLeads: () => Promise<void>;
  updateAiLeadStatus: (id: string, status: AiLead["status"]) => void;
  deleteAiLead: (id: string) => void;
  addTiktokVideo: (v: Omit<TiktokVideo, "id">) => void;
  updateTiktokVideo: (id: string, v: Partial<Omit<TiktokVideo, "id">>) => void;
  deleteTiktokVideo: (id: string) => void;
  addAd: (a: Omit<Ad, "id">) => void;
  updateAd: (id: string, a: Partial<Omit<Ad, "id">>) => void;
  deleteAd: (id: string) => void;
  reorderAds: (ordered: Ad[]) => void;
  trackAdView: (id: string, payload?: Record<string, unknown>) => void;
  trackAdClick: (id: string, payload?: Record<string, unknown>) => void;
  logActivity: (entry: {
    action: string;
    entityType: string;
    title: string;
    actor?: string;
  }) => ActivityLog;
  clearActivityLogs: () => Promise<boolean>;
  resetAllProperties: () => Promise<boolean>;
}

export const DEFAULT_INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: "act-init-1",
    action: "created",
    entityType: "system",
    title: "تهيئة منصة العمودي العقارية وقاعدة البيانات السحابية",
    actor: "النظام الأساسي",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "act-init-2",
    action: "status",
    entityType: "settings",
    title: "تفعيل نظام التزامن اللحظي وبث الأنشطة المباشر",
    actor: "مدير النظام",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "act-init-3",
    action: "created",
    entityType: "property",
    title: "اعتماد قائمة عقارات التجمع والشروق ومدينتي المحدثة",
    actor: "الإدارة (العمودي)",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

const DataContext = createContext<DataContextType | null>(null);

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function genCode() { return "ALM-" + Math.floor(10000 + Math.random() * 90000); }

const CACHE_KEY = "alm_cache_v10";
// الـ cache بيُعرض فوراً حتى لو قديم، والـ API دايماً بيرفّش في الخلفية
// TTL طويل جداً (7 أيام) كـ safety net بس للـ cache القديم جداً
const CACHE_HARD_TTL = 7 * 24 * 60 * 60 * 1000;

// One-time startup purge of zombie legacy caches
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("alm_property_overrides");
    localStorage.removeItem("alm_recent_property_edits");
    localStorage.removeItem("alm_deleted_properties");
    localStorage.removeItem("alm_cache_v10");
    localStorage.removeItem("alm_cache_v9");
    localStorage.removeItem("alm_cache_v8");
    localStorage.removeItem("alm_cache_v7");
    localStorage.removeItem("alm_cache_v6");
    localStorage.removeItem("alm_cache_v5");
    if (window.indexedDB) {
      window.indexedDB.deleteDatabase("alm_properties_db");
    }
  } catch {}
}

interface CachePayload {
  ts: number;
  regions: Region[];
  types: PropertyType[];
  properties: Property[];
  settings: SiteSettings;
}

export const DEFAULT_BROKERS: Broker[] = [
  {
    id: "broker-1",
    name: "م/ وائل الشناوي",
    phone: "01012345678",
    whatsapp: "01012345678",
    company: "القمة للتسويق العقاري",
    specialty: "فلل ودوبلكس التجمع",
    commission: "2.5%",
    notes: "وسيط معتمد وموثوق، سرعة في المعاينات والتنسيق",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "broker-2",
    name: "أ/ كريم منصور",
    phone: "01123456789",
    whatsapp: "01123456789",
    company: "رويال هومز",
    specialty: "شقق ومحلات الشروق ومدينتي",
    commission: "50% مناصفة",
    notes: "عروض حصرية في كمبوند وصال والشروق",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "broker-3",
    name: "أ/ ياسمين فؤاد",
    phone: "01234567890",
    whatsapp: "01234567890",
    company: "وسيط معتمد",
    specialty: "مقرات إدارية وعيادات التجمع",
    commission: "2.5%",
    notes: "علاقات قوية مع المستثمرين والمقرات الإدارية",
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_REGIONS: Region[] = [
  { id: "badr", name: "مدينة بدر", active: true },
  { id: "shorouk", name: "مدينة الشروق", active: true },
  { id: "madinaty", name: "مدينتي", active: true },
  { id: "wasal", name: "كمبوند وصال", active: true },
  { id: "tagamoa", name: "التجمع", active: true },
  { id: "beit_elwatan", name: "بيت الوطن", active: true },
  { id: "nasr_city", name: "مدينة نصر", active: true },
  { id: "new_heliopolis", name: "هليوبوليس الجديدة", active: true },
  { id: "new_capital", name: "العاصمة الإدارية", active: true },
];

export const DEFAULT_PROPERTY_TYPES: PropertyType[] = [
  { id: "apartment", name: "شقة", active: true },
  { id: "duplex", name: "دوبلكس", active: true },
  { id: "villa", name: "فيلا", active: true },
  { id: "townhouse", name: "تاون هاوس", active: true },
  { id: "twinhouse", name: "توين هاوس", active: true },
  { id: "penthouse", name: "بنتهاوس", active: true },
  { id: "shop", name: "محل", active: true },
  { id: "clinic", name: "عيادة", active: true },
  { id: "office", name: "مكتب", active: true },
  { id: "building", name: "عمارة", active: true },
  { id: "entire_building", name: "مبنى", active: true },
];

export const DEFAULT_STAFF_USERS: User[] = [
  { id: "staff-1", name: "سعيد العمودي", email: "saeed@alamoudi.com", username: "saeed", role: "admin", active: true, canClearActivityLogs: true, joinedAt: "2026-01-01" },
];

// Memory Shield for in-flight/recent edits (prevents transient rollback from slower DB queries)
const recentPropertyEdits = new Map<string, { property: Property; timestamp: number }>();

export function recordRecentEdit(property: Property) {
  if (!property) return;
  const item = { property, timestamp: Date.now() };
  if (property.id) recentPropertyEdits.set(property.id, item);
  if (property.code) recentPropertyEdits.set(property.code.toLowerCase().trim(), item);

  try {
    const raw = localStorage.getItem("alm_recent_property_edits");
    const stored = raw ? JSON.parse(raw) : {};
    stored[property.id] = item;
    if (property.code) stored[property.code.toLowerCase().trim()] = item;
    localStorage.setItem("alm_recent_property_edits", JSON.stringify(stored));
  } catch {}
}

export function clearRecentEdit(idOrCode: string) {
  if (!idOrCode) return;
  const key = idOrCode.toLowerCase().trim();
  recentPropertyEdits.delete(idOrCode);
  recentPropertyEdits.delete(key);

  try {
    const raw = localStorage.getItem("alm_recent_property_edits");
    if (raw) {
      const stored = JSON.parse(raw);
      delete stored[idOrCode];
      delete stored[key];
      localStorage.setItem("alm_recent_property_edits", JSON.stringify(stored));
    }
  } catch {}
}

export function isSystemStoreProperty(p: { id?: string; code?: string } | null | undefined): boolean {
  if (!p) return false;
  const id = String(p.id || "");
  const code = String(p.code || "");
  return id.startsWith("__") || code.startsWith("__");
}

export const DUMMY_PROP_IDS = new Set([
  "alm_prop_tagamoa_t10",
  "alm_prop_villa_v01",
  "alm_prop_badr_b05",
  "alm_prop_madinaty_m22",
  "alm_prop_wasal_w03",
  "alm_prop_nasr_city_n14",
  "alm_prop_beit_elwatan_bw08",
]);

export function isDummyProperty(p: { id?: string; code?: string } | null | undefined): boolean {
  if (!p) return false;
  const id = String(p.id || "").toLowerCase().trim();
  const code = String(p.code || "").toLowerCase().trim();
  return id.startsWith("alm_prop_") || DUMMY_PROP_IDS.has(id) || (["bw08", "b05", "t10", "v01", "m22", "w03", "n14"].includes(code) && id.includes("alm_prop"));
}

export function getDeletedPropertyIds(): Set<string> {
  const set = new Set<string>();
  try {
    const raw = localStorage.getItem("alm_deleted_properties");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(x => {
          if (x) {
            const s = String(x).trim();
            if (s) {
              set.add(s);
              set.add(s.toLowerCase());
            }
          }
        });
      }
    }
  } catch {}
  return set;
}

export function isPropertyDeleted(p: { id?: string; code?: string } | null | undefined, deletedSet?: Set<string>): boolean {
  if (!p) return true;
  const delSet = deletedSet || getDeletedPropertyIds();
  const id = String(p.id || "").trim();
  return delSet.has(id) || delSet.has(id.toLowerCase());
}

export function mergeFreshWithRecentEdits(freshList: Property[]): Property[] {
  const map = new Map<string, Property>();
  for (const fp of freshList) {
    if (!fp) continue;
    const codeKey = (fp.code || fp.id).trim().toLowerCase();
    const existing = map.get(codeKey) || (fp.id ? map.get(fp.id) : undefined);
    if (!existing) {
      map.set(codeKey, fp);
      if (fp.id) map.set(fp.id, fp);
    } else {
      const existImgs = parsePropertyImages(existing.images);
      const fpImgs = parsePropertyImages(fp.images);
      const chosenImgs = fpImgs.length > 0 ? fpImgs : existImgs;
      const newer = new Date(fp.updatedAt || fp.createdAt || 0) >= new Date(existing.updatedAt || existing.createdAt || 0) ? fp : existing;
      const mergedProp = { ...existing, ...newer, images: chosenImgs };
      map.set(codeKey, mergedProp);
      if (fp.id) map.set(fp.id, mergedProp);
      if (existing.id) map.set(existing.id, mergedProp);
    }
  }

  // Apply active recent edits (within 5 minutes) strictly over fresh DB reads
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const deletedSet = getDeletedPropertyIds();

  for (const [key, item] of recentPropertyEdits.entries()) {
    if (now - item.timestamp < fiveMinutes && item.property && item.property.id) {
      if (!isPropertyDeleted(item.property, deletedSet)) {
        const codeKey = (item.property.code || item.property.id).trim().toLowerCase();
        const existing = map.get(codeKey) || map.get(item.property.id);
        const existImgs = parsePropertyImages(existing?.images);
        const inImgs = parsePropertyImages(item.property.images);
        const chosenImgs = inImgs.length > 0 ? inImgs : existImgs;
        const mergedProp = { ...existing, ...item.property, images: chosenImgs };
        map.set(codeKey, mergedProp);
        map.set(item.property.id, mergedProp);
      }
    } else if (now - item.timestamp >= fiveMinutes) {
      recentPropertyEdits.delete(key);
    }
  }

  try {
    const raw = localStorage.getItem("alm_recent_property_edits");
    if (raw) {
      const stored = JSON.parse(raw);
      for (const k of Object.keys(stored)) {
        const it = stored[k];
        if (it && now - it.timestamp < fiveMinutes && it.property && it.property.id) {
          if (!isPropertyDeleted(it.property, deletedSet)) {
            const codeKey = (it.property.code || it.property.id).trim().toLowerCase();
            const existing = map.get(codeKey) || map.get(it.property.id);
            const existImgs = parsePropertyImages(existing?.images);
            const inImgs = parsePropertyImages(it.property.images);
            const chosenImgs = inImgs.length > 0 ? inImgs : existImgs;
            const mergedProp = { ...existing, ...it.property, images: chosenImgs };
            map.set(codeKey, mergedProp);
            map.set(it.property.id, mergedProp);
          }
        }
      }
    }
  } catch {}

  // Deduplicate by ID and unique Code
  const uniqueMap = new Map<string, Property>();
  for (const p of map.values()) {
    if (!p || isSystemStoreProperty(p) || isDummyProperty(p) || isPropertyDeleted(p, deletedSet)) continue;
    const key = (p.code || p.id).trim().toLowerCase();
    const existing = uniqueMap.get(key);
    if (!existing) {
      uniqueMap.set(key, p);
    } else {
      const existImgs = parsePropertyImages(existing.images);
      const newImgs = parsePropertyImages(p.images);
      const chosenImgs = newImgs.length > 0 ? newImgs : existImgs;
      uniqueMap.set(key, { ...existing, ...p, images: chosenImgs });
    }
  }

  return Array.from(uniqueMap.values())
    .sort((a, b) => {
      const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return tB - tA;
    });
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachePayload = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_HARD_TTL) return null;
    return parsed;
  } catch { return null; }
}

function toLeanProperties(props: Property[]): Property[] {
  return (props || []).map(p => {
    const images = parsePropertyImages(p.images);
    return {
      ...p,
      images: images.slice(0, 15),
    };
  });
}

function writeCache(payload: Omit<CachePayload, "ts">) {
  // Also save FULL multi-image properties to IndexedDB (unlimited quota) FIRST
  if (payload.properties && payload.properties.length > 0) {
    savePropertiesToIndexedDb(payload.properties).catch(() => {});
  }

  try {
    const leanProps = toLeanProperties(payload.properties || []);
    const leanPayload = {
      ts: Date.now(),
      regions: payload.regions,
      types: payload.types,
      properties: leanProps,
      settings: payload.settings,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(leanPayload));
  } catch {
    try {
      const ultraLean = {
        ts: Date.now(),
        regions: payload.regions,
        types: payload.types,
        properties: (payload.properties || []).slice(0, 50).map(p => ({
          ...p,
          images: p.images?.slice(0, 2) || [],
        })),
        settings: payload.settings,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(ultraLean));
    } catch {}
  }
}

// Global broadcast channel for instant multi-device live sync
const globalBroadcastChannel = supabase ? supabase.channel("alm_global_sync", { config: { broadcast: { self: false } } }) : null;
if (globalBroadcastChannel) globalBroadcastChannel.subscribe();

export function sendRealtimeSync(event: string, payload: any) {
  // Sanitize payload for Supabase Realtime WebSocket (strict 250KB limit)
  let safePayload = payload;
  if (payload && payload.property) {
    const p = payload.property;
    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    const isBase64 = images.some((img: any) => typeof img === "string" && img.startsWith("data:image"));
    // Keep all URL images (up to 20) without exceeding WS limit. For base64, send first 1.
    const safeImages = isBase64 ? images.slice(0, 1) : images.slice(0, 20);
    safePayload = {
      ...payload,
      property: {
        ...p,
        images: safeImages,
      },
    };
  }

  if (globalBroadcastChannel) {
    globalBroadcastChannel.send({
      type: "broadcast",
      event: "sync_event",
      payload: { event, ...safePayload },
    }).catch(() => {});
  }
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel("alm_local_sync");
      bc.postMessage({ event, ...payload });
      bc.close();
    } catch {}
  }
}

function sanitizeRegions(list?: Region[] | null): Region[] {
  if (!list || !list.length) return DEFAULT_REGIONS;
  const map = new Map<string, Region>();
  DEFAULT_REGIONS.forEach(r => map.set(r.id, r));
  list.forEach(r => {
    if (r && r.id) {
      const existing = map.get(r.id);
      map.set(r.id, { ...existing, ...r, active: r.active !== undefined ? r.active : (existing?.active ?? true) });
    }
  });
  return Array.from(map.values()).map(r => {
    if (r.heroImage && (r.heroImage.includes("/city-heroes/") || r.heroImage.includes("shorouk.jpg"))) {
      return { ...r, heroImage: "" };
    }
    return r;
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [regions, setRegions] = useState<Region[]>(() => {
    try {
      const raw = localStorage.getItem("alm_regions");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeRegions(parsed);
      }
    } catch {}
    const cached = readCache();
    return sanitizeRegions(cached?.regions?.length ? cached.regions : DEFAULT_REGIONS);
  });
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(() => {
    try {
      const raw = localStorage.getItem("alm_types");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const cached = readCache();
    return cached?.types?.length ? cached.types : DEFAULT_PROPERTY_TYPES;
  });
  const [properties, setProperties] = useState<Property[]>(() => {
    const deletedSet = getDeletedPropertyIds();
    const isClean = (p: Property) => {
      if (!p || isSystemStoreProperty(p) || isDummyProperty(p)) return false;
      return !isPropertyDeleted(p, deletedSet);
    };
    const cached = readCache();
    const map = new Map<string, Property>();
    const isReset = typeof window !== "undefined" && localStorage.getItem("alm_platform_reset_flag") === "true";
    // 1. First add all master seed properties if not explicitly reset (indexed by code and id)
    if (!isReset) {
      for (const p of SEED_PROPERTIES) {
        if (p && p.id && !isPropertyDeleted(p, deletedSet)) {
          const codeKey = (p.code || p.id).trim().toLowerCase();
          map.set(codeKey, p);
          map.set(p.id, p);
        }
      }
    }
    // 2. Overlay any cached updates/edits, preserving all photos
    if (cached?.properties && cached.properties.length > 0) {
      for (const p of cached.properties) {
        if (p && p.id && !isPropertyDeleted(p, deletedSet)) {
          const codeKey = (p.code || p.id).trim().toLowerCase();
          const existing = map.get(codeKey) || map.get(p.id);
          if (existing) {
            const tExist = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const tCache = new Date(p.updatedAt || p.createdAt || 0).getTime();
            const existImgs = parsePropertyImages(existing.images);
            const pImgs = parsePropertyImages(p.images);
            const chosenImgs = pImgs.length > 0 ? pImgs : existImgs;
            const newer = tCache >= tExist ? { ...existing, ...p, images: chosenImgs } : { ...p, ...existing, images: chosenImgs };
            map.set(codeKey, newer);
            map.set(p.id, newer);
          } else {
            map.set(codeKey, p);
            map.set(p.id, p);
          }
        }
      }
    }
    return Array.from(map.values()).filter(isClean).sort((a, b) => {
      const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return tB - tA;
    });
  });
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem("alm_deleted_users") || "[]");
      const raw = localStorage.getItem("alm_users");
      const list: User[] = raw ? JSON.parse(raw) : DEFAULT_STAFF_USERS;
      return list.filter(u => !deletedIds.includes(u.id));
    } catch {
      return DEFAULT_STAFF_USERS;
    }
  });
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    try {
      const raw = localStorage.getItem("alm_inquiries");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [finishingRequests, setFinishingRequests] = useState<FinishingRequest[]>(() => {
    try {
      const raw = localStorage.getItem("alm_finishing_requests");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [propertyRequests, setPropertyRequests] = useState<PropertyRequest[]>(() => {
    try {
      const raw = localStorage.getItem("alm_property_requests");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [aiLeads, setAiLeads] = useState<AiLead[]>(() => {
    try {
      const raw = localStorage.getItem("alm_ai_leads");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [customerPropertyRequests, setCustomerPropertyRequests] = useState<CustomerPropertyRequest[]>(() => {
    try {
      const raw = localStorage.getItem("alm_customer_requests");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [contracts, setContracts] = useState<Contract[]>(() => {
    try {
      const raw = localStorage.getItem("alm_contracts");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [brokers, setBrokers] = useState<Broker[]>(() => {
    try {
      const raw = localStorage.getItem("alm_brokers");
      return raw ? JSON.parse(raw) : DEFAULT_BROKERS;
    } catch {
      return DEFAULT_BROKERS;
    }
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const raw = localStorage.getItem("alm_activity_logs");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_ACTIVITIES;
  });
  const [visitorStats, setVisitorStats] = useState<VisitorStats>(() => {
    try {
      const cached = localStorage.getItem("alm_visitor_stats");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          online: 1,
          today: Number(parsed.today) || 34,
          week: Number(parsed.week) || 218,
          month: Number(parsed.month) || 745,
        };
      }
    } catch {}
    return { online: 1, today: 34, week: 218, month: 745 };
  });
  const [settings, setSettings] = useState<SiteSettings>(() => {
    let localQr: { qrSectionEnabled?: boolean; qrCodes?: QrCodeItem[] } | undefined;
    try {
      const rawQr = localStorage.getItem("alm_qr_settings");
      if (rawQr) localQr = JSON.parse(rawQr);
    } catch {}
    let localTiktokEnabled: boolean | undefined;
    try {
      const rawTiktok = localStorage.getItem("alm_tiktok_enabled");
      if (rawTiktok !== null) localTiktokEnabled = JSON.parse(rawTiktok);
    } catch {}
    let localLoginBg: {
      loginBackgroundEnabled?: boolean;
      loginBackgroundImageUrl?: string;
      loginOverlayColor?: string;
      loginOverlayOpacity?: number;
      loginGradientOpacity?: number;
      loginCardOpacity?: number;
      loginCardBlur?: number;
    } | undefined;
    try {
      const rawLogin = localStorage.getItem("alm_login_bg");
      if (rawLogin) localLoginBg = JSON.parse(rawLogin);
    } catch {}
    let localCustom: Partial<SiteSettings> | null = null;
    try {
      const raw = localStorage.getItem("alm_settings");
      if (raw) localCustom = JSON.parse(raw);
    } catch {}
    const cached = readCache();
    const base = localCustom || cached?.settings || {};
    const initialThemeId = (typeof window !== "undefined" ? localStorage.getItem("alm_active_theme") : null) || base.activeThemeId || "classic";
    return {
      ...DEFAULT_SETTINGS,
      ...base,
      activeThemeId: initialThemeId,
      homeBackgroundSettings: {
        ...DEFAULT_SETTINGS.homeBackgroundSettings!,
        ...(cached?.settings?.homeBackgroundSettings || {}),
        ...(localCustom?.homeBackgroundSettings || {}),
      },
      loginBackgroundEnabled: localLoginBg?.loginBackgroundEnabled !== undefined ? localLoginBg.loginBackgroundEnabled : (base.loginBackgroundEnabled ?? false),
      loginBackgroundImageUrl: localLoginBg?.loginBackgroundImageUrl !== undefined ? localLoginBg.loginBackgroundImageUrl : (base.loginBackgroundImageUrl || ""),
      loginOverlayColor: localLoginBg?.loginOverlayColor || base.loginOverlayColor || "#10202D",
      loginOverlayOpacity: localLoginBg?.loginOverlayOpacity ?? base.loginOverlayOpacity ?? 72,
      loginGradientOpacity: localLoginBg?.loginGradientOpacity ?? base.loginGradientOpacity ?? 58,
      loginCardOpacity: localLoginBg?.loginCardOpacity ?? base.loginCardOpacity ?? 88,
      loginCardBlur: localLoginBg?.loginCardBlur ?? base.loginCardBlur ?? 20,
      phone1: sanitizeDummyContact(base.phone1),
      phone2: sanitizeDummyContact(base.phone2),
      whatsapp: sanitizeDummyContact(base.whatsapp),
      qrCodes: localQr?.qrCodes ?? localCustom?.qrCodes ?? cached?.settings?.qrCodes ?? DEFAULT_SETTINGS.qrCodes,
      qrSectionEnabled: localQr?.qrSectionEnabled !== undefined ? localQr.qrSectionEnabled : (localCustom?.qrSectionEnabled !== undefined ? localCustom.qrSectionEnabled : (cached?.settings?.qrSectionEnabled ?? true)),
      tiktokSectionEnabled: localTiktokEnabled !== undefined ? localTiktokEnabled : (localCustom?.tiktokSectionEnabled !== undefined ? localCustom.tiktokSectionEnabled : (cached?.settings?.tiktokSectionEnabled ?? true)),
      tiktokVideos: base.tiktokVideos ?? [],
      ads: base.ads ?? [],
    };
  });

  const settingsRef = useRef<SiteSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const reload = useCallback(async () => {
    if (!isOnline()) return;
    try {
      const [freshProps, freshRegs, freshTypes, freshSettings, freshUsers, freshInqs, freshCustomerReqs, freshLogs] = await Promise.allSettled([
        supabaseService.fetchProperties(),
        supabaseService.fetchRegions(),
        supabaseService.fetchPropertyTypes(),
        supabaseService.fetchSettings(),
        supabaseService.fetchUsers(),
        supabaseService.fetchInquiries(),
        supabaseService.fetchCustomerRequests(),
        supabaseService.fetchActivityLogs(),
      ]);
      if (freshRegs.status === "fulfilled" && freshRegs.value) {
        const clean = sanitizeRegions(freshRegs.value);
        setRegions(clean);
        try { localStorage.setItem("alm_regions", JSON.stringify(clean)); } catch {}
      }
      if (freshTypes.status === "fulfilled" && freshTypes.value) {
        setPropertyTypes(freshTypes.value);
        try { localStorage.setItem("alm_types", JSON.stringify(freshTypes.value)); } catch {}
      }
      if (freshProps.status === "fulfilled" && freshProps.value) {
        const protectedList = mergeFreshWithRecentEdits(freshProps.value);
        setProperties(prev => {
          const prevMap = new Map<string, Property>();
          prev.forEach(p => {
            if (p?.code) prevMap.set(p.code.toLowerCase().trim(), p);
            if (p?.id) prevMap.set(p.id, p);
          });
          const merged = protectedList.map(fresh => {
            const codeKey = (fresh.code || fresh.id).toLowerCase().trim();
            const existing = prevMap.get(codeKey) || prevMap.get(fresh.id);
            if (!existing) return fresh;
            const freshImgs = parsePropertyImages(fresh.images);
            const existImgs = parsePropertyImages(existing.images);
            const chosenImgs = freshImgs.length > 0 ? freshImgs : existImgs;
            return { ...existing, ...fresh, images: chosenImgs };
          });
          const deletedSet = getDeletedPropertyIds();
          prev.forEach(p => {
            if (p?.id && !merged.some(m => m.id === p.id || (m.code && p.code && m.code.toLowerCase().trim() === p.code.toLowerCase().trim())) && !isPropertyDeleted(p, deletedSet)) {
              merged.push(p);
            }
          });
          writeCache({ regions, types: propertyTypes, properties: merged, settings });
          return merged;
        });
      }
      if (freshSettings.status === "fulfilled" && freshSettings.value) {
        const isLocalAdminPreview = typeof window !== "undefined" && localStorage.getItem("alm_theme_scope") === "admin_only";
        setSettings(prev => {
          const effectiveTheme = isLocalAdminPreview
            ? (prev.activeThemeId || localStorage.getItem("alm_active_theme") || "midnight")
            : (freshSettings.value?.activeThemeId || prev.activeThemeId || "midnight");
          const next = { ...prev, ...freshSettings.value, activeThemeId: effectiveTheme };
          settingsRef.current = next;
          try {
            localStorage.setItem("alm_settings", JSON.stringify(next));
            if (!isLocalAdminPreview && freshSettings.value?.activeThemeId) {
              localStorage.setItem("alm_active_theme", freshSettings.value.activeThemeId);
              document.documentElement.setAttribute("data-theme", freshSettings.value.activeThemeId);
              syncThemeColor(freshSettings.value.activeThemeId);
            }
          } catch {}
          return next;
        });
      }
      if (freshUsers.status === "fulfilled" && freshUsers.value) setUsers(freshUsers.value);
      if (freshInqs.status === "fulfilled" && freshInqs.value) setInquiries(freshInqs.value);
      if (freshCustomerReqs.status === "fulfilled" && freshCustomerReqs.value) setCustomerPropertyRequests(freshCustomerReqs.value);
      if (freshLogs.status === "fulfilled" && freshLogs.value) setActivityLogs(freshLogs.value);
    } catch (e) {
      console.warn("Reload error:", e);
    }
  }, [regions, propertyTypes, settings]);

  const trackPropertyView = useCallback((id: string) => {
    // Exclude staff & admin views from inflating view stats
    try {
      const rawUser = localStorage.getItem("alm_auth_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && (u.role === "admin" || u.role === "agent")) return;
      }
    } catch {}

    // Optimistically increment views in local state
    setProperties(prev => prev.map(p => {
      if (p.id === id || p.code === id) {
        return { ...p, views: (p.views || 0) + 1 };
      }
      return p;
    }));

    // Sync increment to Supabase cloud store
    if (isOnline()) {
      supabaseService.incrementPropertyView(id).catch(() => {});
    }
  }, []);

  const refreshVisitorStats = useCallback(async () => {
    if (!isOnline()) return;
    try {
      const stats = await supabaseService.fetchVisitorStats();
      if (stats) {
        setVisitorStats(prev => {
          const next = {
            ...prev,
            today: stats.today,
            week: stats.week,
            month: stats.month,
          };
          try { localStorage.setItem("alm_visitor_stats", JSON.stringify(next)); } catch {}
          return next;
        });
      }
    } catch {
      /* not authorized / not staff — ignore */
    }
  }, []);

  const reloadAiLeads = useCallback(async () => {
    if (!isOnline()) return;
    try {
      setAiLeads(await api.get<AiLead[]>("/ai/leads"));
    } catch {
      /* not authorized / not staff — ignore */
    }
  }, []);

  // Optimistic writes update local state first; if the server rejects or is offline,
  // store in offline queue and re-sync when online.
  const persist = useCallback((p: Promise<unknown>, offlineAction?: Parameters<typeof enqueueOfflineAction>[0]) => {
    return p
      .then(() => true)
      .catch((err: unknown) => {
        if (!isOnline() || (err && typeof err === "object" && "status" in err && (err as any).status === 503)) {
          if (offlineAction) {
            enqueueOfflineAction(offlineAction);
            toast({
              title: "تم الحفظ في وضع الأوفلاين 📶",
              description: "تم حفظ التغيير محلياً، وسيتم إرساله ومزامنته تلقائياً عند عودة الإنترنت.",
            });
            return true;
          }
        }
        const apiError = err as { status?: number; message?: string };
        const message = apiError.status === 401
          ? "انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم أعد حفظ العقار."
          : apiError.status === 413
            ? "حجم الصور كبير جدًا بالنسبة للطلب. صغّر الصور ثم حاول مرة أخرى."
            : apiError.message || "تعذّر حفظ التغيير على الخادم";
        toast({ title: "تعذّر حفظ التغيير", description: message, variant: "destructive" });
        void reload();
        return false;
      });
  }, [toast, reload]);

  useEffect(() => {
    const cached = readCache();
    const storedRegions = (() => {
      try {
        const raw = localStorage.getItem("alm_regions");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return sanitizeRegions(parsed);
        }
      } catch {}
      return cached?.regions?.length ? sanitizeRegions(cached.regions) : DEFAULT_REGIONS;
    })();

    const storedTypes = (() => {
      try {
        const raw = localStorage.getItem("alm_types");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return cached?.types?.length ? cached.types : DEFAULT_PROPERTY_TYPES;
    })();

    setRegions(storedRegions);
    setPropertyTypes(storedTypes);

    if (cached) {
      if (cached.properties && cached.properties.length > 0) {
        setProperties(prev => {
          const map = new Map<string, Property>();
          prev.forEach(p => {
            if (p?.code) map.set(p.code.toLowerCase().trim(), p);
            if (p?.id) map.set(p.id, p);
          });
          cached.properties.forEach(p => {
            if (p) {
              const codeKey = (p.code || p.id).toLowerCase().trim();
              const existing = map.get(codeKey) || map.get(p.id);
              if (!existing) {
                map.set(codeKey, p);
                map.set(p.id, p);
              } else {
                const tE = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                const tC = new Date(p.updatedAt || p.createdAt || 0).getTime();
                const existImgs = parsePropertyImages(existing.images);
                const pImgs = parsePropertyImages(p.images);
                const chosenImgs = pImgs.length > 0 ? pImgs : existImgs;
                const newer = tC >= tE ? { ...existing, ...p, images: chosenImgs } : { ...p, ...existing, images: chosenImgs };
                map.set(codeKey, newer);
                map.set(p.id, newer);
              }
            }
          });
          return Array.from(new Set(map.values())).sort((a, b) => {
            const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return tB - tA;
          });
        });
      }
      setSettings(prev => ({
        ...DEFAULT_SETTINGS,
        ...cached.settings,
        ...prev,
        homeBackgroundSettings: {
          ...DEFAULT_SETTINGS.homeBackgroundSettings!,
          ...(cached.settings?.homeBackgroundSettings || {}),
          ...(prev.homeBackgroundSettings || {}),
        },
        qrCodes: prev.qrCodes ?? cached.settings?.qrCodes ?? DEFAULT_SETTINGS.qrCodes,
        tiktokVideos: cached.settings?.tiktokVideos ?? prev.tiktokVideos ?? [],
        ads: cached.settings?.ads ?? prev.ads ?? [],
      }));
    }
    setReady(true);

    let destroyed = false;
    setFetching(false);
    setReady(true);

    // 1. Immediately restore full multi-image properties from IndexedDB (<10ms)
    getPropertiesFromIndexedDb().then(idbProps => {
      if (destroyed) return;
      if (idbProps && idbProps.length > 0) {
        const deletedSet = getDeletedPropertyIds();
        setProperties(prev => {
          const idbMap = new Map<string, Property>();
          idbProps.forEach(p => {
            if (p && !isPropertyDeleted(p, deletedSet)) {
              if (p.code) idbMap.set(p.code.toLowerCase().trim(), p);
              if (p.id) idbMap.set(p.id, p);
            }
          });
          const updated = prev.map(p => {
            const codeKey = (p.code || p.id).toLowerCase().trim();
            const full = idbMap.get(codeKey) || (p.id ? idbMap.get(p.id) : null);
            if (full) {
              const prevImgs = parsePropertyImages(p.images);
              const fullImgs = parsePropertyImages(full.images);
              const chosenImgs = fullImgs.length > 0 ? fullImgs : prevImgs;
              return { ...p, images: chosenImgs };
            }
            return p;
          });
          idbProps.filter(p => !isDummyProperty(p) && !isPropertyDeleted(p, deletedSet)).forEach(p => {
            if (!updated.some(u => u.id === p.id || (u.code && p.code && u.code.toLowerCase().trim() === p.code.toLowerCase().trim()))) {
              updated.push(p);
            }
          });
          return updated.filter(p => !isDummyProperty(p) && !isPropertyDeleted(p, deletedSet)).sort((a, b) => {
            const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return tB - tA;
          });
        });
      }
    }).catch(() => {});

    // Purge legacy dummy properties from Supabase permanently
    Array.from(DUMMY_PROP_IDS).forEach(dId => {
      supabaseService.deleteProperty(dId).catch(() => {});
    });

    // 2. Fetch fresh properties from Supabase in parallel with ZERO delay
    supabaseService.fetchProperties().then(supabaseProps => {
      if (destroyed) return;
      if (supabaseProps && supabaseProps.length > 0) {
        const protectedList = mergeFreshWithRecentEdits(supabaseProps);
        setProperties(prev => {
          const prevMap = new Map<string, Property>();
          prev.forEach(p => {
            if (p?.code) prevMap.set(p.code.toLowerCase().trim(), p);
            if (p?.id) prevMap.set(p.id, p);
          });
          const merged = protectedList.map(fresh => {
            const codeKey = (fresh.code || fresh.id).toLowerCase().trim();
            const existing = prevMap.get(codeKey) || prevMap.get(fresh.id);
            if (!existing) return fresh;
            const freshImgs = parsePropertyImages(fresh.images);
            const existImgs = parsePropertyImages(existing.images);
            const chosenImgs = freshImgs.length > 0 ? freshImgs : existImgs;
            return { ...existing, ...fresh, images: chosenImgs };
          });
          const deletedSet = getDeletedPropertyIds();
          prev.forEach(p => {
            if (p?.id && !merged.some(m => m.id === p.id || (m.code && p.code && m.code.toLowerCase().trim() === p.code.toLowerCase().trim())) && !isPropertyDeleted(p, deletedSet)) {
              merged.push(p);
            }
          });
          writeCache({
            regions: cached?.regions?.length ? cached.regions : DEFAULT_REGIONS,
            types: cached?.types?.length ? cached.types : DEFAULT_PROPERTY_TYPES,
            properties: merged,
            settings: cached?.settings ?? DEFAULT_SETTINGS,
          });
          return merged;
        });
      } else if (supabaseProps && supabaseProps.length === 0) {
        const isReset = typeof window !== "undefined" && localStorage.getItem("alm_platform_reset_flag") === "true";
        if (!isReset) {
          supabaseService.seedInitialPropertiesIfEmpty().catch(() => {});
        }
      }
    }).catch(() => {});

    // 3. Sync regions from Supabase
    supabaseService.fetchRegions().then(supabaseRegs => {
      if (destroyed) return;
      if (supabaseRegs && supabaseRegs.length > 0) {
        const clean = sanitizeRegions(supabaseRegs);
        setRegions(clean);
        try { localStorage.setItem("alm_regions", JSON.stringify(clean)); } catch {}
      }
    }).catch(() => {});

    // 4. Sync property types from Supabase
    supabaseService.fetchPropertyTypes().then(supabaseTypes => {
      if (destroyed) return;
      if (supabaseTypes && supabaseTypes.length > 0) {
        setPropertyTypes(supabaseTypes);
        try { localStorage.setItem("alm_types", JSON.stringify(supabaseTypes)); } catch {}
      }
    }).catch(() => {});

    // 5. Sync background settings from Supabase
    supabaseService.fetchHomeBackground().then(cloudBg => {
      if (destroyed) return;
      if (cloudBg) {
        setSettings(prev => {
          const mergedBg: HomeBackgroundSettings = {
            ...DEFAULT_SETTINGS.homeBackgroundSettings!,
            ...(prev.homeBackgroundSettings || {}),
            ...cloudBg,
            bgImageDark: cloudBg.bgImageDark !== undefined ? cloudBg.bgImageDark : (prev.homeBackgroundSettings?.bgImageDark ?? ""),
            bgImageLight: cloudBg.bgImageLight !== undefined ? cloudBg.bgImageLight : (prev.homeBackgroundSettings?.bgImageLight ?? ""),
          };
          try {
            localStorage.setItem("alm_home_bg", JSON.stringify(mergedBg));
            const currentSet = localStorage.getItem("alm_settings");
            if (currentSet) {
              const parsed = JSON.parse(currentSet);
              parsed.homeBackgroundSettings = mergedBg;
              localStorage.setItem("alm_settings", JSON.stringify(parsed));
            }
          } catch {}
          return {
            ...prev,
            homeBackgroundSettings: mergedBg,
          };
        });
      }
    }).catch(() => {});

    // 5.5. Sync dedicated login background from Supabase
    supabaseService.fetchLoginBackground().then(cloudLoginBg => {
      if (destroyed) return;
      if (cloudLoginBg) {
        setSettings(prev => {
          const updated = {
            ...prev,
            loginBackgroundEnabled: cloudLoginBg.loginBackgroundEnabled !== undefined ? cloudLoginBg.loginBackgroundEnabled : prev.loginBackgroundEnabled,
            loginBackgroundImageUrl: cloudLoginBg.loginBackgroundImageUrl || prev.loginBackgroundImageUrl,
            loginOverlayColor: cloudLoginBg.loginOverlayColor || prev.loginOverlayColor,
            loginOverlayOpacity: cloudLoginBg.loginOverlayOpacity ?? prev.loginOverlayOpacity,
            loginGradientOpacity: cloudLoginBg.loginGradientOpacity ?? prev.loginGradientOpacity,
            loginCardOpacity: cloudLoginBg.loginCardOpacity ?? prev.loginCardOpacity ?? 88,
            loginCardBlur: cloudLoginBg.loginCardBlur ?? prev.loginCardBlur ?? 20,
          };
          settingsRef.current = updated;
          try {
            localStorage.setItem("alm_login_bg", JSON.stringify(cloudLoginBg));
          } catch {}
          return updated;
        });
      }
    }).catch(() => {});

    // 6. Sync QR settings from Supabase
    supabaseService.fetchQrSettings().then(cloudQr => {
      if (destroyed) return;
      if (cloudQr) {
        setSettings(prev => {
          const nextEnabled = cloudQr.qrSectionEnabled !== undefined ? cloudQr.qrSectionEnabled : prev.qrSectionEnabled;
          const nextCodes = cloudQr.qrCodes || prev.qrCodes;
          const updated = {
            ...prev,
            qrSectionEnabled: nextEnabled,
            qrCodes: nextCodes,
          };
          settingsRef.current = updated;
          try {
            localStorage.setItem("alm_qr_settings", JSON.stringify({ qrSectionEnabled: nextEnabled, qrCodes: nextCodes }));
          } catch {}
          return updated;
        });
      }
    }).catch(() => {});

    // 7. Sync general site settings from Supabase
    supabaseService.fetchSettings().then(cloudSettings => {
      if (destroyed) return;
      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        setSettings(prev => {
          let cachedHomeBg: HomeBackgroundSettings | undefined;
          try {
            const rawBg = localStorage.getItem("alm_home_bg");
            if (rawBg) cachedHomeBg = JSON.parse(rawBg);
          } catch {}

          // Retain homeBackgroundSettings from dedicated store or cache; DO NOT let general site settings wipe it out!
          const activeDark = prev.homeBackgroundSettings?.bgImageDark || cachedHomeBg?.bgImageDark || cloudSettings.homeBackgroundSettings?.bgImageDark || "";
          const activeLight = prev.homeBackgroundSettings?.bgImageLight || cachedHomeBg?.bgImageLight || cloudSettings.homeBackgroundSettings?.bgImageLight || "";

          const mergedBg: HomeBackgroundSettings = {
            ...DEFAULT_SETTINGS.homeBackgroundSettings!,
            ...(cachedHomeBg || {}),
            ...(prev.homeBackgroundSettings || {}),
            ...(cloudSettings.homeBackgroundSettings || {}),
            bgImageDark: activeDark,
            bgImageLight: activeLight,
          };

          const isLocalAdminPreview = typeof window !== "undefined" && localStorage.getItem("alm_theme_scope") === "admin_only";
          const effectiveTheme = isLocalAdminPreview
            ? (prev.activeThemeId || localStorage.getItem("alm_active_theme") || "midnight")
            : (cloudSettings.activeThemeId || prev.activeThemeId || "midnight");

          const merged = {
            ...DEFAULT_SETTINGS,
            ...prev,
            ...cloudSettings,
            activeThemeId: effectiveTheme,
            homeBackgroundSettings: mergedBg,
            phone1: sanitizeDummyContact(cloudSettings.phone1 ?? prev.phone1),
            phone2: sanitizeDummyContact(cloudSettings.phone2 ?? prev.phone2),
            whatsapp: sanitizeDummyContact(cloudSettings.whatsapp ?? prev.whatsapp),
            loginBackgroundEnabled: prev.loginBackgroundEnabled !== undefined ? prev.loginBackgroundEnabled : (cloudSettings.loginBackgroundEnabled ?? false),
            loginBackgroundImageUrl: prev.loginBackgroundImageUrl || cloudSettings.loginBackgroundImageUrl || "",
            loginOverlayColor: prev.loginOverlayColor || cloudSettings.loginOverlayColor || "#10202D",
            loginOverlayOpacity: prev.loginOverlayOpacity ?? cloudSettings.loginOverlayOpacity ?? 72,
            loginGradientOpacity: prev.loginGradientOpacity ?? cloudSettings.loginGradientOpacity ?? 58,
            qrSectionEnabled: cloudSettings.qrSectionEnabled !== undefined ? cloudSettings.qrSectionEnabled : (prev.qrSectionEnabled ?? true),
            qrCodes: cloudSettings.qrCodes !== undefined ? cloudSettings.qrCodes : (prev.qrCodes ?? DEFAULT_SETTINGS.qrCodes),
            tiktokSectionEnabled: cloudSettings.tiktokSectionEnabled !== undefined ? cloudSettings.tiktokSectionEnabled : (prev.tiktokSectionEnabled ?? true),
            tiktokVideos: cloudSettings.tiktokVideos ?? prev.tiktokVideos ?? [],
            ads: cloudSettings.ads ?? prev.ads ?? [],
          };
          settingsRef.current = merged;
          try {
            localStorage.setItem("alm_settings", JSON.stringify(merged));
            localStorage.setItem("alm_home_bg", JSON.stringify(mergedBg));
            if (!isLocalAdminPreview && cloudSettings.activeThemeId) {
              localStorage.setItem("alm_active_theme", cloudSettings.activeThemeId);
              document.documentElement.setAttribute("data-theme", cloudSettings.activeThemeId);
              syncThemeColor(cloudSettings.activeThemeId);
            }
          } catch {}
          return merged;
        });
      }
    }).catch(() => {});

    // 8. Fetch users from Supabase with fallback to local storage
    supabaseService.fetchUsers().then(supabaseUsers => {
      if (destroyed) return;
      if (supabaseUsers && supabaseUsers.length > 0) {
        setUsers(prev => {
          const mergedMap = new Map<string, User>();
          prev.forEach(u => mergedMap.set(u.id, u));
          supabaseUsers.forEach(u => mergedMap.set(u.id, u));
          const merged = Array.from(mergedMap.values());
          try { localStorage.setItem("alm_users", JSON.stringify(merged)); } catch {}
          return merged;
        });
      } else {
        try {
          const raw = localStorage.getItem("alm_users");
          if (raw) setUsers(JSON.parse(raw));
          else setUsers(DEFAULT_STAFF_USERS);
        } catch {
          setUsers(DEFAULT_STAFF_USERS);
        }
      }
    }).catch(() => {
      try {
        const raw = localStorage.getItem("alm_users");
        if (raw) setUsers(JSON.parse(raw));
        else setUsers(DEFAULT_STAFF_USERS);
      } catch {
        setUsers(DEFAULT_STAFF_USERS);
      }
    });

    // 9. Fetch inquiries from Supabase
    supabaseService.fetchInquiries().then(inquiries => {
      if (destroyed) return;
      if (inquiries && inquiries.length > 0) {
        setInquiries(inquiries);
        try { localStorage.setItem("alm_inquiries", JSON.stringify(inquiries)); } catch {}
      }
    }).catch(() => {});

    // 10. Fetch customer requests from Supabase
    supabaseService.fetchCustomerRequests().then(requests => {
      if (destroyed) return;
      if (requests && requests.length > 0) {
        setCustomerPropertyRequests(requests);
        try { localStorage.setItem("alm_customer_requests", JSON.stringify(requests)); } catch {}
      }
    }).catch(() => {});

    // 11. Fetch activity logs from Supabase
    supabaseService.fetchActivityLogs().then(supabaseLogs => {
      if (destroyed) return;
      if (supabaseLogs && supabaseLogs.length > 0) {
        setActivityLogs(prev => {
          const mergedMap = new Map<string, ActivityLog>();
          supabaseLogs.forEach(l => mergedMap.set(l.id, l));
          prev.forEach(l => mergedMap.set(l.id, l));
          const merged = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          try { localStorage.setItem("alm_activity_logs", JSON.stringify(merged)); } catch {}
          return merged;
        });
      }
    }).catch(() => {});

    // Multi-Layer Realtime Live Sync Engine
    const handleSyncPayload = (data: any) => {
      if (!data) return;
      const { event, property, propertyId, user, userId } = data;

      if (event === "PROPERTY_ADD" && property) {
        recordRecentEdit(property);
        setProperties(prev => {
          const exists = prev.some(p => p.id === property.id || (p.code && p.code.toLowerCase() === property.code.toLowerCase()));
          if (exists) {
            // Update if existing has older timestamp
            const updated = prev.map(p => {
              if (p.id === property.id || (p.code && p.code.toLowerCase() === property.code.toLowerCase())) {
                const prevTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
                const inTime = property.updatedAt ? new Date(property.updatedAt).getTime() : Date.now();
                const existImgs = Array.isArray(p.images) ? p.images : [];
                const inImgs = Array.isArray(property.images) ? property.images : [];
                const bestImages = inImgs.length >= existImgs.length ? inImgs : existImgs;
                return inTime >= prevTime ? { ...p, ...property, images: bestImages } : p;
              }
              return p;
            });
            writeCache({ regions, types: propertyTypes, properties: updated, settings });
            return updated;
          }
          const updated = [property, ...prev];
          writeCache({ regions, types: propertyTypes, properties: updated, settings });
          return updated;
        });
        supabaseService.fetchProperties().then(props => {
          if (props && props.length > 0) {
            const protectedList = mergeFreshWithRecentEdits(props);
            setProperties(prev => {
              const prevMap = new Map<string, Property>();
              prev.forEach(p => { if (p?.id) prevMap.set(p.id, p); });
              const merged = protectedList.map(fresh => {
                const existing = prevMap.get(fresh.id);
                if (!existing) return fresh;
                const freshImgs = Array.isArray(fresh.images) ? fresh.images : [];
                const existImgs = Array.isArray(existing.images) ? existing.images : [];
                const bestImgs = freshImgs.length >= existImgs.length ? freshImgs : existImgs;
                return { ...existing, ...fresh, images: bestImgs };
              });
              writeCache({ regions, types: propertyTypes, properties: merged, settings });
              return merged;
            });
          }
        }).catch(() => {});
      } else if (event === "PROPERTY_UPDATE" && property) {
        recordRecentEdit(property);
        setProperties(prev => {
          const updated = prev.map(p => {
            const match = p.id === property.id || (p.code && p.code.toLowerCase() === property.code.toLowerCase());
            if (match) {
              const prevTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
              const inTime = property.updatedAt ? new Date(property.updatedAt).getTime() : Date.now();
              const existImgs = Array.isArray(p.images) ? p.images : [];
              const inImgs = Array.isArray(property.images) ? property.images : [];
              const bestImages = inImgs.length >= existImgs.length ? inImgs : existImgs;
              return inTime >= prevTime ? { ...p, ...property, images: bestImages } : p;
            }
            return p;
          });
          writeCache({ regions, types: propertyTypes, properties: updated, settings });
          return updated;
        });
      } else if (event === "PROPERTY_DELETE" && propertyId) {
        clearRecentEdit(propertyId);
        const idLower = String(propertyId).toLowerCase();
        setProperties(prev => {
          const updated = prev.filter(p => (p.id || "").toLowerCase() !== idLower && (p.code || "").toLowerCase() !== idLower);
          writeCache({ regions, types: propertyTypes, properties: updated, settings });
          return updated;
        });
      } else if (event === "PROPERTY_DELETE_ALL") {
        setProperties([]);
        writeCache({ regions, types: propertyTypes, properties: [], settings });
      } else if ((event === "USER_ADD" || event === "USER_UPDATE") && user) {
        setUsers(prev => {
          const exists = prev.some(u => u.id === user.id);
          const updated = exists ? prev.map(u => u.id === user.id ? user : u) : [...prev, user];
          try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (event === "USER_DELETE" && userId) {
        setUsers(prev => {
          const updated = prev.filter(u => u.id !== userId);
          try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if ((event === "REGION_ADD" || event === "REGION_UPDATE") && data.region) {
        setRegions(prev => {
          const cleanReg = sanitizeRegions([data.region])[0];
          const exists = prev.some(r => r.id === cleanReg.id);
          const updated = exists ? prev.map(r => r.id === cleanReg.id ? cleanReg : r) : [...prev, cleanReg];
          try { localStorage.setItem("alm_regions", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (event === "REGION_DELETE" && data.regionId) {
        setRegions(prev => {
          const updated = prev.filter(r => r.id !== data.regionId);
          try { localStorage.setItem("alm_regions", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if ((event === "TYPE_ADD" || event === "TYPE_UPDATE") && data.propertyType) {
        setPropertyTypes(prev => {
          const exists = prev.some(t => t.id === data.propertyType.id);
          const updated = exists ? prev.map(t => t.id === data.propertyType.id ? data.propertyType : t) : [...prev, data.propertyType];
          try { localStorage.setItem("alm_types", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (event === "TYPE_DELETE" && data.typeId) {
        setPropertyTypes(prev => {
          const updated = prev.filter(t => t.id !== data.typeId);
          try { localStorage.setItem("alm_types", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (event === "ACTIVITY_LOG_ADD" && data.log) {
        setActivityLogs(prev => {
          const exists = prev.some(l => l.id === data.log.id);
          if (exists) return prev;
          const updated = [data.log, ...prev].slice(0, 500);
          try { localStorage.setItem("alm_activity_logs", JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (event === "ACTIVITY_LOG_CLEAR") {
        setActivityLogs([]);
        try { localStorage.removeItem("alm_activity_logs"); } catch {}
      } else if (event === "HOME_BG_UPDATE" && data.homeBackgroundSettings) {
        const newBg = data.homeBackgroundSettings;
        setSettings(prev => {
          const updated = {
            ...prev,
            homeBackgroundSettings: newBg,
          };
          try {
            localStorage.setItem("alm_home_bg", JSON.stringify(newBg));
            const currentSet = localStorage.getItem("alm_settings");
            if (currentSet) {
              const parsed = JSON.parse(currentSet);
              parsed.homeBackgroundSettings = newBg;
              localStorage.setItem("alm_settings", JSON.stringify(parsed));
            }
          } catch {}
          writeCache({ regions, types: propertyTypes, properties, settings: updated });
          return updated;
        });
      } else if (event === "SETTINGS_UPDATE" && data.settings) {
        const isLocalAdminPreview = typeof window !== "undefined" && localStorage.getItem("alm_theme_scope") === "admin_only";
        setSettings(prev => {
          const nextSettings = data.settings;
          const effectiveTheme = isLocalAdminPreview
            ? (prev.activeThemeId || localStorage.getItem("alm_active_theme") || "midnight")
            : (nextSettings.activeThemeId || prev.activeThemeId || "midnight");
          const merged = { ...DEFAULT_SETTINGS, ...prev, ...nextSettings, activeThemeId: effectiveTheme };
          if (nextSettings.homeBackgroundSettings) {
            merged.homeBackgroundSettings = nextSettings.homeBackgroundSettings;
            try {
              localStorage.setItem("alm_home_bg", JSON.stringify(nextSettings.homeBackgroundSettings));
            } catch {}
          }
          settingsRef.current = merged;
          try { 
            localStorage.setItem("alm_settings", JSON.stringify(merged));
            if (!isLocalAdminPreview && nextSettings.activeThemeId) {
              localStorage.setItem("alm_active_theme", nextSettings.activeThemeId);
              document.documentElement.setAttribute("data-theme", nextSettings.activeThemeId);
              syncThemeColor(nextSettings.activeThemeId);
            }
          } catch {}
          writeCache({ regions, types: propertyTypes, properties, settings: merged });
          return merged;
        });
      } else if (event === "PUSH_NOTIFICATION") {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          import("@/lib/pushNotificationService").then(mod => {
            mod.showLocalNotification(data).catch(() => {});
          }).catch(() => {});
        }
      }
    };

    // 1. Supabase Broadcast Listener (Cross-Device Worldwide WebSocket)
    if (globalBroadcastChannel) {
      globalBroadcastChannel.on("broadcast", { event: "sync_event" }, (msg) => {
        handleSyncPayload(msg.payload);
      });
    }

    // 2. Local Cross-Tab / Desktop App BroadcastChannel Listener
    let localBc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        localBc = new BroadcastChannel("alm_local_sync");
        localBc.onmessage = (e) => {
          handleSyncPayload(e.data);
        };
      } catch {}
    }

    // 3. Supabase Postgres Changes fallback listener
    let realtimeChannel: any = null;
    if (supabase) {
      realtimeChannel = supabase
        .channel("alm_realtime_db")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "properties" },
          (payload) => {
            const row = (payload.new || payload.old) as any;
            const recordId = String(row?.id || "");

            // Intercept system configuration rows stored in properties table
            if (recordId.startsWith("__")) {
              if (recordId === "__site_settings_store__" && (payload.eventType === "INSERT" || payload.eventType === "UPDATE")) {
                try {
                  const cloudSettings = JSON.parse(payload.new.description);
                  if (cloudSettings && typeof cloudSettings === "object") {
                    const isLocalAdminPreview = typeof window !== "undefined" && localStorage.getItem("alm_theme_scope") === "admin_only";
                    setSettings(prev => {
                      const effectiveTheme = isLocalAdminPreview
                        ? (prev.activeThemeId || localStorage.getItem("alm_active_theme") || "midnight")
                        : (cloudSettings.activeThemeId || prev.activeThemeId || "midnight");
                      const merged = { ...DEFAULT_SETTINGS, ...prev, ...cloudSettings, activeThemeId: effectiveTheme };
                      settingsRef.current = merged;
                      try {
                        localStorage.setItem("alm_settings", JSON.stringify(merged));
                        if (!isLocalAdminPreview && cloudSettings.activeThemeId) {
                          localStorage.setItem("alm_active_theme", cloudSettings.activeThemeId);
                          document.documentElement.setAttribute("data-theme", cloudSettings.activeThemeId);
                          syncThemeColor(cloudSettings.activeThemeId);
                        }
                      } catch {}
                      writeCache({ regions, types: propertyTypes, properties, settings: merged });
                      return merged;
                    });
                  }
                } catch (e) {
                  console.warn("Error parsing cloud settings in postgres_changes:", e);
                }
              } else if (recordId === "__home_background_store__" && (payload.eventType === "INSERT" || payload.eventType === "UPDATE")) {
                try {
                  const bg = JSON.parse(payload.new.description);
                  if (bg) {
                    setSettings(prev => ({ ...prev, homeBackgroundSettings: bg }));
                    try { localStorage.setItem("alm_home_bg", JSON.stringify(bg)); } catch {}
                  }
                } catch {}
              }
              return; // Stop here! Do not treat system configuration rows as property listings!
            }

            if (payload.eventType === "INSERT") {
              const newProp = rowToProperty(payload.new);
              setProperties(prev => {
                const exists = prev.some(p => p.id === newProp.id);
                const updated = exists ? prev.map(p => p.id === newProp.id ? newProp : p) : [newProp, ...prev];
                writeCache({ regions, types: propertyTypes, properties: updated, settings });
                return updated;
              });
            } else if (payload.eventType === "UPDATE") {
              const updatedProp = rowToProperty(payload.new);
              setProperties(prev => {
                const updated = prev.map(p => {
                  if (p.id === updatedProp.id) {
                    const prevTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
                    const inTime = updatedProp.updatedAt ? new Date(updatedProp.updatedAt).getTime() : Date.now();
                    return inTime >= prevTime ? updatedProp : p;
                  }
                  return p;
                });
                writeCache({ regions, types: propertyTypes, properties: updated, settings });
                return updated;
              });
            } else if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setProperties(prev => {
                  const updated = prev.filter(p => p.id !== deletedId);
                  writeCache({ regions, types: propertyTypes, properties: updated, settings });
                  return updated;
                });
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users" },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const u = payload.new as any;
              const updatedUser: User = {
                id: u.id,
                name: u.name,
                email: u.email,
                username: u.username || "",
                password: u.password || "",
                role: u.role || "customer",
                active: u.active ?? true,
                canClearActivityLogs: u.can_clear_activity_logs ?? false,
                joinedAt: u.joined_at || new Date().toISOString(),
              };
              setUsers(prev => {
                const exists = prev.some(user => user.id === updatedUser.id);
                const updated = exists ? prev.map(user => user.id === updatedUser.id ? updatedUser : user) : [...prev, updatedUser];
                try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
                return updated;
              });
            } else if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setUsers(prev => {
                  const updated = prev.filter(u => u.id !== deletedId);
                  try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
                  return updated;
                });
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inquiries" },
          () => {
            supabaseService.fetchInquiries().then(inqs => {
              if (inqs) setInquiries(inqs);
            }).catch(() => {});
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "customer_property_requests" },
          () => {
            supabaseService.fetchCustomerRequests().then(reqs => {
              if (reqs) setCustomerPropertyRequests(reqs);
            }).catch(() => {});
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "regions" },
          () => {
            supabaseService.fetchRegions().then(regs => {
              if (regs && regs.length > 0) {
                const clean = sanitizeRegions(regs);
                setRegions(clean);
                try { localStorage.setItem("alm_regions", JSON.stringify(clean)); } catch {}
              }
            }).catch(() => {});
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "property_types" },
          () => {
            supabaseService.fetchPropertyTypes().then(types => {
              if (types && types.length > 0) {
                setPropertyTypes(types);
                try { localStorage.setItem("alm_types", JSON.stringify(types)); } catch {}
              }
            }).catch(() => {});
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "site_settings" },
          (payload) => {
            const newRow = payload.new as any;
            if (newRow && newRow.settings_json && typeof newRow.settings_json === "object") {
              setSettings(prev => {
                const merged = { ...DEFAULT_SETTINGS, ...prev, ...newRow.settings_json };
                try { localStorage.setItem("alm_settings", JSON.stringify(merged)); } catch {}
                writeCache({ regions, types: propertyTypes, properties, settings: merged });
                return merged;
              });
            }
          }
        )
        .subscribe();
    }

    // 4. Smart Foreground & Focus & Polling Sync (Memory Shield Protected)
    const syncFreshData = () => {
      supabaseService.fetchLoginBackground().then(freshLoginBg => {
        if (freshLoginBg) {
          setSettings(prev => {
            const curImg = prev.loginBackgroundImageUrl || "";
            const freshImg = freshLoginBg.loginBackgroundImageUrl || "";
            if (freshImg !== curImg || freshLoginBg.loginBackgroundEnabled !== prev.loginBackgroundEnabled) {
              const updated = {
                ...prev,
                loginBackgroundEnabled: freshLoginBg.loginBackgroundEnabled !== undefined ? freshLoginBg.loginBackgroundEnabled : prev.loginBackgroundEnabled,
                loginBackgroundImageUrl: freshImg || curImg,
                loginOverlayColor: freshLoginBg.loginOverlayColor || prev.loginOverlayColor,
                loginOverlayOpacity: freshLoginBg.loginOverlayOpacity ?? prev.loginOverlayOpacity,
                loginGradientOpacity: freshLoginBg.loginGradientOpacity ?? prev.loginGradientOpacity,
                loginCardOpacity: freshLoginBg.loginCardOpacity ?? prev.loginCardOpacity ?? 88,
                loginCardBlur: freshLoginBg.loginCardBlur ?? prev.loginCardBlur ?? 20,
              };
              settingsRef.current = updated;
              try {
                localStorage.setItem("alm_login_bg", JSON.stringify(freshLoginBg));
              } catch {}
              return updated;
            }
            return prev;
          });
        }
      }).catch(() => {});
      supabaseService.fetchHomeBackground().then(freshBg => {
        if (freshBg) {
          setSettings(prev => {
            const curDark = prev.homeBackgroundSettings?.bgImageDark || "";
            const curLight = prev.homeBackgroundSettings?.bgImageLight || "";
            const freshDark = freshBg.bgImageDark !== undefined ? freshBg.bgImageDark : curDark;
            const freshLight = freshBg.bgImageLight !== undefined ? freshBg.bgImageLight : curLight;
            if (freshDark !== curDark || freshLight !== curLight) {
              const updatedBg = {
                ...DEFAULT_SETTINGS.homeBackgroundSettings!,
                ...prev.homeBackgroundSettings,
                ...freshBg,
                bgImageDark: freshDark,
                bgImageLight: freshLight,
              };
              const updated = {
                ...prev,
                homeBackgroundSettings: updatedBg,
              };
              try {
                localStorage.setItem("alm_home_bg", JSON.stringify(updatedBg));
                const currentSet = localStorage.getItem("alm_settings");
                if (currentSet) {
                  const parsed = JSON.parse(currentSet);
                  parsed.homeBackgroundSettings = updatedBg;
                  localStorage.setItem("alm_settings", JSON.stringify(parsed));
                }
              } catch {}
              writeCache({ regions, types: propertyTypes, properties, settings: updated });
              return updated;
            }
            return prev;
          });
        }
      }).catch(() => {});
      supabaseService.fetchProperties().then(freshProps => {
        if (freshProps && freshProps.length > 0) {
          setProperties(prev => {
            const protectedList = mergeFreshWithRecentEdits(freshProps).filter(p => !isSystemStoreProperty(p));
            const prevSig = prev.map(p => `${p.id}_${p.code}_${p.price}_${p.status}_${p.title}_${p.images?.length || 0}`).join("|");
            const mergedSig = protectedList.map(p => `${p.id}_${p.code}_${p.price}_${p.status}_${p.title}_${p.images?.length || 0}`).join("|");
            if (prevSig !== mergedSig) {
              const prevMap = new Map<string, Property>();
              prev.forEach(p => { if (p?.id) prevMap.set(p.id, p); });
              const merged = protectedList.map(fresh => {
                const existing = prevMap.get(fresh.id);
                if (!existing) return fresh;
                const freshImgs = Array.isArray(fresh.images) ? fresh.images : [];
                const existImgs = Array.isArray(existing.images) ? existing.images : [];
                const bestImgs = freshImgs.length >= existImgs.length ? freshImgs : existImgs;
                return { ...existing, ...fresh, images: bestImgs };
              });
              writeCache({ regions, types: propertyTypes, properties: merged, settings });
              return merged;
            }
            return prev;
          });
        }
      }).catch(() => {});

      supabaseService.fetchUsers().then(freshUsers => {
        if (freshUsers && freshUsers.length > 0) {
          setUsers(freshUsers);
          try { localStorage.setItem("alm_users", JSON.stringify(freshUsers)); } catch {}
        }
      }).catch(() => {});

      supabaseService.fetchRegions().then(freshRegs => {
        if (freshRegs && freshRegs.length > 0) {
          const clean = sanitizeRegions(freshRegs);
          setRegions(prev => {
            const prevSig = prev.map(r => `${r.id}_${r.name}_${r.active}_${r.heroImage || ""}`).join("|");
            const freshSig = clean.map(r => `${r.id}_${r.name}_${r.active}_${r.heroImage || ""}`).join("|");
            if (prevSig !== freshSig) {
              try { localStorage.setItem("alm_regions", JSON.stringify(clean)); } catch {}
              return clean;
            }
            return prev;
          });
        }
      }).catch(() => {});

      supabaseService.fetchPropertyTypes().then(freshTypes => {
        if (freshTypes && freshTypes.length > 0) {
          setPropertyTypes(prev => {
            const prevSig = prev.map(t => `${t.id}_${t.name}_${t.active}`).join("|");
            const freshSig = freshTypes.map(t => `${t.id}_${t.name}_${t.active}`).join("|");
            if (prevSig !== freshSig) {
              try { localStorage.setItem("alm_types", JSON.stringify(freshTypes)); } catch {}
              return freshTypes;
            }
            return prev;
          });
        }
      }).catch(() => {});

      supabaseService.fetchSettings().then(freshSettings => {
        if (freshSettings && Object.keys(freshSettings).length > 0) {
          setSettings(prev => {
            let cachedQr: { qrSectionEnabled?: boolean; qrCodes?: QrCodeItem[] } | undefined;
            try {
              const raw = localStorage.getItem("alm_qr_settings");
              if (raw) cachedQr = JSON.parse(raw);
            } catch {}

            const effectiveQrEnabled =
              prev.qrSectionEnabled !== undefined
                ? prev.qrSectionEnabled
                : (cachedQr?.qrSectionEnabled !== undefined
                    ? cachedQr.qrSectionEnabled
                    : (freshSettings.qrSectionEnabled ?? true));

            const effectiveQrCodes = prev.qrCodes || cachedQr?.qrCodes || freshSettings.qrCodes || DEFAULT_SETTINGS.qrCodes;

            // PRESERVE background from current state or dedicated cache; DO NOT wipe with empty images
            let cachedHomeBg: HomeBackgroundSettings | undefined;
            try {
              const rawBg = localStorage.getItem("alm_home_bg");
              if (rawBg) cachedHomeBg = JSON.parse(rawBg);
            } catch {}

            const activeDark = prev.homeBackgroundSettings?.bgImageDark || cachedHomeBg?.bgImageDark || freshSettings.homeBackgroundSettings?.bgImageDark || "";
            const activeLight = prev.homeBackgroundSettings?.bgImageLight || cachedHomeBg?.bgImageLight || freshSettings.homeBackgroundSettings?.bgImageLight || "";

            const mergedHomeBg: HomeBackgroundSettings = {
              ...DEFAULT_SETTINGS.homeBackgroundSettings!,
              ...(cachedHomeBg || {}),
              ...(prev.homeBackgroundSettings || {}),
              ...(freshSettings.homeBackgroundSettings || {}),
              bgImageDark: activeDark,
              bgImageLight: activeLight,
            };

            const isLocalAdminPreview = typeof window !== "undefined" && localStorage.getItem("alm_theme_scope") === "admin_only";
            const effectiveThemeId = isLocalAdminPreview
              ? (prev.activeThemeId || localStorage.getItem("alm_active_theme") || "midnight")
              : (freshSettings.activeThemeId || prev.activeThemeId || "midnight");

            const merged: SiteSettings = {
              ...DEFAULT_SETTINGS,
              ...prev,
              ...freshSettings, // freshSettings takes precedence over prev!
              activeThemeId: effectiveThemeId,
              phone1: sanitizeDummyContact(freshSettings.phone1 !== undefined ? freshSettings.phone1 : prev.phone1),
              phone2: sanitizeDummyContact(freshSettings.phone2 !== undefined ? freshSettings.phone2 : prev.phone2),
              whatsapp: sanitizeDummyContact(freshSettings.whatsapp !== undefined ? freshSettings.whatsapp : prev.whatsapp),
              loginBackgroundEnabled: freshSettings.loginBackgroundEnabled !== undefined ? freshSettings.loginBackgroundEnabled : (prev.loginBackgroundEnabled ?? false),
              loginBackgroundImageUrl: freshSettings.loginBackgroundImageUrl || prev.loginBackgroundImageUrl || "",
              loginOverlayColor: freshSettings.loginOverlayColor || prev.loginOverlayColor || "#10202D",
              loginOverlayOpacity: freshSettings.loginOverlayOpacity ?? prev.loginOverlayOpacity ?? 72,
              loginGradientOpacity: freshSettings.loginGradientOpacity ?? prev.loginGradientOpacity ?? 58,
              qrSectionEnabled: effectiveQrEnabled,
              qrCodes: effectiveQrCodes,
              homeBackgroundSettings: mergedHomeBg,
            };
            settingsRef.current = merged;
            try {
              localStorage.setItem("alm_settings", JSON.stringify(merged));
              if (!isLocalAdminPreview && freshSettings.activeThemeId) {
                localStorage.setItem("alm_active_theme", freshSettings.activeThemeId);
                document.documentElement.setAttribute("data-theme", freshSettings.activeThemeId);
                syncThemeColor(freshSettings.activeThemeId);
              }
            } catch {}
            writeCache({ regions, types: propertyTypes, properties, settings: merged });
            return merged;
          });
        }
      }).catch(() => {});
    };

    window.addEventListener("focus", syncFreshData);
    const onVisChange = () => {
      if (document.visibilityState === "visible") syncFreshData();
    };
    document.addEventListener("visibilitychange", onVisChange);
    const pollInterval = setInterval(syncFreshData, 10000);

    const handleOnlineResume = () => {
      void reload();
      void processOfflineQueue(async (endpoint, opts) => {
        if (opts.method === "POST") return api.post(endpoint, opts.body ? JSON.parse(opts.body) : {});
        if (opts.method === "PUT") return api.put(endpoint, opts.body ? JSON.parse(opts.body) : {});
        if (opts.method === "DELETE") return api.del(endpoint);
        return api.get(endpoint);
      });
    };
    window.addEventListener("online", handleOnlineResume);

    return () => {
      destroyed = true;
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
      if (localBc) {
        localBc.close();
      }
      window.removeEventListener("focus", syncFreshData);
      window.removeEventListener("online", handleOnlineResume);
      document.removeEventListener("visibilitychange", onVisChange);
      clearInterval(pollInterval);
    };
  }, []);

  // ─── Realtime Presence & Live Visitors Engine ─────────────────────────────
  useEffect(() => {
    let active = true;

    const checkIsStaff = (): boolean => {
      try {
        const raw = localStorage.getItem("alm_auth_user");
        if (!raw) return false;
        const u = JSON.parse(raw);
        return !!u && (u.role === "admin" || u.role === "agent");
      } catch {
        return false;
      }
    };

    // 1. Session ID (isolated per device/browser session)
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("alm_visitor_sid") || "";
      if (!sessionId) {
        sessionId = "vis_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
        sessionStorage.setItem("alm_visitor_sid", sessionId);
      }
    } catch {
      sessionId = "vis_" + Math.random().toString(36).substring(2, 9);
    }

    // 2. Initial stats fetch from cloud
    supabaseService.fetchVisitorStats().then((stats) => {
      if (!active || !stats) return;
      setVisitorStats((prev) => {
        const next = { ...prev, today: stats.today, week: stats.week, month: stats.month };
        try { localStorage.setItem("alm_visitor_stats", JSON.stringify(next)); } catch {}
        return next;
      });
    }).catch(() => {});

    // 3. Record session visit once per browser session ONLY for regular visitors (exclude staff/admin)
    try {
      if (!checkIsStaff()) {
        const visitRecorded = sessionStorage.getItem("alm_session_visit_recorded");
        if (!visitRecorded) {
          sessionStorage.setItem("alm_session_visit_recorded", "1");
          supabaseService.recordVisitorVisit().then((stats) => {
            if (!active || !stats) return;
            setVisitorStats((prev) => {
              const next = { ...prev, today: stats.today, week: stats.week, month: stats.month };
              try { localStorage.setItem("alm_visitor_stats", JSON.stringify(next)); } catch {}
              return next;
            });
          }).catch(() => {});
        }
      }
    } catch {}

    if (!supabase) return;

    // 4. Supabase Realtime Presence Channel
    const presenceChannel = supabase.channel("alm_live_presence", {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    const updatePresenceCount = () => {
      if (!active) return;
      try {
        const state = presenceChannel.presenceState();
        // Count ONLY non-staff visitors (guests and regular users)
        let guestCount = 0;
        for (const key of Object.keys(state)) {
          const presences = state[key];
          const isStaffSession = Array.isArray(presences) && presences.some((p: any) => p.isStaff === true);
          if (!isStaffSession) {
            guestCount++;
          }
        }
        setVisitorStats((prev) => {
          if (prev.online === guestCount) return prev;
          return { ...prev, online: guestCount };
        });
      } catch {}
    };

    presenceChannel
      .on("presence", { event: "sync" }, updatePresenceCount)
      .on("presence", { event: "join" }, updatePresenceCount)
      .on("presence", { event: "leave" }, updatePresenceCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && active) {
          try {
            await presenceChannel.track({
              online_at: new Date().toISOString(),
              device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
              isStaff: checkIsStaff(),
            });
            updatePresenceCount();
          } catch (e) {
            console.warn("Presence track warning:", e);
          }
        }
      });

    // 5. Visibility change handling: re-track when tab becomes visible
    const handleVisChange = () => {
      if (document.visibilityState === "visible" && active) {
        try {
          presenceChannel.track({
            online_at: new Date().toISOString(),
            device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
            isStaff: checkIsStaff(),
          }).catch(() => {});
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", handleVisChange);

    // 6. Role sync: when logging in or logging out, re-track presence with updated role
    const syncPresenceRole = () => {
      if (!active) return;
      try {
        presenceChannel.track({
          online_at: new Date().toISOString(),
          device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
          isStaff: checkIsStaff(),
        }).catch(() => {});
      } catch {}
    };
    window.addEventListener("storage", syncPresenceRole);
    window.addEventListener("alm_auth_change", syncPresenceRole);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisChange);
      window.removeEventListener("storage", syncPresenceRole);
      window.removeEventListener("alm_auth_change", syncPresenceRole);
      try {
        presenceChannel.untrack().catch(() => {});
        supabase?.removeChannel(presenceChannel);
      } catch {}
    };
  }, []);

  const logActivity = useCallback((entry: {
    action: string;
    entityType: string;
    title: string;
    actor?: string;
  }) => {
    let currentActor = entry.actor;
    if (!currentActor) {
      try {
        const savedAuth = localStorage.getItem("alm_auth_user");
        if (savedAuth) {
          const u = JSON.parse(savedAuth);
          if (u?.name) currentActor = u.name;
        }
      } catch {}
    }
    if (!currentActor) currentActor = "الإدارة (العمودي)";

    const newLog: ActivityLog = {
      id: "act-" + genId(),
      action: entry.action,
      entityType: entry.entityType,
      title: entry.title,
      actor: currentActor,
      createdAt: new Date().toISOString(),
    };

    setActivityLogs(prev => {
      const updated = [newLog, ...prev.filter(l => l.id !== newLog.id)].slice(0, 500);
      try { localStorage.setItem("alm_activity_logs", JSON.stringify(updated)); } catch {}
      return updated;
    });

    supabaseService.saveActivityLog(newLog).catch(() => {});
    sendRealtimeSync("ACTIVITY_LOG_ADD", { log: newLog });
    api.post("/activity-logs", newLog).catch(() => {});
    return newLog;
  }, []);

  const clearActivityLogs = useCallback(async () => {
    setActivityLogs([]);
    try { localStorage.removeItem("alm_activity_logs"); } catch {}
    supabaseService.clearActivityLogs().catch(() => {});
    sendRealtimeSync("ACTIVITY_LOG_CLEAR", {});
    try {
      await api.del("/activity-logs");
      return true;
    } catch {
      return true;
    }
  }, []);

  const addBroker = useCallback(async (b: Omit<Broker, "id" | "createdAt">) => {
    const newBroker: Broker = {
      ...b,
      id: "broker-" + genId(),
      createdAt: new Date().toISOString(),
    };
    setBrokers(prev => {
      const updated = [newBroker, ...prev];
      try { localStorage.setItem("alm_brokers", JSON.stringify(updated)); } catch {}
      return updated;
    });
    logActivity({ action: "created", entityType: "broker", title: `إضافة وسيط عقاري جديد (${newBroker.name})` });
    toast({ title: "تمت إضافة الوسيط بنجاح" });
    return true;
  }, [toast, logActivity]);

  const updateBroker = useCallback(async (id: string, patch: Partial<Broker>) => {
    let targetName = id;
    setBrokers(prev => {
      const updated = prev.map(b => {
        if (b.id === id) {
          targetName = patch.name || b.name;
          return { ...b, ...patch };
        }
        return b;
      });
      try { localStorage.setItem("alm_brokers", JSON.stringify(updated)); } catch {}
      return updated;
    });
    logActivity({ action: "updated", entityType: "broker", title: `تعديل بيانات الوسيط (${targetName})` });
    toast({ title: "تم تحديث بيانات الوسيط ✓" });
    return true;
  }, [toast, logActivity]);

  const deleteBroker = useCallback(async (id: string) => {
    setBrokers(prev => {
      const updated = prev.filter(b => b.id !== id);
      try { localStorage.setItem("alm_brokers", JSON.stringify(updated)); } catch {}
      return updated;
    });
    logActivity({ action: "deleted", entityType: "broker", title: `حذف وسيط عقاري (${id})` });
    toast({ title: "تم حذف الوسيط" });
    return true;
  }, [toast, logActivity]);

  const updateHomeBackground = useCallback(async (bgPatch: Partial<HomeBackgroundSettings>) => {
    let nextBg: HomeBackgroundSettings = DEFAULT_SETTINGS.homeBackgroundSettings!;
    setSettings(prev => {
      let cachedBg: HomeBackgroundSettings | undefined;
      try {
        const rawBg = localStorage.getItem("alm_home_bg");
        if (rawBg) cachedBg = JSON.parse(rawBg);
      } catch {}

      const activeDark = bgPatch.bgImageDark !== undefined
        ? bgPatch.bgImageDark
        : (prev.homeBackgroundSettings?.bgImageDark !== undefined
            ? prev.homeBackgroundSettings.bgImageDark
            : (cachedBg?.bgImageDark ?? ""));
      const activeLight = bgPatch.bgImageLight !== undefined
        ? bgPatch.bgImageLight
        : (prev.homeBackgroundSettings?.bgImageLight !== undefined
            ? prev.homeBackgroundSettings.bgImageLight
            : (cachedBg?.bgImageLight ?? ""));

      nextBg = {
        ...DEFAULT_SETTINGS.homeBackgroundSettings!,
        ...(prev.homeBackgroundSettings || cachedBg || {}),
        ...bgPatch,
        bgImageDark: activeDark,
        bgImageLight: activeLight,
      };

      try {
        localStorage.setItem("alm_home_bg", JSON.stringify(nextBg));
        const currentSet = localStorage.getItem("alm_settings");
        if (currentSet) {
          const parsed = JSON.parse(currentSet);
          parsed.homeBackgroundSettings = nextBg;
          localStorage.setItem("alm_settings", JSON.stringify(parsed));
        }
      } catch {}

      return {
        ...prev,
        homeBackgroundSettings: nextBg,
      };
    });

    // Save directly to dedicated Supabase store
    await supabaseService.saveHomeBackground(nextBg).catch(() => {});
    sendRealtimeSync("HOME_BG_UPDATE", { homeBackgroundSettings: nextBg });
    return true;
  }, []);

  const updateSettings = useCallback(async (patch: Partial<SiteSettings>) => {
    const cur = settingsRef.current;

    // Retrieve background from all storage layers
    let cachedHomeBg: HomeBackgroundSettings | undefined;
    try {
      const rawBg = localStorage.getItem("alm_home_bg");
      if (rawBg) cachedHomeBg = JSON.parse(rawBg);
    } catch {}

    // Retrieve QR settings from dedicated cache
    let cachedQr: { qrSectionEnabled?: boolean; qrCodes?: QrCodeItem[] } | undefined;
    try {
      const rawQr = localStorage.getItem("alm_qr_settings");
      if (rawQr) cachedQr = JSON.parse(rawQr);
    } catch {}

    const patchBg = patch.homeBackgroundSettings;
    const activeDark = patchBg?.bgImageDark !== undefined
      ? patchBg.bgImageDark
      : (cur.homeBackgroundSettings?.bgImageDark !== undefined
          ? cur.homeBackgroundSettings.bgImageDark
          : (cachedHomeBg?.bgImageDark ?? ""));
    const activeLight = patchBg?.bgImageLight !== undefined
      ? patchBg.bgImageLight
      : (cur.homeBackgroundSettings?.bgImageLight !== undefined
          ? cur.homeBackgroundSettings.bgImageLight
          : (cachedHomeBg?.bgImageLight ?? ""));

    const mergedBg: HomeBackgroundSettings = {
      ...DEFAULT_SETTINGS.homeBackgroundSettings!,
      ...(cur.homeBackgroundSettings || cachedHomeBg || {}),
      ...(patchBg || {}),
      bgImageDark: activeDark,
      bgImageLight: activeLight,
    };

    const nextQrSectionEnabled =
      patch.qrSectionEnabled !== undefined
        ? patch.qrSectionEnabled
        : (cur.qrSectionEnabled !== undefined
            ? cur.qrSectionEnabled
            : (cachedQr?.qrSectionEnabled !== undefined ? cachedQr.qrSectionEnabled : true));

    const nextQrCodes =
      patch.qrCodes !== undefined
        ? patch.qrCodes
        : (cur.qrCodes || cachedQr?.qrCodes || DEFAULT_SETTINGS.qrCodes);

    let cachedTiktokEnabled: boolean | undefined;
    try {
      const raw = localStorage.getItem("alm_tiktok_enabled");
      if (raw !== null) cachedTiktokEnabled = JSON.parse(raw);
    } catch {}

    const nextTiktokSectionEnabled =
      patch.tiktokSectionEnabled !== undefined
        ? patch.tiktokSectionEnabled
        : (cur.tiktokSectionEnabled !== undefined
            ? cur.tiktokSectionEnabled
            : (cachedTiktokEnabled !== undefined ? cachedTiktokEnabled : true));

    const nextSettings: SiteSettings = {
      ...DEFAULT_SETTINGS,
      ...cur,
      ...patch,
      homeBackgroundSettings: mergedBg,
      qrSectionEnabled: nextQrSectionEnabled,
      qrCodes: nextQrCodes,
      tiktokSectionEnabled: nextTiktokSectionEnabled,
    };

    // Update memory ref and react state immediately
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    // Save to local storage
    try {
      localStorage.setItem("alm_settings", JSON.stringify(nextSettings));
      localStorage.setItem("alm_tiktok_enabled", JSON.stringify(nextTiktokSectionEnabled));
      localStorage.setItem("alm_qr_settings", JSON.stringify({
        qrSectionEnabled: nextQrSectionEnabled,
        qrCodes: nextQrCodes,
      }));
      if (nextSettings.activeThemeId) {
        localStorage.setItem("alm_active_theme", nextSettings.activeThemeId);
        document.documentElement.setAttribute("data-theme", nextSettings.activeThemeId);
        syncThemeColor(nextSettings.activeThemeId);
      }
      if (nextSettings.homeBackgroundSettings) {
        localStorage.setItem("alm_home_bg", JSON.stringify(nextSettings.homeBackgroundSettings));
      }
    } catch {}

    writeCache({
      regions,
      types: propertyTypes,
      properties,
      settings: nextSettings,
    });

    // If patch included background changes, persist to dedicated background store
    if (patch.homeBackgroundSettings) {
      supabaseService.saveHomeBackground(nextSettings.homeBackgroundSettings!).catch(() => {});
      sendRealtimeSync("HOME_BG_UPDATE", { homeBackgroundSettings: nextSettings.homeBackgroundSettings });
    }

    // If patch included QR changes, persist to dedicated QR store
    if (patch.qrSectionEnabled !== undefined || patch.qrCodes !== undefined) {
      supabaseService.saveQrSettings({
        qrSectionEnabled: nextQrSectionEnabled,
        qrCodes: nextQrCodes,
      }).catch(() => {});
      sendRealtimeSync("QR_UPDATE", {
        qrSectionEnabled: nextQrSectionEnabled,
        qrCodes: nextQrCodes,
      });
    }

    // If patch included TikTok section toggle, broadcast sync
    if (patch.tiktokSectionEnabled !== undefined) {
      sendRealtimeSync("TIKTOK_UPDATE", {
        tiktokSectionEnabled: nextTiktokSectionEnabled,
      });
    }

    // If patch included login background changes, persist to dedicated login background store
    const hasLoginBgChange =
      patch.loginBackgroundEnabled !== undefined ||
      patch.loginBackgroundImageUrl !== undefined ||
      patch.loginOverlayColor !== undefined ||
      patch.loginOverlayOpacity !== undefined ||
      patch.loginGradientOpacity !== undefined ||
      patch.loginCardOpacity !== undefined ||
      patch.loginCardBlur !== undefined;

    if (hasLoginBgChange || nextSettings.loginBackgroundImageUrl) {
      const loginBgPayload = {
        loginBackgroundEnabled: nextSettings.loginBackgroundEnabled,
        loginBackgroundImageUrl: nextSettings.loginBackgroundImageUrl,
        loginOverlayColor: nextSettings.loginOverlayColor,
        loginOverlayOpacity: nextSettings.loginOverlayOpacity,
        loginGradientOpacity: nextSettings.loginGradientOpacity,
        loginCardOpacity: nextSettings.loginCardOpacity ?? 88,
        loginCardBlur: nextSettings.loginCardBlur ?? 20,
      };
      try {
        localStorage.setItem("alm_login_bg", JSON.stringify(loginBgPayload));
      } catch {}
      supabaseService.saveLoginBackground(loginBgPayload).catch(() => {});
      sendRealtimeSync("LOGIN_BG_UPDATE", { loginBackground: loginBgPayload });
    }

    // Cloud sync to Supabase (propagates across all devices worldwide)
    // Strip heavy base64 images from general site settings so __site_settings_store__ remains lightweight
    // and doesn't conflict with or overwrite the dedicated __home_background_store__.
    const settingsToSave = {
      ...nextSettings,
      homeBackgroundSettings: nextSettings.homeBackgroundSettings ? {
        ...nextSettings.homeBackgroundSettings,
        bgImageDark: "",
        bgImageLight: "",
      } : undefined,
      loginBackgroundImageUrl: nextSettings.loginBackgroundImageUrl?.startsWith("data:") ? "" : (nextSettings.loginBackgroundImageUrl || ""),
    };
    await supabaseService.saveSettings(settingsToSave).catch(() => {});
    // Realtime broadcast (instant cross-tab & cross-device websocket update)
    sendRealtimeSync("SETTINGS_UPDATE", { settings: nextSettings });
    logActivity({ action: "updated", entityType: "settings", title: "تحديث إعدادات المنصة والموقع" });
    return true;
  }, [regions, propertyTypes, properties, logActivity]);

  const addRegion = async (name: string, heroImage = "") => {
    const region: Region = { id: genId(), name, active: true, heroImage };
    setRegions(p => {
      const updated = [...p, region];
      try { localStorage.setItem("alm_regions", JSON.stringify(updated)); } catch {}
      writeCache({ regions: updated, types: propertyTypes, properties, settings });
      return updated;
    });
    await supabaseService.saveRegion(region).catch(() => {});
    sendRealtimeSync("REGION_ADD", { region });
    logActivity({ action: "created", entityType: "region", title: `إضافة منطقة جديدة (${name})` });
    return true;
  };

  const updateRegion = async (id: string, name: string, heroImage?: string) => {
    let targetRegion: Region | undefined;
    setRegions(p => {
      const updated = p.map(r => {
        if (r.id === id) {
          targetRegion = { ...r, name, heroImage: heroImage !== undefined ? heroImage : (r.heroImage ?? "") };
          return targetRegion;
        }
        return r;
      });
      try { localStorage.setItem("alm_regions", JSON.stringify(updated)); } catch {}
      writeCache({ regions: updated, types: propertyTypes, properties, settings });
      return updated;
    });
    if (targetRegion) {
      await supabaseService.saveRegion(targetRegion).catch(() => {});
      sendRealtimeSync("REGION_UPDATE", { region: targetRegion });
    }
    logActivity({ action: "updated", entityType: "region", title: `تعديل المنطقة (${name})` });
    return true;
  };

  const deleteRegion = async (id: string) => {
    setRegions(p => {
      const updated = p.filter(r => r.id !== id);
      try { localStorage.setItem("alm_regions", JSON.stringify(updated)); } catch {}
      writeCache({ regions: updated, types: propertyTypes, properties, settings });
      return updated;
    });
    await supabaseService.deleteRegion(id).catch(() => {});
    sendRealtimeSync("REGION_DELETE", { regionId: id });
    logActivity({ action: "deleted", entityType: "region", title: `حذف منطقة (${id})` });
    return true;
  };

  const toggleRegion = async (id: string) => {
    let targetRegion: Region | undefined;
    setRegions(p => {
      const updated = p.map(r => {
        if (r.id === id) {
          targetRegion = { ...r, active: !r.active };
          return targetRegion;
        }
        return r;
      });
      try { localStorage.setItem("alm_regions", JSON.stringify(updated)); } catch {}
      writeCache({ regions: updated, types: propertyTypes, properties, settings });
      return updated;
    });
    if (targetRegion) {
      await supabaseService.saveRegion(targetRegion).catch(() => {});
      sendRealtimeSync("REGION_UPDATE", { region: targetRegion });
    }
    logActivity({
      action: "status",
      entityType: "region",
      title: `تغيير حالة تفعيل المنطقة (${targetRegion?.name || id}) إلى ${targetRegion?.active ? "مفعل" : "معطل"}`,
    });
    return true;
  };

  const addPropertyType = async (name: string) => {
    const t: PropertyType = { id: genId(), name, active: true };
    setPropertyTypes(p => {
      const updated = [...p, t];
      try { localStorage.setItem("alm_types", JSON.stringify(updated)); } catch {}
      writeCache({ regions, types: updated, properties, settings });
      return updated;
    });
    supabaseService.savePropertyType(t).catch(() => {});
    sendRealtimeSync("TYPE_ADD", { propertyType: t });
    logActivity({ action: "created", entityType: "property_type", title: `إضافة نوع عقار جديد (${name})` });
    return true;
  };

  const updatePropertyType = async (id: string, name: string) => {
    let targetType: PropertyType | undefined;
    setPropertyTypes(p => {
      const updated = p.map(t => {
        if (t.id === id) {
          targetType = { ...t, name };
          return targetType;
        }
        return t;
      });
      try { localStorage.setItem("alm_types", JSON.stringify(updated)); } catch {}
      writeCache({ regions, types: updated, properties, settings });
      return updated;
    });
    if (targetType) {
      supabaseService.savePropertyType(targetType).catch(() => {});
      sendRealtimeSync("TYPE_UPDATE", { propertyType: targetType });
    }
    logActivity({ action: "updated", entityType: "property_type", title: `تعديل نوع عقار (${name})` });
    return true;
  };

  const deletePropertyType = async (id: string) => {
    setPropertyTypes(p => {
      const updated = p.filter(t => t.id !== id);
      try { localStorage.setItem("alm_types", JSON.stringify(updated)); } catch {}
      writeCache({ regions, types: updated, properties, settings });
      return updated;
    });
    supabaseService.deletePropertyType(id).catch(() => {});
    sendRealtimeSync("TYPE_DELETE", { typeId: id });
    logActivity({ action: "deleted", entityType: "property_type", title: `حذف نوع عقار (${id})` });
    return true;
  };

  const togglePropertyType = async (id: string) => {
    let targetType: PropertyType | undefined;
    setPropertyTypes(p => {
      const updated = p.map(t => {
        if (t.id === id) {
          targetType = { ...t, active: !t.active };
          return targetType;
        }
        return t;
      });
      try { localStorage.setItem("alm_types", JSON.stringify(updated)); } catch {}
      writeCache({ regions, types: updated, properties, settings });
      return updated;
    });
    if (targetType) {
      supabaseService.savePropertyType(targetType).catch(() => {});
      sendRealtimeSync("TYPE_UPDATE", { propertyType: targetType });
    }
    logActivity({
      action: "status",
      entityType: "property_type",
      title: `تغيير حالة نوع العقار (${targetType?.name || id}) إلى ${targetType?.active ? "مفعل" : "معطل"}`,
    });
    return true;
  };

  const addProperty = async (p: Omit<Property, "id" | "createdAt" | "code"> & { code?: string }) => {
    const code = p.code?.trim() || genCode();
    const sanitizedSourcePhones = (p.sourcePhones || []).filter(ph => ph && typeof ph === "string" && ph.trim());
    const nowIso = new Date().toISOString();
    const property: Property = {
      ...p,
      code,
      sourcePhones: sanitizedSourcePhones,
      id: genId(),
      createdAt: nowIso,
    };
    recordRecentEdit(property);

    // Un-blacklist this id or code if ever recorded in deleted list
    try {
      const delArr: string[] = JSON.parse(localStorage.getItem("alm_deleted_properties") || "[]");
      const idLower = (property.id || "").toLowerCase().trim();
      const codeLower = (property.code || "").toLowerCase().trim();
      const cleaned = delArr.filter(x => {
        const s = String(x).toLowerCase().trim();
        return s !== idLower && s !== codeLower;
      });
      localStorage.setItem("alm_deleted_properties", JSON.stringify(cleaned));
    } catch {}

    setProperties(prev => {
      const updated = [property, ...prev];
      writeCache({
        regions,
        types: propertyTypes,
        properties: updated,
        settings,
      });
      return updated;
    });

    try {
      await supabaseService.saveProperty(property);
    } catch (err) {
      console.warn("Supabase direct save error:", err);
    }

    sendRealtimeSync("PROPERTY_ADD", { property });
    logActivity({
      action: "created",
      entityType: "property",
      title: `إضافة عقار جديد (${property.code}) - ${property.title || property.unitType || "وحدة عقارية"}`,
    });

    return true;
  };

  const updateProperty = async (id: string, p: Partial<Property>) => {
    let updatedTarget: Property | null = null;
    const targetIdLower = (id || "").toLowerCase().trim();
    const nowIso = new Date().toISOString();

    setProperties(prev => {
      let found = false;
      const updated = prev.map(prop => {
        const matchId = (prop.id || "").toLowerCase().trim() === targetIdLower;
        const matchCode = (prop.code || "").toLowerCase().trim() === targetIdLower;
        if (matchId || matchCode) {
          found = true;
          updatedTarget = { ...prop, ...p, id: prop.id || id, updatedAt: nowIso };
          return updatedTarget;
        }
        return prop;
      });

      if (!found && id) {
        updatedTarget = { ...p, id, code: p.code || id, createdAt: nowIso, updatedAt: nowIso } as Property;
        updated.push(updatedTarget);
      }

      if (updatedTarget) {
        recordRecentEdit(updatedTarget);
      }

      writeCache({
        regions,
        types: propertyTypes,
        properties: updated,
        settings,
      });

      // If previously blacklisted, remove from deleted properties
      if (updatedTarget) {
        try {
          const delArr: string[] = JSON.parse(localStorage.getItem("alm_deleted_properties") || "[]");
          const cleaned = delArr.filter(x => {
            const s = String(x).toLowerCase().trim();
            return s !== targetIdLower && s !== (updatedTarget?.id || "").toLowerCase().trim() && s !== (updatedTarget?.code || "").toLowerCase().trim();
          });
          localStorage.setItem("alm_deleted_properties", JSON.stringify(cleaned));
        } catch {}
      }

      return updated;
    });

    if (updatedTarget) {
      recordRecentEdit(updatedTarget);
      await supabaseService.saveProperty(updatedTarget).catch(() => {});
      sendRealtimeSync("PROPERTY_UPDATE", { property: updatedTarget });
    }

    logActivity({
      action: "updated",
      entityType: "property",
      title: `تعديل بيانات العقار (${(updatedTarget as any)?.code || id})`,
    });

    return true;
  };

  const deleteProperty = async (id: string) => {
    const target = properties.find(p => (p.id || "").toLowerCase().trim() === (id || "").toLowerCase().trim() || (p.code || "").toLowerCase().trim() === (id || "").toLowerCase().trim());
    const targetId = target?.id || id;
    const targetCode = target?.code || "";
    const targetIdLower = targetId.toLowerCase().trim();
    const targetCodeLower = targetCode.toLowerCase().trim();

    // 1. Purge from recent edits (both memory & storage)
    clearRecentEdit(id);
    clearRecentEdit(targetId);
    clearRecentEdit(targetIdLower);
    if (targetCode) {
      clearRecentEdit(targetCode);
      clearRecentEdit(targetCodeLower);
    }

    // 2. Add to persistent blacklist & remove from overrides
    try {
      const deletedArr: string[] = JSON.parse(localStorage.getItem("alm_deleted_properties") || "[]");
      const delSet = new Set(deletedArr);
      [id, targetId, targetIdLower].filter(Boolean).forEach(k => delSet.add(k));
      localStorage.setItem("alm_deleted_properties", JSON.stringify(Array.from(delSet)));
    } catch {}

    // 3. Update React State
    let nextProperties: Property[] = [];
    setProperties(prev => {
      const delSet = getDeletedPropertyIds();
      nextProperties = prev.filter(x => !isPropertyDeleted(x, delSet));
      writeCache({
        regions,
        types: propertyTypes,
        properties: nextProperties,
        settings,
      });
      return nextProperties;
    });

    // 4. Update IndexedDB cache
    savePropertiesToIndexedDb(nextProperties).catch(() => {});

    // 5. Delete from Supabase
    await supabaseService.deleteProperty(targetId).catch(() => {});
    if (targetCode && targetCode !== targetId) {
      await supabaseService.deleteProperty(targetCode).catch(() => {});
    }
    if (id !== targetId && id !== targetCode) {
      await supabaseService.deleteProperty(id).catch(() => {});
    }

    // 6. Delete property folder and images from Cloudinary
    if (target) {
      const propFolder = getPropertyCloudinaryFolder(target.regionId, target.code);
      void deleteFolderFromCloudinary(propFolder);
      if (Array.isArray(target.images)) {
        target.images.forEach(img => {
          if (img && img.includes("cloudinary.com")) {
            void deleteFromCloudinary(img);
          }
        });
      }
    }

    sendRealtimeSync("PROPERTY_DELETE", { propertyId: targetId });
    logActivity({
      action: "deleted",
      entityType: "property",
      title: `حذف العقار (${targetCode || targetId}) من المنصة`,
    });
    return true;
  };

  const bulkDeleteProperties = async (ids: string[]) => {
    if (ids.length === 0) return;
    const lowerIds = ids.map(x => (x || "").toLowerCase().trim());
    const targets = properties.filter(p => lowerIds.includes((p.id || "").toLowerCase().trim()) || lowerIds.includes((p.code || "").toLowerCase().trim()));
    const keysToPurge: string[] = [];
    targets.forEach(t => {
      if (t.id) { keysToPurge.push(t.id); keysToPurge.push(t.id.toLowerCase().trim()); }
    });
    ids.forEach(id => {
      const matchingTarget = targets.find(t => (t.code || "").toLowerCase().trim() === id);
      if (matchingTarget && matchingTarget.id) {
        keysToPurge.push(matchingTarget.id);
        keysToPurge.push(matchingTarget.id.toLowerCase().trim());
      } else {
        keysToPurge.push(id);
        keysToPurge.push(id.toLowerCase().trim());
      }
    });

    // 1. Purge from recent edits
    keysToPurge.forEach(k => clearRecentEdit(k));

    // 2. Add to persistent blacklist & purge overrides
    try {
      const deletedArr: string[] = JSON.parse(localStorage.getItem("alm_deleted_properties") || "[]");
      const delSet = new Set(deletedArr);
      keysToPurge.forEach(k => delSet.add(k));
      localStorage.setItem("alm_deleted_properties", JSON.stringify(Array.from(delSet)));

      const overrides = JSON.parse(localStorage.getItem("alm_property_overrides") || "{}");
      keysToPurge.forEach(k => { delete overrides[k]; });
      localStorage.setItem("alm_property_overrides", JSON.stringify(overrides));
    } catch {}

    // 3. Update React State
    let nextProperties: Property[] = [];
    setProperties(prev => {
      const delSet = getDeletedPropertyIds();
      nextProperties = prev.filter(x => !isPropertyDeleted(x, delSet));
      writeCache({
        regions,
        types: propertyTypes,
        properties: nextProperties,
        settings,
      });
      return nextProperties;
    });

    // 4. Update IndexedDB cache
    savePropertiesToIndexedDb(nextProperties).catch(() => {});

    // 5. Delete from Supabase
    await supabaseService.bulkDeleteProperties(ids).catch(() => {});
    for (const t of targets) {
      if (t.id) supabaseService.deleteProperty(t.id).catch(() => {});
      if (t.code) supabaseService.deleteProperty(t.code).catch(() => {});
    }

    // 6. Delete all target folders and images from Cloudinary
    targets.forEach(t => {
      const propFolder = getPropertyCloudinaryFolder(t.regionId, t.code);
      void deleteFolderFromCloudinary(propFolder);
      if (Array.isArray(t.images)) {
        t.images.forEach(img => {
          if (img && img.includes("cloudinary.com")) {
            void deleteFromCloudinary(img);
          }
        });
      }
    });

    ids.forEach(id => sendRealtimeSync("PROPERTY_DELETE", { propertyId: id }));
    logActivity({
      action: "deleted",
      entityType: "property",
      title: `حذف مجمّع لـ (${ids.length}) عقارات دفعة واحدة`,
    });
  };

  const bulkUpdateProperties = async (ids: string[], updates: Partial<Property>) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids.map(x => (x || "").toLowerCase().trim()));
    const nowIso = new Date().toISOString();
    const updatedProps: Property[] = [];

    setProperties(prev => {
      const next = prev.map(p => {
        if (idSet.has((p.id || "").toLowerCase().trim()) || idSet.has((p.code || "").toLowerCase().trim())) {
          const item = { ...p, ...updates, updatedAt: nowIso };
          recordRecentEdit(item);
          updatedProps.push(item);
          return item;
        }
        return p;
      });
      writeCache({ regions, types: propertyTypes, properties: next, settings });
      return next;
    });

    for (const up of updatedProps) {
      await supabaseService.saveProperty(up).catch(() => {});
      sendRealtimeSync("PROPERTY_UPDATE", { property: up });
    }

    logActivity({
      action: "updated",
      entityType: "property",
      title: `تعديل مجمّع لـ (${ids.length}) عقارات`,
    });
  };

  const resetAllProperties = async () => {
    // 1. Wipe React state
    setProperties([]);
    // 2. Clear IndexedDB
    await clearPropertiesFromIndexedDb().catch(() => {});
    // 3. Clear all storage and caches
    try {
      localStorage.removeItem("alm_properties");
      localStorage.removeItem("alm_recent_property_edits");
      localStorage.removeItem("alm_deleted_properties");
      localStorage.removeItem("alm_property_overrides");
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem("alm_platform_reset_flag", "true");
    } catch {}
    // 4. Wipe Supabase properties table
    await supabaseService.clearAllProperties().catch(() => {});
    // 5. Broadcast to all clients
    sendRealtimeSync("PROPERTY_DELETE_ALL", {});
    writeCache({ regions, types: propertyTypes, properties: [], settings });
    logActivity({
      action: "deleted",
      entityType: "system",
      title: "إعادة ضبط المنصة وحذف جميع العقارات والبيانات",
    });
    return true;
  };

  const importProperties = async (items: Omit<Property, "id" | "createdAt">[]) => {
    let added = 0;
    let updated = 0;
    const payload: Property[] = [];
    const nowIso = new Date().toISOString();

    setProperties(prev => {
      const next = [...prev];
      const indexByCode = new Map<string, number>();
      next.forEach((p, i) => { if (p.code) indexByCode.set(p.code.toUpperCase().trim(), i); });
      for (const item of items) {
        const code = (item.code || genCode()).toUpperCase().trim();
        const existingIdx = code ? indexByCode.get(code) : undefined;
        if (existingIdx !== undefined) {
          const existing = next[existingIdx];
          const merged: Property = {
            ...existing,
            ...item,
            code,
            // Preserve existing photos if imported item has no photos
            images: (Array.isArray(item.images) && item.images.length > 0) ? item.images : (existing.images || []),
            // Preserve specific existing metadata if imported row had empty values
            unitType: item.unitType || existing.unitType || "",
            floorText: item.floorText || existing.floorText || "",
            master: item.master || existing.master || "",
            elevator: item.elevator || existing.elevator || "",
            floors: item.floors || existing.floors || 0,
            location: item.location || existing.location || "",
            updatedAt: nowIso,
          };
          next[existingIdx] = merged;
          payload.push(merged);
          updated++;
        } else {
          const created: Property = { ...item, code, id: genId(), createdAt: nowIso, updatedAt: nowIso };
          indexByCode.set(code, next.length);
          next.push(created);
          payload.push(created);
          added++;
        }
      }

      // Update offline persistence layers
      try {
        localStorage.removeItem("alm_platform_reset_flag");
        savePropertiesToIndexedDb(next).catch(() => {});
        writeCache({ regions, types: propertyTypes, properties: next, settings });
      } catch {}

      return next;
    });

    // Save directly to Supabase cloud in batches
    if (payload.length > 0) {
      try {
        await supabaseService.savePropertiesBulk(payload);
      } catch (e) {
        console.warn("[DataContext] Supabase bulk save error:", e);
      }
    }

    logActivity({
      action: "imported",
      entityType: "property",
      title: `استيراد بيانات عقارات (تمت إضافة ${added} وتحديث ${updated})`,
    });
    return { added, updated };
  };

  const addUser = async (u: Omit<User, "id" | "joinedAt">) => {
    const finalEmail = u.email.trim().toLowerCase();
    const finalUsername = (u.username?.trim() || finalEmail.split("@")[0] || u.name.trim().replace(/\s+/g, "_")).toLowerCase();
    const finalPassword = u.password || "123456";

    const newUser: User = {
      ...u,
      name: u.name.trim(),
      email: finalEmail,
      username: finalUsername,
      password: finalPassword,
      id: genId(),
      joinedAt: new Date().toISOString(),
    };

    // Check duplicate email / username locally
    const duplicate = users.find(
      existing =>
        (existing.email && existing.email.toLowerCase() === finalEmail) ||
        (existing.username && existing.username.toLowerCase() === finalUsername)
    );
    if (duplicate) {
      toast({
        title: "تعذّرت إضافة المستخدم",
        description: "البريد الإلكتروني أو اسم المستخدم مستخدم من قبل.",
        variant: "destructive",
      });
      return false;
    }

    setUsers(prev => {
      const updated = [...prev, newUser];
      try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
      return updated;
    });

    supabaseService.saveUser(newUser).catch(() => {});
    sendRealtimeSync("USER_ADD", { user: newUser });
    logActivity({
      action: "created",
      entityType: "user",
      title: `إضافة مستخدم جديد (${newUser.name} - ${newUser.role})`,
    });

    try {
      const saved = await api.post<User>("/users", { ...newUser });
      if (saved && saved.id) {
        setUsers(prev => {
          const updated = prev.map(x => (x.id === newUser.id ? { ...saved, password: finalPassword } : x));
          try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      return true;
    } catch (err: unknown) {
      console.warn("Server sync warning (user saved in client cache & Supabase):", err);
      return true;
    }
  };

  const updateUser = async (id: string, u: Partial<User>) => {
    let targetUser: User | null = null;
    setUsers(prev => {
      const updated = prev.map(x => {
        if (x.id === id) {
          targetUser = { ...x, ...u };
          return targetUser;
        }
        return x;
      });
      try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (targetUser) {
      supabaseService.saveUser(targetUser).catch(() => {});
      sendRealtimeSync("USER_UPDATE", { user: targetUser });
    }

    logActivity({
      action: "updated",
      entityType: "user",
      title: `تعديل بيانات المستخدم (${u.name || (targetUser as any)?.name || id})`,
    });

    try {
      await api.patch(`/users/${id}`, u);
      return true;
    } catch (err) {
      console.warn("Server sync warning (user updated in client cache):", err);
      return true;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem("alm_deleted_users") || "[]");
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem("alm_deleted_users", JSON.stringify(deletedList));
      }
    } catch {}

    setUsers(prev => {
      const updated = prev.filter(x => x.id !== id);
      try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
      return updated;
    });

    supabaseService.deleteUser(id).catch(() => {});
    sendRealtimeSync("USER_DELETE", { userId: id });
    logActivity({
      action: "deleted",
      entityType: "user",
      title: `حذف المستخدم (${id})`,
    });

    try {
      await api.del(`/users/${id}`);
      return true;
    } catch (err) {
      console.warn("Server sync warning (user deleted from client cache):", err);
      return true;
    }
  };

  const toggleUser = async (id: string) => {
    let targetUser: User | null = null;
    setUsers(prev => {
      const updated = prev.map(x => {
        if (x.id === id) {
          targetUser = { ...x, active: !x.active };
          return targetUser;
        }
        return x;
      });
      try { localStorage.setItem("alm_users", JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (targetUser) {
      supabaseService.saveUser(targetUser).catch(() => {});
    }

    logActivity({
      action: "status",
      entityType: "user",
      title: `تغيير حالة تفعيل المستخدم (${(targetUser as any)?.name || id}) إلى ${(targetUser as any)?.active ? "مفعل" : "معطل"}`,
    });

    try {
      await api.patch(`/users/${id}`, { active: (targetUser as any)?.active });
      return true;
    } catch (err) {
      console.warn("Server sync warning (user toggled in client cache):", err);
      return true;
    }
  };

  const addInquiry = (i: Omit<Inquiry, "id" | "createdAt" | "status">) => {
    const inquiry: Inquiry = { ...i, id: genId(), status: "new", createdAt: new Date().toISOString() };
    setInquiries(p => [...p, inquiry]);
    try {
      const stored = JSON.parse(localStorage.getItem("alm_inquiries") || "[]");
      localStorage.setItem("alm_inquiries", JSON.stringify([inquiry, ...stored]));
    } catch {}
    logActivity({
      action: "created",
      entityType: "inquiry",
      title: `استفسار جديد من العميل (${inquiry.name}) بخصوص ${inquiry.subject || "خدمات الشركة"}`,
      actor: inquiry.name,
    });
    persist(api.post("/inquiries", inquiry), {
      type: "inquiry",
      endpoint: "/inquiries",
      method: "POST",
      payload: inquiry,
    });
  };

  const updateInquiryStatus = (id: string, status: Inquiry["status"]) => {
    setInquiries(p => p.map(x => x.id === id ? { ...x, status } : x));
    logActivity({
      action: "status",
      entityType: "inquiry",
      title: `تحديث حالة استفسار العميل (${id}) إلى (${status})`,
    });
    persist(api.patch(`/inquiries/${id}`, { status }));
  };

  const deleteInquiry = (id: string) => {
    setInquiries(p => p.filter(x => x.id !== id));
    logActivity({
      action: "deleted",
      entityType: "inquiry",
      title: `حذف استفسار العميل (${id})`,
    });
    persist(api.del(`/inquiries/${id}`));
  };

  const addFinishingRequest = (r: Omit<FinishingRequest, "id" | "createdAt" | "status">) => {
    const fr: FinishingRequest = { ...r, id: genId(), status: "new", createdAt: new Date().toISOString() };
    setFinishingRequests(p => [...p, fr]);
    try {
      const stored = JSON.parse(localStorage.getItem("alm_finishing_requests") || "[]");
      localStorage.setItem("alm_finishing_requests", JSON.stringify([fr, ...stored]));
    } catch {}
    logActivity({
      action: "created",
      entityType: "finishing_request",
      title: `طلب تشطيب جديد من العميل (${fr.name}) - ${fr.finishingType || "باقة تشطيب"}`,
      actor: fr.name,
    });
    persist(api.post("/finishing-requests", fr), {
      type: "finishing_request",
      endpoint: "/finishing-requests",
      method: "POST",
      payload: fr,
    });
  };

  const updateFinishingRequestStatus = (id: string, status: FinishingRequest["status"]) => {
    setFinishingRequests(p => p.map(x => x.id === id ? { ...x, status } : x));
    logActivity({
      action: "status",
      entityType: "finishing_request",
      title: `تحديث حالة طلب التشطيب (${id}) إلى (${status})`,
    });
    persist(api.patch(`/finishing-requests/${id}`, { status }));
  };

  const deleteFinishingRequest = (id: string) => {
    setFinishingRequests(p => p.filter(x => x.id !== id));
    logActivity({
      action: "deleted",
      entityType: "finishing_request",
      title: `حذف طلب التشطيب (${id})`,
    });
    persist(api.del(`/finishing-requests/${id}`));
  };

  const addPropertyRequest = (r: Omit<PropertyRequest, "id" | "createdAt" | "status">) => {
    const pr: PropertyRequest = { ...r, id: genId(), status: "new", createdAt: new Date().toISOString() };
    setPropertyRequests(p => [...p, pr]);
    try {
      const stored = JSON.parse(localStorage.getItem("alm_property_requests") || "[]");
      localStorage.setItem("alm_property_requests", JSON.stringify([pr, ...stored]));
    } catch {}
    logActivity({
      action: "created",
      entityType: "property_request",
      title: `طلب إضافة عقار جديد من العميل (${pr.ownerName})`,
      actor: pr.ownerName,
    });
    persist(api.post("/property-requests", pr), {
      type: "property_request",
      endpoint: "/property-requests",
      method: "POST",
      payload: pr,
    });
  };

  const updatePropertyRequestStatus = (id: string, status: PropertyRequest["status"]) => {
    setPropertyRequests(p => p.map(x => x.id === id ? { ...x, status } : x));
    logActivity({
      action: "status",
      entityType: "property_request",
      title: `تحديث حالة طلب إضافة عقار (${id}) إلى (${status})`,
    });
    persist(api.patch(`/property-requests/${id}`, { status }));
  };

  const deletePropertyRequest = (id: string) => {
    setPropertyRequests(p => p.filter(x => x.id !== id));
    logActivity({
      action: "deleted",
      entityType: "property_request",
      title: `حذف طلب إضافة عقار (${id})`,
    });
    persist(api.del(`/property-requests/${id}`));
  };

  const addCustomerPropertyRequest = async (request: Omit<CustomerPropertyRequest, "id" | "createdAt" | "status">) => {
    const item: CustomerPropertyRequest = {
      ...request,
      id: genId(),
      status: "new",
      createdAt: new Date().toISOString(),
    };
    setCustomerPropertyRequests((current) => [item, ...current]);
    try {
      const stored = JSON.parse(localStorage.getItem("alm_customer_requests") || "[]");
      localStorage.setItem("alm_customer_requests", JSON.stringify([item, ...stored]));
    } catch {}
    logActivity({
      action: "created",
      entityType: "customer_property_request",
      title: `طلب عقار جديد من العميل (${item.customerName})`,
      actor: item.customerName,
    });
    if (!isOnline()) {
      enqueueOfflineAction({
        type: "customer_property_request",
        endpoint: "/customer-property-requests",
        method: "POST",
        payload: request,
      });
      toast({
        title: "تم الحفظ في وضع الأوفلاين 📶",
        description: "تم حفظ طلبك محلياً وسيتم إرساله ومزامنته تلقائياً عند عودة الإنترنت.",
      });
      return true;
    }
    try {
      const saved = await api.post<CustomerPropertyRequest>("/customer-property-requests", request);
      setCustomerPropertyRequests((current) => current.map((entry) => entry.id === item.id ? saved : entry));
      return true;
    } catch (err: unknown) {
      if (!isOnline() || (err && typeof err === "object" && "status" in err && (err as any).status === 503)) {
        enqueueOfflineAction({
          type: "customer_property_request",
          endpoint: "/customer-property-requests",
          method: "POST",
          payload: request,
        });
        toast({
          title: "تم الحفظ في وضع الأوفلاين 📶",
          description: "تم حفظ طلبك محلياً وسيتم إرساله ومزامنته تلقائياً عند عودة الإنترنت.",
        });
        return true;
      }
      setCustomerPropertyRequests((current) => current.filter((entry) => entry.id !== item.id));
      const apiError = err as { status?: number; message?: string };
      toast({
        title: "تعذّر حفظ الطلب",
        description: apiError.status === 401 ? "انتهت جلسة الدخول. سجّل الدخول مرة أخرى." : apiError.message || "تعذّر حفظ التغيير على الخادم",
        variant: "destructive",
      });
      void reload();
      return false;
    }
  };

  const updateCustomerPropertyRequest = (id: string, request: Partial<Omit<CustomerPropertyRequest, "id" | "createdAt">>) => {
    setCustomerPropertyRequests((current) => current.map((item) => item.id === id ? { ...item, ...request } : item));
    logActivity({
      action: "updated",
      entityType: "customer_property_request",
      title: `تحديث بيانات طلب العميل (${id})`,
    });
    return persist(api.patch(`/customer-property-requests/${id}`, request));
  };

  const deleteCustomerPropertyRequest = (id: string) => {
    setCustomerPropertyRequests((current) => current.filter((item) => item.id !== id));
    logActivity({
      action: "deleted",
      entityType: "customer_property_request",
      title: `حذف طلب العميل (${id})`,
    });
    persist(api.del(`/customer-property-requests/${id}`));
  };

  const addContract = async (contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "contractNumber"> & { contractNumber?: string }) => {
    try {
      const saved = await api.post<Contract>("/contracts", contract);
      setContracts((current) => [saved, ...current]);
      logActivity({
        action: "created",
        entityType: "contract",
        title: `إنشاء عقد جديد (${saved.contractNumber || "عقد"})`,
      });
      return true;
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      toast({
        title: "تعذّر حفظ العقد",
        description: apiError.status === 401 ? "انتهت جلسة الدخول. سجّل الدخول مرة أخرى." : apiError.message || "تعذّر حفظ العقد على الخادم",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateContract = async (id: string, contract: Partial<Omit<Contract, "id" | "createdAt" | "updatedAt">>) => {
    try {
      const saved = await api.patch<Contract>(`/contracts/${id}`, contract);
      setContracts((current) => current.map((item) => item.id === id ? saved : item));
      logActivity({
        action: "updated",
        entityType: "contract",
        title: `تعديل العقد (${saved.contractNumber || id})`,
      });
      return true;
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      toast({
        title: "تعذّر تحديث العقد",
        description: apiError.status === 401 ? "انتهت جلسة الدخول. سجّل الدخول مرة أخرى." : apiError.message || "تعذّر تحديث العقد على الخادم",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteContract = async (id: string) => {
    try {
      await api.del(`/contracts/${id}`);
      setContracts((current) => current.filter((item) => item.id !== id));
      logActivity({
        action: "deleted",
        entityType: "contract",
        title: `حذف العقد (${id})`,
      });
      return true;
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      toast({
        title: "تعذّر حذف العقد",
        description: apiError.status === 401 ? "انتهت جلسة الدخول. سجّل الدخول مرة أخرى." : apiError.message || "تعذّر حذف العقد على الخادم",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAiLeadStatus = (id: string, status: AiLead["status"]) => {
    setAiLeads(p => p.map(x => x.id === id ? { ...x, status } : x));
    logActivity({
      action: "status",
      entityType: "inquiry",
      title: `تحديث حالة عميل المستشار الذكي (${id}) إلى (${status})`,
    });
    persist(api.patch(`/ai/leads/${id}`, { status }));
  };

  const deleteAiLead = (id: string) => {
    setAiLeads(p => p.filter(x => x.id !== id));
    logActivity({
      action: "deleted",
      entityType: "inquiry",
      title: `حذف عميل المستشار الذكي (${id})`,
    });
    persist(api.del(`/ai/leads/${id}`));
  };

  const addTiktokVideo = (v: Omit<TiktokVideo, "id">) => {
    logActivity({
      action: "created",
      entityType: "tiktok",
      title: `إضافة فيديو تيك توك جديد (${v.title || "فيديو"})`,
    });
    return updateSettings({ tiktokVideos: [...(settings.tiktokVideos ?? []), { ...v, id: genId() }] });
  };

  const updateTiktokVideo = (id: string, v: Partial<Omit<TiktokVideo, "id">>) => {
    logActivity({
      action: "updated",
      entityType: "tiktok",
      title: `تعديل فيديو تيك توك (${id})`,
    });
    return updateSettings({ tiktokVideos: (settings.tiktokVideos ?? []).map(x => x.id === id ? { ...x, ...v } : x) });
  };

  const deleteTiktokVideo = (id: string) => {
    logActivity({
      action: "deleted",
      entityType: "tiktok",
      title: `حذف فيديو تيك توك (${id})`,
    });
    return updateSettings({ tiktokVideos: (settings.tiktokVideos ?? []).filter(x => x.id !== id) });
  };

  // ── إدارة الإعلانات — routes مخصصة مع activity logging ─────────────────────
  const addAd = (a: Omit<Ad, "id">) => {
    const newAd: Ad = { ...a, id: genId(), views: 0, clicks: 0 };
    setSettings(prev => ({ ...prev, ads: [...(prev.ads ?? []), newAd] }));
    logActivity({
      action: "created",
      entityType: "ad",
      title: `إضافة إعلان جديد (${newAd.title || "إعلان تسويقي"})`,
    });
    persist(api.post("/ads/manage", newAd));
  };

  const updateAd = (id: string, a: Partial<Omit<Ad, "id">>) => {
    setSettings(prev => ({
      ...prev,
      ads: (prev.ads ?? []).map(x => x.id === id ? { ...x, ...a } : x),
    }));
    logActivity({
      action: "updated",
      entityType: "ad",
      title: `تعديل إعلان (${id})`,
    });
    persist(api.patch(`/ads/manage/${id}`, a));
  };

  const deleteAd = (id: string) => {
    setSettings(prev => ({ ...prev, ads: (prev.ads ?? []).filter(x => x.id !== id) }));
    logActivity({
      action: "deleted",
      entityType: "ad",
      title: `حذف إعلان (${id})`,
    });
    persist(api.del(`/ads/manage/${id}`));
  };

  // إعادة ترتيب الإعلانات دفعةً واحدة
  const reorderAds = (ordered: Ad[]) => {
    const reordered = ordered.map((a, i) => ({ ...a, order: i + 1 }));
    setSettings(prev => {
      const orderedIds = new Set(reordered.map(a => a.id));
      const unchanged  = (prev.ads ?? []).filter(a => !orderedIds.has(a.id));
      return { ...prev, ads: [...reordered, ...unchanged] };
    });
    persist(api.patch("/ads/manage/reorder", { ordered: reordered }));
  };

  // تتبّع المشاهدات والنقرات
  const trackAdView = useCallback((id: string, payload?: Record<string, unknown>) => {
    setSettings(prev => ({
      ...prev,
      ads: (prev.ads ?? []).map(x => x.id === id ? { ...x, views: (x.views ?? 0) + 1 } : x),
    }));
    void api.post(`/ads/${id}/view`, payload ?? {}).catch(() => { /* best-effort */ });
  }, []);

  const trackAdClick = useCallback((id: string, payload?: Record<string, unknown>) => {
    setSettings(prev => ({
      ...prev,
      ads: (prev.ads ?? []).map(x => x.id === id ? { ...x, clicks: (x.clicks ?? 0) + 1 } : x),
    }));
    void api.post(`/ads/${id}/click`, payload ?? {}).catch(() => { /* best-effort */ });
  }, []);

  return (
    <DataContext.Provider value={{
      ready, fetching, reload,
       regions, propertyTypes, properties, users, inquiries, finishingRequests, propertyRequests, aiLeads, customerPropertyRequests, contracts, activityLogs, settings,
      visitorStats,
      trackPropertyView, refreshVisitorStats,
      updateSettings,
    updateHomeBackground,
      reloadAiLeads, updateAiLeadStatus, deleteAiLead,
      addRegion, updateRegion, deleteRegion, toggleRegion,
      addPropertyType, updatePropertyType, deletePropertyType, togglePropertyType,
      addProperty, updateProperty, deleteProperty, bulkDeleteProperties, bulkUpdateProperties, importProperties,
      addUser, updateUser, deleteUser, toggleUser,
      addInquiry, updateInquiryStatus, deleteInquiry,
      addFinishingRequest, updateFinishingRequestStatus, deleteFinishingRequest,
      addPropertyRequest, updatePropertyRequestStatus, deletePropertyRequest,
      addCustomerPropertyRequest, updateCustomerPropertyRequest, deleteCustomerPropertyRequest,
      addContract, updateContract, deleteContract,
      brokers, addBroker, updateBroker, deleteBroker,
      addTiktokVideo, updateTiktokVideo, deleteTiktokVideo,
      addAd, updateAd, deleteAd, reorderAds, trackAdView, trackAdClick,
      logActivity, clearActivityLogs, resetAllProperties,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
