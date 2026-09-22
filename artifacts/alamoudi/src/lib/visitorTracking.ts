const STORAGE_KEY = "alamoudi_visitor_id";

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Stable per-runtime fallback so visitors in restricted-storage contexts are
// never merged into one shared ID (which would undercount every metric).
let fallbackId: string | null = null;

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    if (!fallbackId) fallbackId = makeId();
    return fallbackId;
  }
}
