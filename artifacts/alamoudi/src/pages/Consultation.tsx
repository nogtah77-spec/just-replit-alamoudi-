import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, Phone, Clock, CheckCircle2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { buildWaUrl } from "@/lib/phone";
import { Link } from "wouter";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Consultation() {
  const { settings } = useData();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.subject || !form.message) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "يجب الموافقة على سياسة الخصوصية وشروط الاستخدام", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/inquiries", {
        ...form,
        id: genId(),
        status: "new",
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
      toast({ title: "تم إرسال طلب الاستشارة", description: "سنتواصل معك في أقرب وقت ممكن." });
    } catch {
      toast({
        title: "خطأ في الإرسال",
        description: "فشل إرسال الاستفسار، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="bg-card border-b border-border py-12 md:py-16">
          <div className="container px-6 text-center">
            <p className="text-accent text-xs font-medium tracking-widest mb-3 uppercase">خدماتنا</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">استشارة عقارية</h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              فريقنا من الخبراء العقاريين جاهز لمساعدتك في اتخاذ القرار الأمثل. أرسل استفسارك وسنتواصل معك خلال 24 ساعة.
            </p>
          </div>
        </div>

        <div className="container px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="space-y-4">
              {[
                { icon: <Clock className="h-5 w-5" />, title: "متاح 24/7", desc: "فريقنا جاهز للرد على استفساراتك في أي وقت." },
                { icon: <CheckCircle2 className="h-5 w-5" />, title: "خبرة أكثر من 6 سنوات", desc: "تجربة واسعة في السوق العقاري المصري." },
                { icon: <MessageCircle className="h-5 w-5" />, title: "اطرح استفسارك", desc: "تواصل معنا بسهولة وسيرد عليك فريقنا بدون أي التزامات." },
              ].map((item, i) => (
                <Card key={i} className="card-luxury border-none bg-card">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-md flex items-center justify-center text-accent flex-shrink-0">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {settings.whatsapp && (
                <Card className="card-luxury border-none bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-5">
                    <a href={buildWaUrl(settings.whatsapp) ?? "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-green-700 dark:text-green-400">
                      <WhatsAppIcon className="h-5 w-5" />
                      <div>
                        <p className="font-semibold text-sm">تواصل عبر واتساب</p>
                        <p className="text-xs opacity-75">{settings.whatsapp}</p>
                      </div>
                    </a>
                  </CardContent>
                </Card>
              )}
              {settings.phone1 && (
                <Card className="card-luxury border-none bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-5">
                    <a href={`tel:${settings.phone1.replace(/\s/g, "")}`} className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                      <Phone className="h-5 w-5" />
                      <div>
                        <p className="font-semibold text-sm">اتصل بنا</p>
                        <p className="text-xs opacity-75">{settings.phone1}</p>
                      </div>
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              {submitted ? (
                <Card className="card-luxury border-none text-center py-16">
                  <CardContent>
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">تم إرسال طلبك بنجاح</h2>
                    <p className="text-sm text-muted-foreground">سيتواصل معك فريقنا خلال 24 ساعة على رقم الهاتف الذي أدخلته.</p>
                    <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90 px-8"
                      onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", email: "", subject: "", message: "" }); }}>
                      إرسال استفسار آخر
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="card-luxury border-none bg-card">
                  <CardHeader><CardTitle>إرسال الاستشارة</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الاسم الكامل *</Label>
                          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="محمد أحمد" />
                        </div>
                        <div className="space-y-2">
                          <Label>رقم الهاتف *</Label>
                          <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+20 10 0000 0000" dir="ltr" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>البريد الإلكتروني (اختياري)</Label>
                        <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <Label>عنوان الاستفسار *</Label>
                        <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="مثال: البحث عن شقة في التجمع للبيع" />
                      </div>
                      <div className="space-y-2">
                        <Label>تفاصيل الاستفسار *</Label>
                        <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="اكتب تفاصيل استفسارك هنا..." className="min-h-[120px]" />
                      </div>
                      {/* Terms agreement */}
                      <div className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${agreed ? "border-accent/30 bg-accent/5" : "border-border bg-card/50"}`}>
                        <Checkbox
                          id="consult-terms-agree"
                          checked={agreed}
                          onCheckedChange={v => setAgreed(!!v)}
                          className="mt-0.5 shrink-0"
                        />
                        <label htmlFor="consult-terms-agree" className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
                          أقر بأنني قرأت ووافقت على{" "}
                          <Link href="/privacy" className="text-accent font-medium underline underline-offset-2 hover:text-accent/80" onClick={e => e.stopPropagation()}>
                            سياسة الخصوصية
                          </Link>
                          {" "}و{" "}
                          <Link href="/privacy" className="text-accent font-medium underline underline-offset-2 hover:text-accent/80" onClick={e => e.stopPropagation()}>
                            شروط الاستخدام
                          </Link>
                          {" "}الخاصة بمنصة العمودي للتسويق العقاري.
                        </label>
                      </div>

                      <Button type="submit" disabled={loading || !agreed} className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-xl disabled:opacity-50">
                        {loading ? "جاري الإرسال..." : "إرسال الاستشارة"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
