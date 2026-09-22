import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2, Home as HomeIcon, X, ExternalLink, Star } from "lucide-react";
import { Link } from "wouter";
import { useData, Property, PropertyStatus } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatNumber } from "@/lib/utils";
import { checkUserPermission } from "@/lib/permissions";
import { matchesSmartPropertySearch } from "@/lib/propertyFilters";

const statusLabels: Record<PropertyStatus, string> = {
  active: "نشط",
  listed: "معروض",
  draft: "مسودة",
  sold: "مباع",
  rented: "مؤجر",
  reserved: "محجوز",
};

const categoryLabels: Record<string, string> = {
  residential: "سكني",
  administrative: "إداري",
  medical: "طبي",
  commercial: "تجاري",
  sale: "للبيع",
  rent: "للإيجار",
  furnished: "مفروش",
};

const listingTypeLabels: Record<string, string> = {
  sale: "للبيع",
  rent: "للإيجار",
  furnished: "مفروش",
};

const statusColors: Record<PropertyStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  listed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  sold: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  rented: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  reserved: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default function Properties() {
  const { properties, regions, propertyTypes, deleteProperty, updateProperty, bulkDeleteProperties, bulkUpdateProperties } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canAddProperty = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-إضافة عقار");
  const canEditProperty = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-تعديل عقار");
  const canDeleteProperty = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-حذف عقار");
  const canPublishProperty = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-نشر العقارات");

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<PropertyStatus | "">("");
  const { toast } = useToast();

  const filteredProperties = properties
    .filter(p => !p.id?.startsWith("__") && !p.code?.startsWith("__"))
    .sort((a, b) => {
      const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return tB - tA;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const typeName = propertyTypes.find((t) => t.id === p.typeId)?.name || "";
      const regionName = regions.find((r) => r.id === p.regionId)?.name || "";
      return matchesSmartPropertySearch(p, search, regionName, typeName);
    });

  const allSelected = filteredProperties.length > 0 && filteredProperties.every(p => selectedIds.has(p.id));
  const someSelected = filteredProperties.some(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProperties.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProperties.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteProperty(deleteTarget.id);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    setDeleteTarget(null);
    toast({ title: "تم بنجاح", description: "تم حذف العقار بنجاح" });
  };

  const handleStatusChange = (id: string, status: PropertyStatus) => {
    updateProperty(id, { status });
    toast({ title: "تم بنجاح", description: "تم تحديث حالة العقار" });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    bulkDeleteProperties(ids);
    clearSelection();
    setShowBulkDeleteDialog(false);
    toast({ title: "تم الحذف", description: `تم حذف ${ids.length} عقار بنجاح` });
  };

  const handleBulkStatusChange = () => {
    if (!bulkStatus) return;
    const ids = Array.from(selectedIds);
    bulkUpdateProperties(ids, { status: bulkStatus as PropertyStatus });
    clearSelection();
    setBulkStatus("");
    toast({ title: "تم التحديث", description: `تم تغيير حالة ${ids.length} عقار إلى "${statusLabels[bulkStatus as PropertyStatus]}"` });
  };

  const selectedCount = selectedIds.size;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="إدارة العقارات"
          subtitle="عرض وإدارة جميع العقارات في المنصة"
          actions={
            canAddProperty ? (
              <Button asChild className="h-10 gap-2 bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]">
                <Link href="/admin/properties/new">
                  <Plus className="h-4 w-4" />
                  إضافة عقار جديد
                </Link>
              </Button>
            ) : undefined
          }
        />

        {/* Sticky Search & Action Bar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 border-b border-border/80 shadow-md shadow-black/5 transition-all flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث بالعنوان، الكود (مثل S66)، المنطقة، أو النوع..."
              className="pr-9 pl-8 h-10 bg-card border-border/80 rounded-xl focus-visible:ring-accent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-center">
            <span>النتائج: <strong className="text-foreground">{filteredProperties.length}</strong> من أصل {properties.length} عقار</span>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-accent">
              تم تحديد {selectedCount} عقار
            </span>
            <div className="flex items-center gap-2 mr-auto flex-wrap">
              {canPublishProperty && (
                <>
                  <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as PropertyStatus)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="تغيير الحالة إلى..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={!bulkStatus}
                    onClick={handleBulkStatusChange}
                  >
                    تطبيق
                  </Button>
                </>
              )}
              {canEditProperty && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      const ids = Array.from(selectedIds);
                      bulkUpdateProperties(ids, { featured: true });
                      clearSelection();
                      toast({ title: "تم التمييز ⭐", description: `تم تمييز ${ids.length} عقارات ليظهروا في العقارات المميزة VIP` });
                    }}
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    تمييز VIP
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const ids = Array.from(selectedIds);
                      bulkUpdateProperties(ids, { featured: false });
                      clearSelection();
                      toast({ title: "تم إلغاء التمييز", description: `تم إلغاء تمييز ${ids.length} عقارات` });
                    }}
                  >
                    <Star className="h-3.5 w-3.5" />
                    إلغاء التمييز
                  </Button>
                </>
              )}
              {canDeleteProperty && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-3 w-3 ml-1" />
                  حذف المحددة
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={clearSelection}
              >
                إلغاء التحديد
              </Button>
            </div>
          </div>
        )}

        <div className="border rounded-md bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pr-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="تحديد الكل"
                    className={someSelected && !allSelected ? "opacity-50" : ""}
                  />
                </TableHead>
                <TableHead>الكود / تمييز VIP</TableHead>
                <TableHead>فئة العقار</TableHead>
                <TableHead>نوع العرض</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow
                  key={property.id}
                  className={selectedIds.has(property.id) ? "bg-accent/5" : ""}
                >
                  <TableCell className="pr-4">
                    <Checkbox
                      checked={selectedIds.has(property.id)}
                      onCheckedChange={() => toggleSelect(property.id)}
                      aria-label={`تحديد ${property.code}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {canEditProperty && (
                        <button
                          type="button"
                          onClick={() => {
                            const newFeatured = !property.featured;
                            updateProperty(property.id, { featured: newFeatured });
                            toast({
                              title: newFeatured ? "تم التمييز ⭐" : "تم إلغاء التمييز",
                              description: newFeatured
                                ? `تم تمييز العقار (${property.code}) ليظهر في العقارات المميزة VIP`
                                : `تم إلغاء تمييز العقار (${property.code})`,
                            });
                          }}
                          title={property.featured ? "عقار مميز VIP (اضغط لإلغاء التمييز)" : "تمييز كعقار مميز VIP (اضغط للتفعيل)"}
                          className={`p-1 rounded-md transition-all cursor-pointer ${
                            property.featured
                              ? "text-amber-500 hover:text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                              : "text-muted-foreground/35 hover:text-amber-500 hover:bg-muted/50"
                          }`}
                        >
                          <Star className={`h-4 w-4 ${property.featured ? "fill-amber-500" : ""}`} />
                        </button>
                      )}
                      <a
                        href={`/properties/${property.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="معاينة العقار في تبويب جديد"
                        className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded tracking-wide whitespace-nowrap transition-colors cursor-pointer ${
                          property.featured
                            ? "text-amber-600 dark:text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30"
                            : "text-accent bg-accent/10 hover:bg-accent/20 border border-accent/25"
                        }`}
                      >
                        <span>{property.code}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium whitespace-nowrap">
                      {categoryLabels[property.category] || property.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold whitespace-nowrap">
                      {listingTypeLabels[property.listingType || ""] || categoryLabels[property.category] || "للبيع"}
                    </span>
                  </TableCell>
                  <TableCell>{propertyTypes.find(t => t.id === property.typeId)?.name}</TableCell>
                  <TableCell>{regions.find(r => r.id === property.regionId)?.name}</TableCell>
                  <TableCell>{formatNumber(property.price)} EGP</TableCell>
                  <TableCell>
                    {canPublishProperty ? (
                      <Select
                        value={property.status}
                        onValueChange={(val) => handleStatusChange(property.id, val as PropertyStatus)}
                      >
                        <SelectTrigger className={`w-[120px] h-8 text-xs ${statusColors[property.status]} border-none font-semibold`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusColors[property.status]}`}>
                        {statusLabels[property.status]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="معاينة العقار"
                        className="text-muted-foreground hover:text-accent hover:bg-accent/10"
                      >
                        <a href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {canEditProperty && (
                        <Button variant="ghost" size="icon" asChild title="تعديل العقار">
                          <Link href={`/admin/properties/${property.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {canDeleteProperty && (
                        <Button
                          variant="ghost" size="icon"
                          title="حذف العقار"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => setDeleteTarget(property)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProperties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      icon={<HomeIcon className="h-8 w-8" />}
                      title="لا توجد عقارات"
                      description="لم يتم العثور على أي عقارات مسجلة."
                      className="border-none py-12 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filteredProperties.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {filteredProperties.length} عقار{selectedCount > 0 ? ` — محدد ${selectedCount}` : ""}
          </p>
        )}
      </div>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف العقار <strong>{deleteTarget?.code}</strong> نهائياً ولا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {selectedCount} عقار؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف {selectedCount} عقار نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={handleBulkDelete}>
              حذف الكل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
