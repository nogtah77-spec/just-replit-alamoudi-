import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Save, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PERMISSION_GROUPS, getStoredPermissions, saveStoredPermissions } from "@/lib/permissions";
import { Link } from "wouter";

export default function Roles() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>(() => getStoredPermissions());

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            هذه الصفحة مخصصة لمدير النظام فقط لتحديد مستويات الوصول والأمان في المنصة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const roles = [
    { id: "admin", name: "مدير النظام", desc: "صلاحيات كاملة على جميع أجزاء المنصة (لا يمكن تقييدها)" },
    { id: "agent", name: "مستشار عقاري", desc: "إدارة العقارات والرد على استفسارات العملاء حسب الصلاحيات الممنوحة له أدناه" },
    { id: "customer", name: "عميل", desc: "تصفح العقارات وحفظ المفضلة وتقديم الطلبات" },
  ];

  const togglePerm = (roleId: string, permKey: string) => {
    if (roleId === "admin") return;
    setPerms(prev => ({
      ...prev,
      [roleId]: { ...(prev[roleId] || {}), [permKey]: !(prev[roleId]?.[permKey] ?? false) },
    }));
  };

  const savePerm = () => {
    saveStoredPermissions(perms);
    toast({ title: "تم الحفظ بنجاح", description: "تم تحديث وتفعيل الصلاحيات فوراً في كافة صفحات النظام." });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="الأدوار والصلاحيات"
          subtitle="تحديد مستويات الوصول وصلاحيات كل دور"
          eyebrow="الأمان والتحكم"
          icon={ShieldCheck}
          actions={
            <Button className="h-10 gap-2 bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]" onClick={savePerm}>
              <Save className="h-4 w-4" />
              حفظ التغييرات
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id} className={role.id === "admin" ? "border-accent shadow-md bg-accent/5" : ""}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`h-5 w-5 ${role.id === "admin" ? "text-accent" : "text-muted-foreground"}`} />
                  <CardTitle>{role.name}</CardTitle>
                </div>
                <CardDescription>{role.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {PERMISSION_GROUPS.map((group, i) => (
                    <div key={i} className="space-y-3">
                      <h4 className="font-semibold text-sm border-b pb-1 text-foreground">{group.category}</h4>
                      <div className="space-y-2">
                        {group.items.map((item, j) => {
                          const isChecked = role.id === "admin" || !!(perms[role.id]?.[item.key]);
                          return (
                            <div key={j} className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox 
                                id={`${role.id}-${i}-${j}`} 
                                checked={isChecked}
                                disabled={role.id === "admin"}
                                onCheckedChange={() => togglePerm(role.id, item.key)}
                              />
                              <Label htmlFor={`${role.id}-${i}-${j}`} className="text-sm font-normal cursor-pointer text-muted-foreground hover:text-foreground">
                                {item.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
