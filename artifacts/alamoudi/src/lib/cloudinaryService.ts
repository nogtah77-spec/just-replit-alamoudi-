/**
 * Cloudinary Cloud Storage Service for Alamoudi Real Estate Platform
 * Uploads property images directly to Cloudinary organized by Region and Property Code.
 */

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "vis04evc",
  uploadPreset: import.meta.env.VITE_CLOUDINARY_PRESET || "h2ft0erz",
};

/**
 * Resolves a clean, standardized folder name for a region in Cloudinary.
 * Handles IDs (e.g. "shorouk", "new_heliopolis") and Arabic names (e.g. "مدينة الشروق", "هليوبوليس الجديدة").
 */
export function resolveRegionFolderName(regionIdOrName = "general"): string {
  if (!regionIdOrName || !regionIdOrName.trim()) return "general";
  const norm = regionIdOrName.trim().toLowerCase();

  // Heliopolis (هليوبوليس الجديدة)
  if (norm.includes("heliopolis") || norm.includes("هليوبوليس")) {
    return "new_heliopolis";
  }
  // Shorouk (مدينة الشروق)
  if (norm.includes("shorouk") || norm.includes("شروق")) {
    return "shorouk";
  }
  // Madinaty (مدينتي)
  if (norm.includes("madinaty") || norm.includes("مدينتي")) {
    return "madinaty";
  }
  // Wasal / Wesal (كمبوند وصال)
  if (norm.includes("wasal") || norm.includes("wesal") || norm.includes("وصال")) {
    return "wasal";
  }
  // Tagamoa / New Cairo (التجمع / القاهرة الجديدة)
  if (norm.includes("tagamoa") || norm.includes("تجمع") || norm.includes("cairo") || norm.includes("القاهرة الجديدة") || norm.includes("القاهره الجديده")) {
    return "tagamoa";
  }
  // Beit El Watan (بيت الوطن)
  if (norm.includes("beit") || norm.includes("watan") || norm.includes("الوطن")) {
    return "beit_elwatan";
  }
  // Nasr City (مدينة نصر)
  if (norm.includes("nasr") || norm.includes("نصر")) {
    return "nasr_city";
  }
  // Badr (مدينة بدر)
  if (norm.includes("badr") || norm.includes("بدر")) {
    return "badr";
  }
  // New Capital (العاصمة الإدارية)
  if (norm.includes("capital") || norm.includes("عاصمة") || norm.includes("عاصمه")) {
    return "new_capital";
  }

  // Fallback: clean Latin characters or slug
  const clean = norm.replace(/[^a-z0-9_-]/g, "_").replace(/^_+|_+$/g, "");
  return clean || "general";
}

/**
 * Builds a structured folder path for Cloudinary:
 * e.g., "alamoudi_properties/shorouk/S93"
 * or "alamoudi_properties/new_heliopolis/VS1"
 */
export function getPropertyCloudinaryFolder(regionIdOrName = "general", propertyCode = "unassigned"): string {
  const cleanRegion = resolveRegionFolderName(regionIdOrName);
  const cleanCode = (propertyCode || "unassigned").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_") || "UNASSIGNED";
  return `alamoudi_properties/${cleanRegion}/${cleanCode}`;
}

/**
 * Builds a structured folder path for Region Hero images:
 * e.g., "alamoudi_regions/madinaty"
 */
export function getRegionCloudinaryFolder(regionId = "general"): string {
  const cleanRegion = resolveRegionFolderName(regionId);
  return `alamoudi_regions/${cleanRegion}`;
}

/**
 * Folder for site-wide branding and home background images
 */
export function getBrandingCloudinaryFolder(subCategory = "home_hero"): string {
  return `alamoudi_branding/${subCategory}`;
}

/**
 * Folder for finishing gallery work showcase images
 */
export function getFinishingCloudinaryFolder(): string {
  return "alamoudi_finishing";
}

/**
 * Extracts Cloudinary public ID from a URL
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    let path = parts[1];
    // Remove transformation params like v12345/ or w_500/
    path = path.replace(/^(?:[a-z]_[^/]+\/)*v\d+\//, "");
    // Remove extension
    const dotIdx = path.lastIndexOf(".");
    return dotIdx > 0 ? path.substring(0, dotIdx) : path;
  } catch {
    return null;
  }
}

/**
 * Uploads a single file or base64 data string to Cloudinary in a specific folder
 * Returns the secure HTTPS URL.
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string,
  folder = "alamoudi_properties"
): Promise<string> {
  const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", fileOrBase64);
  formData.append("upload_preset", uploadPreset);
  if (folder) {
    formData.append("folder", folder);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${res.status}: Upload failed`;
    throw new Error(message);
  }

  const data = await res.json();
  return data.secure_url || data.url;
}

/**
 * Batch upload multiple files to Cloudinary with specific folder and progress callback
 */
export async function uploadMultipleToCloudinary(
  files: (File | Blob | string)[],
  folder = "alamoudi_properties",
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const total = files.length;
  const urls: string[] = [];

  for (let i = 0; i < total; i++) {
    const item = files[i];
    try {
      const url = await uploadToCloudinary(item, folder);
      urls.push(url);
    } catch (err) {
      console.warn(`[Cloudinary] Upload failed for item ${i + 1}, falling back:`, err);
      // If it's already a string (data URL or http), preserve it
      if (typeof item === "string") {
        urls.push(item);
      }
    }
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return urls;
}

export interface CloudinaryOptimizeOptions {
  width?: number;
  quality?: "auto" | "auto:best" | "auto:good" | "auto:eco" | "auto:low" | false;
  format?: "auto" | "webp" | "avif" | "jpg" | "png" | false;
  crop?: "limit" | "scale" | "fit" | "fill";
}

/**
 * Transforms a Cloudinary URL to include automatic format, quality, and proportional sizing.
 * Crucially preserves 100% of the natural aspect ratio without cropping (using c_limit).
 * If the URL is not from Cloudinary, it is returned untouched.
 */
export function getOptimizedCloudinaryUrl(
  url: string | null | undefined,
  options: CloudinaryOptimizeOptions = {}
): string {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const parts = url.split("/upload/");
  const baseUrl = parts[0];
  let rest = parts.slice(1).join("/upload/");

  const trans: string[] = [];
  if (options.format !== false) trans.push(`f_${options.format || "auto"}`);
  if (options.quality !== false) trans.push(`q_${options.quality || "auto"}`);
  if (options.width && options.width > 0) {
    trans.push(`w_${options.width}`);
    // c_limit maintains natural aspect ratio and never crops edges
    if (options.crop) trans.push(`c_${options.crop}`);
  }

  if (trans.length === 0) return url;

  const transStr = trans.join(",");

  // Strip any existing transformation segment before version or path
  rest = rest.replace(/^(?:(?:[a-z]_[a-zA-Z0-9_.:]+,?)+\/)+/, "");

  return `${baseUrl}/upload/${transStr}/${rest}`;
}

/**
 * For Property Cards, Grid Items, and Listings:
 * 800px max width ensures ultra-sharp display even on 2x Retina screens,
 * while preserving 100% natural proportions (never cropped by Cloudinary).
 */
export function getCardImageUrl(url: string | null | undefined): string {
  return getOptimizedCloudinaryUrl(url, { width: 800, crop: "limit" });
}

/**
 * For small preview thumbnails and navigation strips (250px max width, natural proportions).
 */
export function getThumbnailImageUrl(url: string | null | undefined): string {
  return getOptimizedCloudinaryUrl(url, { width: 250, crop: "limit" });
}

/**
 * For Property Details Gallery, Large Hero views, and Lightbox (1920px max width).
 * Delivers full crystal-clear resolution with automatic format and optimization.
 */
export function getDetailImageUrl(url: string | null | undefined): string {
  return getOptimizedCloudinaryUrl(url, { width: 1920, crop: "limit" });
}

/**
 * Computes SHA-1 hexadecimal hash using browser native Web Crypto API
 */
async function sha1Hex(str: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-1", enc.encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deletes a single image from Cloudinary directly using Cloudinary REST API
 */
export async function deleteFromCloudinary(urlOrPublicId: string): Promise<boolean> {
  if (!urlOrPublicId || typeof urlOrPublicId !== "string") return false;
  const publicId = extractCloudinaryPublicId(urlOrPublicId) || urlOrPublicId.trim();
  if (!publicId) return false;

  try {
    const res = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return Boolean(data?.success);
    }
  } catch {}

  return false;
}

/**
 * Deletes an entire folder and all its images from Cloudinary directly
 */
export async function deleteFolderFromCloudinary(folder: string): Promise<boolean> {
  if (!folder || typeof folder !== "string") return false;
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  if (!cleanFolder) return false;

  try {
    const res = await fetch("/api/cloudinary/delete-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: cleanFolder }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return Boolean(data?.success);
    }
  } catch {}

  return false;
}

