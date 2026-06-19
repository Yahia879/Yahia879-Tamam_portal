import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Printer,
  Download,
  ArrowRight,
  Loader2,
  Check,
  FileText,
  Copy,
  Edit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  MessageSquare,
  Banknote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// أنواع العقود
const CONTRACT_TYPES: Record<string, string> = {
  supervision: "إشراف هندسي",
  construction: "مقاولات",
  supply: "توريد",
  maintenance: "صيانة",
  consulting: "استشارات",
};

// وحدات المدة
const DURATION_UNITS: Record<string, string> = {
  days: "يوم",
  weeks: "أسبوع",
  months: "شهر",
  years: "سنة",
};

// تحويل الرقم إلى نص عربي
function numberToArabicText(num: number): string {
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف", "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف"];
  
  if (num === 0) return "صفر";
  if (num >= 1000000) return `${Math.floor(num / 1000000)} مليون`;
  
  let result = "";
  
  const th = Math.floor(num / 1000);
  if (th > 0) {
    if (th === 1) result += "ألف ";
    else if (th === 2) result += "ألفان ";
    else if (th <= 10) result += thousands[th] + " ";
    else result += th + " ألف ";
    num %= 1000;
  }
  
  const h = Math.floor(num / 100);
  if (h > 0) {
    result += hundreds[h] + " ";
    num %= 100;
  }
  
  if (num >= 11 && num <= 19) {
    const special = ["أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    result += special[num - 11] + " ";
  } else {
    const t = Math.floor(num / 10);
    const o = num % 10;
    if (o > 0 && t > 0) {
      result += ones[o] + " و" + tens[t] + " ";
    } else if (t > 0) {
      result += tens[t] + " ";
    } else if (o > 0) {
      result += ones[o] + " ";
    }
  }
  
  return "فقط " + result.trim() + " ريال";
}

// تحويل التاريخ الميلادي إلى هجري (تقريبي)
function toHijriDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    calendar: 'islamic-umalqura',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  };
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', options).format(date);
}

// الحصول على اسم اليوم بالعربية
function getArabicDayName(date: Date): string {
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[date.getDay()];
}

// أنواع التعديلات
const MODIFICATION_TYPES = [
  { value: "basic_info", label: "البيانات الأساسية" },
  { value: "amount", label: "قيمة العقد" },
  { value: "duration", label: "مدة العقد" },
  { value: "clauses", label: "بنود العقد" },
  { value: "parties", label: "أطراف العقد" },
  { value: "other", label: "أخرى" },
];

export default function ContractPreview() {
  const params = useParams();
  const [, navigate] = useLocation();
  const contractId = params.id ? parseInt(params.id) : undefined;
  const printRef = useRef<HTMLDivElement>(null);
  
  // State لنموذج طلب التعديل
  const [modificationDialogOpen, setModificationDialogOpen] = useState(false);
  const [modificationType, setModificationType] = useState("");
  const [modificationDescription, setModificationDescription] = useState("");
  const [modificationJustification, setModificationJustification] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  
  // State لنموذج الموافقة/الرفض
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  
  // جلب بيانات العقد
  const { data, isLoading, error, refetch } = trpc.contracts.getById.useQuery(
    { id: contractId! },
    { enabled: !!contractId }
  );
  
  // جلب طلبات التعديل
  const { data: modificationRequests, refetch: refetchRequests } = trpc.contracts.getModificationRequests.useQuery(
    { contractId: contractId! },
    { enabled: !!contractId }
  );
  
  // جلب سجل التعديلات
  const { data: modificationLogs } = trpc.contracts.getModificationLogs.useQuery(
    { contractId: contractId! },
    { enabled: !!contractId }
  );

  // Mutation لاعتماد العقد
  const approveMutation = trpc.contracts.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد العقد بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // Mutation لتكرار العقد
  const duplicateMutation = trpc.contracts.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تكرار العقد بنجاح - رقم العقد الجديد: ${data.contractNumber}`);
      navigate(`/contracts/${data.id}/preview`);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تكرار العقد");
    },
  });

  const handleDuplicate = () => {
    if (confirm("هل تريد تكرار هذا العقد؟\nسيتم إنشاء نسخة جديدة برقم عقد مختلف.")) {
      duplicateMutation.mutate({ id: contractId! });
    }
  };

  // Mutation لطلب التعديل
  const requestModificationMutation = trpc.contracts.requestModification.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب التعديل بنجاح");
      setModificationDialogOpen(false);
      setModificationType("");
      setModificationDescription("");
      setModificationJustification("");
      refetchRequests();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إرسال طلب التعديل");
    },
  });

  // Mutation للموافقة على طلب التعديل
  const approveModificationMutation = trpc.contracts.approveModification.useMutation({
    onSuccess: () => {
      toast.success("تمت الموافقة على طلب التعديل");
      setReviewDialogOpen(false);
      setReviewNotes("");
      setSelectedRequestId(null);
      refetchRequests();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // Mutation لرفض طلب التعديل
  const rejectModificationMutation = trpc.contracts.rejectModification.useMutation({
    onSuccess: () => {
      toast.success("تم رفض طلب التعديل");
      setReviewDialogOpen(false);
      setReviewNotes("");
      setSelectedRequestId(null);
      refetchRequests();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // إرسال طلب التعديل
  const handleSubmitModificationRequest = () => {
    if (!modificationType) {
      toast.error("يرجى اختيار نوع التعديل");
      return;
    }
    if (!modificationDescription.trim()) {
      toast.error("يرجى إدخال وصف التعديلات المطلوبة");
      return;
    }
    if (!modificationJustification.trim()) {
      toast.error("يرجى إدخال مبررات التعديل");
      return;
    }
    
    requestModificationMutation.mutate({
      contractId: contractId!,
      modificationType,
      description: modificationDescription,
      justification: modificationJustification,
    });
  };

  // معالجة الموافقة/الرفض
  const handleReviewRequest = () => {
    if (!selectedRequestId) return;
    
    if (reviewAction === "approve") {
      approveModificationMutation.mutate({
        requestId: selectedRequestId,
        reviewNotes: reviewNotes,
      });
    } else {
      if (!reviewNotes.trim()) {
        toast.error("يرجى إدخال سبب الرفض");
        return;
      }
      rejectModificationMutation.mutate({
        requestId: selectedRequestId,
        reviewNotes: reviewNotes,
      });
    }
  };

  // فتح نموذج المراجعة
  const openReviewDialog = (requestId: number, action: "approve" | "reject") => {
    setSelectedRequestId(requestId);
    setReviewAction(action);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  // طباعة العقد
  const handlePrint = () => {
    window.print();
  };

  // تحميل العقد كـ PDF
  const handleDownloadPDF = async () => {
    if (!printRef.current || !data?.contract) return;
    
    setIsExporting(true);
    const contract = data.contract;
    
    try {
      const element = printRef.current;
      
      // التقاط محتوى الصفحة باستخدام html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // دقة عالية
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        onclone: (clonedDoc) => {
          // حل مشكلة oklch مع الحفاظ على الألوان الأصلية
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            let css = styleTags[i].innerHTML;
            // استبدال المتغيرات الأساسية بألوانها الحقيقية
            css = css.replace(/--primary:\s*oklch\([^)]+\)/g, '--primary: #0D9488');
            css = css.replace(/--foreground:\s*oklch\([^)]+\)/g, '--foreground: #1e293b');
            css = css.replace(/--background:\s*oklch\([^)]+\)/g, '--background: #ffffff');
            css = css.replace(/--border:\s*oklch\([^)]+\)/g, '--border: #e2e8f0');
            // استبدال أي oklch متبقي بلون رمادي محايد لمنع الخطأ
            css = css.replace(/oklch\([^)]+\)/g, '#64748b');
            styleTags[i].innerHTML = css;
          }
          
          // إضافة استايلات مخصصة لضمان دقة الألوان في العناصر المهمة بالعقد
          const customStyle = clonedDoc.createElement('style');
          customStyle.innerHTML = `
            .text-green-800 { color: #166534 !important; }
            .text-green-700 { color: #15803d !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-gray-500 { color: #6b7280 !important; }
            .bg-gray-50 { background-color: #f9fafb !important; }
            .border-gray-300 { border-color: #d1d5db !important; }
            .text-muted-foreground { color: #64748b !important; }
            /* الحفاظ على الألوان المحددة يدوياً في العقد */
            [style*="background-color: #1a5f4a"] { background-color: #1a5f4a !important; color: white !important; }
            [style*="background-color: #d4a574"] { background-color: #d4a574 !important; color: #5d4037 !important; }
            [style*="background-color: #e8f5e9"] { background-color: #e8f5e9 !important; }
          `;
          clonedDoc.head.appendChild(customStyle);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      // إضافة الصفحة الأولى
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // إضافة بقية الصفحات إذا كان المحتوى طويلاً
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`عقد-${contract.contractNumber || contract.id}.pdf`);
      toast.success('تم تحميل العقد بصيغة PDF بنجاح');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`حدث خطأ أثناء تحميل PDF: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // التحقق من إمكانية طلب التعديل
  const canRequestModification = (contract: any, payments: any[]) => {
    // لا يمكن طلب تعديل للعقود الملغاة أو المكتملة
    if (["cancelled", "completed"].includes(contract.status)) {
      return { allowed: false, reason: "لا يمكن تعديل عقد ملغي أو مكتمل" };
    }
    // التحقق من وجود دفعات مصروفة
    const hasPaidPayments = payments?.some((p: any) => p.status === "paid");
    if (hasPaidPayments) {
      return { allowed: false, reason: "لا يمكن تعديل عقد تم صرف دفعات له" };
    }
    return { allowed: true, reason: "" };
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">العقد غير موجود</h2>
          <p className="text-muted-foreground mb-4">لم يتم العثور على العقد المطلوب</p>
          <Button onClick={() => navigate("/contracts")}>
            العودة للعقود
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { contract, payments, organizationSettings: orgSettings, clauseValues } = data;
  const contractDate = contract.contractDate ? new Date(contract.contractDate) : new Date();

  let parsedCustomClauses: { title: string, description: string }[] = [];
  if (contract.customClausesJson) {
    try {
      parsedCustomClauses = JSON.parse(contract.customClausesJson);
    } catch (e) {
      console.error("Error parsing custom clauses:", e);
    }
  }

  // دالة لاستبدال المتغيرات في نصوص البنود
  const replaceVariables = (content: string) => {
    if (!content) return "";
    let result = content;
    const variables: Record<string, string> = {
      "{{organizationName}}": orgSettings?.organizationName || "",
      "{{secondPartyName}}": contract.secondPartyName || "",
      "{{contractNumber}}": contract.contractNumber || "",
      "{{contractDate}}": contractDate.toLocaleDateString('ar-SA'),
      "{{contractAmount}}": parseFloat(contract.contractAmount).toLocaleString('ar-SA'),
      "{{contractAmountText}}": contract.contractAmountText || "",
      "{{duration}}": contract.duration?.toString() || "",
      "{{durationUnit}}": contract.durationUnit ? DURATION_UNITS[contract.durationUnit] : "",
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
    <DashboardLayout>
      <div className="space-y-4">
        {/* شريط الأدوات */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate("/contracts");
              }
            }}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <Button 
              onClick={() => navigate(`/contracts/${contract.id}/print`)} 
              className="flex-1 sm:flex-none bg-green-700 hover:bg-green-800 text-white"
            >
              <Printer className="h-4 w-4 ml-2" />
              طباعة العقد
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
              تحميل PDF
            </Button>
          </div>
        </div>

        {/* معاينة العقد */}
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
            <div className="p-4 sm:p-8 md:p-12 lg:p-16 print:p-6" style={{ minHeight: '297mm', position: 'relative' }}>
              {/* رأس الصفحة */}
              <div className="flex flex-row items-start justify-between mb-6">
                <div className="text-right">
                  {/* تم إزالة رقم الترخيص من هنا */}
                </div>
                <div className="flex items-center gap-4">
                  {/* شعار الجمعية */}
                  {orgSettings?.logoUrl && (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-12 sm:h-16" />
                  )}
                </div>
              </div>

              {/* عنوان العقد */}
              <div 
                className="text-center py-4 px-3 sm:px-6 mb-6 rounded-lg"
                style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
              >
                <h1 className="text-lg sm:text-xl font-bold">
                  عقد {CONTRACT_TYPES[contract.contractType] || contract.contractType} على تنفيذ مشروع {contract.mosqueName || "المسجد"}
                  {contract.mosqueNeighborhood && ` بحي ${contract.mosqueNeighborhood}`}
                </h1>
              </div>

              {/* مقدمة العقد */}
              <p className="text-center mb-6 text-gray-700 text-sm sm:text-base">
                إنه في يوم {getArabicDayName(contractDate)} بتاريخ {toHijriDate(contractDate)} الموافق {contractDate.toLocaleDateString('ar-SA')} فقد تم الاتفاق بين كل من:
              </p>

              {/* الطرف الأول */}
              <div className="mb-6">
                <div 
                  className="py-2 px-4 mb-3 rounded"
                  style={{ backgroundColor: '#e8f5e9' }}
                >
                  <h2 className="font-bold text-green-800 text-sm sm:text-base">
                    {orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
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
              <div className="mb-6">
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  حيث إن {orgSettings?.organizationName || "الطرف الأول"} جمعية مرخصة ومتخصصة في عمارة المساجد والعناية بها 
                  و{contract.secondPartyName} جهة متخصصة في {CONTRACT_TYPES[contract.contractType] || "الخدمات"}،
                  فقد تم إبرام هذا العقد لـ{contract.contractTitle} وفق أعلى المعايير الفنية والهندسية ووفقاً للبنود المذكورة أدناه :
                </p>
              </div>

              {/* بنود العقد الديناميكية */}
              <div className="space-y-6">
                {clauseValues?.filter((c: any) => c.isIncluded).map((clause: any, index: number) => (
                  <div key={clause.id} className="mb-6 break-inside-avoid">
                    <h3 
                      className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                      style={{ backgroundColor: '#1a5f4a', color: 'white', minHeight: '40px' }}
                    >
                      {clause.originalTitleAr || clause.title || `المادة ${index + 1}`}:
                    </h3>
                    <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-2 sm:pr-4 text-right">
                      {replaceVariables(clause.customContent || clause.originalContent)}
                    </div>
                  </div>
                ))}
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

              {/* القيمة المالية وتفاصيل الحساب */}
              <div className="mb-6 break-inside-avoid">
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

              {/* التوقيعات */}
              <div className="mt-12">
                <div className="text-center mb-8">
                  <p className="font-bold text-base sm:text-lg">هذا وبالله التوفيق،،،</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* الطرف الأول */}
                  <div className="text-center sm:border-l sm:pl-4 pb-8 sm:pb-0 border-b sm:border-b-0 last:border-b-0">
                    <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الأول</h4>
                    <p className="font-medium text-xs sm:text-sm">{orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}</p>
                    <p className="text-xs sm:text-sm">{(contract.signatory?.name || orgSettings?.authorizedSignatory || "----")}</p>
                    <p className="text-xs sm:text-xs text-gray-600">{(contract.signatory?.title || orgSettings?.signatoryTitle || "----")}</p>
                    <div className="mt-8 space-y-4 text-xs sm:text-sm">
                      <p>التوقيع: ...................................</p>
                      <p>التاريخ: ...................................</p>
                    </div>
                    <p className="mt-4 text-xs text-gray-600">الختم الرسمي</p>
                    <div className="h-20 border border-dashed border-gray-300 mt-2 rounded"></div>
                  </div>

                  {/* الطرف الثاني */}
                  <div className="text-center sm:pr-4">
                    <h4 className="font-bold mb-2 text-sm sm:text-base">الطرف الثاني</h4>
                    <p className="font-medium text-xs sm:text-sm">{contract.secondPartyName}</p>
                    <p className="text-xs sm:text-sm">{contract.secondPartyRepresentative || "----"}</p>
                    <p className="text-xs sm:text-xs text-gray-600">{contract.secondPartyTitle || "----"}</p>
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
              <div 
                className="absolute bottom-4 left-0 right-0 text-center text-[10px] sm:text-xs text-gray-500 print:relative print:mt-12"
                style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', margin: '0 16px sm:0 32px' }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-center gap-1">
                  <span>E: {orgSettings?.email || "info@tamam.org.sa"}</span>
                  <span className="hidden sm:inline">{orgSettings?.website || "tamamgate.manarah.org.sa"}</span>
                  <span>{orgSettings?.address || "المملكة العربية السعودية"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* قسم طلبات التعديل وسجل التعديلات */}
        {contract.status === "approved" && (
          <div className="print:hidden mt-8 space-y-6">
            {/* طلبات التعديل المعلقة */}
            {modificationRequests && modificationRequests.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold">طلبات التعديل المعلقة</h3>
                </div>
                <div className="space-y-4">
                  {modificationRequests.map((request: any) => (
                    <div 
                      key={request.id} 
                      className={`border rounded-lg p-4 ${
                        request.status === "pending" ? "border-yellow-300 bg-yellow-50" :
                        request.status === "approved" ? "border-green-300 bg-green-50" :
                        "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={request.status === "pending" ? "outline" : request.status === "approved" ? "default" : "destructive"}>
                              {request.status === "pending" ? "قيد المراجعة" :
                               request.status === "approved" ? "تمت الموافقة" : "مرفوض"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {MODIFICATION_TYPES.find(t => t.value === request.modificationType)?.label || request.modificationType}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              • {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-sm">التعديلات المطلوبة:</span>
                              <p className="text-sm text-gray-700">{request.description}</p>
                            </div>
                            <div>
                              <span className="font-medium text-sm">المبررات:</span>
                              <p className="text-sm text-gray-700">{request.justification}</p>
                            </div>
                            {request.reviewNotes && (
                              <div>
                                <span className="font-medium text-sm">ملاحظات المراجع:</span>
                                <p className="text-sm text-gray-700">{request.reviewNotes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openReviewDialog(request.id, "approve")}
                            >
                              <CheckCircle2 className="h-4 w-4 ml-1" />
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openReviewDialog(request.id, "reject")}
                            >
                              <XCircle className="h-4 w-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* سجل التعديلات */}
            {modificationLogs && modificationLogs.length > 0 && (
              <Card className="p-6">
                <Accordion type="single" collapsible>
                  <AccordionItem value="logs" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-0">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">سجل التعديلات ({modificationLogs.length})</h3>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 mt-4">
                        {modificationLogs.map((log: any) => (
                          <div key={log.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {MODIFICATION_TYPES.find(t => t.value === log.modificationType)?.label || log.modificationType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleDateString("ar-SA", {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">التعديل:</span> {log.description}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">المبرر:</span> {log.justification}
                            </p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            )}
          </div>
        )}

        {/* نموذج الموافقة/الرفض */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve" ? "الموافقة على طلب التعديل" : "رفض طلب التعديل"}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === "approve" 
                  ? "هل أنت متأكد من الموافقة على هذا الطلب؟" 
                  : "يرجى إدخال سبب الرفض"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label>
                  {reviewAction === "approve" ? "ملاحظات (اختياري)" : "سبب الرفض"}
                  {reviewAction === "reject" && <span className="text-red-500"> *</span>}
                </Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewAction === "approve" 
                    ? "أضف ملاحظات إن وجدت..." 
                    : "اذكر سبب رفض طلب التعديل..."}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleReviewRequest}
                disabled={approveModificationMutation.isPending || rejectModificationMutation.isPending}
                className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={reviewAction === "reject" ? "destructive" : "default"}
              >
                {(approveModificationMutation.isPending || rejectModificationMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : reviewAction === "approve" ? (
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                ) : (
                  <XCircle className="h-4 w-4 ml-2" />
                )}
                {reviewAction === "approve" ? "موافقة" : "رفض"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* أنماط الطباعة */}
        <style>{`
          @media print {
            /* إخفاء شريط التنقل الجانبي والعلوي وأي أزرار أو عناصر تحكم */
            [data-sidebar="sidebar"],
            .sidebar,
            aside,
            button,
            .print\\:hidden,
            .h-14,
            .sticky,
            [class*="sidebar"],
            [class*="Sidebar"] {
              /* إقصاء السايدبار فقط وتجنب إخفاء الـ SidebarInset */
              display: none !important;
              visibility: hidden !important;
            }
            
            /* السماح للـ SidebarInset بالظهور للمحتوى */
            [class*="SidebarInset"],
            [data-sidebar="sidebar-inset"] {
              display: block !important;
              visibility: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            
            /* تهيئة المحتوى الرئيسي ليأخذ كامل الصفحة وبدون خلفيات أو هوامش */
            body, html {
              background-color: white !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              width: 100% !important;
            }
            
            main,
            .min-h-screen {
              padding: 0 !important;
              margin: 0 !important;
              background-color: white !important;
              min-height: 0 !important;
              height: auto !important;
              width: 100% !important;
              display: block !important;
              border: none !important;
              box-shadow: none !important;
            }
            
            /* إلغاء الهوامش المفرطة لصفحة المعاينة */
            .w-full.overflow-x-auto.pb-8 {
              padding: 0 !important;
              margin: 0 !important;
              background: none !important;
              overflow: visible !important;
            }
            
            .w-full.overflow-x-auto.pb-8 > div {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            
            .approved-watermark {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) rotate(-30deg) !important;
              z-index: 9999 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            @page {
              size: A4;
              margin: 0;
            }
          }
          @media screen {
            .approved-watermark {
              position: absolute;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
