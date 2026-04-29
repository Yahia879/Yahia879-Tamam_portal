import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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

  const { contract, payments, organizationSettings: orgSettings } = data;
  const contractDate = contract.contractDate ? new Date(contract.contractDate) : new Date();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* شريط الأدوات */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" onClick={() => navigate("/contracts")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div className="flex gap-2">
            {(contract.status === "draft" || contract.status === "pending_approval") && (
              <Button
                onClick={() => approveMutation.mutate({ id: contractId! })}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Check className="h-4 w-4 ml-2" />
                )}
                اعتماد العقد
              </Button>
            )}
            {/* زر طلب التعديل */}
            {(() => {
              const modStatus = canRequestModification(contract, payments || []);
              return contract.status === "approved" && (
                <Dialog open={modificationDialogOpen} onOpenChange={setModificationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      disabled={!modStatus.allowed}
                      title={modStatus.reason || "طلب تعديل على العقد"}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      طلب تعديل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>طلب تعديل على العقد</DialogTitle>
                      <DialogDescription>
                        أدخل تفاصيل التعديل المطلوب ومبرراته. سيتم إرسال الطلب للموافقة.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>نوع التعديل <span className="text-red-500">*</span></Label>
                        <Select value={modificationType} onValueChange={setModificationType}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع التعديل" />
                          </SelectTrigger>
                          <SelectContent>
                            {MODIFICATION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>وصف التعديلات المطلوبة <span className="text-red-500">*</span></Label>
                        <Textarea
                          value={modificationDescription}
                          onChange={(e) => setModificationDescription(e.target.value)}
                          placeholder="اشرح بالتفصيل التعديلات التي تريد إجراءها على العقد..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>مبررات التعديل <span className="text-red-500">*</span></Label>
                        <Textarea
                          value={modificationJustification}
                          onChange={(e) => setModificationJustification(e.target.value)}
                          placeholder="اذكر الأسباب والمبررات التي تستدعي هذا التعديل..."
                          rows={3}
                        />
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium">تنبيه:</p>
                            <p>سيتم إرسال طلب التعديل للموافقة عليه من المسؤول. لن يتم إجراء أي تعديل إلا بعد الموافقة.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setModificationDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button 
                        onClick={handleSubmitModificationRequest}
                        disabled={requestModificationMutation.isPending}
                      >
                        {requestModificationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <MessageSquare className="h-4 w-4 ml-2" />
                        )}
                        إرسال الطلب
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              );
            })()}

            {/* زر طلب صرف - يظهر فقط للعقود المعتمدة */}
            {contract.status === "approved" && (
              <Button 
                variant="outline" 
                className="border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => navigate(`/disbursements?contractId=${contractId}`)}
              >
                <Banknote className="h-4 w-4 ml-2" />
                طلب صرف
              </Button>
            )}

            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>

        {/* معاينة العقد */}
        <div 
          ref={printRef}
          className="bg-white mx-auto print:m-0"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
          }}
        >
          {/* علامة معتمد المائية */}
          {contract.status === "approved" && (
            <div 
              className="approved-watermark"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              <div 
                style={{
                  border: '8px solid rgba(22, 163, 74, 0.6)',
                  borderRadius: '12px',
                  padding: '16px 32px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <div 
                  style={{
                    color: 'rgba(22, 163, 74, 0.7)',
                    fontSize: '72px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  معتمد
                </div>
                <div 
                  style={{
                    color: 'rgba(22, 163, 74, 0.7)',
                    fontSize: '18px',
                    textAlign: 'center',
                    marginTop: '8px',
                  }}
                >
                  {contract.approvedAt ? new Date(contract.approvedAt).toLocaleDateString('ar-SA') : ''}
                </div>
              </div>
            </div>
          )}
          
          {/* الصفحة الأولى */}
          <div className="p-8 print:p-6" style={{ minHeight: '297mm', position: 'relative' }}>
            {/* رأس الصفحة */}
            <div className="flex items-start justify-between mb-6">
              <div className="text-right">
                <div className="text-sm text-gray-600">رقم الترخيص {orgSettings?.licenseNumber || "----"}</div>
              </div>
              <div className="flex items-center gap-4">
                {/* شعار الجمعية */}
                {orgSettings?.logoUrl && (
                  <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16" />
                )}
              </div>
            </div>

            {/* عنوان العقد */}
            <div 
              className="text-center py-4 px-6 mb-6 rounded-lg"
              style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
            >
              <h1 className="text-xl font-bold">
                عقد {CONTRACT_TYPES[contract.contractType] || contract.contractType} على تنفيذ مشروع {contract.mosqueName || "المسجد"}
                {contract.mosqueNeighborhood && ` بحي ${contract.mosqueNeighborhood}`}
              </h1>
            </div>

            {/* مقدمة العقد */}
            <p className="text-center mb-6 text-gray-700">
              إنه في يوم {getArabicDayName(contractDate)} بتاريخ {toHijriDate(contractDate)} هـ الموافق {contractDate.toLocaleDateString('ar-SA')} م 
              وفي مدينة {contract.mosqueCity || orgSettings?.city || "----"} فقد تم الاتفاق بين كل من:
            </p>

            {/* الطرف الأول */}
            <div className="mb-6">
              <div 
                className="py-2 px-4 mb-3 rounded"
                style={{ backgroundColor: '#e8f5e9' }}
              >
                <h2 className="font-bold text-green-800">
                  {orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}
                </h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600 w-40">ترخيص المركز الوطني:</td>
                    <td className="py-1">{orgSettings?.licenseNumber || "----"}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">ويمثلها في هذا العقد:</td>
                    <td className="py-1 font-medium">{orgSettings?.authorizedSignatory || "----"} بصفته {orgSettings?.signatoryTitle || "----"}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">العنوان ورقم الاتصال:</td>
                    <td className="py-1">{orgSettings?.address || "----"} | جوال ({orgSettings?.phone || "----"})</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">البريد الإلكتروني:</td>
                    <td className="py-1" dir="ltr">{orgSettings?.email || "----"}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">ويشار إليها لاحقاً بـ:</td>
                    <td className="py-1 font-bold">الطرف الأول</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* الطرف الثاني */}
            <div className="mb-6">
              <div 
                className="py-2 px-4 mb-3 rounded"
                style={{ backgroundColor: '#e8f5e9' }}
              >
                <h2 className="font-bold text-green-800">
                  {contract.secondPartyName}
                </h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600 w-40">سجل تجاري رقم:</td>
                    <td className="py-1" dir="ltr">({contract.secondPartyCommercialRegister || "----"})</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">ويمثلها في هذا العقد:</td>
                    <td className="py-1 font-medium">{contract.secondPartyRepresentative || "----"} بصفته {contract.secondPartyTitle || "----"}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">العنوان ورقم الاتصال:</td>
                    <td className="py-1">{contract.secondPartyAddress || "----"} | جوال ({contract.secondPartyPhone || "----"})</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">البريد الإلكتروني:</td>
                    <td className="py-1" dir="ltr">{contract.secondPartyEmail || "----"}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">ويشار إليها لاحقاً بـ:</td>
                    <td className="py-1 font-bold">الطرف الثاني</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* التمهيد */}
            <div className="mb-6">
              <h3 className="font-bold text-green-800 mb-2">تمهيد:</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                حيث إن {orgSettings?.organizationName || "الطرف الأول"} جمعية مرخصة ومتخصصة في عمارة المساجد والعناية بها 
                و{contract.secondPartyName} جهة متخصصة في {CONTRACT_TYPES[contract.contractType] || "الخدمات"}،
                فقد تم إبرام هذا العقد لـ{contract.contractTitle} وفق أعلى المعايير الفنية والهندسية.
              </p>
            </div>

            {/* المادة الأولى */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الأولى: التزامات الطرف الأول:
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700 pr-4">
                <li>تزويد الطرف الثاني بجميع البيانات والمستندات المتعلقة بالمشروع.</li>
                <li>دفع قيمة الخدمات المتفق عليها وفقًا للشروط الزمنية المحددة.</li>
                <li>إصدار الدفعات حسب مراحل الإنجاز.</li>
              </ol>
            </div>

            {/* تذييل الصفحة */}
            <div 
              className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500"
              style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', margin: '0 32px' }}
            >
              <div className="flex justify-between items-center">
                <span>E: {orgSettings?.email || "info@tamam.org.sa"}</span>
                <span>{orgSettings?.website || "www.tamam.org.sa"}</span>
                <span>{orgSettings?.address || "المملكة العربية السعودية"}</span>
              </div>
              <div className="mt-2">الصفحة 1 من 4</div>
            </div>
          </div>

          {/* الصفحة الثانية */}
          <div className="p-8 print:p-6 page-break-before" style={{ minHeight: '297mm', position: 'relative', pageBreakBefore: 'always' }}>
            {/* المادة الثانية */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الثانية: التزامات الطرف الثاني:
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700 pr-4">
                <li>إصدار التراخيص المطلوبة.</li>
                <li>اعتماد كافة المخططات من كل الجهات ذات العلاقة.</li>
                <li>تقديم الدراسات الفنية والمخططات المطلوبة وفقًا للمعايير الهندسية.</li>
                <li>الالتزام بتسليم الأعمال ضمن الجدول الزمني المحدد.</li>
                <li>استخراج التراخيص في نطاق المنطقة.</li>
                <li>إجراء التعديلات المطلوبة خلال مدة زمنية محددة.</li>
                <li>المحافظة على سرية المعلومات والبيانات المقدمة.</li>
                <li>الالتزام بمعايير الجودة والسلامة.</li>
              </ol>
            </div>

            {/* المادة الثالثة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الثالثة: مدة العقد
              </h3>
              <p className="text-sm text-gray-700">
                مدة العقد ({contract.duration}) {contract.durationUnit ? DURATION_UNITS[contract.durationUnit] : "شهر"} من تاريخ توقيع العقد.
              </p>
            </div>

            {/* المادة الرابعة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الرابعة: قيمة العقد
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                ({parseFloat(contract.contractAmount).toLocaleString('ar-SA')} ريال – {contract.contractAmountText || numberToArabicText(parseFloat(contract.contractAmount))})
              </p>

              {/* جدول الدفعات */}
              {payments && payments.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">الدفعات</h4>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th className="border p-2 text-right">المرحلة/الدفعة</th>
                        <th className="border p-2 text-center">المبلغ</th>
                        <th className="border p-2 text-center">تاريخ الاستحقاق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, index) => (
                        <tr key={index}>
                          <td className="border p-2">{payment.phaseName}</td>
                          <td className="border p-2 text-center">{parseFloat(payment.amount).toLocaleString('ar-SA')}</td>
                          <td className="border p-2 text-center">
                            {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('ar-SA') : "يتم تحديده"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* بيانات الحساب البنكي */}
              <div className="text-sm">
                <p className="mb-1">يتم تحويل الدفعات على حساب الطرف الثاني:</p>
                <ul className="list-disc list-inside pr-4 space-y-1">
                  <li>اسم الحساب: <span className="font-medium">{contract.secondPartyAccountName || contract.secondPartyName}</span></li>
                  <li>رقم الآيبان: <span className="font-medium" dir="ltr">{contract.secondPartyIban || "----"}</span></li>
                  <li>اسم البنك: <span className="font-medium">{contract.secondPartyBankName || "----"}</span></li>
                </ul>
              </div>
            </div>

            {/* تذييل الصفحة */}
            <div 
              className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500"
              style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', margin: '0 32px' }}
            >
              <div className="mt-2">الصفحة 2 من 4</div>
            </div>
          </div>

          {/* الصفحة الثالثة */}
          <div className="p-8 print:p-6" style={{ minHeight: '297mm', position: 'relative', pageBreakBefore: 'always' }}>
            {/* المادة الخامسة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الخامسة: تعديل العقد:
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700 pr-4">
                <li>لا يجوز تعديل أي بند من بنود هذا العقد إلا بموافقة الطرفين كتابياً على التعديل.</li>
                <li>يتم إضافة أي بنود إضافية لهذا العقد لملاحق العقد بعد التوقيع عليها من الطرفين.</li>
                <li>يشار في الملاحق التي تتبع التوقيع على هذا العقد إلى هذا العقد لإيضاح العمل المنفذ وإثباته.</li>
              </ol>
            </div>

            {/* المادة السادسة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة السادسة: الإشعارات والمراسلات:
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700 pr-4">
                <li>تتم الإشعارات والمراسلات بين الطرفين كتابياً بواسطة البريد الرسمي أو التسليم باليد بوجود تأكيد خطي على الاستلام أو عبر البريد الإلكتروني أو الفاكس مع تأكيد الاستلام على العناوين المحددة في صدر هذا العقد.</li>
                <li>تُعد الإشعارات والمراسلات المرسلة عبر الطرق المحددة صحيحة ومنتجة لكافة آثارها.</li>
                <li>في حال قام أحد الطرفين بتغيير عنوانه فيلزم إشعار الطرف الآخر رسمياً بعنوانه الجديد ويكون العنوان الجديد والموضح من الطرف المعني هو العنوان الصحيح وكذلك ضابط الاتصال.</li>
              </ol>
            </div>

            {/* المادة السابعة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة السابعة: أحكام عامة:
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700 pr-4">
                <li>يتم البدء بالعمل بهذا العقد بموجب التوقيع عليه من قبل الطرفين.</li>
                <li>يلتزم الطرف الثاني بتنفيذ الأعمال المطلوبة منه وفق الأصول المتبعة وبأفضل جودة وخلال الفترة الزمنية المحددة بالعقد.</li>
                <li>تخضع هذه الاتفاقية لموافقة الطرفين كتابياً في جميع أعمالها والتزامهما بالعمل ضمن بنودها أو الملاحق الموافق عليها خطياً.</li>
              </ol>
            </div>

            {/* المادة الثامنة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الثامنة: سرية المعلومات:
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                يتعهد الطرفان بالحفاظ على سرية المعلومات التي تتوفر لديهما بسبب تطبيق هذه الاتفاقية سواءً كانت شفوية أو مكتوبة
                ولا يجوز إفشاء هذه الأسرار لأي طرف ثالث إلا بعد الحصول على موافقة خطية مسبقة من الطرف الآخر.
              </p>
            </div>

            {/* تذييل الصفحة */}
            <div 
              className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500"
              style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', margin: '0 32px' }}
            >
              <div className="mt-2">الصفحة 3 من 4</div>
            </div>
          </div>

          {/* الصفحة الرابعة */}
          <div className="p-8 print:p-6" style={{ minHeight: '297mm', position: 'relative', pageBreakBefore: 'always' }}>
            {/* المادة التاسعة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة التاسعة: حقوق الملكية الفكرية:
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                يلتزم الطرفين بمراعاة حقوق الملكية الفكرية والأدبية الخاصة أو المملوكة للطرف الآخر وعدم التعدي عليها، كما لا تعطي
                هذه الاتفاقية أياً من الطرفين أي حقوق تجاه حقوق الملكية الفكرية المملوكة للطرف الآخر.
              </p>
            </div>

            {/* المادة العاشرة */}
            <div className="mb-6">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة العاشرة: حل المنازعات:
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700 pr-4">
                <li>في حال حدوث أي خلاف بين الطرفين حول تفسير أو تنفيذ أي بند من بنود هذه الاتفاقية أو ملحقاتها يتم حله بالطرق الودية، فإن تعذر ذلك فيكون الاختصاص للجهات الرسمية وفقاً لأحكام القانون والنظام السعودي.</li>
                <li>تخضع هذه الاتفاقية للأنظمة المعمول بها في المملكة العربية السعودية، وفي حالة نشوء أي نزاع بين الطرفين حول أحكام هذه الاتفاقية يعملان على حلّه ودياً، وإذا تعذر ذلك فيعالج النزاع وفقاً للمحكمة المختصة مكانياً وولائياً.</li>
              </ol>
            </div>

            {/* المادة الحادية عشر */}
            <div className="mb-8">
              <h3 
                className="font-bold py-2 px-4 rounded mb-3"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                المادة الحادية عشر: نُسخ الاتفاقية:
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                حررت هذه الاتفاقية من نسختين ويُسلم كل طرف نسخة للعمل بموجبها، وتوثيقاً لما تقدم فقد جرى التوقيع على هذه
                الاتفاقية في التاريخ المبين في مقدمتها.
              </p>
            </div>

            {/* التوقيعات */}
            <div className="text-center mb-8">
              <p className="font-bold text-lg">هذا وبالله التوفيق،،،</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* الطرف الأول */}
              <div className="text-center border-l pl-4">
                <h4 className="font-bold mb-2">الطرف الأول</h4>
                <p className="font-medium">{orgSettings?.organizationName || "جمعية تمام للعناية بالمساجد"}</p>
                <p className="text-sm">{orgSettings?.authorizedSignatory || "----"}</p>
                <p className="text-sm text-gray-600">{orgSettings?.signatoryTitle || "----"}</p>
                <div className="mt-8 space-y-4">
                  <p>التوقيع: ...................................</p>
                  <p>التاريخ: ...................................</p>
                </div>
                <p className="mt-4 text-sm text-gray-600">الختم الرسمي</p>
                <div className="h-20 border border-dashed border-gray-300 mt-2 rounded"></div>
              </div>

              {/* الطرف الثاني */}
              <div className="text-center pr-4">
                <h4 className="font-bold mb-2">الطرف الثاني</h4>
                <p className="font-medium">{contract.secondPartyName}</p>
                <p className="text-sm">{contract.secondPartyRepresentative || "----"}</p>
                <p className="text-sm text-gray-600">{contract.secondPartyTitle || "----"}</p>
                <div className="mt-8 space-y-4">
                  <p>التوقيع: ...................................</p>
                  <p>التاريخ: ...................................</p>
                </div>
                <p className="mt-4 text-sm text-gray-600">الختم الرسمي</p>
                <div className="h-20 border border-dashed border-gray-300 mt-2 rounded"></div>
              </div>
            </div>

            {/* تذييل الصفحة */}
            <div 
              className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500"
              style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', margin: '0 32px' }}
            >
              <div className="mt-2">الصفحة 4 من 4</div>
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
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            [class*="DashboardLayout"] {
              padding: 0 !important;
              margin: 0 !important;
            }
            [class*="DashboardLayout"] > * {
              visibility: hidden;
            }
            [class*="DashboardLayout"] > div:last-child,
            [class*="DashboardLayout"] > div:last-child * {
              visibility: visible;
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
