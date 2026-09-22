import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Save, UploadCloud, X, Star, Link as LinkIcon, Plus, Phone, Mail, Camera, Play, Wand2, Sparkles, CheckCircle2, MessageSquare, Handshake, Bot, RefreshCw, ShieldCheck, ShieldAlert, Bell, Folder, AlertCircle } from "lucide-react";
import { useParams, useLocation, Link } from "wouter";
import { useData, PropertyCategory, PropertyStatus } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { cn, formatNumber, toNumericString } from "@/lib/utils";
import { SEED_SOURCES } from "@/data/seedSources";
import { parsePropertyText } from "@/lib/aiPropertyParser";
import { parsePropertyWithGemini } from "@/lib/geminiApi";
import { supabase } from "@/lib/supabaseClient";
import { rowToProperty } from "@/lib/supabaseService";

import { useAuth } from "@/context/AuthContext";
import { checkUserPermission } from "@/lib/permissions";

import { FINISHING_OPTIONS as finishingOptions } from "@/lib/finishingOptions";
import { compressMultipleImages } from "@/lib/imageOptimizer";
import {
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  getPropertyCloudinaryFolder,
  getThumbnailImageUrl,
} from "@/lib/cloudinaryService";

export default function PropertyForm() {
  const { regions, propertyTypes, users, addProperty, updateProperty, properties, brokers } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const existing = isEdit
    ? properties.find(
        p =>
          p.id === params.id ||
          p.code === params.id ||
          (p.code && params.id && p.code.toLowerCase() === params.id.toLowerCase()) ||
          (p.id && params.id && p.id.toLowerCase() === params.id.toLowerCase())
      )
    : undefined;
  const [aiText, setAiText] = useState("");
  const [aiParsedSummary, setAiParsedSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const canAddProperty = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-إضافة عقار");
  const canEditProperty = isAdmin || checkUserPermission(currentUser, "إدارة العقارات-تعديل عقار");
  const isAuthorized = isEdit ? canEditProperty : canAddProperty;

  const apiKey = typeof window !== "undefined" ? localStorage.getItem("alm_ai_api_key") || "" : "";
  const aiModel = typeof window !== "undefined" ? localStorage.getItem("alm_ai_default_model") || "gemini-1.5-pro" : "gemini-1.5-pro";
  const isAiAgentActive = (() => {
    if (!apiKey.trim()) return false;
    try {
      const saved = localStorage.getItem("alm_ai_agents");
      if (!saved) return true;
      const parsedAgents = JSON.parse(saved);
      const ing = parsedAgents.find((a: any) => a.id === "ingestion-agent");
      return ing ? ing.active !== false : true;
    } catch {
      return true;
    }
  })();

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {isEdit
              ? "ليس لديك صلاحية تعديل بيانات العقارات."
              : "ليس لديك صلاحية إضافة عقارات جديدة."}
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin/properties">العودة لقائمة العقارات</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const [directProperty, setDirectProperty] = useState<any>(null);
  const activeProperty = existing || directProperty;
  const isDirtyRef = useRef(false);

  // Direct fallback to Supabase if editing and property is not in memory
  useEffect(() => {
    const idToFetch = params.id?.trim();
    if (!isEdit || !idToFetch || existing || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        let res = await supabase.from("properties").select("*").eq("id", idToFetch).maybeSingle();
        if (!res.data) {
          res = await supabase.from("properties").select("*").ilike("code", idToFetch).maybeSingle();
        }
        if (!cancelled && res.data) {
          setDirectProperty(rowToProperty(res.data));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isEdit, params.id, existing]);

  const [notifySubscribers, setNotifySubscribers] = useState(!isEdit);
  const [form, setForm] = useState({
    code: activeProperty?.code ?? "",
    description: activeProperty?.description ?? "",
    price: activeProperty?.price ?? 0,
    area: activeProperty?.area ?? 0,
    beds: activeProperty?.beds ?? 0,
    baths: activeProperty?.baths ?? 0,
    floors: activeProperty?.floors ?? 0,
    floor: activeProperty?.floor !== undefined && activeProperty?.floor !== null && activeProperty?.floor !== "__NONE__" && activeProperty?.floor !== -1 ? String(activeProperty.floor) : "",
    finishing: activeProperty?.finishing ?? "",
    view: activeProperty?.view ?? "",
    typeId: activeProperty?.typeId ?? "",
    regionId: activeProperty?.regionId ?? "",
    category: (activeProperty?.category ?? "residential") as PropertyCategory,
    listingType: (activeProperty?.listingType ?? "sale") as "sale" | "rent" | "furnished",
    status: activeProperty?.status ?? "active" as PropertyStatus,
    featured: activeProperty?.featured ?? false,
    agentType: (activeProperty?.agentType ?? "unspecified") as "direct" | "broker" | "unspecified",
    videoUrl: activeProperty?.videoUrl ?? "",
    externalUrl: activeProperty?.externalUrl ?? "",
    mapsUrl: activeProperty?.mapsUrl ?? "",
    unitType: activeProperty?.unitType ?? "",
    subArea: activeProperty?.subArea ?? "",
    layout: activeProperty?.layout ?? "",
    master: activeProperty?.master ?? "",
    elevator: activeProperty?.elevator ?? "",
    parking: activeProperty?.parking ?? "",
    additionalFeatures: activeProperty?.additionalFeatures ?? "",
    floorText: activeProperty?.floorText ?? "",
    location: activeProperty?.location ?? "",
    source: activeProperty?.source ?? (activeProperty?.code ? SEED_SOURCES[activeProperty.code] ?? "" : ""),
    sourcePhones: activeProperty?.sourcePhones ?? [""],
    sourceEmail: activeProperty?.sourceEmail ?? "",
    sourceLocation: activeProperty?.sourceLocation ?? "",
    sourceNotes: activeProperty?.sourceNotes ?? "",
    assignedStaffId: activeProperty?.assignedStaffId ?? "",
    brokerId: activeProperty?.brokerId ?? "",
    coverPriority: activeProperty?.coverPriority ?? "image",
  });
  const [images, setImages] = useState<string[]>(activeProperty?.images ?? []);

  // Sync activeProperty to form if user hasn't made changes yet
  const lastSyncedKeyRef = useRef("");
  useEffect(() => {
    if (!isEdit || !activeProperty) return;
    const key = `${activeProperty.id}_${activeProperty.updatedAt || activeProperty.createdAt || ""}_${activeProperty.status}_${activeProperty.featured}`;
    if (lastSyncedKeyRef.current === key) return;
    if (!isDirtyRef.current) {
      lastSyncedKeyRef.current = key;
      setForm({
        code: activeProperty.code ?? "",
        description: activeProperty.description ?? "",
        price: activeProperty.price ?? 0,
        area: activeProperty.area ?? 0,
        beds: activeProperty.beds ?? 0,
        baths: activeProperty.baths ?? 0,
        floors: activeProperty.floors ?? 0,
        floor: activeProperty.floor !== undefined && activeProperty.floor !== null && activeProperty.floor !== "__NONE__" && activeProperty.floor !== -1 ? String(activeProperty.floor) : "",
        finishing: activeProperty.finishing ?? "",
        view: activeProperty.view ?? "",
        typeId: activeProperty.typeId ?? "",
        regionId: activeProperty.regionId ?? "",
        category: (activeProperty.category ?? "residential") as PropertyCategory,
        listingType: (activeProperty.listingType ?? "sale") as "sale" | "rent" | "furnished",
        status: activeProperty.status ?? "active" as PropertyStatus,
        featured: activeProperty.featured ?? false,
        agentType: (activeProperty.agentType ?? "unspecified") as "direct" | "broker" | "unspecified",
        videoUrl: activeProperty.videoUrl ?? "",
        externalUrl: activeProperty.externalUrl ?? "",
        mapsUrl: activeProperty.mapsUrl ?? "",
        unitType: activeProperty.unitType ?? "",
        subArea: activeProperty.subArea ?? "",
        layout: activeProperty.layout ?? "",
        master: activeProperty.master ?? "",
        elevator: activeProperty.elevator ?? "",
        parking: activeProperty.parking ?? "",
        additionalFeatures: activeProperty.additionalFeatures ?? "",
        floorText: activeProperty.floorText ?? "",
        location: activeProperty.location ?? "",
        source: activeProperty.source ?? (activeProperty.code ? SEED_SOURCES[activeProperty.code] ?? "" : ""),
        sourcePhones: activeProperty.sourcePhones ?? [""],
        sourceEmail: activeProperty.sourceEmail ?? "",
        sourceLocation: activeProperty.sourceLocation ?? "",
        sourceNotes: activeProperty.sourceNotes ?? "",
        assignedStaffId: activeProperty.assignedStaffId ?? "",
        brokerId: activeProperty.brokerId ?? "",
        coverPriority: activeProperty.coverPriority ?? "image",
      });
      setImages(activeProperty.images ?? []);
    }
  }, [isEdit, activeProperty]);

  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentForm = formRef.current;
    const currentRegion = (currentForm.regionId || "").trim();
    const currentCode = (currentForm.code || "").trim();

    if (!currentRegion || !currentCode) {
      toast({
        title: "تنبيه: يُرجى اختيار المنطقة وكود العقار أولاً",
        description: "لتوجيه الصور وحفظها تلقائياً داخل المجلد الخاص بها في كلاوديناري",
        variant: "destructive",
      });
      return;
    }

    const remainingSlots = 20 - images.length;
    if (remainingSlots <= 0) {
      toast({ title: "تم الوصول للحد الأقصى للصور (20 صورة)", variant: "destructive" });
      return;
    }
    setCompressing(true);
    try {
      const optimized = await compressMultipleImages(files, remainingSlots);
      if (optimized.length > 0) {
        toast({ title: `جاري رفع ${optimized.length} صورة إلى السحابة السريعة...` });
        const folder = getPropertyCloudinaryFolder(currentRegion, currentCode);
        const uploaded = await uploadMultipleToCloudinary(optimized, folder);
        setImages(prev => [...prev, ...uploaded]);
        toast({ title: `تم رفع ${uploaded.length} صورة بنجاح إلى مجلد (${currentCode}) في السحابة ✓` });
      }
    } catch (err) {
      toast({ title: "تعذر معالجة بعض الصور", variant: "destructive" });
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [images.length, toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!compressing) {
      const currentForm = formRef.current;
      if (!currentForm.regionId || !currentForm.code?.trim()) {
        toast({
          title: "تنبيه: يُرجى اختيار المنطقة وكود العقار أولاً",
          description: "لتوجيه الصور وحفظها تلقائياً داخل المجلد الخاص بها في كلاوديناري",
          variant: "destructive",
        });
        return;
      }
      handleFiles(e.dataTransfer.files);
    }
  };

  // Smart code tracker: strictly tracks S (Sale), R (Rent), and F (Furnished)
  const codeStats = useMemo(() => {
    const prefixMap: Record<string, number> = { S: 0, R: 0, F: 0 };

    properties.forEach(p => {
      if (!p.code) return;
      const clean = p.code.trim().toUpperCase();
      // Match exact standard prefixes S, R, or F followed strictly by digits (e.g. S81, R100, F50)
      const match = clean.match(/^([SRF])(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        if (!isNaN(num)) {
          prefixMap[prefix] = Math.max(prefixMap[prefix] || 0, num);
        }
      }
    });

    const standardPrefixes = [
      { key: "S", label: "للبيع (S)" },
      { key: "R", label: "للإيجار (R)" },
      { key: "F", label: "مفروش (F)" },
    ];

    return standardPrefixes.map(std => {
      const max = prefixMap[std.key] || 0;
      return {
        prefix: std.key,
        label: std.label,
        lastCode: max > 0 ? `${std.key}${max}` : "لا يوجد",
        nextCode: `${std.key}${max + 1}`,
      };
    });
  }, [properties]);

  // Check if typed code already exists on another property
  const duplicateProperty = useMemo(() => {
    const clean = form.code.trim().toUpperCase();
    if (!clean) return null;
    return properties.find(p => {
      if (isEdit && (p.id === existing?.id || p.id === params.id || (p.code && p.code.toLowerCase() === params.id?.toLowerCase()))) {
        return false;
      }
      return p.code?.trim().toUpperCase() === clean;
    });
  }, [form.code, properties, isEdit, existing, params.id]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.typeId || !form.regionId) {
      toast({ title: "يرجى ملء الحقول المطلوبة (الكود، النوع، المنطقة)", variant: "destructive" });
      return;
    }
    if (duplicateProperty) {
      toast({
        title: `كود العقار (${form.code.trim().toUpperCase()}) مستخدم مسبقاً!`,
        description: "يرجى اختيار كود فريد وغير مكرر لحفظ العقار.",
        variant: "destructive",
      });
      return;
    }
    if (saving) return;
    setSaving(true);
    const numericValue = (value: unknown) => {
      const parsed = Number(toNumericString(value));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const payload = {
      ...form,
      sourcePhones: form.sourcePhones.filter((ph: string) => ph && ph.trim()),
      title: form.code.trim(),
      price: numericValue(form.price),
      area: numericValue(form.area),
      beds: numericValue(form.beds),
      baths: numericValue(form.baths),
      floors: numericValue(form.floors),
      floor: typeof form.floor === "string" ? form.floor.trim() : form.floor,
      images,
    };
    try {
      // Offload any remaining base64 images to Cloudinary to keep DB lightweight
      let finalImages = [...images];
      const hasBase64 = finalImages.some(img => typeof img === "string" && img.startsWith("data:image/"));
      if (hasBase64) {
        const folder = getPropertyCloudinaryFolder(form.regionId, form.code);
        finalImages = await uploadMultipleToCloudinary(finalImages, folder);
      }
      const finalPayload = { ...payload, images: finalImages };

      const targetId = activeProperty?.id || existing?.id || params.id;
      const saved = isEdit && targetId
        ? await updateProperty(targetId, finalPayload)
        : await addProperty(finalPayload);
      if (!saved) return;

      if (!isEdit && notifySubscribers) {
        import("@/lib/pushNotificationService").then(({ broadcastPushNotification }) => {
          const typeName = propertyTypes.find(t => t.id === form.typeId)?.name || "عقار فاخر";
          const regionName = regions.find(r => r.id === form.regionId)?.name || "المنصة";
          broadcastPushNotification({
            title: `عقار جديد: ${form.code.trim()} (${typeName})`,
            body: `تم طرح وحدة جديدة في ${regionName} بسعر ${formatNumber(numericValue(form.price))} ج.م. اضغط للمعاينة الفورية.`,
            url: `/property/${form.code.trim()}`,
            tag: "new_property",
            sentBy: currentUser?.name || "إدارة العقارات",
          }).catch(() => {});
        }).catch(() => {});
      }

      toast({
        title: "تم الحفظ بنجاح",
        description: isEdit
          ? "تم تحديث بيانات العقار."
          : (notifySubscribers ? "تم إضافة العقار الجديد وبث التنبيه لجميع المشتركين." : "تم إضافة العقار الجديد بنجاح."),
      });
      setLocation("/admin/properties");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    isDirtyRef.current = true;
    setForm(p => ({ ...p, [k]: v }));
  };
  const staffUsers = users.filter(user => user.role === "admin" || user.role === "agent");
  const staffLabel = (user: typeof staffUsers[number]) => {
    return user.name || (user.username ? `@${user.username}` : user.email);
  };

  const handleAiAutoFill = async () => {
    if (!aiText.trim()) {
      toast({ title: "يرجى لصق نص الإعلان أو الرسالة أولاً", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const staffList = staffUsers.map(u => ({ id: u.id, name: staffLabel(u) }));
      const regionsList = regions.map(r => ({ id: r.id, name: r.name }));
      const typesList = propertyTypes.map(t => ({ id: t.id, name: t.name }));

      const parsed = isAiAgentActive
        ? await parsePropertyWithGemini(aiText, apiKey, aiModel, regionsList, typesList, staffList)
        : parsePropertyText(aiText);

      // Match staff specifically from parsed.assignedStaffName or assignedStaffId
      let matchedStaff = (parsed as any).assignedStaffId;
      if (!matchedStaff && (parsed as any).assignedStaffName) {
        const targetStaff = (parsed as any).assignedStaffName.trim().toLowerCase();
        const found = staffUsers.find(u => {
          const uName = (u.name || "").toLowerCase();
          return uName.includes(targetStaff) || targetStaff.includes(uName);
        });
        if (found) {
          matchedStaff = found.id;
        }
      }

      setForm(prev => ({
        ...prev,
        code: parsed.code || (!isEdit ? "ALM-" + Math.floor(1000 + Math.random() * 9000) : prev.code),
        price: parsed.price !== undefined ? parsed.price : (isEdit ? prev.price : 0),
        area: parsed.area !== undefined ? parsed.area : (isEdit ? prev.area : 0),
        beds: parsed.beds !== undefined ? parsed.beds : (isEdit ? prev.beds : 0),
        baths: parsed.baths !== undefined ? parsed.baths : (isEdit ? prev.baths : 0),
        floors: parsed.floors !== undefined ? parsed.floors : (isEdit ? prev.floors : 0),
        floor: parsed.floor !== undefined ? (typeof parsed.floor === "number" ? (parsed.floor === 0 ? "أرضي" : String(parsed.floor)) : String(parsed.floor)) : (isEdit ? String(prev.floor ?? "") : ""),
        floorText: parsed.floorText || "",
        regionId: parsed.regionId || prev.regionId,
        typeId: parsed.typeId || prev.typeId,
        category: parsed.category || "residential",
        listingType: parsed.listingType || "sale",
        finishing: parsed.finishing || "",
        master: parsed.master || "",
        view: parsed.view || "",
        layout: parsed.layout || "",
        unitType: parsed.unitType || "",
        subArea: parsed.subArea || "",
        location: parsed.location || "",
        additionalFeatures: parsed.additionalFeatures || "",
        elevator: parsed.elevator || "",
        parking: parsed.parking || "",
        agentType: parsed.agentType || "direct",
        source: parsed.source || "",
        sourcePhones: parsed.sourcePhones?.length ? parsed.sourcePhones : [""],
        assignedStaffId: matchedStaff || "",
        description: parsed.description || prev.description,
      }));

      toast({
        title: isAiAgentActive
          ? "تم التحليل والتعبئة بواسطة وكيل Gemini Pro! 🪄⚡"
          : "تم التحليل والتعبئة بواسطة المحلل المحلي! 🪄",
      });
      setAiParsedSummary(
        isAiAgentActive
          ? "تمت المعالجة عبر وكيل Gemini Pro واستخراج (الكود، السعر، المساحة، الماستر، الموظف، المميزات، التقسيمة) بنجاح."
          : "تم استخراج البيانات عبر المحلل المحلي وتعبئتها تلقائياً."
      );
    } catch (err) {
      console.error("AI parse error:", err);
      toast({ title: "حدث خطأ أثناء معالجة الذكاء الاصطناعي", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isEdit ? "تعديل عقار" : "إضافة عقار جديد"}</h1>
            <p className="text-muted-foreground mt-1 text-sm">أدخل تفاصيل العقار لنشره على المنصة</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isEdit && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-accent bg-accent/10 px-3 py-2 rounded-lg border border-accent/25 hover:bg-accent/15 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={notifySubscribers}
                  onChange={(e) => setNotifySubscribers(e.target.checked)}
                  className="rounded border-accent text-accent accent-accent cursor-pointer h-4 w-4"
                />
                <Bell className="h-3.5 w-3.5" />
                <span>إشعار فوري للمشتركين</span>
              </label>
            )}
            <Button variant="outline" asChild><Link href="/admin/properties">إلغاء</Link></Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              <Save className="ml-2 h-4 w-4" />{saving ? "جارٍ الحفظ..." : "حفظ ونشر"}
            </Button>
          </div>
        </div>

        {/* ── AI Smart Property Parser Card ── */}
        {!isEdit && (
          <Card className="border-accent/40 bg-gradient-to-br from-card via-card to-accent/5 shadow-md">
            <CardHeader className="pb-3.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-sm">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                        المحلل الذكي للإعلانات العقارية
                      </CardTitle>
                      <span className="text-[10px] bg-accent/20 text-accent font-bold px-2 py-0.5 rounded-full">Pro Hub</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      الصق أي نص عشوائي أو رسالة واتساب، وسيقوم الذكاء الاصطناعي باستخراج كافة البيانات وتعبئة الخانات فوراً.
                    </p>
                  </div>
                </div>

                {/* AI Agent Status Indicator Badge */}
                <div className="self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
                  {isAiAgentActive ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>وكيل Gemini Pro متصل ⚡</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-xl border border-border/60 shadow-sm">
                      <span>⚪ المحلل المحلي السريع</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={3}
                placeholder="الصق نص الرسالة أو الإعلان هنا..."
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                className="text-xs sm:text-sm bg-background/80 focus:border-accent"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  onClick={handleAiAutoFill}
                  disabled={aiLoading}
                  className="bg-accent text-accent-foreground font-bold hover:bg-accent/90 gap-2 h-9 px-4 rounded-xl shadow-md text-xs"
                >
                  {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {aiLoading ? "جارٍ المعالجة بالذكاء الاصطناعي..." : "تحليل وتعبئة الخانات فوراً"}
                </Button>
                {aiParsedSummary && (
                  <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {aiParsedSummary}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Basic info */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>المعلومات الأساسية</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    الحقول المميزة بـ (<span className="text-rose-500 font-bold text-xs">*</span>) إلزامية
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* ── Compact & Professional Next Code Tracker ── */}
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/35 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      <span className="text-xs font-extrabold text-foreground">الكود التالي لكل فئة</span>
                    </div>
                    <span className="text-[10px] text-accent font-semibold bg-accent/15 px-2 py-0.5 rounded-md border border-accent/20">تعبئة فورية بنقرة واحدة</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                    {codeStats.map(stat => {
                      const isNext = form.code?.trim().toUpperCase() === stat.nextCode;
                      return (
                        <div
                          key={stat.prefix}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg bg-card/95 border transition-all text-xs shadow-xs",
                            isNext
                              ? "border-accent ring-1 ring-accent/40 bg-accent/15"
                              : "border-border/70 hover:border-accent/40"
                          )}
                        >
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-foreground text-xs block">{stat.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              آخر كود: <strong className="text-foreground font-mono font-bold">{stat.lastCode}</strong>
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isNext ? "default" : "outline"}
                            className={cn(
                              "h-7 px-2 text-xs font-mono font-extrabold rounded-md gap-1 transition-all cursor-pointer",
                              isNext
                                ? "bg-accent text-accent-foreground shadow-xs hover:bg-accent/90"
                                : "border-accent/40 hover:bg-accent hover:text-accent-foreground"
                            )}
                            onClick={() => set("code", stat.nextCode)}
                            title={`استخدام الكود المقترح ${stat.nextCode}`}
                          >
                            <span>استخدام {stat.nextCode}</span>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <span>كود العقار</span>
                      <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                    </Label>
                    {form.code.trim() && !duplicateProperty && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        كود فريد ومتاح للاستخدام
                      </span>
                    )}
                  </div>
                  <Input
                    value={form.code}
                    onChange={e => set("code", e.target.value.toUpperCase())}
                    placeholder="مثال: S82 أو R101 أو F51"
                    dir="ltr"
                    className={cn(
                      "text-right font-mono font-bold tracking-wider uppercase h-10",
                      duplicateProperty && "border-destructive text-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {duplicateProperty ? (
                    <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2 animate-in fade-in-50">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>
                        تنبيه: الكود <strong>({duplicateProperty.code})</strong> مستخدم مسبقاً لعقار مسجل في المنصة! يُرجى اختيار كود آخر غير مكرر.
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">الكود التعريفي المميز للعقار (S للبيع، R للإيجار، F للمفروش)</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">وصف العقار</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                    placeholder="مثال: شقة فاخرة للبيع 180م² تشطيب ألترا سوبر لوكس، فيو مفتوح لاندسكيب بحري غير مجروحة، الدور الثالث، تتكون من 3 غرف نوم منها غرفة ماستر..."
                    className="min-h-[110px] text-xs sm:text-sm leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">اكتب وصفاً تسويقياً جذاباً ومفصلاً يبرز مميزات الوحدة وموقعها</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <span>السعر الإجمالي (EGP)</span>
                      <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={form.price ? formatNumber(form.price) : ""}
                      onChange={e => set("price", Number(toNumericString(e.target.value)) || 0)}
                      placeholder="مثال: 3,500,000"
                      className="text-right font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">السعر بالجنيه المصري (يتم تنسيق الفواصل تلقائياً)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <span>المساحة الإجمالية (م²)</span>
                      <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.area || ""}
                      onChange={e => set("area", Number(e.target.value))}
                      placeholder="مثال: 180"
                      className="font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">المساحة بالمتر المربع الصافي/الإجمالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rooms & extras */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">المرافق والمواصفات التفصيلية</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">غرف النوم</Label>
                    <Input type="number" value={form.beds || ""} onChange={e => set("beds", Number(e.target.value))} placeholder="مثال: 3" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">الحمامات</Label>
                    <Input type="number" value={form.baths || ""} onChange={e => set("baths", Number(e.target.value))} placeholder="مثال: 2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">عدد طوابق العمارة/الفيلا</Label>
                    <Input type="number" value={form.floors || ""} onChange={e => set("floors", Number(e.target.value))} placeholder="مثال: 5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">الدور</Label>
                    <Input
                      type="text"
                      value={form.floor}
                      onChange={e => set("floor", e.target.value)}
                      placeholder="مثال: 3 أو أرضي أو أخير"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">الدريسنج</Label>
                    <Input value={form.floorText} onChange={e => set("floorText", e.target.value)} placeholder="مثال: يوجد غرفة دريسنج / لا يوجد" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">التشطيب</Label>
                    <Select value={form.finishing} onValueChange={v => set("finishing", v)}>
                      <SelectTrigger><SelectValue placeholder="اختر نوع التشطيب" /></SelectTrigger>
                      <SelectContent>{finishingOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">الواجهة</Label>
                    <Input value={form.unitType} onChange={e => set("unitType", e.target.value)} placeholder="مثال: بحري / أمامي / ناصية / بانورامي" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">الفيو والإطلالة</Label>
                    <Input value={form.view} onChange={e => set("view", e.target.value)} placeholder="مثال: فيو لاندسكيب / شارع رئيسي / حديقة" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">ماستر روم</Label>
                    <Input value={form.master} onChange={e => set("master", e.target.value)} placeholder="مثال: غرفة ماستر بحمام / ماستر ودريسنج" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">أسانسير</Label>
                    <Input value={form.elevator} onChange={e => set("elevator", e.target.value)} placeholder="مثال: يوجد أسانسير / لا يوجد" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">موقف سيارة / جراج</Label>
                    <Input value={form.parking} onChange={e => set("parking", e.target.value)} placeholder="مثال: باكو جراج خاص / مكان مخصص" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">الموقع التفصيلي</Label>
                    <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="مثال: الحي الأول، المجاورة 2، الشروق" />
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-3">
                    <Label className="text-xs font-bold">المميزات الإضافية</Label>
                    <Input value={form.additionalFeatures} onChange={e => set("additionalFeatures", e.target.value)} placeholder="مثال: غاز طبيعي، عداد كهرباء قديم، حصة في الأرض، أمن وحراسة 24 ساعة، إنتركم مرئي..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold">الصور ({images.length}/20)</CardTitle>
                  {form.regionId && form.code?.trim() ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                      <Folder className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-medium">المجلد السحابي:</span>
                      <span className="font-mono font-bold dir-ltr">{getPropertyCloudinaryFolder(form.regionId, form.code)}</span>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(!form.regionId || !form.code?.trim()) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>يُرجى تحديد <strong>المدينة / المنطقة</strong> و<strong>كود العقار</strong> أولاً ليتم حفظ الصور فوراً داخل المجلد المخصص للعقار في كلاوديناري.</span>
                  </div>
                )}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden aspect-square bg-muted group">
                        <img src={getThumbnailImageUrl(img)} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && <div className="absolute bottom-0 inset-x-0 bg-accent/80 text-accent-foreground text-[9px] font-bold text-center py-0.5">رئيسية</div>}
                        <button
                          type="button"
                          aria-label="حذف الصورة"
                          onClick={() => {
                            const targetImg = images[idx];
                            if (targetImg && targetImg.includes("cloudinary.com")) {
                              void deleteFromCloudinary(targetImg);
                            }
                            setImages(p => p.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md ring-2 ring-white/70 hover:bg-destructive/90 active:scale-95 transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    compressing ? "border-accent bg-accent/10 pointer-events-none" : dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/60 hover:bg-muted/30"
                  )}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (compressing) return;
                    if (!form.regionId || !form.code?.trim()) {
                      toast({
                        title: "تنبيه: يُرجى اختيار المنطقة وكود العقار أولاً",
                        description: "لتوجيه الصور وحفظها تلقائياً داخل المجلد الخاص بها في كلاوديناري",
                        variant: "destructive",
                      });
                      return;
                    }
                    fileRef.current?.click();
                  }}
                >
                  {compressing ? (
                    <div className="py-2 space-y-2">
                      <RefreshCw className="h-8 w-8 text-accent mx-auto animate-spin" />
                      <p className="text-sm font-bold text-accent">جاري تحسين وضغط الصور بتقنية WebP الذكية...</p>
                      <p className="text-xs text-muted-foreground">يتم تقليص الحجم مع الحفاظ على أعلى درجات الجودة والوضوح</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">اسحب وأفلت الصور هنا أو انقر للاختيار</p>
                      <p className="text-xs text-muted-foreground">يتم ضغط وتحسين الصور تلقائياً (JPG, PNG, WEBP)</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                  onChange={e => handleFiles(e.target.files)} disabled={compressing} />
              </CardContent>
            </Card>

            {/* Links */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2"><LinkIcon className="h-4 w-4 text-accent" />الروابط والفيديو والموقع</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">رابط فيديو للعقار</Label>
                  <Input value={form.videoUrl} onChange={e => set("videoUrl", e.target.value)} placeholder="مثال: رابط YouTube، TikTok، Telegram، Drive..." dir="ltr" />
                  <p className="text-[11px] text-muted-foreground">يدعم جميع منصات الفيديو لعرض المعاينة للعميل</p>
                </div>

                {/* Cover Priority */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold">أولوية غلاف البطاقة</Label>
                  <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => set("coverPriority", "image")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 transition-colors ${
                        form.coverPriority === "image" || !form.coverPriority
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      الصورة أولاً
                    </button>
                    <button
                      type="button"
                      onClick={() => set("coverPriority", "video")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border-r border-border transition-colors ${
                        form.coverPriority === "video"
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Play className="h-3.5 w-3.5" />
                      الفيديو أولاً
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">اختر ما يظهر كغلاف للبطاقة عند توفّر الاثنين معاً</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">رابط خارجي للعقار</Label>
                  <Input value={form.externalUrl} onChange={e => set("externalUrl", e.target.value)} placeholder="مثال: https://alamoudi-realestate.com/..." dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">رابط الموقع على الخريطة</Label>
                  <Input value={form.mapsUrl} onChange={e => set("mapsUrl", e.target.value)} placeholder="مثال: https://maps.app.goo.gl/..." dir="ltr" />
                  <p className="text-[11px] text-muted-foreground">رابط خرائط جوجل لتسهيل الوصول للمعاينة</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Classification */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">التصنيف ونوع العرض</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <span>فئة العقار (الاستخدام)</span>
                    <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                  </Label>
                  <Select value={form.category} onValueChange={(v: PropertyCategory) => set("category", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">سكني</SelectItem>
                      <SelectItem value="administrative">إداري</SelectItem>
                      <SelectItem value="medical">طبي</SelectItem>
                      <SelectItem value="commercial">تجاري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <span>نوع العرض</span>
                    <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                  </Label>
                  <Select value={form.listingType} onValueChange={(v: "sale" | "rent" | "furnished") => set("listingType", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر نوع العرض" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">للبيع</SelectItem>
                      <SelectItem value="rent">للإيجار</SelectItem>
                      <SelectItem value="furnished">مفروش</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <span>نوع العقار</span>
                    <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                  </Label>
                  <Select value={form.typeId} onValueChange={v => set("typeId", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر النوع (شقة، فيلا...)" /></SelectTrigger>
                    <SelectContent>
                      {propertyTypes.filter(t => t.active).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <span>المدينة / المنطقة الرئيسية</span>
                    <span className="text-rose-500 font-extrabold text-sm leading-none" title="حقل إلزامي">*</span>
                  </Label>
                  <Select value={form.regionId} onValueChange={v => set("regionId", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المنطقة (الشروق، مدينتي...)" /></SelectTrigger>
                    <SelectContent>
                      {regions.filter(r => r.active).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">المنطقة الفرعية / الكمبوند</Label>
                  <Input value={form.subArea} onChange={e => set("subArea", e.target.value)} placeholder="مثال: الحي الأول، المنطقة التاسعة، سراي..." />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">حالة العقار</Label>
                  <Select value={form.status} onValueChange={(v: PropertyStatus) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="listed">معروض</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="sold">مباع</SelectItem>
                      <SelectItem value="rented">مؤجر</SelectItem>
                      <SelectItem value="reserved">محجوز</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Featured + Administrative & Source Options */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  خيارات إدارية ومصدر العقار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/70">
                  <div>
                    <Label className="text-xs font-bold">عقار مميز</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">يظهر في الصدارة وقسم العقارات المميزة</p>
                  </div>
                  <Switch
                    checked={form.featured}
                    onCheckedChange={v => set("featured", v)}
                    className="data-[state=checked]:bg-yellow-500"
                  />
                </div>

                <div className="border-t border-border/70 pt-3 space-y-2">
                  <Label className="text-xs font-bold">نوع المصدر</Label>
                  <Select value={form.agentType || "unspecified"} onValueChange={(v: "direct" | "broker" | "unspecified") => set("agentType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">- (غير محدد)</SelectItem>
                      <SelectItem value="direct">🏠 مباشر (من المالك)</SelectItem>
                      <SelectItem value="broker">🤝 بروكر (وسيط عقاري)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">يظهر للإدارة فقط — غير مرئي للزوّار</p>
                </div>

                {form.agentType === "broker" && (
                  <div className="space-y-2 p-3 rounded-xl bg-accent/10 border border-accent/30 animate-in fade-in-50">
                    <Label className="text-xs font-bold text-accent flex items-center gap-1.5">
                      <Handshake className="h-3.5 w-3.5" />
                      اختر الوسيط / البروكر المعتمد
                    </Label>
                    <Select
                      value={form.brokerId || "__none"}
                      onValueChange={v => {
                        if (v === "__none") {
                          set("brokerId", "");
                          return;
                        }
                        const b = brokers.find(x => x.id === v);
                        if (b) {
                          setForm(prev => ({
                            ...prev,
                            brokerId: b.id,
                            source: b.name,
                            sourcePhones: [b.phone, b.whatsapp || ""].filter(Boolean),
                            sourceNotes: `شركة: ${b.company || "خاص"} · عمولة: ${b.commission || "غير محددة"}`,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر من دليل الوسطاء" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">وسيط غير مسجل (إدخال يدوي)</SelectItem>
                        {brokers.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.company ? `(${b.company})` : ""} - {b.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-t border-border/70 pt-3 space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {form.agentType === "broker" ? "بيانات البروكر / الوسيط" : "بيانات المالك / المصدر"}
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">{form.agentType === "broker" ? "اسم البروكر / الشركة" : "اسم المالك"}</Label>
                    <Input value={form.source} onChange={e => set("source", e.target.value)} placeholder="مثال: م. أحمد عبد العزيز" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-accent" />
                      أرقام التواصل
                    </Label>
                    <div className="space-y-2">
                      {form.sourcePhones.map((ph: string, i: number) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            dir="ltr"
                            className="flex-1 text-right font-mono"
                            placeholder="مثال: 01012345678"
                            value={ph}
                            onChange={e => {
                              const updated = [...form.sourcePhones];
                              updated[i] = e.target.value;
                              set("sourcePhones", updated);
                            }}
                          />
                          {form.sourcePhones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => set("sourcePhones", form.sourcePhones.filter((_: string, idx: number) => idx !== i))}
                              className="w-9 h-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {form.sourcePhones.length < 5 && (
                        <button
                          type="button"
                          onClick={() => set("sourcePhones", [...form.sourcePhones, ""])}
                          className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-accent hover:border-accent transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          أضف رقم آخر
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      البريد الإلكتروني
                    </Label>
                    <Input
                      dir="ltr"
                      className="text-right font-mono"
                      type="email"
                      placeholder="example@mail.com"
                      value={form.sourceEmail}
                      onChange={e => set("sourceEmail", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      رابط موقع المصدر / خريطة
                    </Label>
                    <Input
                      dir="ltr"
                      className="text-right text-xs font-mono"
                      placeholder="https://maps.google.com/..."
                      value={form.sourceLocation}
                      onChange={e => set("sourceLocation", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">ملاحظات إدارية خاصة بالمصدر</Label>
                    <Textarea
                      rows={3}
                      placeholder="مثال: المالك متاح للاتصال بعد العصر، نسبة العمولة المتفق عليها 2.5%، المفاتيح مع الحارس..."
                      value={form.sourceNotes}
                      onChange={e => set("sourceNotes", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">الموظف المسؤول</Label>
                    <Select
                      value={form.assignedStaffId || "__unassigned"}
                      onValueChange={value => set("assignedStaffId", value === "__unassigned" ? "" : value)}
                    >
                      <SelectTrigger><SelectValue placeholder="اختر الموظف المسؤول" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned">غير محدد</SelectItem>
                        {staffUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {staffLabel(user)} · {user.role === "admin" ? "مدير النظام" : "مستشار عقاري"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">يظهر هذا الاختيار للإدارة فقط.</p>
                  </div>
                  <p className="text-xs text-muted-foreground">خاص بالإدارة — لا يظهر للزوّار</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
