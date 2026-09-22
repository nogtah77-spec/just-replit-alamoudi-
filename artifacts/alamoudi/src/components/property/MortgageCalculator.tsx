import { useState, useMemo } from "react";
import { Calculator, Percent, Calendar, ShieldCheck, DollarSign, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { formatNumber } from "@/lib/utils";

interface MortgageCalculatorProps {
  price: number;
  propertyTitle: string;
  propertyCode: string;
  whatsappNumber?: string;
}

export function MortgageCalculator({
  price,
  propertyTitle,
  propertyCode,
  whatsappNumber = "+201000000000",
}: MortgageCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"direct" | "bank">("direct");

  // Direct installment state
  const [directDownPercent, setDirectDownPercent] = useState<number>(20);
  const [directYears, setDirectYears] = useState<number>(5);
  const [directDeliveryPercent, setDirectDeliveryPercent] = useState<number>(10);

  // Bank mortgage state
  const [bankDownPercent, setBankDownPercent] = useState<number>(20);
  const [bankYears, setBankYears] = useState<number>(10);
  const [bankInterestRate, setBankInterestRate] = useState<number>(12); // Annual %

  // Direct installment calculations
  const directDownPayment = useMemo(() => Math.round(price * (directDownPercent / 100)), [price, directDownPercent]);
  const directDeliveryPayment = useMemo(() => Math.round(price * (directDeliveryPercent / 100)), [price, directDeliveryPercent]);
  const directRemaining = useMemo(() => Math.max(0, price - directDownPayment - directDeliveryPayment), [price, directDownPayment, directDeliveryPayment]);
  const directTotalMonths = useMemo(() => Math.max(1, directYears * 12), [directYears]);
  const directMonthlyInstallment = useMemo(() => Math.round(directRemaining / directTotalMonths), [directRemaining, directTotalMonths]);
  const directQuarterlyInstallment = useMemo(() => Math.round(directMonthlyInstallment * 3), [directMonthlyInstallment]);

  // Bank mortgage calculations (Amortization formula)
  const bankDownPayment = useMemo(() => Math.round(price * (bankDownPercent / 100)), [price, bankDownPercent]);
  const bankLoanAmount = useMemo(() => Math.max(0, price - bankDownPayment), [price, bankDownPayment]);
  const bankTotalMonths = useMemo(() => Math.max(1, bankYears * 12), [bankYears]);
  const bankMonthlyRate = useMemo(() => (bankInterestRate / 100) / 12, [bankInterestRate]);

  const bankMonthlyInstallment = useMemo(() => {
    if (bankLoanAmount <= 0) return 0;
    if (bankMonthlyRate === 0) return Math.round(bankLoanAmount / bankTotalMonths);
    const m = (bankLoanAmount * bankMonthlyRate * Math.pow(1 + bankMonthlyRate, bankTotalMonths)) /
      (Math.pow(1 + bankMonthlyRate, bankTotalMonths) - 1);
    return Math.round(m);
  }, [bankLoanAmount, bankMonthlyRate, bankTotalMonths]);

  const bankTotalPayment = useMemo(() => Math.round(bankDownPayment + (bankMonthlyInstallment * bankTotalMonths)), [bankDownPayment, bankMonthlyInstallment, bankTotalMonths]);
  const bankTotalInterest = useMemo(() => Math.max(0, bankTotalPayment - price), [bankTotalPayment, price]);

  // WhatsApp Message Generator
  const handleRequestPlan = () => {
    const isDirect = activeTab === "direct";
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, "");
    
    let msg = `مرحبًا، أود الاستفسار عن خطة سداد للعقار التالي:\n`;
    msg += `📌 العقار: ${propertyTitle}\n`;
    msg += `🏷️ كود العقار: ${propertyCode}\n`;
    msg += `💰 إجمالي السعر: ${formatNumber(price)} ج.م\n\n`;

    if (isDirect) {
      msg += `📋 *خطة التقسيط المباشر (المطور):*\n`;
      msg += `• مقدم التعاقد (${directDownPercent}%): ${formatNumber(directDownPayment)} ج.م\n`;
      if (directDeliveryPercent > 0) {
        msg += `• دفعة الاستلام (${directDeliveryPercent}%): ${formatNumber(directDeliveryPayment)} ج.م\n`;
      }
      msg += `• مدة السداد: ${directYears} سنوات\n`;
      msg += `• القسط الشهري المتوقع: ${formatNumber(directMonthlyInstallment)} ج.م\n`;
      msg += `• القسط الربع سنوي: ${formatNumber(directQuarterlyInstallment)} ج.م\n`;
    } else {
      msg += `📋 *خطة التمويل العقاري البنكي:*\n`;
      msg += `• الدفعة الأولى (${bankDownPercent}%): ${formatNumber(bankDownPayment)} ج.م\n`;
      msg += `• مدة التمويل: ${bankYears} سنة\n`;
      msg += `• القسط الشهري المتوقع: ${formatNumber(bankMonthlyInstallment)} ج.م\n`;
    }

    msg += `\nيرجى التواصل لتأكيد التفاصيل وحجز موعد استشارة.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="overflow-hidden border border-border/80 bg-card/60 shadow-lg backdrop-blur-sm" dir="rtl">
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                حاسبة التمويل والأقساط التفاعلية
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                احسب القسط الشهري والدفعة الأولى المناسبة لميزانيتك فورياً
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-semibold text-accent">
            <DollarSign className="h-3.5 w-3.5" />
            <span>السعر الأساسي: {formatNumber(price)} ج.م</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "direct" | "bank")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger value="direct" className="text-xs font-semibold sm:text-sm">
              <ShieldCheck className="ml-1.5 h-4 w-4 text-emerald-500" />
              تقسيط مباشر (بدون فوائد)
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs font-semibold sm:text-sm">
              <ArrowRightLeft className="ml-1.5 h-4 w-4 text-sky-500" />
              تمويل عقاري بنكي
            </TabsTrigger>
          </TabsList>

          {/* ──────── TAB 1: Direct Installment ──────── */}
          <TabsContent value="direct" className="mt-5 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Controls Column */}
              <div className="space-y-5">
                {/* Down Payment Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <Label className="text-foreground">مقدم التعاقد ({directDownPercent}%)</Label>
                    <span className="font-bold text-accent">{formatNumber(directDownPayment)} ج.م</span>
                  </div>
                  <Slider
                    value={[directDownPercent]}
                    min={5}
                    max={60}
                    step={5}
                    onValueChange={(val) => setDirectDownPercent(val[0])}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5%</span>
                    <span>20%</span>
                    <span>40%</span>
                    <span>60%</span>
                  </div>
                </div>

                {/* Years Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <Label className="text-foreground">مدة التقسيط ({directYears} سنوات)</Label>
                    <span className="font-bold text-accent">{directTotalMonths} شهر</span>
                  </div>
                  <Slider
                    value={[directYears]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(val) => setDirectYears(val[0])}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>سنة واحدة</span>
                    <span>5 سنوات</span>
                    <span>10 سنوات</span>
                  </div>
                </div>

                {/* Delivery Payment Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <Label className="text-foreground">دفعة الاستلام ({directDeliveryPercent}%)</Label>
                    <span className="font-bold text-accent">{formatNumber(directDeliveryPayment)} ج.م</span>
                  </div>
                  <Slider
                    value={[directDeliveryPercent]}
                    min={0}
                    max={30}
                    step={5}
                    onValueChange={(val) => setDirectDeliveryPercent(val[0])}
                    className="py-1"
                  />
                </div>
              </div>

              {/* Summary Card Column */}
              <div className="flex flex-col justify-between rounded-2xl border border-accent/25 bg-accent/5 p-5">
                <div>
                  <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                    <span className="text-xs font-semibold text-muted-foreground">نوع الخطة</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" /> بدون فوائد (0%)
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">القسط الشهري المتوقع:</span>
                      <span className="text-xl font-extrabold text-foreground sm:text-2xl">
                        {formatNumber(directMonthlyInstallment)} <span className="text-xs font-normal text-muted-foreground">ج.م / شهر</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border/20 pt-2">
                      <span className="text-xs text-muted-foreground">أو قسط ربع سنوي:</span>
                      <span className="text-sm font-bold text-foreground">
                        {formatNumber(directQuarterlyInstallment)} ج.م / 3 أشهر
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border/20 pt-2">
                      <span className="text-xs text-muted-foreground">مقدم التعاقد:</span>
                      <span className="text-sm font-bold text-accent">{formatNumber(directDownPayment)} ج.م</span>
                    </div>

                    {directDeliveryPayment > 0 && (
                      <div className="flex items-baseline justify-between border-t border-border/20 pt-2">
                        <span className="text-xs text-muted-foreground">دفعة الاستلام:</span>
                        <span className="text-sm font-bold text-accent">{formatNumber(directDeliveryPayment)} ج.م</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleRequestPlan}
                  className="mt-5 w-full gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-white" />
                  طلب خطة السداد هذه عبر واتساب
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ──────── TAB 2: Bank Mortgage ──────── */}
          <TabsContent value="bank" className="mt-5 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Controls Column */}
              <div className="space-y-5">
                {/* Down Payment Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <Label className="text-foreground">الدفعة الأولى ({bankDownPercent}%)</Label>
                    <span className="font-bold text-accent">{formatNumber(bankDownPayment)} ج.م</span>
                  </div>
                  <Slider
                    value={[bankDownPercent]}
                    min={15}
                    max={50}
                    step={5}
                    onValueChange={(val) => setBankDownPercent(val[0])}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>15%</span>
                    <span>30%</span>
                    <span>50%</span>
                  </div>
                </div>

                {/* Years Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <Label className="text-foreground">مدة التمويل ({bankYears} سنة)</Label>
                    <span className="font-bold text-accent">{bankTotalMonths} شهر</span>
                  </div>
                  <Slider
                    value={[bankYears]}
                    min={3}
                    max={20}
                    step={1}
                    onValueChange={(val) => setBankYears(val[0])}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>3 سنوات</span>
                    <span>10 سنوات</span>
                    <span>20 سنة</span>
                  </div>
                </div>

                {/* Interest Rate Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <Label className="text-foreground">الفائدة السنوية المتوقعة ({bankInterestRate}%)</Label>
                    <span className="font-bold text-sky-500">{bankInterestRate}% سنويًا</span>
                  </div>
                  <Slider
                    value={[bankInterestRate]}
                    min={5}
                    max={25}
                    step={0.5}
                    onValueChange={(val) => setBankInterestRate(val[0])}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5%</span>
                    <span>12%</span>
                    <span>25%</span>
                  </div>
                </div>
              </div>

              {/* Summary Card Column */}
              <div className="flex flex-col justify-between rounded-2xl border border-sky-500/25 bg-sky-500/5 p-5">
                <div>
                  <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                    <span className="text-xs font-semibold text-muted-foreground">مبلغ التمويل البنكي</span>
                    <span className="font-bold text-foreground">{formatNumber(bankLoanAmount)} ج.م</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">القسط الشهري التقديري:</span>
                      <span className="text-xl font-extrabold text-foreground sm:text-2xl">
                        {formatNumber(bankMonthlyInstallment)} <span className="text-xs font-normal text-muted-foreground">ج.م / شهر</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border/20 pt-2">
                      <span className="text-xs text-muted-foreground">الدفعة الأولى:</span>
                      <span className="text-sm font-bold text-accent">{formatNumber(bankDownPayment)} ج.م</span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border/20 pt-2">
                      <span className="text-xs text-muted-foreground">إجمالي الفوائد التقديرية:</span>
                      <span className="text-sm font-bold text-muted-foreground">{formatNumber(bankTotalInterest)} ج.م</span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border/20 pt-2">
                      <span className="text-xs text-muted-foreground">إجمالي ما سيتم سداده:</span>
                      <span className="text-sm font-extrabold text-accent">{formatNumber(bankTotalPayment)} ج.م</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleRequestPlan}
                  className="mt-5 w-full gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-white" />
                  استشارة التمويل العقاري عبر واتساب
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground/75">
          * هذه الحاسبة استرشادية لمساعدتك في التخطيط المالي، وتعتمد خطط السداد النهائية على موافقة المطور أو الجهة التمويلية.
        </p>
      </CardContent>
    </Card>
  );
}
