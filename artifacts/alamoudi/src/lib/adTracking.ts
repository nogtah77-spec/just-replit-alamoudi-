// أدوات تتبع الإعلانات — تجمع بيانات الجهاز والمتصفح والمصدر تلقائياً
import { getVisitorId } from "./visitorTracking";

// ─── كشف الجهاز ────────────────────────────────────────────────────────────

export function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return "mobile";
  return "desktop";
}

// ─── كشف المتصفح ───────────────────────────────────────────────────────────

export function detectBrowser(ua: string): string {
  if (/SamsungBrowser/i.test(ua))  return "Samsung Internet";
  if (/OPR|Opera/i.test(ua))       return "Opera";
  if (/YaBrowser/i.test(ua))       return "Yandex";
  if (/UCBrowser/i.test(ua))       return "UC Browser";
  if (/Edg/i.test(ua))             return "Edge";
  if (/Chrome/i.test(ua))          return "Chrome";
  if (/Firefox/i.test(ua))         return "Firefox";
  if (/Safari/i.test(ua))          return "Safari";
  if (/MSIE|Trident/i.test(ua))    return "Internet Explorer";
  return "Other";
}

// ─── كشف نظام التشغيل ──────────────────────────────────────────────────────

export function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua))   return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua))      return "Android";
  if (/Mac OS X/i.test(ua))     return "macOS";
  if (/Linux/i.test(ua))        return "Linux";
  if (/CrOS/i.test(ua))         return "Chrome OS";
  return "Other";
}

// ─── تصنيف مصدر الزيارة ────────────────────────────────────────────────────

export type ReferrerType = "direct" | "internal" | "search" | "social" | "external";

const SEARCH_ENGINES  = /google|bing|yahoo|duckduckgo|baidu|yandex|ask\.com/i;
const SOCIAL_NETWORKS = /facebook|instagram|tiktok|twitter|x\.com|youtube|snapchat|linkedin|pinterest|whatsapp/i;

export function classifyReferrer(referrer: string, currentOrigin: string): ReferrerType {
  if (!referrer) return "direct";
  try {
    const ref = new URL(referrer);
    if (ref.origin === currentOrigin) return "internal";
    if (SEARCH_ENGINES.test(ref.hostname))  return "search";
    if (SOCIAL_NETWORKS.test(ref.hostname)) return "social";
    return "external";
  } catch {
    return "direct";
  }
}

// ─── الحزمة الكاملة لبيانات حدث إعلاني ────────────────────────────────────

export interface AdEventPayload {
  sessionId:    string;
  deviceType:   "mobile" | "tablet" | "desktop";
  browser:      string;
  os:           string;
  screenWidth:  number;
  screenHeight: number;
  language:     string;
  referrer:     string;
  referrerType: ReferrerType;
  referrerPage: string; // الصفحة الحالية — لمعرفة مصدر المشاهدة داخل المنصة
}

export function buildEventPayload(): AdEventPayload {
  const ua = navigator.userAgent;
  return {
    sessionId:    getVisitorId(),
    deviceType:   detectDevice(ua),
    browser:      detectBrowser(ua),
    os:           detectOS(ua),
    screenWidth:  window.screen.width,
    screenHeight: window.screen.height,
    language:     navigator.language || "unknown",
    referrer:     document.referrer,
    referrerType: classifyReferrer(document.referrer, window.location.origin),
    referrerPage: window.location.pathname,
  };
}
