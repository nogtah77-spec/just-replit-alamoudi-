import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export interface OfflineAction {
  id: string;
  type: "inquiry" | "property_request" | "finishing_request" | "customer_property_request" | "property" | "activity";
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload: any;
  createdAt: string;
  retryCount?: number;
}

const OFFLINE_QUEUE_KEY = "alm_offline_queue";

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function enqueueOfflineAction(action: Omit<OfflineAction, "id" | "createdAt">): OfflineAction {
  const newAction: OfflineAction = {
    ...action,
    id: "offline-act-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = getOfflineQueue();
  queue.push(newAction);
  saveOfflineQueue(queue);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("alm_offline_queue_changed", { detail: { count: queue.length } }));
  }

  return newAction;
}

export async function processOfflineQueue(apiCaller: (endpoint: string, options: { method: string; body?: string }) => Promise<any>): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: OfflineAction[] = [];

  for (const item of queue) {
    try {
      await apiCaller(item.endpoint, {
        method: item.method,
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });
      synced++;
    } catch (err) {
      failed++;
      const retries = (item.retryCount || 0) + 1;
      if (retries < 5) {
        remaining.push({ ...item, retryCount: retries });
      }
    }
  }

  saveOfflineQueue(remaining);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("alm_offline_queue_changed", { detail: { count: remaining.length } }));
  }

  if (synced > 0) {
    toast({
      title: "تمت المزامنة بنجاح 📶",
      description: "تم إرسال " + synced + " من الطلبات المحفوظة أثناء عدم الاتصال.",
    });
  }

  return { synced, failed };
}

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [pendingCount, setPendingCount] = useState<number>(() => getOfflineQueue().length);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast({
        title: "تمت استعادة الاتصال بالإنترنت 📶",
        description: "المنصة متصلة بالسيرفر الآن وجاهزة للمزامنة اللحظية.",
      });
    };

    const handleOffline = () => {
      setOnline(false);
      toast({
        title: "أنت تتصفح في وضع الأوفلاين ⚠️",
        description: "لا يوجد اتصال بالإنترنت. كافة العقارات والبيانات المحفوظة متاحة للتصفح.",
        variant: "destructive",
      });
    };

    const handleQueueChange = (e: Event) => {
      const custom = e as CustomEvent<{ count: number }>;
      setPendingCount(custom.detail?.count ?? getOfflineQueue().length);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("alm_offline_queue_changed", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("alm_offline_queue_changed", handleQueueChange);
    };
  }, []);

  return { online, pendingCount };
}
