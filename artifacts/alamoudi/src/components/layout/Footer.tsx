import { Link } from "wouter";
import { useState, type ReactNode } from "react";
import { Phone, Mail, MapPin, Facebook, Instagram, ExternalLink, Smartphone, Download } from "lucide-react";
import { WhatsAppIcon, TikTokIcon, TelegramIcon } from "../icons/BrandIcons";
import { useData } from "@/context/DataContext";
import { getTiktokUrl, getTiktokName } from "@/lib/socials";
import { buildWaUrl } from "@/lib/phone";
import { InstallAppModal } from "../ui/InstallAppModal";

export function Footer() {
  const { settings } = useData();
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const contactItems = [
    settings.phone1 && {
      icon: <Phone className="h-4 w-4 flex-shrink-0" />,
      label: settings.phone1,
      href: `tel:${settings.phone1.replace(/\s/g, "")}`,
    },
    settings.phone2 && {
      icon: <Phone className="h-4 w-4 flex-shrink-0" />,
      label: settings.phone2,
      href: `tel:${settings.phone2.replace(/\s/g, "")}`,
    },
    settings.whatsapp && {
      icon: <WhatsAppIcon className="h-4 w-4 flex-shrink-0 text-green-500" />,
      label: "واتساب",
      href: buildWaUrl(settings.whatsapp) ?? "#",
    },
    settings.email && {
      icon: <Mail className="h-4 w-4 flex-shrink-0" />,
      label: settings.email,
      href: `mailto:${settings.email}`,
    },
    settings.mapsUrl && {
      icon: <MapPin className="h-4 w-4 flex-shrink-0 text-red-500" />,
      label: "موقعنا على الخريطة",
      href: settings.mapsUrl,
    },
  ].filter(Boolean) as { icon: ReactNode; label: string; href: string }[];

  const socialItems = [
    settings.whatsapp && {
      icon: <WhatsAppIcon className="h-4 w-4" />,
      label: "واتساب",
      href: buildWaUrl(settings.whatsapp) ?? "#",
    },
    settings.tiktok && {
      icon: <TikTokIcon className="h-4 w-4" />,
      label: "تيك توك",
      href: settings.tiktok,
    },
    settings.facebook && {
      icon: <Facebook className="h-4 w-4" />,
      label: "فيسبوك",
      href: settings.facebook,
    },
    settings.instagram && {
      icon: <Instagram className="h-4 w-4" />,
      label: "إنستغرام",
      href: settings.instagram,
    },
    settings.telegram && {
      icon: <TelegramIcon className="h-4 w-4" />,
      label: "تيليجرام",
      href: settings.telegram,
    },
  ].filter(Boolean) as { icon: ReactNode; label: string; href: string }[];

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container py-12 md:py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand column */}
          <div className="md:col-span-4">
            <Link href="/">
              <div className="mb-3">
                <span className="text-2xl font-bold text-primary dark:text-foreground tracking-tight">
                  العمودي
                </span>
                <span className="text-base font-light text-muted-foreground mr-2">
                  للتسويق العقاري
                </span>
              </div>
            </Link>
            <div className="w-12 h-0.5 bg-accent mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {settings.companyDescription}
            </p>

            {/* Social icons */}
            {socialItems.length > 0 && (
              <div className="flex gap-3 mt-5">
                {socialItems.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.label}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold text-foreground mb-5 uppercase tracking-widest">
              روابط سريعة
            </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-accent transition-colors">الرئيسية</Link></li>
                <li><Link href="/about" className="hover:text-accent transition-colors">من نحن</Link></li>
                <li><Link href="/consultation" className="hover:text-accent transition-colors">استشارة عقارية</Link></li>
                <li><Link href="/finishing-services" className="hover:text-accent transition-colors">خدمات التشطيبات</Link></li>
                <li><Link href="/add-property" className="hover:text-accent transition-colors">أعرض عقارك</Link></li>
                <li><Link href="/favorites" className="hover:text-accent transition-colors">المفضلة</Link></li>
                <li><Link href="/compare" className="hover:text-accent transition-colors">المقارنة</Link></li>
                <li className="pt-1">
                  <button
                    onClick={() => setInstallModalOpen(true)}
                    className="flex items-center gap-1.5 text-accent font-bold hover:opacity-80 transition-opacity"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>تثبيت تطبيق المنصة 📱</span>
                  </button>
                </li>
              </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-5">
            <h4 className="text-xs font-semibold text-foreground mb-5 uppercase tracking-widest">
              تواصل معنا
            </h4>
            {contactItems.length > 0 ? (
              <ul className="space-y-3">
                {contactItems.map((item, i) => (
                  <li key={i}>
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-accent transition-colors group"
                    >
                      <span className="text-accent/80 group-hover:text-accent transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {item.href.startsWith("http") && (
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                القاهرة، مصر
              </p>
            )}

            {/* TikTok account */}
            <a
              href={getTiktokUrl(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5 hover:border-accent hover:bg-accent/5 transition-colors group"
              data-testid="link-tiktok-footer"
            >
              <span className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center group-hover:bg-accent transition-colors flex-shrink-0">
                <TikTokIcon className="h-4 w-4" />
              </span>
              <span className="flex flex-col leading-tight text-right">
                <span className="text-sm font-semibold text-foreground">{getTiktokName(settings)}</span>
                <span className="text-[11px] text-muted-foreground">تابعنا على تيك توك</span>
              </span>
            </a>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.companyName}. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-accent transition-colors">سياسة الخصوصية</Link>
            <a href="#" className="hover:text-accent transition-colors">شروط الاستخدام</a>
          </div>
        </div>
      </div>
      <InstallAppModal open={installModalOpen} onOpenChange={setInstallModalOpen} />
    </footer>
  );
}
