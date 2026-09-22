import type { User } from "@/context/DataContext";

export const PERMISSION_STORAGE_KEY = "alamoudi_roles_perms";

export interface PermissionGroup {
  category: string;
  items: { key: string; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: "إدارة العقارات والمعاملات",
    items: [
      { key: "إدارة العقارات-إضافة عقار", label: "إضافة عقار" },
      { key: "إدارة العقارات-تعديل عقار", label: "تعديل عقار" },
      { key: "إدارة العقارات-حذف عقار", label: "حذف عقار" },
      { key: "إدارة العقارات-نشر العقارات", label: "نشر العقارات" },
      { key: "إدارة العقارات-مصادر العقارات", label: "مصادر العقارات" },
      { key: "إدارة العقارات-إدارة العقود", label: "إدارة العقود" },
      { key: "إدارة العقارات-بروشور العقار PDF", label: "بروشور العقار PDF" },
    ],
  },
  {
    category: "إدارة المستخدمين",
    items: [
      { key: "إدارة المستخدمين-عرض المستخدمين", label: "عرض المستخدمين" },
      { key: "إدارة المستخدمين-إضافة مستخدم", label: "إضافة مستخدم" },
      { key: "إدارة المستخدمين-تعديل صلاحيات", label: "تعديل صلاحيات" },
      { key: "إدارة المستخدمين-حظر مستخدم", label: "حظر مستخدم" },
    ],
  },
  {
    category: "التقارير",
    items: [
      { key: "التقارير-عرض التحليلات", label: "عرض التحليلات" },
      { key: "التقارير-تصدير البيانات", label: "تصدير البيانات" },
      { key: "التقارير-سجلات النشاط", label: "سجلات النشاط" },
    ],
  },
  {
    category: "الإعدادات",
    items: [
      { key: "الإعدادات-تعديل إعدادات الموقع", label: "تعديل إعدادات الموقع" },
      { key: "الإعدادات-إدارة رموز الـ QR", label: "إدارة رموز الـ QR" },
      { key: "الإعدادات-إدارة المناطق", label: "إدارة المناطق" },
      { key: "الإعدادات-إدارة الأنواع", label: "إدارة الأنواع" },
    ],
  },
];

export const DEFAULT_ROLE_PERMS: Record<string, Record<string, boolean>> = {
  admin: {
    "إدارة العقارات-إضافة عقار": true,
    "إدارة العقارات-تعديل عقار": true,
    "إدارة العقارات-حذف عقار": true,
    "إدارة العقارات-نشر العقارات": true,
    "إدارة العقارات-مصادر العقارات": true,
    "إدارة العقارات-إدارة العقود": true,
    "إدارة العقارات-بروشور العقار PDF": true,
    "إدارة المستخدمين-عرض المستخدمين": true,
    "إدارة المستخدمين-إضافة مستخدم": true,
    "إدارة المستخدمين-تعديل صلاحيات": true,
    "إدارة المستخدمين-حظر مستخدم": true,
    "التقارير-عرض التحليلات": true,
    "التقارير-تصدير البيانات": true,
    "التقارير-سجلات النشاط": true,
    "الإعدادات-تعديل إعدادات الموقع": true,
    "الإعدادات-إدارة رموز الـ QR": true,
    "الإعدادات-إدارة المناطق": true,
    "الإعدادات-إدارة الأنواع": true,
  },
  agent: {
    "إدارة العقارات-إضافة عقار": true,
    "إدارة العقارات-تعديل عقار": true,
    "إدارة العقارات-حذف عقار": false,
    "إدارة العقارات-نشر العقارات": false,
    "إدارة العقارات-مصادر العقارات": false,
    "إدارة العقارات-إدارة العقود": false,
    "إدارة العقارات-بروشور العقار PDF": false,
    "إدارة المستخدمين-عرض المستخدمين": false,
    "إدارة المستخدمين-إضافة مستخدم": false,
    "إدارة المستخدمين-تعديل صلاحيات": false,
    "إدارة المستخدمين-حظر مستخدم": false,
    "التقارير-عرض التحليلات": false,
    "التقارير-تصدير البيانات": false,
    "التقارير-سجلات النشاط": false,
    "الإعدادات-تعديل إعدادات الموقع": false,
    "الإعدادات-إدارة رموز الـ QR": false,
    "الإعدادات-إدارة المناطق": false,
    "الإعدادات-إدارة الأنواع": false,
  },
  customer: {},
};

export function getStoredPermissions(): Record<string, Record<string, boolean>> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(PERMISSION_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ROLE_PERMS, ...parsed };
    }
  } catch {}
  return DEFAULT_ROLE_PERMS;
}

export function saveStoredPermissions(perms: Record<string, Record<string, boolean>>) {
  try {
    localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(perms));
    window.dispatchEvent(new Event("permissions-updated"));
  } catch {}
}

export function checkUserPermission(user: User | null, permKey: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  const currentPerms = getStoredPermissions();
  const rolePerms = currentPerms[user.role];
  if (!rolePerms) return false;

  return !!rolePerms[permKey];
}