import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, MapPin, Home, Users, ShieldCheck, Settings, FileCheck2,
  BarChart3, Activity, ArrowDownUp, MessageSquare, Wrench, ClipboardList, Database, Sparkles, Megaphone, LayoutTemplate, BookUser, Images, Inbox, Bot, Calculator, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { AI_ASSISTANT_ENABLED } from "@/config/features";
import { checkUserPermission } from "@/lib/permissions";
import { useState, useEffect } from "react";

type SidebarBadge =
  | "inquiries"
  | "customerPropertyRequests"
  | "propertyRequests"
  | "finishingRequests"
  | "aiLeads";

type SidebarItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: SidebarBadge;
  adminOnly?: boolean;
  permission?: string;
};

type SidebarSection = {
  title?: string;
  items: SidebarItem[];
};

const sidebarSections: SidebarSection[] = [
  {
    items: [
      { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
    ],
  },
  {
    title: "العقارات والمعاملات",
    items: [
      { href: "/admin/properties", label: "العقارات", icon: Building2 },
      { href: "/admin/mortgage-calculator", label: "حاسبة التمويل والأقساط", icon: Calculator },
      { href: "/admin/regions", label: "المناطق", icon: MapPin, permission: "الإعدادات-إدارة المناطق" },
      { href: "/admin/property-types", label: "أنواع العقارات", icon: Home, permission: "الإعدادات-إدارة الأنواع" },
      { href: "/admin/sources", label: "مصادر العقارات", icon: BookUser, permission: "إدارة العقارات-مصادر العقارات" },
      { href: "/admin/contracts", label: "العقود", icon: FileCheck2, permission: "إدارة العقارات-إدارة العقود" },
    ],
  },
  {
    title: "العملاء والطلبات",
    items: [
      { href: "/admin/requests", label: "طلبات العملاء", icon: Inbox, badge: "customerPropertyRequests" },
      { href: "/admin/inquiries", label: "استفسارات العملاء", icon: MessageSquare, badge: "inquiries" },
      { href: "/admin/property-requests", label: "طلبات إضافة عقار", icon: ClipboardList, badge: "propertyRequests" },
      { href: "/admin/finishing-requests", label: "طلبات التشطيبات", icon: Wrench, badge: "finishingRequests" },
      { href: "/admin/finishing-gallery", label: "معرض التشطيبات", icon: Images },
      ...(AI_ASSISTANT_ENABLED
        ? [{ href: "/admin/ai-leads", label: "عملاء المستشار الذكي", icon: Sparkles, badge: "aiLeads" as const }]
        : []),
    ],
  },
  {
    title: "التسويق والمحتوى",
    items: [
      { href: "/admin/notifications", label: "الإشعارات الفورية", icon: Bell },
      { href: "/admin/ads", label: "الإعلانات", icon: Megaphone },
      { href: "/admin/smart-banners", label: "البانر الذكي", icon: LayoutTemplate },
    ],
  },
  {
    title: "المستخدمون والصلاحيات",
    items: [
      { href: "/admin/users", label: "المستخدمين", icon: Users, permission: "إدارة المستخدمين-عرض المستخدمين" },
      { href: "/admin/roles", label: "الأدوار والصلاحيات", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    title: "الذكاء الاصطناعي والأتمتة",
    items: [
      { href: "/admin/agents", label: "وكلاء الذكاء الاصطناعي", icon: Bot, adminOnly: true },
      { href: "/admin/whatsapp", label: "ربط واتساب الذكي (WhatsApp Bot)", icon: MessageSquare, adminOnly: true },
    ],
  },
  {
    title: "التقارير والنظام",
    items: [
      { href: "/admin/analytics", label: "التحليلات", icon: BarChart3, permission: "التقارير-عرض التحليلات" },
      { href: "/admin/activity-logs", label: "سجلات النشاط", icon: Activity, permission: "التقارير-سجلات النشاط" },
      { href: "/admin/import-export", label: "الاستيراد والتصدير", icon: ArrowDownUp, permission: "التقارير-تصدير البيانات" },
      { href: "/admin/backup", label: "النسخ الاحتياطي", icon: Database, adminOnly: true },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings, permission: "الإعدادات-تعديل إعدادات الموقع" },
    ],
  },
];

export function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  const [location] = useLocation();
  const { currentUser } = useAuth();
  const { inquiries, propertyRequests, finishingRequests, aiLeads, customerPropertyRequests } = useData();
  const [, setPermTick] = useState(0);

  useEffect(() => {
    const handler = () => setPermTick(t => t + 1);
    window.addEventListener("permissions-updated", handler);
    return () => window.removeEventListener("permissions-updated", handler);
  }, []);

  const badgeCounts: Record<string, number> = {
    inquiries: inquiries.filter(x => x.status === "new").length,
    customerPropertyRequests: customerPropertyRequests.filter(x => x.status === "new").length,
    propertyRequests: propertyRequests.filter(x => x.status === "new").length,
    finishingRequests: finishingRequests.filter(x => x.status === "new").length,
    aiLeads: aiLeads.filter(x => x.status === "new").length,
  };

  const isItemAllowed = (item: SidebarItem) => {
    if (item.adminOnly) return isAdmin;
    if (item.href === "/admin/settings") {
      return (
        isAdmin ||
        checkUserPermission(currentUser, "الإعدادات-تعديل إعدادات الموقع") ||
        checkUserPermission(currentUser, "الإعدادات-إدارة رموز الـ QR")
      );
    }
    if (item.permission) return checkUserPermission(currentUser, item.permission);
    return true;
  };

  const visibleSections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isItemAllowed),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain py-4 [touch-action:pan-y]">
      <nav className="space-y-0.5 px-3">
        {visibleSections.map((section, sectionIndex) => (
          <div
            key={section.title ?? "home"}
            className={cn(sectionIndex > 0 && "mt-5 pt-3.5 border-t border-sidebar-border/40")}
            role="group"
            aria-label={section.title}
          >
            {section.title && (
              <div className="mb-2 flex items-center gap-2 px-2.5 text-[11.5px] font-black tracking-wider text-accent select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0 shadow-xs shadow-accent/60" />
                <span className="shrink-0">{section.title}</span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent via-sidebar-border/70 to-accent/30 mr-1.5" />
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
                const count = item.badge ? badgeCounts[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-accent" : "text-sidebar-foreground/60")} />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span className="bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
