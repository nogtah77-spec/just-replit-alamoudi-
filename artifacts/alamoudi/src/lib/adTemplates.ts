// ─── Ad Template Framework ────────────────────────────────────────────────────
//
// Central configuration for ALL advertisement templates.
// Adding a new ad position = adding an entry here + referencing it in the UI.
// The public site NEVER knows about guides — they live in admin only.

export type AdTemplateKey =
  | "premium_desktop"
  | "premium_mobile"
  | "secondary_desktop"
  | "secondary_mobile";

export type AdSlotType = "premium" | "secondary";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuideZone {
  x: number; y: number; w: number; h: number;
  label: string;
  color: string;       // CSS rgba — for admin overlay
  strokeColor: string; // hex     — for PNG guide + overlay border
}

export interface AdTemplate {
  key: AdTemplateKey;
  name: string;         // human-readable e.g. "Premium Desktop"
  width: number;        // exact required upload width (px) — zero tolerance
  height: number;       // exact required upload height (px) — zero tolerance
  ratio: string;        // display label e.g. "9:2"
  breakpoint: "desktop" | "mobile"; // which <source> breakpoint serves this image
  bleed: number;        // px bleed margin on each edge
  safeInset: number;    // additional px inset from bleed edge → safe area starts at bleed+safeInset
  zones: GuideZone[];   // Logo / Title / CTA guide zones
}

// ─── Templates ───────────────────────────────────────────────────────────────
// All coordinates are in the ORIGINAL px space (width × height).
// Zones are guidelines only; designers place content wherever makes sense.

export const AD_TEMPLATES: Record<AdTemplateKey, AdTemplate> = {

  premium_desktop: {
    key: "premium_desktop",
    name: "Premium Desktop",
    width: 960, height: 138,
    ratio: "160:23",
    breakpoint: "desktop",
    bleed: 9, safeInset: 9,
    // Safe area: x=18…942, y=18…120  (bleed 9 + safeInset 9 on each side)
    zones: [
      { x: 660, y: 18,  w: 282, h: 30,  label: "Logo",  color: "rgba(147,51,234,0.18)", strokeColor: "#9333ea" },
      { x: 18,  y: 22,  w: 620, h: 76,  label: "Title", color: "rgba(59,130,246,0.12)", strokeColor: "#3b82f6" },
      { x: 660, y: 88,  w: 282, h: 32,  label: "CTA",   color: "rgba(34,197,94,0.18)",  strokeColor: "#22c55e" },
    ],
  },

  premium_mobile: {
    key: "premium_mobile",
    name: "Premium Mobile",
    width: 800, height: 204,
    ratio: "200:51",
    breakpoint: "mobile",
    bleed: 12, safeInset: 12,
    // Safe area: x=24…776, y=24…180  (bleed 12 + safeInset 12 on each side)
    zones: [
      { x: 505, y: 24,  w: 271, h: 38,  label: "Logo",  color: "rgba(147,51,234,0.18)", strokeColor: "#9333ea" },
      { x: 24,  y: 35,  w: 460, h: 107, label: "Title", color: "rgba(59,130,246,0.12)", strokeColor: "#3b82f6" },
      { x: 505, y: 142, w: 271, h: 38,  label: "CTA",   color: "rgba(34,197,94,0.18)",  strokeColor: "#22c55e" },
    ],
  },

  secondary_desktop: {
    key: "secondary_desktop",
    name: "Secondary Desktop",
    width: 960, height: 138,
    ratio: "160:23",
    breakpoint: "desktop",
    bleed: 9, safeInset: 9,
    // Safe area: x=18…942, y=18…120  (bleed 9 + safeInset 9 on each side)
    zones: [
      { x: 660, y: 18,  w: 282, h: 30,  label: "Logo",  color: "rgba(147,51,234,0.18)", strokeColor: "#9333ea" },
      { x: 18,  y: 22,  w: 620, h: 76,  label: "Title", color: "rgba(59,130,246,0.12)", strokeColor: "#3b82f6" },
      { x: 660, y: 88,  w: 282, h: 32,  label: "CTA",   color: "rgba(34,197,94,0.18)",  strokeColor: "#22c55e" },
    ],
  },

  secondary_mobile: {
    key: "secondary_mobile",
    name: "Secondary Mobile",
    width: 800, height: 204,
    ratio: "200:51",
    breakpoint: "mobile",
    bleed: 12, safeInset: 12,
    // Safe area: x=24…776, y=24…180  (bleed 12 + safeInset 12 on each side)
    zones: [
      { x: 505, y: 24,  w: 271, h: 38,  label: "Logo",  color: "rgba(147,51,234,0.18)", strokeColor: "#9333ea" },
      { x: 24,  y: 35,  w: 460, h: 107, label: "Title", color: "rgba(59,130,246,0.12)", strokeColor: "#3b82f6" },
      { x: 505, y: 142, w: 271, h: 38,  label: "CTA",   color: "rgba(34,197,94,0.18)",  strokeColor: "#22c55e" },
    ],
  },
};

// ─── Slot Map ─────────────────────────────────────────────────────────────────
// Maps each ad slot type to its desktop + mobile templates.
// To add a new slot (e.g. "sidebar"), add a template above and a key here.

export const SLOT_TEMPLATES: Record<AdSlotType, { desktop: AdTemplate; mobile: AdTemplate }> = {
  premium:   { desktop: AD_TEMPLATES.premium_desktop,   mobile: AD_TEMPLATES.premium_mobile   },
  secondary: { desktop: AD_TEMPLATES.secondary_desktop, mobile: AD_TEMPLATES.secondary_mobile },
};

// ─── PNG Template Guide Generator ────────────────────────────────────────────
// Generates a professional guide PNG at full 1:1 resolution and triggers download.
// Shows: bleed zone, safe area, Logo/Title/CTA zones with labels.

export function downloadTemplateGuide(template: AdTemplate): void {
  const W = template.width;
  const H = template.height;

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 1 ─ White canvas
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // 2 ─ Bleed zone (checkerboard-style subtle gray strips)
  const b = template.bleed;
  ctx.fillStyle = "rgba(0,0,0,0.055)";
  ctx.fillRect(0, 0, W, b);          // top
  ctx.fillRect(0, H - b, W, b);      // bottom
  ctx.fillRect(0, 0, b, H);          // left
  ctx.fillRect(W - b, 0, b, H);      // right
  // Bleed label
  ctx.save();
  ctx.fillStyle = "#aaaaaa";
  ctx.font = `${Math.max(10, Math.round(H * 0.04))}px sans-serif`;
  ctx.fillText("Bleed", b + 4, b - 4);
  ctx.restore();

  // 3 ─ Thin bleed border
  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 1;
  ctx.strokeRect(b, b, W - 2 * b, H - 2 * b);

  // 4 ─ Safe area dashed red border
  const sx = b + template.safeInset;
  const sy = b + template.safeInset;
  const sw = W - 2 * sx;
  const sh = H - 2 * sy;
  ctx.strokeStyle = "#e53e3e";
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
  ctx.setLineDash([]);
  // Safe area label
  const labelSize = Math.max(10, Math.round(H * 0.04));
  ctx.fillStyle = "#e53e3e";
  ctx.font = `bold ${labelSize}px sans-serif`;
  ctx.fillText("Safe Area", sx + 6, sy + labelSize + 2);

  // 5 ─ Guide zones
  for (const zone of template.zones) {
    // Filled rect
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    // Border
    ctx.strokeStyle = zone.strokeColor;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(zone.x + 0.75, zone.y + 0.75, zone.w - 1.5, zone.h - 1.5);
    // Label pill (simple rect — compatible with all browsers)
    const fs = Math.max(10, Math.round(H * 0.038));
    ctx.font = `bold ${fs}px sans-serif`;
    const tw   = ctx.measureText(zone.label).width;
    const ph   = fs + 6;
    const pw   = tw + 14;
    ctx.fillStyle = zone.strokeColor;
    ctx.fillRect(zone.x + 4, zone.y + 4, pw, ph);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(zone.label, zone.x + 11, zone.y + 4 + ph - 6);
  }

  // 6 ─ Dimension watermark
  const fs2 = Math.max(12, Math.round(H * 0.045));
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.font = `${fs2}px monospace`;
  const dimText = `${W} × ${H} px  ·  ${template.ratio}  ·  ${template.name}`;
  const tw2     = ctx.measureText(dimText).width;
  ctx.fillText(dimText, (W - tw2) / 2, H - Math.round(H * 0.045));

  // 7 ─ Download
  canvas.toBlob(blob => {
    if (!blob) return;
    const a  = document.createElement("a");
    a.href   = URL.createObjectURL(blob);
    a.download = `ad-guide-${template.key.replace(/_/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, "image/png");
}
