import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { numberToArabicText } from "@shared/tafqeet";


// دالة تحويل التاريخ الميلادي إلى هجري
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
  
  formatted = formatted.replace(/هـ/g, "").replace(/ه/g, "").trim();
  formatted = formatted.replace(/[\s\u200e\u200f]+$/, "");
  return `${formatted} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "إصدار شيك",
  custody: "صرف من العهدة",
  sadad: "سداد",
};

export default function DisbursementOrderPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const hasOrderViewPermission = usePermission("disbursement_orders.view");

  const { data: order, isLoading } = trpc.disbursements.getOrderById.useQuery(
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

  if (!hasOrderViewPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 font-bold" dir="rtl">
        عذراً، لا تملك صلاحية عرض أمر الصرف.
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">أمر الصرف غير موجود</h2>
          <Button onClick={() => navigate("/disbursements")}>
            العودة لطلبات الصرف
          </Button>
        </div>
      </div>
    );
  }
  const amount = parseFloat(order.amount?.toString() || "0");
  const request = order.disbursementRequest;
  const project = order.project;
  const orderDate = new Date(order.createdAt || new Date());

  // تحليل تفاصيل المرفقات المخصصة
  let customSupplier: any = null;
  let linkedRequestInfo: any = null;
  if (request?.attachmentsJson) {
    try {
      const attachments = typeof request.attachmentsJson === "string" ? JSON.parse(request.attachmentsJson) : request.attachmentsJson;
      if (Array.isArray(attachments)) {
        const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
        if (infoAttachment && infoAttachment.url) {
          customSupplier = typeof infoAttachment.url === "string" ? JSON.parse(infoAttachment.url) : infoAttachment.url;
        }
        const linkedAttachment = attachments.find((a: any) => a.name === "linked_request_info");
        if (linkedAttachment && linkedAttachment.url) {
          linkedRequestInfo = typeof linkedAttachment.url === "string" ? JSON.parse(linkedAttachment.url) : linkedAttachment.url;
        }
      }
    } catch (e) {
      console.error("Error parsing supplier/linked print metadata:", e);
    }
  }

  // حساب جهة التمويل/الدعم
  const resolvedSupportingEntity = customSupplier?.fundingSupport || linkedRequestInfo?.fundingSupport || project?.fundingSource || "—";

  // اسم المشروع الرئيسي
  const resolvedMainProjectName = customSupplier?.mainProjectName || linkedRequestInfo?.mainProjectName || "—";

  const isTamamLinked = !!customSupplier?.isTamamLinked;
  const actualProjectValue = parseFloat(customSupplier?.actualProjectValue?.toString() || "0");
  const amountsSpent = parseFloat(customSupplier?.amountsSpent?.toString() || "0");

  const isCustomType = customSupplier?.requestType === "supplier_one_time" || 
                       customSupplier?.requestType === "sadad_invoice" || 
                       customSupplier?.requestType === "misc_expenses" ||
                       linkedRequestInfo?.requestType === "supplier_one_time" || 
                       linkedRequestInfo?.requestType === "sadad_invoice" || 
                       linkedRequestInfo?.requestType === "misc_expenses";

  const isSadadInvoice = customSupplier?.requestType === "sadad_invoice" || 
                         linkedRequestInfo?.requestType === "sadad_invoice";

  const showRequestNumber = !!request && !request.isDirect;

  const descriptionText = (isCustomType && (customSupplier?.requiredWorksDesc || linkedRequestInfo?.requiredWorksDesc)) ? 
                          (customSupplier?.requiredWorksDesc || linkedRequestInfo?.requiredWorksDesc) :
                          (customSupplier?.customProjectName || 
                           (request?.description ? request.description.replace(/^(?:ت?قرير\s+إنجاز\s+RPT-[A-Za-z0-9-]+(?:\s*-\s*الأعمال\s+المنفذة\s+فعلياً)?\s*:\s*)/i, "") : "") || 
                           request?.title || 
                           "—");

  const descLength = descriptionText.length;
  const descFontSizeClass = descLength > 200 ? "text-[10px] leading-tight p-1.5" : 
                            descLength > 100 ? "text-xs leading-snug p-2" : 
                            "p-2.5";

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* أزرار التحكم */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex justify-between items-center sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end sm:gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/disbursements");
            }
          }} 
          className="bg-white border shadow-sm sm:bg-white/90"
        >
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
        {/* إطار مزدوج فاخر للمستند يشبه قالب العقود */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-start min-h-[277mm]">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-start space-y-4">
            <div>
              {/* الترويسة - الشعار والتاريخ مثل قالب العقد */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto print:h-14" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center print:w-14 print:h-14">
                      <span className="text-primary font-bold text-2xl">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-[#1a5f4a] print:text-sm">
                      {orgSettings?.officialReportsName || ""}
                    </div>
                    <div className="text-xs text-gray-550 font-medium">الإدارة المالية</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-right sm:text-left print:text-left">
                  <div className="flex gap-1.5 justify-start sm:justify-end">
                    <span className="font-bold text-gray-600">رقم أمر الصرف:</span>
                    <span className="border-b border-dotted border-gray-400 px-2 font-mono text-gray-900 font-bold">{order.orderNumber}</span>
                  </div>
                </div>
              </div>

              {/* الترويسة العلوية - شريط العنوان الأخضر */}
              <div className="bg-[#1a5f4a] text-white font-bold text-base sm:text-lg mb-4 rounded overflow-hidden text-center py-2 font-display">
                أمر صرف رقم {order.orderNumber} | {PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}
              </div>

              {/* التاريخ والموافق */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-xs sm:text-sm">
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <span className="p-2.5 bg-slate-100 font-bold border-l border-slate-300 text-slate-700 w-24 shrink-0 text-center">التاريخ</span>
                  <span className="p-2.5 text-slate-800 font-medium flex-1 text-center" dir="rtl">{toHijriDate(orderDate)}</span>
                </div>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <span className="p-2.5 bg-slate-100 font-bold border-l border-slate-300 text-slate-700 w-24 shrink-0 text-center">الموافق</span>
                  <span className="p-2.5 text-slate-800 font-medium flex-1 text-center">{formatGregorianDate(orderDate)}</span>
                </div>
              </div>

              {/* جدول المعلومات الأساسي لأمر الصرف */}
              <div className="mb-4">
                <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-l border-slate-300 text-slate-700 text-right">
                        اصرفوا للمكرم/
                      </td>
                      <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={2}>
                        {order.beneficiaryName}
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-l border-slate-300 text-slate-700 text-right" rowSpan={2}>
                        مبلغ وقدره/
                      </td>
                      <td className="p-2.5 bg-slate-55 font-bold w-20 border-l border-slate-300 text-slate-600 text-center">
                        رقماً
                      </td>
                      <td className="p-2.5 text-slate-800 font-black font-mono text-right">
                        {amount.toLocaleString()} ريال
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 bg-slate-55 font-bold w-20 border-l border-slate-300 text-slate-600 text-center">
                        كتابة
                      </td>
                      <td className="p-2.5 text-slate-700 font-semibold text-right">
                        {numberToArabicText(amount)} لا غير
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-l border-slate-300 text-slate-700 text-right">
                        {showRequestNumber ? "رقم طلب الصرف/" : "رقم أمر الصرف/"}
                      </td>
                      <td className="p-2.5 text-slate-800 font-mono font-bold text-right" colSpan={2}>
                        {showRequestNumber ? request.requestNumber : order.orderNumber}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-l border-slate-300 text-slate-700 text-right">
                        وذلك مقابل/
                      </td>
                      <td className={`text-slate-600 font-semibold text-right whitespace-pre-wrap break-words ${descFontSizeClass}`} colSpan={2}>
                        {descriptionText}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* قسم خاص بالمشاريع */}
              {(project || customSupplier || linkedRequestInfo) && (
                <div className="mb-4">
                  <div className="text-right font-bold text-xs sm:text-sm mb-1.5 text-slate-800">
                    خاص بالمشاريع:
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-40 border-l border-slate-300 text-slate-700 text-right">
                          اسم المشروع
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={3}>
                          {customSupplier?.customProjectName || linkedRequestInfo?.customProjectName || (project?.name || "—")}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-40 border-l border-slate-300 text-slate-700 text-right">
                          اسم المشروع الرئيسي
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={3}>
                          {resolvedMainProjectName}
                        </td>
                      </tr>
                      
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-40 border-l border-slate-300 text-slate-700 text-right">
                          الجهة الداعمة
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={3}>
                          {resolvedSupportingEntity}
                        </td>
                      </tr>
                      
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold text-slate-700 text-right w-1/4 border-l border-slate-300">
                          إجمالي قيمة الدعم
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono text-center w-1/4 border-l border-slate-300">
                          {isCustomType ? `${amount.toLocaleString()} ريال` : (project ? `${project.fundingAmount.toLocaleString()} ريال` : "—")}
                        </td>
                        <td className="p-2.5 bg-slate-100 font-bold text-slate-700 text-right w-1/4 border-l border-slate-300">
                          إجمالي قيمة العقد
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono text-center w-1/4">
                          {isTamamLinked 
                            ? `${actualProjectValue.toLocaleString()} ريال` 
                            : (isCustomType ? "—" : (project ? `${project.contractAmount.toLocaleString()} ريال` : "—"))}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2.5 bg-slate-100 font-bold text-slate-700 text-right w-1/4 border-l border-slate-300">
                          إجمالي ما تم دفعه
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono text-center w-1/4 border-l border-slate-300">
                          {isCustomType ? `${amount.toLocaleString()} ريال` : (project ? `${project.totalPaid.toLocaleString()} ريال` : "—")}
                        </td>
                        <td className="p-2.5 bg-slate-100 font-bold text-slate-700 text-right w-1/4 border-l border-slate-300">
                          المبلغ المتبقي بعد صرف المبلغ أعلاه
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono text-center w-1/4">
                          {isTamamLinked 
                            ? `${(actualProjectValue - amountsSpent).toLocaleString()} ريال` 
                            : (isCustomType ? "—" : (project ? `${project.remainingAmount.toLocaleString()} ريال` : "—"))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* تحويل بنكي من حساب الجمعية إلى */}
              {order.paymentMethod === "bank_transfer" && (
                <div className="mb-4">
                  <div className="text-right font-bold text-xs sm:text-sm mb-1.5 text-slate-800">
                    تحويل بنكي من حساب الجمعية إلى:
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-48 border-l border-slate-300 text-slate-700 text-right">
                          اسم الحساب
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold text-right">
                          {isSadadInvoice ? "—" : (order.beneficiaryAccountName || order.beneficiaryName || "—")}
                        </td>
                      </tr>
                      
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-48 border-l border-slate-300 text-slate-700 text-right">
                          اسم البنك
                        </td>
                        <td className="p-2.5 text-slate-800 font-semibold text-right">
                          {isSadadInvoice ? "—" : (order.beneficiaryBank || "—")}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-48 border-l border-slate-300 text-slate-700 text-right">
                          رقم الآيبان
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono font-bold text-right tracking-wider" dir="ltr">
                          {isSadadInvoice ? "—" : (order.beneficiaryIban || "—")}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 bg-slate-100 font-bold w-48 border-l border-slate-300 text-slate-700 text-right">
                          رقم سداد
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono font-bold text-right">
                          {isSadadInvoice 
                            ? (customSupplier?.sadadNumber || order.beneficiaryIban || order.sadadNumber || "—")
                            : (order.sadadNumber || "—")}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2.5 bg-slate-100 font-bold w-48 border-l border-slate-300 text-slate-700 text-right">
                          رمز المفوتر
                        </td>
                        <td className="p-2.5 text-slate-800 font-mono font-bold text-right">
                          {isSadadInvoice 
                            ? (customSupplier?.billerCode || order.beneficiaryBank || order.billerCode || "—")
                            : (order.billerCode || "—")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* جدول التوقيعات والاعتماد الفاخر لامر الصرف */}
            <div className="mt-6 break-inside-avoid">
              <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm text-center">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-750">
                    <th className="p-2 border-l border-slate-300 w-1/4">الوظيفة</th>
                    <th className="p-2 border-l border-slate-300 w-1/4">الاسم</th>
                    <th className="p-2 border-l border-slate-300 w-1/4">التوقيع</th>
                    <th className="p-2 w-1/4">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-300 h-14">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">المحاسب</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{orgSettings?.accountantName || "—"}</td>
                    <td className="p-2 border-l border-slate-300"></td>
                    <td className="p-2 text-slate-400 font-semibold"></td>
                  </tr>
                  <tr className="h-14">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">المدير التنفيذي</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{orgSettings?.executiveDirectorName || "—"}</td>
                    <td className="p-2 border-l border-slate-300"></td>
                    <td className="p-2 text-slate-400 font-semibold"></td>
                  </tr>
                </tbody>
              </table>

              {/* تذييل المستند الفاخر */}
              <div className="mt-6 pt-3 border-t border-gray-100 text-center text-slate-400 text-[10px] flex justify-between items-center px-2">
                <span className="font-medium">تم إنشاء هذا المستند آلياً من نظام بوابة تمام للعناية بالمساجد</span>
                <span className="font-mono text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")} - صفحة 1 من 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* أنماط الطباعة المتقدمة للجمعية */}
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
            height: 100%;
            overflow: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 8mm !important;
            margin: 0 !important;
            min-height: 280mm !important;
            box-sizing: border-box !important;
          }
          .print-inner {
            min-height: 264mm !important;
            box-sizing: border-box !important;
            padding: 10px !important;
          }
          /* تقليص الفراغات للحفاظ على الصفحة الواحدة */
          .mb-4, .mb-6 {
            margin-bottom: 6px !important;
          }
          .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 6px !important;
            margin-bottom: 6px !important;
          }
          table td {
            padding: 6px 8px !important;
            font-size: 12px !important;
          }
          .h-14 {
            height: 38px !important;
          }
          .mt-6 {
            margin-top: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
