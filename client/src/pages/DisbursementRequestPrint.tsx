import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

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

  function getHalalasText(halalas: number): string {
    if (halalas === 1) return "هللة واحدة";
    if (halalas === 2) return "هللتان";
    const masculineOnes = ["", "", "", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثمان", "تسع", "عشر"];
    if (halalas >= 3 && halalas <= 10) {
      return `${masculineOnes[halalas]} هللات`;
    }
    return `${convertHundreds(halalas)} هللة`;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const integerText = convertMillions(integerPart);
  
  if (decimalPart > 0) {
    const decimalText = getHalalasText(decimalPart);
    return `فقط ${integerText} ريال و${decimalText}`;
  }
  
  return `فقط ${integerText} ريال`;
}

function toHijriDate(date: Date): string {
  let formatted = "";
  try {
    formatted = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  } catch (e) {
    const gregorianYear = date.getUTCFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    formatted = `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${hijriYear}`;
  }
  
  // Remove any existing "هـ" or "ه" to avoid duplicates and ensure clean format
  formatted = formatted.replace(/هـ/g, "").replace(/ه/g, "").trim();
  // Remove any trailing direction marks or spaces
  formatted = formatted.replace(/[\s\u200e\u200f]+$/, "");
  return `${formatted} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()} م`;
}

export default function DisbursementRequestPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const hasApprovePermission = usePermission("disbursements.approve");

  const { data: request, isLoading } = trpc.disbursements.getRequestById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !!params.id }
  );

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // جلب تقارير الإنجاز للمشروع المحدد
  const { data: progressReports } = trpc.progressReports.list.useQuery(
    { projectId: request?.projectId || undefined },
    { enabled: !!request?.projectId }
  );

  // البحث عن تقرير الإنجاز المرتبط بناءً على معرف الدفعة
  const associatedReport = progressReports?.find((r: any) => {
    if (!r.workSummary || !request) return false;
    const match = r.workSummary.match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (match) {
      const pId = match[1].trim();
      return pId === request.contractPaymentId?.toString() || 
             pId === `cp-${request.contractPaymentId}` ||
             pId === request.paymentId?.toString() ||
             pId === `manual-${request.paymentId}`;
    }
    return false;
  });

  // تحليل تفاصيل الأعمال المجدولة والمنفذة
  const parsedWorks = (() => {
    const combined = associatedReport?.workSummary || "";
    if (!combined) return { scheduled: "", actual: "" };

    const schedMatch = combined.match(/الأعمال المجدولة للدفعة:\r?\n([\s\S]*?)(?:\r?\n\r?الأعمال المنفذة فعلياً:|\r?\n\r?\[معرف الدفعة:|$)/);
    const actualMatch = combined.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);

    const schedMatchNoNL = schedMatch ? null : combined.match(/الأعمال المجدولة للدفعة:\s*([\s\S]*?)(?:الأعمال المنفذة فعلياً:|\[معرف الدفعة:|$)/);
    const actualMatchNoNL = actualMatch ? null : combined.match(/الأعمال المنفذة فعلياً:\s*([\s\S]*?)(?:\[معرف الدفعة:|$)/);

    const scheduled = schedMatch 
      ? schedMatch[1].trim() 
      : (schedMatchNoNL 
          ? schedMatchNoNL[1].trim() 
          : combined.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim());

    const actual = actualMatch 
      ? actualMatch[1].trim() 
      : (actualMatchNoNL 
          ? actualMatchNoNL[1].trim() 
          : "");

    return { scheduled, actual };
  })();

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasApprovePermission) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 font-bold" dir="rtl">
        عذراً، لا تملك صلاحية عرض تقرير طلب الصرف.
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">طلب الصرف غير موجود</h2>
          <Button onClick={() => navigate("/disbursements")}>
            العودة لطلبات الصرف
          </Button>
        </div>
      </div>
    );
  }

  const amount = parseFloat(request.amount?.toString() || "0");
  const project = request.project;
  const contract = request.contract;
  
  let customSupplier: any = null;
  let linkedRequestInfo: any = null;
  if (request?.attachmentsJson) {
    try {
      const attachments = JSON.parse(request.attachmentsJson);
      if (Array.isArray(attachments)) {
        const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
        if (infoAttachment && infoAttachment.url) {
          customSupplier = JSON.parse(infoAttachment.url);
        }
        const linkedAttachment = attachments.find((a: any) => a.name === "linked_request_info");
        if (linkedAttachment && linkedAttachment.url) {
          linkedRequestInfo = JSON.parse(linkedAttachment.url);
        }
      }
    } catch (e) {
      console.error("Error parsing supplier/linked print metadata:", e);
    }
  }

  const isCustomType = !!customSupplier && ["supplier_one_time", "sadad_invoice", "misc_expenses"].includes(customSupplier.requestType);

  const resolvedSupplierName = customSupplier?.name || contract?.secondPartyName || "—";
  const resolvedSupplierAccountName = customSupplier?.name || contract?.secondPartyAccountName || contract?.secondPartyName || "—";
  const resolvedSupplierIban = customSupplier?.iban || contract?.secondPartyIban || "—";
  const resolvedSupplierBankName = customSupplier?.bank || contract?.secondPartyBankName || "—";
  const resolvedMainProjectName = customSupplier?.mainProjectName || linkedRequestInfo?.mainProjectName || "—";

  const requestDate = new Date(request.requestedAt || new Date());

  // حساب بيانات الدعم والأجور الإدارية
  const supportingEntity = contract?.supportingEntity || "";
  let supportSources: { entity: string; customEntity?: string; amount: number }[] = [];
  
  if (supportingEntity && supportingEntity.trim().startsWith('[')) {
    try {
      supportSources = JSON.parse(supportingEntity);
    } catch (e) {
      console.error("Failed to parse supportingEntity JSON", e);
    }
  }

  const hasContract = !!contract;
  const actualProjectCost = hasContract ? parseFloat(contract.contractAmount || "0") : amount;
  const managementPercentage = hasContract ? parseFloat((contract as any).managementPercentage || "0") : 0;
  const adminFees = request.adminFees 
    ? parseFloat(request.adminFees.toString()) 
    : (customSupplier?.adminFees 
        ? parseFloat(customSupplier.adminFees) 
        : (hasContract ? (actualProjectCost * managementPercentage) / 100 : 0));
  const totalOpportunityValue = actualProjectCost + adminFees;

  if (supportSources.length === 0 && supportingEntity) {
    const isDonationShop = supportingEntity === "متجر التبرعات";
    const isEhsan = supportingEntity === "منصة احسان" || supportingEntity === "منصة إحسان";
    const isDirectDonation = supportingEntity === "تبرع مباشر";
    const isOther = !isDonationShop && !isEhsan && !isDirectDonation;
    const amt = contract?.supportedAmount ? parseFloat(contract.supportedAmount.toString()) : totalOpportunityValue;
    supportSources = [{
      entity: isDonationShop ? "متجر التبرعات" : isEhsan ? "منصة احسان" : isDirectDonation ? "تبرع مباشر" : "اخرى",
      customEntity: isOther ? supportingEntity : "",
      amount: amt
    }];
  }



  const resolvedSupportingEntitiesText = (supportSources.length > 0
    ? supportSources.map(s => {
        const name = s.entity === "اخرى" ? s.customEntity : s.entity;
        if (supportSources.length > 1) {
          return `${name} (${s.amount.toLocaleString()} ريال)`;
        }
        return name;
      }).join("، ")
    : (customSupplier?.fundingSupport || linkedRequestInfo?.fundingSupport || "")) || "—";

  const totalSupportedAmount = supportSources.reduce((sum, s) => sum + s.amount, 0);

  const projectAddress = customSupplier?.projectCity || contract?.mosqueCity || 
    [
      project?.city, 
      project?.district, 
      project?.address === "موقع محدد على الخريطة" ? "" : project?.address
    ].filter(Boolean).join(" - ") || 
    "—";

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* أزرار التحكم */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex justify-between items-center sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end sm:gap-2">
        <Button variant="outline" onClick={() => navigate("/disbursements")} className="bg-white border shadow-sm sm:bg-white/90">
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white font-semibold">
          <Printer className="ml-2 h-4 w-4" />
          تنزيل PDF / طباعة
        </Button>
      </div>

      {/* صفحة الطباعة - تصميم متوازن لصفحة A4 */}
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 print:p-0 min-h-[297mm] relative flex flex-col justify-start">
        {/* إطار مزدوج فاخر للمستند */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-start">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-start space-y-8">
            <div>
              {/* الترويسة - الشعار والتاريخ ورقم الطلب */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-4">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 w-auto" />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {orgSettings?.officialReportsName || ""}
                    </div>
                    <div className="text-[10px] text-gray-500">مكتب إدارة المشاريع</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-right sm:text-left">
                  <div className="flex gap-1.5 justify-start sm:justify-end">
                    <span className="font-bold text-gray-600">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-2">{toHijriDate(requestDate)}</span>
                  </div>
                  <div className="flex gap-1.5 justify-start sm:justify-end">
                    <span className="font-bold text-gray-600">الموافق:</span>
                    <span className="border-b border-dotted border-gray-400 px-2">{formatGregorianDate(requestDate)} م</span>
                  </div>
                  <div className="flex gap-1.5 justify-start sm:justify-end">
                    <span className="font-bold text-gray-600">رقم الطلب:</span>
                    <span className="border-b border-dotted border-gray-400 px-2 font-mono text-gray-900 font-bold">{request.requestNumber}</span>
                  </div>
                </div>
              </div>

              {/* عنوان النموذج الفاخر */}
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-black text-gray-800 pb-1 inline-block px-4 tracking-wide">
                  طلب صرف
                </h1>
              </div>

              {/* تم إزالة الخانات الأربعة المثبتة لعرض الجهات الداعمة ديناميكياً بالجدول أدناه */}

              {/* 2. خاص بدعم المؤسسات المانحة والمسؤولية المجتمعية */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-2 text-xs sm:text-sm">
                  <div className="flex border-l border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الجهة الداعمة:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{resolvedSupportingEntitiesText || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-32 border-l border-gray-200 text-gray-750 shrink-0">مبلغ الدعم:</span>
                    <span className="p-2.5 text-gray-800 font-bold font-mono flex-1">
                      {totalSupportedAmount ? `${totalSupportedAmount.toLocaleString()} ريال` : `${totalOpportunityValue.toLocaleString()} ريال`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. معلومات المشروع */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-2 text-xs sm:text-sm">
                  <div className="flex border-l border-b border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">المشروع الرئيسي:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{resolvedMainProjectName}</span>
                  </div>
                  <div className="flex border-b border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-32 border-l border-gray-200 text-gray-750 shrink-0">اسم المشروع:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{isCustomType ? (customSupplier?.customProjectName || "—") : (project?.name || "—")}</span>
                  </div>
                  <div className="flex col-span-2">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">عنوان المشروع:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{projectAddress}</span>
                  </div>
                </div>
              </div>

              {/* 4. وصف الأعمال المطلوبة */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-gray-800">
                  وصف الأعمال المطلوبة
                </div>
                <div className="p-3 bg-white text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-semibold min-h-[60px]">
                  {isCustomType 
                    ? (customSupplier?.customProjectName || "—") 
                    : (parsedWorks.scheduled || request.description || request.title || "—")}
                </div>
              </div>

              {/* 5. جدول التكلفة والرسوم الإدارية */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs sm:text-sm text-center border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200 w-1/3">تكلفة المشروع الفعلية</td>
                      <td className="p-2.5 font-bold font-mono text-gray-800 border-l border-gray-200 w-1/3">
                        {actualProjectCost.toLocaleString()}
                      </td>
                      <td className="p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200 w-1/6">الأجور الإدارية</td>
                      <td className="p-2.5 font-bold font-mono text-gray-800 w-1/6">
                        {adminFees > 0 ? adminFees.toLocaleString() : "0"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200">إجمالي قيمة الفرصة</td>
                      <td className="p-2.5 font-bold font-mono text-emerald-800 border-l border-gray-200">
                        {totalOpportunityValue.toLocaleString()}
                      </td>
                      <td className="p-2.5 border-l border-gray-200" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. الموردون والمقاولون */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  الموردون والمقاولون
                </div>
                <table className="w-full text-xs sm:text-sm text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-55 border-b border-gray-200 text-gray-750">
                      <th className="p-2 font-bold border-l border-gray-200 w-1/2">اسم المورد</th>
                      <th className="p-2 font-bold border-l border-gray-200 w-1/4">الأعمال المنفذة</th>
                      <th className="p-2 font-bold w-1/4">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2.5 border-l border-gray-200 font-bold text-gray-800 text-right pr-4">{resolvedSupplierName}</td>
                      <td className="p-2.5 border-l border-gray-200 text-gray-600 font-medium">
                        {isCustomType 
                          ? (customSupplier?.customProjectName || "—") 
                          : (parsedWorks.actual || request.title || request.description || "—")}
                      </td>
                      <td className="p-2.5 font-bold font-mono text-emerald-700">{amount.toLocaleString()} ريال</td>
                    </tr>

                    <tr className="border-b border-gray-200 h-8 bg-gray-50/10">
                      <td className="border-l border-gray-200"></td>
                      <td className="border-l border-gray-200"></td>
                      <td></td>
                    </tr>
                    <tr className="h-8 bg-gray-50/10">
                      <td className="border-l border-gray-200"></td>
                      <td className="border-l border-gray-200"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* المعلومات البنكية للمورد */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  {customSupplier?.requestType === "sadad_invoice" ? "تفاصيل نظام سداد" : "المعلومات البنكية للمورد"}
                </div>
                <div className="flex flex-col text-xs sm:text-sm">
                  {customSupplier?.requestType === "sadad_invoice" ? (
                    <>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">المفوتر:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1 truncate">{customSupplier?.billerName || "—"}</span>
                      </div>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">رمز المفوتر:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1 font-mono">{customSupplier?.billerCode || "—"}</span>
                      </div>
                      <div className="flex">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">رقم سداد:</span>
                        <span className="p-2.5 text-gray-800 font-bold font-mono flex-1 text-[11px] sm:text-xs tracking-wider">{customSupplier?.sadadNumber || "—"}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الحساب:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1 truncate">{resolvedSupplierAccountName}</span>
                      </div>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم البنك:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1">{resolvedSupplierBankName}</span>
                      </div>
                      <div className="flex">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">الآيبان:</span>
                        <span className="p-2.5 text-gray-800 font-bold font-mono flex-1 text-[11px] sm:text-xs tracking-wider">{resolvedSupplierIban}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 7. التوقيعات والاعتماد */}
            <div className="break-inside-avoid pt-4">
              <div className={`grid ${request?.creatorHasSignPermission && request?.requestedBySignatureName && request?.requestedBySignatureDepartment ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"} gap-6 text-center`}>
                {/* معد الطلب - يظهر فقط إذا كان لديه صلاحية التوقيع وعبّأ معلومات التوقيع */}
                {request?.creatorHasSignPermission && request?.requestedBySignatureName && request?.requestedBySignatureDepartment && (
                  <div className="p-2">
                    <div className="font-bold text-gray-800 text-xs sm:text-sm mb-4">
                      {request.requestedBySignatureDepartment}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="h-10 border-b border-dashed border-gray-300 mx-auto w-36"></div>
                      <div className="text-gray-900 font-bold">{request.requestedBySignatureName}</div>
                    </div>
                  </div>
                )}

                {/* المدير التنفيذي */}
                <div className="p-2">
                  <div className="font-bold text-gray-800 text-xs sm:text-sm mb-4">
                    المدير التنفيذي
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="h-10 border-b border-dashed border-gray-300 mx-auto w-36"></div>
                    <div className="text-gray-900 font-bold">{orgSettings?.executiveDirectorName || "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* أنماط الطباعة المتقدمة */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0 !important;
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
            padding: 10mm !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-inner {
            min-height: 277mm !important;
            border-width: 2px !important;
            padding: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
