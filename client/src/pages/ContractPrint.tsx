import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Printer, Loader2, FileText, PenTool } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText } from "@shared/tafqeet";


const DURATION_UNITS: Record<string, string> = {
  days: "يوم",
  weeks: "أسبوع",
  months: "شهر"
};

const CONTRACT_TYPES: Record<string, string> = {
  supervision: "إشراف هندسي",
  construction: "تنفيذ وإنشاء",
  supply: "توريد",
  maintenance: "تشغيل وصيانة",
  consulting: "خدمات استشارية",
  other: "أخرى"
};

function toHijriDate(date: Date): string {
  let formatted = "";
  try {
    formatted = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    }).format(date);
  } catch (e) {
    const gregorianYear = date.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    formatted = `${date.getDate()}/${date.getMonth() + 1}/${hijriYear}`;
  }
  
  // Remove any existing "هـ" or "ه" to avoid duplicates and ensure clean format
  formatted = formatted.replace(/هـ/g, "").replace(/ه/g, "").trim();
  // Remove any trailing direction marks or spaces
  formatted = formatted.replace(/[\s\u200e\u200f]+$/, "");
  return `${formatted} هـ`;
}

function getArabicDayName(date: Date): string {
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[date.getDay()];
}

// حساب تاريخ انتهاء العقد بناءً على تاريخ البدء والمدة
function getEndDate(
  startDateStr: string | null | Date,
  duration: number | null,
  durationUnit: string | null,
  backendEndDate: string | null | Date
): Date | null {
  if (backendEndDate) return new Date(backendEndDate);
  if (!startDateStr || !duration) return null;
  
  const start = new Date(startDateStr);
  const end = new Date(start);
  
  // Normalize durationUnit
  const unit = (durationUnit || "").trim().toLowerCase();
  
  if (unit === "days" || unit === "يوم" || unit === "أيام") {
    end.setDate(end.getDate() + duration);
  } else if (unit === "weeks" || unit === "أسبوع" || unit === "أسابيع") {
    end.setDate(end.getDate() + (duration * 7));
  } else if (unit === "months" || unit === "شهر" || unit === "أشهر" || unit === "شهر/أشهر") {
    end.setMonth(end.getMonth() + duration);
  } else if (unit === "years" || unit === "سنة" || unit === "سنوات") {
    end.setFullYear(end.getFullYear() + duration);
  } else {
    end.setMonth(end.getMonth() + duration);
  }
  
  return end;
}

// تنسيق مدة العقد بلغة عربية سليمة إعرابياً وبدون تكرار
function formatDuration(duration: number, unit: string | null | undefined): string {
  if (!duration) return "";
  
  // Normalize unit
  const normalizedUnit = (unit || "").trim().toLowerCase();
  
  const isDays = ["days", "day", "يوم", "أيام", "ايام"].includes(normalizedUnit);
  const isWeeks = ["weeks", "week", "أسبوع", "اسبوع", "أسابيع", "اسابيع"].includes(normalizedUnit);
  const isMonths = ["months", "month", "شهر", "أشهر", "اشهر", "شهر/أشهر", "شهر / أشهر"].includes(normalizedUnit);
  const isYears = ["years", "year", "سنة", "سنه", "سنوات"].includes(normalizedUnit);

  if (isDays) {
    if (duration === 1) return "يوم واحد";
    if (duration === 2) return "يومان";
    if (duration >= 3 && duration <= 10) return `${duration} أيام`;
    return `${duration} يوم`;
  }
  if (isWeeks) {
    if (duration === 1) return "أسبوع واحد";
    if (duration === 2) return "أسبوعان";
    if (duration >= 3 && duration <= 10) return `${duration} أسابيع`;
    return `${duration} أسبوع`;
  }
  if (isMonths) {
    if (duration === 1) return "شهر واحد";
    if (duration === 2) return "شهران";
    if (duration >= 3 && duration <= 10) return `${duration} أشهر`;
    return `${duration} شهر`;
  }
  if (isYears) {
    if (duration === 1) return "سنة واحدة";
    if (duration === 2) return "سنتان";
    if (duration >= 3 && duration <= 10) return `${duration} سنوات`;
    return `${duration} سنة`;
  }
  
  return `${duration} ${(unit && DURATION_UNITS[unit]) || unit || ""}`;
}



export default function ContractPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const hasViewPermission = usePermission("contracts.view");
  const hasContractSignPermission = usePermission("contracts.sign");
  const { user: currentUser } = useAuth();
  
  const [showFirstPartySignature, setShowFirstPartySignature] = useState(true);

  // التحقق من أن المستخدم الحالي هو المدير التنفيذي ولديه صلاحية توقيع العقود وتوقيع رقمي
  const userPermissionsList = (currentUser as any)?.permissions || [];
  const hasUserSignPerm = hasContractSignPermission || userPermissionsList.includes("contracts.sign");
  const isExecutiveDirectorRole = 
    (currentUser as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    currentUser?.name === "المدير التنفيذي" ||
    currentUser?.email === "ceo@manarah.org.sa";

  const isExecutiveDirectorContractSigner = 
    hasUserSignPerm &&
    isExecutiveDirectorRole &&
    !!(currentUser as any)?.signatureUrl &&
    (currentUser as any)?.showSignatureInDocuments !== false;

  const { data, isLoading, error } = trpc.contracts.getById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !!params.id }
  );

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasViewPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 font-bold" dir="rtl">
        عذراً، لا تملك صلاحية عرض تقرير طباعة العقد.
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">العقد غير موجود</h2>
          <Button onClick={() => navigate("/contracts")}>
            العودة للعقود
          </Button>
        </div>
      </div>
    );
  }

  const { contract, payments, organizationSettings: orgSettings, clauseValues } = data;
  const resolvedProjectName = (data as any)?.projectName || (contract as any)?.projectName || (contract as any)?.contractTitle || "";

  const executiveDirectorSignatureUrl = 
    (contract as any)?.firstPartySignatureUrl ||
    (contract as any)?.signatory?.signatureUrl ||
    null;

  const contractDate = contract.contractDate ? new Date(contract.contractDate) : new Date();

  let parsedCustomClauses: { title: string, description: string }[] = [];
  if (contract.customClausesJson) {
    try {
      parsedCustomClauses = typeof contract.customClausesJson === 'string'
        ? JSON.parse(contract.customClausesJson)
        : (contract.customClausesJson as any);
    } catch (e) {
      console.error("Error parsing custom clauses:", e);
    }
  }

  let parsedClauseValues: any[] = [];
  if (contract.clauseValuesJson) {
    try {
      parsedClauseValues = typeof contract.clauseValuesJson === 'string'
        ? JSON.parse(contract.clauseValuesJson)
        : (contract.clauseValuesJson as any);
    } catch (e) {
      console.error("Error parsing clauseValuesJson:", e);
    }
  }

  const effectiveClauseValues = (clauseValues && clauseValues.length > 0)
    ? clauseValues
    : parsedClauseValues;

  // دالة لاستبدال المتغيرات في نصوص البنود
  const replaceVariables = (content: string) => {
    if (!content) return "";
    let result = content;

    // Replace combined pattern if present for correct Arabic grammar
    if (contract.duration) {
      const formatted = formatDuration(contract.duration, contract.durationUnit || "months");
      result = result.split("{{duration}} {{durationUnit}}").join(formatted);
      result = result.split("{{duration}} {{duration_unit}}").join(formatted);
    }

    const variables: Record<string, string> = {
      "{{organizationName}}": orgSettings?.officialReportsName || "",
      "{{secondPartyName}}": contract.secondPartyName || "",
      "{{contractNumber}}": contract.contractNumber || "",
      "{{contractDate}}": contractDate.toLocaleDateString('ar-SA'),
      "{{contractAmount}}": parseFloat(contract.contractAmount).toLocaleString('ar-SA'),
      "{{contractAmountText}}": contract.contractAmountText || "",
      "{{duration}}": contract.duration?.toString() || "",
      "{{durationUnit}}": contract.durationUnit ? (DURATION_UNITS[contract.durationUnit] || contract.durationUnit) : "",
      "{{duration_unit}}": contract.durationUnit ? (DURATION_UNITS[contract.durationUnit] || contract.durationUnit) : "",
      "{{mosqueName}}": contract.mosqueName || "",
      "{{mosqueCity}}": contract.mosqueCity || "",
      "{{subject}}": contract.contractTitle || "",
      "{{authorizedSignatory}}": contract.signatory?.name || orgSettings?.authorizedSignatory || "",
      "{{signatoryTitle}}": contract.signatory?.title || orgSettings?.signatoryTitle || "",
    };

    Object.entries(variables).forEach(([key, value]) => {
      result = result.split(key).join(value);
    });

    return result;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* أزرار التحكم */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-2 sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end">
        <Button variant="outline" onClick={() => navigate(`/contracts/${params.id}/preview`)} className="bg-white border shadow-sm sm:bg-white/90">
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع للمعاينة
        </Button>

        {executiveDirectorSignatureUrl && (
          <label
            htmlFor="show-first-party-sig-print"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors cursor-pointer select-none text-xs font-medium text-slate-700"
          >
            <PenTool className={`w-3.5 h-3.5 ${showFirstPartySignature ? "text-emerald-600" : "text-slate-400"}`} />
            <span>توقيع الطرف الأول</span>
            <Checkbox
              id="show-first-party-sig-print"
              checked={showFirstPartySignature}
              onCheckedChange={(checked) => setShowFirstPartySignature(!!checked)}
              className="scale-90"
            />
          </label>
        )}

        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white font-semibold">
          <Printer className="ml-2 h-4 w-4" />
          تنزيل PDF / طباعة
        </Button>
      </div>

      {/* صفحة الطباعة */}
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-12 print:p-0 min-h-[297mm] relative flex flex-col justify-between">

        <div className="p-4 sm:p-8 print:p-4 relative min-h-[285mm] flex flex-col justify-between">
          <div>
            <div className="flex flex-row items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* شعار الجمعية */}
                {orgSettings?.logoUrl && (
                  <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 sm:h-20" style={{ marginRight: '8px' }} />
                )}
              </div>
              <div className="flex items-center">
                <img src="/assets/image-removebg-preview (1).png" alt="شعار إضافي" style={{ height: 'calc(var(--spacing) * 14)' }} />
              </div>
            </div>

            {/* عنوان العقد */}
            <div 
              className="text-center py-4 px-3 sm:px-6 mb-6 rounded-lg shadow-sm"
              style={{ backgroundColor: '#ae9b63', color: '#faf8f5' }}
            >
              <h1 className="text-lg sm:text-xl font-bold">
                عقد {CONTRACT_TYPES[contract.contractType] || contract.contractType} على تنفيذ مشروع {contract.mosqueName || "المسجد"}
                {contract.mosqueNeighborhood && ` بحي ${contract.mosqueNeighborhood}`}
              </h1>
            </div>

            {/* مقدمة العقد */}
            <p className="text-center mb-6 text-gray-700 text-sm sm:text-base leading-relaxed">
              إنه في يوم {getArabicDayName(contractDate)} بتاريخ {toHijriDate(contractDate)} الموافق {contractDate.toLocaleDateString('ar-SA')} فقد تم الاتفاق بين كل من:
            </p>

            {/* الطرف الأول */}
            <div className="mb-6">
              <div 
                className="py-2 px-4 mb-3 rounded"
                style={{ backgroundColor: '#e8f5e9' }}
              >
                <h2 className="font-bold text-green-800 text-sm sm:text-base">
                  {orgSettings?.officialReportsName || ""}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-600 w-24 sm:w-40">ويمثلها في هذا العقد:</td>
                      <td className="py-1 font-medium">{(contract.signatory?.name || orgSettings?.authorizedSignatory || "----")} بصفته {(contract.signatory?.title || orgSettings?.signatoryTitle || "----")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">العنوان والاتصال:</td>
                      <td className="py-1">{(contract.signatory?.address || orgSettings?.address || "----")} | جوال ({(contract.signatory?.phone || orgSettings?.phone || "----")})</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">البريد الإلكتروني:</td>
                      <td className="py-1 text-right" dir="ltr">{(contract.signatory?.email || orgSettings?.email || "----")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">ويشار إليها بـ:</td>
                      <td className="py-1 font-bold">الطرف الأول</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* الطرف الثاني */}
            <div className="mb-6">
              <div 
                className="py-2 px-4 mb-3 rounded"
                style={{ backgroundColor: '#e8f5e9' }}
              >
                <h2 className="font-bold text-green-800 text-sm sm:text-base">
                  {contract.secondPartyName}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-600 w-24 sm:w-40">سجل تجاري رقم:</td>
                      <td className="py-1 text-right" dir="ltr">({contract.secondPartyCommercialRegister || "----"})</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">ويمثلها في هذا العقد:</td>
                      <td className="py-1 font-medium">{contract.secondPartyRepresentative || "----"} بصفته {contract.secondPartyTitle || "----"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">العنوان والاتصال:</td>
                      <td className="py-1">{contract.secondPartyAddress || "----"} | جوال ({contract.secondPartyPhone || "----"})</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">البريد الإلكتروني:</td>
                      <td className="py-1 text-right" dir="ltr">{contract.secondPartyEmail || "----"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">ويشار إليها بـ:</td>
                      <td className="py-1 font-bold">الطرف الثاني</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>



            {/* التمهيد */}
            {contract.introTemplate && (
              <div className="mb-6 break-inside-avoid">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base text-right"
                  style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
                >
                  تمهيد:
                </h3>
                <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right break-words">
                  {replaceVariables(contract.introTemplate)}
                </div>
              </div>
            )}

            {/* بنود العقد الديناميكية */}
            <div className="space-y-6">
              {effectiveClauseValues?.filter((c: any) => c.isIncluded ?? true).map((clause: any, index: number) => {
                const fallbackObj = parsedClauseValues[index] || {};
                const clauseTitle = clause.originalTitleAr || clause.titleAr || clause.title || fallbackObj.titleAr || fallbackObj.title;
                const clauseContent = clause.customContent || clause.originalContent || clause.content || fallbackObj.customContent || fallbackObj.content;
                if (!clauseTitle && !clauseContent) return null;
                return (
                  <div key={clause.id || `clause-${index}`} className="mb-6 break-inside-avoid">
                    {clauseTitle && clauseTitle.trim() !== "" && (
                      <h3 
                        className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                        style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
                      >
                        {clauseTitle.endsWith(':') ? clauseTitle : `${clauseTitle}:`}
                      </h3>
                    )}
                    <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right break-words">
                      {replaceVariables(clauseContent || "")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* البنود المخصصة */}
            {parsedCustomClauses && parsedCustomClauses.length > 0 && (
              <div className="space-y-6 mb-6">
                {parsedCustomClauses.map((clause, index) => (
                  <div key={`custom-${index}`} className="mb-6 break-inside-avoid">
                    <h3 
                      className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                      style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
                    >
                      {clause.title || `بند إضافي ${index + 1}`}:
                    </h3>
                    <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right">
                      {clause.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* المدة وجدول الدفعات */}
            <div className="mb-6 break-inside-avoid">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
              >
                المدة وجدول الدفعات:
              </h3>
              <div className="pr-2 sm:pr-4">
                {/* مدة العقد وتواريخه */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-gray-600 font-medium">تاريخ بداية العقد:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {contract.startDate ? `${new Date(contract.startDate).toLocaleDateString('ar-SA')} م (${toHijriDate(new Date(contract.startDate))})` : "----"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">تاريخ نهاية العقد:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {(() => {
                        const calculatedEnd = getEndDate(contract.startDate, contract.duration, contract.durationUnit, contract.endDate);
                        return calculatedEnd ? `${calculatedEnd.toLocaleDateString('ar-SA')} م (${toHijriDate(calculatedEnd)})` : "----";
                      })()}
                    </span>
                  </div>
                </div>

                {/* جدول الدفعات */}
                <div className="text-xs sm:text-sm mb-6">
                  <p className="mb-2 font-medium text-gray-800">جدول استحقاق الدفعات المالية المعتمدة:</p>
                  {payments && payments.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full border-collapse text-right text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-gray-100/80 border-b border-gray-200">
                            <th className="py-2.5 px-3 font-bold text-gray-700 w-12 border-l border-gray-200">م</th>
                            <th className="py-2.5 px-3 font-bold text-gray-700 border-l border-gray-200">اسم الدفعة / المرحلة</th>
                            <th className="py-2.5 px-3 font-bold text-gray-700 border-l border-gray-200">قيمة الدفعة</th>
                            <th className="py-2.5 px-3 font-bold text-gray-700 border-l border-gray-200">النسبة</th>
                            <th className="py-2.5 px-3 font-bold text-gray-700">تاريخ الاستحقاق المتوقع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p: any, idx: number) => {
                            const pAmount = parseFloat(p.amount);
                            const totalContractAmount = parseFloat(contract.contractAmount) || 1;
                            const percentage = Math.round((pAmount / totalContractAmount) * 100);
                            return (
                              <tr key={p.id} className="border-b border-gray-200 last:border-b-0">
                                <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">{idx + 1}</td>
                                <td className="py-2.5 px-3 border-l border-gray-200 font-semibold text-gray-900">{p.phaseName || p.description || `الدفعة ${idx + 1}`}</td>
                                <td className="py-2.5 px-3 border-l border-gray-200 font-bold text-[#1a5f4a]">{pAmount.toLocaleString('ar-SA')} ريال</td>
                                <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">{p.completionPercentage || percentage}%</td>
                                <td className="py-2.5 px-3 text-gray-600">
                                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString('ar-SA') : "عند الانتهاء من المرحلة"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 italic pr-2">لا يوجد جدول دفعات محدد لهذا العقد.</p>
                  )}
                </div>
              </div>
            </div>

            {/* القيمة المالية وتفاصيل الحساب */}
            <div className="mb-6 pt-3 print:!pt-4 break-inside-avoid">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
              >
                القيمة المالية وتفاصيل الحساب:
              </h3>
              <div className="pr-2 sm:pr-4">
                <p className="text-xs sm:text-sm text-gray-700 mb-4">
                  قيمة العقد: ({parseFloat(contract.contractAmount).toLocaleString('ar-SA')} ريال – {contract.contractAmountText || numberToArabicText(parseFloat(contract.contractAmount))})
                </p>
                <div className="text-xs sm:text-sm">
                  <p className="mb-2 font-medium">يتم تحويل الدفعات على حساب الطرف الثاني وفقاً للتفاصيل التالية:</p>
                  <ul className="list-none space-y-1 text-gray-700">
                    <li><span className="text-gray-600 ml-1">اسم الحساب:</span> <span className="font-medium">{contract.secondPartyAccountName || contract.secondPartyName}</span></li>
                    <li><span className="text-gray-600 ml-1">رقم الآيبان:</span> <span className="font-medium" dir="ltr">{contract.secondPartyIban || "----"}</span></li>
                    <li><span className="text-gray-600 ml-1">اسم البنك:</span> <span className="font-medium">{contract.secondPartyBankName || "----"}</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* التوقيعات وتذييل الصفحة مقطع واحد يمنع الانقسام نهائياً أثناء الطباعة */}
            <div className="contract-signature-block-wrapper" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div className="mt-12 contract-signature-section" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="text-center mb-8">
                  <p className="font-bold text-base sm:text-lg">هذا وبالله التوفيق،،،</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* الطرف الأول */}
                  <div className="text-center border-l pl-4">
                    <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الأول</h4>
                    <p className="font-medium text-xs sm:text-sm">{orgSettings?.officialReportsName || ""}</p>
                    <p className="text-xs sm:text-sm">{(contract.firstPartySignatoryName || contract.signatory?.name || orgSettings?.authorizedSignatory || "المدير التنفيذي")}</p>
                    <p className="text-xs sm:text-xs text-gray-600">{(contract.firstPartySignatoryTitle || contract.signatory?.title || orgSettings?.signatoryTitle || "المدير التنفيذي")}</p>
                    <div className="mt-8 space-y-4 text-xs sm:text-sm">
                      <div className="relative inline-flex items-center justify-center">
                        <p>التوقيع: ...................................</p>
                        {showFirstPartySignature && executiveDirectorSignatureUrl && (
                          <img
                            src={executiveDirectorSignatureUrl}
                            alt="توقيع الطرف الأول"
                            className="absolute -top-4 right-10 h-14 max-w-[140px] object-contain pointer-events-none"
                          />
                        )}
                      </div>
                      <p>التاريخ: ...................................</p>
                    </div>
                    <p className="mt-4 text-xs text-gray-600 font-semibold">الختم / الطابع الرسمي</p>
                    <div className="h-24 mt-2 flex items-center justify-center overflow-hidden bg-gray-50/30 p-1">
                      {contract.status === "approved" && orgSettings?.stampUrl ? (
                        <img src={orgSettings.stampUrl} alt="الختم / الطابع الرسمي" className="h-20 max-w-full object-contain drop-shadow-sm" />
                      ) : (
                        <span className="text-[10px] text-gray-400">مخصص للختم الرسمي</span>
                      )}
                    </div>
                  </div>

                  {/* الطرف الثاني */}
                  <div className="text-center pr-4">
                    <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الثاني</h4>
                    <p className="font-medium text-xs sm:text-sm">{contract.secondPartyName}</p>
                    <p className="text-xs sm:text-sm">{contract.secondPartyRepresentative || "----"}</p>
                    <p className="text-xs sm:text-xs text-gray-600">{contract.secondPartyTitle || "----"}</p>
                    <div className="mt-8 space-y-4 text-xs sm:text-sm">
                      <p>التوقيع: ...................................</p>
                      <p>التاريخ: ...................................</p>
                    </div>
                    <p className="mt-4 text-xs text-gray-600 font-semibold">الختم الرسمي</p>
                    <div className="h-24 mt-2 flex items-center justify-center overflow-hidden bg-gray-50/30 p-1">
                      <span className="text-[10px] text-gray-400">مخصص لختم الطرف الثاني</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* تذييل الصفحة */}
              <div 
                className="text-center text-xs text-gray-500 mt-12 border-t pt-4 px-4 sm:px-8 space-y-3"
              >
                {contract.status === "approved" && orgSettings?.stampUrl && (
                  <div className="flex justify-between items-center py-2 px-3 bg-emerald-50/40 rounded-lg border border-emerald-100/80 mb-2">
                    <div className="flex items-center gap-2.5">
                      <img src={orgSettings.stampUrl} alt="الختم الرسمي" className="h-11 w-auto object-contain" />
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-emerald-900 block">عقد معتمد رسمياً</span>
                        <span className="text-[9px] text-gray-500 font-mono block">رقم العقد: {contract.contractNumber}</span>
                      </div>
                    </div>
                    <div className="text-left text-[9px] text-gray-500 font-mono">
                      تاريخ الاعتماد: {contract.approvedAt ? new Date(contract.approvedAt).toLocaleDateString('ar-SA') : new Date().toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                )}

                <div className="flex flex-row justify-between items-center gap-1">
                  <span>E: {orgSettings?.email || "info@tamam.org.sa"}</span>
                  <span>{orgSettings?.website || "tamamgate.manarah.org.sa"}</span>
                  <span>{orgSettings?.address || "المملكة العربية السعودية"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 20mm 15mm;
            @bottom-left {
              content: "${(resolvedProjectName || contract.contractTitle || contract.contractNumber || '').replace(/"/g, "'")}";
              font-family: 'Cairo', Arial, sans-serif;
              font-size: 10px;
              color: #374151;
              font-weight: 700;
            }
            @bottom-right {
              content: 'صفحة ' counter(page) ' من ' counter(pages);
              font-family: 'Cairo', Arial, sans-serif;
              font-size: 10px;
              color: #374151;
              font-weight: 600;
            }
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 8mm !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          h1, h2, h3, h4 {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            display: block !important;
            line-height: 1.4 !important;
            min-height: 0 !important;
          }
          .break-inside-avoid {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 0.6rem !important;
            overflow: visible !important;
            height: auto !important;
          }
          html body .contract-signature-block-wrapper,
          html body .contract-signature-block-wrapper *,
          html body .contract-signature-section,
          html body .contract-signature-section * {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          p, .whitespace-pre-wrap, table, tr {
            break-inside: auto !important;
            page-break-inside: auto !important;
            orphans: 2 !important;
            widows: 2 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .mb-6 {
            margin-bottom: 0.6rem !important;
          }
          .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0.5rem !important;
          }
          .py-4 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          .mb-3 {
            margin-bottom: 0.4rem !important;
          }
          .mt-12 {
            margin-top: 1.5rem !important;
          }
          .space-y-6, .space-y-4 {
            display: block !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
