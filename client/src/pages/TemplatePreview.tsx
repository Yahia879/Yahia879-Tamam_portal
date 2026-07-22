import { useState, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Printer,
  ArrowRight,
  Loader2,
  FileText,
  Eye,
} from "lucide-react";

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

export default function TemplatePreview() {
  const params = useParams();
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search || '');
  const backUrl = searchParams.get('backUrl');
  const templateId = params.id ? parseInt(params.id) : undefined;
  const printRef = useRef<HTMLDivElement>(null);

  // جلب بيانات قالب العقد
  const { data: template, isLoading: isTemplateLoading, error } = trpc.contracts.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings, isLoading: isOrgLoading } = trpc.organization.getSettings.useQuery();

  // طباعة القالب
  const handlePrint = () => {
    navigate(`/contract-templates/${templateId}/print`);
  };



  // دالة لاستبدال المتغيرات في نصوص البنود وعرضها بشكل مميز
  const replaceVariables = (content: string) => {
    if (!content) return "";
    let result = content;

    const variables: Record<string, string> = {
      "{{organizationName}}": `<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200 text-xs">${orgSettings?.officialReportsName || "الطرف الأول (الجمعية)"}</span>`,
      "{{secondPartyName}}": `<span class="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold border border-blue-200 text-xs">[اسم الطرف الثاني (المورد)]</span>`,
      "{{contractNumber}}": `<span class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-semibold border border-gray-200 text-xs">[رقم العقد]</span>`,
      "{{contractDate}}": `<span class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-semibold border border-gray-200 text-xs">[تاريخ العقد]</span>`,
      "{{contractAmount}}": `<span class="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold border border-green-200 text-xs">[قيمة العقد]</span>`,
      "{{contractAmountText}}": `<span class="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold border border-green-200 text-xs">[قيمة العقد بالحروف]</span>`,
      "{{duration}}": `<span class="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold border border-purple-200 text-xs">[مدة العقد]</span>`,
      "{{durationUnit}}": `<span class="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold border border-purple-200 text-xs">[وحدة المدة]</span>`,
      "{{duration_unit}}": `<span class="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold border border-purple-200 text-xs">[وحدة المدة]</span>`,
      "{{mosqueName}}": `<span class="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-semibold border border-teal-200 text-xs">[اسم المسجد]</span>`,
      "{{mosqueCity}}": `<span class="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-semibold border border-teal-200 text-xs">[المدينة]</span>`,
      "{{subject}}": `<span class="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold border border-indigo-200 text-xs">[موضوع العقد]</span>`,
      "{{authorizedSignatory}}": `<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200 text-xs">[المفوض بالتوقيع]</span>`,
      "{{signatoryTitle}}": `<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200 text-xs">[صفة المفوض بالتوقيع]</span>`,
    };

    Object.entries(variables).forEach(([key, value]) => {
      result = result.split(key).join(value);
    });

    return <div dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (isTemplateLoading || isOrgLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !template) {
    return (
      <DashboardLayout>
        <div className="text-center py-12" dir="rtl">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">القالب غير موجود</h2>
          <p className="text-muted-foreground mb-4">لم يتم العثور على قالب العقد المطلوب</p>
          <Button onClick={() => navigate("/contracts")}>
            العودة للعقود
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        {/* شريط الأدوات */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => {
                if (backUrl) {
                  navigate(decodeURIComponent(backUrl));
                } else {
                  navigate("/contracts?tab=templates");
                }
              }}
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Button>
            <h1 className="text-xl font-bold hidden md:block">معاينة قالب: {template.nameAr}</h1>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <Button 
              onClick={handlePrint} 
              className="flex-1 sm:flex-none bg-green-700 hover:bg-green-800 text-white"
            >
              <Printer className="h-4 w-4 ml-2" />
              طباعة القالب
            </Button>
          </div>
        </div>


        {/* لوحة المعاينة المستندات */}
        <div className="w-full overflow-x-auto pb-8 print:p-0 bg-muted/30">
          <div 
            ref={printRef}
            className="bg-white mx-auto print:m-0 shadow-sm sm:shadow-lg border rounded-lg overflow-hidden"
            style={{ 
              width: '100%', 
              maxWidth: '210mm',
              minHeight: '297mm',
              fontFamily: 'Arial, sans-serif',
              position: 'relative',
            }}
          >
             {/* الصفحة الأولى */}
             <div className="p-4 sm:p-8 md:p-12 lg:p-16 print:p-6 text-right" style={{ minHeight: '297mm', position: 'relative' }}>
               
               <div className="absolute top-3 left-4 sm:top-6 sm:left-8 print:top-3 print:left-4 text-[9px] sm:text-xs font-mono text-gray-400 border border-gray-100 bg-gray-50/50 px-2 py-0.5 rounded">
                 قالب العقد الرقمي: {template.id}
               </div>

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
               <p className="text-center mb-6 text-gray-700 text-sm sm:text-base">
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
                   <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right">
                     {replaceVariables(template.introTemplate)}
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
                       <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right">
                         {replaceVariables(clause.content)}
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg bg-gray-50">
                     لا توجد بنود مضافة في هذا القالب بعد. قم بإضافة البنود لعرضها بالمعاينة.
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
                 <div className="pr-2 sm:pr-4 text-right">
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
                 <div className="pr-2 sm:pr-4 text-right">
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
                   <div className="text-center border-l pl-4 font-right">
                     <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الأول</h4>
                     <p className="font-medium text-xs sm:text-sm">{orgSettings?.officialReportsName || "اسم الجمعية"}</p>
                     <p className="text-xs sm:text-sm">{orgSettings?.authorizedSignatory || "[المفوض بالتوقيع]"}</p>
                     <p className="text-xs sm:text-xs text-gray-600">{orgSettings?.signatoryTitle || "[صفته]"}</p>
                     <div className="mt-8 space-y-4 text-xs sm:text-sm">
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
                     <div className="mt-8 space-y-4 text-xs sm:text-sm">
                       <p>التوقيع: ...................................</p>
                       <p>التاريخ: ...................................</p>
                     </div>
                     <p className="mt-4 text-xs text-gray-600">الختم الرسمي</p>
                     <div className="h-20 border border-dashed border-gray-300 mt-2 rounded"></div>
                   </div>
                 </div>
               </div>
 
               {/* تذييل الصفحة */}
               <div className="text-center text-xs text-gray-500 mt-12 border-t pt-4 px-4 sm:px-8">
                 <div className="flex flex-row justify-between items-center gap-1">
                   <span>البريد الإلكتروني: {orgSettings?.email || "info@tamam.org.sa"}</span>
                   <span>الموقع الإلكتروني: {orgSettings?.website || "www.example.org"}</span>
                   <span>العنوان: {orgSettings?.address || "المملكة العربية السعودية"}</span>
                 </div>
               </div>

             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
