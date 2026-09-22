import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Button } from "../ui/button";
import { Menu, MapPin, Sparkles, Smartphone, Download, LayoutDashboard, RotateCw } from "lucide-react";
import { WhatsAppIcon, TikTokIcon, TelegramIcon } from "../icons/BrandIcons";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "../ui/sheet";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useAIChat } from "@/context/AIChatContext";
import { AI_ASSISTANT_ENABLED } from "@/config/features";
import { buildWaUrl } from "@/lib/phone";
import { getTiktokUrl } from "@/lib/socials";
import { InstallAppModal } from "../ui/InstallAppModal";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const [location] = useLocation();
  const { settings } = useData();
  const { isStaff } = useAuth();
  const { openChat } = useAIChat();
  const tiktokHref = getTiktokUrl(settings);

  const [menuOpen, setMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const closeStart = useRef<{ x: number; y: number } | null>(null);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}
    try {
      localStorage.removeItem("alm_cache_v6");
    } catch {}
    toast({
      title: "جارٍ تحديث المنصة... 🔄",
      description: "جلب أحدث العقارات والإعدادات مباشرة من السيرفر",
      duration: 1500,
    });
    setTimeout(() => {
      window.location.reload();
    }, 450);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Listen for the global swipe event dispatched by SwipeMenuHandler in App.tsx.
  // The detection logic lives there (always mounted) so it works on every page.
  useEffect(() => {
    const handler = () => setMenuOpen(true);
    window.addEventListener("open-side-menu", handler);
    return () => window.removeEventListener("open-side-menu", handler);
  }, []);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/finishing-services", label: "خدمات التشطيبات" },
    { href: "/about", label: "من نحن" },
    { href: "/favorites", label: "المفضلة" },
    { href: "/compare", label: "المقارنة" },
  ];

  const whatsappHref = settings.whatsapp
    ? buildWaUrl(settings.whatsapp)
    : null;
  const telegramHref = settings.telegram || null;
  const mapsHref = settings.mapsUrl || null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/90 dark:bg-background/95 backdrop-blur-xl border-b border-border/70 shadow-md shadow-black/5"
          : "glass-navbar bg-background/70 backdrop-blur-md border-b border-border/40"
      )}
    >
      {/* Desktop */}
      <div className="container h-16 hidden md:flex items-center justify-between px-4 lg:px-6 gap-3">
        {/* Brand — far right (RTL start) */}
        <div className="flex justify-start items-center flex-shrink-0">
          <Link href="/" data-testid="link-brand">
            <span className="text-2xl font-bold text-foreground dark:text-white tracking-tight leading-none">
              العمودي
            </span>
            <span className="text-xs lg:text-sm font-light text-muted-foreground mr-2 tracking-wide hidden sm:inline">
              شريكك نحو الاستثمار الأفضل
            </span>
          </Link>
        </div>

        {/* Nav — center */}
        <nav className="flex justify-center items-center gap-4 lg:gap-6 flex-shrink-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-accent whitespace-nowrap",
                location === link.href ? "text-accent" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          {AI_ASSISTANT_ENABLED && (
            <button
              onClick={openChat}
              className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:opacity-80 transition-opacity whitespace-nowrap"
              data-testid="button-ai-consultant"
            >
              <Sparkles className="h-4 w-4" />
              المستشار الذكي AI
            </button>
          )}
        </nav>

        {/* Actions — far left (RTL end) */}
        <div className="flex justify-end items-center gap-2 flex-shrink-0 whitespace-nowrap">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              title="واتساب"
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex-shrink-0"
              data-testid="link-whatsapp"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
          )}
          <a
            href={tiktokHref}
            target="_blank"
            rel="noopener noreferrer"
            title="تيك توك"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            data-testid="link-tiktok"
          >
            <TikTokIcon className="h-4 w-4" />
          </a>
          {telegramHref && (
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              title="تيليجرام"
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#2AABEE] hover:bg-[#2AABEE]/10 transition-colors flex-shrink-0"
              data-testid="link-telegram"
            >
              <TelegramIcon className="h-4 w-4" />
            </a>
          )}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              title="موقعنا"
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
              data-testid="link-maps"
            >
              <MapPin className="h-4 w-4" />
            </a>
          )}
          {(!settings.themeMode || settings.themeMode === "user") && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <ThemeToggle />
            </>
          )}
          {/* Refresh button for iPad & Tablets (Strictly hidden on Desktop & Laptop) */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "hidden md:flex xl:hidden items-center justify-center w-8 h-8 rounded-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 shadow-xs transition-all duration-200 active:scale-90 cursor-pointer flex-shrink-0",
              isRefreshing && "pointer-events-none opacity-80"
            )}
            title="تحديث المنصة وجلب أحدث البيانات"
            aria-label="تحديث المنصة"
          >
            <RotateCw className={cn("h-4 w-4 transition-transform duration-500", isRefreshing && "animate-spin text-accent")} />
          </button>
          <button
            onClick={() => setInstallModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-accent bg-accent/10 hover:bg-accent hover:text-accent-foreground border border-accent/30 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0"
            title="تحميل وتثبيت تطبيق المنصة على جهازك"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تحميل التطبيق</span>
          </button>
          {isStaff ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 h-7.5 rounded-full text-xs font-bold text-accent-foreground bg-accent hover:bg-accent/90 border border-accent/40 shadow-xs transition-all duration-200 active:scale-95 whitespace-nowrap flex-shrink-0 cursor-pointer"
              data-testid="button-nav-dashboard"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>لوحة التحكم</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-accent transition-colors px-2 py-1 rounded-md hover:bg-accent/5 whitespace-nowrap flex-shrink-0"
              data-testid="link-login"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="container h-14 flex md:hidden items-center justify-between px-4">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
              <span className="sr-only">القائمة</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 bg-background"
            onTouchStart={(e) => {
              closeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchMove={(e) => {
              if (!closeStart.current) return;
              const dx = e.touches[0].clientX - closeStart.current.x;
              const dy = Math.abs(e.touches[0].clientY - closeStart.current.y);
              if (dx > 60 && dy < 45) {
                closeStart.current = null;
                setMenuOpen(false);
              }
            }}
            onTouchEnd={() => {
              closeStart.current = null;
            }}
          >
            <div className="mb-6 pt-2">
              <span className="text-2xl font-bold text-foreground dark:text-white">العمودي</span>
              <span className="text-sm font-light text-muted-foreground mr-2">شريكك نحو الاستثمار الأفضل</span>
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "py-2.5 px-3 rounded-md text-base font-medium transition-colors",
                    location === link.href
                      ? "text-accent bg-accent/10"
                      : "text-foreground hover:text-accent hover:bg-accent/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {AI_ASSISTANT_ENABLED && (
                <SheetClose asChild>
                  <button
                    onClick={openChat}
                    className="py-2.5 px-3 rounded-md text-base font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-2 text-right"
                    data-testid="button-ai-consultant-mobile"
                  >
                    <Sparkles className="h-4 w-4" />
                    المستشار الذكي AI
                  </button>
                </SheetClose>
              )}
              <div className="my-2 border-t border-border" />
              <Link href="/add-property" className="py-2.5 px-3 rounded-md text-base font-bold text-accent hover:bg-accent/10 transition-colors">
                اعرض عقارك
              </Link>
              {isStaff ? (
                <Link href="/admin" className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-base font-bold text-accent bg-accent/10 border border-accent/25 hover:bg-accent/15 transition-colors">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>لوحة التحكم</span>
                </Link>
              ) : (
                <Link href="/login" className="py-2.5 px-3 rounded-md text-base font-medium text-foreground hover:text-accent hover:bg-accent/5 transition-colors">
                  تسجيل الدخول
                </Link>
              )}
              {(whatsappHref || mapsHref) && <div className="my-2 border-t border-border" />}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-md text-base font-medium text-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-center gap-2">
                  <WhatsAppIcon className="h-4 w-4" />
                  واتساب
                </a>
              )}
              <a href={tiktokHref} target="_blank" rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-md text-base font-medium text-foreground hover:text-accent hover:bg-accent/5 transition-colors flex items-center gap-2">
                <TikTokIcon className="h-4 w-4" />
                تيك توك
              </a>
              {telegramHref && (
                <a href={telegramHref} target="_blank" rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-md text-base font-medium text-foreground hover:text-[#2AABEE] hover:bg-[#2AABEE]/10 transition-colors flex items-center gap-2">
                  <TelegramIcon className="h-4 w-4" />
                  تيليجرام
                </a>
              )}
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-md text-base font-medium text-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  موقعنا
                </a>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setInstallModalOpen(true);
                }}
                className="mt-2 flex items-center justify-between w-full py-2.5 px-3.5 rounded-xl text-sm font-bold bg-accent/15 text-accent border border-accent/30 hover:bg-accent hover:text-accent-foreground transition-all"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>تثبيت التطبيق على هاتفك</span>
                </div>
                <Download className="h-4 w-4" />
              </button>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <span className="text-2xl font-bold text-foreground dark:text-white">العمودي</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Refresh button for Mobile */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 shadow-xs transition-all duration-200 active:scale-90 cursor-pointer",
              isRefreshing && "pointer-events-none opacity-80"
            )}
            title="تحديث المنصة وجلب أحدث البيانات"
            aria-label="تحديث المنصة"
          >
            <RotateCw className={cn("h-4 w-4 transition-transform duration-500", isRefreshing && "animate-spin text-accent")} />
          </button>
          <button
            onClick={() => setInstallModalOpen(true)}
            className="flex sm:hidden items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent border border-accent/30"
            title="تثبيت التطبيق"
          >
            <Smartphone className="h-4 w-4" />
          </button>
          {(!settings.themeMode || settings.themeMode === "user") && <ThemeToggle />}
        </div>
      </div>

      <InstallAppModal open={installModalOpen} onOpenChange={setInstallModalOpen} />
    </header>
  );
}
