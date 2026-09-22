import React from "react";
import { useTheme } from "next-themes";
import { useData, type HomeBackgroundSettings } from "@/context/DataContext";
import { getDetailImageUrl } from "@/lib/cloudinaryService";

interface HomeLuxuryBackgroundProps {
  className?: string;
  forcedTheme?: "dark" | "light";
  overrideConfig?: Partial<HomeBackgroundSettings>;
  isFixed?: boolean;
}

function getInstantBgConfig(): Partial<HomeBackgroundSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const rawBg = localStorage.getItem("alm_home_bg");
    if (rawBg) return JSON.parse(rawBg);
    const rawSettings = localStorage.getItem("alm_settings");
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed.homeBackgroundSettings) return parsed.homeBackgroundSettings;
    }
  } catch {}
  return null;
}

export function HomeLuxuryBackground({
  className = "",
  forcedTheme,
  overrideConfig,
}: HomeLuxuryBackgroundProps) {
  const { settings } = useData();
  const { resolvedTheme } = useTheme();

  const isDark = forcedTheme ? forcedTheme === "dark" : resolvedTheme === "dark";
  const instant = getInstantBgConfig();
  const hasSettingsImage = !!(settings?.homeBackgroundSettings?.bgImageDark || settings?.homeBackgroundSettings?.bgImageLight);
  const baseConfig = hasSettingsImage
    ? settings.homeBackgroundSettings
    : (instant || settings?.homeBackgroundSettings);
  const bgConfig = overrideConfig ? { ...(baseConfig || {}), ...overrideConfig } : (baseConfig || instant);

  // Simulator preview ALWAYS renders regardless of enabled flag
  const isSimulator = !!overrideConfig;
  if (!isSimulator && bgConfig && bgConfig.enabled === false) {
    return null;
  }

  // Purely custom uploaded images - ZERO default images in the entire codebase
  const bgImage = isDark
    ? (bgConfig?.bgImageDark || bgConfig?.bgImageLight || "")
    : (bgConfig?.bgImageLight || bgConfig?.bgImageDark || "");

  const overlayColor = isDark
    ? (bgConfig?.overlayColorDark || "#000000")
    : (bgConfig?.overlayColorLight || "#FFFFFF");

  const overlayOpacityPercent = isDark
    ? (bgConfig?.overlayOpacityDark ?? 30)
    : (bgConfig?.overlayOpacityLight ?? 35);

  const blurAmount = isDark
    ? (bgConfig?.blurDark ?? 0)
    : (bgConfig?.blurLight ?? 0);

  const imageOpacityPercent = isDark
    ? (bgConfig?.imageOpacityDark ?? 100)
    : (bgConfig?.imageOpacityLight ?? 100);

  const imgOpacity = Math.max(0.1, Math.min(100, imageOpacityPercent)) / 100;
  const overlayOpacity = Math.max(0, Math.min(100, overlayOpacityPercent)) / 100;

  // Locks firmly to screen viewport without mobile browser address-bar jitter
  const positionClass = isSimulator
    ? "absolute inset-0 w-full h-full z-0 pointer-events-none"
    : "fixed top-0 left-0 w-screen h-screen min-h-[100dvh] z-0 pointer-events-none transform-gpu";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden select-none ${positionClass} ${className}`}
      style={{
        transform: "translate3d(0,0,0)",
        WebkitTransform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* 1. Underlying Custom Uploaded Image Layer (renders ONLY if user uploaded a photo) */}
      {bgImage ? (
        <img
          key={bgImage}
          src={getDetailImageUrl(bgImage)}
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-300"
          style={{
            opacity: imgOpacity,
            filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
            transform: blurAmount > 0 ? "scale(1.06)" : undefined,
          }}
        />
      ) : null}

      {/* 2. Primary Solid/Translucent Color Overlay Layer */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-300 pointer-events-none"
        style={{
          backgroundColor: overlayColor,
          opacity: bgImage ? overlayOpacity : (isDark ? 0.4 : 0.05),
        }}
      />

      {/* 3. Subtle luxury vignette / gradient */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-300 pointer-events-none opacity-40"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(ellipse at top, rgba(200,169,126,0.06) 0%, rgba(10,20,30,0.6) 80%, rgba(5,10,18,0.95) 100%)"
            : "radial-gradient(ellipse at top, rgba(200,169,126,0.04) 0%, rgba(240,244,248,0.4) 80%, rgba(255,255,255,0.8) 100%)",
        }}
      />
    </div>
  );
}
