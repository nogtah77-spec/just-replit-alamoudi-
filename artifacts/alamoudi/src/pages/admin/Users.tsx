import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Users as UsersIcon, Pencil, Trash2, Eye, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useData, User } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { checkUserPermission } from "@/lib/permissions";
import { Link } from "wouter";

const roleLabels = { admin: "مدير النظام", agent: "مستشار عقاري", customer: "عميل" };

export default function Users() {
  const { users, addUser, updateUser, deleteUser, toggleUser } = useData();
  const { currentUser, refreshCurrentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canView = isAdmin || checkUserPermission(currentUser, "إدارة المستخدمين-عرض المستخدمين");
  const canAdd = isAdmin || checkUserPermission(currentUser, "إدارة المستخدمين-إضافة مستخدم");
  const canEdit = isAdmin || checkUserPermission(currentUser, "إدارة المستخدمين-تعديل صلاحيات");
  const canToggle = isAdmin || checkUserPermission(currentUser, "إدارة المستخدمين-حظر مستخدم");
  const canDelete = isAdmin;

  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    role: "customer" as any,
    password: "",
    canClearActivityLogs: false,
  });

  const isStaffRole = form.role === "admin" || form.role === "agent";

  if (!canView) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية عرض وإدارة المستخدمين. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const filteredUsers = users.filter(u => 
    !search || 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!canAdd) {
      toast({ title: "غير مصرح", description: "ليس لديك صلاحية إضافة مستخدمين جدد", variant: "destructive" });
      return;
    }
    if (!form.name || !form.email) {
      toast({ title: "خطأ", description: "يرجى إدخال الاسم والبريد الإلكتروني", variant: "destructive" });
      return;
    }
    const finalUsername = (form.username.trim() || form.email.split("@")[0].trim() || form.name.trim().replace(/\s+/g, "_")).toLowerCase();
    const finalPassword = form.password.trim() || "123456";
    setIsSubmitting(true);
    try {
      const saved = await addUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        username: finalUsername,
        password: finalPassword,
        canClearActivityLogs: form.role === "agent" ? form.canClearActivityLogs : false,
        active: true,
      });
      if (!saved) return;
      setShowAddDialog(false);
      toast({ title: "تم بنجاح", description: `تمت إضافة المستخدم بنجاح. اسم المستخدم: ${finalUsername}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!canEdit) {
      toast({ title: "غير مصرح", description: "ليس لديك صلاحية تعديل بيانات أو أدوار المستخدمين", variant: "destructive" });
      return;
    }
    if (!editTarget || !form.name || !form.email) return;
    const finalUsername = (form.username.trim() || form.email.split("@")[0].trim() || form.name.trim().replace(/\s+/g, "_")).toLowerCase();
    const saved = await updateUser(editTarget.id, {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      username: finalUsername,
      canClearActivityLogs: form.role === "agent" ? form.canClearActivityLogs : false,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    });
    if (saved && editTarget.id === currentUser?.id) {
      await refreshCurrentUser();
    }
    setEditTarget(null);
    toast({ title: "تم بنجاح", description: "تم تحديث بيانات المستخدم بنجاح" });
  };

  const handleDelete = () => {
    if (!canDelete) {
      toast({ title: "غير مصرح", description: "حذف المستخدمين مخصص لمدير النظام فقط", variant: "destructive" });
      return;
    }
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) {
      toast({
        title: "لا يمكن حذف حسابك",
        description: "اترك حسابك الإداري موجودًا حتى لا تفقد الوصول إلى المنصة.",
        variant: "destructive",
      });
      return;
    }
    deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    toast({ title: "تم بنجاح", description: "تم حذف المستخدم بنجاح" });
  };

  const handleToggle = (id: string) => {
    if (!canToggle) {
      toast({ title: "غير مصرح", description: "ليس لديك صلاحية تغيير حالة المستخدمين", variant: "destructive" });
      return;
    }
    if (id === currentUser?.id) {
      toast({
        title: "لا يمكن تعطيل حسابك",
        description: "اترك حسابك الإداري نشطًا حتى لا تفقد الوصول إلى المنصة.",
        variant: "destructive",
      });
      return;
    }
    toggleUser(id);
    toast({ title: "تم بنجاح", description: "تم تحديث حالة المستخدم" });
  };

  const [showAddPass, setShowAddPass] = useState(false);
  const [showEditPass, setShowEditPass] = useState(false);

  const openAdd = () => {
    setForm({ name: "", email: "", username: "", role: "agent", password: "", canClearActivityLogs: false });
    setShowAddPass(false);
    setShowAddDialog(true);
  };

  const openEdit = (u: User) => {
    setForm({
      name: u.name,
      email: u.email,
      username: u.username || u.email.split("@")[0] || "",
      role: u.role,
      password: "", // لا يتم جلب أو إظهار كلمة المرور القديمة نهائياً لحماية الخصوصية
      canClearActivityLogs: u.canClearActivityLogs ?? false,
    });
    setShowEditPass(false);
    setEditTarget(u);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="إدارة المستخدمين"
          subtitle="عرض وإدارة حسابات المستخدمين وصلاحياتهم"
          eyebrow="فريق العمل والوصول"
          icon={UsersIcon}
          actions={
            canAdd ? (
              <Button className="h-10 gap-2 bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                مستخدم جديد
              </Button>
            ) : undefined
          }
        />

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="بحث بالاسم أو البريد الإلكتروني..." 
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="border rounded-md bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانضمام</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{roleLabels[user.role]}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}>
                      {user.active ? "نشط" : "غير نشط"}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(user.joinedAt).toLocaleDateString("ar-SA-u-nu-latn")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="تعديل المستخدم">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canToggle && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "لا يمكن تعطيل حسابك أثناء تسجيل الدخول" : user.active ? "تعطيل الحساب" : "تفعيل الحساب"}
                          onClick={() => handleToggle(user.id)}
                        >
                          {user.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "لا يمكن حذف حسابك أثناء تسجيل الدخول" : "حذف الحساب"}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState 
                      icon={<UsersIcon className="h-8 w-8" />}
                      title="لا يوجد مستخدمين"
                      description="لم يتم العثور على أي مستخدمين مسجلين في المنصة."
                      className="border-none py-12 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                placeholder="الاسم الكامل"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    name,
                    username: prev.username || name.trim().replace(/\s+/g, "_").toLowerCase(),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                dir="ltr"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => {
                  const email = e.target.value;
                  const prefix = email.split("@")[0].toLowerCase();
                  setForm(prev => ({
                    ...prev,
                    email,
                    username: prev.username && prev.username !== prev.email.split("@")[0].toLowerCase() ? prev.username : prefix,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>الدور والصلاحية</Label>
                <Select
                  value={form.role}
                  disabled={editTarget?.id === currentUser?.id}
                  onValueChange={(val: any) => setForm({ ...form, role: val })}
                >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير النظام (كامل الصلاحيات)</SelectItem>
                  <SelectItem value="agent">مستشار عقاري (موظف)</SelectItem>
                  <SelectItem value="customer">عميل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم (لتسجيل الدخول)</Label>
              <Input
                dir="ltr"
                placeholder="مثال: ahmed"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <div className="relative">
                <Input
                  type={showAddPass ? "text" : "password"}
                  dir="ltr"
                  placeholder="أدخل كلمة المرور (أو اتركها فارغة لـ 123456)"
                  className="pl-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAddPass(!showAddPass)}
                >
                  {showAddPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {isAdmin && form.role === "agent" && (
              <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
                <Checkbox
                  id="new-user-clear-activity-logs"
                  checked={form.canClearActivityLogs}
                  onCheckedChange={(checked) => setForm({ ...form, canClearActivityLogs: checked === true })}
                />
                <div className="space-y-1">
                  <Label htmlFor="new-user-clear-activity-logs" className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    السماح بتصفير سجلات النشاط
                  </Label>
                  <p className="text-xs leading-5 text-muted-foreground">صلاحية حساسة تمنح الموظف حذف سجل النشاط بالكامل بعد التأكيد.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? "جارٍ الحفظ..." : "إضافة المستخدم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الدور والصلاحية</Label>
              <Select value={form.role} onValueChange={(val: any) => setForm({ ...form, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير النظام (كامل الصلاحيات)</SelectItem>
                  <SelectItem value="agent">مستشار عقاري (موظف)</SelectItem>
                  <SelectItem value="customer">عميل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input dir="ltr" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })} />
            </div>
            <div className="space-y-2">
              <Label>تعيين كلمة مرور جديدة <span className="text-muted-foreground font-normal">(اختياري - اتركها فارغة للإبقاء على الحالية)</span></Label>
              <div className="relative">
                <Input
                  type={showEditPass ? "text" : "password"}
                  dir="ltr"
                  placeholder="••••••••"
                  className="pl-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowEditPass(!showEditPass)}
                >
                  {showEditPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {isAdmin && form.role === "agent" && (
              <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
                <Checkbox
                  id="edit-user-clear-activity-logs"
                  checked={form.canClearActivityLogs}
                  onCheckedChange={(checked) => setForm({ ...form, canClearActivityLogs: checked === true })}
                />
                <div className="space-y-1">
                  <Label htmlFor="edit-user-clear-activity-logs" className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    السماح بتصفير سجلات النشاط
                  </Label>
                  <p className="text-xs leading-5 text-muted-foreground">صلاحية حساسة تمنح الموظف حذف سجل النشاط بالكامل بعد التأكيد.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button onClick={handleEdit}>حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
