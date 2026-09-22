import { useState, useEffect } from "react";
import { Download, Smartphone, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallAppModal, usePwaInstall } from "./InstallAppModal";

export function InstallPwaPrompt() {
  const { deferredPrompt, isStandalone, triggerInstall } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    if (isStandalone) return undefined;
    const dismissed = localStorage.getItem("alm_pwa_banner_dismissed");
    if (!dismissed || Date.now() - Number(dismissed) > 3 * 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => setBannerVisible(true), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isStandalone]);

  const handleDismiss = () => {
    setBannerVisible(false);
    localStorage.setItem("alm_pwa_banner_dismissed", String(Date.now()));
  };

  const handleAction = async () => {
    if (deferredPrompt) {
      await triggerInstall();
    } else {
      setModalOpen(true);
    }
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Smart Banner — Appears once smoothly */}
      {bannerVisible && (
        <aside
          aria-label="تثبيت تطبيق المنصة"
          dir="rtl"
          className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-5 duration-300 sm:left-6 sm:right-auto sm:max-w-sm"
        >
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-accent/40 bg-card/95 p-4 text-foreground shadow-2xl backdrop-blur-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-inner">
              <Smartphone className="h-5 w-5" />
            </div>

            <div className="flex-1 space-y-1 text-right">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <h4 className="text-xs font-bold text-foreground">
                  تطبيق العمودي العقاري
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                تصفح أسرع، بدون شريط المتصفح، وتجربة سلسة على الكمبيوتر والجوال.
              </p>

              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAction}
                  className="gap-1.5 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 shadow-md text-xs h-8 px-3"
                >
                  <Download className="h-3 w-3" />
                  {deferredPrompt ? "تثبيت بنقرة واحدة" : "طريقة التثبيت"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="rounded-xl text-[11px] text-muted-foreground h-8 px-2"
                >
                  لاحقاً
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
              aria-label="إغلاق التنبيه"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Global Interactive Modal */}
      <InstallAppModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
