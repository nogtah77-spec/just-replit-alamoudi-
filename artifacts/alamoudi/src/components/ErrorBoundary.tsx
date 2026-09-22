import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener("popstate", this.handleReset);
  }

  componentWillUnmount() {
    window.removeEventListener("popstate", this.handleReset);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info.componentStack, "path:", window.location.pathname);

    const errorMsg = String(error?.message || "");
    const errorStack = String(error?.stack || "");
    const isChunkOrAssetError =
      error?.name === "ChunkLoadError" ||
      errorMsg.includes("Failed to fetch dynamically imported module") ||
      errorMsg.includes("Importing a module script failed") ||
      errorMsg.includes("error loading dynamically imported module") ||
      errorMsg.includes("Unexpected token '<'") ||
      errorMsg.includes("is not valid JSON") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Load failed") ||
      errorStack.includes("assets/") ||
      errorMsg.includes("mime type");

    // Auto silent recovery for chunk load / stale asset errors caused by updates
    if (isChunkOrAssetError && typeof window !== "undefined") {
      const reloadKey = `eb_chunk_reload_${window.location.pathname}`;
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        try {
          if ("caches" in window) {
            caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
          }
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              for (const r of regs) r.unregister();
            });
          }
        } catch {}
        setTimeout(() => {
          // Force fresh fetch bypassing browser cache
          const cleanUrl = window.location.href.replace(/([?&])_r=\d+/, "");
          const sep = cleanUrl.includes("?") ? "&" : "?";
          window.location.replace(`${cleanUrl}${sep}_r=${Date.now()}`);
        }, 100);
        return;
      }
    }
  }

  handleReset = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  };

  handleReload = async () => {
    this.setState({ hasError: false, error: undefined });
    if (typeof window !== "undefined") {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }
      } catch {}
      const cleanUrl = window.location.href.replace(/([?&])_r=\d+/, "");
      const sep = cleanUrl.includes("?") ? "&" : "?";
      window.location.replace(`${cleanUrl}${sep}_r=${Date.now()}`);
    }
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center bg-background p-6" dir="rtl">
          <div className="text-center max-w-md p-6 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">جاري استعادة الصفحة بسلاسة</h1>
            <p className="text-muted-foreground mb-6 text-xs sm:text-sm leading-relaxed">
              تم تحديث بعض ملفات المنصة أو حدث انقطاع مؤقت في الاتصال. يمكنك إعادة المحاولة فوراً لفتح الصفحة.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors shadow-md"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>إعادة المحاولة</span>
              </button>
              <button
                onClick={this.handleHome}
                className="rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
