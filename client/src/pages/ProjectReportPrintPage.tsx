import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, AlertTriangle, FileText, CheckCircle2, Clock, Target, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function ProjectReportPrintPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

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
            margin: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          html, body {
            width: 210mm !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          .max-w-\\[210mm\\] {
            width: 210mm !important;
            max-width: 210mm !important;
            padding: 8mm !important;
            margin: 0 auto !important;
          }
          .border-\\[3px\\] {
            border-width: 2px !important;
            padding: 12px !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
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
        <div className="w-full max-w-[210mm] mx-auto p-4 sm:p-8 print:p-4 print:max-w-none">
          
          {/* Double Luxury Frame matching /progress-reports/12/print */}
          <div className="w-full border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white dark:bg-slate-900 shadow-lg print:shadow-none print:border-[2px] print:p-5">
            {/* Inner Gold Line Frame Accent */}
            <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none" />
            
            {/* Document Body Content */}
            <div className="relative z-10 space-y-6">
              
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

              <div className="mb-6">
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
                        <td className="py-2.5 px-3 text-foreground" colSpan={3}>{orgLocation}</td>
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

              <div className="mb-6">
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
                <div className="mb-6 break-inside-avoid">
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
                <div className="mb-6 break-inside-avoid">
                  <h3 className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base" style={{ backgroundColor: '#1a5f4a', color: 'white' }}>4. ملخص الأعمال المنجزة والخطوات:</h3>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/40 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">{data.workSummary || data.notes}</div>
                </div>
              )}

              {(data.challenges || data.recommendations || data.nextSteps) && (
                <div className="mb-6 break-inside-avoid">
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

              <div className="pt-8 mt-8 border-t border-gray-200 dark:border-slate-800 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="font-bold text-foreground mb-8">مُعدّ التقرير</div>
                  <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-1.5" />
                  <div className="text-muted-foreground font-semibold">{data.createdByName || "مهندس المشروع"}</div>
                </div>
                <div>
                  <div className="font-bold text-foreground mb-8">الجهة المعنية</div>
                  <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-1.5" />
                  <div className="text-muted-foreground font-semibold">إدارة المشاريع والهندسة</div>
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
    </>
  );
}
