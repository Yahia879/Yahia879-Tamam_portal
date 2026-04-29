import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer } from "lucide-react";

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
    <>
      {/* أزرار التحكم */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" onClick={() => navigate("/disbursements")}>
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="ml-2 h-4 w-4" />
          طباعة
        </Button>
      </div>

      {/* صفحة الطباعة - تصميم متوازن لصفحة A4 */}
      <div className="min-h-screen bg-white print:p-0" dir="rtl">
        <div className="max-w-[210mm] mx-auto p-6 print:p-4 print:max-w-none">
          
          {/* الترويسة - الشعار على اليمين */}
          <div className="flex justify-between items-start mb-4 border-b-2 border-primary pb-3">
            {/* الشعار على اليمين */}
            <div className="flex items-center gap-3">
              {orgSettings?.logoUrl ? (
                <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 w-auto print:h-12" />
              ) : (
                <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center print:w-12 print:h-12">
                  <span className="text-primary font-bold text-xl">ت</span>
                </div>
              )}
              <div>
                <h1 className="text-sm font-bold text-primary print:text-xs">
                  {orgSettings?.organizationName || "جمعية عمارة المساجد (منارة)"}
                </h1>
                <div className="text-[10px] text-gray-500">{orgSettings?.organizationNameShort || ""}</div>
              </div>
            </div>

            {/* عنوان المستند */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-primary print:text-base">
                أمر صرف | {PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}
              </h2>
              <div className="text-sm font-mono text-gray-600">{order.orderNumber}</div>
            </div>

            {/* رؤية 2030 على اليسار */}
            <div className="text-left">
              <img 
                src="/vision-2030-logo.png" 
                alt="رؤية 2030" 
                className="h-12 w-auto print:h-10"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="text-[10px] text-gray-500 mt-1">KINGDOM OF SAUDI ARABIA</div>
            </div>
          </div>

          {/* التاريخ */}
          <div className="flex items-center gap-3 mb-4 text-sm">
            <span className="font-bold">التاريخ</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded border text-xs">{toHijriDate(orderDate)}</span>
            <span className="text-gray-500">الموافق</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded border text-xs">{formatGregorianDate(orderDate)}</span>
          </div>

          {/* بيانات الصرف الرئيسية */}
          <table className="w-full border-collapse text-sm mb-4">
            <tbody>
              <tr className="border">
                <td className="p-2 bg-gray-50 font-bold w-28 border-l">اصرفوا للمكرم/</td>
                <td className="p-2 font-bold">{order.beneficiaryName}</td>
              </tr>
              <tr className="border">
                <td className="p-2 bg-gray-50 font-bold border-l">مبلغ وقدره/</td>
                <td className="p-2">
                  <span className="text-gray-500 ml-1">رقماً</span>
                  <span className="font-bold">{amount.toLocaleString()} ريال</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-gray-500 ml-1">كتابة</span>
                  <span>{numberToArabicText(amount)}</span>
                </td>
              </tr>
              <tr className="border">
                <td className="p-2 bg-gray-50 font-bold border-l">رقم طلب الصرف/</td>
                <td className="p-2 font-mono text-xs">{request?.requestNumber || "-"}</td>
              </tr>
              <tr className="border">
                <td className="p-2 bg-gray-50 font-bold border-l">وذلك مقابل/</td>
                <td className="p-2">{request?.description || request?.title || "-"}</td>
              </tr>
            </tbody>
          </table>

          {/* المبلغ المطلوب - إبراز متوازن */}
          <div className="mb-4 bg-primary/5 border border-primary rounded p-2">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-primary font-bold">المبلغ المطلوب دفعه:</span>
              <span className="text-xl font-bold text-primary">
                {amount.toLocaleString()} <span className="text-base">ريال</span>
              </span>
              <span className="text-xs text-gray-600">({numberToArabicText(amount)})</span>
            </div>
          </div>

          {/* خاص بالمشاريع */}
          {project && (
            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2 text-primary">خاص بالمشاريع:</h3>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr className="border">
                    <td className="p-1.5 bg-gray-50 font-bold w-28 border-l">اسم المشروع</td>
                    <td className="p-1.5">{project.name}</td>
                    <td className="p-1.5 bg-gray-50 font-bold w-24 border-l">الجهة الداعمة</td>
                    <td className="p-1.5">{(project as any).fundingSource || "لا يوجد"}</td>
                  </tr>
                  <tr className="border">
                    <td className="p-1.5 bg-gray-50 font-bold border-l">إجمالي قيمة الدعم</td>
                    <td className="p-1.5">{((project as any).fundingAmount || 0).toLocaleString()}</td>
                    <td className="p-1.5 bg-gray-50 font-bold border-l">إجمالي قيمة العقد</td>
                    <td className="p-1.5">{((project as any).contractAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border">
                    <td className="p-1.5 bg-gray-50 font-bold border-l">إجمالي ما تم دفعه</td>
                    <td className="p-1.5">{((project as any).totalPaid || 0).toLocaleString()}</td>
                    <td className="p-1.5 bg-gray-50 font-bold border-l">المتبقي بعد الصرف</td>
                    <td className="p-1.5">{((project as any).remainingAmount || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* تحويل بنكي */}
          {order.paymentMethod === "bank_transfer" && (
            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2 text-primary">تحويل بنكي من حساب الجمعية إلى:</h3>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr className="border">
                    <td className="p-1.5 bg-gray-50 font-bold w-24 border-l">اسم الحساب</td>
                    <td className="p-1.5">{order.beneficiaryName}</td>
                    <td className="p-1.5 bg-gray-50 font-bold w-20 border-l">اسم البنك</td>
                    <td className="p-1.5">{order.beneficiaryBank || "-"}</td>
                  </tr>
                  <tr className="border">
                    <td className="p-1.5 bg-gray-50 font-bold border-l">رقم الآيبان</td>
                    <td className="p-1.5 font-mono" dir="ltr">{order.beneficiaryIban || "-"}</td>
                    <td className="p-1.5 bg-gray-50 font-bold border-l">رقم سداد</td>
                    <td className="p-1.5">{(order as any).sadadNumber || "-"}</td>
                  </tr>
                  <tr className="border">
                    <td className="p-1.5 bg-gray-50 font-bold border-l">رمز المفوتر</td>
                    <td className="p-1.5" colSpan={3}>{(order as any).billerCode || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* جدول التوقيعات */}
          <div className="mt-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-right w-24">الوظيفة</th>
                  <th className="border p-2 text-right">الاسم</th>
                  <th className="border p-2 text-right w-32">التوقيع</th>
                  <th className="border p-2 text-right w-24">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2 font-bold">المحاسب</td>
                  <td className="border p-2">{orgSettings?.accountantName || ""}</td>
                  <td className="border p-2 h-12"></td>
                  <td className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2 font-bold">المدير التنفيذي</td>
                  <td className="border p-2">{orgSettings?.executiveDirectorName || ""}</td>
                  <td className="border p-2 h-12"></td>
                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* تذييل الصفحة */}
          <div className="mt-4 pt-2 border-t text-center text-gray-500 text-[10px]">
            <p>تم إنشاء هذا المستند آلياً من نظام بوابة تمام للعناية بالمساجد</p>
            <p className="mt-0.5">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")}</p>
          </div>
        </div>
      </div>

      {/* أنماط الطباعة */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
