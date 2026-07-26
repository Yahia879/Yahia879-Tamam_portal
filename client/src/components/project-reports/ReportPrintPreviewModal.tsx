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
  PieChart,
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
      case "semi-monthly": return "تقرير نصف شهري لمتابعة إنجاز المشروع";
      case "monthly": return "التقرير الشهري الشامل لتقييم الأداء والمخاطر";
      case "quarterly": return "التقرير الربعي الاستراتيجي لقياس الأثر والمواءمة";
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

  const getRagColorBg = (status: string) => {
    if (status === "أخضر") return "bg-emerald-600 text-white";
    if (status === "أصفر") return "bg-amber-500 text-white";
    return "bg-rose-600 text-white";
  };

  const getRagBorderColor = (status: string) => {
    if (status === "أخضر") return "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20";
    if (status === "أصفر") return "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20";
    return "border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1240px] w-full max-h-[94vh] overflow-y-auto p-0 rounded-2xl border-border">
        {/* Print Styles CSS */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            body {
              background-color: white !important;
              color: black !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:p-4 {
              padding: 1rem !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            .print\\:border-\\[2px\\] {
              border-width: 2px !important;
            }
            .print\\:max-w-none {
              max-width: none !important;
              width: 100% !important;
            }
          }
        `}</style>

        {/* Modal Top Header Bar */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border flex flex-row items-center justify-between bg-muted/30 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-600/10 text-teal-600 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                معاينة وطباعة {reportTitle}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">معاينة التقرير الرسمي عالي الدقة قبل التصدير والطباعة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-2 bg-[#1a5f4a] hover:bg-[#154d3c] text-white h-10 px-5 font-bold rounded-xl shadow-xs">
              <Printer className="w-4 h-4" />
              <span>طباعة / تنزيل PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Area - Full Width Page Preview */}
        <div className="p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 font-sans dir-rtl min-h-[75vh]">
          {/* Outer Document Frame matching /progress-reports/12/print */}
          <div className="w-full max-w-[210mm] lg:max-w-[1080px] mx-auto border-[3px] border-[#1a5f4a] p-5 sm:p-8 rounded-xl relative overflow-hidden bg-white dark:bg-slate-900 shadow-xl print:shadow-none print:border-[2px] print:p-5 print:max-w-none">
            {/* Inner Gold Accent Frame Line */}
            <div className="absolute inset-2 border border-[#d4a574] rounded-lg pointer-events-none" />

            <div className="relative z-10 space-y-6 text-right">
              {/* Header Block: Logo & Title + Metadata */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#1a5f4a]/10 rounded-2xl border border-[#1a5f4a]/20 flex items-center justify-center font-black text-2xl text-[#1a5f4a] shrink-0 shadow-2xs">
                    تمام
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#1a5f4a]">جمعية عمارة المساجد (تمام)</h2>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">منظومة متابعة وتطوير المشروعات — إدارة الهندسة والمتابعة</p>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-center sm:text-left dir-rtl bg-gray-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-gray-200/80 dark:border-slate-700/60 min-w-[200px]">
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-bold text-muted-foreground">تاريخ التقرير:</span>
                    <span className="font-semibold text-foreground">{data.reportDate || new Date().toISOString().split("T")[0]}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-bold text-muted-foreground">رقم التقرير:</span>
                    <span className="font-mono font-extrabold text-[#1a5f4a]">#{data.reportNumber || data.id || "REP-101"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-bold text-muted-foreground">حالة الاعتماد:</span>
                    <span className="font-bold text-teal-700">{data.status || "معتمد"}</span>
                  </div>
                </div>
              </div>

              {/* Centered Luxury Banner */}
              <div className="text-center py-3 px-6 bg-[#1a5f4a]/5 border-y-2 border-[#1a5f4a] rounded-sm my-3">
                <h1 className="text-xl sm:text-2xl font-black text-[#1a5f4a]">
                  {getReportTypeLabel(reportType)}
                </h1>
              </div>

              {/* Metadata Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#1a5f4a]" />
                    <span>اسم المشروع:</span>
                  </div>
                  <div className="font-extrabold text-sm text-foreground">{data.projectName || data.project || "غير محدد"}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1a5f4a]" />
                    <span>مدير المشروع:</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">{data.projectManager || data.manager || "غير محدد"}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1a5f4a]" />
                    <span>الإدارة المعنية:</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">{data.ownerDepartment || "إدارة المشاريع والصيانة"}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#1a5f4a]" />
                    <span>{reportType === "semi-monthly" ? "فترة التقرير:" : reportType === "monthly" ? "الشهر/السنة:" : reportType === "quarterly" ? "الربع/السنة:" : "تاريخ الزيارة:"}</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {reportType === "semi-monthly"
                      ? `${data.periodFrom || "—"} إلى ${data.periodTo || "—"}`
                      : reportType === "monthly"
                      ? data.monthYear || "2026-07"
                      : reportType === "quarterly"
                      ? `${data.quarter || "Q3"} / ${data.year || "2026"}`
                      : data.visitDate || data.reportDate || "—"}
                  </div>
                </div>
              </div>

              {/* Rich Graphical KPI Indicators Section */}
              {data.plannedProgress !== undefined && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-teal-600/10 text-teal-600 font-bold">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-[#1a5f4a]">مؤشرات الأداء وتتبع نسبة الإنجاز (RAG Status)</h3>
                        <p className="text-xs text-muted-foreground">قياس الفجوة بين نسبة الإنجاز المخططة والفعلية وتقييم حالة المشروع</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-black text-sm ${getRagBorderColor(ragStatus)}`}>
                      <span className="text-xs text-muted-foreground font-bold">تقييم RAG:</span>
                      <Badge className={`${getRagColorBg(ragStatus)} text-xs px-3 py-1 font-bold shadow-xs`}>
                        {ragStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Visual KPI Cards with Gauges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Planned Progress */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-[#1a5f4a]" />
                          الإنجاز المخطط
                        </span>
                        <span className="text-lg font-black text-[#1a5f4a]">{planned}%</span>
                      </div>
                      {/* Visual Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#1a5f4a] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, planned))}%` }} 
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">النسبة المخططة في الجدول الزمني المعرف</p>
                    </div>

                    {/* Card 2: Actual Progress */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-teal-600" />
                          الإنجاز الفعلي
                        </span>
                        <span className="text-lg font-black text-teal-700">{actual}%</span>
                      </div>
                      {/* Visual Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, actual))}%` }} 
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">النسبة المحققة فعلياً في أرض الموقع</p>
                    </div>

                    {/* Card 3: Gap / Variance Callout */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-600" />
                          فارق الانحراف (Gap)
                        </span>
                        <span className={`text-lg font-black ${gap > 5 ? "text-rose-600" : "text-emerald-700"}`}>
                          {gap > 0 ? `تأخير ${gap}%` : gap < 0 ? `متقدم ${Math.abs(gap)}%` : "مطابق 0%"}
                        </span>
                      </div>
                      {/* Visual Multi-Segment Status */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            gap < 5 ? "bg-emerald-500" : gap < 25 ? "bg-amber-500" : "bg-rose-600"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, Math.abs(gap) * 3))}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {gap < 5 ? "ضمن الحدود المقبولة (أخضر)" : gap < 25 ? "تأخير متوسط يتطلب متابعة (أصفر)" : "تأخير كبير يتطلب تصعيد (أحمر)"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Milestones Progress Table */}
              {Array.isArray(data.milestones) && data.milestones.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-[#1a5f4a] text-white px-5 py-3 font-bold text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-teal-300" />
                      <span>جدول التقدم مقابل المعالم الرئيسية للمشروع</span>
                    </div>
                    <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full">إجمالي المعالم: {data.milestones.length}</span>
                  </div>
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        <th className="p-3 border-l border-slate-200 dark:border-slate-800 text-center w-12">#</th>
                        <th className="p-3 border-l border-slate-200 dark:border-slate-800">اسم المعلم الرئيسي</th>
                        <th className="p-3 border-l border-slate-200 dark:border-slate-800 text-center">التاريخ المستهدف</th>
                        <th className="p-3 text-center">حالة الإنجاز</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.milestones.map((m: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-muted-foreground border-l border-slate-200 dark:border-slate-800 text-center">{idx + 1}</td>
                          <td className="p-3 font-bold text-foreground border-l border-slate-200 dark:border-slate-800">{m.title || "—"}</td>
                          <td className="p-3 text-foreground border-l border-slate-200 dark:border-slate-800 text-center font-mono">{m.dueDate || m.date || "—"}</td>
                          <td className="p-3 text-center font-bold">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold ${
                              m.status === "منجز" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : m.status === "جارٍ" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {m.status === "منجز" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {m.status === "جارٍ" && <Clock className="w-3 h-3 text-amber-600" />}
                              <span>{m.status || "لم يبدأ"}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Visit Observations & Photos */}
              {reportType === "visit" && data.notes && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 space-y-2">
                  <h3 className="font-bold text-sm text-[#1a5f4a] border-b border-slate-100 dark:border-slate-800 pb-2">الملاحظات المرصودة أثناء الزيارة الميدانية</h3>
                  <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed pt-1">{data.notes}</p>
                </div>
              )}

              {/* Challenges & Obstacles */}
              {data.challenges && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 space-y-2">
                  <h3 className="font-bold text-sm text-[#1a5f4a] border-b border-slate-100 dark:border-slate-800 pb-2">التحديات والمعوقات الفنية</h3>
                  <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed pt-1">{data.challenges}</p>
                </div>
              )}

              {/* Corrective Recommendations */}
              {data.recommendations && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 space-y-2">
                  <h3 className="font-bold text-sm text-[#1a5f4a] border-b border-slate-100 dark:border-slate-800 pb-2">التوصيات والخطوات التصحيحية</h3>
                  <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed pt-1">{data.recommendations}</p>
                </div>
              )}

              {/* Required Support */}
              {data.requiredSupport && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 space-y-2">
                  <h3 className="font-bold text-sm text-[#1a5f4a] border-b border-slate-100 dark:border-slate-800 pb-2">الدعم المطلوب من الإدارة العليا</h3>
                  <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed pt-1">{data.requiredSupport}</p>
                </div>
              )}

              {/* Official Signatures Block */}
              <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="font-bold text-foreground mb-8">مُعدّ التقرير</div>
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-3/4 mx-auto mb-1.5" />
                  <div className="text-muted-foreground font-semibold">{data.projectManager || "مهندس المشروع"}</div>
                </div>
                <div>
                  <div className="font-bold text-foreground mb-8">الجهة المعنية</div>
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-3/4 mx-auto mb-1.5" />
                  <div className="text-muted-foreground font-semibold">{data.ownerDepartment || "إدارة المشاريع"}</div>
                </div>
                <div>
                  <div className="font-bold text-foreground mb-8">اعتماد مكتب إدارة المشاريع (PMO)</div>
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-3/4 mx-auto mb-1.5" />
                  <div className="text-muted-foreground font-semibold">مدير إدارة المشاريع</div>
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
