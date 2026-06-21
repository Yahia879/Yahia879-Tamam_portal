import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, CheckCircle2, Building, Landmark, Receipt, FileText } from "lucide-react";
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
    return rest ? `${result} و${convertThousands(rest)}` : result;
  }

  return `فقط ${convertMillions(Math.floor(num))} ريال`;
}

// دالة تحويل التاريخ الميلادي إلى هجري (تقريبي)
function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay} / ${hijriMonth} / ${hijriYear} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getFullYear()} / ${date.getMonth() + 1} / ${date.getDate()} م`;
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
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 print:p-0 min-h-[180mm] relative flex flex-col justify-between">
        {/* إطار مزدوج فاخر للمستند يشبه قالب العقود */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-between min-h-[165mm]">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-between">
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
                      {orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">مكتب إدارة المشاريع PMO</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-right sm:text-left">
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-bold text-gray-700">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{toHijriDate(orderDate)}</span>
                  </div>
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-bold text-gray-700">الموافق:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{formatGregorianDate(orderDate)}</span>
                  </div>
                  <div className="flex gap-2 justify-start sm:justify-end">
                    <span className="font-bold text-gray-700">رقم أمر الصرف:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-mono text-[#1a5f4a] font-bold">{order.orderNumber}</span>
                  </div>
                </div>
              </div>

              {/* عنوان النموذج الفاخر */}
              <div className="text-center mb-4">
                <h1 className="text-lg sm:text-2xl font-black text-[#1a5f4a] border-b-2 border-[#1a5f4a] pb-1 inline-block px-4 sm:px-12 tracking-wide">
                  أمر صرف مالي | {PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}
                </h1>
              </div>

              {/* تفاصيل المستفيد والصرف */}
              <div className="mb-2.5">
                <h3 
                  className="font-bold py-1.5 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  <Building className="ml-2 h-4 w-4" />
                  1. تفاصيل أمر الصرف والمستفيد:
                </h3>
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[500px] sm:min-w-0 w-full border border-t-0 text-xs sm:text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 bg-gray-50/50 font-bold w-32 border-l text-gray-700">اصرفوا للمكرم:</td>
                        <td className="p-2 text-gray-800 font-bold">{order.beneficiaryName}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 bg-gray-50/50 font-bold border-l text-gray-700">رقم طلب الصرف:</td>
                        <td className="p-2 text-gray-800 font-mono text-xs">{request?.requestNumber || "—"}</td>
                      </tr>
                      <tr>
                        <td className="p-2 bg-gray-50/50 font-bold border-l text-gray-700">وذلك مقابل:</td>
                        <td className="p-2 text-gray-600 font-medium">{request?.description || request?.title || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* المبلغ المطلوب صرفه */}
              <div className="mb-2.5 bg-[#d4a574]/10 border border-[#d4a574] rounded-lg p-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
                  <span className="text-xs sm:text-sm text-gray-800 font-bold">المبلغ المطلوب صرفه:</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono">
                    {amount.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-gray-500">ريال سعودي</span>
                  </span>
                  <span className="text-xs text-gray-600 font-semibold">({numberToArabicText(amount)} ريال لا غير)</span>
                </div>
              </div>

              {/* خاص بالمشاريع */}
              {project && (
                <div className="mb-2.5">
                  <h3 
                    className="font-bold py-1.5 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                    style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                  >
                    <Receipt className="ml-2 h-4 w-4" />
                    2. معلومات ميزانية المشروع:
                  </h3>
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[650px] sm:min-w-0 w-full border border-t-0 text-xs sm:text-sm text-center">
                      <thead>
                        <tr className="bg-gray-100 border-b text-gray-700">
                          <th className="p-2.5 font-bold border-l">اسم المشروع</th>
                          <th className="p-2.5 font-bold border-l">الجهة الداعمة</th>
                          <th className="p-2.5 font-bold border-l">إجمالي ميزانية المشروع</th>
                          <th className="p-2.5 font-bold border-l">إجمالي ما تم دفعه</th>
                          <th className="p-2.5 font-bold">المتبقي بعد الصرف</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3 border-l font-bold text-gray-800">{project.name}</td>
                          <td className="p-3 border-l text-gray-600 font-medium">{(project as any).fundingSource || "لا يوجد"}</td>
                          <td className="p-3 border-l font-mono text-gray-700 font-semibold">
                            {((project as any).fundingAmount || (project as any).budget || 0).toLocaleString()} ريال
                          </td>
                          <td className="p-3 border-l font-mono text-gray-700 font-semibold">
                            {((project as any).totalPaid || 0).toLocaleString()} ريال
                          </td>
                          <td className="p-3 font-bold font-mono text-emerald-700">
                            {((project as any).remainingAmount || 0).toLocaleString()} ريال
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* تحويل بنكي */}
              {order.paymentMethod === "bank_transfer" && (
                <div className="mb-2.5">
                  <h3 
                    className="font-bold py-1.5 px-4 rounded-t flex items-center leading-none text-xs sm:text-sm"
                    style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                  >
                    <Landmark className="ml-2 h-4 w-4" />
                    {project ? "3." : "2."} معلومات التحويل البنكي للمستفيد:
                  </h3>
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[650px] sm:min-w-0 w-full border border-t-0 text-xs sm:text-sm text-right">
                      <thead>
                        <tr className="bg-gray-50 border-b text-gray-700">
                          <th className="p-2.5 font-bold border-l w-1/3">اسم المستفيد (صاحب الحساب)</th>
                          <th className="p-2.5 font-bold border-l w-1/3">اسم البنك المستلم</th>
                          <th className="p-2.5 font-bold w-1/3">رقم الآيبان (IBAN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3 border-l font-bold text-gray-800">{order.beneficiaryName}</td>
                          <td className="p-3 border-l text-gray-600 font-medium">{order.beneficiaryBank || "—"}</td>
                          <td className="p-3 font-mono font-bold text-gray-800 tracking-wider" dir="ltr">{order.beneficiaryIban || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* التوقيعات والاعتماد الفاخر لامر الصرف */}
            <div className="mt-4 break-inside-avoid">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-right">
                {/* الطرف الأول - المراجعة والتدقيق المالي */}
                <div className="border border-[#1a5f4a]/20 rounded-lg p-3 bg-gray-50/30 relative">
                  <div className="font-bold text-[#1a5f4a] border-b border-[#1a5f4a]/20 pb-1.5 mb-2.5 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    المراجعة والتدقيق المالي:
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-gray-500">اسم المحاسب: </span>
                      <span className="text-gray-900 font-bold">{orgSettings?.accountantName || "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">التوقيع المالي: </span>
                      <span className="text-gray-300 font-serif">..........................................</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">التاريخ: </span>
                      <span className="text-gray-300 font-serif">.... / .... / ........ م</span>
                    </div>
                  </div>
                </div>

                {/* الطرف الثاني - الاعتماد والترخيص بالصرف */}
                <div className="border border-[#d4a574]/20 rounded-lg p-3 bg-gray-50/30 relative">
                  <div className="font-bold text-[#5d4037] border-b border-[#d4a574]/20 pb-1.5 mb-2.5 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#d4a574]" />
                    الاعتماد والترخيص بالصرف:
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-gray-500">المدير التنفيذي: </span>
                      <span className="text-gray-900 font-bold">{orgSettings?.executiveDirectorName || "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">التوقيع: </span>
                      <span className="text-gray-300 font-serif">..........................................</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">التاريخ: </span>
                      <span className="text-gray-300 font-serif">.... / .... / ........ م</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* تذييل المستند الفاخر */}
              <div className="mt-8 pt-3 border-t border-gray-100 text-center text-gray-400 text-[10px] flex justify-between items-center px-2">
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
            padding: 12mm !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-inner {
            min-height: 0 !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
