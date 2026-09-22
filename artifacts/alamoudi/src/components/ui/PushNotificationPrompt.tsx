import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X, Sparkles, CheckCircle2 } from "lucide-react";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from "@/lib/pushNotificationService";
import { useToast } from "@/hooks/use-toast";

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isPushSupported()) return;

    // Check current permission
    const currentPerm = getNotificationPermission();
    if (currentPerm === "granted" || currentPerm === "denied") {
      return;
    }

    // Check if user dismissed recently (wait 3 days)
    const dismissedAt = localStorage.getItem("alm_push_dismissed_time");
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 3 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Delay prompt by 6 seconds so page feels natural and non-intrusive
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    const result = await requestNotificationPermission();
    setLoading(false);
    setShowPrompt(false);

    if (result === "granted") {
      toast({
        title: "تم تفعيل الإشعارات بنجاح ✓",
        description: "ستصلك الآن تنبيهات حصرية بأحدث الفرص العقارية وتحديثات الأسعار فور طرحها.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "لم يتم تفعيل الإشعارات",
        description: "يمكنك دائماً تفعيلها لاحقاً من إعدادات المتصفح لمتابعة أحدث العروض.",
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("alm_push_dismissed_time", Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-background/95 p-4 shadow-2xl backdrop-blur-xl dark:bg-card/95">
        {/* Ambient luxury accent glow */}
        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-accent/10 blur-xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted/50"
          aria-label="إغلاق التنبيه"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-1">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25 shadow-inner">
            <Bell className="h-5 w-5 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>تفعيل إشعارات الفرص الحصرية</span>
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              كن أول من يعلم عند طرح وحدات جديدة أو تخفيضات أسعار في الشروق والتجمع ومدينتي.
            </p>
          </div>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-border/40 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs h-9 gap-1.5 shadow-md shadow-accent/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {loading ? "جاري التفعيل..." : "تفعيل الإشعارات الآن"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-3"
          >
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  );
}
