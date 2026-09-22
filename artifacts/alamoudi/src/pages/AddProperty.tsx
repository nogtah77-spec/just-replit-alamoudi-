import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, CheckCircle2, Phone, Mail, User, MapPin, ImagePlus } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { formatNumericInput, toNumericString } from "@/lib/utils";
import { getThumbnailImageUrl } from "@/lib/cloudinaryService";

interface FormState {
  ownerName: string;
  ownerPhone: string;
  ownerWhatsapp: string;
  ownerEmail: string;
  regionId: string;
  propertyTypeId: string;
  listingType: string;
  area: string;
  price: string;
  description: string;
  mapsUrl: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  ownerName: "",
  ownerPhone: "",
  ownerWhatsapp: "",
  ownerEmail: "",
  regionId: "",
  propertyTypeId: "",
  listingType: "",
  area: "",
  price: "",
  description: "",
  mapsUrl: "",
  notes: "",
};

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.ownerName.trim()) errors.ownerName = "الاسم مطلوب";
  if (!form.ownerPhone.trim()) errors.ownerPhone = "رقم الهاتف مطلوب";
  if (!form.regionId) errors.regionId = "المنطقة مطلوبة";
  if (!form.propertyTypeId) errors.propertyTypeId = "نوع العقار مطلوب";
  if (!form.listingType) errors.listingType = "نوع الإعلان مطلوب";
  if (!form.area.trim() || isNaN(Number(toNumericString(form.area)))) errors.area = "المساحة مطلوبة";
  if (!form.price.trim() || isNaN(Number(toNumericString(form.price)))) errors.price = "السعر مطلوب";
  return errors;
}

export default function AddProperty() {
  const { regions, propertyTypes } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [images, setImages] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [key]: e.target.value }));
    setErrors(p => ({ ...p, [key]: undefined }));
  };

  const setSelect = (key: keyof FormState) => (val: string) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: undefined }));
  };

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    let skipped = 0;
    files.slice(0, 10 - images.length).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        skipped++;
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        setImages(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (skipped > 0) {
      toast({
        title: `تم تخطي ${skipped} ${skipped === 1 ? "صورة" : "صور"}`,
        description: "حجم الصورة يجب ألا يتجاوز 5 ميجا",
        variant: "destructive",
      });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (idx: number) =>
    setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErr = document.querySelector("[data-error]");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!agreed) {
      toast({ title: "يجب الموافقة على سياسة الخصوصية وشروط الاستخدام", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
       await api.post("/property-requests", {
        ...form,
         area: toNumericString(form.area),
         price: toNumericString(form.price),
        images,
        id: genId(),
        status: "new",
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch {
      toast({
        title: "خطأ في الإرسال",
        description: "فشل إرسال الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center bg-background px-6 py-20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">تم إرسال طلبك بنجاح!</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              تم استلام طلبكم بنجاح وسيتم التواصل معكم في أقرب وقت.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
                <Link href="/">العودة للرئيسية</Link>
              </Button>
              <Button variant="outline" onClick={() => { setForm(EMPTY_FORM); setImages([]); setSubmitted(false); }} className="rounded-full px-8">
                إضافة عقار آخر
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
        <main className="flex-1 bg-background py-12 md:py-16">
        <div className="container px-6 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">أعرض عقارك لدينا</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              أدخل بيانات عقارك وسيتواصل معك أحد مستشارينا في أقرب وقت.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="card-luxury">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  بيانات المالك
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5" data-error={errors.ownerName}>
                  <Label htmlFor="ownerName" className="text-sm">الاسم الكامل <span className="text-destructive">*</span></Label>
                  <Input id="ownerName" value={form.ownerName} onChange={set("ownerName")} placeholder="محمد أحمد" className={errors.ownerName ? "border-destructive" : ""} />
                  {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName}</p>}
                </div>
                <div className="space-y-1.5" data-error={errors.ownerPhone}>
                  <Label htmlFor="ownerPhone" className="text-sm flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-accent" /> رقم الهاتف <span className="text-destructive">*</span>
                  </Label>
                  <Input id="ownerPhone" dir="ltr" className={`text-right ${errors.ownerPhone ? "border-destructive" : ""}`} value={form.ownerPhone} onChange={set("ownerPhone")} placeholder="+20 10 0000 0000" />
                  {errors.ownerPhone && <p className="text-xs text-destructive">{errors.ownerPhone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerWhatsapp" className="text-sm">رقم واتساب</Label>
                  <Input id="ownerWhatsapp" dir="ltr" className="text-right" value={form.ownerWhatsapp} onChange={set("ownerWhatsapp")} placeholder="+20 10 0000 0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerEmail" className="text-sm flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-accent" /> البريد الإلكتروني (اختياري)
                  </Label>
                  <Input id="ownerEmail" type="email" dir="ltr" className="text-right" value={form.ownerEmail} onChange={set("ownerEmail")} placeholder="example@email.com" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-luxury">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  بيانات العقار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5" data-error={errors.regionId}>
                    <Label className="text-sm">المنطقة <span className="text-destructive">*</span></Label>
                    <Select value={form.regionId} onValueChange={setSelect("regionId")}>
                      <SelectTrigger className={errors.regionId ? "border-destructive" : ""}>
                        <SelectValue placeholder="اختر المنطقة" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.filter(r => r.active).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.regionId && <p className="text-xs text-destructive">{errors.regionId}</p>}
                  </div>
                  <div className="space-y-1.5" data-error={errors.propertyTypeId}>
                    <Label className="text-sm">نوع العقار <span className="text-destructive">*</span></Label>
                    <Select value={form.propertyTypeId} onValueChange={setSelect("propertyTypeId")}>
                      <SelectTrigger className={errors.propertyTypeId ? "border-destructive" : ""}>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.filter(t => t.active).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.propertyTypeId && <p className="text-xs text-destructive">{errors.propertyTypeId}</p>}
                  </div>
                  <div className="space-y-1.5" data-error={errors.listingType}>
                    <Label className="text-sm">نوع الإعلان <span className="text-destructive">*</span></Label>
                    <Select value={form.listingType} onValueChange={setSelect("listingType")}>
                      <SelectTrigger className={errors.listingType ? "border-destructive" : ""}>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">للبيع</SelectItem>
                        <SelectItem value="rent">للإيجار</SelectItem>
                        <SelectItem value="furnished">شقة مفروشة</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.listingType && <p className="text-xs text-destructive">{errors.listingType}</p>}
                  </div>
                  <div className="space-y-1.5" data-error={errors.area}>
                    <Label htmlFor="area" className="text-sm">المساحة (م²) <span className="text-destructive">*</span></Label>
                    <Input id="area" type="number" value={form.area} onChange={set("area")} placeholder="120" className={errors.area ? "border-destructive" : ""} />
                    {errors.area && <p className="text-xs text-destructive">{errors.area}</p>}
                  </div>
                  <div className="space-y-1.5 md:col-span-2" data-error={errors.price}>
                    <Label htmlFor="price" className="text-sm">السعر (EGP) <span className="text-destructive">*</span></Label>
                    <Input id="price" type="text" inputMode="decimal" dir="ltr" value={form.price} onChange={e => {
                      setForm(p => ({ ...p, price: formatNumericInput(e.target.value) }));
                      setErrors(p => ({ ...p, price: undefined }));
                    }} placeholder="2,500,000" className={`text-right ${errors.price ? "border-destructive" : ""}`} />
                    {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm">وصف العقار</Label>
                  <Textarea id="description" rows={4} value={form.description} onChange={set("description")} placeholder="أدخل وصفاً تفصيلياً للعقار..." />
                </div>
              </CardContent>
            </Card>

            <Card className="card-luxury">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-accent" />
                  صور العقار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden aspect-square bg-muted group">
                        <img src={getThumbnailImageUrl(img)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 left-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {images.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent/60 hover:text-accent hover:bg-accent/5 transition-all"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">رفع صور ({images.length}/10)</span>
                    <span className="text-xs opacity-70">PNG, JPG — حد أقصى 5 ميجا لكل صورة</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              </CardContent>
            </Card>

            <Card className="card-luxury">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">معلومات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mapsUrl" className="text-sm flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-accent" /> رابط الموقع على خرائط جوجل (اختياري)
                  </Label>
                  <Input id="mapsUrl" dir="ltr" className="text-xs text-right" value={form.mapsUrl} onChange={set("mapsUrl")} placeholder="https://maps.google.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm">ملاحظات إضافية</Label>
                  <Textarea id="notes" rows={3} value={form.notes} onChange={set("notes")} placeholder="أي معلومات إضافية تود مشاركتها..." />
                </div>
              </CardContent>
            </Card>

            {/* Terms agreement */}
            <div className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${agreed ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
              <Checkbox
                id="terms-agree"
                checked={agreed}
                onCheckedChange={v => setAgreed(!!v)}
                className="mt-0.5 shrink-0"
              />
              <label htmlFor="terms-agree" className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
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

            <div className="flex flex-col sm:flex-row gap-3 pb-4">
              <Button type="submit" disabled={loading || !agreed} className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold text-sm disabled:opacity-50">
                {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
              <Button type="button" variant="outline" asChild className="h-12 rounded-xl text-sm">
                <Link href="/">إلغاء</Link>
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
