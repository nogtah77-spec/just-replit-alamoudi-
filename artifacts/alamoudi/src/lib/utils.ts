import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
}

/** Removes display separators before sending a numeric value to the API. */
export function toNumericString(value: unknown) {
  return normalizeDigits(String(value ?? ""))
    .replace(/[,\s٬]/g, "")
    .replace(/[^\d.-]/g, "");
}

/** Formats a number or numeric string with standard thousands separators. */
export function formatNumber(value: unknown, locale = "en-US") {
  const raw = toNumericString(value);
  if (!raw || raw === "-" || raw === ".") return "";
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric.toLocaleString(locale) : String(value ?? "");
}

/**
 * Formats a controlled numeric input while preserving an unfinished decimal.
 * The stored form value may contain commas; call toNumericString before submit.
 */
export function formatNumericInput(value: string) {
  const normalized = normalizeDigits(value)
    .replace(/[,\s٬]/g, "")
    .replace(/[^\d.-]/g, "")
    .replace(/(?!^)-/g, "");
  if (!normalized) return "";
  const [integerPart, decimalPart] = normalized.split(".");
  const groupedInteger = (integerPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart === undefined ? groupedInteger : `${groupedInteger}.${decimalPart}`;
}

/** Formats money-like text when it is a plain numeric value, otherwise preserves its wording. */
export function formatMoneyText(value: unknown, suffix = "") {
  const formatted = formatNumber(value);
  return formatted ? `${formatted}${suffix ? ` ${suffix}` : ""}` : String(value ?? "");
}

import { ComponentType, lazy, type LazyExoticComponent } from "react";

/**
 * Robust lazy loading wrapper with automatic retry on chunk loading errors
 * (e.g. after deployments or mobile network hiccups) to guarantee 100% smooth page loads.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | T>,
  retriesLeft = 2,
  interval = 1000
): LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const tryImport = () => {
        componentImport()
          .then((module) => {
            const resolved = (module as any)?.default ? (module as { default: T }) : { default: module as T };
            resolve(resolved);
          })
          .catch((error: Error) => {
            const errorMsg = String(error?.message || "");
            const isChunkLoadError =
              error?.name === "ChunkLoadError" ||
              errorMsg.includes("Failed to fetch dynamically imported module") ||
              errorMsg.includes("Importing a module script failed") ||
              errorMsg.includes("error loading dynamically imported module");

            if (retriesLeft > 0) {
              setTimeout(() => {
                retriesLeft--;
                tryImport();
              }, interval);
            } else if (isChunkLoadError && typeof window !== "undefined") {
              const reloadKey = `chunk_reload_${window.location.pathname}`;
              const lastReload = sessionStorage.getItem(reloadKey);
              const now = Date.now();

              if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem(reloadKey, String(now));
                window.location.reload();
                return;
              }
              reject(error);
            } else {
              reject(error);
            }
          });
      };

      tryImport();
    })
  );
}

/**
 * Suppresses ghost/synthetic click and touch events across the window for a short duration (default 450ms).
 * Crucial when closing full-screen overlays, lightboxes, and modals on mobile touch devices
 * so touches on 'X' or the backdrop NEVER bleed through to underlying buttons or navigation items.
 */
export function suppressGhostClicks(durationMs = 450) {
  if (typeof window === "undefined") return;

  const killEvent = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      if ("stopImmediatePropagation" in e && typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }
    } catch {}
  };

  // Intercept events during the CAPTURE phase at the window level before they reach ANY element
  window.addEventListener("click", killEvent, { capture: true, passive: false });
  window.addEventListener("touchend", killEvent, { capture: true, passive: false });
  window.addEventListener("pointerup", killEvent, { capture: true, passive: false });

  setTimeout(() => {
    window.removeEventListener("click", killEvent, { capture: true });
    window.removeEventListener("touchend", killEvent, { capture: true });
    window.removeEventListener("pointerup", killEvent, { capture: true });
  }, durationMs);
}

