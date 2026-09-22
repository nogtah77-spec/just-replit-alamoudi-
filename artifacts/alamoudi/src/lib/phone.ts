/**
 * Normalizes a phone number to international format for wa.me links.
 * Handles common Egyptian number formats:
 *   +20 10 0000 0000  → 20100000000  ✓
 *   +20 010 0000 0000 → 20100000000  ✓ (extra 0 after country code removed)
 *   010 0000 0000     → 20100000000  ✓ (country code added)
 *   0100000000        → 20100000000  ✓
 */
export function normalizePhoneForWa(raw: string): string {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  // Local Egyptian format: starts with 0 (e.g. 0100000000)
  if (digits.startsWith("0")) {
    digits = "20" + digits.slice(1);
  }

  // Country code + local 0 format: 200xxxxxxx (e.g. +20 010...)
  if (digits.startsWith("200") && digits.length >= 12) {
    digits = "20" + digits.slice(3);
  }

  return digits;
}

/** Returns a wa.me URL for the given raw number, or null if number is empty. */
export function buildWaUrl(raw: string, message?: string): string | null {
  const normalized = normalizePhoneForWa(raw);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
