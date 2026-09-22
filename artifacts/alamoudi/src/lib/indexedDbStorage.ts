/**
 * Zero-dependency Native IndexedDB Storage for Luxury Estate Hub
 * Supports storing large datasets and multi-image property galleries
 * without the 5MB browser LocalStorage quota limitation.
 */

const DB_NAME = "alm_estate_db";
const DB_VERSION = 1;
const STORE_NAME = "properties_store";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function savePropertiesToIndexedDb(properties: any[]): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get("cached_properties");
      getReq.onsuccess = () => {
        const existingData: any[] = getReq.result?.data || [];
        const existingMap = new Map<string, any>();
        existingData.forEach((p) => {
          if (p?.id) existingMap.set(p.id, p);
          if (p?.code) existingMap.set(p.code.toLowerCase().trim(), p);
        });

        // Use fresh images without accumulating legacy duplicates
        const merged = properties.map((p) => {
          const old = existingMap.get(p.id) || (p.code ? existingMap.get(p.code.toLowerCase().trim()) : null);
          const newImgs: string[] = (Array.isArray(p.images) ? p.images : []).filter((u: any) => typeof u === "string" && !u.startsWith("data:image/"));
          if (old) {
            const oldImgs: string[] = (Array.isArray(old.images) ? old.images : []).filter((u: any) => typeof u === "string" && !u.startsWith("data:image/"));
            const chosenImgs = newImgs.length > 0 ? newImgs : oldImgs;
            return { ...old, ...p, images: chosenImgs };
          }
          return { ...p, images: newImgs };
        });

        store.put({ key: "cached_properties", data: merged, timestamp: Date.now() });
      };
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function getPropertiesFromIndexedDb(): Promise<any[] | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("cached_properties");
      req.onsuccess = () => {
        db.close();
        if (req.result && Array.isArray(req.result.data) && req.result.data.length > 0) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearPropertiesFromIndexedDb(): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete("cached_properties");
      req.onsuccess = () => {
        db.close();
        resolve(true);
      };
      req.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

