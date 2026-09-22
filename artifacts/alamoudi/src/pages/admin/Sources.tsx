import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  Plus,
  X,
  Download,
  Edit2,
  Trash2,
  Search,
  BookUser,
  Handshake,
  UserCheck,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Building,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Link } from "wouter";

import { useAuth } from "@/context/AuthContext";
import { checkUserPermission } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";

export default function Sources() {
  const {
    properties,
    propertyTypes,
    regions,
    users,
    updateProperty,
  } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canManageSources = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-مصادر العقارات");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "direct" | "broker" | "missing">("all");

  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    source: string;
    sourcePhones: string[];
    sourceEmail: string;
    sourceLocation: string;
    sourceNotes: string;
    assignedStaffId: string;
    agentType: "direct" | "broker" | "unspecified";
  }>({
    source: "",
    sourcePhones: [""],
    sourceEmail: "",
    sourceLocation: "",
    sourceNotes: "",
    assignedStaffId: "",
    agentType: "direct",
  });

  if (!canManageSources) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية الوصول إلى إدارة مصادر العقارات وأصحابها. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const staffUsers = useMemo(
    () => users.filter(user => user.role === "admin" || user.role === "agent"),
    [users]
  );

  const staffLabel = (user: typeof staffUsers[number]) => {
    const accountName = user.username ? `@${user.username}` : user.email;
    return user.name ? `${accountName} — ${user.name}` : accountName;
  };

  // Counts based directly on agentType
  const totalDirect = useMemo(
    () => properties.filter(p => p.agentType === "direct").length,
    [properties]
  );
  const totalBroker = useMemo(
    () => properties.filter(p => p.agentType === "broker").length,
    [properties]
  );
  const totalMissing = useMemo(
    () => properties.filter(p => !p.agentType || p.agentType === "unspecified" || p.agentType === ("" as any)).length,
    [properties]
  );

  // Filtered List
  const displayedProperties = useMemo(() => {
    const q = search.trim().toLowerCase();

    return properties.filter(p => {
      const isBroker = p.agentType === "broker";
      const isDirect = p.agentType === "direct";
      const isUnspecified = !p.agentType || p.agentType === "unspecified" || p.agentType === ("" as any);

      // 1. Filter by category
      if (filterType === "direct" && !isDirect) return false;
      if (filterType === "broker" && !isBroker) return false;
      if (filterType === "missing" && !isUnspecified) return false;

      // 2. Filter by search query
      if (!q) return true;

      const staff = staffUsers.find(u => u.id === p.assignedStaffId);
      const staffName = staff ? staffLabel(staff).toLowerCase() : "";

      return (
        p.code?.toLowerCase().includes(q) ||
        p.source?.toLowerCase().includes(q) ||
        p.sourceNotes?.toLowerCase().includes(q) ||
        staffName.includes(q) ||
        p.sourcePhones?.some(ph => ph.includes(q))
      );
    });
  }, [properties, filterType, search, staffUsers]);

  const openEdit = (id: string) => {
    const p = properties.find(x => x.id === id);
    if (!p) return;
    setEditForm({
      source: p.source ?? "",
      sourcePhones: p.sourcePhones?.length ? [...p.sourcePhones] : [""],
      sourceEmail: p.sourceEmail ?? "",
      sourceLocation: p.sourceLocation ?? "",
      sourceNotes: p.sourceNotes ?? "",
      assignedStaffId: p.assignedStaffId ?? "",
      agentType: (p.agentType as "direct" | "broker" | "unspecified") || "unspecified",
    });
    setEditTarget(id);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const saved = await updateProperty(editTarget, {
      source: editForm.source,
      sourcePhones: editForm.sourcePhones.filter(ph => ph.trim()),
      sourceEmail: editForm.sourceEmail,
      sourceLocation: editForm.sourceLocation,
      sourceNotes: editForm.sourceNotes,
      assignedStaffId: editForm.assignedStaffId,
      agentType: editForm.agentType,
    });
    if (!saved) return;
    toast({ title: "تم حفظ بيانات المصدر بنجاح ✓" });
    setEditTarget(null);
  };

  const clearSource = async (id: string) => {
    if (!window.confirm("هل تريد مسح بيانات المصدر لهذا العقار؟")) return;
    const cleared = await updateProperty(id, {
      source: "",
      sourcePhones: [],
      sourceEmail: "",
      sourceLocation: "",
      sourceNotes: "",
      assignedStaffId: "",
      agentType: "unspecified",
    });
    if (!cleared) return;
    toast({ title: "تم مسح بيانات المصدر" });
  };

  const openWhatsApp = (phone: string, propCode?: string, name?: string) => {
    const clean = phone.replace(/\D/g, "");
    const formatted = clean.startsWith("0") ? `20${clean.slice(1)}` : clean.startsWith("20") ? clean : `20${clean}`;
    const msg = encodeURIComponent(
      `مرحباً ${name ? `أستاذ ${name}` : ""}، أتواصل معك بخصوص العقار (${propCode || ""}) من شركة العمودي للتسويق العقاري.`
    );
    window.open(`https://wa.me/${formatted}?text=${msg}`, "_blank");
  };

  const exportCSV = () => {
    const rows = [
      ["كود العقار", "نوع المصدر", "اسم المصدر", "أرقام التواصل", "البريد الإلكتروني", "رابط الموقع", "ملاحظات", "الموظف المسؤول", "نوع العقار", "المنطقة"]
    ];
    displayedProperties.forEach(p => {
      const type = propertyTypes.find(t => t.id === p.typeId)?.name ?? "";
      const region = regions.find(r => r.id === p.regionId)?.name ?? "";
      rows.push([
        p.code,
        p.agentType === "broker" ? "بروكر" : p.agentType === "direct" ? "مالك مباشر" : "غير محدد (-)",
        p.source ?? "",
        (p.sourcePhones ?? []).filter(ph => ph.trim()).join(" / "),
        p.sourceEmail ?? "",
        p.sourceLocation ?? "",
        p.sourceNotes ?? "",
        p.assignedStaffId ? (staffUsers.find(user => user.id === p.assignedStaffId) ? staffLabel(staffUsers.find(user => user.id === p.assignedStaffId)!) : p.assignedStaffId) : "",
        type,
        region,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `مصادر-العقارات-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
        <AdminPageHeader
          title="مصادر العقارات"
          subtitle="سجل موحد لبيانات التواصل مع الملاك والبروكرز — خاصة بالإدارة فقط"
          eyebrow="دليل المصادر"
          icon={BookUser}
          actions={
            <Button
              variant="outline"
              className="h-10 gap-2 border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 hover:text-white text-xs sm:text-sm"
              onClick={exportCSV}
            >
              <Download className="h-4 w-4" />
              تصدير CSV
            </Button>
          }
        />

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-card border-accent shadow-sm ring-1 ring-accent/30"
                : "bg-card/60 border-border/70 hover:border-accent/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">كل العقارات</span>
              <BookUser className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-foreground mt-2">{properties.length}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("direct")}
            className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
              filterType === "direct"
                ? "bg-card border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                : "bg-card/60 border-border/70 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">ملاك مباشرين</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-2">{totalDirect}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("broker")}
            className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
              filterType === "broker"
                ? "bg-card border-amber-500 shadow-sm ring-1 ring-amber-500/30"
                : "bg-card/60 border-border/70 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">عبر بروكرز</span>
              <Handshake className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600 mt-2">{totalBroker}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("missing")}
            className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
              filterType === "missing"
                ? "bg-card border-slate-500 shadow-sm ring-1 ring-slate-500/30"
                : "bg-card/60 border-border/70 hover:border-slate-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">غير محدد (-)</span>
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-muted-foreground mt-2">{totalMissing}</p>
          </button>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              الكل ({properties.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("direct")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "direct"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              🏠 ملاك مباشرين ({totalDirect})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("broker")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "broker"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              🤝 بروكرز ({totalBroker})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("missing")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "missing"
                  ? "bg-muted-foreground text-background shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              ⚪ غير محدد ({totalMissing})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بكود العقار، المالك، البروكر، الهاتف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10 h-10 rounded-xl bg-background text-xs sm:text-sm border-border/80"
            />
          </div>
        </div>

        {/* ── Main Properties List ── */}
        {displayedProperties.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/80">
            <BookUser className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">لا توجد عقارات تطابق هذا البحث</p>
            <p className="text-xs text-muted-foreground mt-1">جرّب اختيار فلتر آخر أو كتابة كود مختلف</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedProperties.map(p => {
              const type = propertyTypes.find(t => t.id === p.typeId)?.name ?? "";
              const region = regions.find(r => r.id === p.regionId)?.name ?? "";
              const staff = staffUsers.find(u => u.id === p.assignedStaffId);
              const isBroker = p.agentType === "broker";
              const isDirect = p.agentType === "direct";
              const hasContact = p.sourcePhones && p.sourcePhones.some(ph => ph.trim());

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-card border border-border/80 hover:border-accent/50 shadow-sm transition-all duration-200 space-y-3 relative overflow-hidden"
                >
                  {/* Top Bar: Code, Badges & Edit Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/properties/${p.id}`}
                        className="font-bold text-accent hover:underline flex items-center gap-1 text-sm"
                      >
                        <span>{p.code}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                      <Badge variant="outline" className="text-[11px] font-medium border-border/60">
                        {type} · {region}
                      </Badge>
                      {isBroker ? (
                        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] font-bold">
                          🤝 بروكر
                        </Badge>
                      ) : isDirect ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                          🏠 مالك مباشر
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-bold">
                          ⚪ غير محدد (-)
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(p.id)}
                        title="تعديل بيانات المصدر"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => clearSource(p.id)}
                        title="مسح بيانات المصدر"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Middle Info: Name & Contact details */}
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {p.source ? (
                          <span>{p.source}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">لم يُسجل اسم</span>
                        )}
                      </span>
                    </div>

                    {/* Phones & Action buttons */}
                    {hasContact ? (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {p.sourcePhones?.filter(ph => ph.trim()).map((phone, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/50 text-xs font-mono">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{phone}</span>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(phone, p.code, p.source)}
                              className="text-emerald-500 hover:text-emerald-400 p-0.5 transition-colors cursor-pointer"
                              title="فتح محادثة واتساب"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        لا توجد أرقام تواصل مسجلة
                      </p>
                    )}

                    {/* Source Notes */}
                    {p.sourceNotes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/30 line-clamp-2">
                        {p.sourceNotes}
                      </p>
                    )}
                  </div>

                  {/* Footer: Assigned Staff */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>الموظف المسؤول:</span>
                    <span className="font-medium text-foreground">
                      {staff ? staffLabel(staff) : "غير محدد"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Edit Source Modal ── */}
        <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل بيانات مصدر العقار</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold">نوع المصدر</Label>
                <Select
                  value={editForm.agentType || "unspecified"}
                  onValueChange={v => setEditForm(f => ({ ...f, agentType: v as "direct" | "broker" | "unspecified" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">- (غير محدد)</SelectItem>
                    <SelectItem value="direct">🏠 مالك مباشر</SelectItem>
                    <SelectItem value="broker">🤝 بروكر (وسيط عقاري)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  {editForm.agentType === "broker" ? "اسم البروكر / الشركة" : editForm.agentType === "direct" ? "اسم المالك" : "اسم المصدر"}
                </Label>
                <Input
                  value={editForm.source}
                  onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="اسم المالك أو البروكر..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">أرقام التواصل</Label>
                <div className="space-y-2">
                  {editForm.sourcePhones.map((ph, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        dir="ltr"
                        className="text-right"
                        placeholder="+20 10 0000 0000"
                        value={ph}
                        onChange={e => {
                          const updated = [...editForm.sourcePhones];
                          updated[i] = e.target.value;
                          setEditForm(f => ({ ...f, sourcePhones: updated }));
                        }}
                      />
                      {editForm.sourcePhones.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setEditForm(f => ({ ...f, sourcePhones: f.sourcePhones.filter((_, idx) => idx !== i) }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {editForm.sourcePhones.length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm(f => ({ ...f, sourcePhones: [...editForm.sourcePhones, ""] }))}
                      className="w-full text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 ml-1" /> أضف رقم
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">ملاحظات المصدر</Label>
                <Textarea
                  rows={2}
                  value={editForm.sourceNotes}
                  onChange={e => setEditForm(f => ({ ...f, sourceNotes: e.target.value }))}
                  placeholder="ملاحظات حول طريقة التواصل أو نسبة العمولة..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">الموظف المسؤول</Label>
                <Select
                  value={editForm.assignedStaffId || "__unassigned"}
                  onValueChange={v => setEditForm(f => ({ ...f, assignedStaffId: v === "__unassigned" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned">غير محدد</SelectItem>
                    {staffUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{staffLabel(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
              <Button onClick={saveEdit} className="bg-primary text-primary-foreground font-bold">حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
