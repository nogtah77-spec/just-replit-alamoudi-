import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnlineStatus, processOfflineQueue } from "@/lib/offlineSync";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function OfflineStatusBar() {
  const { online, pendingCount } = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (online) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      void handleSync();
      return () => clearTimeout(timer);
    } else {
      setShowReconnected(false);
      return;
    }
  }, [online]);

  const handleSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await processOfflineQueue(async (endpoint, opts) => {
        if (opts.method === "POST") return api.post(endpoint, opts.body ? JSON.parse(opts.body) : {});
        if (opts.method === "PUT") return api.put(endpoint, opts.body ? JSON.parse(opts.body) : {});
        if (opts.method === "DELETE") return api.del(endpoint);
        return api.get(endpoint);
      });
    } catch {}
    setSyncing(false);
  };

  if (online && !showReconnected && pendingCount === 0) {
    return null;
  }

  if (showReconnected && pendingCount === 0) {
    return (
      <aside aria-label="حالة الاتصال بالإنترنت" className="fixed bottom-4 left-4 z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 bg-emerald-700 text-white px-3.5 py-2 rounded-full shadow-lg border border-emerald-500/40 text-xs font-semibold backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          <span>تمت استعادة الاتصال بالإنترنت ✓</span>
        </div>
      </aside>
    );
  }

  if (!online) {
    return (
      <aside aria-label="تنبيه انقطاع الاتصال بالإنترنت" className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-4 z-[9999] animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 bg-amber-950/95 text-amber-100 px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-500/40 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-amber-500/20 text-amber-300 shrink-0 animate-pulse">
              <WifiOff className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-amber-200">الوضع غير المتصل (أوفلاين)</span>
              <span className="text-[11px] text-amber-300/90">
                كافة العقارات المحفوظة متاحة للتصفح
                {pendingCount > 0 ? (" • (" + pendingCount + " طلبات بانتظار المزامنة)") : ""}
              </span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (online && pendingCount > 0) {
    return (
      <aside aria-label="مزامنة البيانات المحفوظة" className="fixed bottom-4 left-4 z-[9999] animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="flex items-center gap-3 bg-blue-950/95 text-blue-100 px-4 py-2 rounded-2xl shadow-xl border border-blue-500/40 text-xs backdrop-blur-md">
          <span>يوجد {pendingCount} طلبات محفوظة بانتظار المزامنة</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-500 text-white border-blue-400/50"
          >
            <RefreshCw className={"h-3 w-3 ml-1.5 " + (syncing ? "animate-spin" : "")} />
            {syncing ? "جارٍ المزامنة..." : "مزامنة الآن"}
          </Button>
        </div>
      </aside>
    );
  }

  return null;
}
