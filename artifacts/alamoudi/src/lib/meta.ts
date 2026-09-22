/**
 * Dynamic OpenGraph and Meta Tag manager for client-side pages
 */

export interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
}

export function updatePageMeta({
  title,
  description,
  image,
  url = typeof window !== "undefined" ? window.location.href : "",
  type = "website",
}: PageMetaOptions) {
  if (typeof document === "undefined") return;

  const finalTitle = (title || "الرئيسية | العمودي للتسويق العقاري").trim();
  document.title = finalTitle;

  const defaultDesc = "شريكك الموثوق في عالم العقارات الفاخرة. نقدم لك أفضل الفرص الاستثمارية في مصر.";
  const finalDesc = description || defaultDesc;

  // Helper to set or create meta tag
  const setMeta = (nameOrProperty: string, value: string, isProperty = false) => {
    const selector = isProperty ? `meta[property="${nameOrProperty}"]` : `meta[name="${nameOrProperty}"]`;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      if (isProperty) {
        el.setAttribute("property", nameOrProperty);
      } else {
        el.setAttribute("name", nameOrProperty);
      }
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  };

  // Standard SEO
  setMeta("description", finalDesc);

  // OpenGraph (Facebook, WhatsApp, Telegram, LinkedIn)
  setMeta("og:title", finalTitle, true);
  setMeta("og:description", finalDesc, true);
  setMeta("og:url", url, true);
  setMeta("og:type", type, true);
  setMeta("og:site_name", "العمودي للتسويق العقاري", true);

  if (image) {
    setMeta("og:image", image, true);
    setMeta("og:image:alt", finalTitle, true);
  }

  // Twitter Cards
  setMeta("twitter:card", image ? "summary_large_image" : "summary");
  setMeta("twitter:title", finalTitle);
  setMeta("twitter:description", finalDesc);
  if (image) {
    setMeta("twitter:image", image);
  }
  // Auto-sync top bar theme-color
  syncThemeColor();
}

/**
 * Dynamic Browser Top Bar & Status Bar Theme Color Synchronizer
 * Updates <meta name="theme-color">, msapplication-navbutton-color,
 * and apple-mobile-web-app-status-bar-style in real-time.
 */
export function syncThemeColor(themeId?: string, isLightMode?: boolean) {
  if (typeof document === "undefined") return;

  const currentTheme =
    themeId ||
    document.documentElement.getAttribute("data-theme") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("alm_active_theme") : null) ||
    "classic";

  const isDark =
    isLightMode === false ||
    (isLightMode === undefined && document.documentElement.classList.contains("dark")) ||
    !document.documentElement.classList.contains("light");

  // Midnight Theme: #202332 (dark) or #F8FAFC (light)
  // Charcoal Theme: #181C20 (dark) or #F8FAFC (light)
  // Classic Theme: #10202D (Midnight Blue)
  let targetColor = "#10202D";
  if (currentTheme === "midnight") {
    targetColor = isDark ? "#202332" : "#F8FAFC";
  } else if (currentTheme === "charcoal") {
    targetColor = isDark ? "#181C20" : "#F8FAFC";
  } else {
    targetColor = isDark ? "#10202D" : "#10202D";
  }

  // 1. Standard HTML5 theme-color meta tag (Chrome Android, Safari iOS, PWA Titlebar)
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", targetColor);

  // 2. Microsoft Windows PWA / Tile nav button color
  let msMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
  if (!msMeta) {
    msMeta = document.createElement("meta");
    msMeta.setAttribute("name", "msapplication-navbutton-color");
    document.head.appendChild(msMeta);
  }
  msMeta.setAttribute("content", targetColor);

  // 3. Apple iOS Safari Status Bar Style
  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleMeta) {
    appleMeta = document.createElement("meta");
    appleMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    document.head.appendChild(appleMeta);
  }
  appleMeta.setAttribute("content", isDark ? "black-translucent" : "default");
}

