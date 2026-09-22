/**
 * Client-side High Performance Image Compression & Optimization Utility
 * Converts large multi-megabyte photos into ultra-compact, high-quality WebP/JPEG data.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: string;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const { maxWidth = 1000, maxHeight = 1000, quality = 0.76 } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("الملف المحدد ليس صورة صالحة"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة ملف الصورة"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذر تحميل بيانات الصورة"));
      img.onload = () => {
        try {
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(e.target?.result as string);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          let resultDataUrl = canvas.toDataURL("image/webp", quality);
          if (!resultDataUrl.startsWith("data:image/webp")) {
            resultDataUrl = canvas.toDataURL("image/jpeg", quality);
          }

          resolve(resultDataUrl);
        } catch (err) {
          resolve(e.target?.result as string);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export async function compressMultipleImages(
  files: FileList | File[],
  maxCount = 20,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const fileArray = Array.from(files).slice(0, maxCount);
  const total = fileArray.length;
  const results: string[] = [];

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    try {
      const compressed = await compressImage(file);
      results.push(compressed);
    } catch (err) {
      console.warn("Failed to compress image, skipping:", err);
    }
    if (onProgress) onProgress(i + 1, total);
  }

  return results;
}
