const MEDIA_CACHE = "alamoudi-media-v17";

// Install: Activate immediately without waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: Completely clean up all legacy static & data caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== MEDIA_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener for immediate skipWaiting
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SKIP_WAITING" || event.data.action === "skipWaiting")) {
    self.skipWaiting();
  }
});

// Fetch routing: STRICT NETWORK-FIRST / NETWORK-ONLY for HTML and scripts
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET & non-HTTP(S)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // 1. Navigation (HTML Pages): Strictly Network-Only to ensure zero stale chunks and instant updates
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>العمودي للتسويق العقاري</title><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="font-family:sans-serif;text-align:center;padding:50px 20px;background:#10202D;color:#fff;"><h2>لا يوجد اتصال بالإنترنت</h2><p>يرجى التحقق من اتصالك بالشبكة ثم إعادة المحاولة.</p><button onclick="window.location.reload()" style="background:#C5A059;color:#10202D;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;margin-top:16px;">إعادة المحاولة</button></body></html>`,
          { headers: { "content-type": "text/html; charset=utf-8" } }
        );
      })
    );
    return;
  }

  // 2. Scripts, Styles & Vite Chunks: Strictly Network-Only (handled by browser HTTP cache via immutable hashes)
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. API Requests: Let pass directly to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 4. Images & Media (Property photos, icons, banners): Cache-First -> Network Fallback
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif|ico)(\?.*)?$/i)
  ) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((mediaCache) => {
        return mediaCache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              mediaCache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return caches.match("/logo.png");
          });
        });
      })
    );
    return;
  }

  // 5. Default pass through
  event.respondWith(fetch(request));
});

// ==========================================
// Web Push Notifications Engine
// ==========================================

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { title: "العمودي للتسويق العقاري", body: event.data ? event.data.text() : "فرصة عقارية جديدة" };
    } catch {}
  }

  const title = data.title || "العمودي للتسويق العقاري";
  const options = {
    body: data.body || "فرصة عقارية جديدة وحصرية متاحة الآن في المنصة.",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/logo.png",
    image: data.image || undefined,
    dir: "rtl",
    lang: "ar",
    tag: data.tag || "alamoudi-property-alert",
    renotify: true,
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: "explore", title: "معاينة العرض الآن ↗" },
      { action: "close", title: "إغلاق" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
