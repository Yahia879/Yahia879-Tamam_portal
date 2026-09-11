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
  Star, 
  FileText,
  AlertTriangle,
  Tag,
  Users
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

export default function FieldVisitReportPrint() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const requestId = parseInt(id || "0");

  useDocumentTitle(requestId ? `طباعة تقرير المعاينة الميدانية #${requestId}` : "تقرير المعاينة الميدانية");

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
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-slate-600">جاري تحميل بيانات تقرير المعاينة الميدانية...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 p-4" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">الطلب غير موجود</h2>
        <p className="text-slate-500 text-sm">لم يتم العثور على بيانات الطلب أو تقرير المعاينة الميدانية.</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" /> العودة
        </Button>
      </div>
    );
  }

  const fieldReport = request.fieldReports && request.fieldReports.length > 0 ? request.fieldReports[0] : null;

  const conditionLabels: Record<string, string> = {
    excellent: "ممتاز (حالة ممتازة ولا توجد عيوب)",
    good: "جيد (حالة جيدة مع متطلبات صيانة خفيفة)",
    fair: "مقبول (يحتاج إلى تدخل وصيانة متوسطة)",
    poor: "سيء (يحتاج إلى صيانة شاملة وترميم)",
    critical: "حرج / إنشائي (يتطلب تدخلاً هندسياً عاجلاً)"
  };

  const conditionColors: Record<string, string> = {
    excellent: "bg-emerald-50 text-emerald-800 border-emerald-300",
    good: "bg-green-50 text-green-800 border-green-300",
    fair: "bg-yellow-50 text-yellow-800 border-yellow-300",
    poor: "bg-orange-50 text-orange-800 border-orange-300",
    critical: "bg-red-50 text-red-800 border-red-300"
  };

  let programData: Record<string, any> = {};
  if (request.programData) {
    try {
      programData = typeof request.programData === "string" 
        ? JSON.parse(request.programData) 
        : request.programData;
    } catch (e) {
      console.error("Error parsing programData:", e);
      programData = {};
    }
  }

  const isBunyan = request.programType === "bunyan" || request.programType === "bonyan";

  const menLength = parseFloat(fieldReport?.menPrayerLength || "0");
  const menWidth = parseFloat(fieldReport?.menPrayerWidth || "0");
  const calculatedMenArea = menLength * menWidth;
  const specifiedMosqueArea = parseFloat(programData?.mosqueArea || request.mosque?.area || "0");
  const menArea = calculatedMenArea > 0 ? calculatedMenArea : specifiedMosqueArea;

  const womenLength = parseFloat(fieldReport?.womenPrayerLength || "0");
  const womenWidth = parseFloat(fieldReport?.womenPrayerWidth || "0");
  const womenArea = womenLength * womenWidth;

  const teamMembers = fieldReport ? [
    fieldReport.teamMember1,
    fieldReport.teamMember2,
    fieldReport.teamMember3,
    fieldReport.teamMember4,
    fieldReport.teamMember5
  ].filter(Boolean) : [];

  const ratingLabels: Record<number, string> = {
    1: "غير صحيحة تماماً (البيانات مخالفة للواقع كلياً)",
    2: "غير صحيحة غالباً (هناك اختلافات جوهرية)",
    3: "مقبولة / صحيحة جزئياً (تتطابق في بعض الجوانب)",
    4: "صحيحة ودقيقة غالباً (تطابق شبه كامل)",
    5: "صحيحة ودقيقة بالكامل (مطابقة تامة وموثوقة 100%)"
  };

  const sitePhotos = request.attachments?.filter((att: any) => {
    const ext = att.fileName?.split('.').pop()?.toLowerCase();
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '') ||
      att.fileType?.toLowerCase() === 'image' ||
      att.fileType?.toLowerCase().startsWith('image/');
    return isImg;
  }) || [];

  const visitDate = fieldReport?.visitDate ? new Date(fieldReport.visitDate) : new Date(request.createdAt);

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

      {/* شريط الأزرار العلوي (مخفي أثناء الطباعة) */}
      <div className="print:hidden w-full bg-white/95 backdrop-blur border-b p-3 sticky top-0 z-50 flex justify-between items-center shadow-xs" dir="rtl">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack} className="font-semibold gap-1.5 shadow-xs">
            <ArrowRight className="h-4 w-4" />
            <span>رجوع</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-[#1a5f4a] hover:bg-[#144939] text-white font-bold gap-2 shadow-sm">
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
                    <p className="text-[11px] text-slate-600 font-bold">إدارة المشاريع والشؤون الفنية • قسم المعاينة الميدانية</p>
                  </div>
                </div>

                <div className="text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div>
                    <span className="text-slate-500 ml-1">التاريخ:</span>
                    <span className="font-bold text-slate-800">{formatGregorianDate(visitDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 ml-1">الموافق:</span>
                    <span className="font-semibold text-slate-700">{toHijriDate(visitDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 ml-1">رقم الطلب:</span>
                    <span className="font-mono font-bold text-[#1a5f4a]">{request.requestNumber || `#${request.id}`}</span>
                  </div>
                </div>
              </div>

              {/* عنوان المستند الرسمي */}
              <div 
                className="text-center py-3.5 px-6 mb-4 rounded-lg"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                <h1 className="text-xl sm:text-2xl font-bold">
                  تقرير المعاينة والزيارة الميدانية
                </h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1">
                  توثيق وفحص الحالة الإنشائية والفنية لموقع المسجد المعتمد
                </p>
              </div>

              {/* جدول البيانات الأساسية */}
              <div className="section-block">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  1. بيانات المسجد والطلب:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-md border border-slate-200">
                  {isBunyan ? (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px]">اسم الحي:</span>
                      <span className="font-bold text-gray-900 text-sm">
                        {programData?.neighborhoodName 
                          ? (programData.neighborhoodName.startsWith("حي") ? programData.neighborhoodName : `حي ${programData.neighborhoodName}`) 
                          : (request.mosque?.district ? `حي ${request.mosque.district}` : (request.descriptiveName || "—"))}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[10px]">اسم المسجد:</span>
                        <span className="font-bold text-gray-900">{request.mosque?.name || (request as any).mosqueName || (request as any).customMosqueName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">المدينة / الحي:</span>
                        <span className="font-semibold text-gray-800">
                          {request.mosque?.city || "—"} {request.mosque?.district ? `• حي ${request.mosque.district}` : ""}
                        </span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[10px]">نوع البرنامج:</span>
                    <span className="font-bold text-gray-900">
                      {request.programName || (PROGRAM_LABELS as any)[request.programType] || request.programType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">مقدم الطلب:</span>
                    <span className="font-semibold text-gray-800">{request.requester?.name || (request as any).requesterName || "—"}</span>
                  </div>

                  {request.descriptiveName && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px]">التسمية التوضيحية:</span>
                      <span className="font-bold text-gray-900">{request.descriptiveName}</span>
                    </div>
                  )}
                  {request.mosque?.imamName && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">إمام المسجد:</span>
                      <span className="font-semibold text-gray-800">{request.mosque.imamName} ({request.mosque.imamPhone || "—"})</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[10px]">تاريخ الزيارة الميدانية:</span>
                    <span className="font-bold text-gray-900">
                      {fieldReport?.visitDate ? new Date(fieldReport.visitDate).toLocaleDateString('ar-SA') : formatGregorianDate(visitDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* جدول أبعاد ومساحات المصليات */}
              <div className="section-block">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  {isBunyan ? "2. مواصفات الموقع والمساحات المحددة (برنامج بنيان):" : "2. نتائج الفحص الفني والمساحات:"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* مصلى الرجال / مساحة المسجد */}
                  <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-gray-800 text-xs">
                        {isBunyan ? "مساحة ومواصفات المسجد المقترح:" : "أبعاد مصلى الرجال:"}
                      </span>
                      <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        المساحة: {menArea > 0 ? `${menArea.toLocaleString('ar-SA')} م²` : "غير محدد"}
                      </span>
                    </div>
                    {isBunyan && (!menLength || !menWidth) ? (
                      <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-700">
                        <div>المساحة المحددة: <strong className="text-gray-900">{menArea > 0 ? `${menArea.toLocaleString('ar-SA')} م²` : "—"}</strong></div>
                        <div>عدد المصلين: <strong className="text-gray-900">{programData?.actualWorshippers ? `${parseFloat(programData.actualWorshippers).toLocaleString('ar-SA')} مصلي` : "—"}</strong></div>
                        <div>أرض المشروع: <strong className="text-gray-900">{programData?.landArea ? `${parseFloat(programData.landArea).toLocaleString('ar-SA')} م²` : (programData?.hasLand === "yes" ? "متوفرة" : "غير متوفرة")}</strong></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-700">
                        <div>الطول: <strong className="text-gray-900">{menLength ? `${menLength}م` : "—"}</strong></div>
                        <div>العرض: <strong className="text-gray-900">{menWidth ? `${menWidth}م` : "—"}</strong></div>
                        <div>الارتفاع: <strong className="text-gray-900">{fieldReport?.menPrayerHeight ? `${fieldReport.menPrayerHeight}م` : "—"}</strong></div>
                      </div>
                    )}
                  </div>

                  {/* مصلى النساء / بيانات الموقع والأرض لبنيان */}
                  <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-gray-800 text-xs">
                        {isBunyan && !fieldReport?.womenPrayerExists ? "بيانات موقع وأرض المشروع:" : "مصلى النساء:"}
                      </span>
                      <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {isBunyan && !fieldReport?.womenPrayerExists
                          ? (programData?.hasLand === "yes" ? "أرض مخصصة" : "بحث عن موقع")
                          : (fieldReport?.womenPrayerExists 
                            ? (womenArea > 0 ? `المساحة: ${womenArea.toLocaleString('ar-SA')} م²` : "موجود") 
                            : "غير متوفر")}
                      </span>
                    </div>
                    {isBunyan && !fieldReport?.womenPrayerExists ? (
                      <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-700">
                        <div>ملكية الأرض: <strong className="text-gray-900">{programData?.landOwnership === "owned" ? "ملك خاص" : programData?.landOwnership === "waqf" ? "وقف" : programData?.landOwnership === "government" ? "حكومية" : programData?.landOwnership || "—"}</strong></div>
                        <div>متبرع البناء: <strong className="text-gray-900">{programData?.hasDonor === "yes" ? "متوفر" : "غير متوفر"}</strong></div>
                        <div>أقرب مسجد: <strong className="text-gray-900">{programData?.nearestMosque ? `${programData.nearestMosque} (${programData.distanceToMosque ? `${programData.distanceToMosque} كم` : ""})` : "—"}</strong></div>
                      </div>
                    ) : fieldReport?.womenPrayerExists ? (
                      <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-700">
                        <div>الطول: <strong className="text-gray-900">{womenLength ? `${womenLength}م` : "—"}</strong></div>
                        <div>العرض: <strong className="text-gray-900">{womenWidth ? `${womenWidth}م` : "—"}</strong></div>
                        <div>الارتفاع: <strong className="text-gray-900">{fieldReport?.womenPrayerHeight ? `${fieldReport.womenPrayerHeight}م` : "—"}</strong></div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500">لا يوجد مصلى مخصص للنساء في هذا المسجد.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* التقييم الإنشائي والتوصيف العام والاحتياجات */}
              <div className="section-block space-y-2">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center justify-between leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  <span>3. التقييم الهندسي والتوصيف العام:</span>
                  {fieldReport?.conditionRating && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-white text-gray-900 border border-gray-300">
                      الحالة: {conditionLabels[fieldReport.conditionRating] || fieldReport.conditionRating}
                    </span>
                  )}
                </h3>

                {fieldReport?.generalDescription && (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50/40 text-xs">
                    <span className="font-bold text-gray-800 block mb-1">التوصيف العام للحالة الميدانية:</span>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {fieldReport.generalDescription}
                    </p>
                  </div>
                )}

                {fieldReport?.requiredNeeds && (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50/40 text-xs">
                    <span className="font-bold text-gray-800 block mb-1">الاحتياجات والأعمال المطلوبة:</span>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {fieldReport.requiredNeeds}
                    </p>
                  </div>
                )}

                {/* تقييم صحة بيانات المستفيد */}
                {fieldReport?.beneficiaryInfoAccuracyRating && (
                  <div className="p-2.5 rounded-md border border-gray-200 bg-gray-50/60 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">تقييم صحة ومطابقة بيانات المستفيد:</span>
                      <div className="flex items-center gap-1" style={{ direction: "ltr" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= fieldReport.beneficiaryInfoAccuracyRating
                                ? "text-amber-500 fill-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-amber-800">
                      {ratingLabels[fieldReport.beneficiaryInfoAccuracyRating] || `${fieldReport.beneficiaryInfoAccuracyRating} من 5`}
                    </div>
                    {fieldReport.beneficiaryInfoAccuracyNotes && (
                      <p className="text-[11px] text-gray-700 italic mt-0.5">
                        ملاحظات الفاحص: "{fieldReport.beneficiaryInfoAccuracyNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* قسم الصور التوثيقية */}
              {sitePhotos.length > 0 && (
                <div className="section-block">
                  <h3 
                    className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                    style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                  >
                    4. الصور التوثيقية للمعاينة ({sitePhotos.length} صور):
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sitePhotos.map((photo: any, idx: number) => (
                      <div key={photo.id || idx} className="border border-slate-200 rounded p-1 bg-white break-inside-avoid">
                        <div className="aspect-video w-full overflow-hidden rounded bg-slate-100">
                          <img 
                            src={photo.fileUrl} 
                            alt={photo.fileName || `صورة ${idx + 1}`}
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <p className="text-[9px] text-gray-600 text-center truncate mt-1">
                          {photo.fileName || `صورة توثيقية ${idx + 1}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* أعضاء الفريق الميداني */}
              {teamMembers.length > 0 && (
                <div className="section-block text-xs border border-slate-200 p-2.5 rounded-md bg-slate-50/50">
                  <span className="font-bold text-gray-800 ml-2">أعضاء الفريق الميداني:</span>
                  <span className="text-gray-700">{teamMembers.join(" • ")}</span>
                </div>
              )}

              {/* التذييل الرسمي المعتمد */}
              <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-gray-500">
                تم إصدار هذا التقرير رسمياً من بوابة تمام الإلكترونية لجمعية رعاية المساجد • كود التحقق: {request.requestNumber || requestId}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
