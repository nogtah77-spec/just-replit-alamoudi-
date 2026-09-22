import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users as UsersIcon, Heart, Clock, Activity, ArrowLeft, Inbox, UserRound, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useData } from "@/context/DataContext";
import { ActivityItem } from "@/components/admin/ActivityItem";
import { Link } from "wouter";
import { RecentPropertiesPanel } from "@/components/admin/RecentPropertiesPanel";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function Dashboard() {
  const { properties, regions, users, activityLogs, customerPropertyRequests, propertyTypes } = useData();
  const recentActivity = activityLogs.slice(0, 6);
  const newRequests = customerPropertyRequests.filter((request) => request.status === "new").length;
  const reviewedRequests = customerPropertyRequests.filter((request) => request.status === "reviewed").length;
  const repliedRequests = customerPropertyRequests.filter((request) => request.status === "replied").length;
  const closedRequests = customerPropertyRequests.filter((request) => request.status === "closed").length;
  const latestCustomerRequests = [...customerPropertyRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const requestStatusMeta = {
    new: { label: "جديد — لم تتم المتابعة", className: "bg-red-500/10 text-red-700 dark:text-red-300" },
    reviewed: { label: "قيد المتابعة", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    replied: { label: "تم التواصل", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    closed: { label: "مغلق", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  } as const;
  
  const totalProperties = properties.length;
  const activeProperties = properties.filter(p => p.status === "active" || p.status === "listed").length;
  const totalRegions = regions.filter(r => r.active).length;
  const totalUsers = users.length;

  const kpis = [
    { title: "إجمالي العقارات المتاحة", value: totalProperties, icon: Building2 },
    { title: "المناطق النشطة", value: totalRegions, icon: Clock },
    { title: "المستخدمون", value: totalUsers, icon: UsersIcon },
    { title: "عقارات نشطة", value: activeProperties, icon: Heart },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="لوحة التحكم"
          subtitle="نظرة عامة على أداء المنصة والعقارات والطلبات"
          eyebrow="مركز المتابعة"
          icon={Activity}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, i) => (
            <Card key={i} className="card-luxury relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <div className="p-2 bg-background rounded-md shadow-sm">
                  <kpi.icon className="h-5 w-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-4">
                <div className="text-3xl font-bold text-foreground text-center">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <RecentPropertiesPanel properties={properties} regions={regions} propertyTypes={propertyTypes} compact />

          <Card className="card-luxury overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60">
              <div>
                <CardTitle>طلبات العملاء</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">احتياجات عقارية جديدة تنتظر متابعة فريق العمل</p>
              </div>
              <Inbox className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between gap-4 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent p-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Inbox className="h-4 w-4 text-accent" />
                    طلبات جديدة لم تتم متابعتها
                  </div>
                  <p className="mt-1 text-3xl font-bold text-foreground">{newRequests}</p>
                </div>
                <Link href="/admin/requests" className="inline-flex items-center gap-1 rounded-md border border-accent/30 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10">
                  فتح الطلبات <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                {[
                  { label: "جديد — لم تتم المتابعة", value: newRequests, className: "text-red-600 dark:text-red-300" },
                  { label: "قيد المتابعة", value: reviewedRequests, className: "text-amber-600 dark:text-amber-300" },
                  { label: "تم التواصل", value: repliedRequests, className: "text-emerald-600 dark:text-emerald-300" },
                  { label: "مغلق", value: closedRequests, className: "text-slate-600 dark:text-slate-300" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/70 bg-background/40 p-3">
                    <p className="text-muted-foreground">{item.label}</p>
                    <p className={`mt-1 text-xl font-bold ${item.className}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border/70">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                  <p className="text-xs font-semibold text-foreground">آخر الطلبات</p>
                  <span className="text-[11px] text-muted-foreground">{customerPropertyRequests.length} إجمالي</span>
                </div>
                {latestCustomerRequests.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">لا توجد طلبات عملاء حتى الآن.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {latestCustomerRequests.map((request) => {
                      const status = requestStatusMeta[request.status];
                      const requestTitle = [request.transactionType, request.requestType].filter(Boolean).join(" ") || "طلب عقاري";
                      const createdAt = new Date(request.createdAt);
                      const dateLabel = Number.isNaN(createdAt.getTime())
                        ? "تاريخ غير معروف"
                        : createdAt.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short" });
                      return (
                        <Link key={request.id} href="/admin/requests" className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/40">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">{request.customerName || "عميل بدون اسم"}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{requestTitle}{request.preferredAreas ? ` · ${request.preferredAreas}` : ""}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}>{status.label}</span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><CalendarDays className="h-3 w-3" />{dateLabel}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="card-luxury">
            <CardHeader>
              <CardTitle>أحدث النشاطات</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <EmptyState 
                  icon={<Activity className="h-6 w-6" />}
                  title="لا توجد نشاطات حديثة"
                  description="لم يتم تسجيل أي نشاطات على المنصة حتى الآن."
                  className="py-16 border-none bg-transparent"
                />
              ) : (
                <div className="divide-y divide-border/50">
                  {recentActivity.map((log) => (
                    <ActivityItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
