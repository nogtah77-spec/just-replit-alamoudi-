import { useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database, Download, Upload, RefreshCw, CheckCircle2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Link } from "wouter";

const KEYS = ["alamoudi_regions","alamoudi_property_types","alamoudi_properties","alamoudi_users","alamoudi_inquiries","alamoudi_finishing_requests","alamoudi_property_requests","alamoudi_settings","alamoudi_favorites","alamoudi_compare"];

export default function Backup() {
  const data = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            النسخ الاحتياطي واستعادة البيانات مخصصة لمدير النظام فقط.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const handleExport = () => {
    const backup: Record<string, any> = { exportedAt: new Date().toISOString(), version: "1.0" };
    KEYS.forEach(k => {
      try { const v = localStorage.getItem(k); if (v) backup[k] = JSON.parse(v); } catch {}
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `alamoudi-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "تم تصدير النسخة الاحتياطية بنجاح" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string);
        let count = 0;
        KEYS.forEach(k => {
          if (backup[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(backup[k])); count++;
          }
        });

        // Clear platform reset flag so imported data doesn't get ignored
        localStorage.removeItem("alm_platform_reset_flag");

        // If properties were included in backup, also sync them directly to Supabase cloud!
        if (Array.isArray(backup.alamoudi_properties) && backup.alamoudi_properties.length > 0) {
          const { supabaseService } = await import("@/lib/supabaseService");
          await supabaseService.savePropertiesBulk(backup.alamoudi_properties);
        }

        toast({ title: "تم استيراد النسخة الاحتياطية وحفظها سحابياً ✓", description: `تم استعادة ${count} مجموعة بيانات. يرجى تحديث الصفحة.` });
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast({ title: "فشل استيراد النسخة الاحتياطية", description: "تأكد من أن الملف صحيح وغير تالف.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReset = async () => {
    if (!confirm("هل أنت متأكد؟ سيتم حذف جميع البيانات والعقارات من السحابة والمحلي نهائياً.")) return;
    await data.resetAllProperties();
    KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.setItem("alm_platform_reset_flag", "true");
    toast({ title: "تم تنظيف وإعادة ضبط المنصة بنجاح", description: "يتم تحديث الصفحة..." });
    setTimeout(() => window.location.reload(), 1500);
  };

  const stats = [
    { label: "العقارات", count: data.properties.length },
    { label: "المستخدمين", count: data.users.length },
    { label: "الاستفسارات", count: data.inquiries.length },
    { label: "طلبات التشطيبات", count: data.finishingRequests.length },
    { label: "طلبات إضافة عقار", count: data.propertyRequests.length },
    { label: "المناطق", count: data.regions.length },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="النسخ الاحتياطي"
          subtitle="تصدير واستيراد واستعادة بيانات المنصة"
          eyebrow="حماية البيانات"
          icon={Database}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 text-center card-luxury">
              <div className="text-2xl font-bold text-accent">{s.count}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-luxury border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-accent" />تصدير نسخة احتياطية</CardTitle>
              <CardDescription>تصدير جميع بيانات المنصة في ملف JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />جميع العقارات والبيانات
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />الإعدادات والأرقام
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />الاستفسارات والطلبات
                </div>
              </div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />تصدير نسخة احتياطية
              </Button>
            </CardContent>
          </Card>

          <Card className="card-luxury border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-blue-500" />استيراد نسخة احتياطية</CardTitle>
              <CardDescription>استعادة البيانات من ملف نسخة احتياطية سابق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}>
                <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">اختر ملف النسخة الاحتياطية</p>
                <p className="text-xs text-muted-foreground mt-1">ملفات JSON فقط</p>
              </div>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />اختيار الملف واستيراده
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="card-luxury border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600"><RefreshCw className="h-5 w-5" />إعادة ضبط المنصة</CardTitle>
            <CardDescription>حذف جميع البيانات وإعادة الموقع إلى الإعدادات الافتراضية</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">تحذير: هذا الإجراء لا يمكن التراجع عنه. يُنصح بتصدير نسخة احتياطية قبل المتابعة.</p>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 gap-2" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />إعادة ضبط جميع البيانات
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
