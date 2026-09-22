import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Download,
  Share2,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Property } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";

interface AnnualRow {
  year: number;
  yearLabel?: string;
  yearlyPayment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

interface MortgageReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyPrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  loanAmount: number;
  loanYears: number;
  totalMonths: number;
  interestRate: number;
  programName: string;
  monthlyInstallment: number;
  totalInterest: number;
  totalPayment: number;
  annualSchedule: AnnualRow[];
  selectedProperty?: Property | null;
}

export function MortgageReportModal({
  open,
  onOpenChange,
  propertyPrice,
  downPaymentPercent,
  downPaymentAmount,
  loanAmount,
  loanYears,
  totalMonths,
  interestRate,
  programName,
  monthlyInstallment,
  totalInterest,
  totalPayment,
  annualSchedule,
  selectedProperty,
}: MortgageReportModalProps) {
  const { toast } = useToast();
  const [clientName, setClientName] = useState<string>("");
  const [advisorName, setAdvisorName] = useState<string>("إدارة الاستشارات والتمويل العقاري");
  const [customNotes, setCustomNotes] = useState<string>(
    "هذا التقرير بمثابة دراسة مالية استرشادية، وتخضع الشروط النهائية لموافقة الجهة الممولة والتقييم الائتماني."
  );
  const [downloading, setDownloading] = useState<boolean>(false);

  const reportId = React.useMemo(() => {
    return `ALM-MORT-${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  const issueDate = new Date().toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const durationText = React.useMemo(() => {
    if (loanYears <= 0) return "0 شهر";
    if (loanYears === 0.5) return `نصف سنة (6 أقساط)`;
    if (loanYears === 1) return `1 سنة (12 قسطاً)`;
    if (loanYears === 1.5) return `1.5 سنة (18 قسطاً)`;
    if (loanYears === 2) return `سنتان (24 قسطاً)`;
    if (loanYears === 2.5) return `2.5 سنة (30 قسطاً)`;
    if (loanYears >= 3 && loanYears <= 10 && loanYears % 1 === 0) return `${loanYears} سنوات (${totalMonths} قسطاً)`;
    return `${loanYears} سنة (${totalMonths} قسطاً)`;
  }, [loanYears, totalMonths]);

  const getReportStyles = () => `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
      line-height: 1.45;
      font-size: 12px;
      direction: rtl;
      text-align: right;
    }
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px 26px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #a9927d;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #10202d;
      letter-spacing: -0.3px;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #a9927d;
      margin-top: 1px;
    }
    .meta-box {
      text-align: left;
      font-size: 10.5px;
      color: #475569;
    }
    .meta-badge {
      display: inline-block;
      background: #10202d;
      color: #ffffff;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 3px;
      font-family: monospace;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .info-card-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #a9927d;
      margin-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11.5px;
    }
    .info-label { color: #64748b; }
    .info-value { font-weight: 700; color: #0f172a; }
    .hero-summary {
      background: linear-gradient(135deg, #10202d 0%, #173044 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 14px;
      border: 1.5px solid #a9927d;
    }
    .summary-title {
      font-size: 11px;
      font-weight: 800;
      color: #c7b6a6;
      margin-bottom: 8px;
      text-align: center;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      text-align: center;
    }
    .metric-item {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(185, 154, 104, 0.35);
      border-radius: 6px;
      padding: 8px 4px;
    }
    .metric-label { font-size: 9.5px; color: #cbd5e1; margin-bottom: 2px; }
    .metric-val { font-size: 14px; font-weight: 900; color: #ffffff; }
    .metric-val.gold { color: #ddd1c4; font-size: 16px; }
    .metric-sub { font-size: 9px; color: #94a3b8; margin-top: 1px; }
    .table-container { margin-bottom: 14px; }
    .section-title { font-size: 11.5px; font-weight: 800; color: #10202d; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: right; }
    th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 800;
      padding: 6px 8px;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    tr:nth-child(even) td { background: #fcfcfc; }
    .num { font-weight: 700; }
    .green { color: #059669; }
    .amber { color: #d97706; }
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 10px;
      color: #92400e;
      margin-bottom: 14px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 12px;
      padding-top: 4px;
    }
    .sig-box {
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      min-height: 60px;
    }
    .sig-title { font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 20px; }
    .sig-line { border-top: 1px solid #94a3b8; width: 60%; margin: 0 auto; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #64748b;
    }
    .contact-items { display: flex; gap: 10px; }
  `;

  const getReportBodyHTML = () => `
    <div class="report-container">
      <div class="header">
        <div>
          <div class="brand-title">العمودي للتسويق العقاري</div>
          <div class="brand-subtitle">خطة التمويل وجدول سداد الأقساط المعتمدة</div>
        </div>
        <div class="meta-box">
          <div class="meta-badge">${reportId}</div>
          <div><strong>تاريخ الإصدار:</strong> ${issueDate}</div>
          <div><strong>المستشار المالي:</strong> ${advisorName}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-title">بيانات العميل وخطة السداد</div>
          <div class="info-row">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${clientName.trim() || "العميل الكريم"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">برنامج التمويل:</span>
            <span class="info-value">${programName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">مدة السداد:</span>
            <span class="info-value">${durationText}</span>
          </div>
          <div class="info-row">
            <span class="info-label">معدل الفائدة:</span>
            <span class="info-value">${interestRate === 0 ? "0% (بدون أي فوائد)" : `${interestRate}% سنوياً`}</span>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-title">تفاصيل العقار محل الدراسة</div>
          <div class="info-row">
            <span class="info-label">كود العقار:</span>
            <span class="info-value">${selectedProperty?.code || "عقار مختار"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">وصف العقار:</span>
            <span class="info-value">${selectedProperty?.title || "وحدة عقارية فاخرة"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">الموقع / المنطقة:</span>
            <span class="info-value">${selectedProperty?.location || "القاهرة الجديدة / مدينتي"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">سعر العقار الإجمالي:</span>
            <span class="info-value" style="color:#a9927d;">${propertyPrice.toLocaleString("en-US")} ج.م</span>
          </div>
        </div>
      </div>

      <div class="hero-summary">
        <div class="summary-title">ملخص الخطة المالية والاستثمارية للأقساط</div>
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">القسط الشهري</div>
            <div class="metric-val gold">${monthlyInstallment.toLocaleString("en-US")} <small style="font-size:9px;">ج.م</small></div>
            <div class="metric-sub">ثابت على ${totalMonths} شهر</div>
          </div>

          <div class="metric-item">
            <div class="metric-label">الدفعة الأولى (المقدم)</div>
            <div class="metric-val">${downPaymentAmount.toLocaleString("en-US")} <small style="font-size:9px;">ج.م</small></div>
            <div class="metric-sub">بنسبة ${downPaymentPercent}%</div>
          </div>

          <div class="metric-item">
            <div class="metric-label">المبلغ الممول</div>
            <div class="metric-val">${loanAmount.toLocaleString("en-US")} <small style="font-size:9px;">ج.م</small></div>
            <div class="metric-sub">أصل التمويل العقاري</div>
          </div>

          <div class="metric-item">
            <div class="metric-label">إجمالي المبلغ المسدد</div>
            <div class="metric-val">${totalPayment.toLocaleString("en-US")} <small style="font-size:9px;">ج.م</small></div>
            <div class="metric-sub">${totalInterest > 0 ? `شاملاً ${totalInterest.toLocaleString("en-US")} ج.م فوائد` : "بدون أي فوائد إضافية"}</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <div class="section-title">جدول استهلاك وسداد الأقساط السنوي</div>
        <table>
          <thead>
            <tr>
              <th>السنة</th>
              <th>إجمالي المسدد سنوياً</th>
              <th>أصل القسط المسدد</th>
              <th>الفوائد المسددة</th>
              <th style="text-align:left;">الرصيد المتبقي</th>
            </tr>
          </thead>
          <tbody>
            ${annualSchedule
              .map(
                (row) => `
              <tr>
                <td><strong>${row.yearLabel || `السنة ${row.year}`}</strong></td>
                <td class="num">${row.yearlyPayment.toLocaleString("en-US")} ج.م</td>
                <td class="num green">${row.principalPaid.toLocaleString("en-US")} ج.م</td>
                <td class="num amber">${row.interestPaid > 0 ? `${row.interestPaid.toLocaleString("en-US")} ج.م` : "0 ج.م"}</td>
                <td class="num" style="text-align:left; color:#475569;">${row.remainingBalance.toLocaleString("en-US")} ج.م</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="notes-box">
        <strong>ملاحظات هامة:</strong> ${customNotes}
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-title">اعتماد المستشار المالي / المدير التنفيذي</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-box">
          <div class="sig-title">توقيع العميل / استلام نسخة العرض</div>
          <div class="sig-line"></div>
        </div>
      </div>

      <div class="footer">
        <div>العمودي للتسويق العقاري — منصة العقارات الفاخرة</div>
        <div class="contact-items">
          <span>هاتف: 01000000000</span>
          <span>البريد: info@alamoudi.com</span>
          <span>الموقع: alamoudi-real-estate.vercel.app</span>
        </div>
      </div>
    </div>
  `;

  // 100% Reliable Direct PDF Downloader via Live DOM Capture (html-to-image + jsPDF)
  // NEVER opens print dialog!
  const handleDirectDownloadPDF = async () => {
    setDownloading(true);
    toast({
      title: "جارٍ تنزيل ملف PDF...",
      description: "يتم تجهيز وحفظ الملف في مجلد التنزيلات على جهازك",
    });

    try {
      // 1. Ensure jsPDF is loaded
      if (!(window as any).jspdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load jsPDF"));
          document.head.appendChild(script);
        });
      }

      // 2. Ensure html-to-image is loaded
      if (!(window as any).htmlToImage) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load html-to-image"));
          document.head.appendChild(script);
        });
      }

      const printableElement = document.getElementById("mortgage-report-printable-card");
      if (!printableElement) {
        throw new Error("Printable element not found in DOM");
      }

      // 3. Generate high-resolution PNG directly from the live DOM node with native Arabic text
      const imgDataUrl = await (window as any).htmlToImage.toPng(printableElement, {
        quality: 0.98,
        pixelRatio: 2.2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      // 4. Create A4 PDF and save directly
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;

      pdf.addImage(imgDataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير-التمويل-العقاري-${reportId}.pdf`);

      toast({
        title: "تم تنزيل ملف PDF بنجاح ✓",
        description: `تم حفظ الملف باسم: تقرير-التمويل-العقاري-${reportId}.pdf`,
      });
    } catch (err) {
      console.error("Direct PDF download failed:", err);
      toast({
        title: "حدث خطأ أثناء تنزيل الملف",
        description: "يرجى المحاولة مرة أخرى أو استخدام زر طباعة التقرير",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Direct Print Handler - ONLY for the Print Button
  const handlePrint = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير دراسة التمويل والأقساط - ${reportId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    ${getReportStyles()}
    @page { size: A4 portrait; margin: 8mm 12mm; }
    @media print {
      body { background: #ffffff; }
      .report-container { border: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  ${getReportBodyHTML()}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const text =
      `*تقرير دراسة التمويل والأقساط العقارية* 🏢\n` +
      `*العمودي للتسويق العقاري*\n` +
      `رقم التقرير: ${reportId}\n` +
      `العميل: ${clientName.trim() || "العميل المحترم"}\n\n` +
      `💰 *سعر العقار:* ${propertyPrice.toLocaleString("en-US")} ج.م\n` +
      `💵 *المقدم (${downPaymentPercent}%):* ${downPaymentAmount.toLocaleString("en-US")} ج.م\n` +
      `🏦 *المبلغ الممول:* ${loanAmount.toLocaleString("en-US")} ج.م\n` +
      `📅 *مدة السداد:* ${loanYears} سنوات (${totalMonths} شهر)\n` +
      `📊 *الفائدة:* ${interestRate}%\n` +
      `--------------------------------\n` +
      `🌟 *القسط الشهري:* ${monthlyInstallment.toLocaleString("en-US")} ج.م / شهر\n` +
      `💳 *إجمالي المبلغ المسدد:* ${totalPayment.toLocaleString("en-US")} ج.م\n\n` +
      `تم إعداد التقرير بواسطة: ${advisorName}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-accent/40 w-full min-w-0">
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#A9927D]/20 text-[#A9927D] flex items-center justify-center font-bold">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                  معاينة وتخصيص تقرير التمويل الرسمي (PDF Report)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تقرير دراسة الجدوى والتمويل العقاري الرسمي — جاهز للتحميل والطباعة الفورية
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-6 min-w-0">
          {/* 1. Customization Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم العميل (اختياري للتقرير):</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="مثال: أ / محمد عبد العزيز"
                className="h-9 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم المستشار المالي / المحرر:</Label>
              <Input
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                placeholder="مثال: إدارة الاستشارات والتمويل العقاري"
                className="h-9 text-xs bg-background"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-foreground">ملاحظات إضافية في أسفل التقرير:</Label>
              <Input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="أدخل أي بنود أو شروط خاصة ترغب في إظهارها..."
                className="h-9 text-xs bg-background"
              />
            </div>
          </div>

          {/* 2. In-App Report Canvas Preview (Live Capture Target) */}
          <div
            id="mortgage-report-printable-card"
            className="rounded-xl border border-[#A9927D]/40 bg-white text-slate-900 p-4 sm:p-6 shadow-md space-y-5 min-w-0"
            style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#A9927D] pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#10202D]">العمودي للتسويق العقاري</h3>
                <p className="text-xs font-bold text-[#A9927D] mt-0.5">
                  خطة التمويل وجدول سداد الأقساط المعتمدة
                </p>
              </div>
              <div className="text-left text-xs text-slate-500 space-y-1">
                <div className="inline-block bg-[#10202D] text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                  {reportId}
                </div>
                <div><strong>تاريخ الإصدار:</strong> {issueDate}</div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-[#A9927D] text-[11px] block">بيانات العميل والخطة</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">العميل:</span>
                  <span className="font-bold text-slate-900">{clientName.trim() || "العميل الكريم"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">البرنامج:</span>
                  <span className="font-bold text-slate-900">{programName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مدة السداد:</span>
                  <span className="font-bold text-slate-900">{durationText}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-[#A9927D] text-[11px] block">بيانات العقار</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">كود العقار:</span>
                  <span className="font-bold text-slate-900">{selectedProperty?.code || "عقار مختار"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نوع العقار:</span>
                  <span className="font-bold text-slate-900">{selectedProperty?.title || "وحدة عقارية فاخرة"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">سعر العقار:</span>
                  <span className="font-bold text-[#A9927D]">{propertyPrice.toLocaleString("en-US")} ج.م</span>
                </div>
              </div>
            </div>

            {/* Golden Summary KPIs */}
            <div className="rounded-xl bg-gradient-to-r from-[#10202D] via-[#1A3348] to-[#10202D] p-3.5 sm:p-4 text-white border border-[#A9927D]/60">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-2 sm:p-2.5 rounded-lg bg-white/5 border border-[#A9927D]/30">
                  <span className="text-[10px] sm:text-[11px] text-white/70 block">القسط الشهري</span>
                  <span className="text-base sm:text-lg font-black text-[#DDD1C4] block mt-0.5">
                    {monthlyInstallment.toLocaleString("en-US")} <small className="text-[9px]">ج.م</small>
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] sm:text-[11px] text-white/70 block">المقدم ({downPaymentPercent}%)</span>
                  <span className="text-sm sm:text-base font-black text-white block mt-0.5">
                    {downPaymentAmount.toLocaleString("en-US")} <small className="text-[9px]">ج.م</small>
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] sm:text-[11px] text-white/70 block">المبلغ الممول</span>
                  <span className="text-sm sm:text-base font-black text-white block mt-0.5">
                    {loanAmount.toLocaleString("en-US")} <small className="text-[9px]">ج.م</small>
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] sm:text-[11px] text-white/70 block">إجمالي المسدد</span>
                  <span className="text-sm sm:text-base font-black text-white block mt-0.5">
                    {totalPayment.toLocaleString("en-US")} <small className="text-[9px]">ج.م</small>
                  </span>
                </div>
              </div>
            </div>

            {/* Annual Breakdown Summary */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 block">جدول الاستهلاك السنوي</span>
              <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs w-full min-w-0">
                <table className="w-full text-right min-w-[480px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2">السنة</th>
                      <th className="p-2">المسدد سنوياً</th>
                      <th className="p-2 text-emerald-600">أصل الدين</th>
                      <th className="p-2 text-amber-600">الفوائد</th>
                      <th className="p-2 text-left">الرصيد المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {annualSchedule.slice(0, 5).map((row) => (
                      <tr key={row.year} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">{row.yearLabel || `السنة ${row.year}`}</td>
                        <td className="p-2 font-bold text-slate-900">{row.yearlyPayment.toLocaleString("en-US")} ج.م</td>
                        <td className="p-2 text-emerald-600 font-semibold">{row.principalPaid.toLocaleString("en-US")} ج.م</td>
                        <td className="p-2 text-amber-600 font-semibold">{row.interestPaid > 0 ? `${row.interestPaid.toLocaleString("en-US")} ج.م` : "0 ج.م"}</td>
                        <td className="p-2 font-mono text-left text-slate-600">{row.remainingBalance.toLocaleString("en-US")} ج.م</td>
                      </tr>
                    ))}
                    {annualSchedule.length > 5 && (
                      <tr>
                        <td colSpan={5} className="p-2 text-center text-xs text-slate-500 bg-slate-50 italic">
                          ... متبقي {annualSchedule.length - 5} سنوات مدرجة بالكامل في مستند PDF النهائي
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Signatures */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
              <strong>ملاحظات هامة:</strong> {customNotes}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-center text-xs text-slate-600">
              <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[60px]">
                <span className="font-bold block mb-4">اعتماد المستشار المالي / المدير التنفيذي</span>
                <div className="border-t border-slate-400 w-2/3 mx-auto"></div>
              </div>
              <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[60px]">
                <span className="font-bold block mb-4">توقيع العميل / استلام نسخة العرض</span>
                <div className="border-t border-slate-400 w-2/3 mx-auto"></div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-500">
              <span>العمودي للتسويق العقاري — منصة العقارات الفاخرة</span>
              <span>الموقع: alamoudi-real-estate.vercel.app</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs h-10 px-3.5"
            >
              <Share2 className="h-4 w-4" />
              مشاركة واتساب
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-border text-foreground font-bold gap-1.5 text-xs h-10 px-3.5"
            >
              <Printer className="h-4 w-4" />
              طباعة التقرير
            </Button>

            <Button
              onClick={handleDirectDownloadPDF}
              disabled={downloading}
              className="bg-[#A9927D] hover:bg-[#BBA591] text-[#10202D] font-black gap-2 text-xs sm:text-sm h-10 px-5 shadow-md"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ تنزيل الملف...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  تحميل ملف PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
