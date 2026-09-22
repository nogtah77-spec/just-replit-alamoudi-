import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useData,
  type CustomerPropertyRequest,
  type CustomerPropertyRequestStatus,
} from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatMoneyText, formatNumericInput, toNumericString } from "@/lib/utils";

const requestTypes = ["شقة", "فيلا", "قصر", "تاون هاوس", "دوبلكس", "أرض", "محل تجاري", "مكتب إداري", "عيادة طبية", "مصنع/مخزن", "أخرى"];
const transactionTypes = ["شراء", "إيجار", "استثمار / شراكة"];
const statusValues: CustomerPropertyRequestStatus[] = ["new", "reviewed", "replied", "closed"];
const statusMeta: Record<CustomerPropertyRequestStatus, { label: string; className: string }> = {
  new: { label: "جديد — لم تتم المتابعة", className: "bg-red-500/10 text-red-700 dark:text-red-300" },
  reviewed: { label: "قيد المتابعة", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  replied: { label: "تم التواصل", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  closed: { label: "مغلق", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

const statusOptionClass = (value: CustomerPropertyRequestStatus) =>
  value === "new"
    ? "text-red-700 dark:text-red-300 focus:bg-background focus:text-red-700 dark:focus:text-red-300 data-[state=checked]:text-red-700 dark:data-[state=checked]:text-red-300 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-black hover:text-black"
    : undefined;

type RequestForm = Omit<CustomerPropertyRequest, "id" | "createdAt" | "status">;

const emptyForm: RequestForm = {
  customerName: "",
  phone: "",
  whatsapp: "",
  email: "",
  requestType: "",
  transactionType: "",
  preferredAreas: "",
  budgetMin: "",
  budgetMax: "",
  bedrooms: "",
  bathrooms: "",
  areaMin: "",
  areaMax: "",
  finishing: "",
  furnished: "",
  paymentMethod: "",
  requiredFeatures: "",
  details: "",
  notes: "",
  source: "",
  followUpDate: "",
  assignedStaffId: "",
  viewingDate: "",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "تاريخ غير معروف"
    : date.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ar-SA-u-nu-latn", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function displayRange(min: string, max: string, suffix = "") {
  if (!min && !max) return "غير محددة";
  const formattedMin = formatMoneyText(min);
  const formattedMax = formatMoneyText(max);
  if (min && max) return `${formattedMin} - ${formattedMax}${suffix}`;
  return `${formattedMin || formattedMax}${suffix} ${min ? "فأكثر" : "كحد أقصى"}`;
}

function requestTitle(item: CustomerPropertyRequest) {
  return [item.transactionType, item.requestType].filter(Boolean).join(" ") || "طلب عقاري";
}

function staffLabel(user: { name: string; username?: string; email: string }) {
  const accountName = user.username ? `@${user.username}` : user.email;
  return user.name ? `${accountName} — ${user.name}` : accountName;
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}{required && <span className="mr-1 text-destructive">*</span>}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function RangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  suffix,
  numeric = false,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
  suffix?: string;
  numeric?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="font-semibold">{label}</Label>
        {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Input value={numeric ? formatNumericInput(min) : min} inputMode={numeric ? "decimal" : undefined} dir={numeric ? "ltr" : undefined} onChange={(event) => onMinChange(numeric ? formatNumericInput(event.target.value) : event.target.value)} placeholder={minPlaceholder} aria-label={`${label} من`} />
        <span className="text-xs font-semibold text-muted-foreground">إلى</span>
        <Input value={numeric ? formatNumericInput(max) : max} inputMode={numeric ? "decimal" : undefined} dir={numeric ? "ltr" : undefined} onChange={(event) => onMaxChange(numeric ? formatNumericInput(event.target.value) : event.target.value)} placeholder={maxPlaceholder} aria-label={`${label} إلى`} />
      </div>
    </div>
  );
}

export default function CustomerRequests() {
  const {
    customerPropertyRequests,
    users,
    addCustomerPropertyRequest,
    updateCustomerPropertyRequest,
    deleteCustomerPropertyRequest,
    fetching,
    reload,
  } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | CustomerPropertyRequestStatus>("all");
  const [selected, setSelected] = useState<CustomerPropertyRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerPropertyRequest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerPropertyRequest | null>(null);
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const staffUsers = useMemo(
    () => users.filter((user) => user.role === "admin" || user.role === "agent"),
    [users],
  );

  const counts = useMemo(() => ({
    all: customerPropertyRequests.length,
    new: customerPropertyRequests.filter((item) => item.status === "new").length,
    reviewed: customerPropertyRequests.filter((item) => item.status === "reviewed").length,
    replied: customerPropertyRequests.filter((item) => item.status === "replied").length,
    closed: customerPropertyRequests.filter((item) => item.status === "closed").length,
  }), [customerPropertyRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return [...customerPropertyRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((item) => {
        const haystack = [
          item.customerName,
          item.phone,
          item.whatsapp,
          item.email,
          item.requestType,
          item.transactionType,
          item.preferredAreas,
          item.assignedStaffId,
          item.details,
          item.requiredFeatures,
        ].join(" ").toLocaleLowerCase("ar");
        return (status === "all" || item.status === status) && (!query || haystack.includes(query));
      });
  }, [customerPropertyRequests, search, status]);

  const updateForm = (key: keyof RequestForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (item: CustomerPropertyRequest) => {
    const { id: _id, createdAt: _createdAt, status: _status, ...values } = item;
    setEditing(item);
    setForm(values);
    setSelected(null);
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast({ title: "بيانات العميل ناقصة", description: "اكتب اسم العميل ورقم الهاتف قبل الحفظ.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const saved = editing
      ? await updateCustomerPropertyRequest(editing.id, form)
      : await addCustomerPropertyRequest(form);
    setIsSaving(false);
    if (!saved) return;
    setFormOpen(false);
    setEditing(null);
    toast({ title: editing ? "تم تحديث الطلب العقاري" : "تم تسجيل الطلب العقاري", description: "تم حفظ بيانات العميل واحتياجاته بنجاح." });
  };

  const updateStatus = async (item: CustomerPropertyRequest, nextStatus: CustomerPropertyRequestStatus) => {
    const saved = await updateCustomerPropertyRequest(item.id, { status: nextStatus });
    if (saved) {
      setSelected((current) => current?.id === item.id ? { ...current, status: nextStatus } : current);
      toast({ title: "تم تحديث حالة الطلب", description: statusMeta[nextStatus].label });
    }
  };

  const deleteRequest = () => {
    if (!deleteTarget) return;
    deleteCustomerPropertyRequest(deleteTarget.id);
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    toast({ title: "تم حذف الطلب العقاري" });
  };

  const renderDetail = (label: string, value: string, icon?: typeof Home) => {
    if (!value) return null;
    const Icon = icon;
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{Icon && <Icon className="h-3.5 w-3.5" />}{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{value}</p>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6" dir="rtl">
        <AdminPageHeader
          title="طلبات العملاء"
          subtitle="تنظيم احتياجات العملاء ومتابعتها حتى إتمام التواصل"
          eyebrow="إدارة احتياجات العملاء"
          icon={ClipboardList}
          actions={
            <>
              <Button
                variant="outline"
                className="h-10 gap-2 border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 hover:text-white"
                onClick={() => void reload()}
                disabled={fetching}
              >
                <RefreshCw className={fetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                تحديث
              </Button>
              <Button
                className="h-10 gap-2 border border-[#C7B6A6] bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4" />
                إضافة طلب عقاري
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "إجمالي الطلبات", value: counts.all, icon: ClipboardList, className: "text-accent" },
            { label: "جديد — لم تتم المتابعة", value: counts.new, icon: CheckCircle2, className: "text-red-600" },
            { label: "قيد المتابعة", value: counts.reviewed, icon: RefreshCw, className: "text-amber-600" },
            { label: "تم التواصل", value: counts.replied, icon: CheckCircle2, className: "text-emerald-600" },
            { label: "مغلق", value: counts.closed, icon: CheckCircle2, className: "text-slate-600" },
          ].map((stat) => (
            <Card key={stat.label} className="card-luxury">
              <CardContent className="flex items-center justify-between p-4 sm:p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{stat.value}</p>
                </div>
                <stat.icon className={`h-5 w-5 ${stat.className}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-luxury">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم العميل أو الهاتف أو المنطقة أو تفاصيل الطلب..." className="pr-9" />
            </div>
            <Select value={status} onValueChange={(value: "all" | CustomerPropertyRequestStatus) => setStatus(value)}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {statusValues.map((value) => <SelectItem key={value} value={value} className={statusOptionClass(value)}>{statusMeta[value].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">سجل طلبات العملاء</h2>
            <p className="mt-1 text-xs text-muted-foreground">{filteredRequests.length} طلب ظاهر في العرض الحالي</p>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">الاستفسارات والتشطيبات لها صفحات مستقلة</span>
        </div>

        {fetching && customerPropertyRequests.length === 0 ? (
          <div className="grid gap-4">{[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title={customerPropertyRequests.length === 0 ? "لا توجد طلبات عقارية مسجلة" : "لا توجد نتائج مطابقة"}
            description={customerPropertyRequests.length === 0 ? "ابدأ بتسجيل احتياج العميل بالتفصيل حتى يتابعه فريق العمل." : "جرّب تغيير البحث أو فلتر الحالة."}
            action={customerPropertyRequests.length === 0 ? { label: "إضافة أول طلب", onClick: openCreate } : { label: "مسح البحث", onClick: () => { setSearch(""); setStatus("all"); } }}
            className="py-16"
          />
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((item) => (
              <Card key={item.id} className={`card-luxury overflow-hidden border-r-4 ${item.status === "new" ? "border-r-accent" : "border-r-transparent"}`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><UserRound className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge className="border-none bg-accent/10 text-[11px] text-accent">طلب عقاري</Badge>
                          <Badge className={`border-none text-[11px] ${statusMeta[item.status].className}`}>{statusMeta[item.status].label}</Badge>
                        </div>
                        <h3 className="text-base font-bold text-foreground">{item.customerName}</h3>
                        <p className="mt-1 text-sm font-medium text-accent">{requestTitle(item)}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {item.details || item.requiredFeatures || "لم تتم إضافة وصف تفصيلي بعد."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                           {[item.preferredAreas, item.bedrooms && `${item.bedrooms} غرف`, item.bathrooms && `${item.bathrooms} حمام`, item.budgetMax && `حتى ${formatMoneyText(item.budgetMax)}`].filter(Boolean).map((tag) => (
                            <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>
                          ))}
                          {item.assignedStaffId && (
                            <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] text-primary">
                              المسؤول: {(() => {
                                const user = users.find((candidate) => candidate.id === item.assignedStaffId);
                                return user ? staffLabel(user) : "موظف محدد";
                              })()}
                            </span>
                          )}
                          {item.viewingDate && (
                            <span className="rounded-md bg-accent/10 px-2 py-1 text-[11px] text-accent">
                              المعاينة: {formatDateTime(item.viewingDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 lg:w-80 lg:flex-col lg:items-stretch lg:border-t-0 lg:border-r lg:pt-0 lg:pr-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.createdAt)}</div>
                      <div className="flex flex-wrap gap-2">
                        {item.phone && <a href={`tel:${cleanPhone(item.phone)}`} dir="ltr" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-accent"><Phone className="h-3.5 w-3.5" />اتصال</a>}
                        {(item.whatsapp || item.phone) && <a href={`https://wa.me/${cleanPhone(item.whatsapp || item.phone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10"><WhatsAppIcon className="h-3.5 w-3.5" />واتساب</a>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={item.status} onValueChange={(value: CustomerPropertyRequestStatus) => void updateStatus(item, value)}>
                          <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{statusValues.map((value) => <SelectItem key={value} value={value} className={statusOptionClass(value)}>{statusMeta[value].label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelected(item)} title="عرض التفاصيل"><ArrowLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(item)} title="تعديل الطلب"><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(item)} title="حذف الطلب"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>{editing ? "تعديل الطلب العقاري" : "إضافة طلب عقاري للعميل"}</DialogTitle>
            <DialogDescription>سجّل الاحتياج كما طلبه العميل، حتى لو لم يكن العقار متوفرًا حاليًا في المنصة.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2"><UserRound className="h-4 w-4 text-accent" /><h3 className="font-semibold">بيانات العميل</h3></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="اسم العميل" value={form.customerName} onChange={(value) => updateForm("customerName", value)} required placeholder="الاسم بالكامل" />
                <FormInput label="رقم الهاتف" value={form.phone} onChange={(value) => updateForm("phone", value)} required placeholder="01xxxxxxxxx" type="tel" />
                <FormInput label="رقم واتساب" value={form.whatsapp} onChange={(value) => updateForm("whatsapp", value)} placeholder="اتركه فارغًا لاستخدام رقم الهاتف" type="tel" />
                <FormInput label="البريد الإلكتروني" value={form.email} onChange={(value) => updateForm("email", value)} placeholder="name@example.com" type="email" />
                <FormInput label="مصدر العميل" value={form.source} onChange={(value) => updateForm("source", value)} placeholder="معرفة شخصية، إعلان، واتساب..." />
                <FormInput label="موعد المتابعة" value={form.followUpDate} onChange={(value) => updateForm("followUpDate", value)} type="date" />
                <div className="space-y-2">
                  <Label>الموظف المسؤول</Label>
                  <Select
                    value={form.assignedStaffId || "__unassigned"}
                    onValueChange={(value) => updateForm("assignedStaffId", value === "__unassigned" ? "" : value)}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر الموظف المسؤول" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">غير محدد حاليًا</SelectItem>
                      {staffUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {staffLabel(user)} · {user.role === "admin" ? "مدير النظام" : "مستشار عقاري"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormInput label="موعد المعاينة" value={form.viewingDate} onChange={(value) => updateForm("viewingDate", value)} type="datetime-local" />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2"><Home className="h-4 w-4 text-accent" /><h3 className="font-semibold">مواصفات العقار المطلوب</h3></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect label="نوع العقار" value={form.requestType} onChange={(value) => updateForm("requestType", value)} options={requestTypes} placeholder="اختر نوع العقار" />
                <FormSelect label="الغرض" value={form.transactionType} onChange={(value) => updateForm("transactionType", value)} options={transactionTypes} placeholder="شراء أم إيجار؟" />
                <FormInput label="المناطق المفضلة" value={form.preferredAreas} onChange={(value) => updateForm("preferredAreas", value)} placeholder="مثال: التجمع، العاصمة، الشيخ زايد" />
                <FormSelect label="التشطيب المطلوب" value={form.finishing} onChange={(value) => updateForm("finishing", value)} options={["بدون تشطيب", "نصف تشطيب", "تشطيب كامل", "فاخر", "لا يهم"]} placeholder="اختر مستوى التشطيب" />
                <RangeInput
                  label="الميزانية"
                  min={form.budgetMin}
                  max={form.budgetMax}
                  onMinChange={(value) => updateForm("budgetMin", value)}
                  onMaxChange={(value) => updateForm("budgetMax", value)}
                  minPlaceholder="من: 3,000,000"
                  maxPlaceholder="إلى: 5,000,000"
                  suffix="بالجنيه"
                   numeric
                />
                <FormInput label="عدد الغرف" value={form.bedrooms} onChange={(value) => updateForm("bedrooms", value)} placeholder="مثال: 3" />
                <FormInput label="عدد الحمامات" value={form.bathrooms} onChange={(value) => updateForm("bathrooms", value)} placeholder="مثال: 2" />
                <RangeInput
                  label="المساحة"
                  min={form.areaMin}
                  max={form.areaMax}
                  onMinChange={(value) => updateForm("areaMin", value)}
                  onMaxChange={(value) => updateForm("areaMax", value)}
                  minPlaceholder="من: 150"
                  maxPlaceholder="إلى: 220"
                  suffix="م²"
                />
                <FormSelect label="مفروش؟" value={form.furnished} onChange={(value) => updateForm("furnished", value)} options={["مفروش", "غير مفروش", "لا يهم"]} placeholder="اختر" />
                <FormInput label="طريقة السداد" value={form.paymentMethod} onChange={(value) => updateForm("paymentMethod", value)} placeholder="كاش، تقسيط، مقدم..." />
              </div>
              <div className="space-y-2">
                <Label>المميزات والشروط المهمة</Label>
                <Textarea value={form.requiredFeatures} onChange={(event) => updateForm("requiredFeatures", event.target.value)} placeholder="مثال: أسانسير، جراج، فيو مفتوح، قريب من المدارس..." className="min-h-20" />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2"><FileText className="h-4 w-4 text-accent" /><h3 className="font-semibold">تفاصيل المتابعة</h3></div>
              <div className="space-y-2">
                <Label>تفاصيل طلب العميل</Label>
                <Textarea value={form.details} onChange={(event) => updateForm("details", event.target.value)} placeholder="اكتب الطلب بصياغة مفصلة: ماذا يريد العميل تحديدًا؟ وما الأولويات أو الاستثناءات؟" className="min-h-28" />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات الموظف</Label>
                <Textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="ملاحظات داخلية عن التواصل أو العقارات المقترحة..." className="min-h-20" />
              </div>
            </section>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={() => void submitForm()} disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "تسجيل الطلب"}</Button>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto" dir="rtl">
          {selected && (
            <>
              <DialogHeader className="text-right">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-none bg-accent/10 text-accent">طلب عقاري</Badge>
                  <Badge className={`border-none ${statusMeta[selected.status].className}`}>{statusMeta[selected.status].label}</Badge>
                </div>
                <DialogTitle>{selected.customerName}</DialogTitle>
                <DialogDescription>{requestTitle(selected)} · {formatDate(selected.createdAt)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {selected.phone && <a href={`tel:${cleanPhone(selected.phone)}`} className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-2.5 text-xs font-medium text-accent-foreground"><Phone className="h-3.5 w-3.5" />اتصال</a>}
                  {(selected.whatsapp || selected.phone) && <a href={`https://wa.me/${cleanPhone(selected.whatsapp || selected.phone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2.5 text-xs font-medium text-white"><WhatsAppIcon className="h-3.5 w-3.5" />واتساب</a>}
                  {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2.5 text-xs font-medium"><Mail className="h-3.5 w-3.5" />البريد</a>}
                  <Button variant="outline" className="h-auto gap-1.5 px-2 py-2.5 text-xs" onClick={() => openEdit(selected)}><Edit3 className="h-3.5 w-3.5" />تعديل</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderDetail("نوع العقار", selected.requestType, Home)}
                  {renderDetail("الغرض", selected.transactionType, ClipboardList)}
                  {renderDetail("المناطق المفضلة", selected.preferredAreas, MapPin)}
                  {renderDetail("الميزانية", displayRange(selected.budgetMin, selected.budgetMax, " جنيه"), Wallet)}
                  {renderDetail("الغرف والحمامات", [selected.bedrooms && `${selected.bedrooms} غرف`, selected.bathrooms && `${selected.bathrooms} حمام`].filter(Boolean).join(" · "))}
                  {renderDetail("المساحة", displayRange(selected.areaMin, selected.areaMax, " م²"))}
                  {renderDetail("التشطيب", selected.finishing)}
                  {renderDetail("مفروش", selected.furnished)}
                  {renderDetail("طريقة السداد", selected.paymentMethod)}
                  {renderDetail("مصدر العميل", selected.source)}
                  {renderDetail("موعد المتابعة", selected.followUpDate, CalendarDays)}
                  {renderDetail("الموظف المسؤول", (() => {
                    const user = users.find((candidate) => candidate.id === selected.assignedStaffId);
                    return user ? `${staffLabel(user)} · ${user.role === "admin" ? "مدير النظام" : "مستشار عقاري"}` : selected.assignedStaffId;
                  })(), UserRound)}
                  {renderDetail("موعد المعاينة", formatDateTime(selected.viewingDate), CalendarDays)}
                </div>
                {renderDetail("المميزات والشروط المهمة", selected.requiredFeatures)}
                {renderDetail("تفاصيل طلب العميل", selected.details, FileText)}
                {renderDetail("ملاحظات الموظف", selected.notes)}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">تحديث الحالة</p>
                  <Select value={selected.status} onValueChange={(value: CustomerPropertyRequestStatus) => void updateStatus(selected, value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statusValues.map((value) => <SelectItem key={value} value={value} className={statusOptionClass(value)}>{statusMeta[value].label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(selected)}><Trash2 className="h-4 w-4" />حذف الطلب</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطلب العقاري؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف طلب {deleteTarget?.customerName || "العميل"} نهائيًا. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteRequest}>حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}