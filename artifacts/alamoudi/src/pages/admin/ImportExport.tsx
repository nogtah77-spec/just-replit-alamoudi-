import { useRef, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, Download, CheckCircle2, AlertCircle, Eye, X, ArrowRight, ShieldAlert } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { checkUserPermission } from "@/lib/permissions";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatNumber } from "@/lib/utils";
import {
  parseWorkbookBytes,
  parseDelimitedText,
  detectHeaders,
  type ParsedProperty,
  KNOWN_PROPERTY_TYPES,
  sanitizeDressing,
} from "@/lib/propertyImport";

const TEMPLATE_HEADERS =
  "الكود,العنوان,الوصف,السعر,المساحة,غرف_النوم,الحمامات,الدور,عدد_طوابق_العقار,الواجهة,الفيو,ماستر_روم,الدريسنج,أسانسير,موقف_سيارة,التشطيب,مميزات_إضافية,الموقع,الفئة,نوع_العقد,الحالة,مميز,نوع_العرض,رابط_الخريطة,رابط_الفيديو,رابط_خارجي,المنطقة,النوع,الصور";
const TEMPLATE_ROW =
  'ALM-1001,شقة فاخرة بالشروق,وصف العقار بالتفصيل,3500000,180,3,3,2,5,بحري,شارع رئيسي,غرفة ماستر بحمام,يوجد غرفة دريسنج,يوجد,جراج خاص,ألترا سوبر لوكس,أمن وحراسة,الحي الأول,residential,sale,active,نعم,direct,,,,مدينة الشروق,شقة,"https://res.cloudinary.com/example/image1.jpg ; https://res.cloudinary.com/example/image2.jpg"';

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

const FIELD_LABELS: Record<string, string> = {
  code: "الكود",
  title: "العنوان",
  description: "الوصف",
  price: "السعر",
  area: "المساحة",
  beds: "غرف النوم",
  baths: "الحمامات",
  floor: "الدور",
  floors: "عدد طوابق العقار",
  unitType: "الواجهة",
  view: "الفيو",
  master: "ماستر روم",
  floorText: "الدريسنج",
  elevator: "أسانسير",
  parking: "موقف سيارة",
  finishing: "التشطيب",
  additionalFeatures: "مميزات إضافية",
  location: "الموقع",
  category: "الفئة",
  listingType: "نوع العقد",
  status: "الحالة",
  featured: "مميز",
  agentType: "نوع العرض",
  propertyType: "نوع العقار",
  subArea: "المنطقة الفرعية",
  regionName: "المنطقة الرئيسية",
  videoUrl: "رابط الفيديو",
  mapsUrl: "رابط الخريطة",
  externalUrl: "رابط خارجي",
  layout: "التوزيع",
  source: "المصدر",
  images: "الصور",
};

interface PendingImport {
  items: ParsedProperty[];
  sheets: { name: string; count: number }[];
  headerMap?: { raw: string; field: string | undefined }[];
  fileName: string;
}

export default function ImportExport() {
  const { properties, users, inquiries, regions, propertyTypes, importProperties } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canExport = isAdmin || checkUserPermission(currentUser, "التقارير-تصدير البيانات");
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportType, setExportType] = useState("properties");
  const [dragging, setDragging] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    errors: number;
    sheets: { name: string; count: number }[];
  } | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [fallbackRegionId, setFallbackRegionId] = useState<string>("");

  if (!canExport) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية استيراد وتصدير بيانات المنصة. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const getExportData = () => {
    switch (exportType) {
      case "properties":
        return properties.map((p) => ({
          الكود: p.code,
          العنوان: p.title,
          الوصف: p.description || "",
          السعر: p.price,
          المساحة: p.area,
          غرف_النوم: p.beds,
          الحمامات: p.baths,
          الدور: p.floor,
          عدد_طوابق_العقار: p.floors || "",
          الواجهة: p.unitType || "",
          الفيو: p.view || "",
          ماستر_روم: p.master || "",
          الدريسنج: p.floorText || "",
          أسانسير: p.elevator || "",
          موقف_سيارة: p.parking || "",
          التشطيب: p.finishing || "",
          مميزات_إضافية: p.additionalFeatures || "",
          الموقع: p.location || "",
          الفئة: p.category || "residential",
          نوع_العقد: p.listingType || "sale",
          الحالة: p.status || "active",
          مميز: p.featured ? "نعم" : "لا",
          نوع_العرض: p.agentType || "direct",
          رابط_الخريطة: p.mapsUrl || "",
          رابط_الفيديو: p.videoUrl || "",
          رابط_خارجي: p.externalUrl || "",
          المنطقة: regions.find((r) => r.id === p.regionId)?.name ?? p.regionId,
          النوع: propertyTypes.find((t) => t.id === p.typeId)?.name ?? p.typeId,
          الصور: Array.isArray(p.images) ? p.images.join(" ; ") : "",
          تاريخ_الإضافة: new Date(p.createdAt).toLocaleDateString("ar-SA-u-nu-latn"),
        }));
      case "users":
        return users.map((u) => ({
          الاسم: u.name,
          "البريد الإلكتروني": u.email,
          الدور: u.role,
          نشط: u.active ? "نعم" : "لا",
          تاريخ_الانضمام: new Date(u.joinedAt).toLocaleDateString("ar-SA-u-nu-latn"),
        }));
      case "inquiries":
        return inquiries.map((i) => ({
          الاسم: i.name,
          الهاتف: i.phone,
          البريد: i.email,
          الموضوع: i.subject,
          الرسالة: i.message,
          الحالة: i.status,
          التاريخ: new Date(i.createdAt).toLocaleDateString("ar-SA-u-nu-latn"),
        }));
      default:
        return [];
    }
  };

  const handleExport = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = toCSV(data, headers);
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alamoudi-${exportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `تم تصدير ${data.length} سجل بنجاح` });
  };

  const handleTemplate = () => {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + TEMPLATE_HEADERS + "\n" + TEMPLATE_ROW], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-properties.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [importing, setImporting] = useState(false);

  const confirmImport = async () => {
    if (!pending) return;
    const { items, sheets } = pending;
    // Apply fallback region to rows with empty regionId
    const patched = fallbackRegionId
      ? items.map(p => p.regionId ? p : { ...p, regionId: fallbackRegionId })
      : items;
    const valid = patched.filter(
      (p) => p.price || p.area || p.code || (p.title && p.title.trim()),
    );
    const errors = patched.length - valid.length;
    if (valid.length === 0) {
      toast({ title: "لم يتم العثور على بيانات صالحة", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const { added, updated } = await importProperties(valid);
      setImportResult({ added, updated, errors, sheets });
      setPending(null);
      setFallbackRegionId("");
      toast({
        title: "تم الاستيراد والحفظ السحابي بنجاح ✓",
        description: `أُضيف ${added} عقار، حُدّث ${updated}، تخطّي ${errors} — تم حفظها في السحابة.`,
      });
    } catch (e: any) {
      toast({ title: "حدث خطأ أثناء الاستيراد", description: e.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    const isJson = name.endsWith(".json");
    const isText = name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv") || isJson;
    if (!isExcel && !isText && !isJson) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يدعم Excel (xlsx/xls) و CSV و JSON و TXT",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast({ title: "تعذّر قراءة الملف", variant: "destructive" });
    reader.onload = (e) => {
      try {
        if (isExcel) {
          const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
          const { items, sheets } = parseWorkbookBytes(bytes);
          setPending({ items, sheets, fileName: file.name });
        } else if (isJson) {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          // Check if it is a backup object containing properties or an array of properties
          let rawProps: any[] = [];
          if (Array.isArray(parsed)) {
            rawProps = parsed;
          } else if (Array.isArray(parsed.alamoudi_properties)) {
            rawProps = parsed.alamoudi_properties;
          } else if (Array.isArray(parsed.properties)) {
            rawProps = parsed.properties;
          }

          if (rawProps.length === 0) {
            toast({ title: "لم يتم العثور على عقارات داخل ملف JSON", variant: "destructive" });
            return;
          }

          const items: ParsedProperty[] = rawProps.map((p: any) => ({
            code: String(p.code || "").trim(),
            title: String(p.title || p.code || "").trim(),
            description: String(p.description || "").trim(),
            price: Number(p.price) || 0,
            area: Number(p.area) || 0,
            beds: Number(p.beds) || 0,
            baths: Number(p.baths) || 0,
            floors: Number(p.floors) || 0,
            floor: Number(p.floor) || 0,
            finishing: String(p.finishing || ""),
            view: String(p.view || ""),
            typeId: String(p.typeId || "apartment"),
            regionId: String(p.regionId || ""),
            category: p.category || "residential",
            status: p.status || "active",
            featured: Boolean(p.featured),
            agentType: p.agentType || "direct",
            images: Array.isArray(p.images) ? p.images : [],
            videoUrl: String(p.videoUrl || ""),
            externalUrl: String(p.externalUrl || ""),
            mapsUrl: String(p.mapsUrl || ""),
            unitType: (KNOWN_PROPERTY_TYPES.has(String(p.unitType || "").trim().toLowerCase()) ? "" : String(p.unitType || "").trim()),
            subArea: p.subArea || "",
            layout: p.layout || "",
            master: p.master || "",
            elevator: p.elevator || "",
            parking: p.parking || "",
            additionalFeatures: p.additionalFeatures || "",
            floorText: sanitizeDressing(String(p.floorText || ""), Number(p.floor) || 0),
            location: p.location || "",
            source: p.source || "",
          }));

          setPending({ items, sheets: [{ name: "JSON", count: items.length }], fileName: file.name });
        } else {
          const text = e.target?.result as string;
          const { items, sheets } = parseDelimitedText(text, regions, propertyTypes);
          const headerMap = detectHeaders(text);
          setPending({ items, sheets, headerMap, fileName: file.name });
        }
        setImportResult(null);
      } catch (err: any) {
        console.error("File parse error:", err);
        toast({
          title: "خطأ في معالجة الملف",
          description: "تأكد أن الملف بالتنسيق الصحيح",
          variant: "destructive",
        });
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, "utf-8");
  };

  // Count how many codes already exist (will be updated, not added)
  const existingCodes = new Set(properties.map((p) => p.code));
  const pendingAdded = pending ? pending.items.filter((i) => i.code && !existingCodes.has(i.code)).length : 0;
  const pendingUpdated = pending ? pending.items.filter((i) => i.code && existingCodes.has(i.code)).length : 0;
  const unresolvedRegion = pending ? pending.items.filter((i) => !i.regionId).length : 0;
  const previewRows = pending?.items.slice(0, 5) ?? [];
  const unmappedHeaders = pending?.headerMap?.filter((h) => !h.field) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="الاستيراد والتصدير"
          subtitle="نقل بيانات المنصة بصيغة CSV أو Excel بسهولة"
          eyebrow="إدارة البيانات"
          icon={UploadCloud}
        />

        {/* Import Preview Step */}
        {pending && (
          <Card className="border-accent/40 bg-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <CardTitle className="text-base">معاينة الاستيراد — {pending.fileName}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPending(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-xs mt-1">
                راجع البيانات أدناه قبل التأكيد. سيتم تحديث العقارات التي يطابق كودها عقاراً موجوداً.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg px-3 py-1.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {pendingAdded} عقار جديد سيُضاف
                </div>
                {pendingUpdated > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <ArrowRight className="h-4 w-4" />
                    {pendingUpdated} عقار موجود سيُحدَّث
                  </div>
                )}
                {unmappedHeaders.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {unmappedHeaders.length} عمود غير معروف: {unmappedHeaders.map((h) => h.raw).join("، ")}
                  </div>
                )}
              </div>

              {/* Unresolved region warning + fallback selector */}
              {unresolvedRegion > 0 && (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-3 space-y-2.5">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm font-medium">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {unresolvedRegion} عقار بدون منطقة محددة — اختر منطقة افتراضية تُطبَّق عليها
                  </div>
                  <Select value={fallbackRegionId} onValueChange={setFallbackRegionId}>
                    <SelectTrigger className="h-8 text-sm bg-background">
                      <SelectValue placeholder="اختر المنطقة الافتراضية..." />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.filter(r => r.active !== false).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Header Mapping */}
              {pending.headerMap && pending.headerMap.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">رسم خرائط الأعمدة المكتشفة:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pending.headerMap.map((h, i) => (
                      <Badge
                        key={i}
                        variant={h.field ? "secondary" : "outline"}
                        className={cn(
                          "text-xs",
                          h.field
                            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200"
                            : "text-muted-foreground opacity-60",
                        )}
                      >
                        {h.raw}
                        {h.field && (
                          <span className="mr-1 opacity-70">← {FIELD_LABELS[h.field] ?? h.field}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              {previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">الكود</TableHead>
                        <TableHead className="text-xs">المنطقة الرئيسية</TableHead>
                        <TableHead className="text-xs">الكمباوند/الحي</TableHead>
                        <TableHead className="text-xs">السعر</TableHead>
                        <TableHead className="text-xs">المساحة</TableHead>
                        <TableHead className="text-xs">وضع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => {
                        const resolvedRegion = regions.find(r => r.id === row.regionId);
                        const fallback = !row.regionId && fallbackRegionId
                          ? regions.find(r => r.id === fallbackRegionId)
                          : null;
                        return (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="font-mono font-semibold text-accent">
                              {row.code || <span className="text-muted-foreground italic">بدون كود</span>}
                            </TableCell>
                            <TableCell>
                              {resolvedRegion
                                ? resolvedRegion.name
                                : fallback
                                  ? <span className="text-orange-600 dark:text-orange-400">{fallback.name} <span className="opacity-60">(افتراضي)</span></span>
                                  : <span className="flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />غير محدد</span>
                              }
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.subArea || "—"}
                            </TableCell>
                            <TableCell>{row.price ? formatNumber(row.price) : "—"}</TableCell>
                            <TableCell>{row.area ? `${row.area}م²` : "—"}</TableCell>
                            <TableCell>
                              {row.code && existingCodes.has(row.code) ? (
                                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">تحديث</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-600 border-green-200">جديد</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {pending.items.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      وأيضاً {pending.items.length - 5} عقار آخر…
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={confirmImport}
                  disabled={importing}
                >
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  {importing ? "جاري الحفظ في السحابة..." : `تأكيد الاستيراد (${pending.items.length} عقار)`}
                </Button>
                <Button variant="outline" onClick={() => setPending(null)} disabled={importing}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Upload */}
          <Card>
            <CardHeader>
              <CardTitle>استيراد العقارات</CardTitle>
              <CardDescription>
                رفع ملف Excel أو CSV — يتعرّف تلقائياً على أسماء الأعمدة، ويعرض معاينة قبل الاستيراد
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                  dragging
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-muted/30 hover:border-accent/50",
                )}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
              >
                <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">اسحب الملف هنا أو انقر للاختيار</p>
                <p className="text-xs text-muted-foreground">Excel (xlsx · xls) · CSV · TXT</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { handleFile(f); e.target.value = ""; }
                }}
              />

              {/* Import Result (after confirmation) */}
              {importResult && !pending && (
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm space-y-2",
                    importResult.errors > 0
                      ? "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700"
                      : "bg-green-50 dark:bg-green-950/20 text-green-700",
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {importResult.errors === 0 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    أُضيف {importResult.added} · حُدِّث {importResult.updated} · تُخطّي {importResult.errors}
                  </div>
                  {importResult.sheets.length > 0 && (
                    <ul className="text-xs space-y-0.5 opacity-80 pr-6 list-disc">
                      {importResult.sheets.map((s, i) => (
                        <li key={i}>
                          {s.name}: {s.count}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground">أسماء الأعمدة المدعومة:</p>
                <div className="flex flex-wrap gap-1">
                  {["الكود", "العنوان", "الوصف", "السعر", "المساحة", "غرف_النوم", "الحمامات", "الدور", "عدد_طوابق_العقار", "الواجهة", "الفيو", "ماستر_روم", "الدريسنج", "أسانسير", "موقف_سيارة", "التشطيب", "مميزات_إضافية", "الموقع", "الفئة", "نوع_العقد", "الحالة", "مميز", "نوع_العرض", "النوع", "المنطقة", "الصور"].map((h) => (
                    <Badge key={h} variant="outline" className="text-[10px] text-muted-foreground">{h}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-muted-foreground">تحتاج لنموذج؟</span>
                <Button variant="link" className="text-primary h-auto p-0 text-xs" onClick={handleTemplate}>
                  تحميل نموذج CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle>تصدير البيانات</CardTitle>
              <CardDescription>تنزيل بيانات المنصة بصيغة CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">البيانات المراد تصديرها</label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="properties">العقارات ({properties.length})</SelectItem>
                    <SelectItem value="users">المستخدمين ({users.length})</SelectItem>
                    <SelectItem value="inquiries">الاستفسارات ({inquiries.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  صيغة CSV بترميز UTF-8
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  يدعم Excel وجداول البيانات
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  يشمل جميع الحقول
                </div>
              </div>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                تصدير CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
