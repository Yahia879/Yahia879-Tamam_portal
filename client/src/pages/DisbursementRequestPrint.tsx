import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, CheckSquare, Square } from "lucide-react";
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

  return `فقط ${convertMillions(Math.floor(num))} ريال`;
}

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

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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
  if (request?.attachmentsJson) {
    try {
      const attachments = JSON.parse(request.attachmentsJson);
      if (Array.isArray(attachments)) {
        const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
        if (infoAttachment && infoAttachment.url) {
          customSupplier = JSON.parse(infoAttachment.url);
        }
      }
    } catch (e) {
      console.error("Error parsing custom supplier print:", e);
    }
  }

  const resolvedSupplierName = customSupplier?.name || contract?.secondPartyName || "—";
  const resolvedSupplierAccountName = customSupplier?.name || contract?.secondPartyAccountName || contract?.secondPartyName || "—";
  const resolvedSupplierIban = customSupplier?.iban || contract?.secondPartyIban || "—";
  const resolvedSupplierBankName = customSupplier?.bank || contract?.secondPartyBankName || "—";

  const requestDate = new Date(request.requestedAt || new Date());

  // حساب بيانات الدعم والأجور الإدارية
  const supportingEntity = contract?.supportingEntity || "";
  const isDonationShop = supportingEntity === "متجر التبرعات";
  const isEhsan = supportingEntity === "منصة احسان" || supportingEntity === "منصة إحسان";
  const isDirectDonation = supportingEntity === "تبرع مباشر";
  const isOther = supportingEntity && !isDonationShop && !isEhsan && !isDirectDonation;

  const hasContract = !!contract;
  const actualProjectCost = hasContract ? parseFloat(contract.contractAmount || "0") : amount;
  const managementPercentage = hasContract ? parseFloat((contract as any).managementPercentage || "0") : 0;
  const adminFees = (actualProjectCost * managementPercentage) / 100;
  const totalOpportunityValue = actualProjectCost + adminFees;

  const projectAddress = contract?.mosqueCity || (project as any)?.city || (project as any)?.address || "—";

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
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 print:p-0 min-h-[297mm] relative flex flex-col justify-between">
        {/* إطار مزدوج فاخر للمستند */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-between">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-between space-y-4">
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
                      {orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
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

              {/* 1. مصدر دعم الفرصة */}
              <div className="mb-4 border border-gray-300 rounded-lg p-3 bg-white">
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-gray-800 text-sm">مصدر دعم الفرصة:</span>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      {isDonationShop ? <CheckSquare className="h-4.5 w-4.5 text-[#1a5f4a]" /> : <Square className="h-4.5 w-4.5 text-gray-400" />}
                      <span className="font-semibold text-gray-750">متجر التبرعات</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEhsan ? <CheckSquare className="h-4.5 w-4.5 text-[#1a5f4a]" /> : <Square className="h-4.5 w-4.5 text-gray-400" />}
                      <span className="font-semibold text-gray-750">منصة إحسان</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDirectDonation ? <CheckSquare className="h-4.5 w-4.5 text-[#1a5f4a]" /> : <Square className="h-4.5 w-4.5 text-gray-400" />}
                      <span className="font-semibold text-gray-750">تبرع مباشر</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOther ? <CheckSquare className="h-4.5 w-4.5 text-[#1a5f4a]" /> : <Square className="h-4.5 w-4.5 text-gray-400" />}
                      <span className="font-semibold text-gray-750 flex items-center gap-1">
                        <span>أخرى:</span>
                        <span className="border-b border-gray-400 px-2 min-w-[150px] inline-block text-center font-bold h-5 leading-none">
                          {isOther ? supportingEntity : "\u00A0"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. خاص بدعم المؤسسات المانحة والمسؤولية المجتمعية */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  خاص بدعم المؤسسات المانحة والمسؤولية المجتمعية
                </div>
                <div className="grid grid-cols-2 text-xs sm:text-sm">
                  <div className="flex border-l border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الجهة الداعمة:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{supportingEntity || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-32 border-l border-gray-200 text-gray-750 shrink-0">مبلغ الدعم:</span>
                    <span className="p-2.5 text-gray-800 font-bold font-mono flex-1">
                      {contract?.supportedAmount ? `${parseFloat(contract.supportedAmount.toString()).toLocaleString()} ريال` : `${totalOpportunityValue.toLocaleString()} ريال`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. معلومات المشروع */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-2 text-xs sm:text-sm">
                  <div className="flex border-l border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم المشروع:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{project?.name || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-32 border-l border-gray-200 text-gray-750 shrink-0">عنوان المشروع:</span>
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
                  {request.description || request.title || "—"}
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
                      <td className="p-2.5 border-l border-gray-200 text-gray-600 font-medium">{request.title || request.description || "—"}</td>
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
            </div>

            {/* 7. التوقيعات والاعتماد */}
            <div className="break-inside-avoid pt-4">
              <div className="grid grid-cols-3 gap-6 text-center">
                {/* مكتب إدارة المشاريع */}
                <div className="p-2">
                  <div className="font-bold text-gray-800 text-xs sm:text-sm mb-12">
                    مكتب إدارة المشاريع
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="h-10 border-b border-dashed border-gray-300 mx-auto w-36"></div>
                    <div className="text-gray-900 font-bold">{(orgSettings as any)?.pmoManagerName || "—"}</div>
                  </div>
                </div>

                {/* الاتصال المؤسسي */}
                <div className="p-2">
                  <div className="font-bold text-gray-800 text-xs sm:text-sm mb-12">
                    الاتصال المؤسسي
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="h-10 border-b border-dashed border-gray-300 mx-auto w-36"></div>
                    <div className="text-gray-900 font-bold">{(orgSettings as any)?.csrManagerName || "—"}</div>
                  </div>
                </div>

                {/* المدير التنفيذي */}
                <div className="p-2">
                  <div className="font-bold text-[#5d4037] text-xs sm:text-sm mb-12">
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
