import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  User, 
  Calendar, 
  Target, 
  Award, 
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  ListOrdered
} from "lucide-react";

interface ReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: "semi-monthly" | "monthly" | "quarterly" | "visit";
  reportTitle: string;
  data: Record<string, any>;
}

export function ReportPrintPreviewModal({
  isOpen,
  onClose,
  reportType,
  reportTitle,
  data,
}: ReportPrintPreviewModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case "semi-monthly": return "تقرير متابعة إنجاز نصف شهري";
      case "monthly": return "التقرير الشهري الشامل للمشروع";
      case "quarterly": return "التقرير الربعي الاستراتيجي للمشروع";
      case "visit": return "تقرير زيارة ميدانية وتوثيق مهندسي الموقع";
      default: return reportTitle || "تقرير متابعة وتوثيق مشروع";
    }
  };

  const planned = data.plannedProgress ?? 0;
  const actual = data.actualProgress ?? 0;
  const gap = planned - actual;

  let ragStatus = data.ragStatus || "أخضر";
  if (!data.ragStatus) {
    if (gap >= 25) ragStatus = "أحمر";
    else if (gap >= 5) ragStatus = "أصفر";
    else ragStatus = "أخضر";
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1100px] w-full max-h-[94vh] overflow-y-auto p-0 rounded-2xl border-border">
        {/* CSS for print mode */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap');

          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            body, html, * {
              background-color: white !important;
              color: black !important;
              font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:p-0 {
              padding: 0 !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            .print\\:border-\\[2px\\] {
              border-width: 2px !important;
            }
            .max-w-\\[210mm\\] {
              width: 210mm !important;
              max-width: 210mm !important;
              padding: 8mm !important;
              margin: 0 auto !important;
            }
          }
        `}</style>

        {/* Modal Top Controls Header */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border flex flex-row items-center justify-between bg-muted/30 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-600/10 text-teal-600 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                معاينة وطباعة {reportTitle}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">معاينة المستند الرسمي A4 بنفس تصميم ونموذج الطباعة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-2 bg-[#1a5f4a] hover:bg-[#154d3c] text-white h-10 px-5 font-bold rounded-xl shadow-xs">
              <Printer className="w-4 h-4" />
              <span>طباعة / تنزيل PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Outer Canvas Background matching /progress-reports/12/print */}
        <div className="bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 font-sans dir-rtl min-h-[80vh] print:p-0 print:bg-white">
          {/* Centered Exact A4 Sheet Container (max-w-[210mm]) matching /progress-reports/12/print */}
          <div className="w-full max-w-[210mm] mx-auto p-4 sm:p-8 print:p-4 print:max-w-none">
            
            {/* Double Luxury Border Frame matching /progress-reports/12/print */}
            <div className="w-full border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white dark:bg-slate-900 shadow-lg print:shadow-none print:border-[2px] print:p-5">
              {/* Inner Gold Line Frame Accent */}
              <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none" />

              <div className="relative z-10 text-right space-y-6">
                
                {/* Official Top Header: Logo + Organization Info + Date Metadata */}
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-[#1a5f4a]/10 rounded-lg flex items-center justify-center print:w-14 print:h-14">
                      <span className="text-[#1a5f4a] font-bold text-2xl">تمام</span>
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#1a5f4a] print:text-sm">
                        جمعية عمارة المساجد (تمام)
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold">إدارة المشاريع والهندسة والصيانة</div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-center sm:text-left sm:pl-5 print:pl-5">
                    <div className="flex gap-2 justify-center sm:justify-end">
                      <span className="font-bold text-muted-foreground">التاريخ:</span>
                      <span className="border-b border-dotted border-gray-400 px-3 font-semibold text-foreground">{data.reportDate || new Date().toISOString().split("T")[0]}</span>
                    </div>
                    <div className="flex gap-2 justify-center sm:justify-end">
                      <span className="font-bold text-muted-foreground">رقم التقرير:</span>
                      <span className="border-b border-dotted border-gray-400 px-3 font-mono font-bold text-[#1a5f4a]">#{data.reportNumber || data.id || "REP-101"}</span>
                    </div>
                    <div className="flex gap-2 justify-center sm:justify-end">
                      <span className="font-bold text-muted-foreground">حالة الاعتماد:</span>
                      <span className="border-b border-dotted border-gray-400 px-3 font-bold text-teal-700">{data.status || "معتمد"}</span>
                    </div>
                  </div>
                </div>

                {/* Main Banner Header matching /progress-reports/12/print */}
                <div 
                  className="text-center py-4 px-6 mb-6 rounded-lg"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  <h1 className="text-xl sm:text-2xl font-bold">
                    {getReportTypeLabel(reportType)}
                  </h1>
                  <p className="text-xs sm:text-sm opacity-90 mt-1 font-medium">
                    {data.projectName || data.project || reportTitle}
                  </p>
                </div>

                {/* Section 1: General Project Metadata matching /progress-reports/12/print */}
                <div className="mb-6">
                  <h3 
                    className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                    style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                  >
                    1. بيانات المشروع العامة:
                  </h3>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <tbody>
                        <tr className="border-b border-gray-200 dark:border-slate-800">
                          <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold w-36 text-muted-foreground">اسم المشروع:</td>
                          <td className="py-2.5 px-3 font-bold text-foreground">{data.projectName || data.project || "—"}</td>
                          <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold w-36 text-muted-foreground">مدير المشروع:</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">{data.projectManager || data.manager || "—"}</td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-slate-800">
                          <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">الإدارة المالكة:</td>
                          <td className="py-2.5 px-3 text-foreground">{data.ownerDepartment || "إدارة المشاريع والصيانة"}</td>
                          <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">
                            {reportType === "semi-monthly" ? "فترة التقرير:" : reportType === "monthly" ? "الشهر/السنة:" : reportType === "quarterly" ? "الربع/السنة:" : "تاريخ الزيارة:"}
                          </td>
                          <td className="py-2.5 px-3 text-foreground font-semibold">
                            {reportType === "semi-monthly"
                              ? `${data.periodFrom || "—"} إلى ${data.periodTo || "—"}`
                              : reportType === "monthly"
                              ? data.monthYear || "2026-07"
                              : reportType === "quarterly"
                              ? `${data.quarter || "Q3"} / ${data.year || "2026"}`
                              : data.visitDate || data.reportDate || "—"}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-slate-800">
                          <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">مُعدّ التقرير:</td>
                          <td className="py-2.5 px-3 text-foreground">{data.projectManager || "مهندس الموقع"}</td>
                          <td className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-muted-foreground">حالة التقرير:</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-teal-700">
                              {data.status === "approved" || data.status === "معتمد" ? "معتمد ومصادق عليه" : "قيد المراجعة والاعتماد"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Financial Values & Progress Indicators (RAG) matching /progress-reports/12/print */}
                <div className="mb-6">
                  <h3 
                    className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                    style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                  >
                    2. قيم مؤشرات الأداء ونسب الإنجاز المحققة (RAG):
                  </h3>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border border-gray-200 dark:border-slate-800 text-xs sm:text-sm mb-4">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
                          <th className="p-3 text-right font-bold w-1/3">المؤشر القياسي</th>
                          <th className="p-3 text-center font-bold w-1/3">المخطط / المتفق عليه</th>
                          <th className="p-3 text-center font-bold w-1/3">الفعلي المحقق</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200 dark:border-slate-800">
                          <td className="p-3 font-semibold bg-slate-50/50 dark:bg-slate-800/40">نسبة الإنجاز المحققة (%)</td>
                          <td className="p-3 text-center font-mono text-blue-700 font-bold">{planned}%</td>
                          <td className="p-3 text-center font-bold text-emerald-700 font-mono">{actual}%</td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-slate-800">
                          <td className="p-3 font-semibold bg-slate-50/50 dark:bg-slate-800/40">فارق الانحراف المعياري للنسبة (Gap)</td>
                          <td className="p-3 text-center text-muted-foreground font-medium">—</td>
                          <td className={`p-3 text-center font-bold font-mono ${gap > 5 ? "text-rose-600" : "text-emerald-700"}`}>
                            {gap > 0 ? `تأخير ${gap}%` : gap < 0 ? `متقدم ${Math.abs(gap)}%` : "مطابق 0%"}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold bg-slate-50/50 dark:bg-slate-800/40">تقييم مؤشر الأداء العام (RAG Status)</td>
                          <td className="p-3 text-center text-muted-foreground font-medium">—</td>
                          <td className="p-3 text-center">
                            <Badge className={
                              ragStatus === "أخضر" ? "bg-emerald-600 text-white font-bold" : ragStatus === "أصفر" ? "bg-amber-500 text-white font-bold" : "bg-rose-600 text-white font-bold"
                            }>
                              {ragStatus} ({ragStatus === "أخضر" ? "مطابق" : ragStatus === "أصفر" ? "تأخير متوسط" : "تأخير حرج"})
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Visual Progress Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>مشرّط نسبة الإنجاز المخطط:</span>
                        <span>{planned}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#1a5f4a] h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, planned))}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>شريط نسبة الإنجاز الفعلية:</span>
                        <span>{actual}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, actual))}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Milestones Table if available matching /progress-reports/12/print */}
                {Array.isArray(data.milestones) && data.milestones.length > 0 && (
                  <div className="mb-6 break-inside-avoid">
                    <h3 
                      className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                      style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                    >
                      3. جدول التقدم مقابل المعالم الرئيسية للمشروع:
                    </h3>
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
                          {data.milestones.map((m: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 dark:border-slate-800">
                              <td className="p-2.5 text-center font-bold text-muted-foreground border-l border-gray-200 dark:border-slate-800">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-foreground border-l border-gray-200 dark:border-slate-800">{m.title || "—"}</td>
                              <td className="p-2.5 text-center font-mono border-l border-gray-200 dark:border-slate-800">{m.dueDate || m.date || "—"}</td>
                              <td className="p-2.5 text-center font-bold">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${
                                  m.status === "منجز" ? "bg-emerald-100 text-emerald-800" : m.status === "جارٍ" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {m.status || "لم يبدأ"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section 4: Work Summary / Visit Notes matching /progress-reports/12/print */}
                {(data.notes || data.workSummary) && (
                  <div className="mb-6 break-inside-avoid">
                    <h3 
                      className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                      style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                    >
                      4. ملخص الأعمال المنجزة والملاحظات الميدانية:
                    </h3>
                    <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/40 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {data.notes || data.workSummary}
                    </div>
                  </div>
                )}

                {/* Section 5: Challenges & Recommendations matching /progress-reports/12/print */}
                {(data.challenges || data.recommendations || data.requiredSupport) && (
                  <div className="mb-6 break-inside-avoid">
                    <h3 
                      className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                      style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                    >
                      5. التحديات، التوصيات ودعم الإدارة:
                    </h3>
                    <div className="space-y-3 text-xs sm:text-sm">
                      {data.challenges && (
                        <div>
                          <h4 className="font-bold text-foreground mb-1">■ التحديات والمعوقات:</h4>
                          <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-gray-200 dark:border-slate-800 whitespace-pre-wrap">{data.challenges}</p>
                        </div>
                      )}
                      {data.recommendations && (
                        <div>
                          <h4 className="font-bold text-foreground mb-1">■ التوصيات والخطوات التصحيحية:</h4>
                          <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-gray-200 dark:border-slate-800 whitespace-pre-wrap">{data.recommendations}</p>
                        </div>
                      )}
                      {data.requiredSupport && (
                        <div>
                          <h4 className="font-bold text-foreground mb-1">■ الدعم المطلوب من الإدارة:</h4>
                          <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-gray-200 dark:border-slate-800 whitespace-pre-wrap">{data.requiredSupport}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 6: Official Signatures Block matching /progress-reports/12/print */}
                <div className="pt-8 mt-8 border-t border-gray-200 dark:border-slate-800 grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <div className="font-bold text-foreground mb-8">مُعدّ التقرير</div>
                    <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-1.5" />
                    <div className="text-muted-foreground font-semibold">{data.projectManager || "مهندس المشروع"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground mb-8">الجهة المعنية</div>
                    <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-1.5" />
                    <div className="text-muted-foreground font-semibold">{data.ownerDepartment || "إدارة المشاريع"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground mb-8">اعتماد مكتب إدارة المشاريع (PMO)</div>
                    <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-1.5" />
                    <div className="text-muted-foreground font-semibold">مدير إدارة المشاريع</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:px-6 border-t border-border bg-muted/20 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs font-semibold px-5">
            إغلاق المعاينة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
