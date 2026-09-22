import { useState, useRef, useEffect, ChangeEvent } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Save,
  Upload,
  X,
  Image as ImageIcon,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Plus,
  Play,
  ExternalLink,
  Sun,
  Moon,
  SunMoon,
  Palette,
  LockKeyhole,
  Settings as SettingsIcon,
  QrCode as QrCodeIcon,
  Globe,
  Trash2,
  Pencil,
  Check,
  Sparkles,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { QrCodeView } from "@/components/ui/QrCodeView";
import {
  WhatsAppIcon,
  TikTokIcon,
  TelegramIcon,
} from "@/components/icons/BrandIcons";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { extractVideoUrl } from "@/lib/videoThumbnail";
import { sanitizeDummyContact, type SiteSettings, type TiktokVideo, type QrCodeItem } from "@/context/DataContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { checkUserPermission } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { HomeBackgroundManager } from "@/components/admin/HomeBackgroundManager";
import { LOGIN_BACKGROUND_PRESETS, type LoginBackgroundPreset } from "@/data/loginPresets";
import { compressImage } from "@/lib/imageOptimizer";
import { uploadToCloudinary, getBrandingCloudinaryFolder } from "@/lib/cloudinaryService";
import { ThemeAppearanceManager } from "@/components/admin/ThemeAppearanceManager";
import { Layers } from "lucide-react";

const EMPTY_VIDEO: Omit<TiktokVideo, "id"> = {
  thumbnail: "",
  title: "",
  videoUrl: "",
};

export default function Settings({ initialTab }: { initialTab?: string } = {}) {
  const {
    settings,
    updateSettings,
    addTiktokVideo,
    updateTiktokVideo,
    deleteTiktokVideo,
  } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canEditSettings = isAdmin || checkUserPermission(currentUser, "الإعدادات-تعديل إعدادات الموقع");
  const canManageQr = isAdmin || checkUserPermission(currentUser, "الإعدادات-إدارة رموز الـ QR") || canEditSettings;
  const { toast } = useToast();

  const getInitialTab = () => {
    if (initialTab) return initialTab;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      const validTabs = ["general", "contact", "qrcodes", "hero", "appearance", "tiktok", "system", "carousel"];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
    } catch {}
    return canEditSettings ? "general" : "qrcodes";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", val);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const isFormDirtyRef = useRef(false);
  const hasInitializedSettingsRef = useRef(false);
  const [form, setForm] = useState<SiteSettings>(() => ({
    ...settings,
    phone1: sanitizeDummyContact(settings.phone1),
    phone2: sanitizeDummyContact(settings.phone2),
    whatsapp: sanitizeDummyContact(settings.whatsapp),
    email: settings.email || "",
  }));

  // One-time initial load from settings if form hasn't been modified yet.
  // NEVER overwrites user input from background polling!
  useEffect(() => {
    if (hasInitializedSettingsRef.current || isFormDirtyRef.current) return;
    if (settings && Object.keys(settings).length > 0) {
      hasInitializedSettingsRef.current = true;
      setForm((prev) => {
        if (isFormDirtyRef.current) return prev;
        return {
          ...settings,
          phone1: prev.phone1 || sanitizeDummyContact(settings.phone1),
          phone2: prev.phone2 || sanitizeDummyContact(settings.phone2),
          whatsapp: prev.whatsapp || sanitizeDummyContact(settings.whatsapp),
          email: prev.email || settings.email || "",
          homeBackgroundSettings: {
            ...(settings.homeBackgroundSettings || {}),
            ...(prev.homeBackgroundSettings || {}),
            enabled: prev.homeBackgroundSettings?.enabled ?? settings.homeBackgroundSettings?.enabled ?? true,
          } as any,
        };
      });
    }
  }, [settings]);

  // Keep form.activeThemeId synced with cloud settings so saving general settings never reverts themes
  useEffect(() => {
    if (settings.activeThemeId) {
      setForm((prev) => (prev.activeThemeId === settings.activeThemeId ? prev : { ...prev, activeThemeId: settings.activeThemeId }));
    }
  }, [settings.activeThemeId]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loginBackgroundFileRef = useRef<HTMLInputElement>(null);
  const loginFormDirtyRef = useRef(false);
  const [newVideo, setNewVideo] =
    useState<Omit<TiktokVideo, "id">>(EMPTY_VIDEO);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  if (!canEditSettings && !canManageQr) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ليس لديك صلاحية تعديل إعدادات الموقع أو إدارة رموز الـ QR. يرجى مراجعة مدير النظام للحصول على الصلاحيات المطلوبة.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }
  const [editVideo, setEditVideo] =
    useState<Omit<TiktokVideo, "id">>(EMPTY_VIDEO);
  const thumbRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // QR Codes Management State & Handlers
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editingQr, setEditingQr] = useState<QrCodeItem | null>(null);
  const [qrFileLoading, setQrFileLoading] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [qrForm, setQrForm] = useState<Omit<QrCodeItem, "id">>({
    title: "",
    subtitle: "",
    type: "url",
    url: "",
    imageUrl: "",
    icon: "whatsapp",
    active: true,
    showInHome: true,
    showInPdf: true,
  });

  const handleOpenAddQr = () => {
    setEditingQr(null);
    setQrForm({
      title: "",
      subtitle: "",
      type: "url",
      url: form.whatsapp ? `https://wa.me/${form.whatsapp.replace(/[^0-9]/g, "")}` : "",
      imageUrl: "",
      icon: "whatsapp",
      active: true,
      showInHome: true,
      showInPdf: true,
    });
    setQrModalOpen(true);
  };

  const handleOpenEditQr = (qr: QrCodeItem) => {
    setEditingQr(qr);
    setQrForm({
      title: qr.title,
      subtitle: qr.subtitle || "",
      type: qr.type,
      url: qr.url || "",
      imageUrl: qr.imageUrl || "",
      icon: qr.icon || "custom",
      active: qr.active !== false,
      showInHome: qr.showInHome !== false,
      showInPdf: qr.showInPdf !== false,
    });
    setQrModalOpen(true);
  };

  const handleQrImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة جداً (حد 3MB)", variant: "destructive" });
      return;
    }
    setQrFileLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrForm((p) => ({ ...p, imageUrl: ev.target?.result as string, type: "image" }));
      setQrFileLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveQr = () => {
    if (!qrForm.title.trim()) {
      toast({ title: "يرجى إدخال عنوان للـ QR كود", variant: "destructive" });
      return;
    }
    if (qrForm.type === "url" && !qrForm.url?.trim()) {
      toast({ title: "يرجى إدخال الرابط المراد توليد QR له", variant: "destructive" });
      return;
    }
    if (qrForm.type === "image" && !qrForm.imageUrl) {
      toast({ title: "يرجى رفع صورة الـ QR كود", variant: "destructive" });
      return;
    }

    const currentList = form.qrCodes || [];
    let updatedList: QrCodeItem[];

    if (editingQr) {
      updatedList = currentList.map((item) =>
        item.id === editingQr.id
          ? { ...item, ...qrForm }
          : item
      );
    } else {
      const newQrItem: QrCodeItem = {
        id: `qr-${Date.now()}`,
        ...qrForm,
        order: currentList.length + 1,
      };
      updatedList = [...currentList, newQrItem];
    }

    setForm((prev) => ({ ...prev, qrCodes: updatedList }));
    updateSettings({ qrCodes: updatedList });
    setQrModalOpen(false);
    toast({ title: editingQr ? "تم تعديل الـ QR بنجاح ✓" : "تمت إضافة الـ QR كود بنجاح ✓" });
  };

  const handleDeleteQr = (id: string) => {
    const updatedList = (form.qrCodes || []).filter((item) => item.id !== id);
    setForm((prev) => ({ ...prev, qrCodes: updatedList }));
    updateSettings({ qrCodes: updatedList });
    toast({ title: "تم حذف الـ QR كود بنجاح" });
  };

  const handleToggleQrSection = async (val: boolean) => {
    const updatedForm: SiteSettings = {
      ...form,
      qrSectionEnabled: val,
    };
    setForm(updatedForm);
    await updateSettings(updatedForm);
    toast({
      title: val ? "تم تفعيل ظهور قسم الـ QR كود في الموقع ✓" : "تم إخفاء قسم الـ QR كود بالكامل من الموقع ✕",
    });
  };

  const handleToggleTiktokSection = async (val: boolean) => {
    const updatedForm: SiteSettings = {
      ...form,
      tiktokSectionEnabled: val,
    };
    setForm(updatedForm);
    try {
      localStorage.setItem("alm_tiktok_enabled", JSON.stringify(val));
    } catch {}
    await updateSettings({ tiktokSectionEnabled: val });
    toast({
      title: val ? "تم تفعيل ظهور بوكس تيك توك في الصفحة الرئيسية ✓" : "تم إخفاء بوكس تيك توك بالكامل من الصفحة الرئيسية ✕",
    });
  };

  const handleToggleQr = async (id: string, key: "active" | "showInHome" | "showInPdf", val: boolean) => {
    const currentList = form.qrCodes || settings.qrCodes || [];
    const updatedList = currentList.map((item) =>
      item.id === id ? { ...item, [key]: val } : item
    );
    const updatedForm: SiteSettings = {
      ...form,
      qrCodes: updatedList,
    };
    setForm(updatedForm);
    await updateSettings(updatedForm);
    toast({
      title: val ? "تم تفعيل الـ QR كود بنجاح ✓" : "تم تعطيل الـ QR كود بنجاح ✕",
    });
  };

  const markLoginFormDirty = () => {
    loginFormDirtyRef.current = true;
  };

  const avatarRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة جداً (حد 3MB)", variant: "destructive" });
      return;
    }
    const r = new FileReader();
    r.onload = (ev) =>
      setForm((p) => ({ ...p, tiktokAvatar: ev.target?.result as string }));
    r.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveAccount = () => {
    updateSettings({
      tiktok: form.tiktok,
      tiktokName: form.tiktokName,
      tiktokAvatar: form.tiktokAvatar,
    });
    toast({ title: "تم حفظ بيانات الحساب ✓" });
  };

  const handleThumbFile = (file: File, onDone: (b64: string) => void) => {
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة جداً (حد 3MB)", variant: "destructive" });
      return;
    }
    const r = new FileReader();
    r.onload = (e) => onDone(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleAddVideo = () => {
    if (!newVideo.title.trim() || !newVideo.videoUrl.trim()) {
      toast({
        title: "يرجى إدخال العنوان ورابط الفيديو",
        variant: "destructive",
      });
      return;
    }
    if ((settings.tiktokVideos ?? []).length >= 6) {
      toast({
        title: "الحد الأقصى 6 فيديوهات",
        description: "احذف فيديو قبل إضافة فيديو جديد",
        variant: "destructive",
      });
      return;
    }
    addTiktokVideo({
      ...newVideo,
      videoUrl: extractVideoUrl(newVideo.videoUrl),
    });
    setNewVideo(EMPTY_VIDEO);
    toast({ title: "تم إضافة الفيديو" });
  };

  const handleSaveEdit = () => {
    if (!editingVideoId) return;
    updateTiktokVideo(editingVideoId, {
      ...editVideo,
      videoUrl: extractVideoUrl(editVideo.videoUrl),
    });
    setEditingVideoId(null);
    toast({ title: "تم تحديث الفيديو" });
  };

  const set =
    (key: keyof SiteSettings) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isFormDirtyRef.current = true;
      if (
        key === "loginBackgroundEnabled" ||
        key === "loginBackgroundImageUrl" ||
        key === "loginOverlayColor" ||
        key === "loginOverlayOpacity" ||
        key === "loginGradientOpacity" ||
        key === "loginCardOpacity" ||
        key === "loginCardBlur"
      ) {
        loginFormDirtyRef.current = true;
      }
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  useEffect(() => {
    if (loginFormDirtyRef.current) return;
    setForm((prev) => ({
      ...prev,
      loginBackgroundEnabled: settings.loginBackgroundEnabled,
      loginBackgroundImageUrl: settings.loginBackgroundImageUrl,
      loginOverlayColor: settings.loginOverlayColor,
      loginOverlayOpacity: settings.loginOverlayOpacity,
      loginGradientOpacity: settings.loginGradientOpacity,
      loginCardOpacity: settings.loginCardOpacity ?? 88,
      loginCardBlur: settings.loginCardBlur ?? 20,
    }));
  }, [
    settings.loginBackgroundEnabled,
    settings.loginBackgroundImageUrl,
    settings.loginOverlayColor,
    settings.loginOverlayOpacity,
    settings.loginGradientOpacity,
    settings.loginCardOpacity,
    settings.loginCardBlur,
  ]);

  const handleHeroFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "نوع الملف غير صالح",
        description: "يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "الصورة كبيرة جداً",
        description: "يجب أن لا يتجاوز حجم الصورة 25 ميجابايت",
        variant: "destructive",
      });
      return;
    }
    try {
      toast({ title: "جاري معالجة ورفع صورة الغلاف السحابية...", description: "يتم ضغط الصورة ورفعها إلى Cloudinary مباشرة." });
      const optimized = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.82 });
      const folder = getBrandingCloudinaryFolder("home_hero");
      const cloudUrl = await uploadToCloudinary(optimized, folder);
      setForm((prev) => ({ ...prev, heroImageUrl: cloudUrl }));
      toast({
        title: "تم رفع صورة الغلاف بنجاح ✓",
        description: "تم رفع الصورة إلى السحابة. اضغط 'حفظ صورة الغلاف' لتطبيقها على المنصة.",
      });
    } catch (err: any) {
      console.error("[Settings] Hero image upload error:", err);
      toast({
        title: "تعذر رفع الصورة",
        description: err.message || "حدث خطأ أثناء الرفع، يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const [compressingLoginBg, setCompressingLoginBg] = useState(false);

  const handleSelectLoginPreset = (preset: LoginBackgroundPreset) => {
    loginFormDirtyRef.current = true;
    isFormDirtyRef.current = true;
    setForm((prev) => ({
      ...prev,
      loginBackgroundEnabled: true,
      loginBackgroundImageUrl: preset.imageUrl,
      loginOverlayColor: preset.overlayColor,
      loginOverlayOpacity: preset.overlayOpacity,
      loginGradientOpacity: preset.gradientOpacity,
    }));
    toast({
      title: `تم اختيار ${preset.title}`,
      description: "اضغط على زر الحفظ بالأسفل لتثبيت هذا الغلاف نهائياً.",
    });
  };

  const handleRemoveLoginBackground = () => {
    loginFormDirtyRef.current = true;
    isFormDirtyRef.current = true;
    setForm((prev) => ({
      ...prev,
      loginBackgroundEnabled: false,
      loginBackgroundImageUrl: "",
    }));
    toast({
      title: "تم تعطيل خلفية تسجيل الدخول",
      description: "اضغط على زر الحفظ لتأكيد الإزالة والعودة للنمط الافتراضي.",
    });
  };

  const handleLoginBackgroundFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "نوع الملف غير صالح",
        description: "يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "حجم الصورة كبير جداً",
        description: "الحد الأقصى لحجم الصورة هو 25 ميجابايت.",
        variant: "destructive",
      });
      return;
    }

    setCompressingLoginBg(true);
    try {
      // Compress adaptive WebP (max 1920x1920, quality 0.80) to ~80-140KB
      const compressedDataUrl = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.80 });
      toast({ title: "جاري رفع خلفية الدخول إلى Cloudinary..." });
      const folder = getBrandingCloudinaryFolder("login_bg");
      const cloudUrl = await uploadToCloudinary(compressedDataUrl, folder);

      loginFormDirtyRef.current = true;
      isFormDirtyRef.current = true;
      setForm((prev) => ({
        ...prev,
        loginBackgroundImageUrl: cloudUrl,
        loginBackgroundEnabled: true,
      }));
      toast({
        title: "تم رفع وتجهيز الصورة بنجاح ✓",
        description: "أصبحت الصورة سحابية وخفيفة للغاية. اضغط 'حفظ إعدادات تسجيل الدخول' لتثبيتها.",
      });
    } catch (err: any) {
      console.error("[Settings] Login background error:", err);
      toast({
        title: "تعذر معالجة أو رفع الصورة",
        description: err.message || "حدث خطأ، يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setCompressingLoginBg(false);
    }
  };

  const regionOverlayColor = form.regionHeroOverlayColor || "#000000";
  const regionOverlayOpacity = Math.min(
    100,
    Math.max(0, Number(form.regionHeroOverlayOpacity ?? 25)),
  );
  const regionGradientOpacity = Math.min(
    100,
    Math.max(0, Number(form.regionHeroGradientOpacity ?? 60)),
  );
  const loginOverlayColor = form.loginOverlayColor || "#10202D";
  const loginOverlayOpacity = Math.min(100, Math.max(0, Number(form.loginOverlayOpacity ?? 72)));
  const loginGradientOpacity = Math.min(100, Math.max(0, Number(form.loginGradientOpacity ?? 58)));
  const loginCardOpacity = Math.min(100, Math.max(10, Number(form.loginCardOpacity ?? 88)));
  const loginCardBlur = Math.min(40, Math.max(0, Number(form.loginCardBlur ?? 20)));

  const colorToRgba = (value: string, opacity: number) => {
    const normalized = value.replace(/^#/, "");
    const safe = /^[0-9a-f]{6}$/i.test(normalized) ? normalized : "10202D";
    return `rgba(${parseInt(safe.slice(0, 2), 16)}, ${parseInt(safe.slice(2, 4), 16)}, ${parseInt(safe.slice(4, 6), 16)}, ${opacity / 100})`;
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      const isLocalAdminPreview = typeof window !== "undefined" && localStorage.getItem("alm_theme_scope") === "admin_only";
      // If admin is previewing a theme locally, preserve public cloud theme for visitors when saving general settings
      const payloadToSave = isLocalAdminPreview ? { ...form, activeThemeId: settings.activeThemeId } : form;
      const saved = await updateSettings(payloadToSave);
      if (!saved) throw new Error("settings save failed");
      loginFormDirtyRef.current = false;
      isFormDirtyRef.current = false;
      toast({
        title: "تم الحفظ بنجاح ✓",
        description: "تم تحديث إعدادات المنصة.",
      });
    } catch {
      toast({
        title: "خطأ في الحفظ",
        description: "تعذر حفظ الإعدادات. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <AdminPageHeader
          title="إعدادات المنصة"
          subtitle="إدارة إعدادات الموقع وبيانات التواصل"
          eyebrow="التخصيص والإدارة"
          icon={SettingsIcon}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full h-auto p-2 bg-card/95 dark:bg-card/70 border border-border/80 rounded-2xl shadow-xs">
            {canEditSettings && (
              <TabsTrigger
                value="general"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <SettingsIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">عام</span>
              </TabsTrigger>
            )}
            {canEditSettings && (
              <TabsTrigger
                value="contact"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="truncate">التواصل</span>
              </TabsTrigger>
            )}
            {canManageQr && (
              <TabsTrigger
                value="qrcodes"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <QrCodeIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">رموز الـ QR</span>
              </TabsTrigger>
            )}
            {canEditSettings && (
              <TabsTrigger
                value="hero"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">صورة الغلاف</span>
              </TabsTrigger>
            )}
            {canEditSettings && (
              <TabsTrigger
                value="appearance"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-accent" />
                <span className="truncate">الخلفيات والثيمات</span>
              </TabsTrigger>
            )}
            {canEditSettings && (
              <TabsTrigger
                value="tiktok"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <Play className="h-4 w-4 shrink-0" />
                <span className="truncate">تيك توك</span>
              </TabsTrigger>
            )}
            {canEditSettings && (
              <TabsTrigger
                value="system"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <Globe className="h-4 w-4 shrink-0" />
                <span className="truncate">النظام</span>
              </TabsTrigger>
            )}
            {canEditSettings && (
              <TabsTrigger
                value="carousel"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground hover:bg-muted/80"
              >
                <SunMoon className="h-4 w-4 shrink-0" />
                <span className="truncate">الكاروسيل</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── General ── */}
          <TabsContent value="general" className="mt-6">
            <Card className="card-luxury">
              <CardHeader>
                <CardTitle>الإعدادات العامة</CardTitle>
                <CardDescription>المعلومات الأساسية للشركة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={set("companyName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyDescription">وصف الشركة</Label>
                  <Textarea
                    id="companyDescription"
                    rows={3}
                    value={form.companyDescription}
                    onChange={set("companyDescription")}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ── Contact ── */}
          <TabsContent value="contact" className="mt-6">
            <Card className="card-luxury">
              <CardHeader>
                <CardTitle>معلومات التواصل</CardTitle>
                <CardDescription>
                  ستظهر هذه البيانات تلقائياً في تذييل الموقع
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone1" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-accent" />
                      رقم الهاتف الأول
                    </Label>
                    <Input
                      id="phone1"
                      dir="ltr"
                      className="text-right placeholder:text-muted-foreground/35 placeholder:opacity-60"
                      value={form.phone1 ?? ""}
                      onChange={set("phone1")}
                      placeholder="+20 10 0000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone2" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-accent" />
                      رقم الهاتف الثاني
                    </Label>
                    <Input
                      id="phone2"
                      dir="ltr"
                      className="text-right placeholder:text-muted-foreground/35 placeholder:opacity-60"
                      value={form.phone2 ?? ""}
                      onChange={set("phone2")}
                      placeholder="+20 11 0000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="whatsapp"
                      className="flex items-center gap-2"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5 text-accent" />
                      رقم واتساب
                    </Label>
                    <Input
                      id="whatsapp"
                      dir="ltr"
                      className="text-right placeholder:text-muted-foreground/35 placeholder:opacity-60"
                      value={form.whatsapp ?? ""}
                      onChange={set("whatsapp")}
                      placeholder="+20 10 0000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-accent" />
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      className="text-right placeholder:text-muted-foreground/35 placeholder:opacity-60"
                      value={form.email ?? ""}
                      onChange={set("email")}
                      placeholder="info@alamoudi.com"
                    />
                  </div>
                </div>

                <div className="border-t pt-5">
                  <p className="text-sm font-semibold text-foreground mb-4">
                    روابط التواصل الاجتماعي والخرائط
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="mapsUrl"
                        className="flex items-center gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        رابط خرائط جوجل
                      </Label>
                      <Input
                        id="mapsUrl"
                        dir="ltr"
                        className="text-right text-xs"
                        value={form.mapsUrl ?? ""}
                        onChange={set("mapsUrl")}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="tiktok"
                        className="flex items-center gap-2"
                      >
                        <TikTokIcon className="h-3.5 w-3.5 text-accent" />
                        رابط تيك توك
                      </Label>
                      <Input
                        id="tiktok"
                        dir="ltr"
                        className="text-right text-xs"
                        value={form.tiktok ?? ""}
                        onChange={set("tiktok")}
                        placeholder="https://tiktok.com/@..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="facebook"
                        className="flex items-center gap-2"
                      >
                        <Facebook className="h-3.5 w-3.5 text-accent" />
                        رابط فيسبوك
                      </Label>
                      <Input
                        id="facebook"
                        dir="ltr"
                        className="text-right text-xs"
                        value={form.facebook ?? ""}
                        onChange={set("facebook")}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="instagram"
                        className="flex items-center gap-2"
                      >
                        <Instagram className="h-3.5 w-3.5 text-accent" />
                        رابط إنستغرام
                      </Label>
                      <Input
                        id="instagram"
                        dir="ltr"
                        className="text-right text-xs"
                        value={form.instagram ?? ""}
                        onChange={set("instagram")}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="telegram"
                        className="flex items-center gap-2"
                      >
                        <TelegramIcon className="h-3.5 w-3.5 text-accent" />
                        رابط تيليجرام
                      </Label>
                      <Input
                        id="telegram"
                        dir="ltr"
                        className="text-right text-xs"
                        value={form.telegram ?? ""}
                        onChange={set("telegram")}
                        placeholder="https://t.me/..."
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ التواصل"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ── QR Codes Management ── */}
          <TabsContent value="qrcodes" className="mt-6 space-y-6">
            {/* Master Toggle Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-card to-background border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <QrCodeIcon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">ظهور قسم الـ QR Code في الصفحة الرئيسية</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(form.qrSectionEnabled ?? true) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                      {(form.qrSectionEnabled ?? true) ? "ظاهر بالموقع" : "مخفي تماماً"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    التحكم الرئيسي الشامل في إظهار أو إخفاء قسم رموز الـ QR بالكامل من أسفل الصفحة الرئيسية بضغطة زر واحدة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <Switch
                  checked={form.qrSectionEnabled ?? true}
                  onCheckedChange={handleToggleQrSection}
                  id="master-qr-switch"
                />
                <Label htmlFor="master-qr-switch" className="text-xs font-bold cursor-pointer">
                  {(form.qrSectionEnabled ?? true) ? "مفعّل" : "معطّل"}
                </Label>
              </div>
            </div>

            <Card className="card-luxury">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCodeIcon className="h-5 w-5 text-accent" />
                    <span>قائمة رموز الـ QR المسجلة</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    توليد وإدارة وتخصيص كل رمز QR على حدة وتحديد مكان ظهوره (الصفحة الرئيسية أو ملفات PDF).
                  </CardDescription>
                </div>
                <Button
                  onClick={handleOpenAddQr}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl font-bold shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة QR كود جديد</span>
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* List of QR Codes */}
                {(!form.qrCodes || form.qrCodes.length === 0) ? (
                  <div className="text-center py-12 border-2 border-dashed border-border/80 rounded-2xl p-6 bg-muted/20">
                    <QrCodeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <h3 className="text-base font-bold text-foreground mb-1">لا توجد رموز QR مضافة حالياً</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                      أضف رمز QR لموقعك على الخريطة، أو محادثة الواتساب، أو حساب تيك توك لتظهر لزوار الموقع وفي ملفات الـ PDF
                    </p>
                    <Button onClick={handleOpenAddQr} variant="outline" className="gap-2 rounded-xl border-accent/40 text-accent">
                      <Plus className="h-4 w-4" />
                      إضافة أول كود QR
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {form.qrCodes.map((qr) => (
                      <div
                        key={qr.id}
                        className="rounded-2xl border border-border/80 bg-card/60 p-4 flex flex-col justify-between hover:border-accent/50 transition-all shadow-xs gap-4"
                      >
                        <div className="flex items-start gap-4">
                          {/* QR Thumbnail */}
                          <div className="bg-white p-1 rounded-xl border border-border shadow-inner shrink-0">
                            <QrCodeView
                              url={qr.url}
                              imageUrl={qr.imageUrl}
                              type={qr.type}
                              size={80}
                              alt={qr.title}
                            />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-foreground truncate">{qr.title}</h4>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenEditQr(qr)}
                                  title="تعديل"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteQr(qr.id)}
                                  title="حذف"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {qr.subtitle && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{qr.subtitle}</p>
                            )}

                            {qr.url && (
                              <p className="text-[11px] text-accent/90 font-mono dir-ltr text-right truncate bg-accent/5 px-2 py-0.5 rounded-md border border-accent/10">
                                {qr.url}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Toggles Footer */}
                        <div className="border-t border-border/60 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 bg-muted/40 px-2.5 py-1 rounded-xl border border-border/50">
                            <Switch
                              checked={qr.active !== false}
                              onCheckedChange={(v) => handleToggleQr(qr.id, "active", v)}
                              id={`active-${qr.id}`}
                            />
                            <Label htmlFor={`active-${qr.id}`} className="text-xs font-bold cursor-pointer">
                              {qr.active !== false ? "مفعّل" : "معطّل"}
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleQr(qr.id, "showInHome", !(qr.showInHome !== false))}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
                                qr.showInHome !== false
                                  ? "bg-accent/15 border-accent text-accent shadow-xs"
                                  : "bg-muted/30 border-border text-muted-foreground line-through opacity-70"
                              }`}
                            >
                              <span>الصفحة الرئيسية</span>
                              {qr.showInHome !== false ? "✓" : "✕"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleQr(qr.id, "showInPdf", !(qr.showInPdf !== false))}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
                                qr.showInPdf !== false
                                  ? "bg-accent/15 border-accent text-accent shadow-xs"
                                  : "bg-muted/30 border-border text-muted-foreground line-through opacity-70"
                              }`}
                            >
                              <span>بروشور PDF</span>
                              {qr.showInPdf !== false ? "✓" : "✕"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t pt-4 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  * يتم حفظ وتحديث رموز الـ QR سحابياً فورياً وتنعكس على المنصة وملفات الـ PDF مباشرة.
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ الكل"}
                </Button>
              </CardFooter>
            </Card>

            {/* Dialog for Adding / Editing QR Code */}
            <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
              <DialogContent className="max-w-md p-6 bg-card border-border/80" dir="rtl">
                <DialogHeader className="pb-3 border-b border-border/60">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <QrCodeIcon className="h-5 w-5 text-accent" />
                    <span>{editingQr ? "تعديل رمز QR" : "إضافة رمز QR جديد"}</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-title" className="text-xs font-semibold">عنوان الـ QR كود (يظهر للمستخدم)</Label>
                    <Input
                      id="qr-title"
                      placeholder="مثال: موقعنا على الخريطة / تواصل واتساب"
                      value={qrForm.title}
                      onChange={(e) => setQrForm((p) => ({ ...p, title: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-subtitle" className="text-xs font-semibold">الوصف التوضيحي (اختياري)</Label>
                    <Input
                      id="qr-subtitle"
                      placeholder="مثال: امسح لفتح الموقع الجغرافي مباشرة"
                      value={qrForm.subtitle}
                      onChange={(e) => setQrForm((p) => ({ ...p, subtitle: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Type Selector: URL or Image */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">نوع الإدخال</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={qrForm.type === "url" ? "default" : "outline"}
                        className={qrForm.type === "url" ? "bg-accent text-accent-foreground font-bold" : ""}
                        onClick={() => setQrForm((p) => ({ ...p, type: "url" }))}
                      >
                        توليد تلقائي من رابط
                      </Button>
                      <Button
                        type="button"
                        variant={qrForm.type === "image" ? "default" : "outline"}
                        className={qrForm.type === "image" ? "bg-accent text-accent-foreground font-bold" : ""}
                        onClick={() => setQrForm((p) => ({ ...p, type: "image" }))}
                      >
                        رفع صورة جاهزة
                      </Button>
                    </div>
                  </div>

                  {/* If URL: Input and Presets */}
                  {qrForm.type === "url" ? (
                    <div className="space-y-2">
                      <Label htmlFor="qr-url" className="text-xs font-semibold">الرابط المستهدف (URL أو نص)</Label>
                      <Input
                        id="qr-url"
                        dir="ltr"
                        placeholder="https://..."
                        value={qrForm.url}
                        onChange={(e) => setQrForm((p) => ({ ...p, url: e.target.value }))}
                        className="rounded-xl font-mono text-xs"
                      />

                      {/* Quick URL Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {form.whatsapp && (
                          <button
                            type="button"
                            onClick={() =>
                              setQrForm((p) => ({
                                ...p,
                                url: `https://wa.me/${form.whatsapp.replace(/[^0-9]/g, "")}`,
                                icon: "whatsapp",
                                title: p.title || "تواصل واتساب",
                              }))
                            }
                            className="text-[11px] bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-lg hover:bg-green-500/20"
                          >
                            + واتساب الشركة
                          </button>
                        )}
                        {form.mapsUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setQrForm((p) => ({
                                ...p,
                                url: form.mapsUrl,
                                icon: "location",
                                title: p.title || "موقعنا على الخريطة",
                              }))
                            }
                            className="text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-lg hover:bg-red-500/20"
                          >
                            + خرائط جوجل
                          </button>
                        )}
                        {form.tiktok && (
                          <button
                            type="button"
                            onClick={() =>
                              setQrForm((p) => ({
                                ...p,
                                url: form.tiktok,
                                icon: "tiktok",
                                title: p.title || "حساب تيك توك",
                              }))
                            }
                            className="text-[11px] bg-neutral-500/10 text-foreground border border-border px-2 py-0.5 rounded-lg hover:bg-muted"
                          >
                            + تيك توك
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* If Image: File Uploader */
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">صورة الـ QR كود</Label>
                      <input
                        type="file"
                        ref={qrFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleQrImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => qrFileInputRef.current?.click()}
                        disabled={qrFileLoading}
                        className="w-full gap-2 rounded-xl border-dashed border-accent/40"
                      >
                        <Upload className="h-4 w-4 text-accent" />
                        <span>{qrForm.imageUrl ? "تغيير صورة الـ QR" : "رفع صورة QR من الجهاز"}</span>
                      </Button>
                    </div>
                  )}

                  {/* Icon Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">أيقونة التصنيف</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "whatsapp", label: "واتساب", icon: WhatsAppIcon },
                        { id: "location", label: "موقع", icon: MapPin },
                        { id: "tiktok", label: "تيك توك", icon: TikTokIcon },
                        { id: "website", label: "موقع ويب", icon: Globe },
                        { id: "phone", label: "هاتف", icon: Phone },
                        { id: "custom", label: "افتراضي", icon: QrCodeIcon },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = qrForm.icon === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setQrForm((p) => ({ ...p, icon: item.id as any }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border transition-all ${
                              isSelected
                                ? "bg-accent text-accent-foreground font-bold border-accent shadow-xs"
                                : "bg-card hover:bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Preview Inside Dialog */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-center">
                    <div className="text-center p-3 rounded-2xl bg-muted/40 border border-border/80">
                      <span className="text-[10px] text-muted-foreground block mb-2 font-semibold">
                        معاينة مباشرة للرمز
                      </span>
                      <div className="bg-white p-2 rounded-xl border border-border inline-block shadow-xs">
                        <QrCodeView
                          url={qrForm.type === "url" ? qrForm.url : undefined}
                          imageUrl={qrForm.type === "image" ? qrForm.imageUrl : undefined}
                          type={qrForm.type}
                          size={110}
                          alt="معاينة QR"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQrModalOpen(false)}
                    className="rounded-xl"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveQr}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingQr ? "تحديث الـ QR" : "إضافة الكود"}</span>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Hero Image ── */}
          <TabsContent value="hero" className="mt-6">
            <div className="space-y-5">
              {/* Hero text */}
              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle>نص صفحة الغلاف</CardTitle>
                  <CardDescription>
                    السطران اللذان يظهران فوق الأزرار في الصفحة الرئيسية —
                    اتركهما فارغَين لإخفائهما
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroLine1">السطر الأول</Label>
                    <Input
                      id="heroLine1"
                      value={form.heroLine1 ?? ""}
                      onChange={set("heroLine1")}
                      placeholder="شريكك الموثوق في عالم التسويق العقاري والتشطيبات"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroLine2">السطر الثاني</Label>
                    <Input
                      id="heroLine2"
                      value={form.heroLine2 ?? ""}
                      onChange={set("heroLine2")}
                      placeholder="نقدم لك أفضل الفرص العقارية والاستثمارية في مصر"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "جاري الحفظ..." : "حفظ النص"}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle>صورة الغلاف الرئيسية</CardTitle>
                  <CardDescription>
                    الصورة التي تظهر في قسم الهيرو بالصفحة الرئيسية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Preview */}
                  {form.heroImageUrl && (
                    <div className="relative rounded-xl overflow-hidden h-48 bg-muted border border-border group">
                      <img
                        src={form.heroImageUrl}
                        alt="صورة الغلاف"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, heroImageUrl: "" }))
                          }
                          className="gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          إزالة الصورة
                        </Button>
                      </div>
                    </div>
                  )}

                  {!form.heroImageUrl && (
                    <div className="rounded-xl h-48 bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <ImageIcon className="h-8 w-8 opacity-40" />
                      <p className="text-sm">لا توجد صورة غلاف</p>
                    </div>
                  )}

                  {/* Upload file */}
                  <div className="space-y-2">
                    <Label>رفع صورة جديدة</Label>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeroFile}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 flex-1"
                      >
                        <Upload className="h-4 w-4" />
                        اختيار صورة (حد أقصى 4 ميجا)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP — تُخزَّن في المتصفح فقط حتى يتم ربط
                      التخزين السحابي
                    </p>
                  </div>

                  {/* URL input */}
                  <div className="space-y-2">
                    <Label htmlFor="heroUrl">أو أدخل رابط الصورة مباشرة</Label>
                    <Input
                      id="heroUrl"
                      dir="ltr"
                      className="text-xs"
                      value={
                        form.heroImageUrl.startsWith("data:")
                          ? ""
                          : form.heroImageUrl
                      }
                      onChange={set("heroImageUrl")}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  {/* Overlay darkness — admin (manager) only */}
                  {isAdmin && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <Label>درجة تعتيم الصورة</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            كل ما زادت النسبة، أصبحت الصورة أغمق ووضح النص فوقها
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                heroOverlayOpacity: Math.max(
                                  0,
                                  (prev.heroOverlayOpacity ?? 85) - 5,
                                ),
                              }))
                            }
                          >
                            <X className="h-3 w-3 rotate-45" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            dir="ltr"
                            className="w-20 text-center"
                            value={form.heroOverlayOpacity ?? 85}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value, 10);
                              const val = isNaN(raw)
                                ? 0
                                : Math.min(100, Math.max(0, raw));
                              setForm((prev) => ({
                                ...prev,
                                heroOverlayOpacity: val,
                              }));
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                heroOverlayOpacity: Math.min(
                                  100,
                                  (prev.heroOverlayOpacity ?? 85) + 5,
                                ),
                              }))
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        dir="ltr"
                        value={[form.heroOverlayOpacity ?? 85]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            heroOverlayOpacity: v[0],
                          }))
                        }
                      />
                      {/* Live preview */}
                      <div className="relative rounded-xl overflow-hidden h-28 bg-muted border border-border">
                        {form.heroImageUrl && (
                          <img
                            src={form.heroImageUrl}
                            alt="معاينة"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )}
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, rgba(44,54,57,${(form.heroOverlayOpacity ?? 85) / 100}) 0%, rgba(63,78,79,${((form.heroOverlayOpacity ?? 85) / 100) * 0.92}) 50%, rgba(44,54,57,${Math.min(1, ((form.heroOverlayOpacity ?? 85) / 100) * 1.04)}) 100%)`,
                          }}
                        >
                          <span className="text-white text-sm font-bold">
                            معاينة النص فوق الصورة
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4 gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "جاري الحفظ..." : "حفظ صورة الغلاف"}
                  </Button>
                  {form.heroImageUrl && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          heroImageUrl:
                            "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80",
                        }))
                      }
                      className="text-muted-foreground text-sm"
                    >
                      استعادة الصورة الافتراضية
                    </Button>
                  )}
                </CardFooter>
              </Card>

              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-accent" />
                    خلفية صفحة تسجيل الدخول
                  </CardTitle>
                  <CardDescription>
                    استخدم صورة مستقلة خلف نموذج الدخول، مع طبقة حماية تحافظ على وضوح الحقول والنصوص.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                    <div>
                      <Label htmlFor="loginBackgroundEnabled" className="font-semibold text-foreground">تفعيل صورة الغلاف والخلفية</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        عند التعطيل، تظهر خلفية المنصة الهادئة المتوافقة مع الهوية.
                      </p>
                    </div>
                    <Switch
                      id="loginBackgroundEnabled"
                      checked={Boolean(form.loginBackgroundEnabled)}
                      onCheckedChange={(checked) => {
                        markLoginFormDirty();
                        setForm((prev) => ({ ...prev, loginBackgroundEnabled: checked }));
                      }}
                    />
                  </div>

                  {/* 6 Luxury Default Presets Gallery */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        أغلفة فاخرة جاهزة لصفحة تسجيل الدخول (6 تصاميم راقية)
                      </Label>
                      <span className="text-xs text-muted-foreground">اختر غلافك المفضل بضغطة زر</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {LOGIN_BACKGROUND_PRESETS.map((preset) => {
                        const isSelected = form.loginBackgroundImageUrl === preset.imageUrl;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => handleSelectLoginPreset(preset)}
                            className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                              isSelected
                                ? "border-accent ring-2 ring-accent/30 shadow-md"
                                : "border-border hover:border-accent/50 bg-card"
                            }`}
                          >
                            <div className="relative h-28 w-full overflow-hidden bg-muted">
                              <img
                                src={preset.imageUrl}
                                alt={preset.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div
                                className="absolute inset-0"
                                style={{ backgroundColor: colorToRgba(preset.overlayColor, preset.overlayOpacity) }}
                              />
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(to top, ${colorToRgba(preset.overlayColor, preset.gradientOpacity)} 0%, transparent 100%)`,
                                }}
                              />
                              <span className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white/90">
                                {preset.badge}
                              </span>
                              {isSelected && (
                                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm">
                                  <Check className="h-3 w-3" /> الغلاف النشط
                                </span>
                              )}
                            </div>
                            <div className="p-2.5 bg-card">
                              <p className="text-xs font-bold text-foreground leading-snug">{preset.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{preset.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Upload and Management */}
                  <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                    <Label htmlFor="loginBackgroundImageUrl" className="text-sm font-semibold flex items-center gap-2">
                      <Upload className="h-4 w-4 text-accent" />
                      أو ارفع صورة غلاف مخصصة من جهازك
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        ref={loginBackgroundFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLoginBackgroundFile}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="default"
                        className="shrink-0 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={compressingLoginBg}
                        onClick={() => loginBackgroundFileRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        {compressingLoginBg ? "جاري المعالجة والضغط..." : "رفع صورة مخصصة"}
                      </Button>
                      {form.loginBackgroundImageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleRemoveLoginBackground}
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف الغلاف
                        </Button>
                      )}
                      <Input
                        id="loginBackgroundImageUrl"
                        dir="ltr"
                        className="text-xs"
                        value={form.loginBackgroundImageUrl?.startsWith("data:") ? "صورة مخصصة مضغوطة من جهازك" : (form.loginBackgroundImageUrl ?? "")}
                        onChange={set("loginBackgroundImageUrl")}
                        placeholder="أو ضع رابط صورة مباشرة https://..."
                      />
                    </div>
                    {form.loginBackgroundImageUrl?.startsWith("data:") && (
                      <p className="text-xs text-accent font-medium">✓ تم ضغط صورتك وتحويلها إلى WebP خفيف للغاية وجاهز للحفظ الدائم.</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      يدعم كافة الصور حتى 25 ميجابايت مع ضغط تكيفي تلقائي لضمان خفة وسرعة صفحة الدخول وعدم ثقلها إطلاقاً.
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>لون الطبقة</Label>
                        <p className="mt-1 text-xs text-muted-foreground">لون موحّد يرفع التباين ويحمي قابلية القراءة.</p>
                      </div>
                      <div className="flex items-center gap-2" dir="ltr">
                        <input
                          aria-label="اختيار لون طبقة صفحة تسجيل الدخول"
                          type="color"
                          value={/^#[0-9a-f]{6}$/i.test(loginOverlayColor) ? loginOverlayColor : "#10202D"}
                          onChange={(event) => {
                            markLoginFormDirty();
                            setForm((prev) => ({ ...prev, loginOverlayColor: event.target.value }));
                          }}
                          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
                        />
                        <Input
                          aria-label="رمز لون طبقة صفحة تسجيل الدخول"
                          dir="ltr"
                          value={loginOverlayColor}
                          onChange={(event) => {
                            markLoginFormDirty();
                            setForm((prev) => ({ ...prev, loginOverlayColor: event.target.value }));
                          }}
                          className="w-28 text-center font-mono text-xs"
                          placeholder="#10202D"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>شفافية الطبقة الأساسية</Label>
                        <span className="min-w-14 rounded-md bg-muted px-2 py-1 text-center text-sm font-semibold" dir="ltr">{loginOverlayOpacity}%</span>
                      </div>
                      <Slider
                        dir="ltr"
                        value={[loginOverlayOpacity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                          markLoginFormDirty();
                          setForm((prev) => ({ ...prev, loginOverlayOpacity: value[0] }));
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>قوة التدرّج السفلي</Label>
                        <span className="min-w-14 rounded-md bg-muted px-2 py-1 text-center text-sm font-semibold" dir="ltr">{loginGradientOpacity}%</span>
                      </div>
                      <Slider
                        dir="ltr"
                        value={[loginGradientOpacity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                          markLoginFormDirty();
                          setForm((prev) => ({ ...prev, loginGradientOpacity: value[0] }));
                        }}
                      />
                    </div>

                    {/* Card Customization: Opacity & Glass Blur */}
                    <div className="space-y-4 border-t border-border/70 pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Palette className="h-4 w-4 text-accent" />
                          تخصيص صندوق تسجيل الدخول (الشفافية وتأثير الزجاج)
                        </Label>
                        <span className="text-xs text-muted-foreground">تحكم دقيق في المظهر</span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label>شفافية صندوق تسجيل الدخول</Label>
                            <p className="mt-0.5 text-xs text-muted-foreground">تعتيم الصندوق لضمان أعلى تباين وقراءة واضحة للنصوص</p>
                          </div>
                          <span className="min-w-14 rounded-md bg-muted px-2 py-1 text-center text-sm font-semibold" dir="ltr">{loginCardOpacity}%</span>
                        </div>
                        <Slider
                          dir="ltr"
                          value={[loginCardOpacity]}
                          min={10}
                          max={100}
                          step={1}
                          onValueChange={(value) => {
                            markLoginFormDirty();
                            setForm((prev) => ({ ...prev, loginCardOpacity: value[0] }));
                          }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label>درجة تمويه وضبابية الزجاج (Glass Blur)</Label>
                            <p className="mt-0.5 text-xs text-muted-foreground">تأثير الزجاج الفاخر العاكس لتفاصيل الخلفية خلف الصندوق</p>
                          </div>
                          <span className="min-w-14 rounded-md bg-muted px-2 py-1 text-center text-sm font-semibold" dir="ltr">{loginCardBlur}px</span>
                        </div>
                        <Slider
                          dir="ltr"
                          value={[loginCardBlur]}
                          min={0}
                          max={40}
                          step={1}
                          onValueChange={(value) => {
                            markLoginFormDirty();
                            setForm((prev) => ({ ...prev, loginCardBlur: value[0] }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <Label>معاينة مباشرة لشاشة تسجيل الدخول</Label>
                      <span className="text-xs text-muted-foreground">لا يتم الحفظ حتى تضغط زر الحفظ</span>
                    </div>
                    <div
                      className="relative min-h-[220px] overflow-hidden rounded-xl border border-border bg-[#10202d] bg-cover bg-center flex items-center justify-center p-4 sm:p-6"
                      style={{ backgroundImage: form.loginBackgroundImageUrl ? `url("${form.loginBackgroundImageUrl}")` : undefined }}
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: colorToRgba(loginOverlayColor, loginOverlayOpacity) }} />
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colorToRgba(loginOverlayColor, loginGradientOpacity)} 0%, ${colorToRgba(loginOverlayColor, 14)} 52%, transparent 100%)` }} />
                      
                      {/* Mini Live Preview of the Horizontal Login Box */}
                      <div
                        className="relative z-10 w-full max-w-[440px] rounded-2xl border border-[#C7B6A6]/35 p-3 sm:p-4 shadow-2xl transition-all duration-200"
                        style={{
                          background: `linear-gradient(145deg, rgba(16, 32, 45, ${loginCardOpacity / 100}), rgba(9, 18, 26, ${Math.min(1, (loginCardOpacity + 6) / 100)}))`,
                          backdropFilter: `blur(${loginCardBlur}px) saturate(140%)`,
                          WebkitBackdropFilter: `blur(${loginCardBlur}px) saturate(140%)`,
                        }}
                      >
                        <div className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-5 border-l border-[#C7B6A6]/25 pl-2.5 text-right">
                            <div className="text-xs font-black text-white">العمودي</div>
                            <div className="text-[7.5px] text-[#DDD1C4] font-semibold border-t border-[#C7B6A6]/30 mt-0.5 pt-0.5">للتسويق العقاري</div>
                            <div className="text-[8.5px] text-white/75 mt-1 font-bold">مرحبًا بعودتك</div>
                            <div className="text-[7px] text-white/45 mt-0.5">لوحة التحكم</div>
                          </div>
                          <div className="col-span-7 space-y-1.5 text-right">
                            <div className="h-5 rounded-md bg-black/40 border border-[#C7B6A6]/20 px-1.5 flex items-center text-[7.5px] text-white/50" dir="ltr">
                              admin
                            </div>
                            <div className="h-5 rounded-md bg-black/40 border border-[#C7B6A6]/20 px-1.5 flex items-center text-[7.5px] text-white/50" dir="ltr">
                              ••••••••
                            </div>
                            <div className="h-5 rounded-md bg-[#A9927D] flex items-center justify-center text-[8px] font-bold text-[#10202D]">
                              تسجيل الدخول
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "جاري الحفظ..." : "حفظ إعدادات تسجيل الدخول"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* ── Home Ambient Backgrounds & Themes ── */}
          <TabsContent value="appearance" className="mt-6">
            <Tabs defaultValue="backgrounds" className="w-full space-y-6">
              {/* Sub Tabs: الخلفيات & الثيمات */}
              <div className="flex items-center justify-between gap-3 p-2 bg-card/95 border border-border/80 rounded-2xl shadow-xs">
                <TabsList className="grid grid-cols-2 gap-2 w-full sm:w-80 h-auto p-1 bg-muted/60 rounded-xl">
                  <TabsTrigger
                    value="backgrounds"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground"
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <span>الخلفيات</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="themes"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-transparent transition-all data-[state=active]:bg-[#10202D] data-[state=active]:text-[#A9927D] data-[state=active]:border-[#A9927D]/50 data-[state=active]:shadow-md dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground"
                  >
                    <Palette className="h-4 w-4 shrink-0" />
                    <span>الثيمات</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: الخلفيات */}
              <TabsContent value="backgrounds" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                <HomeBackgroundManager
                  form={form}
                  setForm={setForm}
                  onSave={handleSave}
                  saving={saving}
                />
              </TabsContent>

              {/* Tab 2: الثيمات */}
              <TabsContent value="themes" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                <ThemeAppearanceManager
                  form={form}
                  setForm={setForm}
                  onSave={handleSave}
                  saving={saving}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ── TikTok Videos ── */}
          <TabsContent value="tiktok" className="mt-6">
            <div className="space-y-5">
              {/* Master TikTok Toggle Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-card to-background border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <TikTokIcon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">ظهور بوكس تيك توك في الصفحة الرئيسية</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(form.tiktokSectionEnabled ?? true) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                        {(form.tiktokSectionEnabled ?? true) ? "ظاهر بالموقع" : "مخفي تماماً"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      التحكم الرئيسي المباشر في تفعيل أو تعطيل ظهور بوكس فيديوهات وحساب تيك توك بالكامل في الصفحة الرئيسية.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <Switch
                    checked={form.tiktokSectionEnabled ?? true}
                    onCheckedChange={handleToggleTiktokSection}
                    id="master-tiktok-switch"
                  />
                  <Label htmlFor="master-tiktok-switch" className="text-xs font-bold cursor-pointer">
                    {(form.tiktokSectionEnabled ?? true) ? "مفعّل" : "معطّل"}
                  </Label>
                </div>
              </div>

              {/* Account info */}
              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TikTokIcon className="h-4 w-4 text-accent" />
                    بيانات حساب تيك توك
                  </CardTitle>
                  <CardDescription>
                    الصورة والاسم يظهران في أعلى قسم تيك توك بالصفحة الرئيسية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>صورة الحساب</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center text-accent">
                        {form.tiktokAvatar ? (
                          <img
                            src={form.tiktokAvatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <TikTokIcon className="h-6 w-6" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={avatarRef}
                        onChange={handleAvatarFile}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => avatarRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        رفع صورة
                      </Button>
                      {form.tiktokAvatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-destructive"
                          onClick={() =>
                            setForm((p) => ({ ...p, tiktokAvatar: "" }))
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم الحساب</Label>
                    <Input
                      value={form.tiktokName}
                      onChange={set("tiktokName")}
                      placeholder="العمودي للتسويق العقاري"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رابط حساب تيك توك</Label>
                    <Input
                      dir="ltr"
                      className="text-right text-xs"
                      value={form.tiktok}
                      onChange={set("tiktok")}
                      placeholder="https://tiktok.com/@..."
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button
                    onClick={handleSaveAccount}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    حفظ بيانات الحساب
                  </Button>
                </CardFooter>
              </Card>

              {/* Add new video */}
              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-accent" />
                    إضافة فيديو جديد
                  </CardTitle>
                  <CardDescription>
                    أضف حتى 6 فيديوهات تظهر في الصفحة الرئيسية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>عنوان الفيديو *</Label>
                    <Input
                      value={newVideo.title}
                      onChange={(e) =>
                        setNewVideo((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="مثال: جولة في مشروع مدينتي"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رابط الفيديو *</Label>
                    <Input
                      dir="ltr"
                      className="text-xs"
                      value={newVideo.videoUrl}
                      onChange={(e) =>
                        setNewVideo((p) => ({ ...p, videoUrl: e.target.value }))
                      }
                      placeholder="https://tiktok.com/@..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>صورة مصغرة (اختياري)</Label>
                    <div className="flex gap-3 items-start">
                      {newVideo.thumbnail && (
                        <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={newVideo.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNewVideo((p) => ({ ...p, thumbnail: "" }))
                            }
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive rounded-full text-white flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                          thumbRefs.current["new"] = el;
                        }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f)
                            handleThumbFile(f, (b64) =>
                              setNewVideo((p) => ({ ...p, thumbnail: b64 })),
                            );
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => thumbRefs.current["new"]?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        رفع صورة
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button
                    onClick={handleAddVideo}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة الفيديو
                  </Button>
                </CardFooter>
              </Card>

              {/* Existing videos */}
              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-accent" />
                    الفيديوهات الحالية ({(settings.tiktokVideos ?? []).length}
                    /6)
                  </CardTitle>
                  <CardDescription>
                    تظهر الفيديوهات في الصفحة الرئيسية
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(settings.tiktokVideos ?? []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Play className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">لا توجد فيديوهات مضافة</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(settings.tiktokVideos ?? []).map((video, idx) => (
                        <div
                          key={video.id}
                          className="border border-border rounded-xl p-4"
                        >
                          {editingVideoId === video.id ? (
                            <div className="space-y-3">
                              <Input
                                value={editVideo.title}
                                onChange={(e) =>
                                  setEditVideo((p) => ({
                                    ...p,
                                    title: e.target.value,
                                  }))
                                }
                                placeholder="عنوان الفيديو"
                              />
                              <Input
                                dir="ltr"
                                className="text-xs"
                                value={editVideo.videoUrl}
                                onChange={(e) =>
                                  setEditVideo((p) => ({
                                    ...p,
                                    videoUrl: e.target.value,
                                  }))
                                }
                                placeholder="رابط الفيديو"
                              />
                              <div className="flex gap-3 items-center">
                                {editVideo.thumbnail && (
                                  <div className="relative w-16 h-11 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                    <img
                                      src={editVideo.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditVideo((p) => ({
                                          ...p,
                                          thumbnail: "",
                                        }))
                                      }
                                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive rounded-full text-white flex items-center justify-center"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={(el) => {
                                    thumbRefs.current[video.id] = el;
                                  }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f)
                                      handleThumbFile(f, (b64) =>
                                        setEditVideo((p) => ({
                                          ...p,
                                          thumbnail: b64,
                                        })),
                                      );
                                    e.target.value = "";
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-xs"
                                  onClick={() =>
                                    thumbRefs.current[video.id]?.click()
                                  }
                                >
                                  <Upload className="h-3 w-3" />
                                  صورة
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                  حفظ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingVideoId(null)}
                                >
                                  إلغاء
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-11 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {video.thumbnail ? (
                                  <img
                                    src={video.thumbnail}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play className="h-4 w-4 text-muted-foreground/50" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {video.title}
                                </p>
                                <a
                                  href={video.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-accent hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  فتح الرابط
                                </a>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  onClick={() => {
                                    setEditingVideoId(video.id);
                                    setEditVideo({
                                      title: video.title,
                                      thumbnail: video.thumbnail,
                                      videoUrl: video.videoUrl,
                                    });
                                  }}
                                >
                                  تعديل
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs h-7 px-2"
                                  onClick={() => {
                                    deleteTiktokVideo(video.id);
                                    toast({ title: "تم حذف الفيديو" });
                                  }}
                                >
                                  حذف
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── System ── */}
          <TabsContent value="system" className="mt-6">
            <div className="space-y-4">
              {/* ── Appearance / Theme Mode ── */}
              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle>المظهر</CardTitle>
                  <CardDescription>تحكم في وضع الإضاءة للمنصة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        value: "light",
                        label: "فاتح دائماً",
                        icon: <Sun className="h-5 w-5" />,
                      },
                      {
                        value: "dark",
                        label: "داكن دائماً",
                        icon: <Moon className="h-5 w-5" />,
                      },
                      {
                        value: "user",
                        label: "يتحكم المستخدم",
                        icon: <SunMoon className="h-5 w-5" />,
                      },
                    ].map((opt) => {
                      const active = (form.themeMode ?? "user") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setForm((p) => ({
                              ...p,
                              themeMode: opt.value as "light" | "dark" | "user",
                            }));
                            updateSettings({
                              themeMode: opt.value as "light" | "dark" | "user",
                            });
                          }}
                          className={`flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all duration-200 text-sm font-medium ${
                            active
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                          }`}
                        >
                          {opt.icon}
                          <span className="text-center leading-tight">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {(form.themeMode ?? "user") === "user"
                      ? "يظهر زر تبديل الوضع في شريط التنقل لكل زائر"
                      : "يُطبّق الوضع المختار على جميع الزوار ويُخفى زر التبديل"}
                  </p>
                </CardContent>
              </Card>

              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle>الإشعارات</CardTitle>
                  <CardDescription>التحكم في التنبيهات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    {
                      label: "إشعارات العقارات الجديدة",
                      desc: "تنبيه عند إضافة عقار جديد",
                      defaultOn: true,
                    },
                    {
                      label: "طلبات التواصل",
                      desc: "تنبيه عند تلقي طلب تواصل من عميل",
                      defaultOn: true,
                    },
                    {
                      label: "تحديثات النظام",
                      desc: "إشعارات حول تحديثات المنصة",
                      defaultOn: false,
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <Switch defaultChecked={item.defaultOn} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle>الأمان</CardTitle>
                  <CardDescription>سياسات حماية الحسابات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        فرض المصادقة الثنائية (2FA)
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        لجميع حسابات مدراء النظام
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2 pt-3 border-t">
                    <Label htmlFor="passLength" className="text-sm">
                      الحد الأدنى لطول كلمة المرور
                    </Label>
                    <Input
                      id="passLength"
                      type="number"
                      defaultValue="8"
                      className="w-24 text-center"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-luxury">
                <CardHeader>
                  <CardTitle>تحميل صور العقارات</CardTitle>
                  <CardDescription>
                    تحكم في ظهور أزرار تحميل الصور داخل تفاصيل العقار. لا يؤثر هذا القسم على الفيديوهات أو روابط الفيديو الحالية.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">السماح للعملاء والزوار</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        يسمح للزائر أو حساب العميل بتحميل صورة منفردة أو كل صور العقار.
                      </p>
                    </div>
                    <Switch
                      checked={form.allowCustomerImageDownloads ?? true}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          allowCustomerImageDownloads: checked,
                        }))
                      }
                      aria-label="السماح للعملاء والزوار بتحميل الصور"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t pt-5">
                    <div>
                      <p className="text-sm font-medium">السماح للموظفين</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        يسمح للمديرين والموظفين المسجلين بتحميل صور العقارات.
                      </p>
                    </div>
                    <Switch
                      checked={form.allowStaffImageDownloads ?? true}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          allowStaffImageDownloads: checked,
                        }))
                      }
                      aria-label="السماح للموظفين بتحميل الصور"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "جاري الحفظ..." : "حفظ إعدادات التحميل"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="carousel" className="mt-6">
            <Card className="card-luxury">
              <CardHeader>
                <CardTitle>إعدادات الكاروسيل</CardTitle>
                <CardDescription>
                  تحكم منفصل في وقت الانتظار بين البطاقات وسرعة انزلاق البطاقة.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Label htmlFor="carouselAutoPlayDelay">
                        زمن الانتظار بين البطاقات
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        عدد الثواني التي تبقى فيها البطاقة ظاهرة قبل بدء الانتقال إلى البطاقة التالية.
                      </p>
                    </div>
                    <div className="flex items-center gap-2" dir="ltr">
                      <Input
                        id="carouselAutoPlayDelay"
                        type="number"
                        min="1"
                        max="30"
                        step="0.5"
                        value={Math.min(30, Math.max(1, Number(form.carouselAutoPlayDelay ?? 3.5)))}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (Number.isFinite(value)) {
                            setForm((prev) => ({
                              ...prev,
                              carouselAutoPlayDelay: Math.min(30, Math.max(1, value)),
                            }));
                          }
                        }}
                        className="w-24 text-center"
                        aria-label="زمن الانتظار بين البطاقات بالثواني"
                      />
                      <span className="text-sm text-muted-foreground">ثانية</span>
                    </div>
                  </div>
                  <Slider
                    dir="ltr"
                    value={[Math.min(30, Math.max(1, Number(form.carouselAutoPlayDelay ?? 3.5)))]}
                    min={1}
                    max={30}
                    step={0.5}
                    onValueChange={([value]) =>
                      setForm((prev) => ({ ...prev, carouselAutoPlayDelay: value }))
                    }
                    aria-label="زمن الانتظار بين البطاقات"
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground" dir="ltr">
                    <span>1 ثانية</span>
                    <span>10 ثوانٍ</span>
                    <span>30 ثانية</span>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Label htmlFor="carouselMotionSpeed">سرعة انزلاق البطاقة</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        سرعة الحركة من اليمين إلى اليسار أثناء الانتقال، وليست زمن الانتظار قبل الانتقال.
                      </p>
                    </div>
                    <div className="flex items-center gap-2" dir="ltr">
                      <Input
                        id="carouselMotionSpeed"
                        type="number"
                        min="0.25"
                        max="4"
                        step="0.05"
                        value={Math.min(4, Math.max(0.25, Number(form.carouselMotionSpeed ?? 1)))}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (Number.isFinite(value)) {
                            setForm((prev) => ({
                              ...prev,
                              carouselMotionSpeed: Math.min(4, Math.max(0.25, value)),
                            }));
                          }
                        }}
                        className="w-24 text-center"
                        aria-label="معامل سرعة حركة الكاروسيل"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                  </div>
                  <Slider
                    dir="ltr"
                    value={[Math.min(4, Math.max(0.25, Number(form.carouselMotionSpeed ?? 1)))]}
                    min={0.25}
                    max={4}
                    step={0.05}
                    onValueChange={([value]) =>
                      setForm((prev) => ({ ...prev, carouselMotionSpeed: value }))
                    }
                    aria-label="سرعة حركة البطاقات"
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground" dir="ltr">
                    <span>0.25x أبطأ</span>
                    <span>1x طبيعية</span>
                    <span>4x أسرع</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    قيمة 1x هي السرعة الطبيعية. القيمة 0.25x تجعل الانزلاق أبطأ، والقيمة 4x تجعله أسرع أربع مرات.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ إعدادات الكاروسيل"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
