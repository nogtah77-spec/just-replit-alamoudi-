import { ChangeEvent, useRef, useState, useEffect } from "react";
import { useData, Region } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Eye, EyeOff, Plus, Image as ImageIcon, Upload, X, MapPin, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HeroImageAdjuster } from "@/components/admin/HeroImageAdjuster";
import { compressImage } from "@/lib/imageOptimizer";
import { checkUserPermission } from "@/lib/permissions";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteFolderFromCloudinary,
  getRegionCloudinaryFolder,
  getThumbnailImageUrl,
} from "@/lib/cloudinaryService";
import { Link } from "wouter";

export default function Regions() {
  const { regions, addRegion, updateRegion, deleteRegion, toggleRegion } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canManageRegions = isAdmin || checkUserPermission(currentUser, "الإعدادات-إدارة المناطق");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Region | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);
  const [newName, setNewName] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [rawHeroImage, setRawHeroImage] = useState("");
  const [overlayColor, setOverlayColor] = useState("#000000");
  const [overlayOpacity, setOverlayOpacity] = useState(25);
  const [gradientOpacity, setGradientOpacity] = useState(60);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!canManageRegions) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية إدارة المناطق والمدن. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      let finalHeroImage = heroImage.trim();
      // Offload to Cloudinary if it is a base64 image
      if (finalHeroImage.startsWith("data:image/")) {
        toast({ title: "جاري رفع غلاف المنطقة إلى Cloudinary..." });
        const folder = getRegionCloudinaryFolder(newName.trim());
        finalHeroImage = await uploadToCloudinary(finalHeroImage, folder);
      }

      const saved = await addRegion(newName.trim(), finalHeroImage);
      if (!saved) return;
      setNewName("");
      setHeroImage("");
      setRawHeroImage("");
      setShowAddDialog(false);
      toast({ title: "تم بنجاح ✓", description: "تمت إضافة المنطقة ورفع غلافها السحابي بنجاح" });
    } catch (err: any) {
      console.error("[Regions] Add error:", err);
      toast({ title: "تعذر حفظ المنطقة", description: err.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !newName.trim()) return;
    setSaving(true);
    try {
      let finalHeroImage = heroImage.trim();
      // If user cleared the image or replaced it
      if (finalHeroImage.startsWith("data:image/")) {
        toast({ title: "جاري رفع غلاف المنطقة الجديد إلى Cloudinary..." });
        const folder = getRegionCloudinaryFolder(editTarget.id || newName.trim());
        finalHeroImage = await uploadToCloudinary(finalHeroImage, folder);
      }

      const saved = await updateRegion(editTarget.id, newName.trim(), finalHeroImage);
      if (!saved) return;

      // If hero image was replaced or deleted, purge the old one from Cloudinary
      if (editTarget.heroImage && editTarget.heroImage !== finalHeroImage) {
        void deleteFromCloudinary(editTarget.heroImage);
      }

      setEditTarget(null);
      setNewName("");
      setHeroImage("");
      setRawHeroImage("");
      toast({ title: "تم بنجاح ✓", description: "تم تحديث المنطقة وغلافها السحابي بنجاح" });
    } catch (err: any) {
      console.error("[Regions] Edit error:", err);
      toast({ title: "تعذر تحديث المنطقة", description: err.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const deleted = await deleteRegion(deleteTarget.id);
    if (!deleted) return;

    // Purge hero image and region folder from Cloudinary
    if (deleteTarget.heroImage) {
      void deleteFromCloudinary(deleteTarget.heroImage);
    }
    void deleteFolderFromCloudinary(getRegionCloudinaryFolder(deleteTarget.id));

    setDeleteTarget(null);
    toast({ title: "تم بنجاح", description: "تم حذف المنطقة وغلافها السحابي بنجاح" });
  };

  const handleToggle = async (id: string) => {
    const toggled = await toggleRegion(id);
    if (!toggled) return;
    toast({ title: "تم بنجاح", description: "تم تعديل حالة المنطقة بنجاح" });
  };

  const openEdit = (r: Region) => {
    setEditTarget(r);
    setNewName(r.name);
    setHeroImage(r.heroImage ?? "");
    setRawHeroImage(r.heroImage ?? "");
  };

  const handleHeroFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "ملف غير صالح", description: "اختر ملف صورة فقط.", variant: "destructive" });
      return;
    }
    try {
      toast({ title: "جاري معالجة وتحسين الصورة...", description: "يتم ضغط الصورة لتناسب العرض السريع والفوري." });
      const optimized = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.82 });
      setRawHeroImage(optimized);
      setHeroImage(optimized);
      toast({ title: "تم تجهيز الصورة بنجاح ✓", description: "اضغط حفظ لحفظ التعديلات على المنطقة." });
    } catch (err) {
      toast({ title: "تعذر معالجة الصورة", description: "حاول اختيار صورة أخرى.", variant: "destructive" });
    }
  };

  const clearHeroImage = () => {
    setHeroImage("");
    setRawHeroImage("");
  };

  const removeSavedHeroImage = () => {
    setHeroImage("");
    setRawHeroImage("");
    toast({
      title: "تمت إزالة الصورة من التعديل",
      description: "اضغط «حفظ» لتأكيد حذف صورة الغلاف من المنطقة.",
    });
  };

  const renderHeroEditor = () => (
    <div className="space-y-3">
      <Label className="text-sm font-bold">صورة غلاف المدينة والموقع</Label>

      {/* Interactive Hero Image Adjuster & Overlay Controller */}
      {rawHeroImage || heroImage ? (
        <div className="space-y-2">
          <HeroImageAdjuster
            imageUrl={rawHeroImage || heroImage}
            onImageAdjusted={(adjusted) => setHeroImage(adjusted)}
            overlayColor={overlayColor}
            overlayOpacity={overlayOpacity}
            gradientOpacity={gradientOpacity}
            onOverlayChange={(ov) => {
              setOverlayColor(ov.color);
              setOverlayOpacity(ov.overlayOpacity);
              setGradientOpacity(ov.gradientOpacity);
            }}
            regionName={newName}
          />
        </div>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-muted/30 text-xs text-muted-foreground p-4 text-center">
          <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
          <span>لا توجد صورة غلاف مرفوعة حالياً</span>
          <span className="text-[10px] text-muted-foreground/70">ارفع صورة لتتمكن من تحريكها وضبط المعاينة والشفافية بحرية</span>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleHeroFile} className="hidden" />
      
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1 gap-2 border-accent/40 hover:bg-accent/10" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 text-accent" />
          {(rawHeroImage || heroImage).startsWith("data:") ? "استبدال الصورة المرفوعة" : "رفع صورة من جهازك"}
        </Button>

        {(rawHeroImage || heroImage) && (
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={clearHeroImage}
          >
            <Trash2 className="h-4 w-4" />
            حذف صورة الغلاف
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">صيغ PNG أو JPG أو WEBP — بحد أقصى 8 ميجابايت.</p>

      <div className="space-y-1.5 pt-1">
        <Label htmlFor="regionHeroUrl" className="text-xs">أو أدخل رابط صورة خارجي</Label>
        <Input
          id="regionHeroUrl"
          value={(rawHeroImage || heroImage).startsWith("data:") ? "" : (rawHeroImage || heroImage)}
          onChange={(event) => {
            const val = event.target.value;
            setRawHeroImage(val);
            setHeroImage(val);
          }}
          placeholder="/city-heroes/city.jpg أو https://..."
          dir="ltr"
        />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="إدارة المناطق"
          subtitle="تحديد وإدارة المناطق والمدن التي تغطيها المنصة"
          eyebrow="نطاق التغطية"
          icon={MapPin}
          actions={
            <Button className="h-10 gap-2 bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591]" onClick={() => { setNewName(""); setHeroImage(""); setRawHeroImage(""); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4" />
              إضافة منطقة
            </Button>
          }
        />

        <div className="border rounded-md bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المنطقة</TableHead>
              <TableHead>صورة الغلاف</TableHead>
              <TableHead>حالة التفعيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>
                    {region.heroImage ? (
                      <img src={getThumbnailImageUrl(region.heroImage)} alt="" className="h-10 w-16 rounded-md object-cover border" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" /> افتراضية
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${region.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}>
                      {region.active ? "نشط" : "غير نشط"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(region)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(region.id)}>
                        {region.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setDeleteTarget(region)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {regions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد مناطق مضافة بعد.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة منطقة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم المنطقة</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: التجمع الخامس" />
            </div>
            {renderHeroEditor()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
             <Button onClick={handleAdd} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المنطقة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم المنطقة</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            {renderHeroEditor()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
             <Button onClick={handleEdit} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المنطقة نهائياً.
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
