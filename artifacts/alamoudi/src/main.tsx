import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker handling: active only in production to prevent caching issues during local dev
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.update().catch(() => {});
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      }).catch(() => {});
    });
  } else {
    // In dev mode, unregister any active service worker and clear caches
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        reg.unregister();
      }
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
