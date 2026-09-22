import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Gem, ShieldCheck, UserCheck, CheckCircle2, Star, Heart, Pencil, Plus, Trash2, Save, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface AboutValue { id: string; title: string; desc: string }
interface AboutPageConfig {
  heroSubtitle: string;
  storyTitle: string;
  storyParagraphs: string[];
  valuesTitle: string;
  valuesSubtitle: string;
  values: AboutValue[];
}

const DEFAULT_CONFIG: AboutPageConfig = {
  heroSubtitle: "العمودي للتسويق العقاري — شريكك الموثوق في عالم العقارات الفاخرة",
  storyTitle: "قصتنا",
  storyParagraphs: [
    "العمودي للتسويق العقاري شركة متخصصة في التسويق والاستثمار العقاري، تأسست عام 2018، وتمتلك خبرة واسعة في سوق العقارات المصري والسعودي.",
    "نسعى لتقديم أفضل الفرص العقارية والاستثمارية لعملائنا من خلال خدمات احترافية وحلول مبتكرة تلبي مختلف الاحتياجات السكنية والاستثمارية.",
    "يقودنا فريق من أمهر المستشارين العقاريين الذين يتمتعون بخبرات عميقة في السوق وشبكة علاقات واسعة تُمكّننا من تقديم فرص حصرية لعملائنا.",
  ],
  valuesTitle: "قيمنا",
  valuesSubtitle: "نلتزم بمجموعة من القيم الراسخة التي توجه كل خطوة نخطوها.",
  values: [
    { id: "1", title: "الجودة والحصرية", desc: "نوفر وصولاً لأرقى العقارات والفرص الاستثمارية غير المتاحة في السوق العام." },
    { id: "2", title: "الثقة والموثوقية", desc: "فريق من المستشارين ذوي المعرفة العميقة بالسوق العقاري المصري والسعودي." },
    { id: "3", title: "الخدمة المتكاملة", desc: "نرافق العميل من البحث والمقارنة حتى إتمام كافة الإجراءات القانونية ونقل الملكية." },
    { id: "4", title: "الشفافية الكاملة", desc: "وضوح كامل في التسعير والمواصفات لضمان قرار استثماري سليم وآمن." },
  ],
};

const VALUE_ICONS = [Gem, ShieldCheck, UserCheck, CheckCircle2, Star, Heart];

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ─── Inline Editor Sheet ──────────────────────────────────────────────────────

function AboutEditor({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: AboutPageConfig;
  onClose: () => void;
  onSave: (c: AboutPageConfig) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AboutPageConfig>(initial);

  useEffect(() => { if (open) setDraft(initial); }, [open]);

  const setField = <K extends keyof AboutPageConfig>(k: K, v: AboutPageConfig[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const setParagraph = (i: number, val: string) =>
    setDraft(d => { const p = [...d.storyParagraphs]; p[i] = val; return { ...d, storyParagraphs: p }; });

  const addParagraph = () =>
    setDraft(d => ({ ...d, storyParagraphs: [...d.storyParagraphs, ""] }));

  const removeParagraph = (i: number) =>
    setDraft(d => ({ ...d, storyParagraphs: d.storyParagraphs.filter((_, j) => j !== i) }));

  const setValueField = (id: string, k: keyof AboutValue, val: string) =>
    setDraft(d => ({ ...d, values: d.values.map(v => v.id === id ? { ...v, [k]: val } : v) }));

  const addValue = () =>
    setDraft(d => ({ ...d, values: [...d.values, { id: uid(), title: "", desc: "" }] }));

  const removeValue = (id: string) =>
    setDraft(d => ({ ...d, values: d.values.filter(v => v.id !== id) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.put<AboutPageConfig>("/about-page", draft);
      onSave(saved);
      toast({ title: "تم حفظ التغييرات" });
      onClose();
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border sticky top-0 bg-background z-10">
          <SheetTitle className="text-base font-bold">تعديل صفحة «من نحن»</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Hero subtitle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">العنوان الفرعي في الأعلى</Label>
            <Input
              value={draft.heroSubtitle}
              onChange={e => setField("heroSubtitle", e.target.value)}
              placeholder="شريكك الموثوق في عالم العقارات..."
            />
          </div>

          <Separator />

          {/* Story */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">قسم القصة</Label>
            <div className="space-y-1.5">
              <Label className="text-xs">عنوان القسم</Label>
              <Input
                value={draft.storyTitle}
                onChange={e => setField("storyTitle", e.target.value)}
                placeholder="قصتنا"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الفقرات</Label>
              {draft.storyParagraphs.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Textarea
                    value={p}
                    onChange={e => setParagraph(i, e.target.value)}
                    placeholder={`الفقرة ${i + 1}...`}
                    className="flex-1 min-h-[80px] text-sm resize-none"
                  />
                  <button
                    onClick={() => removeParagraph(i)}
                    className="mt-1.5 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addParagraph}
                className="gap-1.5 text-xs border-dashed w-full"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة فقرة
              </Button>
            </div>
          </div>

          <Separator />

          {/* Values */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">قسم القيم</Label>
            <div className="space-y-1.5">
              <Label className="text-xs">عنوان القسم</Label>
              <Input
                value={draft.valuesTitle}
                onChange={e => setField("valuesTitle", e.target.value)}
                placeholder="قيمنا"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوصف تحت العنوان</Label>
              <Input
                value={draft.valuesSubtitle}
                onChange={e => setField("valuesSubtitle", e.target.value)}
                placeholder="نلتزم بمجموعة من القيم الراسخة..."
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs">البطاقات</Label>
              {draft.values.map((val, i) => (
                <div key={val.id} className="border border-border rounded-xl p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium">القيمة {i + 1}</span>
                    <button
                      onClick={() => removeValue(val.id)}
                      className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <Input
                    value={val.title}
                    onChange={e => setValueField(val.id, "title", e.target.value)}
                    placeholder="اسم القيمة"
                    className="text-sm"
                  />
                  <Textarea
                    value={val.desc}
                    onChange={e => setValueField(val.id, "desc", e.target.value)}
                    placeholder="وصف موجز..."
                    className="text-sm min-h-[70px] resize-none"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addValue}
                className="gap-1.5 text-xs border-dashed w-full"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة قيمة
              </Button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border bg-background flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            إلغاء
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function About() {
  const { isStaff } = useAuth();
  const [config, setConfig] = useState<AboutPageConfig>(DEFAULT_CONFIG);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    api.get<AboutPageConfig>("/about-page")
      .then(data => setConfig(data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">

        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(#DCD7C9 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="container px-6 relative z-10 text-center">
            <p className="text-accent text-sm font-medium tracking-widest mb-4 uppercase">تعرّف علينا</p>
            <h1 className="text-3xl md:text-5xl font-bold text-[#DCD7C9] mb-6 leading-tight">من نحن</h1>
            <p className="text-sm md:text-base text-[#DCD7C9]/80 max-w-2xl mx-auto font-light leading-relaxed">
              {config.heroSubtitle}
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{config.storyTitle}</h2>
                <div className="w-12 h-0.5 bg-accent mx-auto" />
              </div>
              <div className="text-muted-foreground leading-relaxed text-center space-y-5">
                {config.storyParagraphs.map((p, i) => (
                  <p key={i} className="text-base md:text-lg leading-8">{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{config.valuesTitle}</h2>
              {config.valuesSubtitle && (
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">{config.valuesSubtitle}</p>
              )}
              <div className="w-12 h-0.5 bg-accent mx-auto mt-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {config.values.map((v, i) => {
                const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
                return (
                  <div key={v.id} className="flex gap-4 p-6 bg-card rounded-2xl border border-border/50 card-luxury">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent flex-shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-2">{v.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(#A9927D 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="container px-6 relative z-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#DCD7C9] mb-4">هل أنت مهتم بالاستثمار العقاري؟</h2>
            <p className="text-sm text-[#DCD7C9]/75 mb-8 max-w-lg mx-auto">
              تواصل معنا اليوم واطرح استفسارك وسيرد عليك أحد خبرائنا العقاريين.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-8 rounded-full font-bold text-sm text-[#10202D]" style={{ background: "linear-gradient(135deg, #917B67, #A9927D)" }}>
                <Link href="/add-property">أعرض عقارك</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-full font-bold text-sm border-[#DCD7C9]/40 text-[#DCD7C9] hover:bg-white/10">
                <Link href="/">تصفح العقارات</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Admin edit button — visible only to staff */}
      {isStaff && (
        <button
          onClick={() => setEditorOpen(true)}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-accent text-accent-foreground text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-accent/90 transition-all hover:scale-105 active:scale-95"
        >
          <Pencil className="h-4 w-4" />
          تعديل الصفحة
        </button>
      )}

      <AboutEditor
        open={editorOpen}
        initial={config}
        onClose={() => setEditorOpen(false)}
        onSave={setConfig}
      />
    </div>
  );
}
