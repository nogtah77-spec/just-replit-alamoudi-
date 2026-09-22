import { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calculator,
  Percent,
  Wallet,
  DollarSign,
  TrendingDown,
  MessageSquare,
  Layers,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { MortgageReportModal } from "@/components/admin/MortgageReportModal";

const STORAGE_KEY = "alm_mortgage_calculator_state";

interface SavedMortgageState {
  selectedPropertyId: string;
  propertyPrice: number;
  downPaymentPercent: number;
  loanYears: number;
  programId: string;
  customInterestRate: number;
}

const DEFAULT_MORTGAGE_STATE: SavedMortgageState = {
  selectedPropertyId: "",
  propertyPrice: 0,
  downPaymentPercent: 0,
  loanYears: 0,
  programId: "direct",
  customInterestRate: 0,
};

function getInitialMortgageState(): SavedMortgageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.propertyPrice === "number") {
        return {
          selectedPropertyId: typeof parsed.selectedPropertyId === "string" ? parsed.selectedPropertyId : "",
          propertyPrice: typeof parsed.propertyPrice === "number" ? parsed.propertyPrice : 0,
          downPaymentPercent: typeof parsed.downPaymentPercent === "number" ? parsed.downPaymentPercent : 0,
          loanYears: typeof parsed.loanYears === "number" ? parsed.loanYears : 0,
          programId: typeof parsed.programId === "string" ? parsed.programId : "direct",
          customInterestRate: typeof parsed.customInterestRate === "number" ? parsed.customInterestRate : 0,
        };
      }
    }
  } catch {}
  return DEFAULT_MORTGAGE_STATE;
}

const FINANCING_PROGRAMS = [
  { id: "direct", name: "تقسيط مباشر من المطور (0% بدون فوائد)", rate: 0, desc: "أقساط متساوية بدون فوائد بنكية" },
  { id: "cbe_3", name: "مبادرة التمويل العقاري (3% متناقصة)", rate: 3, desc: "لمحدودي ومتوسطي الدخل حتى 30 سنة" },
  { id: "cbe_8", name: "مبادرة التمويل العقاري (8% متناقصة)", rate: 8, desc: "للإسكان المتوسط وفوق المتوسط حتى 25 سنة" },
  { id: "commercial_14", name: "تمويل بنكي تجاري (14% سنوي)", rate: 14, desc: "للوحدات التجارية والإدارية" },
  { id: "custom", name: "نسبة فائدة مخصصة", rate: 10, desc: "تحديد نسبة الفائدة يدوياً" },
];

const PRESET_DURATIONS = [
  { val: 0.5, label: "0.5 سنة" },
  { val: 1, label: "1 سنة" },
  { val: 1.5, label: "1.5 سنة" },
  { val: 2, label: "سنتين" },
  { val: 2.5, label: "2.5 سنة" },
  { val: 3, label: "3 سنوات" },
  { val: 3.5, label: "3.5 سنة" },
  { val: 4, label: "4 سنوات" },
  { val: 5, label: "5 سنوات" },
  { val: 7, label: "7 سنوات" },
  { val: 10, label: "10 سنوات" },
  { val: 15, label: "15 سنة" },
  { val: 20, label: "20 سنة" },
  { val: 25, label: "25 سنة" },
];

function formatDurationBadge(years: number) {
  const months = Math.round(years * 12);
  if (years <= 0) return "0 شهر";
  if (years === 0.5) return "نصف سنة (6 أشهر)";
  if (years === 1) return "سنة واحدة (12 شهراً)";
  if (years === 1.5) return "سنة ونصف (18 شهراً)";
  if (years === 2) return "سنتان (24 شهراً)";
  if (years === 2.5) return "سنتان ونصف (30 شهراً)";
  if (years === 3) return "3 سنوات (36 شهراً)";
  if (years === 3.5) return "3.5 سنة (42 شهراً)";
  if (years % 1 !== 0) return `${years} سنة (${months} شهراً)`;
  if (years >= 3 && years <= 10) return `${years} سنوات (${months} شهراً)`;
  return `${years} سنة (${months} شهراً)`;
}

export default function MortgageCalculatorPage() {
  const { toast } = useToast();
  const { properties } = useData();

  // Load persisted state from localStorage (or clean zeroes if previously reset)
  const [initialState] = useState<SavedMortgageState>(getInitialMortgageState);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialState.selectedPropertyId);
  const [propertyPrice, setPropertyPrice] = useState<number>(initialState.propertyPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(initialState.downPaymentPercent);
  const [loanYears, setLoanYears] = useState<number>(initialState.loanYears);
  const [programId, setProgramId] = useState<string>(initialState.programId);
  const [customInterestRate, setCustomInterestRate] = useState<number>(initialState.customInterestRate);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Auto-persist any change so state remains permanently until reset
  useEffect(() => {
    const stateToSave: SavedMortgageState = {
      selectedPropertyId,
      propertyPrice,
      downPaymentPercent,
      loanYears,
      programId,
      customInterestRate,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {}
  }, [selectedPropertyId, propertyPrice, downPaymentPercent, loanYears, programId, customInterestRate]);

  // Property picker handler
  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    const prop = properties.find(p => p.id === id || p.code === id);
    if (prop && prop.price > 0) {
      setPropertyPrice(prop.price);
      toast({ title: `تم تعيين سعر العقار ${prop.code}: ${prop.price.toLocaleString("en-US")} ج.م` });
    }
  };

  // Reset calculator to zeroes and save permanently
  const handleResetCalculator = () => {
    setSelectedPropertyId("");
    setPropertyPrice(0);
    setDownPaymentPercent(0);
    setLoanYears(0);
    setProgramId("direct");
    setCustomInterestRate(0);
    setShowResetConfirm(false);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MORTGAGE_STATE));
    } catch {}

    toast({
      title: "تم تصفير حاسبة التمويل بالكامل ✓",
      description: "تمت إعادة تعيين وحفظ القيم كخانات فارغة بنجاح.",
    });
  };

  // Active interest rate
  const interestRate = useMemo(() => {
    if (programId === "custom") return customInterestRate;
    const prog = FINANCING_PROGRAMS.find(p => p.id === programId);
    return prog ? prog.rate : 0;
  }, [programId, customInterestRate]);

  // Calculations
  const downPaymentAmount = useMemo(() => {
    if (propertyPrice <= 0 || downPaymentPercent <= 0) return 0;
    return Math.round((propertyPrice * downPaymentPercent) / 100);
  }, [propertyPrice, downPaymentPercent]);

  const loanAmount = useMemo(() => {
    return Math.max(0, propertyPrice - downPaymentAmount);
  }, [propertyPrice, downPaymentAmount]);

  const totalMonths = Math.round(loanYears * 12);

  // Monthly installment calculation
  const { monthlyInstallment, totalInterest, totalPayment } = useMemo(() => {
    if (loanAmount <= 0 || totalMonths <= 0) {
      return { monthlyInstallment: 0, totalInterest: 0, totalPayment: propertyPrice };
    }

    if (interestRate === 0) {
      const monthly = Math.round(loanAmount / totalMonths);
      return {
        monthlyInstallment: monthly,
        totalInterest: 0,
        totalPayment: propertyPrice,
      };
    }

    const monthlyRate = interestRate / 100 / 12;
    const numerator = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths);
    const denominator = Math.pow(1 + monthlyRate, totalMonths) - 1;
    const monthly = denominator > 0 ? Math.round(numerator / denominator) : 0;
    const totalPay = monthly * totalMonths + downPaymentAmount;
    const totalInt = totalPay - propertyPrice;

    return {
      monthlyInstallment: monthly,
      totalInterest: Math.max(0, totalInt),
      totalPayment: totalPay,
    };
  }, [propertyPrice, loanAmount, totalMonths, interestRate, downPaymentAmount]);

  // Annual schedule breakdown (supporting fractional / half-year durations)
  const annualSchedule = useMemo(() => {
    if (loanAmount <= 0 || totalMonths <= 0 || loanYears <= 0) return [];
    const schedule = [];
    let balance = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    const totalYearsCount = Math.ceil(loanYears);

    for (let year = 1; year <= totalYearsCount; year++) {
      let yearInterest = 0;
      let yearPrincipal = 0;
      const monthsInThisYear = Math.min(12, totalMonths - (year - 1) * 12);

      for (let month = 1; month <= monthsInThisYear; month++) {
        if (balance <= 0) break;
        const interest = interestRate === 0 ? 0 : balance * monthlyRate;
        const principal = monthlyInstallment - interest;
        yearInterest += interest;
        yearPrincipal += principal;
        balance = Math.max(0, balance - principal);
      }

      const isPartial = monthsInThisYear < 12;
      const yearLabel = isPartial
        ? `السنة ${year} (${monthsInThisYear} أشهر)`
        : `السنة ${year}`;

      schedule.push({
        year,
        yearLabel,
        yearlyPayment: Math.round(yearPrincipal + yearInterest),
        principalPaid: Math.round(yearPrincipal),
        interestPaid: Math.round(yearInterest),
        remainingBalance: Math.round(balance),
      });
    }

    return schedule;
  }, [loanAmount, totalMonths, loanYears, interestRate, monthlyInstallment]);

  // Share calculation summary to WhatsApp
  const handleShareWhatsApp = () => {
    const text =
      `*خطة التمويل والأقساط - العمودي للتسويق العقاري* 🏢\n\n` +
      `💰 *سعر العقار:* ${propertyPrice.toLocaleString("en-US")} ج.م\n` +
      `💵 *المقدم (${downPaymentPercent}%):* ${downPaymentAmount.toLocaleString("en-US")} ج.م\n` +
      `🏦 *المبلغ الممول:* ${loanAmount.toLocaleString("en-US")} ج.م\n` +
      `📅 *مدة السداد:* ${formatDurationBadge(loanYears)}\n` +
      `📊 *الفائدة:* ${interestRate}%\n` +
      `--------------------------------\n` +
      `🌟 *القسط الشهري:* ${monthlyInstallment.toLocaleString("en-US")} ج.م / شهر\n` +
      `💳 *إجمالي المدفوع:* ${totalPayment.toLocaleString("en-US")} ج.م\n\n` +
      `للمزيد: ${window.location.origin}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId || p.code === selectedPropertyId) || null;
  }, [properties, selectedPropertyId]);

  const programName = useMemo(() => {
    return FINANCING_PROGRAMS.find(p => p.id === programId)?.name || "خطة تمويل عقاري";
  }, [programId]);

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0" dir="rtl">
        <AdminPageHeader
          title="حاسبة التمويل والأقساط"
          subtitle="حساب الأقساط الشهرية وجدول السداد السنوي وخطط التمويل"
          eyebrow="الخدمات المالية"
          icon={Calculator}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                className="border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500 font-bold gap-1.5 h-10 px-3.5 rounded-xl text-xs sm:text-sm shadow-sm transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                تصفير العدادات
              </Button>
              <Button
                onClick={() => setShowReportModal(true)}
                className="bg-[#A9927D] hover:bg-[#BBA591] text-[#10202D] font-black gap-2 h-10 px-4 rounded-xl shadow-md text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4" />
                تقرير PDF
              </Button>
              <Button
                onClick={handleShareWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 h-10 px-4 rounded-xl shadow-md text-xs sm:text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                مشاركة
              </Button>
            </div>
          }
        />

        {/* ── Top Summary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-accent/40 bg-gradient-to-br from-accent/15 via-card to-card shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">القسط الشهري</span>
                <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {monthlyInstallment.toLocaleString("en-US")}
                </span>
                <span className="text-xs font-bold text-accent">ج.م / شهر</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {totalMonths > 0 ? `${totalMonths} قسط شهري` : "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الدفعة الأولى (المقدم)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {downPaymentAmount.toLocaleString("en-US")}
                </span>
                <span className="text-xs font-bold text-muted-foreground">ج.م ({downPaymentPercent}%)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">المتبقي: {loanAmount.toLocaleString("en-US")} ج.م</p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">إجمالي الفوائد</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {totalInterest.toLocaleString("en-US")}
                </span>
                <span className="text-xs font-bold text-muted-foreground">ج.م</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {interestRate === 0 ? "بدون فوائد" : `فائدة ${interestRate}% سنوياً`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">إجمالي المبلغ المسدد</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {totalPayment.toLocaleString("en-US")}
                </span>
                <span className="text-xs font-bold text-muted-foreground">ج.م</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">شاملاً المقدم والأقساط</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Calculator Form & Schedule Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Inputs Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-accent" />
                  <CardTitle className="text-base font-bold">بيانات التمويل</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">

                {/* Pick Existing Property */}
                {properties.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">عقار من المنصة (اختياري):</Label>
                    <Select value={selectedPropertyId} onValueChange={handleSelectProperty}>
                      <SelectTrigger className="h-10 text-xs bg-background/80">
                        <SelectValue placeholder="اختر عقاراً لملء السعر..." />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.slice(0, 30).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.code} — {p.title} ({p.price ? p.price.toLocaleString("en-US") + " ج.م" : "غير محدد"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Property Price Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">سعر العقار (ج.م):</Label>
                    <span className="text-xs font-bold font-mono text-accent">
                      {propertyPrice.toLocaleString("en-US")} ج.م
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={propertyPrice === 0 ? "" : propertyPrice}
                    onChange={e => setPropertyPrice(Math.max(0, Number(e.target.value)))}
                    className="h-10 text-sm font-bold bg-background/80"
                    placeholder="0"
                  />
                </div>

                {/* Down Payment Slider & Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">نسبة المقدم:</Label>
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {downPaymentPercent}% ({downPaymentAmount.toLocaleString("en-US")} ج.م)
                    </span>
                  </div>
                  <Slider
                    value={[downPaymentPercent]}
                    min={0}
                    max={70}
                    step={5}
                    onValueChange={val => setDownPaymentPercent(val[0])}
                    className="py-1"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {[0, 10, 15, 20, 25, 30, 50].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDownPaymentPercent(pct)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          downPaymentPercent === pct
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loan Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">مدة السداد:</Label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLoanYears(prev => Math.max(0, Number((prev - 0.5).toFixed(1))))}
                        disabled={loanYears <= 0}
                        className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-30 flex items-center justify-center text-xs font-black text-foreground transition-all"
                        title="إنقاص نصف سنة (-6 أشهر)"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold font-mono text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                        {formatDurationBadge(loanYears)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLoanYears(prev => Math.min(30, Number((prev + 0.5).toFixed(1))))}
                        disabled={loanYears >= 30}
                        className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-30 flex items-center justify-center text-xs font-black text-foreground transition-all"
                        title="زيادة نصف سنة (+6 أشهر)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <Slider
                    value={[loanYears]}
                    min={0}
                    max={30}
                    step={0.5}
                    onValueChange={val => setLoanYears(val[0])}
                    className="py-1"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {PRESET_DURATIONS.map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setLoanYears(item.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          loanYears === item.val
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Financing Program Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">برنامج التمويل:</Label>
                  <Select value={programId} onValueChange={setProgramId}>
                    <SelectTrigger className="h-10 text-xs bg-background/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCING_PROGRAMS.map(prog => (
                        <SelectItem key={prog.id} value={prog.id} className="text-xs">
                          {prog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {FINANCING_PROGRAMS.find(p => p.id === programId)?.desc}
                  </p>
                </div>

                {/* Custom Rate Input if selected */}
                {programId === "custom" && (
                  <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border/60">
                    <Label className="text-xs font-bold text-foreground">نسبة الفائدة السنوية (%):</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={customInterestRate || ""}
                      onChange={e => setCustomInterestRate(Number(e.target.value))}
                      className="h-9 text-xs bg-background"
                      placeholder="9.5"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Annual Amortization Table (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border/80 bg-card shadow-sm h-full flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-accent" />
                    <CardTitle className="text-base font-bold">جدول السداد السنوي</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-border">
                    {formatDurationBadge(loanYears)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 px-3 font-bold">السنة</th>
                      <th className="py-2.5 px-3 font-bold">المسدد سنوياً</th>
                      <th className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">أصل الدين</th>
                      <th className="py-2.5 px-3 font-bold text-amber-600">الفائدة</th>
                      <th className="py-2.5 px-3 font-bold text-left">الرصيد المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {annualSchedule.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          لا توجد بيانات سداد حالياً
                        </td>
                      </tr>
                    ) : (
                      annualSchedule.map(row => (
                        <tr key={row.year} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-foreground">{row.yearLabel || `السنة ${row.year}`}</td>
                          <td className="py-2.5 px-3 font-bold">{row.yearlyPayment.toLocaleString("en-US")} ج.م</td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                            {row.principalPaid.toLocaleString("en-US")} ج.م
                          </td>
                          <td className="py-2.5 px-3 text-amber-600 font-medium">
                            {row.interestPaid > 0 ? row.interestPaid.toLocaleString("en-US") + " ج.م" : "0 ج.م"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-left text-muted-foreground font-semibold">
                            {row.remainingBalance.toLocaleString("en-US")} ج.م
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* ── Official Luxury PDF & Print Report Modal ── */}
        <MortgageReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          propertyPrice={propertyPrice}
          downPaymentPercent={downPaymentPercent}
          downPaymentAmount={downPaymentAmount}
          loanAmount={loanAmount}
          loanYears={loanYears}
          totalMonths={totalMonths}
          interestRate={interestRate}
          programName={programName}
          monthlyInstallment={monthlyInstallment}
          totalInterest={totalInterest}
          totalPayment={totalPayment}
          annualSchedule={annualSchedule}
          selectedProperty={selectedProperty}
        />

        {/* ── Confirmation Modal for Resetting Calculator ── */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent dir="rtl" className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
                تصفير حاسبة التمويل العقاري
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1.5 leading-relaxed">
                هل أنت متأكد أنك تريد تصفير حاسبة التمويل العقاري؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex items-center justify-end gap-2 mt-4">
              <AlertDialogCancel className="font-semibold text-xs sm:text-sm h-9 px-4">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetCalculator}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm h-9 px-4"
              >
                نعم، تصفير
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
