import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectSearchSelect } from "@/components/ProjectSearchSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Send,
  Plus,
  Trash2,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
}

interface SupplierEntry {
  id: string;
  name: string;
  work: string;
  amount: number;
  iban: string;
  bank: string;
}

export default function NewDisbursementRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ projectId?: string; contractId?: string }>();
  const utils = trpc.useUtils();
  
  // بيانات النموذج
  const [formData, setFormData] = useState<{
    projectId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number | "";
    dateMiladi: string;
    contractPaymentId: number;
  }>({
    projectId: params.projectId ? parseInt(params.projectId) : 0,
    contractId: params.contractId ? parseInt(params.contractId) : 0,
    title: "",
    description: "",
    completionPercentage: "",
    dateMiladi: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    contractPaymentId: 0,
  });
  
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [showReportReviewDialog, setShowReportReviewDialog] = useState(false);

  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([
    { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }
  ]);
  
  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});
  
  // جلب الموردين النشطين
  const { data: allSuppliers } = trpc.suppliers.getActiveSuppliers.useQuery({ includeUnapproved: true });

  // جلب التصنيفات
  const { data: banksData } = trpc.categories.getCategoryByType.useQuery({ type: "banks" });
  const banks = banksData?.values;
  
  // جلب العقود للمشروع المحدد
  const { data: projectContracts } = trpc.contracts.list.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );
  
  // جلب تفاصيل المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  // جلب تقارير الإنجاز المعتمدة للمشروع المحدد
  const { data: approvedReports } = trpc.progressReports.list.useQuery(
    { projectId: formData.projectId || undefined, status: "approved" },
    { enabled: formData.projectId > 0 }
  );

  const selectedReport = approvedReports?.find((r: any) => r.id === selectedReportId);

  // الملء التلقائي بناءً على تقرير الإنجاز المختار
  useEffect(() => {
    if (selectedReport) {
      const paymentIdMatch = (selectedReport.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
      const paymentId = paymentIdMatch ? parseInt(paymentIdMatch[1]) : 0;
      
      const workSummaryText = selectedReport.workSummary || "";
      const actualMatch = workSummaryText.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);
      const actual = actualMatch ? actualMatch[1].trim() : workSummaryText.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();

      const paymentInfo = projectDetails?.payments?.find((p: any) => p.id === paymentId);
      const repComp = (selectedReport.plannedProgress !== null && selectedReport.plannedProgress !== undefined) ? selectedReport.plannedProgress : "";

      setFormData(prev => ({
        ...prev,
        title: `طلب دفعة لـ ${selectedReport.title}`,
        description: `تقرير إنجاز ${selectedReport.reportNumber} - الأعمال المنفذة فعلياً:\n${actual}`,
        completionPercentage: repComp,
        contractPaymentId: paymentId,
      }));

      if (paymentInfo) {
        setSuppliers(prev => prev.map(s => ({
          ...s,
          amount: parseFloat(paymentInfo.amount || "0"),
          work: paymentInfo.description || "",
        })));
      }
    }
  }, [selectedReportId, projectDetails]);
  
  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId },
    { enabled: formData.contractId > 0 }
  );
  
  // mutation لإنشاء طلب دفعة للمشروع
  const createMutation = trpc.projects.createPayment.useMutation({
    onSuccess: (data) => {
      toast.success("تم إضافة طلب الدفعة بنجاح");
      utils.projects.invalidate();
      utils.contracts.invalidate();
      navigate(`/projects/${formData.projectId}`);
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // تحديث بيانات المورد من العقد
  useEffect(() => {
    if (contractDetails) {
      const supplierFromContract: SupplierEntry = {
        id: crypto.randomUUID(),
        name: contractDetails.contract.secondPartyName || "",
        work: contractDetails.contract.contractTitle || "",
        amount: parseFloat(String(contractDetails.contract.contractAmount || "0")),
        iban: contractDetails.contract.secondPartyIban || "",
        bank: contractDetails.contract.secondPartyBankName || "",
      };
      setSuppliers([supplierFromContract]);
    }
  }, [contractDetails]);

  // اختيار العقد تلقائياً إذا كان هناك عقد واحد فقط للمشروع
  useEffect(() => {
    if (projectContracts && projectContracts.contracts && projectContracts.contracts.length === 1) {
      if (formData.contractId === 0) {
        setFormData(prev => ({ ...prev, contractId: projectContracts.contracts[0].id }));
      }
    }
  }, [projectContracts]);
  
  // حساب الإجمالي
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // حساب المتبقي للدفعة
  const totalPaymentsSum = projectDetails?.payments
    ?.filter((p: any) => p.status !== "rejected" && p.status !== "cancelled" && !String(p.id).startsWith("cp-"))
    ?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0) || 0;
  const totalContractsSum = projectDetails?.contracts?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0) || 0;
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0") || totalContractsSum;
  const remainingAmount = contractAmount - totalPaymentsSum;

  // إضافة مورد جديد
  const addSupplier = () => {
    setSuppliers([...suppliers, { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }]);
  };
  
  // حذف مورد
  const removeSupplier = (id: string) => {
    if (suppliers.length > 1) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };
  
  // تحديث بيانات المورد
  const updateSupplier = (id: string, field: keyof SupplierEntry, value: string | number) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // اختيار مورد من القائمة
  const handleSelectSupplier = (id: string, supplierName: string) => {
    const selectedSupplier = allSuppliers?.find(s => s.name === supplierName);
    if (selectedSupplier) {
      setSuppliers(suppliers.map(s => s.id === id ? { 
        ...s, 
        name: selectedSupplier.name,
        iban: selectedSupplier.iban || s.iban,
        bank: selectedSupplier.bankName || s.bank
      } : s));
    } else {
      updateSupplier(id, "name", supplierName);
    }
  };
  
  // حساب تواريخ الحظر والحد الأدنى لتاريخ الدفعة
  const formatDateToYYYYMMDD = (d: any): string | null => {
    if (!d) return null;
    if (typeof d === 'string') {
      const trimmed = d.trim();
      const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (matchYMD) {
        return `${matchYMD[1]}-${matchYMD[2].padStart(2, '0')}-${matchYMD[3].padStart(2, '0')}`;
      }
      const matchDMY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (matchDMY) {
        return `${matchDMY[3]}-${matchDMY[2].padStart(2, '0')}-${matchDMY[1].padStart(2, '0')}`;
      }
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj);
  };

  const rawContractDate = 
    contractDetails?.contract?.startDate || 
    contractDetails?.contract?.contractDate || 
    projectContracts?.contracts?.[0]?.startDate || 
    projectDetails?.startDate;

  const contractStartDate = formatDateToYYYYMMDD(rawContractDate);

  const existingPayments = projectDetails?.payments || [];
  const usedPaymentDates = existingPayments
    .map((p: any) => formatDateToYYYYMMDD(p.date || p.dateMiladi || p.paidAt || p.createdAt))
    .filter((d: string | null): d is string => !!d);

  const isDateAlreadyUsed = (date: string) => {
    const norm = formatDateToYYYYMMDD(date);
    if (!norm) return false;
    return usedPaymentDates.includes(norm);
  };

  // حساب نسب الإنجاز بناءً على التاريخ المختار
  // ترتيب جميع دفعات المشروع المجدولة والفعلية زمنياً
  const allValidPayments = (projectDetails?.payments || []).filter((p: any) => {
    if (p.status === "rejected" || p.status === "cancelled") return false;
    return p.completionPercentage !== null && p.completionPercentage !== undefined && !isNaN(Number(p.completionPercentage));
  }).sort((a: any, b: any) => {
    const dateA = formatDateToYYYYMMDD(a.date || a.dateMiladi || a.paidAt || a.createdAt) || "";
    const dateB = formatDateToYYYYMMDD(b.date || b.dateMiladi || b.paidAt || b.createdAt) || "";
    const cmp = dateA.localeCompare(dateB);
    if (cmp !== 0) return cmp;
    return (a.phaseOrder ?? 999) - (b.phaseOrder ?? 999);
  });

  // إيجاد الدفعة السابقة والتالية بناءً على التاريخ المختار
  let prevPaymentCompletion: number | null = null;
  let nextPaymentCompletion: number | null = null;
  let prevPaymentRef: any = null;
  let nextPaymentRef: any = null;

  const normalizedSelectedDate = formatDateToYYYYMMDD(formData.dateMiladi);

  if (normalizedSelectedDate) {
    const selectedDate = normalizedSelectedDate;
    // الدفعات التي تسبق التاريخ المختار (تاريخها < التاريخ المختار)
    const beforePayments = allValidPayments.filter((p: any) => {
      const d = formatDateToYYYYMMDD(p.date || p.dateMiladi || p.paidAt || p.createdAt) || "";
      return d < selectedDate;
    });
    // الدفعات التي تلي التاريخ المختار (تاريخها > التاريخ المختار)
    const afterPayments = allValidPayments.filter((p: any) => {
      const d = formatDateToYYYYMMDD(p.date || p.dateMiladi || p.paidAt || p.createdAt) || "";
      return d > selectedDate;
    });

    if (beforePayments.length > 0) {
      prevPaymentRef = beforePayments[beforePayments.length - 1];
      prevPaymentCompletion = Number(prevPaymentRef.completionPercentage);
    }
    if (afterPayments.length > 0) {
      nextPaymentRef = afterPayments[0];
      nextPaymentCompletion = Number(nextPaymentRef.completionPercentage);
    }
  } else {
    // إذا لم يُختر تاريخ بعد، استخدم آخر دفعة كمرجع
    if (allValidPayments.length > 0) {
      prevPaymentRef = allValidPayments[allValidPayments.length - 1];
      prevPaymentCompletion = Number(prevPaymentRef.completionPercentage);
    }
  }

  // التحقق من وجود دفعة مكتملة بنسبة 100% ومنع إضافة أي دفعة بعدها
  const paymentWith100 = allValidPayments.find((p: any) => Number(p.completionPercentage) >= 100);
  const dateOf100 = paymentWith100 ? (formatDateToYYYYMMDD(paymentWith100.date || paymentWith100.dateMiladi || paymentWith100.paidAt || paymentWith100.createdAt) || "") : null;
  const isDateAfter100 = Boolean(dateOf100 && normalizedSelectedDate && normalizedSelectedDate > dateOf100);
  const isAfter100PercentPayment = (prevPaymentCompletion !== null && prevPaymentCompletion >= 100) || isDateAfter100;

  // للتوافق مع حقول العقد (إذا كانت دفعة عقد محددة)
  const contractPaymentsList = contractDetails?.payments || [];
  const cpIndex = formData.contractPaymentId > 0
    ? contractPaymentsList.findIndex((p: any) => {
        const num = typeof p.id === 'string' ? parseInt(p.id.replace(/\D/g, '')) : Number(p.id);
        return num === formData.contractPaymentId || Number(p.id) === formData.contractPaymentId;
      })
    : -1;
  const currContractPayment = cpIndex !== -1 ? contractPaymentsList[cpIndex] : null;
  const contractScheduledCompletion = currContractPayment?.completionPercentage !== null && currContractPayment?.completionPercentage !== undefined
    ? Number(currContractPayment.completionPercentage)
    : null;

  // إرسال للاعتماد
  const handleSubmit = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!formData.dateMiladi) {
      toast.error("يرجى تحديد التاريخ الميلادي");
      return;
    }
    if (isDateAlreadyUsed(formData.dateMiladi)) {
      toast.error(`التاريخ (${formData.dateMiladi}) مستخدم بالفعل لدفعة أخرى. يرجى اختيار تاريخ مختلف`);
      return;
    }
    if (isAfter100PercentPayment) {
      toast.error(`لا يمكن إضافة دفعة بعد تاريخ (${dateOf100 || prevPaymentRef?.date}) لأن نسبة الإنجاز بلغت 100% مسبقاً، ولا توجد نسبة إنجاز أعلى من 100%`);
      return;
    }
    if (!formData.title) {
      toast.error("يرجى إدخال عنوان طلب الدفعة");
      return;
    }
    if (!formData.description) {
      toast.error("يرجى إدخال وصف الأعمال التي سوف تنفذ");
      return;
    }
    if (formData.completionPercentage === "" || isNaN(Number(formData.completionPercentage)) || Number(formData.completionPercentage) < 0 || Number(formData.completionPercentage) > 100) {
      toast.error("يرجى إدخال نسبة إنجاز صحيحة (من 0 إلى 100)");
      return;
    }
    const currentComp = Number(formData.completionPercentage);
    const prevDate = prevPaymentRef ? (formatDateToYYYYMMDD(prevPaymentRef.date || prevPaymentRef.dateMiladi || prevPaymentRef.paidAt || prevPaymentRef.createdAt) || "") : "";
    const nextDate = nextPaymentRef ? (formatDateToYYYYMMDD(nextPaymentRef.date || nextPaymentRef.dateMiladi || nextPaymentRef.paidAt || nextPaymentRef.createdAt) || "") : "";

    if (prevPaymentCompletion !== null && currentComp <= prevPaymentCompletion) {
      toast.error(`نسبة إنجاز الدفعة (${currentComp}%) يجب أن تكون أكبر من نسبة الدفعة السابقة بتاريخ ${prevDate} (${prevPaymentCompletion}%)`);
      return;
    }
    if (nextPaymentCompletion !== null && currentComp >= nextPaymentCompletion) {
      toast.error(`نسبة إنجاز الدفعة (${currentComp}%) يجب أن تكون أقل من نسبة الدفعة التالية بتاريخ ${nextDate} (${nextPaymentCompletion}%)`);
      return;
    }
    if (totalAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (suppliers.some(s => !s.name)) {
      toast.error("يرجى اختيار المورد المستفيد");
      return;
    }

    // التحقق من تجاوز قيمة العقد أو المبلغ المتبقي
    if (contractAmount > 0) {
      if (totalAmount > contractAmount) {
        toast.error(`المبلغ لا يمكن أن يتجاوز قيمة العقد (${contractAmount.toLocaleString()} ريال)`);
        return;
      }

      if (totalAmount > remainingAmount || remainingAmount <= 0) {
        toast.error(
          remainingAmount <= 0
            ? "تم الوصول للحد الأقصى لقيمة العقد ولا يمكن إضافة دفعات جديدة"
            : `المبلغ لا يمكن أن يتجاوز الإجمالي المتبقي للدفعة (${Math.max(0, remainingAmount).toLocaleString()} ريال)`
        );
        return;
      }
    }
    
    createMutation.mutate({
      projectId: formData.projectId,
      contractId: formData.contractId || undefined,
      contractPaymentId: formData.contractPaymentId || undefined,
      amount: totalAmount,
      paymentType: "progress",
      description: formData.title,
      completionPercentage: Number(formData.completionPercentage),
      dateMiladi: formData.dateMiladi,
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20" dir="rtl">
        {/* Header - التحسين للشاشات الصغيرة لتجنب التصادم */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-9 w-9">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="text-right">
              <h1 className="text-xl sm:text-2xl font-bold text-right text-foreground">طلب دفعة جديد</h1>
              <p className="text-xs sm:text-sm text-muted-foreground text-right">إنشاء طلب دفعة للمشروع</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full sm:w-auto shadow-sm">
              <Send className="h-4 w-4 ml-2" />
              إرسال للاعتماد
            </Button>
          </div>
        </div>
          {/* Form */}
        <div className="flex flex-col-reverse lg:flex-row gap-6" dir="ltr">
          {/* Sidebar */}
          <div className="w-full lg:w-1/3 space-y-6 text-right" dir="rtl">
            {/* ملخص الطلب */}
            <Card className="text-right">
              <CardHeader className="text-right">
                <CardTitle className="text-right">ملخص طلب الدفعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                {projectDetails && (
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between text-sm flex-row-reverse">
                      <span className="text-muted-foreground">المشروع:</span>
                      <span className="font-medium">{projectDetails.name}</span>
                    </div>
                    <div className="flex justify-between text-sm flex-row-reverse">
                      <span className="text-muted-foreground">رقم المشروع:</span>
                      <span className="font-medium">{projectDetails.projectNumber}</span>
                    </div>
                  </div>
                )}
                
                {contractDetails && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-right">
                      <div className="flex justify-between text-sm flex-row-reverse">
                        <span className="text-muted-foreground">العقد:</span>
                        <span className="font-medium">{contractDetails.contract.contractNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm flex-row-reverse">
                        <span className="text-muted-foreground">قيمة العقد:</span>
                        <span className="font-medium inline-flex items-center gap-1">{parseFloat(contractDetails.contract.contractAmount || "0").toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="flex justify-between text-sm flex-row-reverse">
                        <span className="text-muted-foreground font-medium">الإجمالي المتبقي للدفعة:</span>
                        <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                          {(parseFloat(contractDetails.contract.contractAmount || "0") - (projectDetails?.payments?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0)).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-2 text-right">
                  <div className="flex justify-between flex-row-reverse">
                    <span className="font-medium">إجمالي الدفعة:</span>
                    <span className={`font-bold text-lg inline-flex items-center gap-1 ${contractDetails && (totalAmount > contractAmount || totalAmount > remainingAmount) ? 'text-destructive' : 'text-primary'}`}>
                      {totalAmount.toLocaleString()} <SaudiRiyal className="w-4 h-4" />
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg text-sm text-right">
                  <p className="text-muted-foreground text-right">{numberToArabicText(totalAmount)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <div className="w-full lg:w-2/3 space-y-6 text-right" dir="rtl">
            {/* بيانات الترويسة */}
            <Card className="text-right">
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 text-right">
                  <FileText className="h-5 w-5" />
                  بيانات طلب الدفعة
                </CardTitle>
                <CardDescription className="text-right">معلومات أساسية عن طلب الدفعة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="space-y-2 text-right">
                  <Label className="text-right">التاريخ الميلادي *</Label>
                  <Input
                    type="date"
                    value={formData.dateMiladi}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const norm = formatDateToYYYYMMDD(newDate);
                      if (dateOf100 && norm && norm > dateOf100) {
                        toast.error(`لا يمكن اختيار تاريخ بعد الدفعة المكتملة بنسبة 100% (${dateOf100})`);
                      }
                      setFormData({ ...formData, dateMiladi: newDate });
                    }}
                    required
                    className={`text-right ${(formData.dateMiladi && (isDateAlreadyUsed(formData.dateMiladi) || isAfter100PercentPayment)) ? 'border-2 border-destructive' : ''}`}
                  />
                  {formData.dateMiladi && isDateAlreadyUsed(formData.dateMiladi) && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>هذا التاريخ مستخدم بالفعل لدفعة أخرى. يرجى اختيار تاريخ مختلف</span>
                    </div>
                  )}
                  {isAfter100PercentPayment && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2.5 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>لا يمكن إضافة دفعة بعد تاريخ ({dateOf100 || prevPaymentRef?.date}) لأن هذه الدفعة بلغت نسبة إنجازها 100%، ولا توجد نسبة إنجاز أعلى من 100%.</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">المشروع</Label>
                  <ProjectSearchSelect
                    projects={projects}
                    value={formData.projectId > 0 ? formData.projectId.toString() : ""}
                    onValueChange={(value) => {
                      setFormData({ ...formData, projectId: parseInt(value) || 0, contractId: 0 });
                      setSelectedReportId(null);
                    }}
                    disabled={!!params.projectId}
                    placeholder="ابحث واختر المشروع..."
                  />
                </div>

                
                 {formData.projectId > 0 && projectContracts && projectContracts.contracts && projectContracts.contracts.length > 0 && (
                  <div className="space-y-2 text-right">
                    <Label className="text-right">العقد</Label>
                    <Select
                      value={formData.contractId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, contractId: parseInt(value) })}
                      disabled={true}
                    >
                      <SelectTrigger className="text-right w-full" dir="rtl">
                        <SelectValue placeholder="اختر العقد" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="0" className="text-right">بدون عقد</SelectItem>
                        {projectContracts.contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id.toString()} className="text-right">
                            {contract.contractNumber} - {(contract as any).subject || contract.contractType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}


                


                <div className="space-y-2 text-right">
                  <Label className="text-right">عنوان طلب الدفعة *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: الدفعة الأولى لمشروع توريد الأجهزة"
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">وصف الأعمال التي سوف تنفذ *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي للأعمال التي سوف تنفذ..."
                    rows={3}
                    required
                    className="text-right"
                  />
                </div>
                
                 <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">نسبة الإنجاز التراكمية (%) *</Label>
                  {(() => {
                    const currentComp = formData.completionPercentage !== "" ? Number(formData.completionPercentage) : null;
                    const isBelowPrev = prevPaymentCompletion !== null && currentComp !== null && currentComp <= prevPaymentCompletion;
                    const isAboveNext = nextPaymentCompletion !== null && currentComp !== null && currentComp >= nextPaymentCompletion;
                    const minAllowed = prevPaymentCompletion !== null ? prevPaymentCompletion + 1 : 0;
                    const maxAllowed = nextPaymentCompletion !== null ? Math.max(minAllowed, nextPaymentCompletion - 1) : 100;
                    const prevDate = prevPaymentRef ? (formatDateToYYYYMMDD(prevPaymentRef.date || prevPaymentRef.dateMiladi || prevPaymentRef.paidAt || prevPaymentRef.createdAt) || "") : "";
                    const nextDate = nextPaymentRef ? (formatDateToYYYYMMDD(nextPaymentRef.date || nextPaymentRef.dateMiladi || nextPaymentRef.paidAt || nextPaymentRef.createdAt) || "") : "";

                    return (
                      <>
                        {isAfter100PercentPayment ? (
                          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3.5 text-xs text-destructive font-bold flex items-center gap-2.5 animate-in fade-in">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <div className="space-y-1">
                              <p className="font-bold">غير متاح إدراج نسبة إنجاز بعد الدفعة المكتملة</p>
                              <p className="font-normal text-[11px] text-destructive/90">
                                الدفعة السابقة بتاريخ ({prevDate || dateOf100}) بلغت نسبة إنجازها 100%. لا يمكن إدراج أي دفعة جديدة بنسبة أعلى من 100%. يرجى اختيار تاريخ يسبق تاريخ هذه الدفعة لتحديد نسبة بين الدفعات السابقة.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* نطاق مسموح به */}
                            {formData.dateMiladi && (prevPaymentCompletion !== null || nextPaymentCompletion !== null) && (
                              <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 rounded-lg p-2.5 text-xs text-sky-800 dark:text-sky-300 space-y-1">
                                {prevPaymentCompletion !== null && (
                                  <p>📅 الدفعة السابقة ({prevDate}): نسبة إنجازها <strong>{prevPaymentCompletion}%</strong> ← يجب أن تكون النسبة الجديدة أكبر من ذلك</p>
                                )}
                                {nextPaymentCompletion !== null && (
                                  <p>📅 الدفعة التالية ({nextDate}): نسبة إنجازها <strong>{nextPaymentCompletion}%</strong> ← يجب أن تكون النسبة الجديدة أقل من ذلك</p>
                                )}
                                {prevPaymentCompletion === null && (
                                  <p>⭐ لا توجد دفعات قبل هذا التاريخ — يمكن أن تبدأ النسبة من 0%</p>
                                )}
                                <p className="font-bold text-sky-700 dark:text-sky-400">
                                  النطاق المسموح: {minAllowed}% – {maxAllowed}%
                                </p>
                              </div>
                            )}
                            {!formData.dateMiladi && (
                              <p className="text-xs text-amber-600">⚠ حدد التاريخ أولاً لمعرفة النطاق المسموح لنسبة الإنجاز</p>
                            )}
                            <Input
                              type="number"
                              min={minAllowed}
                              max={maxAllowed}
                              required
                              placeholder={!formData.dateMiladi ? "حدد التاريخ أولاً" : prevPaymentCompletion === null ? "مثال: 0" : `الحد الأدنى: ${minAllowed}%`}
                              value={formData.completionPercentage}
                              disabled={!formData.dateMiladi}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              onChange={(e) => {
                                if (e.target.value === "") {
                                  setFormData({ ...formData, completionPercentage: "" });
                                } else {
                                  const val = parseInt(e.target.value);
                                  setFormData({
                                    ...formData,
                                    completionPercentage: isNaN(val) ? "" : Math.min(100, Math.max(0, val))
                                  });
                                }
                              }}
                              onBlur={(e) => {
                                const val = e.target.value === "" ? null : parseInt(e.target.value);
                                if (val !== null && !isNaN(val)) {
                                  if (prevPaymentCompletion !== null && val <= prevPaymentCompletion) {
                                    toast.error(`نسبة إنجاز الدفعة (${val}%) غير مقبولة — يجب أن تكون أكبر من نسبة الدفعة السابقة بتاريخ ${prevDate} (${prevPaymentCompletion}%). تم ضبطها على الحد الأدنى (${minAllowed}%).`);
                                    setFormData({ ...formData, completionPercentage: minAllowed });
                                  } else if (nextPaymentCompletion !== null && val >= nextPaymentCompletion) {
                                    const maxVal = Math.max(minAllowed, nextPaymentCompletion - 1);
                                    toast.error(`نسبة إنجاز الدفعة (${val}%) غير مقبولة — يجب أن تكون أقل من نسبة الدفعة التالية بتاريخ ${nextDate} (${nextPaymentCompletion}%). تم ضبطها على (${maxVal}%).`);
                                    setFormData({ ...formData, completionPercentage: maxVal });
                                  }
                                }
                              }}
                              className={cn(
                                "text-right font-bold transition-all",
                                (isBelowPrev || isAboveNext)
                                  ? "border-2 border-destructive bg-destructive/5 text-destructive ring-2 ring-destructive/20"
                                  : ""
                              )}
                            />
                            {isBelowPrev && (
                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>غير مقبول: يجب أن تكون النسبة ({currentComp}%) أكبر من الدفعة بتاريخ {prevDate} ({prevPaymentCompletion}%). الحد الأدنى هو {minAllowed}%.</span>
                              </div>
                            )}
                            {isAboveNext && (
                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>غير مقبول: يجب أن تكون النسبة ({currentComp}%) أقل من الدفعة بتاريخ {nextDate} ({nextPaymentCompletion}%). الحد الأقصى هو {maxAllowed}%.</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
            
            {/* الموردون */}
            <Card className="text-right border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <CardTitle className="flex items-center gap-2 text-right text-base font-bold text-foreground">
                      <Building2 className="h-5 w-5 text-primary" />
                      معلومات المورد المستفيد
                    </CardTitle>
                    <CardDescription className="text-right">بيانات المستفيد من الدفعة</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-right pt-6 space-y-6">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 p-4 rounded-xl bg-muted/5 border border-border/40" dir="rtl">
                    {/* Row 1 */}
                    {/* اسم المورد */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground flex items-center gap-1.5">
                        اسم المورد <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={supplier.name}
                        onValueChange={(value) => handleSelectSupplier(supplier.id, value)}
                        disabled={formData.contractId > 0}
                      >
                        <SelectTrigger className="text-right bg-background border-border/60 rounded-xl w-full" dir="rtl">
                          <SelectValue placeholder="اسم المورد" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {allSuppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.name} className="text-right">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* الأعمال */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground">الأعمال</Label>
                      <Input
                        value={supplier.work}
                        onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                        placeholder="وصف الأعمال"
                        readOnly
                        className="bg-muted/50 border-border/40 text-right rounded-xl h-10"
                      />
                    </div>

                    {/* البنك */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground">البنك</Label>
                      <Input
                        value={supplier.bank}
                        onChange={(e) => updateSupplier(supplier.id, "bank", e.target.value)}
                        placeholder="اسم البنك"
                        readOnly
                        className="bg-muted/50 border-border/40 text-right rounded-xl h-10"
                      />
                    </div>

                    {/* Row 2 */}
                    {/* الآيبان */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground">الآيبان</Label>
                      <Input
                        value={supplier.iban}
                        onChange={(e) => updateSupplier(supplier.id, "iban", e.target.value)}
                        placeholder="SA..."
                        dir="ltr"
                        readOnly
                        className="bg-muted/50 border-border/40 text-right font-mono text-xs rounded-xl h-10"
                      />
                    </div>

                    {/* النسبة (%) */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground text-right block">النسبة (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={contractAmount ? Number(((supplier.amount / contractAmount) * 100).toFixed(2)) : ""}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value) || 0;
                          const calculatedAmount = contractAmount ? (contractAmount * pct) / 100 : 0;
                          updateSupplier(supplier.id, "amount", Number(calculatedAmount.toFixed(2)));
                        }}
                        placeholder="0"
                        className="text-right font-bold text-primary border-border/60 rounded-xl h-10 bg-background"
                      />
                    </div>

                    {/* المبلغ */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground text-right block">المبلغ *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={supplier.amount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSupplier(supplier.id, "amount", val);
                        }}
                        placeholder="0.00"
                        className="text-right font-bold text-foreground border-border/60 rounded-xl h-10 bg-background"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* نافذة مراجعة تقرير الإنجاز */}
      <Dialog open={showReportReviewDialog} onOpenChange={setShowReportReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">مراجعة تقرير الإنجاز المعتمد</DialogTitle>
            <DialogDescription className="text-right">
              {selectedReport?.reportNumber} - {selectedReport?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6 py-4 text-right">
              {/* المعلومات الأساسية */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ التقرير</p>
                  <p className="text-sm font-semibold">{new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">معد التقرير</p>
                  <p className="text-sm font-semibold">{selectedReport.createdByName}</p>
                </div>
              </div>
              
              <Separator />
              
              {/* نسب الإنجاز */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm">نسب الإنجاز</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{selectedReport.overallProgress}%</p>
                    <p className="text-xs text-muted-foreground">الإجمالي</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700">{selectedReport.plannedProgress}%</p>
                    <p className="text-xs text-blue-600">المخطط</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedReport.actualProgress}%</p>
                    <p className="text-xs text-green-600">الفعلي</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* ملخص الأعمال */}
              {!!selectedReport.workSummary && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm">الأعمال المنجزة</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedReport.workSummary as string}
                  </p>
                </div>
              )}
              
              {!!selectedReport.challenges && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm">التحديات والمعوقات</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedReport.challenges as string}
                  </p>
                </div>
              )}

              {/* المرفقات المرفوعة */}
              {!!selectedReport.photos && (() => {
                try {
                  let photosArr = selectedReport.photos;
                  while (typeof photosArr === 'string') {
                    photosArr = JSON.parse(photosArr);
                  }
                  
                  if (Array.isArray(photosArr) && photosArr.length > 0) {
                    return (
                      <div className="space-y-3">
                        <Separator />
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          مرفقات التقرير
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {photosArr.map((photo: string, index: number) => {
                            const isImage = photo.startsWith("data:image/") || photo.startsWith("http") && (photo.endsWith(".png") || photo.endsWith(".jpg") || photo.endsWith(".jpeg") || photo.endsWith(".webp"));
                            return (
                              <div key={index} className="border rounded-lg p-2 flex flex-col items-center justify-center bg-muted/20 relative group">
                                {isImage ? (
                                  <img src={photo} alt={`مرفق ${index + 1}`} className="w-full h-20 object-cover rounded-md mb-2" />
                                ) : (
                                  <div className="w-full h-20 flex items-center justify-center rounded-md bg-background border border-dashed mb-2 text-primary font-bold text-xs">
                                    مستند PDF
                                  </div>
                                )}
                                <a href={photo} download={`مرفق_${index + 1}`} className="text-[10px] text-primary font-semibold hover:underline">
                                  تحميل المرفق
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error(e);
                }
                return null;
              })()}
            </div>
          )}
          
          <DialogFooter className="text-right">
            <Button variant="outline" onClick={() => setShowReportReviewDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
