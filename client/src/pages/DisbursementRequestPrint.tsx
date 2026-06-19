import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, CheckSquare, Square, Building, Landmark, Receipt, FileText, CheckCircle2 } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

// دالة تحويل الأرقام إلى نص عربي
function numberToArabicText(num: number): string {
  if (num === 0) return "صفر";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "ععر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
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
    return rest ? `${result} و${convertThousands(rest)}` : result;
  }

  return `فقط ${convertMillions(Math.floor(num))} ريال`;
}

function toHijriDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    }).format(date);
  } catch (e) {
    const gregorianYear = date.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    return `${date.getDate()}/${date.getMonth() + 1}/${hijriYear} هـ`;
  }
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

  const opportunity = (request as any).opportunity;
  const requestDate = new Date(request.requestedAt || new Date());

  const fundingSourceName = opportunity ? opportunity.title : (orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد");

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
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 print:p-0 min-h-[180mm] relative flex flex-col justify-between">
        {/* إطار مزدوج فاخر للمستند يشبه قالب العقود */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-between min-h-[165mm]">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {/* الترويسة - الشعار والتاريخ مثل قالب العقد */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-3">
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
                      {orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">مكتب إدارة المشاريع PMO</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-right sm:text-left">
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-bold text-gray-700">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{toHijriDate(requestDate)}</span>
                  </div>
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-bold text-gray-700">الموافق:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{formatGregorianDate(requestDate)} م</span>
                  </div>
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-bold text-gray-700">رقم طلب الصرف:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-mono text-[#1a5f4a] font-bold">{request.requestNumber}</span>
                  </div>
                </div>
              </div>

              {/* عنوان النموذج الفاخر */}
              <div className="text-center mb-3">
                <h1 className="text-lg sm:text-2xl font-black text-[#1a5f4a] border-b-2 border-[#1a5f4a] pb-1 inline-block px-4 sm:px-12 tracking-wide">
                  طلب صرف مالي للمشروع
                </h1>
              </div>

              {/* خاص بدعم المؤسسات المانحة */}
              <div className="mb-2 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100">
                <div className="font-bold text-[#1a5f4a] text-xs sm:text-sm mb-1.5 text-center flex items-center justify-center gap-2">
                  <Landmark className="w-4 h-4" />
                  خاص بدعم المؤسسات المانحة والمسؤولية المجتمعية
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-600">اسم الجهة الداعمة:</span>
                    <span className="border-b border-gray-300 px-3 font-bold text-gray-800">
                      {fundingSourceName || orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-semibold text-gray-600">مبلغ الدعم الإجمالي للمشروع:</span>
                    <span className="border-b border-gray-300 px-3 font-mono font-bold text-emerald-700">
                      {project?.budget ? `${parseFloat(project.budget.toString()).toLocaleString()} ريال` : `${amount.toLocaleString()} ريال`}
                    </span>
                  </div>
                </div>
              </div>

              {/* بيانات المشروع الأساسية */}
              <div className="mb-2">
                <h3 
                  className="font-bold py-1 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  <Building className="ml-2 h-4 w-4" />
                  1. معلومات المشروع والموقع:
                </h3>
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[500px] sm:min-w-0 w-full border border-t-0 text-xs sm:text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-1.5 bg-gray-50/50 font-bold w-32 border-l text-gray-700">اسم المشروع:</td>
                        <td className="p-1.5 text-gray-800 font-bold">{project?.name || "—"}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 bg-gray-50/50 font-bold border-l text-gray-700">موقع المشروع:</td>
                        <td className="p-1.5 text-gray-600 font-medium">{(project as any)?.address || "بالمملكة العربية السعودية"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* وصف الأعمال المطلوبة */}
              <div className="mb-2">
                <h3 
                  className="font-bold py-1 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  <FileText className="ml-2 h-4 w-4" />
                  2. وصف الأعمال والخدمات المطلوبة للصرف:
                </h3>
                <div className="border border-t-0 rounded-b p-2 bg-gray-50/30 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {request.description || request.title || "—"}
                </div>
              </div>

              {/* المبلغ المطلوب صرفه */}
              <div className="mb-2 bg-[#d4a574]/10 border border-[#d4a574] rounded-lg p-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 text-center">
                  <span className="text-xs sm:text-sm text-gray-800 font-bold">المبلغ المعتمد والمطلوب صرفه:</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-800 font-mono">
                    {amount.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-gray-500">ريال سعودي</span>
                  </span>
                  <span className="text-xs text-gray-600 font-semibold">({numberToArabicText(amount)} ريال لا غير)</span>
                </div>
              </div>

              {/* التفاصيل المالية والميزانية */}
              <div className="mb-2">
                <h3 
                  className="font-bold py-1 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  <Receipt className="ml-2 h-4 w-4" />
                  3. التفاصيل المالية والميزانية:
                </h3>
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[650px] sm:min-w-0 w-full border border-t-0 text-xs sm:text-sm text-center">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="p-1.5 font-bold border-l text-gray-700">قيمة الدفعة الحالية</th>
                        <th className="p-1.5 font-bold border-l text-gray-700">ميزانية المشروع الإجمالية</th>
                        <th className="p-1.5 font-bold border-l text-gray-700">النسبة من الميزانية</th>
                        <th className="p-1.5 font-bold text-gray-800">حالة طلب الصرف</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-1.5 border-l font-bold font-mono text-emerald-700">{amount.toLocaleString()} ريال</td>
                        <td className="p-1.5 border-l font-mono text-gray-700 font-semibold">
                          {project?.budget ? `${parseFloat(project.budget.toString()).toLocaleString()} ريال` : "—"}
                        </td>
                        <td className="p-1.5 border-l font-mono text-gray-700">
                          {project?.budget && parseFloat(project.budget.toString()) > 0
                            ? `${((amount / parseFloat(project.budget.toString())) * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="p-1.5 font-bold text-gray-800">
                          {request.status === "approved" ? (
                            <span className="text-emerald-700">معتمد</span>
                          ) : request.status === "pending" ? (
                            <span className="text-amber-600">قيد الاعتماد</span>
                          ) : (
                            <span className="text-gray-500">مسودة</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* المقاولون والموردون المعتمدون للدفع */}
              <div className="mb-2">
                <h3 
                  className="font-bold py-1 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  <Landmark className="ml-2 h-4 w-4" />
                  4. معلومات المورد البنكية وتفاصيل الدفع:
                </h3>
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[650px] sm:min-w-0 w-full border border-t-0 text-xs sm:text-sm text-right">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-700">
                        <th className="p-1.5 font-bold border-l w-1/3">اسم المورد / الجهة المستفيدة</th>
                        <th className="p-1.5 font-bold border-l w-1/3">البيان المالي للدفعة</th>
                        <th className="p-1.5 font-bold w-1/3">المبلغ المطلوب</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-1.5 border-l font-bold text-gray-800">{resolvedSupplierName}</td>
                        <td className="p-1.5 border-l text-gray-600 font-medium">{request.title || "—"}</td>
                        <td className="p-1.5 font-bold font-mono text-emerald-700">{amount.toLocaleString()} ريال</td>
                      </tr>
                      <tr className="bg-gray-50/30">
                        <td className="p-1.5 border-l text-xs text-gray-700">
                           <span className="font-bold text-gray-700">اسم الحساب: </span>
                           {resolvedSupplierAccountName}
                        </td>
                        <td className="p-1.5 border-l font-mono text-[10px] sm:text-xs text-gray-600">
                          <span className="font-bold text-gray-700">رقم الآيبان (IBAN): </span>
                          <span className="font-semibold tracking-wider font-mono">{resolvedSupplierIban}</span>
                        </td>
                        <td className="p-1.5 text-xs text-gray-700">
                          <span className="font-bold text-gray-700">اسم البنك: </span>
                          {resolvedSupplierBankName}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* التوقيعات والاعتماد الفاخر */}
            <div className="mt-3 break-inside-avoid">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-right">
                {/* الطرف الأول - الجمعية */}
                <div className="border border-[#1a5f4a]/20 rounded-lg p-2.5 bg-gray-50/30 relative">
                  <div className="font-bold text-[#1a5f4a] border-b border-[#1a5f4a]/20 pb-1 mb-2 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    الجهة الطالبة (إدارة المشاريع والصيانة):
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-semibold text-gray-500">الاسم: </span>
                      <span className="text-gray-900 font-bold">{request.requestedByName || project?.managerName || "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">الصفة: </span>
                      <span className="text-gray-900">مدير المشروع / مهندس الصيانة المعتمد</span>
                    </div>
                    <div className="pt-3">
                      <span className="font-semibold text-gray-500">توقيع المسؤول: </span>
                      <span className="text-gray-300 font-serif">..........................................</span>
                    </div>
                  </div>
                </div>

                {/* الطرف الثاني - المدير التنفيذي */}
                <div className="border border-[#d4a574]/20 rounded-lg p-2.5 bg-gray-50/30 relative">
                  <div className="font-bold text-[#5d4037] border-b border-[#d4a574]/20 pb-1 mb-2 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#d4a574]" />
                    الاعتماد المالي والجمعية:
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-semibold text-gray-500">الجمعية: </span>
                      <span className="text-gray-900 font-bold">{orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">المدير التنفيذي: </span>
                      <span className="text-gray-900 font-bold">{orgSettings?.executiveDirectorName || "—"}</span>
                    </div>
                    <div className="pt-3">
                      <span className="font-semibold text-gray-500">التوقيع: </span>
                      <span className="text-gray-300 font-serif">..........................................</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* تذييل المستند الفاخر */}
              <div className="mt-4 pt-2 border-t border-gray-100 text-center text-gray-400 text-[10px] flex justify-between items-center px-2">
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
          .print-inner {
            min-height: 0 !important;
            height: auto !important;
            border-width: 2px !important;
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

