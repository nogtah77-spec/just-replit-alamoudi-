import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, Send, Smartphone, Sparkles, CheckCircle2, History,
  Eye, RefreshCw, AlertCircle, ShieldAlert, ArrowUpRight, Flame,
  Radio, Layers, Clock
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showLocalNotification,
  broadcastPushNotification,
  fetchNotificationsHistory,
  PushNotificationPayload,
} from "@/lib/pushNotificationService";
import { formatNumber } from "@/lib/utils";

const NOTIF_TAGS = [
  { id: "exclusive", label: "فرصة حصرية 🔥", prefix: "فرصة حصرية: " },
  { id: "new_property", label: "عقار جديد 🏠", prefix: "عقار جديد متاح: " },
  { id: "price_drop", label: "تخفيض سعر 💰", prefix: "عرض خاص وتخفيض: " },
  { id: "announcement", label: "إعلان عام 📢", prefix: "إعلان من العمودي: " },
];

export default function PushNotifications() {
  const { properties } = useData();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("فرصة عقارية جديدة وحصرية في التجمع");
  const [body, setBody] = useState("تم طرح فيلا مستقلة بتشطيب ألترا سوبر لوكس وبسعر استثماري، اضغط للمعاينة الآن.");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("none");
  const [customUrl, setCustomUrl] = useState("/");
  const [selectedTag, setSelectedTag] = useState("exclusive");
  const [sending, setSending] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [history, setHistory] = useState<PushNotificationPayload[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (isPushSupported()) {
      setPermissionStatus(getNotificationPermission());
    }
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await fetchNotificationsHistory();
    setHistory(data);
    setLoadingHistory(false);
  };

  const handlePropertySelect = (propId: string) => {
    setSelectedPropertyId(propId);
    if (propId === "none") {
      setCustomUrl("/");
      return;
    }
    const prop = properties.find((p) => p.id === propId || p.code === propId);
    if (prop) {
      setTitle(`${prop.title || prop.code} (${prop.code})`);
      setBody(`${prop.category === "rent" ? "للإيجار" : "للبيع"} بسعر ${formatNumber(prop.price)} ج.م • اضغط لمشاهدة الصور والتفاصيل الكاملة.`);
      setCustomUrl(`/property/${prop.code || prop.id}`);
    }
  };

  const handleEnableCurrentDevice = async () => {
    const res = await requestNotificationPermission();
    setPermissionStatus(res);
    if (res === "granted") {
      toast({ title: "تم تفعيل إشعارات جهازك بنجاح ✓" });
    }
  };

  const handleSendTestLocal = async () => {
    setTestingLocal(true);
    if (permissionStatus !== "granted") {
      const res = await requestNotificationPermission();
      setPermissionStatus(res);
      if (res !== "granted") {
        setTestingLocal(false);
        toast({
          variant: "destructive",
          title: "يرجى السماح بالإشعارات في المتصفح أولاً",
          description: "اضغط على زر تفعيل إشعارات هذا الجهاز لتمكين التنبيهات.",
        });
        return;
      }
    }

    const success = await showLocalNotification({
      title,
      body,
      url: customUrl,
      tag: selectedTag,
    });
    setTestingLocal(false);

    if (success) {
      toast({ title: "تم إرسال إشعار تجريبي إلى شاشتك الآن 📲" });
    } else {
      toast({
        variant: "destructive",
        title: "تعذر إرسال الإشعار التجريبي",
        description: "تأكد من تفعيل صلاحيات التنبيهات في إعدادات نظام التشغيل.",
      });
    }
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ variant: "destructive", title: "يرجى ملء عنوان ونص الإشعار" });
      return;
    }

    setSending(true);
    const success = await broadcastPushNotification({
      title,
      body,
      url: customUrl,
      tag: selectedTag,
      sentBy: currentUser?.name || "إدارة المنصة",
    });
    setSending(false);

    if (success) {
      toast({
        title: "تم بث الإشعار الفوري بنجاح 🚀",
        description: "وصل الإشعار الآن لجميع المشتركين والأجهزة المتصلة حول العالم.",
      });
      loadHistory();
    } else {
      toast({ variant: "destructive", title: "حدث خطأ أثناء بث الإشعار" });
    }
  };

  const cleanProps = properties.filter((p) => !p.id?.startsWith("__") && !p.code?.startsWith("__"));

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12">
        <AdminPageHeader
          title="إدارة الإشعارات الفورية السحابية"
          subtitle="بث تنبيهات حصرية فورية لشاشات هواتف العملاء وأجهزة الكمبيوتر للمشتركين في المنصة"
          eyebrow="التسويق والتنبيهات المباشرة"
          icon={Bell}
        />

        {/* Permission Status Banner */}
        <div className="rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">حالة إشعارات جهازك الحالي:</h4>
                <Badge
                  className={
                    permissionStatus === "granted"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }
                >
                  {permissionStatus === "granted" ? "مفعل ومستعد لاستقبال التنبيهات ✓" : "غير مفعّل على هذا المتصفح"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permissionStatus === "granted"
                  ? "يمكنك الآن تجربة إرسال إشعارات وستظهر على شاشة جهازك مباشرة."
                  : "فعّل الإشعارات لتتمكن من معاينة الإشعارات التجريبية على جهازك قبل بثها للعملاء."}
              </p>
            </div>
          </div>

          {permissionStatus !== "granted" && (
            <Button
              size="sm"
              onClick={handleEnableCurrentDevice}
              className="bg-accent text-accent-foreground font-bold text-xs h-9 shrink-0 gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              تفعيل إشعارات هذا الجهاز
            </Button>
          )}
        </div>

        {/* Main Grid: Form + Mobile Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Side (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="card-luxury overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Send className="h-4 w-4 text-accent" />
                  إنشاء وبث إشعار جديد
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  حدد نص التنبيه والعقار المستهدف لإرساله لجميع الهواتف المشتركة
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {/* Tag Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">نوع التنبيه والتصنيف</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {NOTIF_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setSelectedTag(tag.id)}
                        className={`p-2 text-xs font-bold rounded-lg border text-center transition-all ${
                          selectedTag === tag.id
                            ? "border-accent bg-accent/15 text-accent shadow-sm"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Link to Existing Property */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ربط بعقار محدد من المنصة (اختياري)</Label>
                  <Select value={selectedPropertyId} onValueChange={handlePropertySelect}>
                    <SelectTrigger className="text-xs h-10">
                      <SelectValue placeholder="اختر عقاراً لتعبئة البيانات تلقائياً..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- بدون ربط بعقار (إشعار عام) --</SelectItem>
                      {cleanProps.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} - {p.title} ({formatNumber(p.price)} ج.م)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">عنوان الإشعار</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: فرصة حصرية في الشروق..."
                    className="text-xs h-10 font-bold"
                    maxLength={80}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>يظهر بالخط العريض في أعلى التنبيه</span>
                    <span>{title.length}/80</span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">نص الإشعار والتفاصيل</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="اكتب رسالة مشوقة ومختصرة تشجع العميل على النقر..."
                    className="text-xs min-h-[90px] leading-relaxed"
                    maxLength={160}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>يُفضل أن يكون جذاباً ومختصراً</span>
                    <span>{body.length}/160</span>
                  </div>
                </div>

                {/* Custom Target URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">رابط الوجهة عند النقر على الإشعار</Label>
                  <Input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="مثال: /property/123 أو /"
                    className="text-xs h-9 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTestLocal}
                    disabled={testingLocal || sending}
                    className="flex-1 border-accent/40 text-accent hover:bg-accent/10 h-10 text-xs font-bold gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    {testingLocal ? "جاري الإرسال للتجربة..." : "إرسال تجريبي لهاتفي أولاً 📲"}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleBroadcast}
                    disabled={sending}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-10 text-xs font-extrabold gap-2 shadow-lg shadow-accent/20"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "جاري البث لجميع المشتركين..." : "بث الإشعار لجميع المشتركين 🚀"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Notification Mockup Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="card-luxury overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  معاينة حية على شاشة الهاتف (Mobile Preview)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  الشكل الواقعي للتنبيه كما سيظهر للمستخدم في شاشة القفل والإشعارات
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 flex justify-center pb-8">
                {/* Realistic Smartphone Lockscreen Mockup */}
                <div className="w-[300px] rounded-[36px] border-4 border-slate-700 bg-slate-900 p-4 shadow-2xl relative text-white">
                  {/* Top notch */}
                  <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

                  {/* Clock on lockscreen */}
                  <div className="text-center space-y-0.5 mb-6">
                    <span className="text-3xl font-light font-mono tracking-tight text-white/90">
                      10:42
                    </span>
                    <p className="text-[10px] text-white/60">الأربعاء، 2 سبتمبر</p>
                  </div>

                  {/* Notification Card */}
                  <div className="rounded-2xl bg-slate-800/90 backdrop-blur-md border border-white/10 p-3.5 shadow-xl space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between text-[11px] text-white/70">
                      <div className="flex items-center gap-1.5">
                        <img src="/logo.png" alt="العمودي" className="h-4 w-4 rounded-full object-contain bg-black/40 p-0.5" />
                        <span className="font-bold text-white text-[11px]">العمودي للعقارات</span>
                      </div>
                      <span className="text-[10px] text-white/50">الآن</span>
                    </div>

                    <div className="space-y-1 pr-1">
                      <h5 className="font-bold text-xs text-amber-300 leading-snug">
                        {title || "عنوان الإشعار..."}
                      </h5>
                      <p className="text-[11px] text-white/80 leading-relaxed line-clamp-3">
                        {body || "نص الإشعار التجريبي..."}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-white/10 flex justify-between items-center text-[10px] text-accent">
                      <span>انقر للمعاينة الفورية ↗</span>
                      <span className="text-white/40 text-[9px] font-mono">alamoudi.com</span>
                    </div>
                  </div>

                  {/* Bottom bar indicator */}
                  <div className="w-28 h-1 bg-white/30 rounded-full mx-auto mt-10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sent History Table */}
        <Card className="card-luxury overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-accent" />
                سجل الإشعارات المرسلة
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                أحدث الإشعارات التي تم بثها من خلال المنصة
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs h-8 gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              تحديث السجل
            </Button>
          </CardHeader>

          <CardContent className="pt-4">
            {history.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                لم يتم إرسال أي إشعارات سابقة بعد. عند بث أول إشعار سيظهر هنا مباشرة.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl border border-border/40 bg-background/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                          {item.tag === "exclusive" ? "فرصة حصرية" : item.tag === "new_property" ? "عقار جديد" : "إشعار عام"}
                        </Badge>
                        <h4 className="font-bold text-xs text-foreground truncate">{item.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.body}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-[11px] font-mono">
                        <Clock className="h-3 w-3 text-accent" />
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA-u-nu-latn", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "مؤخراً"}
                      </span>
                      {item.url && (
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-accent px-2">
                          <a href={item.url} target="_blank" rel="noreferrer">
                            الرابط <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
