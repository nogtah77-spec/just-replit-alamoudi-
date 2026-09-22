import { Plus, Pencil, Trash2, RefreshCw, Upload, Activity, LogIn, LogOut, User, Clock, ShieldCheck, Tag } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ActivityLog } from "@/context/DataContext";

const ACTION_META: Record<string, { label: string; icon: typeof Activity; badgeCls: string; iconCls: string }> = {
  created: { label: "إضافة", icon: Plus, badgeCls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", iconCls: "text-emerald-600 bg-emerald-500/15" },
  updated: { label: "تعديل", icon: Pencil, badgeCls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", iconCls: "text-blue-600 bg-blue-500/15" },
  deleted: { label: "حذف", icon: Trash2, badgeCls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", iconCls: "text-rose-600 bg-rose-500/15" },
  status: { label: "تغيير حالة", icon: RefreshCw, badgeCls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", iconCls: "text-amber-600 bg-amber-500/15" },
  imported: { label: "استيراد", icon: Upload, badgeCls: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30", iconCls: "text-purple-600 bg-purple-500/15" },
  login: { label: "تسجيل دخول", icon: LogIn, badgeCls: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30", iconCls: "text-indigo-600 bg-indigo-500/15" },
  logout: { label: "تسجيل خروج", icon: LogOut, badgeCls: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30", iconCls: "text-slate-600 bg-slate-500/15" },
};

const ENTITY_LABELS: Record<string, string> = {
  property: "عقار",
  property_type: "نوع عقار",
  region: "منطقة",
  user: "مستخدم",
  inquiry: "استفسار عميل",
  finishing_request: "طلب تشطيب",
  property_request: "طلب إضافة عقار",
  customer_property_request: "طلب شراء/إيجار",
  contract: "عقد",
  ad: "إعلان",
  broker: "وسيط عقاري",
  tiktok: "فيديو تيك توك",
  settings: "إعدادات",
  about_page: "صفحة تعريفية",
  finishing_gallery: "معرض تشطيب",
  auth: "تسجيل دخول",
  system: "النظام",
};

function metaFor(action: string) {
  return ACTION_META[action] ?? { label: action || "إجراء", icon: Activity, badgeCls: "bg-muted text-muted-foreground border-border", iconCls: "text-muted-foreground bg-muted" };
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ar });
  } catch {
    return "";
  }
}

function exactTime(iso: string): string {
  try {
    return format(new Date(iso), "yyyy/MM/dd - hh:mm a", { locale: ar });
  } catch {
    return "";
  }
}

export function ActivityItem({ log }: { log: ActivityLog }) {
  const meta = metaFor(log.action);
  const Icon = meta.icon;
  const entityLabel = ENTITY_LABELS[log.entityType] ?? log.entityType;

  return (
    <div className="group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border border-transparent hover:border-accent/30 hover:bg-accent/5 transition-all">
      {/* Icon Pill */}
      <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5 shadow-xs transition-transform group-hover:scale-105", meta.iconCls)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Badge */}
          <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-md border shadow-2xs", meta.badgeCls)}>
            {meta.label}
          </span>

          {/* Entity Type Badge */}
          {entityLabel && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground border border-border/60">
              {entityLabel}
            </span>
          )}

          {/* Exact Time Tooltip/Label */}
          <span className="text-[11px] font-mono text-muted-foreground/80 mr-auto flex items-center gap-1">
            <Clock className="h-3 w-3 opacity-60" />
            <span>{exactTime(log.createdAt)}</span>
          </span>
        </div>

        {/* Activity Title */}
        <p className="text-sm font-semibold text-foreground leading-snug">
          {log.title}
        </p>

        {/* Meta details (Actor & Relative Time) */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
            <User className="h-3 w-3 text-accent" />
            <span>{log.actor || "الإدارة (العمودي)"}</span>
          </span>
          <span>•</span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {relativeTime(log.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
