import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Loader2, FileText } from "lucide-react";

// أنواع العقود
const CONTRACT_TYPES: Record<string, string> = {
  supervision: "إشراف هندسي",
  construction: "مقاولات",
  supply: "توريد",
  maintenance: "صيانة",
  services: "خدمات",
  equipment: "تجهيزات",
  consulting: "استشارات",
  other: "أخرى",
};

export default function TemplatePrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const templateId = params.id ? parseInt(params.id) : undefined;

  // جلب بيانات قالب العقد
  const { data: template, isLoading: isTemplateLoading, error } = trpc.contracts.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings, isLoading: isOrgLoading } = trpc.organization.getSettings.useQuery();

  const handlePrint = () => {
    window.print();
  };

  // دالة لاستبدال المتغيرات في نصوص البنود لتبدو مناسبة للطباعة الرسمية
  const replaceVariablesPrint = (content: string) => {
    if (!content) return "";
    let result = content;

    const variables: Record<string, string> = {
      "{{organizationName}}": `[${orgSettings?.officialReportsName || "الطرف الأول (الجمعية)"}]`,
      "{{secondPartyName}}": `[اسم الطرف الثاني (المورد)]`,
      "{{contractNumber}}": `[رقم العقد]`,
      "{{contractDate}}": `[تاريخ العقد]`,
      "{{contractAmount}}": `[قيمة العقد]`,
      "{{contractAmountText}}": `[قيمة العقد بالحروف]`,
      "{{duration}}": `[المدة]`,
      "{{durationUnit}}": `[وحدة المدة]`,
      "{{duration_unit}}": `[وحدة المدة]`,
      "{{mosqueName}}": `[اسم المسجد]`,
      "{{mosqueCity}}": `[المدينة]`,
      "{{subject}}": `[موضوع العقد]`,
      "{{authorizedSignatory}}": `[المفوض بالتوقيع]`,
      "{{signatoryTitle}}": `[صفة المفوض بالتوقيع]`,
    };

    Object.entries(variables).forEach(([key, value]) => {
      result = result.split(key).join(value);
    });

    return result;
  };

  if (isTemplateLoading || isOrgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">القالب غير موجود</h2>
          <Button onClick={() => navigate("/contracts?tab=templates")}>
            العودة للقوالب
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* أزرار التحكم */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex justify-between items-center sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end sm:gap-2">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/contract-templates/${templateId}/preview`)} 
          className="bg-white border shadow-sm sm:bg-white/90"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع للمعاينة
        </Button>
        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white font-semibold">
          <Printer className="ml-2 h-4 w-4" />
          تنزيل PDF / طباعة
        </Button>
      </div>

      {/* صفحة الطباعة */}
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-12 print:p-0 min-h-[297mm] relative flex flex-col justify-between text-right">
        <div className="p-4 sm:p-8 print:p-4 relative min-h-[285mm] flex flex-col justify-between">
          <div>
            <div className="flex flex-row items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* شعار الجمعية */}
                {orgSettings?.logoUrl ? (
                  <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 sm:h-20" style={{ marginRight: '8px' }} />
                ) : (
                  <div className="h-16 w-16 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg text-xs">[شعار الجمعية]</div>
                )}
              </div>
              <div className="flex items-center">
                <img src="/assets/image-removebg-preview (1).png" alt="شعار إضافي" style={{ height: '56px' }} />
              </div>
            </div>

            {/* عنوان العقد */}
            <div 
              className="text-center py-4 px-3 sm:px-6 mb-6 rounded-lg shadow-sm"
              style={{ backgroundColor: '#ae9b63', color: '#faf8f5' }}
            >
              <h1 className="text-lg sm:text-xl font-bold">
                عقد {CONTRACT_TYPES[template.type] || template.type} على تنفيذ مشروع [اسم المسجد] بحي [الحي]
              </h1>
            </div>

            {/* مقدمة العقد */}
            <p className="text-center mb-6 text-gray-700 text-sm sm:text-base leading-relaxed">
              إنه في يوم [اليوم] بتاريخ [التاريخ الهجري] هـ الموافق [التاريخ الميلادي] م وفي مدينة [المدينة] فقد تم الاتفاق بين كل من:
            </p>

            {/* الطرف الأول */}
            <div className="mb-6">
              <div 
                className="py-2 px-4 mb-3 rounded"
                style={{ backgroundColor: '#e8f5e9' }}
              >
                <h2 className="font-bold text-green-800 text-sm sm:text-base">
                  الطرف الأول: {orgSettings?.officialReportsName || "اسم الجمعية الرسمي"}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-600 w-24 sm:w-40">ويمثلها في هذا العقد:</td>
                      <td className="py-1 font-medium">{orgSettings?.authorizedSignatory || "[اسم ممثل الطرف الأول]"} بصفته {orgSettings?.signatoryTitle || "[صفته]"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">العنوان والاتصال:</td>
                      <td className="py-1">{orgSettings?.address || "[عنوان الجمعية الرئيسي]"} | جوال ({orgSettings?.phone || "[رقم جوال للتواصل]"})</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">البريد الإلكتروني:</td>
                      <td className="py-1 text-right" dir="ltr">{orgSettings?.email || "[البريد الإلكتروني للجمعية]"}</td>
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
                  الطرف الثاني: [اسم المؤسسة / الشركة المتعاقد معها]
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-600 w-24 sm:w-40">سجل تجاري رقم:</td>
                      <td className="py-1 text-right" dir="ltr">([رقم السجل التجاري])</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">ويمثلها في هذا العقد:</td>
                      <td className="py-1 font-medium">[اسم ممثل الطرف الثاني] بصفته [صفته]</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">العنوان والاتصال:</td>
                      <td className="py-1">[عنوان الطرف الثاني] | جوال ([رقم الجوال])</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">البريد الإلكتروني:</td>
                      <td className="py-1 text-right" dir="ltr">[البريد الإلكتروني للطرف الثاني]</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>



            {/* التمهيد */}
            {template.introTemplate && (
              <div className="mb-6 break-inside-avoid">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base text-right"
                  style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
                >
                  تمهيد:
                </h3>
                <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right break-words">
                  {replaceVariablesPrint(template.introTemplate)}
                </div>
              </div>
            )}

            {/* بنود العقد الديناميكية */}
            <div className="space-y-6">
              {template.clauses && template.clauses.length > 0 ? (
                template.clauses.map((clause: any, index: number) => (
                  <div key={clause.id} className="mb-6 break-inside-avoid">
                    <h3 
                      className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base text-right"
                      style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
                    >
                      {clause.titleAr || `المادة ${index + 1}`}:
                    </h3>
                    <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right break-words">
                      {replaceVariablesPrint(clause.content)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg bg-gray-50">
                  لا توجد بنود مضافة في هذا القالب بعد.
                </div>
              )}
            </div>

            {/* المدة وجدول الدفعات */}
            <div className="mb-6 break-inside-avoid mt-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
              >
                المدة وجدول الدفعات:
              </h3>
              <div className="pr-2 sm:pr-4 text-right font-normal">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-gray-600 font-medium">تاريخ بداية العقد:</span>{" "}
                    <span className="font-semibold text-gray-900">[تاريخ البداية]</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">مدة العقد:</span>{" "}
                    <span className="font-semibold text-gray-900">[مدة العقد المحددة]</span>
                  </div>
                </div>

                {/* جدول الدفعات */}
                <div className="text-xs sm:text-sm mb-6">
                  <p className="mb-2 font-medium text-gray-800">جدول استحقاق الدفعات المالية (نموذجي):</p>
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
                        <tr className="border-b border-gray-200">
                          <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">1</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-semibold text-gray-900">الدفعة الأولى (مقدمة)</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-bold text-[#1a5f4a]">[القيمة] ريال</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">XX%</td>
                          <td className="py-2.5 px-3 text-gray-600">عند توقيع العقد</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">2</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-semibold text-gray-900">الدفعة الثانية (إنجاز مرحلي)</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-bold text-[#1a5f4a]">[القيمة] ريال</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">XX%</td>
                          <td className="py-2.5 px-3 text-gray-600">عند إنجاز المرحلة المحددة</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">3</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-semibold text-gray-900">الدفعة النهائية (التسليم)</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-bold text-[#1a5f4a]">[القيمة] ريال</td>
                          <td className="py-2.5 px-3 border-l border-gray-200 font-mono text-gray-600">XX%</td>
                          <td className="py-2.5 px-3 text-gray-600">عند الاستلام الابتدائي والنهائي للمشروع</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* القيمة المالية وتفاصيل الحساب */}
            <div className="mb-6 break-inside-avoid">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
              >
                القيمة المالية وتفاصيل الحساب:
              </h3>
              <div className="pr-2 sm:pr-4 text-right font-normal">
                <p className="text-xs sm:text-sm text-gray-700 mb-4">
                  قيمة العقد الإجمالية: ([قيمة العقد بالأرقام] ريال – [قيمة العقد كتابةً فقط لا غير])
                </p>
                <div className="text-xs sm:text-sm">
                  <p className="mb-2 font-medium">يتم تحويل الدفعات المستحقة على حساب الطرف الثاني البنكي المعتمد:</p>
                  <ul className="list-none space-y-1 text-gray-700">
                    <li><span className="text-gray-600 ml-1">اسم الحساب:</span> <span className="font-medium">[اسم الحساب]</span></li>
                    <li><span className="text-gray-600 ml-1">رقم الآيبان:</span> <span className="font-medium" dir="ltr">[IBAN]</span></li>
                    <li><span className="text-gray-600 ml-1">اسم البنك:</span> <span className="font-medium">[البنك]</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* التوقيعات */}
            <div className="mt-12 break-inside-avoid">
              <div className="text-center mb-8">
                <p className="font-bold text-base sm:text-lg">هذا وبالله التوفيق،،،</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* الطرف الأول */}
                <div className="text-center border-l pl-4">
                  <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الأول</h4>
                  <p className="font-medium text-xs sm:text-sm">{orgSettings?.officialReportsName || "اسم الجمعية"}</p>
                  <p className="text-xs sm:text-sm">{orgSettings?.authorizedSignatory || "[المفوض بالتوقيع]"}</p>
                  <p className="text-xs sm:text-xs text-gray-600">{orgSettings?.signatoryTitle || "[صفته]"}</p>
                  <div className="mt-8 space-y-4 text-xs sm:text-sm font-normal">
                    <p>التوقيع: ...................................</p>
                    <p>التاريخ: ...................................</p>
                  </div>
                  <p className="mt-4 text-xs text-gray-600">الختم الرسمي</p>
                  <div className="h-20 border border-dashed border-gray-300 mt-2 rounded"></div>
                </div>

                {/* الطرف الثاني */}
                <div className="text-center pr-4">
                  <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الثاني</h4>
                  <p className="font-medium text-xs sm:text-sm">[اسم الطرف الثاني / المؤسسة]</p>
                  <p className="text-xs sm:text-sm">[اسم المفوض بالتوقيع]</p>
                  <p className="text-xs sm:text-xs text-gray-600">[صفته]</p>
                  <div className="mt-8 space-y-4 text-xs sm:text-sm font-normal">
                    <p>التوقيع: ...................................</p>
                    <p>التاريخ: ...................................</p>
                  </div>
                  <p className="mt-4 text-xs text-gray-600">الختم الرسمي</p>
                  <div className="h-20 border border-dashed border-gray-300 mt-2 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          {/* تذييل الصفحة */}
          <div className="text-center text-xs text-gray-500 mt-12 border-t pt-4 px-4 sm:px-8">
            <div className="flex flex-row justify-between items-center gap-1 font-normal">
              <span>البريد الإلكتروني: {orgSettings?.email || "info@tamam.org.sa"}</span>
              <span>الموقع الإلكتروني: {orgSettings?.website || "www.example.org"}</span>
              <span>العنوان: {orgSettings?.address || "المملكة العربية السعودية"}</span>
            </div>
          </div>
        </div>
      </div>

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
        }
      `}</style>
    </div>
  );
}
