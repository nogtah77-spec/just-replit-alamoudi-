import type { ReactNode } from "react";
import { BriefcaseBusiness } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  eyebrow = "إدارة المنصة",
  icon: Icon = BriefcaseBusiness,
  className,
}: AdminPageHeaderProps) {
  return (
    <section
      dir="rtl"
      className={cn(
        "admin-page-header relative isolate overflow-hidden rounded-2xl border border-[#A9927D]/35 bg-[linear-gradient(135deg,#10202D_0%,#173044_58%,#0D1B27_100%)] px-4 py-4 text-white shadow-[0_10px_28px_rgba(16,32,45,.14)] sm:px-6",
        className,
      )}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="header-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#A9927D]/40 bg-[#A9927D]/15 text-[#C7B6A6]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="header-eyebrow mb-0.5 text-[10px] font-bold tracking-[.12em] text-[#C7B6A6]">{eyebrow}</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
            <p className="mt-0.5 truncate text-xs text-white/65 sm:text-sm">{subtitle}</p>
          </div>
        </div>

        {actions && (
          <div className="relative flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}