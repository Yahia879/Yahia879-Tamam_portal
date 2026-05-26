import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, AlertTriangle, FileText, CheckCircle2, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// دالة تحويل الأرقام إلى نص عربي
function numberToArabicText(num: number): string {
  if (num === 0) return "صفر";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = "";
    if (thousands === 1) result = "ألف";
    else if (thousands === 2) result = "ألفان";
    else if (thousands >= 3 && thousands <= 10) result = `${ones[thousands]} آلاف`;
    else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    let result = "";
    if (millions === 1) result = "مليون";
    else if (millions === 2) result = "مليونان";
    else if (millions >= 3 && millions <= 10) result = `${ones[millions]} ملايين`;
    else result = `${convertThousands(millions)} مليون`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  return `فقط ${convertMillions(Math.floor(num))} ريال`;
}

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

export default function ProgressReportPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const reportId = params.id ? parseInt(params.id) : undefined;
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // جلب تفاصيل التقرير
  const { data: report, isLoading: isReportLoading } = trpc.progressReports.getById.useQuery(
    { id: reportId || 0 },
    { enabled: !!reportId }
  );

  // جلب تفاصيل المشروع
  const { data: project, isLoading: isProjectLoading } = trpc.projects.getById.useQuery(
    { id: report?.projectId || 0 },
    { enabled: !!report?.projectId }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // تغيير عنوان التوثيق ليتطابق مع اسم التقرير عند الطباعة والتنزيل (يحدد اسم ملف الـ PDF)
  useEffect(() => {
    if (report) {
      const originalTitle = document.title;
      document.title = `${report.reportNumber} - ${report.title}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [report]);

  const handlePrint = () => {
    window.print();
  };

  if (isReportLoading || isProjectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">تقرير الإنجاز غير موجود</h2>
          <Button onClick={() => navigate("/progress-reports")}>
            العودة لتقارير الإنجاز
          </Button>
        </div>
      </div>
    );
  }

  const reportDate = new Date(report.reportDate || new Date());
  const contract = project?.contracts?.[0];
  const contractAmount = parseFloat(contract?.amount || "0");
  
  // استخلاص اسم الدفعة والمبالغ من محتوى التقرير
  const workSummaryText = report.workSummary || "";
  const paymentIdMatch = workSummaryText.match(/\[معرف الدفعة:\s*([^\]]+)\]/);
  const paymentId = paymentIdMatch ? paymentIdMatch[1] : null;

  const payment = project?.payments?.find((p: any) => 
    p.id?.toString() === paymentId || 
    paymentId?.toString().includes(p.id?.toString()) ||
    report.title.includes(p.description || p.paymentNumber)
  );

  const agreedPaymentAmount = payment ? parseFloat(payment.amount || "0") : 0;
  const actualBudgetSpent = parseFloat(report.budgetSpent || "0");
  const variance = report.variance ?? 0;
  const orgLocation = [orgSettings?.city, orgSettings?.address].filter(Boolean).join(" - ") || "—";

  // استخلاص الأعمال المنفذة فعلياً فقط لظهورها في هذا القسم
  const getActualWorkDone = (combined: string) => {
    if (!combined) return "";
    
    // البحث عن قسم الأعمال المنفذة فعلياً باستخدام تعبير نمطي يدعم كافة نهايات الأسطر
    const regex = /(?:الأعمال المنفذة فعلياً|المنفذة فعلياً):\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/;
    const match = combined.match(regex);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    
    // حالة احتياطية إذا كان العنوان موجوداً بدون سطر جديد مباشر
    const regexNoNewline = /(?:الأعمال المنفذة فعلياً|المنفذة فعلياً):\s*([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/;
    const matchNoNewline = combined.match(regexNoNewline);
    if (matchNoNewline && matchNoNewline[1].trim()) {
      return matchNoNewline[1].trim();
    }

    // إذا كان النص يحتوي على ترويسة الأعمال المجدولة فقط، فلا نعرضها لأن المستخدم يطلب الأعمال المنجزة فعلياً فقط
    if (combined.includes("الأعمال المجدولة للدفعة:")) {
      return "لا يوجد تفاصيل أعمال منفذة فعلياً.";
    }

    return combined.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();
  };

  const cleanWorkSummary = getActualWorkDone(workSummaryText);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important; /* Removes default browser margins, headers, and footers */
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: 210mm !important; /* Force body to A4 physical width */
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Custom layout that uses padding as page margin, guaranteeing perfect fit on Default browser settings */
          .max-w-\\[210mm\\] {
            width: 210mm !important;
            max-width: 210mm !important;
            padding: 10mm !important; /* Safe margin from A4 physical page edges */
            margin: 0 auto !important;
          }
          /* Keep frame border inside our custom page margin */
          .border-\\[3px\\] {
            border-width: 2px !important;
            padding: 18px !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      {/* أزرار التحكم */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" onClick={() => navigate("/progress-reports")} className="bg-white/90 backdrop-blur border shadow-sm">
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white">
          <Printer className="ml-2 h-4 w-4" />
          طباعة التقرير
        </Button>
      </div>

      {/* تصميم الصفحة المطبوعة A4 */}
      <div className="min-h-screen bg-white print:p-0 font-sans" dir="rtl">
        <div className="w-full max-w-[210mm] mx-auto p-4 sm:p-8 print:p-4 print:max-w-none">
          
          {/* إطار مزدوج فاخر للمستند يشبه قالب العقود */}
          <div className="w-full border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white shadow-lg print:shadow-none print:border-[2px] print:p-5">
            {/* خط ذهبي داخلي رفيع للإطار */}
            <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>
            
            {/* محتوى المستند */}
            <div className="relative z-10">
              
              {/* الترويسة - الشعار والتاريخ مثل قالب العقد */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto print:h-14" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center print:w-14 print:h-14">
                      <span className="text-primary font-bold text-2xl">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-primary print:text-sm">
                      {orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
                    </div>
                    <div className="text-xs text-gray-500">إدارة المشاريع والصيانة</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-center sm:text-left sm:pl-5 print:pl-5">
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{toHijriDate(reportDate)} هـ</span>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold">الموافق:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{formatGregorianDate(reportDate)} م</span>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold">رقم التقرير:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-mono">{report.reportNumber}</span>
                  </div>
                </div>
              </div>

              {/* البانر الرئيسي - مثل قالب العقد */}
              <div 
                className="text-center py-4 px-6 mb-6 rounded-lg"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                <h1 className="text-xl sm:text-2xl font-bold">
                  تقرير إنجاز دفعة مالية
                </h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1">
                  {report.title}
                </p>
              </div>

              {/* القسم الأول: بيانات المشروع والتقرير */}
              <div className="mb-6">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  1. بيانات المشروع العامة:
                </h3>
                <div className="overflow-x-auto w-full scrollbar-hide">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2.5 bg-gray-50/50 font-bold w-36 text-gray-600">اسم المشروع:</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{(report.projectName as string) || "-"}</td>
                      <td className="py-2.5 bg-gray-50/50 font-bold w-36 text-gray-600">قيمة العقد:</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {contractAmount > 0 ? `${contractAmount.toLocaleString()} ريال` : "—"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">الموقع/المدينة:</td>
                      <td className="py-2.5 px-3 text-gray-900">{orgLocation}</td>
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">الطرف الثاني (المقاول):</td>
                      <td className="py-2.5 px-3 text-gray-900">{contract?.supplierName || "—"}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">معد التقرير:</td>
                      <td className="py-2.5 px-3 text-gray-900">{(report.createdByName as string) || "—"}</td>
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">حالة التقرير:</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-primary">
                          {report.status === "approved" ? "معتمد ومصادق عليه" : "قيد المراجعة والاعتماد"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>

              {/* القسم الثاني: تفاصيل الدفعة المالية ونسب الإنجاز */}
              <div className="mb-6">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  2. القيم المالية ونسب الإنجاز المحققة:
                </h3>
                <div className="overflow-x-auto w-full scrollbar-hide">
                  <table className="w-full border text-xs sm:text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-100/80 border-b">
                      <th className="p-3 text-right font-bold w-1/3">البيان</th>
                      <th className="p-3 text-center font-bold w-1/3">المخطط / المتفق عليه</th>
                      <th className="p-3 text-center font-bold w-1/3">الفعلي / المصروف</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-semibold bg-gray-50/30">نسبة الإنجاز المحققة</td>
                      <td className="p-3 text-center font-mono text-blue-700">{report.plannedProgress}%</td>
                      <td className="p-3 text-center font-bold text-emerald-700 font-mono">{report.actualProgress}%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold bg-gray-50/30">الانحراف المعياري للنسبة</td>
                      <td className="p-3 text-center text-gray-500 font-medium">—</td>
                      <td className={`p-3 text-center font-bold font-mono ${variance >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {variance > 0 ? `+${variance}%` : `${variance}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>

                {actualBudgetSpent > 0 && actualBudgetSpent < agreedPaymentAmount && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs leading-relaxed">
                    <strong>تنويه مالي:</strong> تم صرف دفعة مالية بقيمة أقل من القيمة المتفقة عليها بفرق قدره <strong>{(agreedPaymentAmount - actualBudgetSpent).toLocaleString()} ريال</strong>. تم تعديل الحسابات المالية للمشروع آلياً لإتاحة جدولة دفعات إضافية لتغطية الفارق المتبقي من قيمة العقد.
                  </div>
                )}
              </div>

              {/* القسم الثالث: ملخص الأعمال المنفذة */}
              <div className="mb-6 break-inside-avoid">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  ملخص الأعمال المنجزة والخطوات:
                </h3>
                <div className="border rounded-lg p-4 bg-gray-50 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words [word-break:break-word]">
                  {cleanWorkSummary || "لا يوجد تفاصيل أعمال مسجلة."}
                </div>
              </div>

              {/* القسم الرابع: التحديات والمعوقات والتوصيات */}
              {(report.challenges || report.nextSteps || report.recommendations) && (
                <div className="mb-6 break-inside-avoid">
                  <h3 
                    className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                    style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                  >
                    3. التحديات، الخطوات القادمة والتوصيات:
                  </h3>
                  <div className="space-y-4">
                    {report.challenges && (
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-1">■ التحديات والمعوقات:</h4>
                        <p className="text-xs sm:text-sm text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap break-words [word-break:break-word]">{report.challenges}</p>
                      </div>
                    )}
                    {report.nextSteps && (
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-1">■ الخطوات القادمة:</h4>
                        <p className="text-xs sm:text-sm text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap break-words [word-break:break-word]">{report.nextSteps}</p>
                      </div>
                    )}
                    {report.recommendations && (
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-1">■ التوصيات والمقترحات:</h4>
                        <p className="text-xs sm:text-sm text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap break-words [word-break:break-word]">{report.recommendations}</p>
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
                      arr = JSON.parse(arr);
                    }
                    return Array.isArray(arr) ? arr : [];
                  };

                  const photosArr = getFilesArray(report.photos);
                  const attachmentsArr = getFilesArray(report.attachments);
                  const allFiles = [...photosArr, ...attachmentsArr].filter(Boolean);

                  if (allFiles.length > 0) {
                    return (
                      <div className="mb-6 break-inside-avoid">
                        <h3 
                          className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                          style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                        >
                          4. مرفقات التقرير وصور الموقع المنجز:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50">
                          {allFiles.map((photo: string, index: number) => {
                            const isImage = photo.startsWith("data:image/") || (photo.startsWith("http") && (photo.endsWith(".png") || photo.endsWith(".jpg") || photo.endsWith(".jpeg") || photo.endsWith(".webp")));
                            const isPdf = photo.startsWith("data:application/pdf") || (photo.startsWith("http") && photo.endsWith(".pdf"));
                            return (
                              <div 
                                key={index} 
                                className="flex flex-col items-center justify-center bg-white border p-2.5 rounded-lg shadow-xs w-full cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                                onClick={() => setPreviewFile(photo)}
                              >
                                {isImage ? (
                                  <img src={photo} alt={`مرفق ${index + 1}`} className="w-full max-h-64 object-contain rounded-md" />
                                ) : isPdf ? (
                                  <div className="w-full h-80 relative">
                                    <iframe src={photo} className="w-full h-full border rounded-md pointer-events-none" title={`مرفق PDF ${index + 1}`} />
                                    {/* Overlay blocker to allow clicking the parent div instead of interacting with the iframe directly */}
                                    <div className="absolute inset-0 bg-transparent"></div>
                                  </div>
                                ) : (
                                  <div className="w-full h-32 flex flex-col items-center justify-center rounded-md bg-muted/20 border border-dashed text-primary font-bold text-xs gap-1.5 p-3">
                                    <FileText className="w-8 h-8 text-primary" />
                                    <span>مستند مرفق</span>
                                  </div>
                                )}
                                <span className="text-[10px] text-gray-500 mt-2 font-semibold">مرفق رقم {index + 1}</span>
                                
                                {/* Premium Hover Overlay Indicator */}
                                <div className="absolute inset-0 bg-black/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none print:hidden">
                                  <div className="bg-white/95 text-primary px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-bold transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>تكبير وعرض المرفق</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error("Error parsing photos for print view", e);
                }
                return null;
              })()}

              {/* القسم الخامس: التوقيعات والاعتماد */}
              <div className="mt-12 break-inside-avoid">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-right">
                  {/* الطرف الأول */}
                  <div className="border border-[#1a5f4a]/20 rounded-lg p-4 bg-gray-50/50">
                    <div className="font-bold text-[#1a5f4a] border-b border-[#1a5f4a]/20 pb-2 mb-3 text-sm">
                      الطرف الأول (الجمعية):
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-gray-600">الاسم: </span>
                        <span className="text-gray-900 font-bold">{orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">يمثلها بالتوقيع: </span>
                        <span className="text-gray-900 font-bold">{orgSettings?.authorizedSignatory || "—"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">الصفة: </span>
                        <span className="text-gray-900">{orgSettings?.signatoryTitle || "مفوض التوقيع"}</span>
                      </div>
                      <div className="pt-6">
                        <span className="font-semibold text-gray-600">التوقيع والختم الرسمي: </span>
                        <span className="text-gray-400 font-serif">..........................................</span>
                      </div>
                    </div>
                  </div>

                  {/* الطرف الثاني */}
                  <div className="border border-[#d4a574]/20 rounded-lg p-4 bg-gray-50/50">
                    <div className="font-bold text-[#5d4037] border-b border-[#d4a574]/20 pb-2 mb-3 text-sm">
                      الطرف الثاني (المقاول):
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-gray-600">الاسم: </span>
                        <span className="text-gray-900 font-bold">{contract?.supplierName || "—"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">الصفة: </span>
                        <span className="text-gray-900">الطرف الثاني (المقاول منفذ المشروع)</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">رقم العقد: </span>
                        <span className="text-gray-900 font-mono">{contract?.contractNumber || "—"}</span>
                      </div>
                      <div className="pt-6">
                        <span className="font-semibold text-gray-600">التوقيع والختم: </span>
                        <span className="text-gray-400 font-serif">..........................................</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* تذييل المستند */}
              <div className="mt-12 pt-4 border-t text-center text-gray-400 text-[10px]">
                <p>تم توليد هذا التقرير آلياً من نظام بوابة تمام الإلكترونية للعناية بالمساجد.</p>
                <p className="mt-1">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")} - صفحة 1 من 1</p>
              </div>

            </div> {/* نهاية محتوى المستند */}
          </div> {/* نهاية الإطار المزدوج الفاخر */}

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
              {previewFile.startsWith("data:image/") || (previewFile.startsWith("http") && (previewFile.endsWith(".png") || previewFile.endsWith(".jpg") || previewFile.endsWith(".jpeg") || previewFile.endsWith(".webp"))) ? (
                <img src={previewFile} alt="معاينة المرفق" className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
              ) : previewFile.startsWith("data:application/pdf") || (previewFile.startsWith("http") && previewFile.endsWith(".pdf")) ? (
                <iframe src={previewFile} className="w-full h-full border rounded-lg shadow-sm" title="معاينة مستند PDF" />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-lg text-primary gap-4 w-full max-w-md">
                  <FileText className="w-16 h-16 text-muted-foreground" />
                  <span className="font-bold text-foreground">مستند غير مدعوم للمعاينة المباشرة</span>
                  <a href={previewFile} download="مرفق_تمام" className="text-sm underline font-semibold text-primary hover:text-primary/80">
                    تحميل وتنزيل الملف
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* أنماط الطباعة المخصصة لـ A4 */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
