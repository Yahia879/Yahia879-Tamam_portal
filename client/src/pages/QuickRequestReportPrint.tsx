import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Printer, 
  Loader2, 
  Building2, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Camera, 
  Zap, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { PROGRAM_LABELS } from "@shared/constants";

function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay}/${hijriMonth}/${hijriYear} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

export default function QuickRequestReportPrint() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const requestId = parseInt(id || "0");

  useDocumentTitle(requestId ? `طباعة تقرير الطلب السريع #${requestId}` : "تقرير الطلب السريع");

  const { data: request, isLoading: requestLoading } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: !!requestId && !isNaN(requestId) }
  );

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(currentUser?.role === "service_requester" ? "/my-requests" : "/pending-reports");
    }
  };

  if (requestLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
        <p className="text-sm font-semibold text-slate-600">جاري تحميل بيانات تقرير الطلب السريع...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 p-4" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">الطلب غير موجود</h2>
        <p className="text-slate-500 text-sm">لم يتم العثور على بيانات الطلب السريع.</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" /> العودة
        </Button>
      </div>
    );
  }

  const quickReport = request.quickReports && request.quickReports.length > 0 ? request.quickReports[0] : null;

  const evaluationLabels: Record<string, string> = {
    excellent: "ممتاز",
    good: "جيد",
    acceptable: "مقبول",
    needs_improvement: "يحتاج تحسين",
    poor: "ضعيف"
  };

  const evaluationColors: Record<string, string> = {
    excellent: "bg-emerald-50 text-emerald-800 border-emerald-300",
    good: "bg-green-50 text-green-800 border-green-300",
    acceptable: "bg-blue-50 text-blue-800 border-blue-300",
    needs_improvement: "bg-amber-50 text-amber-800 border-amber-300",
    poor: "bg-red-50 text-red-800 border-red-300"
  };

  const reportPhotos = request.attachments?.filter((att: any) => {
    const ext = att.fileName?.split('.').pop()?.toLowerCase();
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '') ||
      att.fileType?.toLowerCase() === 'image' ||
      att.fileType?.toLowerCase().startsWith('image/');
    return isImg;
  }).slice(0, 8) || [];

  const createdAtDate = new Date(request.createdAt);
  const responseDate = quickReport?.responseDate ? new Date(quickReport.responseDate) : createdAtDate;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .section-block, tr, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* شريط الأزرار العلوي */}
      <div className="print:hidden w-full bg-white/95 backdrop-blur border-b p-3 sticky top-0 z-50 flex justify-between items-center shadow-xs" dir="rtl">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack} className="font-semibold gap-1.5 shadow-xs">
            <ArrowRight className="h-4 w-4" />
            <span>رجوع</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-amber-700 hover:bg-amber-800 text-white font-bold gap-2 shadow-sm">
            <Printer className="h-4 w-4" />
            <span>طباعة التقرير / PDF</span>
          </Button>
        </div>
      </div>

      {/* الصفحة المطبوعة A4 */}
      <div className="min-h-screen bg-slate-100 py-6 px-2 sm:px-4 print:p-0 print:bg-white font-sans" dir="rtl">
        <div className="w-full max-w-[210mm] mx-auto bg-white p-4 sm:p-6 print:p-0 print:max-w-none shadow-md print:shadow-none">
          
          {/* الإطار المزدوج الفاخر المعتمد */}
          <div className="w-full border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative bg-white print:border-[2px] print:p-4">
            {/* خط ذهبي داخلي */}
            <div className="absolute inset-1 border border-[#d4a574] rounded pointer-events-none print:inset-0.5"></div>

            <div className="relative z-10 space-y-4">
              
              {/* الترويسة الرسمية */}
              <div className="flex justify-between items-center border-b-2 border-[#1a5f4a]/30 pb-3">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto object-contain print:h-14" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a5f4a]/10 rounded-lg flex items-center justify-center border border-[#1a5f4a]/20">
                      <span className="text-[#1a5f4a] font-bold text-2xl">تمام</span>
                    </div>
                  )}
                  <div>
                    <h2 className="font-extrabold text-[#1a5f4a] text-base sm:text-lg">
                      {orgSettings?.officialReportsName || orgSettings?.organizationName || (orgSettings as any)?.associationName || "جمعية رعاية المساجد (تمام)"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">المملكة العربية السعودية • تصريح رقم 1000543501</p>
                    <p className="text-[11px] text-amber-800 font-bold">إدارة المشاريع والخدمات • قسم الطلبات المباشرة السريعة</p>
                  </div>
                </div>

                <div className="text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div>
                    <span className="text-slate-500 ml-1">التاريخ:</span>
                    <span className="font-bold text-slate-800">{formatGregorianDate(createdAtDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 ml-1">الموافق:</span>
                    <span className="font-semibold text-slate-700">{toHijriDate(createdAtDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 ml-1">رقم الطلب السريع:</span>
                    <span className="font-mono font-bold text-amber-800">{request.requestNumber || `#${request.id}`}</span>
                  </div>
                </div>
              </div>

              {/* عنوان المستند الرسمي */}
              <div 
                className="text-center py-3.5 px-6 mb-4 rounded-lg"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                <h1 className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-amber-300 inline-block" />
                  <span>تقرير الطلب المباشر - الاستجابة السريعة</span>
                </h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1">
                  توثيق البلاغات الطارئة والطلبات السريعة وإجراءات المعالجة الفورية المكتملة
                </p>
              </div>

              {/* جدول البيانات الأساسية */}
              <div className="section-block">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  1. بيانات الطلب والمسجد:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-md border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">اسم المسجد:</span>
                    <span className="font-bold text-slate-800">{request.mosque?.name || (request as any).mosqueName || (request as any).customMosqueName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">المدينة / الموقع:</span>
                    <span className="font-semibold text-slate-700">
                      {request.mosque?.city || "—"} {request.mosque?.district ? `• حي ${request.mosque.district}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">مقدم البلاغ / الطلب:</span>
                    <span className="font-semibold text-slate-700">{request.requester?.name || (request as any).requesterName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">هاتف التواصل:</span>
                    <span className="font-semibold text-slate-700">{request.requester?.phone || "—"}</span>
                  </div>

                  {request.descriptiveName && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">التسمية التوضيحية:</span>
                      <span className="font-bold text-purple-900">{request.descriptiveName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاريخ الإنشاء:</span>
                    <span className="font-bold text-slate-800">{formatGregorianDate(createdAtDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">المسؤول / الفني المعين:</span>
                    <span className="font-bold text-slate-800">
                      {quickReport?.technicianName || request.assignedToUser?.name || "فني الاستجابة"}
                    </span>
                  </div>
                </div>
              </div>

              {/* تفاصيل البلاغ والمعالجة */}
              <div className="section-block">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  2. تفاصيل البلاغ والمعالجة الفنية المنجزة:
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
                  <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 block mb-1">حالة الطلب:</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">
                        {request.currentStage === "closed" ? "مكتمل ومغلق رسمياً" : "قيد المعالجة السريعة"}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 block mb-1">التقييم الفني:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border inline-block ${
                      evaluationColors[quickReport?.finalEvaluation || 'good']
                    }`}>
                      {evaluationLabels[quickReport?.finalEvaluation || 'good'] || "جيد ومطابق"}
                    </span>
                  </div>
                </div>

                {/* التوصيف الفني */}
                {quickReport?.technicalEvaluation ? (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50/40 text-xs">
                    <span className="font-bold text-slate-700 block mb-1">تقرير الأعمال والإجراءات المنجزة:</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {quickReport.technicalEvaluation}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50/40 text-xs text-slate-600">
                    تم استلام البلاغ المباشر من خلال بوابة تمام وتوجيه الفني المختص فوراً لتقديم الخدمة المطلوبة للمسجد وإغلاق البلاغ بنجاح.
                  </div>
                )}
              </div>

              {/* قسم الصور والمرفقات التوثيقية */}
              {reportPhotos.length > 0 && (
                <div className="section-block">
                  <h3 
                    className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                    style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                  >
                    3. الصور التوثيقية للبلاغ والمعالجة ({reportPhotos.length} صور):
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {reportPhotos.map((photo: any, idx: number) => (
                      <div key={photo.id || idx} className="border border-slate-200 rounded p-1 bg-white break-inside-avoid">
                        <div className="aspect-video w-full overflow-hidden rounded bg-slate-100">
                          <img 
                            src={photo.fileUrl} 
                            alt={photo.fileName || `صورة ${idx + 1}`}
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 text-center truncate mt-1">
                          {photo.fileName || `توثيق البلاغ ${idx + 1}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* التوقيعات والاعتمادات الرسمية */}
              <div className="section-block pt-3 border-t-2 border-[#1a5f4a]/30">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  {/* الخانة 1: الفني المنفذ */}
                  <div className="border border-slate-200 rounded-md p-2 bg-slate-50/40 space-y-1">
                    <p className="font-bold text-slate-700 text-[11px]">الفني / مستلم البلاغ</p>
                    <p className="font-bold text-amber-900 text-xs pt-1">
                      {quickReport?.technicianName || "فني الاستجابة"}
                    </p>
                    <div className="h-10 flex items-center justify-center text-slate-400 italic text-[10px]">
                      [تم الإنجاز إلكترونياً]
                    </div>
                  </div>

                  {/* الخانة 2: مشرف المتابعة ومكتب المشاريع */}
                  <div className="border border-slate-200 rounded-md p-2 bg-slate-50/40 space-y-1">
                    <p className="font-bold text-slate-700 text-[11px]">مشرف العمليات ومكتب المشاريع</p>
                    <p className="font-bold text-slate-800 text-xs pt-1">
                      {request.assignedToUser?.name || "إدارة العمليات"}
                    </p>
                    <div className="h-10 flex items-center justify-center text-slate-400 italic text-[10px]">
                      [تمت المراجعة والاعتماد]
                    </div>
                  </div>

                  {/* الخانة 3: الاعتماد النهائي */}
                  <div className="border border-slate-200 rounded-md p-2 bg-slate-50/40 space-y-1">
                    <p className="font-bold text-slate-700 text-[11px]">الاعتماد الرسمي</p>
                    <p className="font-bold text-slate-800 text-xs pt-1">
                      {orgSettings?.authorizedSignatory || orgSettings?.executiveDirectorName || "المدير التنفيذي"}
                    </p>
                    <div className="h-10 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-dashed border-[#1a5f4a]/40 flex items-center justify-center text-[9px] text-[#1a5f4a] font-bold">
                        ختم الجمعية
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-2">
                  تم إصدار هذا التقرير رسمياً من بوابة تمام الإلكترونية لجمعية رعاية المساجد • كود التحقق: {request.requestNumber || requestId}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
