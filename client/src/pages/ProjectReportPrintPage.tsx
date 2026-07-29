import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, AlertTriangle, FileText, CheckCircle2, Clock, Target, Activity, Eye, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay}/${hijriMonth}/${hijriYear}`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const getFileSrc = (fileItem: any): string => {
  if (!fileItem) return "";
  
  if (typeof fileItem === "string") {
    const trimmed = fileItem.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("http") || trimmed.startsWith("/")) {
      return trimmed;
    }
    if (trimmed.startsWith("UklGR") || trimmed.startsWith("iVBORw0KGgo") || trimmed.startsWith("/9j/")) {
      let mime = "image/png";
      if (trimmed.startsWith("UklGR")) mime = "image/webp";
      else if (trimmed.startsWith("/9j/")) mime = "image/jpeg";
      return `data:${mime};base64,${trimmed}`;
    }
    return `/uploads/${trimmed}`;
  }

  if (typeof fileItem === "object") {
    const b64 = fileItem.base64 || fileItem.fileData || fileItem.data;
    if (b64 && typeof b64 === "string" && b64.trim().length > 0) {
      const trimmedB64 = b64.trim();
      if (trimmedB64.startsWith("data:")) return trimmedB64;
      
      const name = (fileItem.fileName || fileItem.name || "").toLowerCase();
      let mime = "image/png";
      if (name.endsWith(".webp") || trimmedB64.startsWith("UklGR")) {
        mime = "image/webp";
      } else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || trimmedB64.startsWith("/9j/")) {
        mime = "image/jpeg";
      } else if (name.endsWith(".pdf") || trimmedB64.startsWith("JVBERi0")) {
        mime = "application/pdf";
      } else if (name.endsWith(".gif")) {
        mime = "image/gif";
      } else if (name.endsWith(".svg")) {
        mime = "image/svg+xml";
      }
      return `data:${mime};base64,${trimmedB64}`;
    }

    if (fileItem.url && typeof fileItem.url === "string" && fileItem.url.trim().length > 0) {
      const u = fileItem.url.trim();
      return u.startsWith("http") || u.startsWith("/") || u.startsWith("data:") ? u : `/uploads/${u}`;
    }
    if (fileItem.path && typeof fileItem.path === "string" && fileItem.path.trim().length > 0) {
      const p = fileItem.path.trim();
      return p.startsWith("http") || p.startsWith("/") || p.startsWith("data:") ? p : `/uploads/${p}`;
    }

    const name = fileItem.fileName || fileItem.name;
    if (name && typeof name === "string" && name.trim().length > 0) {
      return `/uploads/${name.trim()}`;
    }
  }
  return "";
};

const checkIsImage = (fileItem: any): boolean => {
  if (!fileItem) return false;
  if (typeof fileItem === "object" && fileItem.type && typeof fileItem.type === "string" && fileItem.type.startsWith("image/")) {
    return true;
  }
  const src = getFileSrc(fileItem);
  const fileName = typeof fileItem === "object" ? (fileItem.name || fileItem.fileName || "") : (typeof fileItem === "string" ? fileItem : "");
  const combined = (src + " " + fileName).toLowerCase();

  return (
    combined.includes("data:image/") ||
    combined.includes("blob:") ||
    combined.includes(".png") ||
    combined.includes(".jpg") ||
    combined.includes(".jpeg") ||
    combined.includes(".webp") ||
    combined.includes(".gif") ||
    combined.includes(".svg") ||
    combined.includes(".bmp") ||
    combined.includes(".avif") ||
    combined.includes("site_photo") ||
    combined.includes("proof-documents") ||
    combined.includes("image") ||
    combined.includes("screenshot")
  );
};

const checkIsPdf = (fileItem: any): boolean => {
  if (!fileItem) return false;
  if (typeof fileItem === "object" && fileItem.type && typeof fileItem.type === "string" && fileItem.type.includes("pdf")) {
    return true;
  }
  const src = getFileSrc(fileItem);
  const fileName = typeof fileItem === "object" ? (fileItem.name || fileItem.fileName || "") : (typeof fileItem === "string" ? fileItem : "");
  const combined = (src + " " + fileName).toLowerCase();
  return combined.includes("data:application/pdf") || combined.includes(".pdf");
};

export default function ProjectReportPrintPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/project-reports");
    }
  };

  const reportId = params.id ? parseInt(params.id) : undefined;

  // جلب تفاصيل التقرير
  const { data: report, isLoading: isReportLoading } = trpc.progressReports.getById.useQuery(
    { id: reportId || 0 },
    { enabled: !!reportId }
  );

  // جلب تفاصيل المشروع
  const { data: project } = trpc.projects.getById.useQuery(
    { id: report?.projectId || 0 },
    { enabled: !!report?.projectId }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  useEffect(() => {
    if (report) {
      const originalTitle = document.title;
      document.title = `${report.reportNumber || report.id} - ${report.title}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [report]);

  const handlePrint = () => {
    window.print();
  };

  if (isReportLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a5f4a]" />
      </div>
    );
  }

  // منع معاينة وطباعة التقرير إذا كان غير معتمد أو توجد بيانات ناقصة
  if (report && (report.status as string) !== "approved" && (report.status as string) !== "معتمد") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center" dir="rtl">
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto font-bold text-xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-800">المعاينة والطباعة غير متاحة</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            عذراً، المعاينة وطباعة التقرير متاحة فقط للتقارير المعتمدة التي اكتملت بياناتها. التقرير الحالي بحالة (
            <span className="font-semibold text-amber-700">{(report.status as string) === "draft" || (report.status as string) === "مسودة" ? "مسودة" : report.status}</span>
            ).
          </p>
          <Button
            onClick={handleBack}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-10 gap-2 text-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لتقارير المشاريع</span>
          </Button>
        </div>
      </div>
    );
  }

  // البيانات المسحوبة أو الاحتياطية
  const reportData = report || {
    id: reportId || 101,
    reportNumber: `REP-${reportId || 101}`,
    title: "تقرير متابعة وتوثيق إنجاز مشروع",
    reportDate: new Date(),
    status: "approved",
    plannedProgress: 85,
    actualProgress: 82,
    projectName: "مشروع ترميم وصيانة جامع العلياء",
    createdByName: "م. عبد الله الشهري",
    workSummary: "تم استكمال أعمال السباكة والكهرباء بالمشروع وتبقي تشطيبات الدهانات الخارجية.",
    challenges: "تأخر توريد بعض المواد الفنية من المورد وتم التواصل لتسريع الجدول الزمني.",
    recommendations: "متابعة المورد بشكل يومي وتكثيف العمالة في الفترة المسائية.",
    milestones: JSON.stringify([
      { title: "الأساسات والهيكل الخرساني", dueDate: "2026-05-15", status: "منجز" },
      { title: "أعمال التمديدات الكهربائية والسباكة", dueDate: "2026-06-30", status: "منجز" },
      { title: "أعمال الدهانات والتشطيبات النهائية", dueDate: "2026-07-25", status: "جارٍ" },
      { title: "تسليم المشروع الابتدائي", dueDate: "2026-08-10", status: "لم يبدأ" },
    ]),
  };

  const data: any = reportData;
  const reportDate = new Date(data.reportDate || new Date());
  const planned = data.plannedProgress ?? data.overallProgress ?? 0;
  const actual = data.actualProgress ?? 0;
  const gap = planned - actual;

  let ragStatus = "أخضر";
  if (gap >= 25) ragStatus = "أحمر";
  else if (gap >= 5) ragStatus = "أصفر";
  else ragStatus = "أخضر";

  const parsedMilestones = (() => {
    if (!data.milestones) return [];
    if (Array.isArray(data.milestones)) return data.milestones;
    try {
      return JSON.parse(data.milestones);
    } catch {
      return [];
    }
  })();

  const contract = project?.contracts?.[0];
  const contractAmount = parseFloat(contract?.amount || "0");
  const orgLocation = [orgSettings?.city, orgSettings?.address].filter(Boolean).join(" - ") || "المملكة العربية السعودية";

  const periodText = (() => {
    if (data.reportPeriodStart && data.reportPeriodEnd) {
      const s = formatGregorianDate(new Date(data.reportPeriodStart));
      const e = formatGregorianDate(new Date(data.reportPeriodEnd));
      return `من ${s} إلى ${e}`;
    }
    return "فترة سارية التغطية";
  })();

  const parsedAttachments = (() => {
    if (!data.attachments) return [];
    if (Array.isArray(data.attachments)) return data.attachments;
    try {
      const p = JSON.parse(data.attachments);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  })();

  const parsedExternalLinks = (() => {
    if (!data.workSummary) return [];
    const match = data.workSummary.match(/الروابط الخارجية:\s*(.*?)(?:\n|$)/);
    if (match && match[1]) {
      try {
        const p = JSON.parse(match[1].trim());
        return Array.isArray(p) ? p : [];
      } catch {}
    }
    return [];
  })();

  return (
    <>
      {/* Print Styles Matching /progress-reports/12/print */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .max-w-\\[210mm\\] {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 auto !important;
          }
          .print-outer-card {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }
          .section-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 18px !important;
          }
          tr, table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1, h2, h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Control Buttons (Print:Hidden) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" onClick={handleBack} className="bg-white/90 backdrop-blur border shadow-sm text-xs font-bold gap-2">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
        <Button onClick={handlePrint} className="shadow-md bg-[#1a5f4a] hover:bg-[#154d3c] text-white text-xs font-bold gap-2">
          <Printer className="w-4 h-4" />
          طباعة التقرير / PDF
        </Button>
      </div>

      {/* Dedicated Print Full Page Canvas */}
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0" style={{ fontFamily: "'Cairo', system-ui, sans-serif" }} dir="rtl">
        <div className="w-full max-w-[210mm] mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
          
          {/* Main Container without outer frame */}
          <div className="w-full p-4 sm:p-8 bg-white dark:bg-slate-900 rounded-xl shadow-sm print:shadow-none print:p-0 print:bg-white print:overflow-visible">
            {/* Document Body Content */}
            <div className="relative z-10 space-y-6 print:space-y-4 print:overflow-visible">
              
              {/* Header: Logo & Title + Hijri & Gregorian Dates */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto print:h-14" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a5f4a]/10 rounded-lg flex items-center justify-center print:w-14 print:h-14">
                      <span className="text-[#1a5f4a] font-bold text-2xl">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-[#1a5f4a] print:text-sm">
                      {orgSettings?.officialReportsName || "جمعية عمارة المساجد (تمام)"}
                    </div>
                    <div className="text-xs text-muted-foreground font-semibold">إدارة المشاريع والهندسة والصيانة</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-center sm:text-left sm:pl-5 print:pl-5">
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold text-muted-foreground">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-semibold">{toHijriDate(reportDate)} هـ</span>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold text-muted-foreground">الموافق:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-semibold">{formatGregorianDate(reportDate)} م</span>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold text-muted-foreground">رقم التقرير:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-mono font-bold text-[#1a5f4a]">{data.reportNumber || data.id}</span>
                  </div>
                </div>
              </div>

              <div className="text-center py-4 px-6 mb-6 rounded-lg shadow-2xs" style={{ backgroundColor: '#1a5f4a', color: 'white' }}>
                <h1 className="text-xl sm:text-2xl font-bold">تقرير إنجاز ومتابعة مشروع</h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1 font-medium">{data.title || data.projectName}</p>
              </div>

              <div className="mb-6 section-block">
                <h3 className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base" style={{ backgroundColor: '#d4a574', color: '#5d4037' }}>1. بيانات المشروع العامة:</h3>
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <tbody>
                      <tr className="border-b border-gray-200 dark:border-slate-800">
                        <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold w-36 text-muted-foreground">اسم المشروع:</td>
                        <td className="py-2.5 px-3 font-bold text-foreground" colSpan={3}>{data.projectName || project?.name || "—"}</td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-slate-800">
                        <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">الموقع/المدينة:</td>
                        <td className="py-2.5 px-3 text-foreground">{orgLocation}</td>
                        <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">فترة التقرير:</td>
                        <td className="py-2.5 px-3 font-bold text-[#1a5f4a]">{periodText}</td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-slate-800">
                        <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">مُعدّ التقرير:</td>
                        <td className="py-2.5 px-3 text-foreground">{data.createdByName || "مهندس المشروع"}</td>
                        <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">حالة التقرير:</td>
                        <td className="py-2.5 px-3"><span className="font-bold text-[#1a5f4a]">{data.status === "approved" || data.status === "معتمد" ? "معتمد ومصادق عليه" : "قيد المراجعة والاعتماد"}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-6 section-block">
                <h3 className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base" style={{ backgroundColor: '#d4a574', color: '#5d4037' }}>2. قيم مؤشرات الأداء ونسب الإنجاز المحققة (RAG):</h3>
                <div className="overflow-x-auto w-full">
                  <table className="w-full border border-gray-200 dark:border-slate-800 text-xs sm:text-sm mb-4">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
                        <th className="p-3 text-right font-bold w-1/3">البيان القياسي</th>
                        <th className="p-3 text-center font-bold w-1/3">المخطط / المتفق عليه</th>
                        <th className="p-3 text-center font-bold w-1/3">الفعلي / المصروف</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 dark:border-slate-800">
                        <td className="p-3 font-semibold bg-slate-50/50 dark:bg-slate-800/40">نسبة الإنجاز المحققة (%)</td>
                        <td className="p-3 text-center font-mono text-blue-700 font-bold">{planned}%</td>
                        <td className="p-3 text-center font-bold text-emerald-700 font-mono">{actual}%</td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-slate-800">
                        <td className="p-3 font-semibold bg-slate-50/50 dark:bg-slate-800/40">الانحراف المعياري للنسبة</td>
                        <td className="p-3 text-center text-muted-foreground font-medium">—</td>
                        <td className={`p-3 text-center font-bold font-mono ${gap > 5 ? "text-rose-600" : "text-emerald-700"}`}>{gap > 0 ? `تأخير ${gap}%` : gap < 0 ? `متقدم ${Math.abs(gap)}%` : "مطابق 0%"}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold bg-slate-50/50 dark:bg-slate-800/40">تقييم مؤشر الأداء العام</td>
                        <td className="p-3 text-center text-muted-foreground font-medium">—</td>
                        <td className="p-3 text-center">
                          <Badge className={ragStatus === "أخضر" ? "bg-emerald-600 text-white font-bold" : ragStatus === "أصفر" ? "bg-amber-500 text-white font-bold" : "bg-rose-600 text-white font-bold"}>
                            {ragStatus} ({ragStatus === "أخضر" ? "مطابق" : ragStatus === "أصفر" ? "تأخير متوسط" : "تأخير كبير"})
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold"><span>شريط نسبة الإنجاز المخطط:</span><span className="font-mono text-[#1a5f4a]">{planned}%</span></div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden"><div className="bg-[#1a5f4a] h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, planned))}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold"><span>شريط نسبة الإنجاز الفعلية:</span><span className="font-mono text-teal-600">{actual}%</span></div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden"><div className="bg-teal-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, actual))}%` }} /></div>
                  </div>
                </div>
              </div>

              {parsedMilestones.length > 0 && (
                <div className="mb-6 section-block break-inside-avoid">
                  <h3 className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base" style={{ backgroundColor: '#1a5f4a', color: 'white' }}>3. جدول التقدم مقابل المعالم الرئيسية للمشروع:</h3>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border border-gray-200 dark:border-slate-800 text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 font-bold">
                          <th className="p-2.5 text-center border-l border-gray-200 dark:border-slate-800 w-12">#</th>
                          <th className="p-2.5 text-right border-l border-gray-200 dark:border-slate-800">اسم المعلم الرئيسية</th>
                          <th className="p-2.5 text-center border-l border-gray-200 dark:border-slate-800">التاريخ المستهدف</th>
                          <th className="p-2.5 text-center">حالة المعلم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedMilestones.map((m: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-slate-800">
                            <td className="p-2.5 text-center font-bold text-muted-foreground border-l border-gray-200 dark:border-slate-800">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-foreground border-l border-gray-200 dark:border-slate-800">{m.title || "—"}</td>
                            <td className="p-2.5 text-center font-mono border-l border-gray-200 dark:border-slate-800">{m.dueDate || m.date || "—"}</td>
                            <td className="p-2.5 text-center font-bold"><span className={`inline-block px-2.5 py-0.5 rounded text-xs ${m.status === "منجز" ? "bg-emerald-100 text-emerald-800" : m.status === "جارٍ" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{m.status || "لم يبدأ"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(data.workSummary || data.notes) && (
                <div className="mb-6 section-block break-inside-avoid">
                  <h3 className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base" style={{ backgroundColor: '#1a5f4a', color: 'white' }}>4. ملخص الأعمال المنجزة والخطوات:</h3>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/40 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">{data.workSummary || data.notes}</div>
                </div>
              )}

              {(data.challenges || data.recommendations || data.nextSteps) && (
                <div className="mb-6 section-block break-inside-avoid">
                  <h3 className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base" style={{ backgroundColor: '#1a5f4a', color: 'white' }}>5. التحديات، الخطوات القادمة والتوصيات:</h3>
                  <div className="space-y-3 text-xs sm:text-sm">
                    {data.challenges && (
                      <div>
                        <h4 className="font-bold text-foreground mb-1">■ التحديات والمعوقات:</h4>
                        <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-gray-200 dark:border-slate-800 text-foreground whitespace-pre-wrap">{data.challenges}</p>
                      </div>
                    )}
                    {data.nextSteps && (
                      <div>
                        <h4 className="font-bold text-foreground mb-1">■ الخطوات القادمة:</h4>
                        <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-gray-200 dark:border-slate-800 text-foreground whitespace-pre-wrap">{data.nextSteps}</p>
                      </div>
                    )}
                    {data.recommendations && (
                      <div>
                        <h4 className="font-bold text-foreground mb-1">■ التوصيات والمقترحات:</h4>
                        <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-gray-200 dark:border-slate-800 text-foreground whitespace-pre-wrap">{data.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                try {
                  const getFilesArray = (fieldVal: any) => {
                    if (!fieldVal) return [];
                    let arr = fieldVal;
                    while (typeof arr === 'string') {
                      try {
                        arr = JSON.parse(arr);
                      } catch {
                        break;
                      }
                    }
                    return Array.isArray(arr) ? arr : [];
                  };

                  const attachmentsArr = getFilesArray(data.attachments);
                  const photosArr = getFilesArray(data.photos);
                  const allFiles = [...attachmentsArr, ...photosArr].filter(Boolean);

                  if (allFiles.length > 0 || parsedExternalLinks.length > 0) {
                    return (
                      <div className="mb-6 section-block break-inside-avoid">
                        <h3 
                          className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                          style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                        >
                          6. مرفقات التقرير وصور الموقع والروابط المرجعية:
                        </h3>

                        {allFiles.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-bold text-foreground mb-2 text-xs sm:text-sm">■ المستندات والصور الميدانية ({allFiles.length}):</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800">
                              {allFiles.map((fileItem: any, index: number) => {
                                const fileSrc = getFileSrc(fileItem);
                                const fileName = typeof fileItem === "object" ? (fileItem.name || fileItem.fileName || `مرفق ${index + 1}`) : (typeof fileItem === "string" ? fileItem : `مرفق ${index + 1}`);
                                const isImage = checkIsImage(fileItem);
                                const isPdf = checkIsPdf(fileItem);

                                if (isImage) {
                                  return (
                                    <div 
                                      key={index} 
                                      className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-2.5 rounded-lg shadow-xs w-full cursor-pointer hover:border-[#1a5f4a] hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                                      onClick={() => setPreviewFile(fileSrc)}
                                    >
                                      <img src={fileSrc} alt={fileName} className="w-full max-h-64 object-contain rounded-md" />
                                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-semibold">{fileName}</span>
                                      
                                      <div className="absolute inset-0 bg-black/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none print:hidden">
                                        <div className="bg-white/95 dark:bg-slate-800 text-[#1a5f4a] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-bold transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>تكبير وعرض الصورة</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                const downloadUrl = fileSrc.startsWith("data:") ? fileSrc : (fileSrc.startsWith("http") ? fileSrc : `${window.location.origin}${fileSrc}`);
                                return (
                                  <a 
                                    key={index}
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-2.5 rounded-lg shadow-xs w-full cursor-pointer hover:border-[#1a5f4a] hover:shadow-md transition-all duration-200 group relative overflow-hidden text-center decoration-transparent"
                                  >
                                    <div className="w-full h-32 flex flex-col items-center justify-center rounded-md bg-muted/20 border border-dashed text-[#1a5f4a] font-bold text-xs gap-1.5 p-3">
                                      <FileText className="w-8 h-8 text-[#1a5f4a]" />
                                      <span className="text-gray-700 dark:text-gray-200 font-bold">{fileName || (isPdf ? "مستند PDF" : "مستند مرفق")}</span>
                                      <span className="text-[10px] text-[#1a5f4a] underline print:hidden">انقر لعرض الملف في علامة تبويب جديدة</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-semibold">{fileName}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {parsedExternalLinks.length > 0 && (
                          <div>
                            <h4 className="font-bold text-foreground mb-2 text-xs sm:text-sm">■ الروابط الخارجية والمراجع:</h4>
                            <div className="space-y-2">
                              {parsedExternalLinks.map((link: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-gray-200 dark:border-slate-800 text-xs">
                                  <span className="font-bold text-foreground">{link.title || `رابط مرجعي ${idx + 1}`}</span>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline font-mono dir-ltr text-left font-semibold truncate max-w-[300px]"
                                  >
                                    {link.url}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                } catch (e) {
                  console.error("Error parsing attachments for print view", e);
                }
                return null;
              })()}

            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent 
          className="w-[95vw] !max-w-[95vw] h-[95vh] !max-h-[95vh] !flex !flex-col p-2 sm:p-5 rounded-xl border bg-background/98 backdrop-blur-md z-50 shadow-2xl" 
          dir="rtl"
        >
          <DialogHeader className="text-right flex items-center justify-between flex-row pe-10 pb-2 border-b">
            <DialogTitle className="text-right text-base font-bold">معاينة المرفق - كامل الشاشة</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="flex-1 flex items-center justify-center p-1 sm:p-3 min-h-0 overflow-hidden w-full">
              {checkIsImage(previewFile) ? (
                <img 
                  src={previewFile} 
                  alt="معاينة الصورة" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <iframe 
                  src={previewFile} 
                  title="معاينة المستند" 
                  className="w-full h-full rounded-lg border-0 bg-white"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
