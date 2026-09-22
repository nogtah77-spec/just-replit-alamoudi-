import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Sparkles,
  Bot,
  ExternalLink,
  Users,
  UserCheck,
  Building2,
  Trash2,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import { parsePropertyText } from "@/lib/aiPropertyParser";
import { parsePropertyWithGemini } from "@/lib/geminiApi";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { Link } from "wouter";

interface WhatsAppMessageLog {
  id: string;
  senderPhone: string;
  senderName: string;
  channelType: "direct" | "group";
  rawText: string;
  propertyCode: string;
  price: number;
  area: number;
  region: string;
  timestamp: string;
  status: "published" | "draft" | "error";
  propertyId?: string;
  assignedStaffName: string;
}

import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";

export default function WhatsAppBot() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { addProperty, regions, propertyTypes, users } = useData();

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            إعدادات وربط واتساب الذكي مخصصة لمدير النظام فقط.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Filter staff users
  const staffUsers = users.filter(u => u.role === "admin" || u.role === "agent");

  // Connection State
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem("alm_wa_connected") === "true";
  });
  const [connectedPhone, setConnectedPhone] = useState(() => {
    return localStorage.getItem("alm_wa_phone") || "+20 100 894 7210";
  });
  const [autoPublish, setAutoPublish] = useState(() => {
    return localStorage.getItem("alm_wa_autopublish") !== "false";
  });
  const [qrCounter, setQrCounter] = useState(45);
  const [isPairing, setIsPairing] = useState(false);
  const [qrSessionToken, setQrSessionToken] = useState(() => `2@alm-session-${Date.now()}`);

  // Simulator Channel & Sender State
  const [chatChannel, setChatChannel] = useState<"group" | "direct">("group");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => staffUsers[0]?.id || "");

  // Chat Simulator State
  const [chatMessages, setChatMessages] = useState<
    {
      id: string;
      sender: "user" | "bot";
      senderName?: string;
      text: string;
      time: string;
      propertyCode?: string;
      propertyId?: string;
    }[]
  >([
    {
      id: "welcome-1",
      sender: "bot",
      text: "👋 أهلاً بكم في بوت العمودي العقاري الذكي!\nيمكن لأي موظف في الفريق إرسال إعلانات العقارات (سواء هنا في جروب الشركة أو في المحادثة المباشرة) ليقوم الذكاء الاصطناعي بإدراجها في الموقع وتعيين الموظف المسؤول تلقائياً 🚀",
      time: "10:00 ص",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isBotProcessing, setIsBotProcessing] = useState(false);

  // Ingestion Log History
  const [ingestionLogs, setIngestionLogs] = useState<WhatsAppMessageLog[]>(() => {
    try {
      const saved = localStorage.getItem("alm_wa_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // QR Refresh Timer
  useEffect(() => {
    if (isConnected) return;
    const timer = setInterval(() => {
      setQrCounter(prev => {
        if (prev <= 1) {
          setQrSessionToken(`2@alm-session-${Date.now()}`);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  // Save Settings
  const handleToggleAutoPublish = (val: boolean) => {
    setAutoPublish(val);
    localStorage.setItem("alm_wa_autopublish", String(val));
    toast({ title: val ? "تم تفعيل النشر التلقائي المباشر ✓" : "تم تحويل الوارد إلى مسودات مراجعة ✓" });
  };

  // Simulate QR Scan
  const handleSimulateScan = () => {
    setIsPairing(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsPairing(false);
      localStorage.setItem("alm_wa_connected", "true");
      localStorage.setItem("alm_wa_phone", connectedPhone);
      toast({
        title: "تم ربط الواتساب بنجاح! 🎉",
        description: `الرقم ${connectedPhone} متصل الآن بالبوت العقاري الذكي وجاهز لاستقبال إعلانات فريق العمل.`,
      });
    }, 1200);
  };

  // Disconnect
  const handleDisconnect = () => {
    setIsConnected(false);
    localStorage.setItem("alm_wa_connected", "false");
    setQrSessionToken(`2@alm-session-${Date.now()}`);
    setQrCounter(45);
    toast({ title: "تم قطع اتصال الواتساب", variant: "destructive" });
  };

  // Selected Staff Details
  const currentStaff = staffUsers.find(u => u.id === selectedStaffId) || staffUsers[0];
  const staffDisplayName = currentStaff?.name || currentStaff?.email || "موظف مسؤول";

  // Send & Process Message in WhatsApp Simulator
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isBotProcessing) return;

    const userText = inputMessage.trim();
    const now = new Date();
    const timeString = now.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" });

    // 1. Add user message with staff name
    const userMsgId = "msg-" + Date.now();
    setChatMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        senderName: staffDisplayName,
        text: userText,
        time: timeString,
      },
    ]);
    setInputMessage("");
    setIsBotProcessing(true);

    try {
      // 2. Parse property text with local NLP engine or Gemini
      const apiKey = localStorage.getItem("alm_ai_api_key") || "";
      const defaultModel = localStorage.getItem("alm_ai_default_model") || "gemini-1.5-pro";
      const staffList = staffUsers.map(u => ({ id: u.id, name: u.name || u.email }));
      const regionsList = regions.map(r => ({ id: r.id, name: r.name }));
      const typesList = propertyTypes.map(t => ({ id: t.id, name: t.name }));

      const parsed = apiKey.trim()
        ? await parsePropertyWithGemini(userText, apiKey, defaultModel, regionsList, typesList, staffList)
        : parsePropertyText(userText);

      // Auto-assign: If the ad mentioned a staff explicitly, use that; otherwise assign the sending staff member!
      let assignedStaffId = (parsed as any).assignedStaffId;
      let assignedStaffName = (parsed as any).assignedStaffName;

      if (!assignedStaffId) {
        assignedStaffId = currentStaff?.id || "";
        assignedStaffName = staffDisplayName;
      }

      // Generate property code if not found
      const generatedCode = parsed.code || "S" + Math.floor(100 + Math.random() * 900);

      // 3. Add to platform database
      const success = await addProperty({
        code: generatedCode,
        title: `${parsed.typeId === "apartment" ? "شقة" : parsed.typeId || "عقار"} ${generatedCode}`,
        description: parsed.description || userText,
        price: parsed.price || 0,
        area: parsed.area || 0,
        beds: parsed.beds || 0,
        baths: parsed.baths || 0,
        floors: parsed.floors || 0,
        floor: parsed.floor || 0,
        finishing: parsed.finishing || "",
        view: parsed.view || "",
        unitType: parsed.unitType || "",
        subArea: parsed.subArea || "",
        layout: parsed.layout || "",
        master: parsed.master || "",
        elevator: parsed.elevator || "",
        parking: parsed.parking || "",
        additionalFeatures: parsed.additionalFeatures || "",
        floorText: parsed.floorText || "",
        location: parsed.location || "",
        regionId: parsed.regionId || (regions[0]?.id ?? "shorouk"),
        typeId: parsed.typeId || "apartment",
        category: parsed.category || "residential",
        listingType: parsed.listingType || "sale",
        status: autoPublish ? "active" : "draft",
        featured: false,
        agentType: parsed.agentType || "direct",
        images: [],
        videoUrl: "",
        externalUrl: "",
        mapsUrl: "",
        coverPriority: "image",
        source: parsed.source || "واتساب",
        sourcePhones: parsed.sourcePhones?.length ? parsed.sourcePhones : [""],
        assignedStaffId: assignedStaffId,
      });

      // 4. Formulate Smart Personalized WhatsApp Response
      let botReply = "";
      if (success) {
        botReply =
          `👋 *مرحباً أ/ ${assignedStaffName}!* 🌹\n` +
          `✅ *تم إدراج العقار بنجاح وتعيينك كالموظف المسؤول عنه!* 🚀\n\n` +
          `🏷️ *كود العقار:* ${generatedCode}\n` +
          `🏢 *النوع:* ${parsed.typeId === "apartment" ? "شقة سكنية" : parsed.typeId || "عقار"}\n` +
          `💰 *السعر:* ${parsed.price ? parsed.price.toLocaleString("en-US") + " ج.م" : "غير محدد"}\n` +
          `📐 *المساحة:* ${parsed.area ? parsed.area + " م²" : "غير محددة"}\n` +
          `🛏️ *الغرف / الحمامات:* ${parsed.beds || 0} غرف | ${parsed.baths || 0} حمام\n` +
          `🚪 *الدور:* ${parsed.floor === 0 ? "أرضي" : (parsed.floor ? "الدور " + parsed.floor : "غير محدد")}\n` +
          `📍 *المنطقة:* ${parsed.regionId ? (regions.find(r => r.id === parsed.regionId)?.name || parsed.regionId) : "مدينة الشروق"}\n` +
          `👤 *الموظف المسؤول:* ${assignedStaffName}\n\n` +
          `🔗 *رابط المعاينة المباشر:*\n` +
          `${window.location.origin}/property/${generatedCode}`;

        // Save to logs
        const newLog: WhatsAppMessageLog = {
          id: "log-" + Date.now(),
          senderPhone: connectedPhone,
          senderName: staffDisplayName,
          channelType: chatChannel,
          rawText: userText,
          propertyCode: generatedCode,
          price: parsed.price || 0,
          area: parsed.area || 0,
          region: parsed.regionId || "shorouk",
          timestamp: timeString,
          status: autoPublish ? "published" : "draft",
          propertyId: generatedCode,
          assignedStaffName: assignedStaffName,
        };
        const updatedLogs = [newLog, ...ingestionLogs].slice(0, 50);
        setIngestionLogs(updatedLogs);
        localStorage.setItem("alm_wa_logs", JSON.stringify(updatedLogs));
      } else {
        botReply = "⚠️ حدث خطأ أثناء إضافة العقار لقاعدة البيانات. يرجى المحاولة مرة أخرى.";
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          text: botReply,
          time: new Date().toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
          propertyCode: generatedCode,
        },
      ]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: "bot-err-" + Date.now(),
          sender: "bot",
          text: `⚠️ تعذر معالجة الرسالة: ${err?.message || "خطأ غير متوقع"}`,
          time: new Date().toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsBotProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
        <AdminPageHeader
          title="ربط واتساب الذكي (WhatsApp Multi-Staff Bot)"
          subtitle="استقبل إعلانات العقارات من فريق العمل عبر رسائل الواتساب أو جروب الشركة ليقوم الذكاء الاصطناعي بإدراجها وتعيين الموظف المسؤول فوراً"
          eyebrow="الأتمتة والربط الفوري"
          icon={MessageSquare}
          actions={
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-bold gap-1.5 h-10 px-4 rounded-xl text-xs sm:text-sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  قطع الاتصال
                </Button>
              ) : (
                <Button
                  onClick={handleSimulateScan}
                  disabled={isPairing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 h-10 px-4 rounded-xl shadow-md text-xs sm:text-sm"
                >
                  {isPairing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  {isPairing ? "جارٍ إتمام الاقتران..." : "تأكيد مسح الباركود والربط"}
                </Button>
              )}
            </div>
          }
        />

        {/* ── Top Status Card ── */}
        <Card className={`border transition-all shadow-sm ${isConnected ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isConnected ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600"}`}>
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {isConnected ? "واتساب متصل ونشط لكافة موظفي الشركة (Multi-Staff Online)" : "بانتظار مسح رمز الـ QR Code الحقيقي"}
                  </h3>
                  <Badge className={isConnected ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/30" : "bg-amber-500/20 text-amber-600 font-bold border-amber-500/30"}>
                    {isConnected ? "متصل 🟢" : "غير متصل 🟡"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isConnected
                    ? `رقم الواتساب المقترن: ${connectedPhone} — متاح لاستقبال إعلانات الموظفين في (جروب الشركة) أو (المحادثات المباشرة).`
                    : "امسح رمز الـ QR Code الحقيقي أدناه من هاتفك عبر الأجهزة المرتبطة لربط المنصة برقم الشركة."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-publish" className="text-xs font-bold cursor-pointer">النشر التلقائي المباشر:</Label>
                <Switch
                  id="auto-publish"
                  checked={autoPublish}
                  onCheckedChange={handleToggleAutoPublish}
                  aria-label="النشر التلقائي المباشر"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main Grid: Real Scannable QR Code & Interactive Multi-Staff Simulator ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Authentic QR Code & Pairing (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border/80 bg-card shadow-sm h-full flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base font-bold">الباركود الحقيقي المشفر (QR Code)</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-border">
                    {qrCounter}s لتجديد الرمز
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  رمز QR حقيقي متوافق مع كافة كاميرات الهواتف وتطبيق واتساب.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Real SVG QR Code Container */}
                <div className="relative mx-auto w-56 h-56 rounded-2xl border-2 border-emerald-500/40 bg-white p-3 flex flex-col items-center justify-center shadow-lg">
                  {isConnected ? (
                    <div className="text-center space-y-2 text-emerald-600">
                      <CheckCircle2 className="h-16 w-16 mx-auto animate-bounce" />
                      <p className="font-bold text-sm">تم ربط الجهاز بنجاح!</p>
                      <p className="text-xs text-muted-foreground font-mono">{connectedPhone}</p>
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">
                        نشط ومتاح للفريق
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <QRCodeDisplay value={qrSessionToken} size={200} />
                    </div>
                  )}
                </div>

                {/* Steps Guide */}
                <div className="space-y-2.5 bg-muted/40 p-4 rounded-xl border border-border/60 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    طريقة الاقتران من الهاتف:
                  </h4>
                  <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside pr-1">
                    <li>افتح تطبيق <strong>WhatsApp</strong> على هاتفك (رقم الشركة أو المدير).</li>
                    <li>اضغط على القائمة (⁝) أو الإعدادات ⬅️ واختر <strong>الأجهزة المرتبطة (Linked Devices)</strong>.</li>
                    <li>اضغط على <strong>ربط جهاز (Link a Device)</strong> ووجّه الكاميرا للباركود الحقيقي أعلاه.</li>
                    <li>سيتصل البوت برقم الشركة ويستقبل رسائل الموظفين من الجروب أو الخاص فوراً!</li>
                  </ol>
                </div>

                {!isConnected && (
                  <Button
                    onClick={handleSimulateScan}
                    disabled={isPairing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl h-10 shadow-sm text-xs"
                  >
                    {isPairing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {isPairing ? "جارٍ التحقق والاقتران..." : "تأكيد مسح الباركود والربط"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Live Interactive Multi-Staff WhatsApp Simulator (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border/80 bg-card shadow-sm flex flex-col h-[620px]">
              {/* WhatsApp Mockup Header */}
              <div className="bg-emerald-700 dark:bg-emerald-950 text-white p-3.5 rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base shadow-inner">
                    {chatChannel === "group" ? <Users className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                      <span>{chatChannel === "group" ? "جروب عقارات العمودي 🏢 (فريق العمل)" : "محادثة بوت المنصة المباشرة"}</span>
                      <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                    </h4>
                    <p className="text-[11px] text-emerald-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                      {chatChannel === "group" ? `${staffUsers.length} موظفين + البوت الذكي نشط` : "متصل للرد والإدراج الفوري"}
                    </p>
                  </div>
                </div>

                {/* Channel Switcher */}
                <div className="flex items-center gap-1.5 bg-emerald-800/80 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setChatChannel("group")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${chatChannel === "group" ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-100 hover:text-white"}`}
                  >
                    جروب الشركة
                  </button>
                  <button
                    onClick={() => setChatChannel("direct")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${chatChannel === "direct" ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-100 hover:text-white"}`}
                  >
                    إرسال خاص
                  </button>
                </div>
              </div>

              {/* Staff Sender Selector Bar */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-500/20 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  <span>الموظف الذي يرسل الإعلان الآن:</span>
                </div>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="h-8 w-44 text-xs bg-background">
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name || u.email} ({u.role === "admin" ? "مدير" : "مستشار"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chat Message Stream */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/70 dark:bg-slate-950/40">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}
                  >
                    {msg.senderName && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5 px-1">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                        msg.sender === "user"
                          ? "bg-white dark:bg-slate-800 text-foreground rounded-br-none border border-border/50"
                          : "bg-emerald-600 text-white rounded-bl-none font-sans"
                      }`}
                    >
                      {msg.text}

                      {msg.propertyCode && (
                        <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-100">كود: {msg.propertyCode}</span>
                          <Link
                            href={`/property/${msg.propertyCode}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 bg-white text-emerald-800 hover:bg-white/90 text-xs font-bold px-3 py-1 rounded-lg transition-colors shadow-sm"
                          >
                            <span>فتح العقار في المنصة</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                  </div>
                ))}

                {isBotProcessing && (
                  <div className="flex items-center gap-2 bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-xs w-fit">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>الوكيل يحلل الإعلان ويسجله باسم ({staffDisplayName})...</span>
                  </div>
                )}
              </CardContent>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-border bg-card rounded-b-xl flex items-center gap-2">
                <Textarea
                  rows={2}
                  placeholder={`اكتب أو الصق نص الإعلان هنا كـ (${staffDisplayName})...`}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="text-xs sm:text-sm bg-background resize-none min-h-[44px] max-h-[80px]"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isBotProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 w-11 shrink-0 rounded-xl shadow-sm flex items-center justify-center p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

        </div>

        {/* ── Section 3: Ingestion Log History with Assigned Staff ── */}
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                <CardTitle className="text-base font-bold">سجل العقارات المستلمة والموزعة على الموظفين ({ingestionLogs.length})</CardTitle>
              </div>
              {ingestionLogs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIngestionLogs([]);
                    localStorage.removeItem("alm_wa_logs");
                    toast({ title: "تم مسح سجل الواتساب" });
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 ml-1" />
                  مسح السجل
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              قائمة بالعقارات المضافة عبر الواتساب مع توضيح اسم الموظف المرسل وقناة الإرسال ورابط المعاينة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ingestionLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30 text-accent" />
                <p>لا توجد عقارات مضافة عبر الواتساب بعد. جرب إرسال نص إعلان في المحاكي بالأعلى!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">كود العقار</th>
                      <th className="py-2.5 px-3 font-semibold">الموظف المسؤول</th>
                      <th className="py-2.5 px-3 font-semibold">القناة</th>
                      <th className="py-2.5 px-3 font-semibold">السعر</th>
                      <th className="py-2.5 px-3 font-semibold">المساحة</th>
                      <th className="py-2.5 px-3 font-semibold">التوقيت</th>
                      <th className="py-2.5 px-3 font-semibold">الحالة</th>
                      <th className="py-2.5 px-3 font-semibold text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ingestionLogs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold font-mono text-accent">{log.propertyCode}</td>
                        <td className="py-2.5 px-3 font-bold text-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            {log.assignedStaffName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {log.channelType === "group" ? "جروب الشركة" : "إرسال خاص"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{log.price ? log.price.toLocaleString("en-US") + " ج.م" : "—"}</td>
                        <td className="py-2.5 px-3">{log.area ? log.area + " م²" : "—"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{log.timestamp}</td>
                        <td className="py-2.5 px-3">
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                            تم الإدراج بنجاح ✓
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            href={`/property/${log.propertyCode}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-accent hover:underline font-bold"
                          >
                            <span>معاينة</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
