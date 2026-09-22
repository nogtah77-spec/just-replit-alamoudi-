import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Search, Activity, RefreshCw, Trash2, ShieldAlert, PlusCircle, TrendingUp, Layers, Flame, Radio } from "lucide-react";
import { useData } from "@/context/DataContext";
import { ActivityItem } from "@/components/admin/ActivityItem";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkUserPermission } from "@/lib/permissions";
import { Link } from "wouter";

const ACTION_LABELS: Record<string, string> = {
  created: "إضافة",
  updated: "تعديل",
  deleted: "حذف",
  status: "تغيير حالة",
  imported: "استيراد",
  login: "تسجيل دخول",
  logout: "تسجيل خروج",
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

export default function ActivityLogs() {
  const { activityLogs, reload, clearActivityLogs, logActivity } = useData();
  const { currentUser, refreshCurrentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canViewLogs = isAdmin || checkUserPermission(currentUser, "التقارير-سجلات النشاط");
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  if (!canViewLogs) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية عرض سجلات النشاط. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const canClearLogs =
    currentUser?.role === "admin" ||
    (currentUser?.role === "agent" && currentUser.canClearActivityLogs);

  const actionOptions = useMemo(
    () => Array.from(new Set(activityLogs.map((log) => log.action))).sort(),
    [activityLogs],
  );

  const entityOptions = useMemo(
    () => Array.from(new Set(activityLogs.map((log) => log.entityType))).sort(),
    [activityLogs],
  );

  // Statistics KPI calculations
  const stats = useMemo(() => {
    const total = activityLogs.length;
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let todayCount = 0;

    for (const log of activityLogs) {
      if (log.action === "created" || log.action === "imported") createdCount++;
      if (log.action === "updated" || log.action === "status") updatedCount++;
      if (log.action === "deleted") deletedCount++;
      
      const logTime = new Date(log.createdAt).getTime();
      if (now - logTime <= oneDay) todayCount++;
    }

    return { total, createdCount, updatedCount, deletedCount, todayCount };
  }, [activityLogs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date().getTime();

    return activityLogs.filter((l) => {
      // 1. Text Search Filter
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        (l.actor || "").toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        (ACTION_LABELS[l.action] ?? l.action).toLowerCase().includes(q) ||
        (ENTITY_LABELS[l.entityType] ?? l.entityType).toLowerCase().includes(q);

      if (!matchesQuery) return false;

      // 2. Action Filter
      if (actionFilter !== "all" && l.action !== actionFilter) return false;

      // 3. Entity Filter
      if (entityFilter !== "all" && l.entityType !== entityFilter) return false;

      // 4. Time Range Filter
      if (timeFilter !== "all") {
        const logTime = new Date(l.createdAt).getTime();
        const diffMs = now - logTime;
        if (timeFilter === "today" && diffMs > 24 * 60 * 60 * 1000) return false;
        if (timeFilter === "week" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (timeFilter === "month" && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [activityLogs, query, actionFilter, entityFilter, timeFilter]);

  const refreshLogs = async () => {
    setRefreshing(true);
    try {
      await reload();
      toast({ title: "تم تحديث السجل", description: "تمت مزامنة أحدث أنشطة المنصة مع السحابة." });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateTestLog = () => {
    logActivity({
      action: "status",
      entityType: "system",
      title: "فحص نشاط تجريبي للتأكد من عمل نظام التتبع السحابي والمحلي المباشر بنجاح 100%",
      actor: currentUser?.name || "الإدارة (العمودي)",
    });
    toast({
      title: "تم تسجيل النشاط بنجاح ✓",
      description: "تمت إضافة نشاط تجريبي وحفظه ومزامنته سحابياً ولحظياً.",
    });
  };

  const clearLogs = async () => {
    setClearing(true);
    try {
      await clearActivityLogs();
      setClearDialogOpen(false);
      toast({ title: "تم تصفير سجلات النشاط", description: "تم حذف جميع السجلات محلياً وسحابياً نهائيًا." });
    } catch (error) {
      const status = (error as { status?: number }).status;
      toast({
        title: "تعذّر تصفير السجلات",
        description: status === 403 ? "لا تملك صلاحية تنفيذ هذا الإجراء." : "حدث خطأ أثناء حذف السجلات.",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const exportCsv = () => {
    const header = ["التاريخ والوقت", "العملية", "نوع الكيان", "تفاصيل النشاط", "بواسطة"];
    const rows = filtered.map((l) => [
      l.createdAt,
      ACTION_LABELS[l.action] ?? l.action,
      ENTITY_LABELS[l.entityType] ?? l.entityType,
      l.title,
      l.actor || "الإدارة",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with quick action tools */}
        <AdminPageHeader
          title="سجلات النشاط والمتابعة"
          subtitle="تتبع حي ومباشر لكافة الإجراءات والعمليات والتعديلات المنفذة في النظام"
          eyebrow="سجل التدقيق والرقابة اللحظي"
          icon={Activity}
          actions={
            <div className="grid w-full grid-cols-2 sm:flex sm:w-auto sm:items-center gap-2">
              <Button
                variant="outline"
                className="h-10 min-w-0 gap-1.5 border-white/25 bg-white/10 px-3 text-xs text-white hover:border-white/40 hover:bg-white/15 hover:text-white sm:text-sm font-semibold shadow-xs"
                onClick={() => void refreshLogs()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${refreshing ? "animate-spin" : ""}`} />
                <span>تحديث</span>
              </Button>
              <Button
                variant="outline"
                className="h-10 min-w-0 gap-1.5 border-white/25 bg-white/10 px-3 text-xs text-white hover:border-white/40 hover:bg-white/15 hover:text-white sm:text-sm font-semibold shadow-xs"
                onClick={exportCsv}
                disabled={filtered.length === 0}
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>تصدير CSV</span>
              </Button>
              <Button
                variant="outline"
                className="h-10 min-w-0 gap-1.5 border-accent/40 bg-accent/20 px-3 text-xs text-accent-foreground hover:bg-accent/30 sm:text-sm font-bold shadow-xs"
                onClick={handleCreateTestLog}
              >
                <PlusCircle className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span>تسجيل نشاط تجريبي</span>
              </Button>
              {canClearLogs && (
                <Button
                  variant="outline"
                  className="h-10 min-w-0 gap-1.5 border-red-300/40 bg-red-500/15 px-3 text-xs text-red-100 hover:border-red-200/60 hover:bg-red-500/25 hover:text-white sm:text-sm font-semibold shadow-xs"
                  onClick={() => setClearDialogOpen(true)}
                  disabled={activityLogs.length === 0}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span>تصفير السجلات</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Top Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold">إجمالي الأنشطة</span>
              <Layers className="h-4 w-4 text-accent" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground mt-1">سجل تراكمي محفوظ</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold">أنشطة اليوم</span>
              <Flame className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.todayCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">خلال آخر 24 ساعة</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold">التعديلات والتحسينات</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{stats.updatedCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">تحديث بيانات وحالات</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-rose-500/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold">عمليات الحذف</span>
              <Trash2 className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{stats.deletedCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">عناصر محذوفة</p>
          </div>
        </div>

        {/* Unified Search & Filters Toolbar */}
        <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-3">
          {/* Quick Date Range Filter Buttons + Live Beacon */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-bold text-muted-foreground ml-1 shrink-0">النطاق الزمني:</span>
              {[
                { id: "all", label: "كافة السجلات" },
                { id: "today", label: "أنشطة اليوم" },
                { id: "week", label: "آخر 7 أيام" },
                { id: "month", label: "آخر 30 يوم" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={timeFilter === tab.id ? "default" : "outline"}
                  size="sm"
                  className={`h-8 rounded-xl px-3 text-xs font-bold transition-all ${
                    timeFilter === tab.id ? "bg-accent text-accent-foreground shadow-xs" : "bg-card hover:bg-accent/10"
                  }`}
                  onClick={() => setTimeFilter(tab.id as any)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Subtle Live Sync Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>مراقبة حية وتزامن سحابي فوري</span>
            </div>
          </div>

          {/* Search Input and Dropdowns */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في تفاصيل النشاط، اسم المنفّذ، كود العقار..."
                className="pr-9 h-10 rounded-xl"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="نوع العملية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات ({activityLogs.length})</SelectItem>
                {actionOptions.map((action) => (
                  <SelectItem key={action} value={action}>{ACTION_LABELS[action] ?? action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="نوع الكيان" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الكيانات</SelectItem>
                {entityOptions.map((entity) => (
                  <SelectItem key={entity} value={entity}>{ENTITY_LABELS[entity] ?? entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activity Logs Timeline List */}
        <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-xs text-muted-foreground">
            <span className="font-semibold">
              يتم عرض <strong className="text-foreground font-bold">{filtered.length}</strong> نشاطًا من أصل <strong className="text-foreground font-bold">{activityLogs.length}</strong>
            </span>
            {(query || actionFilter !== "all" || entityFilter !== "all" || timeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-bold text-accent hover:text-accent/80"
                onClick={() => { setQuery(""); setActionFilter("all"); setEntityFilter("all"); setTimeFilter("all"); }}
              >
                مسح جميع الفلاتر
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-10 w-10 text-muted-foreground/60" />}
              title={query || actionFilter !== "all" || entityFilter !== "all" || timeFilter !== "all" ? "لا توجد نتائج مطابقة للبحث" : "لا توجد سجلات نشاط حالياً"}
              description={
                query || actionFilter !== "all" || entityFilter !== "all" || timeFilter !== "all"
                  ? "جرّب تغيير خيارات البحث أو تصفير الفلاتر."
                  : "جميع عمليات الإضافة والتعديل والحذف التي تتم في النظام ستظهر هنا تلقائياً ولحظياً."
              }
              className="border-none bg-transparent py-14"
            />
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((log) => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear Logs Modal */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              تصفير سجلات النشاط؟
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              سيتم حذف جميع سجلات النشاط وعددها {activityLogs.length} سجلًا نهائيًا من المنصة وقواعد البيانات السحابية.
              لا يمكن التراجع عن هذا الإجراء، وسيؤثر على سجل المتابعة لجميع الموظفين.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); void clearLogs(); }}
              disabled={clearing}
            >
              {clearing ? "جارٍ التصفير..." : "نعم، تصفير السجلات"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

