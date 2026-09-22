import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { Loader2, QrCode as QrIcon } from "lucide-react";

interface QrCodeViewProps {
  url?: string;
  imageUrl?: string;
  type?: "url" | "image";
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  alt?: string;
}

export function QrCodeView({
  url,
  imageUrl,
  type = "url",
  size = 160,
  className,
  darkColor = "#10202D",
  lightColor = "#ffffff",
  alt = "رمز الاستجابة السريعة QR",
}: QrCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type === "image" && imageUrl) {
      setDataUrl(imageUrl);
      return;
    }

    if (url && url.trim()) {
      setLoading(true);
      QRCode.toDataURL(url.trim(), {
        width: size * 2, // 2x for retina crispness
        margin: 1.5,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: "M",
      })
        .then((res) => {
          setDataUrl(res);
        })
        .catch((err) => {
          console.warn("QR generation error:", err);
          setDataUrl("");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (imageUrl) {
      setDataUrl(imageUrl);
    } else {
      setDataUrl("");
    }
  }, [url, imageUrl, type, size, darkColor, lightColor]);

  if (loading) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-xs",
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex flex-col items-center justify-center bg-muted/60 text-muted-foreground rounded-xl border border-dashed border-border p-2 text-center",
          className
        )}
      >
        <QrIcon className="h-6 w-6 mb-1 opacity-50" />
        <span className="text-[10px]">لا يوجد رابط QR</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-xl overflow-hidden bg-white p-1.5 border border-[#A9927D]/30 shadow-sm flex items-center justify-center group select-none",
        className
      )}
    >
      <img
        src={dataUrl}
        alt={alt}
        className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}
