import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, LockKeyhole, UserRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { LOGIN_BACKGROUND_PRESETS } from "@/data/loginPresets";

function hexToRgba(value: string, opacity: number) {
  const normalized = value.replace(/^#/, "");
  const safe = /^[0-9a-f]{6}$/i.test(normalized) ? normalized : "10202D";
  const red = parseInt(safe.slice(0, 2), 16);
  const green = parseInt(safe.slice(2, 4), 16);
  const blue = parseInt(safe.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(100, Math.max(0, opacity)) / 100})`;
}

export default function Login() {
  const { login } = useAuth();
  const { settings } = useData();
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Synchronous cache read for instantaneous, flicker-free background and card rendering
  const [cachedLoginBg, setCachedLoginBg] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("alm_login_bg");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Listen for real-time background and card style changes from admin updates
  useEffect(() => {
    const handleBgUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setCachedLoginBg(e.detail);
      }
    };
    window.addEventListener("alm_login_bg_update", handleBgUpdate as EventListener);
    return () => {
      window.removeEventListener("alm_login_bg_update", handleBgUpdate as EventListener);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(identifier, password);
    setSubmitting(false);
    if (result.ok) {
      navigate("/admin");
    } else {
      setError(result.error || "تعذّر تسجيل الدخول");
    }
  };

  // Determine active background settings (live settings or immediate cache fallback)
  const isBackgroundEnabled = settings.loginBackgroundEnabled ?? cachedLoginBg?.loginBackgroundEnabled ?? true;
  const backgroundImageUrl = settings.loginBackgroundImageUrl || cachedLoginBg?.loginBackgroundImageUrl || LOGIN_BACKGROUND_PRESETS[0].imageUrl;
  const hasBackground = Boolean(isBackgroundEnabled && backgroundImageUrl);

  const overlayColor = settings.loginOverlayColor || cachedLoginBg?.loginOverlayColor || "#10202D";
  const overlayOpacity = settings.loginOverlayOpacity ?? cachedLoginBg?.loginOverlayOpacity ?? 72;
  const gradientOpacity = settings.loginGradientOpacity ?? cachedLoginBg?.loginGradientOpacity ?? 58;

  const overlay = hexToRgba(overlayColor, overlayOpacity);
  const gradient = hexToRgba(overlayColor, gradientOpacity);

  // Card opacity and glass blur controls
  const cardOpacity = settings.loginCardOpacity ?? cachedLoginBg?.loginCardOpacity ?? 88;
  const cardBlur = settings.loginCardBlur ?? cachedLoginBg?.loginCardBlur ?? 20;

  const cardBg = `linear-gradient(145deg, rgba(16, 32, 45, ${cardOpacity / 100}), rgba(9, 18, 26, ${Math.min(1, (cardOpacity + 6) / 100)}))`;
  const cardBackdrop = `blur(${cardBlur}px) saturate(140%)`;

  return (
    <main dir="rtl" className="login-shell relative min-h-[100dvh] overflow-hidden text-[#F5F3EE]">
      <div
        className={`login-backdrop absolute inset-0 bg-cover bg-center bg-no-repeat ${hasBackground ? "" : "login-default-backdrop"}`}
      />
      {hasBackground && (
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="login-backdrop absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300"
          style={{ opacity: 1 }}
        />
      )}
      {hasBackground && (
        <>
          <div className="login-background-overlay absolute inset-0" style={{ backgroundColor: overlay }} />
          <div
            className="login-background-gradient absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${gradient} 0%, ${hexToRgba(overlayColor, 18)} 45%, transparent 100%)`,
            }}
          />
        </>
      )}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(120deg, transparent 0 48%, rgba(220,190,133,.42) 48.2%, transparent 48.5%), radial-gradient(rgba(255,250,240,.34) .8px, transparent .8px)",
          backgroundSize: "100% 100%, 18px 18px",
        }}
      />

      <div className="login-content relative z-10 flex min-h-[100dvh] items-center justify-center p-4 sm:p-6 lg:p-8">
        <section
          className="login-card w-full max-w-[370px] sm:max-w-[400px] md:max-w-[760px] lg:max-w-[800px] rounded-[24px] sm:rounded-[28px] md:rounded-[32px] p-5 sm:p-7 md:p-8 shadow-2xl transition-all duration-300"
          style={{
            background: cardBg,
            backdropFilter: cardBackdrop,
            WebkitBackdropFilter: cardBackdrop,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
            
            {/* ── Brand & Welcome Column (Right side on Desktop) ── */}
            <div className="md:col-span-5 flex flex-col justify-between text-center md:text-right md:border-l md:border-[#C7B6A6]/25 md:pl-8 space-y-4 md:space-y-6">
              <div>
                <Link href="/" className="inline-flex flex-col items-center md:items-start group transition-transform hover:scale-[1.01]" data-testid="link-login-brand">
                  <span className="login-brand-name text-[#F5F3EE] text-2xl sm:text-3xl md:text-[2.25rem] font-black tracking-tight">
                    العمودي
                  </span>
                  <span className="login-brand-subtitle mt-2 inline-block border-t border-[#C7B6A6]/50 pt-1.5 text-[0.75rem] sm:text-[0.8rem] font-semibold tracking-[0.14em] text-[#DDD1C4]">
                    للتسويق العقاري
                  </span>
                </Link>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-[#F5F3EE]">
                  مرحبًا بعودتك
                </h1>
                <p className="text-xs leading-relaxed text-[#e5e3d9]/70">
                  لوحة التحكم الإدارية — سجل دخولك لمتابعة العقارات والطلبات والتحليلات العقارية.
                </p>
              </div>

              <div className="hidden md:flex items-center gap-2 pt-3 border-t border-white/10 text-[11px] text-[#e8e5d9]/50">
                <ShieldCheck className="h-3.5 w-3.5 text-[#DDD1C4] shrink-0" />
                <span>اتصال إداري مشفر ومحمي</span>
              </div>
            </div>

            {/* ── Form Column (Left side on Desktop) ── */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    className="flex items-start gap-2 rounded-xl border border-red-200/30 bg-red-950/35 px-3 py-2.5 text-xs text-red-100"
                    data-testid="text-login-error"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="identifier" className="text-xs font-semibold text-[#f3ecdd]">
                    اسم المستخدم أو البريد الإلكتروني
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#DDD1C4]/75" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="admin"
                      autoComplete="username"
                      dir="ltr"
                      className="login-field h-10 sm:h-11 rounded-xl pr-10 text-left text-xs sm:text-sm shadow-none"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError("");
                      }}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <Label htmlFor="password" className="text-xs font-semibold text-[#f3ecdd]">
                    كلمة المرور
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#DDD1C4]/75" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      dir="ltr"
                      className="login-field h-10 sm:h-11 rounded-xl pr-10 text-left text-xs sm:text-sm shadow-none"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 h-10 sm:h-11 w-full rounded-xl border border-[#DDD1C4]/70 bg-[#A9927D] text-xs sm:text-sm font-bold text-[#10202D] shadow-[0_8px_20px_rgba(5,19,24,0.25)] hover:bg-[#BBA591] transition-colors"
                  data-testid="button-login-submit"
                >
                  {submitting ? "جارٍ تسجيل الدخول…" : (
                    <span className="flex items-center justify-center gap-2">
                      <span>تسجيل الدخول</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>

                <div className="pt-2 flex flex-col items-center gap-1.5">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-[#e8e5d9]/65 transition-colors hover:text-[#DDD1C4]"
                  >
                    العودة إلى الصفحة الرئيسية
                  </Link>
                  <p className="md:hidden text-center text-[10px] text-[#e8e5d9]/45 mt-1">
                    هذه الصفحة مخصّصة للإدارة والموظفين فقط
                  </p>
                </div>
              </form>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
