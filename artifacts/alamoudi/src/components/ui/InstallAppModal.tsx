import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Zap,
  WifiOff,
  Compass,
  Chrome,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(globalDeferredPrompt));
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsStandalone(true);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const handler = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
      }
      return choice.outcome === "accepted";
    }
    return false;
  };

  return { deferredPrompt, isStandalone, isIos, triggerInstall };
}

export function InstallAppModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { deferredPrompt, isIos, triggerInstall, isStandalone } = usePwaInstall();
  const [tab, setTab] = useState<"desktop" | "android" | "ios">(isIos ? "ios" : "desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isIos) setTab("ios");
  }, [isIos]);

  const handleDirectInstall = async () => {
    if (deferredPrompt) {
      const success = await triggerInstall();
      if (success) {
        setInstalled(true);
        setTimeout(() => onOpenChange(false), 2000);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 sm:p-6 overflow-hidden rounded-3xl border-accent/30 shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right pb-2 pl-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center border border-accent/30 shadow-md flex-shrink-0">
              <img src="/logo.png" alt="العمودي" className="w-8 h-8 object-contain" onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                تثبيت تطبيق العمودي للتسويق العقاري
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Install Alamoudi Real Estate App (Desktop & Mobile)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {installed || isStandalone ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-foreground">التطبيق مثبت وجاهز على جهازك!</h3>
            <p className="text-xs text-muted-foreground">App installed successfully! You can now launch it directly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Device tabs */}
            <div className="flex rounded-xl bg-muted/60 p-1 gap-1">
              <button
                type="button"
                onClick={() => setTab("desktop")}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  tab === "desktop" ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>الكمبيوتر (Desktop)</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("android")}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  tab === "android" ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span>أندرويد (Android)</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("ios")}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  tab === "ios" ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Apple className="h-4 w-4" />
                <span>آيفون (iPhone / iPad)</span>
              </button>
            </div>

            {/* Direct install action for supported browsers */}
            {deferredPrompt ? (
              <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-center space-y-2.5">
                <p className="text-xs font-medium text-foreground">متصفحك يدعم التثبيت المباشر بنقرة واحدة</p>
                <Button
                  onClick={handleDirectInstall}
                  className="w-full bg-accent text-accent-foreground font-bold hover:bg-accent/90 gap-2 h-11 rounded-xl shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  تثبيت التطبيق الآن / Install Now
                </Button>
              </div>
            ) : null}

            {/* Step-by-step instructions per tab */}
            {tab === "desktop" && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Laptop className="h-4 w-4 text-accent" />
                  خطوات التثبيت على الكمبيوتر واللابتوب (Google Chrome / Edge):
                </h4>

                <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-card border border-border/40 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[11px] shrink-0">1</span>
                      <span>عبر قائمة المتصفح (بالعربي):</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pr-6">
                      اضغط على قائمة الثلاث نقاط <span className="font-mono font-bold text-foreground">⋮</span> أعلى يمين أو يسار المتصفح ⬅️ اختر <strong>"حفظ ومشاركة"</strong> ⬅️ ثم اضغط على <strong>"تثبيت تطبيق العمودي للتسويق العقاري..."</strong> أو <strong>"تثبيت الصفحة كتطبيق"</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/40 space-y-1" dir="ltr">
                    <div className="flex items-center gap-1.5 font-bold text-foreground text-left">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[11px] shrink-0">2</span>
                      <span>Via Chrome Menu (in English):</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6 text-left">
                      Click the 3 dots menu <span className="font-mono font-bold text-foreground">⋮</span> (top right) ➡️ Select <strong>"Save and share"</strong> (or <strong>"Cast, save, and share"</strong>) ➡️ Click <strong>"Install Alamoudi..."</strong> or <strong>"Install page as app"</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/40 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[11px] shrink-0">3</span>
                      <span>عبر شريط العنوان (URL Bar):</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pr-6">
                      ستجد أيقونة تثبيت صغيرة (على شكل شاشة مع سهم لأسفل) داخل شريط الرابط بالأعلى؛ انقر عليها واختر <strong>تثبيت (Install)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === "android" && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-accent" />
                  خطوات التثبيت على هواتف أندرويد (Google Chrome):
                </h4>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-2 rounded-xl bg-card border border-border/40">
                    <span className="font-bold text-foreground">1. بالعربي:</span> اضغط على الثلاث نقاط <span className="font-mono font-bold">⋮</span> أعلى الشاشة ⬅️ اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/40" dir="ltr">
                    <span className="font-bold text-foreground">2. In English:</span> Tap the 3 dots <span className="font-mono font-bold">⋮</span> ➡️ Choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>
              </div>
            )}

            {tab === "ios" && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Apple className="h-4 w-4 text-accent" />
                  خطوات التثبيت على آيفون وآيباد (iPhone / Safari):
                </h4>

                {/* Safari (Recommended) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                    <Compass className="h-4 w-4" />
                    <span>عبر متصفح Safari (الموصى به والأساسي من Apple):</span>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/40">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                      <span>اضغط على زر <strong>المشاركة (Share)</strong></span>
                      <Share className="h-4 w-4 text-accent inline shrink-0" />
                      <span>في شريط Safari بالأسفل.</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/40">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                      <span>مرر للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong></span>
                      <PlusSquare className="h-4 w-4 text-accent inline shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/40">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                      <span>اضغط <strong>"إضافة" (Add)</strong> في أعلى يمين الشاشة.</span>
                    </div>
                  </div>
                </div>

                {/* Chrome on iOS Notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Chrome className="h-3.5 w-3.5 text-amber-500" />
                    ملاحظة هامة لمستخدمي Google Chrome على الآيفون:
                  </p>
                  <p className="leading-relaxed">
                    نظام iOS من شركة Apple يقصر التثبيت المباشر الكامل للتطبيقات على متصفح <strong>Safari</strong> الرسمي. إذا كنت تفتح الموقع من Google Chrome على الآيفون، اضغط على زر المشاركة ثم "فتح في Safari" (Open in Safari) لتثبيته بنقرة واحدة.
                  </p>
                </div>
              </div>
            )}

            {/* App Features List */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl border border-border/40 bg-card p-2.5 text-center">
                <Zap className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <span className="block text-[10px] font-bold text-foreground">فتح فوري</span>
                <span className="block text-[9px] text-muted-foreground">Fast Launch</span>
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-2.5 text-center">
                <WifiOff className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <span className="block text-[10px] font-bold text-foreground">وضع عدم الاتصال</span>
                <span className="block text-[9px] text-muted-foreground">Offline Support</span>
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-2.5 text-center">
                <Sparkles className="h-4 w-4 text-accent mx-auto mb-1" />
                <span className="block text-[10px] font-bold text-foreground">شاشة كاملة</span>
                <span className="block text-[9px] text-muted-foreground">Full Screen</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
