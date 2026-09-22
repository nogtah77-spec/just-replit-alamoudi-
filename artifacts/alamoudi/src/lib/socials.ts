import type { SiteSettings } from "@/context/DataContext";

export const DEFAULT_TIKTOK_URL = "https://www.tiktok.com/@alamoudi.realestate";
export const DEFAULT_TIKTOK_NAME = "Alamoudi | الـعـمـودي";

export function getTiktokUrl(settings: Pick<SiteSettings, "tiktok">): string {
  return settings.tiktok?.trim() || DEFAULT_TIKTOK_URL;
}

export function getTiktokName(settings: Pick<SiteSettings, "tiktokName">): string {
  return settings.tiktokName?.trim() || DEFAULT_TIKTOK_NAME;
}
