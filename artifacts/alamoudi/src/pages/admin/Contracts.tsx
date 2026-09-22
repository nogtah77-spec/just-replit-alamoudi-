import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Edit3,
  FileCheck2,
  FilePlus2,
  FileText,
  FolderOpen,
  Home,
  Landmark,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Contract,
  ContractDocument,
  ContractInstallment,
  ContractInstallmentStatus,
  ContractStatus,
  ContractType,
  useData,
} from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatNumericInput, toNumericString } from "@/lib/utils";

const typeLabels: Record<ContractType, string> = {
  rent: "إيجار",
  furnished_rent: "إيجار مفروش",
  sale: "بيع",
  installment: "تقسيط / مديونية",
};

const statusLabels: Record<ContractStatus, string> = {
  draft: "مسودة",
  active: "ساري",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusStyles: Record<ContractStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-sky-200 bg-sky-50 text-sky-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

const installmentStatusLabels: Record<ContractInstallmentStatus, string> = {
  pending: "مستحق",
  paid: "مدفوع",
  overdue: "متأخر",
};

function isRentContract(type: ContractType) {
  return type === "rent" || type === "furnished_rent";
}

type ContractForm = Omit<Contract, "id" | "createdAt" | "updatedAt">;

const emptyInstallment: ContractInstallment = {
  id: "",
  dueDate: "",
  amount: "",
  status: "pending",
  notes: "",
};

const emptyForm: ContractForm = {
  contractNumber: "",
  contractType: "rent",
  status: "draft",
  propertyId: "",
  propertyCode: "",
  propertyTitle: "",
  propertyType: "",
  propertyRegion: "",
  propertyAddress: "",
  assignedStaffId: "",
  partyOneRole: "المؤجر / البائع",
  partyOneName: "",
  partyOnePhone: "",
  partyOneEmail: "",
  partyOneNationalId: "",
  partyOneAddress: "",
  partyTwoRole: "المستأجر / المشتري",
  partyTwoName: "",
  partyTwoPhone: "",
  partyTwoEmail: "",
  partyTwoNationalId: "",
  partyTwoAddress: "",
  startDate: "",
  endDate: "",
  signingDate: "",
  handoverDate: "",
  renewalDate: "",
  noticePeriod: "",
  totalAmount: "",
  paidAmount: "",
  remainingAmount: "",
  insuranceAmount: "",
  depositAmount: "",
  currency: "جنيه مصري",
  paymentMethod: "",
  paymentFrequency: "",
  nextPaymentDate: "",
  installments: [],
  terms: "",
  notes: "",
  documents: [],
};

function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(value?: string, currency = "جنيه مصري") {
  if (!value) return "غير محدد";
  const numeric = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return `${value} ${currency}`;
  return `${numeric.toLocaleString("en-US")} ${currency}`;
}

function shortAmount(value?: string) {
  if (!value) return "—";
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric.toLocaleString("en-US") : value;
}

function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function staffLabel(user: { name: string; username?: string; email: string }) {
  const accountName = user.username ? `@${user.username}` : user.email;
  return user.name ? `${accountName} — ${user.name}` : accountName;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  dir,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  numeric?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="mr-1 text-destructive">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        dir={dir}
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : undefined}
        onChange={(event) => onChange(numeric ? formatNumericInput(event.target.value) : event.target.value)}
      />
    </div>
  );
}

function DateRangeField({
  label,
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  label: string;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3 sm:col-span-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <Field label="من" type="date" value={start} onChange={onStartChange} />
        <span className="mb-3 text-xs font-semibold text-muted-foreground">إلى</span>
        <Field label="إلى" type="date" value={end} onChange={onEndChange} />
      </div>
    </div>
  );
}

function NativeSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,.05)] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, detail }: { icon: typeof Home; title: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/70 pb-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="font-bold text-foreground">{title}</h3>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function ContractFormDialog({
  open,
  onOpenChange,
  editing,
  properties,
  regions,
  propertyTypes,
  users,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Contract | null;
  properties: ReturnType<typeof useData>["properties"];
  regions: ReturnType<typeof useData>["regions"];
  propertyTypes: ReturnType<typeof useData>["propertyTypes"];
  users: ReturnType<typeof useData>["users"];
  onSave: (form: ContractForm, editing: Contract | null) => Promise<void>;
}) {
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const staffUsers = users.filter((user) => user.role === "admin" || user.role === "agent");

  const setValue = <K extends keyof ContractForm>(key: K, value: ContractForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      ...emptyForm,
      ...editing,
      installments: editing.installments ?? [],
      documents: editing.documents ?? [],
    } : { ...emptyForm, installments: [], documents: [] });
    setSaving(false);
  }, [open, editing]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((item) => item.id === propertyId);
    if (!property) {
      setValue("propertyId", "");
      return;
    }
    const region = regions.find((item) => item.id === property.regionId)?.name || property.regionId;
    const type = propertyTypes.find((item) => item.id === property.typeId)?.name || property.unitType || property.category || "";
    setForm((current) => ({
      ...current,
      propertyId,
      propertyCode: property.code,
      propertyTitle: property.title,
      propertyType: type,
      propertyRegion: region,
      propertyAddress: property.location || property.subArea || "",
    }));
  };

  const handleContractTypeChange = (contractType: ContractType) => {
    setForm((current) => ({
      ...current,
      contractType,
      ...(isRentContract(contractType) ? { depositAmount: "" } : { insuranceAmount: "" }),
    }));
  };

  const updateInstallment = (index: number, key: keyof ContractInstallment, value: string) => {
    setForm((current) => ({
      ...current,
      installments: current.installments.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addInstallment = () => {
    setForm((current) => ({
      ...current,
      installments: [...current.installments, { ...emptyInstallment, id: `draft-${Date.now()}` }],
    }));
  };

  const removeInstallment = (index: number) => {
    setForm((current) => ({
      ...current,
      installments: current.installments.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleFileChange = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const invalid = files.find((file) => file.size > 25 * 1024 * 1024 || !(file.type.startsWith("image/") || file.type === "application/pdf"));
    if (invalid) {
      toast({ title: "ملف غير صالح", description: "يمكن رفع صور العقود أو ملفات PDF فقط، بحد أقصى 25 ميجابايت للملف.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const additions: ContractDocument[] = [];
      for (const file of files) {
        const upload = await api.post<{ uploadURL: string; objectPath: string }>("/storage/uploads/request-url", {
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        });
        const response = await fetch(upload.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) throw new Error(`تعذر رفع ${file.name}`);
        additions.push({
          id: crypto.randomUUID(),
          objectPath: upload.objectPath,
          name: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
      setForm((current) => ({ ...current, documents: [...current.documents, ...additions] }));
      toast({ title: "تم رفع المرفقات", description: `تم رفع ${additions.length} ملف بنجاح.` });
    } catch (error) {
      toast({ title: "تعذر رفع المرفق", description: error instanceof Error ? error.message : "حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.partyOneName.trim() && !form.partyTwoName.trim()) return;
    setSaving(true);
    const normalizedForm: ContractForm = {
      ...form,
      totalAmount: toNumericString(form.totalAmount),
      paidAmount: toNumericString(form.paidAmount),
      remainingAmount: toNumericString(form.remainingAmount),
      insuranceAmount: toNumericString(form.insuranceAmount),
      depositAmount: toNumericString(form.depositAmount),
      installments: form.installments.map((installment) => ({
        ...installment,
        amount: toNumericString(installment.amount),
      })),
    };
    await onSave(normalizedForm, editing);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[94vh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto p-0" dir="rtl">
        <div className="border-b border-border bg-[hsl(var(--muted)/.35)] px-5 py-5 sm:px-7">
          <DialogHeader className="text-right">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-accent">
              <ShieldCheck className="h-4 w-4" />
              سجل قانوني داخلي
            </div>
            <DialogTitle className="text-xl">{editing ? "تعديل بيانات العقد" : "تسجيل عقد جديد"}</DialogTitle>
            <DialogDescription className="mt-1">
              احفظ البيانات كما وردت في المستند الأصلي. الحقول ذات العلامة مطلوبة للحفظ.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-7 px-5 py-6 sm:px-7">
          <section className="space-y-4">
            <SectionHeading icon={FileCheck2} title="هوية العقد" detail="بيانات مرجعية للبحث والمراجعة" />
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="رقم العقد" value={form.contractNumber} dir="ltr" onChange={(value) => setValue("contractNumber", value)} placeholder="يُولّد تلقائيًا عند تركه فارغًا" />
              <NativeSelect label="نوع العقد" value={form.contractType} onChange={(value) => handleContractTypeChange(value as ContractType)} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} />
              <NativeSelect label="الحالة" value={form.status} onChange={(value) => setValue("status", value as ContractStatus)} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
              <NativeSelect
                label="الموظف المسؤول"
                value={form.assignedStaffId}
                onChange={(value) => setValue("assignedStaffId", value)}
                placeholder="غير محدد حاليًا"
                options={staffUsers.map((user) => ({
                  value: user.id,
                  label: `${staffLabel(user)} · ${user.role === "admin" ? "مدير النظام" : "مستشار عقاري"}`,
                }))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading icon={Home} title="العقار المرتبط" detail="يمكن حفظ العقد دون ربطه بعقار موجود حاليًا" />
            <div className="grid gap-4 sm:grid-cols-2">
              <NativeSelect
                label="العقار"
                value={form.propertyId}
                onChange={handlePropertyChange}
                placeholder="اختر عقارًا أو اتركه دون ربط"
                options={properties.map((property) => ({ value: property.id, label: `${property.code} · ${property.title}` }))}
              />
              <Field label="العنوان / الموقع المحفوظ" value={form.propertyAddress} onChange={(value) => setValue("propertyAddress", value)} placeholder="يُستخدم كنسخة ثابتة من بيانات العقار" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="كود العقار" value={form.propertyCode} dir="ltr" onChange={(value) => setValue("propertyCode", value)} />
              <Field label="اسم العقار" value={form.propertyTitle} onChange={(value) => setValue("propertyTitle", value)} />
              <Field label="النوع / المنطقة" value={[form.propertyType, form.propertyRegion].filter(Boolean).join(" · ")} onChange={() => undefined} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading icon={UsersRound} title="أطراف العقد" detail="البيانات المدخلة هنا تحفظ ضمن سجل العقد" />
            <div className="grid gap-5 lg:grid-cols-2">
              {[
                { prefix: "partyOne", title: "الطرف الأول" },
                { prefix: "partyTwo", title: "الطرف الثاني" },
              ].map(({ prefix, title }) => {
                const roleKey = `${prefix}Role` as "partyOneRole" | "partyTwoRole";
                const nameKey = `${prefix}Name` as "partyOneName" | "partyTwoName";
                const phoneKey = `${prefix}Phone` as "partyOnePhone" | "partyTwoPhone";
                const emailKey = `${prefix}Email` as "partyOneEmail" | "partyTwoEmail";
                const nationalIdKey = `${prefix}NationalId` as "partyOneNationalId" | "partyTwoNationalId";
                const addressKey = `${prefix}Address` as "partyOneAddress" | "partyTwoAddress";
                return (
                  <div key={prefix} className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(16,32,45,.03)]">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <UserRound className="h-4 w-4 text-accent" />
                      {title}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="الاسم الكامل" required value={form[nameKey]} onChange={(value) => setValue(nameKey, value)} placeholder="الاسم كما في الهوية" />
                      <Field label="الصفة" value={form[roleKey]} onChange={(value) => setValue(roleKey, value)} placeholder="المؤجر، البائع..." />
                      <Field label="رقم الهاتف" value={form[phoneKey]} dir="ltr" onChange={(value) => setValue(phoneKey, value)} type="tel" />
                      <Field label="الرقم القومي / الهوية" value={form[nationalIdKey]} dir="ltr" onChange={(value) => setValue(nationalIdKey, value)} />
                      <Field label="البريد الإلكتروني" value={form[emailKey]} dir="ltr" onChange={(value) => setValue(emailKey, value)} type="email" />
                      <Field label="العنوان" value={form[addressKey]} onChange={(value) => setValue(addressKey, value)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading icon={CalendarDays} title="التواريخ والقيمة" detail="تواريخ مرجعية ومعلومات مالية قابلة للتدقيق" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="تاريخ التوقيع" type="date" value={form.signingDate} onChange={(value) => setValue("signingDate", value)} />
              <DateRangeField
                label="مدة العقد"
                start={form.startDate}
                end={form.endDate}
                onStartChange={(value) => setValue("startDate", value)}
                onEndChange={(value) => setValue("endDate", value)}
              />
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:col-span-3">
                <Label className="text-xs font-semibold text-muted-foreground">التواريخ الإجرائية</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="تاريخ التسليم" type="date" value={form.handoverDate} onChange={(value) => setValue("handoverDate", value)} />
                  <Field label="التجديد / المراجعة" type="date" value={form.renewalDate} onChange={(value) => setValue("renewalDate", value)} />
                  <Field label="مهلة الإخطار" value={form.noticePeriod} onChange={(value) => setValue("noticePeriod", value)} placeholder="مثال: 60 يومًا" />
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:col-span-3">
                <Label className="text-xs font-semibold text-muted-foreground">القيمة المالية</Label>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field label="إجمالي القيمة" value={form.totalAmount} dir="ltr" numeric onChange={(value) => setValue("totalAmount", value)} placeholder="0" />
                  <Field label="المدفوع" value={form.paidAmount} dir="ltr" numeric onChange={(value) => setValue("paidAmount", value)} placeholder="0" />
                  <Field label="المتبقي" value={form.remainingAmount} dir="ltr" numeric onChange={(value) => setValue("remainingAmount", value)} placeholder="0" />
                  <Field label="العملة" value={form.currency} onChange={(value) => setValue("currency", value)} />
                  {isRentContract(form.contractType) && <Field label="التأمين" value={form.insuranceAmount} dir="ltr" numeric onChange={(value) => setValue("insuranceAmount", value)} placeholder="قيمة التأمين" />}
                  {form.contractType === "sale" && <Field label="العربون" value={form.depositAmount} dir="ltr" numeric onChange={(value) => setValue("depositAmount", value)} placeholder="قيمة العربون" />}
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:col-span-3">
                <Label className="text-xs font-semibold text-muted-foreground">خطة السداد</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="طريقة السداد" value={form.paymentMethod} onChange={(value) => setValue("paymentMethod", value)} placeholder="تحويل، نقدي، شيك..." />
                  <Field label="دورية السداد" value={form.paymentFrequency} onChange={(value) => setValue("paymentFrequency", value)} placeholder="شهري، ربع سنوي..." />
                  <Field label="موعد الدفعة القادمة" type="date" value={form.nextPaymentDate} onChange={(value) => setValue("nextPaymentDate", value)} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
              <SectionHeading icon={WalletCards} title="جدول الدفعات" detail="اختياري لعقود التقسيط أو المبالغ المستحقة" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={addInstallment}>
                <Plus className="h-3.5 w-3.5" /> إضافة دفعة
              </Button>
            </div>
            {form.installments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">لا توجد دفعات مجدولة لهذا العقد.</div>
            ) : (
              <div className="space-y-3">
                {form.installments.map((installment, index) => (
                  <div key={installment.id || index} className="grid gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
                    <Field label={`الدفعة ${index + 1}`} type="date" value={installment.dueDate} onChange={(value) => updateInstallment(index, "dueDate", value)} />
                    <Field label="المبلغ" value={installment.amount} dir="ltr" numeric onChange={(value) => updateInstallment(index, "amount", value)} />
                    <NativeSelect label="الحالة" value={installment.status} onChange={(value) => updateInstallment(index, "status", value)} options={Object.entries(installmentStatusLabels).map(([value, label]) => ({ value, label }))} />
                    <Field label="ملاحظة" value={installment.notes} onChange={(value) => updateInstallment(index, "notes", value)} />
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => removeInstallment(index)} title="حذف الدفعة">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeading icon={FileText} title="الشروط والملاحظات" />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">الشروط والأحكام</Label>
                <Textarea value={form.terms} onChange={(event) => setValue("terms", event.target.value)} className="min-h-32" placeholder="أدخل النص أو الملخص المعتمد للشروط..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">ملاحظات داخلية</Label>
                <Textarea value={form.notes} onChange={(event) => setValue("notes", event.target.value)} className="min-h-32" placeholder="ملاحظات فريق العمل، نقاط مراجعة، أو تنبيهات..." />
              </div>
            </div>
          </section>

          <section className="space-y-4">
             <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
               <SectionHeading icon={Paperclip} title="مرفقات العقد" detail="صور العقود وملفات PDF محفوظة في التخزين الخاص للموظفين" />
               <label className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors ${uploading ? "cursor-wait opacity-60" : "cursor-pointer hover:border-accent hover:text-accent"}`}>
                <FilePlus2 className="h-3.5 w-3.5" />
                 {uploading ? "جارٍ الرفع..." : "رفع صور أو PDF"}
                 <input type="file" accept="image/*,.pdf,application/pdf" multiple disabled={uploading} className="sr-only" onChange={(event) => { void handleFileChange(event.target.files); event.target.value = ""; }} />
              </label>
            </div>
            {form.documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">لم تتم إضافة مرفقات.</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {form.documents.map((document) => (
                  <div key={document.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{document.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{document.objectPath} · {(document.size / 1024).toFixed(0)} ك.ب</p>
                    </div>
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setValue("documents", form.documents.filter((item) => item.id !== document.id))} title="إزالة المرفق">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-card px-5 py-4 sm:px-7">
             <Button onClick={() => void submit()} disabled={saving || uploading || (!form.partyOneName.trim() && !form.partyTwoName.trim())} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "حفظ العقد"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, dir }: { label: string; value?: string; dir?: "ltr" | "rtl" }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground" dir={dir}>{value}</p>
    </div>
  );
}

function PartyPanel({ title, name, role, phone, email, nationalId, address }: { title: string; name: string; role: string; phone: string; email: string; nationalId: string; address: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <UserRound className="h-4 w-4 text-accent" /> {title}
      </div>
      <p className="text-base font-bold">{name || "غير محدد"}</p>
      {role && <p className="mt-1 text-xs text-accent">{role}</p>}
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        {phone && <a className="block hover:text-accent" dir="ltr" href={`tel:${cleanPhone(phone)}`}>{phone}</a>}
        {email && <a className="block truncate hover:text-accent" dir="ltr" href={`mailto:${email}`}>{email}</a>}
        {nationalId && <p dir="ltr">{nationalId}</p>}
        {address && <p>{address}</p>}
      </div>
    </div>
  );
}

function objectUrl(objectPath: string) {
  return objectPath.startsWith("/objects/") ? `/api/storage${objectPath}` : objectPath;
}

function ContractDetailDialog({
  contract,
  users,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  contract: Contract | null;
  users: ReturnType<typeof useData>["users"];
  onOpenChange: (open: boolean) => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}) {
  if (!contract) return null;
  const assignedStaff = users.find((user) => user.id === contract.assignedStaffId);
  return (
    <Dialog open={!!contract} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-wide text-accent">{contract.contractNumber || "بدون رقم"}</span>
            <Badge className={`border ${statusStyles[contract.status]}`}>{statusLabels[contract.status]}</Badge>
            <Badge variant="outline">{typeLabels[contract.contractType]}</Badge>
          </div>
          <DialogTitle className="text-xl">{contract.propertyTitle || "عقد غير مرتبط بعقار"}</DialogTitle>
          <DialogDescription>آخر تحديث: {formatDate(contract.updatedAt || contract.createdAt)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="outline" className="gap-1.5 text-xs" onClick={() => onEdit(contract)}><Edit3 className="h-3.5 w-3.5" /> تعديل</Button>
             {contract.propertyId && <Button variant="outline" className="gap-1.5 text-xs" onClick={() => { window.location.href = `/admin/properties/${contract.propertyId}/edit`; }}><Home className="h-3.5 w-3.5" /> العقار</Button>}
            {contract.partyOnePhone && <a className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-2 text-xs font-semibold text-accent-foreground" href={`tel:${cleanPhone(contract.partyOnePhone)}`}>اتصال بالطرف الأول</a>}
            <Button variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(contract)}><Trash2 className="h-3.5 w-3.5" /> حذف</Button>
          </div>

          <section className="space-y-3">
            <SectionHeading icon={Landmark} title="ملخص مالي وزمني" />
            <div className="grid gap-3 sm:grid-cols-2">
              {contract.assignedStaffId && (
                <DetailItem
                  label="الموظف المسؤول"
                  value={assignedStaff ? `${staffLabel(assignedStaff)} · ${assignedStaff.role === "admin" ? "مدير النظام" : "مستشار عقاري"}` : contract.assignedStaffId}
                />
              )}
              <DetailItem label="القيمة الإجمالية" value={formatAmount(contract.totalAmount, contract.currency)} />
              <DetailItem label="المدفوع / المتبقي" value={`${formatAmount(contract.paidAmount, contract.currency)} / ${formatAmount(contract.remainingAmount, contract.currency)}`} />
              {isRentContract(contract.contractType) && <DetailItem label="التأمين" value={formatAmount(contract.insuranceAmount, contract.currency)} />}
              {contract.contractType === "sale" && <DetailItem label="العربون" value={formatAmount(contract.depositAmount, contract.currency)} />}
              <DetailItem label="الفترة" value={[formatDate(contract.startDate), formatDate(contract.endDate)].join(" — ")} />
              <DetailItem label="موعد الدفعة القادمة" value={formatDate(contract.nextPaymentDate)} />
              <DetailItem label="طريقة السداد" value={[contract.paymentMethod, contract.paymentFrequency].filter(Boolean).join(" · ")} />
              <DetailItem label="تاريخ التوقيع" value={formatDate(contract.signingDate)} />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <PartyPanel title="الطرف الأول" name={contract.partyOneName} role={contract.partyOneRole} phone={contract.partyOnePhone} email={contract.partyOneEmail} nationalId={contract.partyOneNationalId} address={contract.partyOneAddress} />
            <PartyPanel title="الطرف الثاني" name={contract.partyTwoName} role={contract.partyTwoRole} phone={contract.partyTwoPhone} email={contract.partyTwoEmail} nationalId={contract.partyTwoNationalId} address={contract.partyTwoAddress} />
          </section>

          {(contract.propertyCode || contract.propertyType || contract.propertyRegion || contract.propertyAddress) && (
            <section className="space-y-3">
              <SectionHeading icon={Home} title="نسخة بيانات العقار" detail="البيانات المحفوظة وقت تسجيل العقد" />
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="العقار" value={[contract.propertyCode, contract.propertyTitle].filter(Boolean).join(" · ")} />
                <DetailItem label="النوع والمنطقة" value={[contract.propertyType, contract.propertyRegion].filter(Boolean).join(" · ")} />
                <DetailItem label="العنوان" value={contract.propertyAddress} />
              </div>
            </section>
          )}

          {contract.installments?.length > 0 && (
            <section className="space-y-3">
              <SectionHeading icon={Clock3} title="جدول الدفعات" />
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground"><span>الاستحقاق</span><span>المبلغ</span><span>الحالة</span></div>
                {contract.installments.map((installment) => (
                  <div key={installment.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 border-t border-border px-3 py-3 text-xs">
                    <span>{formatDate(installment.dueDate)}</span>
                    <span className="font-semibold">{formatAmount(installment.amount, contract.currency)}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] ${installment.status === "paid" ? "bg-emerald-50 text-emerald-700" : installment.status === "overdue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{installmentStatusLabels[installment.status]}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {contract.terms && <DetailItem label="الشروط والأحكام" value={contract.terms} />}
          {contract.notes && <DetailItem label="ملاحظات داخلية" value={contract.notes} />}

          <section className="space-y-3">
            <SectionHeading icon={Paperclip} title="المرفقات" />
            {contract.documents?.length ? (
              <div className="space-y-2">
                {contract.documents.map((document) => (
                  <div key={document.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <FileText className="h-4 w-4 text-accent" />
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{document.name}</p><p className="text-[10px] text-muted-foreground">{document.contentType} · {(document.size / 1024).toFixed(0)} ك.ب</p></div>
                     {document.objectPath ? <a href={objectUrl(document.objectPath)} target="_blank" rel="noreferrer" className="text-accent" title="فتح الملف"><ArrowDownToLine className="h-4 w-4" /></a> : null}
                  </div>
                ))}
              </div>
            ) : <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">لا توجد مرفقات.</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useAuth } from "@/context/AuthContext";
import { checkUserPermission } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { Link } from "wouter";

export default function Contracts() {
  const { contracts, properties, regions, propertyTypes, users, fetching, reload, addContract, updateContract, deleteContract } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canManageContracts = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-إدارة العقود");

  const staffUsers = useMemo(() => users.filter((user) => user.role === "admin" || user.role === "agent"), [users]);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ContractType>("all");
  const [selected, setSelected] = useState<Contract | null>(null);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!canManageContracts) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية الوصول إلى إدارة العقود والمعاملات. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const counts = useMemo(() => ({
    all: contracts.length,
    active: contracts.filter((contract) => contract.status === "active").length,
    draft: contracts.filter((contract) => contract.status === "draft").length,
    balance: contracts.reduce((sum, contract) => sum + (Number(String(contract.remainingAmount || "0").replace(/,/g, "")) || 0), 0),
  }), [contracts]);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return [...contracts]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .filter((contract) => {
        const haystack = [
          contract.contractNumber, contract.propertyCode, contract.propertyTitle, contract.propertyAddress,
          contract.partyOneName, contract.partyTwoName, contract.partyOnePhone, contract.partyTwoPhone,
          contract.partyOneNationalId, contract.partyTwoNationalId, contract.propertyRegion,
        ].join(" ").toLocaleLowerCase("ar");
        return (statusFilter === "all" || contract.status === statusFilter)
          && (typeFilter === "all" || contract.contractType === typeFilter)
          && (!query || haystack.includes(query));
      });
  }, [contracts, search, statusFilter, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setSelected(null);
    setEditing(contract);
    setFormOpen(true);
  };

  const saveContract = async (form: ContractForm, current: Contract | null) => {
    const payload = { ...form, contractNumber: form.contractNumber.trim() || undefined };
    const saved = current ? await updateContract(current.id, payload) : await addContract(payload);
    if (!saved) return;
    setFormOpen(false);
    setEditing(null);
    toast({ title: current ? "تم تحديث العقد" : "تم تسجيل العقد", description: "تم حفظ السجل في إدارة العقود." });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const deleted = await deleteContract(deleteTarget.id);
    setDeleting(false);
    if (deleted) {
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      toast({ title: "تم حذف العقد", description: "أزيل السجل من قائمة العقود." });
    }
  };

  const changeStatus = async (contract: Contract, status: ContractStatus) => {
    const saved = await updateContract(contract.id, { status });
    if (saved) {
      setSelected((current) => current?.id === contract.id ? { ...current, status } : current);
      toast({ title: "تم تحديث حالة العقد", description: statusLabels[status] });
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1480px] space-y-6" dir="rtl">
        <section className="admin-page-header relative isolate overflow-hidden rounded-2xl border border-[#A9927D]/40 bg-[linear-gradient(135deg,#10202D_0%,#173044_58%,#0D1B27_100%)] px-5 py-5 text-white shadow-[0_16px_40px_rgba(16,32,45,.2)] sm:px-8 sm:py-7">
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="mb-4 flex items-center gap-3">
                <span className="header-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#A9927D]/45 bg-[#A9927D]/15 text-[#C7B6A6]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="header-eyebrow text-[11px] font-bold tracking-[.14em] text-[#C7B6A6]">مركز التوثيق والعمليات</p>
                  <p className="mt-0.5 text-[11px] text-white/55">مساحة عمل آمنة لفريق العمودي</p>
                </div>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">إدارة العقود</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
                إدارة العقود والدفعات العقارية في مكان واحد.
              </p>
              <div className="mt-5 flex items-center gap-2 text-[11px] text-white/55">
                <ClipboardCheck className="h-3.5 w-3.5 text-[#C7B6A6]" />
                <span>كل تعديل يُحفظ مرتبطًا بالسجل الأصلي وقابلًا للمراجعة.</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-black/15 p-2.5 shadow-inner shadow-black/10 lg:min-w-[250px]">
              <p className="mb-2 px-1 text-[10px] font-semibold text-white/50">إجراءات سريعة</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  variant="outline"
                  className="h-11 justify-center gap-2 border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 hover:text-white"
                  onClick={() => void reload()}
                  disabled={fetching}
                >
                  <RefreshCw className={fetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  تحديث السجل
                </Button>
                <Button
                  className="h-11 justify-center gap-2 border border-[#C7B6A6] bg-[#A9927D] text-[#10202D] shadow-[0_6px_16px_rgba(169,146,125,.22)] hover:bg-[#BBA591]"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" />
                  تسجيل عقد
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "إجمالي العقود", value: counts.all.toLocaleString("en-US"), icon: FileCheck2, tone: "text-accent", note: "كل الحالات" },
            { label: "عقود سارية", value: counts.active.toLocaleString("en-US"), icon: Check, tone: "text-emerald-600", note: "تحتاج متابعة مستمرة" },
            { label: "مسودات", value: counts.draft.toLocaleString("en-US"), icon: Edit3, tone: "text-slate-600", note: "لم تعتمد بعد" },
            { label: "إجمالي المتبقي", value: counts.balance.toLocaleString("en-US"), icon: CircleDollarSign, tone: "text-amber-600", note: "بالقيم المسجلة" },
          ].map((stat) => (
            <Card key={stat.label} className="overflow-hidden border-border/80 shadow-[0_5px_18px_rgba(16,32,45,.045)]">
              <CardContent className="relative flex items-start justify-between p-4 sm:p-5">
                <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{stat.value}</p><p className="mt-1 text-[10px] text-muted-foreground">{stat.note}</p></div>
                <stat.icon className={`h-5 w-5 ${stat.tone}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/80 shadow-[0_5px_18px_rgba(16,32,45,.045)]">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pr-9" placeholder="ابحث برقم العقد، الأطراف، الهاتف، العقار أو المنطقة..." />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:flex">
              <NativeSelect label="" value={statusFilter} onChange={(value) => setStatusFilter(value as "all" | ContractStatus)} options={[{ value: "all", label: "كل الحالات" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
              <NativeSelect label="" value={typeFilter} onChange={(value) => setTypeFilter(value as "all" | ContractType)} options={[{ value: "all", label: "كل الأنواع" }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))]} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold">سجل العقود</h2><p className="mt-1 text-xs text-muted-foreground">{filteredContracts.length.toLocaleString("en-US")} عقد ظاهر في العرض الحالي</p></div>
          {(search || statusFilter !== "all" || typeFilter !== "all") && <Button variant="ghost" size="sm" className="w-fit gap-1.5 text-xs text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); }}><X className="h-3.5 w-3.5" /> مسح الفلاتر</Button>}
        </div>

        {fetching && contracts.length === 0 ? (
          <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : filteredContracts.length === 0 ? (
          <EmptyState
            icon={<Archive className="h-8 w-8" />}
            title={contracts.length === 0 ? "لا توجد عقود مسجلة" : "لا توجد نتائج مطابقة"}
            description={contracts.length === 0 ? "ابدأ بتسجيل أول عقد ليصبح هذا المكان مرجع فريق العمل." : "جرّب رقم عقد مختلفًا أو أزل أحد الفلاتر."}
            action={contracts.length === 0 ? { label: "تسجيل أول عقد", onClick: openCreate } : { label: "مسح البحث", onClick: () => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); } }}
            className="rounded-xl border border-dashed border-border py-16"
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_5px_18px_rgba(16,32,45,.035)] md:block">
              <div className="grid grid-cols-[1.2fr_1.35fr_1.1fr_1fr_1fr_auto] gap-3 border-b border-border bg-muted/35 px-5 py-3 text-[11px] font-bold text-muted-foreground">
                <span>العقد</span><span>العقار</span><span>الأطراف</span><span>القيمة والمتبقي</span><span>الحالة</span><span>إجراء</span>
              </div>
              {filteredContracts.map((contract) => (
                <div key={contract.id} className="grid grid-cols-[1.2fr_1.35fr_1.1fr_1fr_1fr_auto] items-center gap-3 border-b border-border/70 px-5 py-4 last:border-b-0 hover:bg-muted/20">
                  <button type="button" className="min-w-0 text-right" onClick={() => setSelected(contract)}>
                    <span className="block truncate font-mono text-xs font-bold tracking-wide text-accent">{contract.contractNumber || "بدون رقم"}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{typeLabels[contract.contractType]} · {formatDate(contract.signingDate || contract.createdAt)}</span>
                  </button>
                  <button type="button" className="min-w-0 text-right" onClick={() => setSelected(contract)}>
                    <span className="block truncate text-sm font-semibold">{contract.propertyTitle || "عقد غير مرتبط بعقار"}</span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">{[contract.propertyCode, contract.propertyRegion].filter(Boolean).join(" · ") || "لا توجد نسخة عقار"}</span>
                  </button>
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-semibold">{contract.partyTwoName || "غير محدد"}</p>
                    <p className="mt-1 truncate text-muted-foreground">{contract.partyOneName || "غير محدد"}</p>
                    {contract.assignedStaffId && <p className="mt-1 truncate text-[10px] text-accent">
                      المسؤول: {staffUsers.find((user) => user.id === contract.assignedStaffId) ? staffLabel(staffUsers.find((user) => user.id === contract.assignedStaffId)!) : contract.assignedStaffId}
                    </p>}
                  </div>
                  <div className="text-xs"><p className="font-semibold">{shortAmount(contract.totalAmount)} <span className="font-normal text-muted-foreground">{contract.currency}</span></p><p className="mt-1 text-muted-foreground">متبقي {shortAmount(contract.remainingAmount)}</p></div>
                  <NativeSelect label="" value={contract.status} onChange={(value) => void changeStatus(contract, value as ContractStatus)} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(contract)} title="عرض التفاصيل"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contract)} title="تعديل العقد"><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(contract)} title="حذف العقد"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:hidden">
              {filteredContracts.map((contract) => (
                <Card key={contract.id} className="overflow-hidden border-border/80 shadow-[0_4px_15px_rgba(16,32,45,.04)]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="min-w-0 text-right" onClick={() => setSelected(contract)}>
                        <p className="font-mono text-xs font-bold text-accent">{contract.contractNumber || "بدون رقم"}</p>
                        <h3 className="mt-1 truncate text-base font-bold">{contract.propertyTitle || "عقد غير مرتبط بعقار"}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{typeLabels[contract.contractType]}</p>
                      </button>
                      <Badge className={`shrink-0 border ${statusStyles[contract.status]}`}>{statusLabels[contract.status]}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/35 p-2.5"><p className="text-[10px] text-muted-foreground">الطرف الثاني</p><p className="mt-1 truncate font-semibold">{contract.partyTwoName || "غير محدد"}</p></div>
                      <div className="rounded-lg bg-muted/35 p-2.5">
                        <p className="text-[10px] text-muted-foreground">المتبقي</p>
                        <p className="mt-1 font-semibold">{shortAmount(contract.remainingAmount)} {contract.currency}</p>
                      </div>
                      {contract.assignedStaffId && <div className="col-span-2 rounded-lg bg-primary/5 p-2.5">
                        <p className="text-[10px] text-muted-foreground">الموظف المسؤول</p>
                        <p className="mt-1 truncate font-semibold text-primary">
                          {staffUsers.find((user) => user.id === contract.assignedStaffId) ? staffLabel(staffUsers.find((user) => user.id === contract.assignedStaffId)!) : contract.assignedStaffId}
                        </p>
                      </div>}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <NativeSelect label="" value={contract.status} onChange={(value) => void changeStatus(contract, value as ContractStatus)} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
                      <div className="flex shrink-0 gap-1">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setSelected(contract)}><MoreHorizontal className="h-3.5 w-3.5" /> التفاصيل</Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(contract)} title="تعديل العقد"><Edit3 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <ContractFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} properties={properties} regions={regions} propertyTypes={propertyTypes} users={users} onSave={saveContract} />
      <ContractDetailDialog users={users} contract={selected} onOpenChange={(open) => !open && setSelected(null)} onEdit={openEdit} onDelete={(contract) => setDeleteTarget(contract)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العقد نهائيًا؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف سجل {deleteTarget?.contractNumber || "العقد"} وكل تفاصيله من القائمة. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void confirmDelete(); }} disabled={deleting}>
              {deleting ? "جارٍ الحذف..." : "حذف العقد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}