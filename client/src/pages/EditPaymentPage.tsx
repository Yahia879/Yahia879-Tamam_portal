import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText } from "@shared/tafqeet";

import DashboardLayout from "@/components/DashboardLayout";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowRight,
  Send,
  Plus,
  Trash2,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";



interface SupplierEntry {
  id: string;
  name: string;
  work: string;
  amount: number;
  iban: string;
  bank: string;
}

export default function EditPaymentPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const utils = trpc.useUtils();
  
  const paymentId = params.id || "";
  
  // بيانات النموذج
  const [formData, setFormData] = useState<{
    projectId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number | "";
    dateMiladi: string;
  }>({
    projectId: 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: "",
    dateMiladi: "",
  });
  
  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([]);

  // جلب تفاصيل الدفعة الموحدة الحالية
  const { data: payment, isLoading: isPaymentLoading } = trpc.projects.getUnifiedPayment.useQuery(
    { id: paymentId },
    { 
      enabled: !!paymentId,
      refetchOnWindowFocus: false,
    }
  );

  const isPaid = Boolean(payment?.isPaid || payment?.status === "paid" || Number(payment?.paidAmount || 0) > 0);
  
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
  
  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId },
    { enabled: formData.contractId > 0 }
  );

  // تعبئة البيانات الأساسية للدفعة
  useEffect(() => {
    if (payment) {
      const origComp = (payment.completionPercentage !== null && payment.completionPercentage !== undefined) ? Number(payment.completionPercentage) : null;
      setFormData({
        projectId: payment.projectId || 0,
        contractId: payment.contractId || 0,
        title: payment.title || "",
        description: payment.description || "",
        completionPercentage: origComp !== null ? origComp : "",
        dateMiladi: payment.dateMiladi || "",
      });
    }
  }, [payment]);

  // إدارة أصناف سدانة
  const [sedanaItems, setSedanaItems] = useState<any[]>([]);
  const [selectedContractItemName, setSelectedContractItemName] = useState<string>("");

  const isSedanaProgram = projectDetails?.programType === "sedana" || projectDetails?.request?.programType === "sedana";

  useEffect(() => {
    if (payment && Array.isArray((payment as any).items)) {
      setSedanaItems((payment as any).items);
    }
  }, [payment]);

  // الأصناف المتاحة من العقد أو جدول الكميات
  const availableContractItems = useMemo(() => {
    if (!isSedanaProgram) return [];
    const itemsMap: Record<string, { itemName: string; unit: string; unitPrice: number; maxQuantity: number }> = {};
    
    (projectDetails?.boq || []).forEach((b: any) => {
      const key = (b.itemDescription || b.itemName || "").trim();
      if (key && !itemsMap[key]) {
        itemsMap[key] = {
          itemName: key,
          unit: b.unit || "وحدة",
          unitPrice: Number(b.unitPrice || 0),
          maxQuantity: Number(b.quantity || 0),
        };
      }
    });

    if (contractDetails?.contract?.paymentScheduleJson) {
      try {
        const sched = typeof contractDetails.contract.paymentScheduleJson === "string" 
          ? JSON.parse(contractDetails.contract.paymentScheduleJson) 
          : contractDetails.contract.paymentScheduleJson;
        if (Array.isArray(sched)) {
          sched.forEach((s: any) => {
            (s.items || []).forEach((it: any) => {
              const key = (it.itemName || "").trim();
              if (key && !itemsMap[key]) {
                itemsMap[key] = {
                  itemName: key,
                  unit: it.unit || "وحدة",
                  unitPrice: Number(it.unitPrice || 0),
                  maxQuantity: Number(it.quantity || 0),
                };
              }
            });
          });
        }
      } catch (e) {}
    }

    return Object.values(itemsMap);
  }, [isSedanaProgram, projectDetails, contractDetails]);

  const handleAddSedanaItemFromContract = (itemName: string) => {
    const found = availableContractItems.find(it => it.itemName === itemName);
    if (!found) return;
    const existing = sedanaItems.find(it => it.itemName === itemName);
    if (existing) {
      toast.info("هذا الصنف مضاف بالفعل، يمكنك تعديل كميته");
      return;
    }
    setSedanaItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemName: found.itemName,
        unit: found.unit || "وحدة",
        quantity: 1,
        unitPrice: found.unitPrice || 0,
        totalPrice: found.unitPrice || 0,
      }
    ]);
    setSelectedContractItemName("");
  };

  const handleAddCustomSedanaItem = () => {
    setSedanaItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemName: "",
        unit: "وحدة",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      }
    ]);
  };

  const handleUpdateSedanaItem = (index: number, field: string, value: any) => {
    setSedanaItems(prev => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const q = field === "quantity" ? Number(value) : Number(item.quantity || 0);
        const p = field === "unitPrice" ? Number(value) : Number(item.unitPrice || 0);
        item.totalPrice = Math.round(q * p * 100) / 100;
      }
      next[index] = item;
      return next;
    });
  };

  const handleRemoveSedanaItem = (index: number) => {
    setSedanaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMatchAmountWithSedanaItems = () => {
    const sum = sedanaItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    if (sum > 0 && suppliers.length > 0) {
      setSuppliers(prev => prev.map((s, idx) => idx === 0 ? { ...s, amount: sum } : s));
      toast.success(`تم تحديث مبلغ الدفعة إلى ${sum.toLocaleString()} ريال بناءً على مجموع البنود`);
    }
  };
  
  // تحديث بيانات المورد من العقد أو تهيئة القائمة بالدفعة الحالية
  useEffect(() => {
    if (payment) {
      if (contractDetails) {
        const supplierFromContract: SupplierEntry = {
          id: crypto.randomUUID(),
          name: contractDetails.contract.secondPartyName || "",
          work: contractDetails.contract.contractTitle || "",
          amount: payment.amount,
          iban: contractDetails.contract.secondPartyIban || "",
          bank: contractDetails.contract.secondPartyBankName || "",
        };
        setSuppliers([supplierFromContract]);
      } else if (!formData.contractId) {
        // دفعات بدون عقد
        setSuppliers([
          { 
            id: crypto.randomUUID(), 
            name: "", 
            work: "", 
            amount: payment.amount, 
            iban: "", 
            bank: "" 
          }
        ]);
      }
    }
  }, [contractDetails, payment, formData.contractId]);
  
  // حساب الإجمالي
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  const getPaymentEffectiveAmount = (p: any): number => {
    const paidAmt = parseFloat(String(p.paidAmount || 0).replace(/,/g, ""));
    const isPaid = Boolean(p.isPaid || p.status === "paid" || p.status === "partially_paid" || p.status === "executed" || !!p.paidAt || paidAmt > 0);
    if (isPaid && paidAmt > 0) {
      return paidAmt;
    }
    const agreedAmt = parseFloat(String(p.agreedAmount !== undefined && p.agreedAmount !== null ? p.agreedAmount : (p.amount || 0)).replace(/,/g, ""));
    return isNaN(agreedAmt) ? 0 : agreedAmt;
  };

  const isCurrentPayment = (p: any): boolean => {
    if (p.id === paymentId) return true;
    if (paymentId.startsWith("cp-") && p.id === paymentId) return true;
    if (paymentId.startsWith("manual-") && p.id === paymentId) return true;
    if (paymentId.startsWith("disb-") && (p.id === paymentId || (payment?.contractPaymentId && p.id === `cp-${payment.contractPaymentId}`) || (payment?.paymentId && p.id === `manual-${payment.paymentId}`))) return true;
    if (payment?.contractPaymentId && (p.contractPaymentId === payment.contractPaymentId || p.id === `cp-${payment.contractPaymentId}`)) return true;
    return false;
  };

  // حساب المتبقي المتاح لهذه الدفعة (نستثني الدفعة الحالية من مجموع باقي الدفعات)
  const otherPaymentsSum = projectDetails?.payments
    ?.filter((p: any) => p.status !== "rejected" && p.status !== "cancelled" && !isCurrentPayment(p))
    ?.reduce((sum: number, p: any) => sum + getPaymentEffectiveAmount(p), 0) || 0;

  const totalContractsSum = projectDetails?.contracts?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0) || 0;
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0") || totalContractsSum;
  const remainingAmount = Math.max(0, contractAmount - otherPaymentsSum);

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
  
  // mutation لتحديث الدفعة
  const updateMutation = trpc.projects.updateUnifiedPayment.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدفعة بنجاح");
      utils.projects.invalidate();
      utils.contracts.invalidate();
      if (formData.projectId) {
        navigate(`/projects/${formData.projectId}`);
      } else {
        navigate("/disbursements");
      }
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // حساب تواريخ الحظر والحدود لتاريخ الدفعة عند التعديل
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

  const parsePaymentId = (idStr: any): { type: string; numId: number } => {
    if (!idStr) return { type: "", numId: 0 };
    const s = String(idStr).trim();
    if (s.startsWith("cp-")) return { type: "cp", numId: parseInt(s.replace("cp-", "")) || 0 };
    if (s.startsWith("disb-")) return { type: "disb", numId: parseInt(s.replace("disb-", "")) || 0 };
    if (s.startsWith("manual-")) return { type: "manual", numId: parseInt(s.replace("manual-", "")) || 0 };
    return { type: "raw", numId: parseInt(s) || 0 };
  };

  const targetParsed = parsePaymentId(paymentId);
  const allPayments = projectDetails?.payments || [];

  // استبعاد الدفعة الحالية من قائمة التواريخ المستخدمة
  const otherPayments = allPayments.filter((p: any) => {
    const pParsed = parsePaymentId(p.id);
    if (targetParsed.numId > 0 && pParsed.numId === targetParsed.numId) return false;
    return String(p.id) !== String(paymentId);
  });

  const usedPaymentDates = otherPayments
    .map((p: any) => formatDateToYYYYMMDD(p.date || p.dateMiladi || p.paidAt || p.createdAt))
    .filter((d: string | null): d is string => !!d);

  const isDateAlreadyUsed = (date: string) => {
    const norm = formatDateToYYYYMMDD(date);
    if (!norm) return false;
    return usedPaymentDates.includes(norm);
  };

  // حساب نسب الإنجاز بناءً على التاريخ المختار (مع استبعاد الدفعة الحالية)
  const allValidPayments = allPayments.filter((p: any) => {
    if (p.status === "rejected" || p.status === "cancelled") return false;
    if (p.completionPercentage === null || p.completionPercentage === undefined || isNaN(Number(p.completionPercentage))) return false;
    // استبعاد الدفعة الحالية
    const pParsed = parsePaymentId(p.id);
    if (targetParsed.numId > 0 && pParsed.numId === targetParsed.numId) return false;
    return String(p.id) !== String(paymentId);
  }).sort((a: any, b: any) => {
    const dateA = formatDateToYYYYMMDD(a.date || a.dateMiladi || a.paidAt || a.createdAt) || "";
    const dateB = formatDateToYYYYMMDD(b.date || b.dateMiladi || b.paidAt || b.createdAt) || "";
    const cmp = dateA.localeCompare(dateB);
    if (cmp !== 0) return cmp;
    return (a.phaseOrder ?? 999) - (b.phaseOrder ?? 999);
  });

  let prevPaymentCompletion: number | null = null;
  let nextPaymentCompletion: number | null = null;
  let prevPaymentRef: any = null;
  let nextPaymentRef: any = null;

  const normalizedSelectedDate = formatDateToYYYYMMDD(formData.dateMiladi);

  if (normalizedSelectedDate) {
    const selectedDate = normalizedSelectedDate;
    const beforePayments = allValidPayments.filter((p: any) => {
      const d = formatDateToYYYYMMDD(p.date || p.dateMiladi || p.paidAt || p.createdAt) || "";
      return d < selectedDate;
    });
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
    if (allValidPayments.length > 0) {
      prevPaymentRef = allValidPayments[allValidPayments.length - 1];
      prevPaymentCompletion = Number(prevPaymentRef.completionPercentage);
    }
  }

  // التحقق من وجود دفعة مكتملة بنسبة 100% ومنع إدراج أي دفعة بعدها
  const paymentWith100 = allValidPayments.find((p: any) => Number(p.completionPercentage) >= 100);
  const dateOf100 = paymentWith100 ? (formatDateToYYYYMMDD(paymentWith100.date || paymentWith100.dateMiladi || paymentWith100.paidAt || paymentWith100.createdAt) || "") : null;
  const isDateAfter100 = Boolean(dateOf100 && normalizedSelectedDate && normalizedSelectedDate > dateOf100);
  const isAfter100PercentPayment = (prevPaymentCompletion !== null && prevPaymentCompletion >= 100) || isDateAfter100;

  // حفظ التغييرات
  const handleSubmit = () => {
    if (isPaid) {
      toast.error("لا يمكن تعديل دفعة مسددة نهائياً");
      return;
    }
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
      toast.error(`لا يمكن تعديل الدفعة لتكون بعد تاريخ (${dateOf100 || prevPaymentRef?.date}) لأن نسبة الإنجاز بلغت 100% مسبقاً، ولا توجد نسبة إنجاز أعلى من 100%`);
      return;
    }
    if (!formData.title) {
      toast.error("يرجى إدخال عنوان طلب الصرف");
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

      if (totalAmount > remainingAmount + 0.05 || remainingAmount < 0) {
        toast.error(`المبلغ (${totalAmount.toLocaleString()} ريال) يتجاوز الإجمالي المتبقي المتاح لهذه الدفعة (${remainingAmount.toLocaleString()} ريال)`);
        return;
      }
    }
    
    updateMutation.mutate({
      id: paymentId,
      title: formData.title,
      description: formData.description,
      amount: totalAmount,
      dateMiladi: formData.dateMiladi,
      completionPercentage: Number(formData.completionPercentage),
      items: isSedanaProgram ? sedanaItems : undefined,
    });
  };
  
  if (isPaymentLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
              <h1 className="text-xl sm:text-2xl font-bold text-right text-foreground">تعديل الدفعة</h1>
              <p className="text-xs sm:text-sm text-muted-foreground text-right">تعديل تفاصيل طلب الصرف / الدفعة المحددة</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleSubmit} disabled={updateMutation.isPending || isPaid} className="w-full sm:w-auto shadow-sm">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
              حفظ التعديلات
            </Button>
          </div>
        </div>
        
        {isPaid && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: هذه الدفعة مسددة ومقفلة</AlertTitle>
            <AlertDescription>
              تم سداد هذه الدفعة (أو تم تنفيذ أوامر صرف عليها). لا يمكن تعديل بياناتها أو مبالغها نهائياً حفاظاً على السلامة المالية والمحاسبية.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Form Grid */}
        <div className="flex flex-col-reverse lg:flex-row gap-6" dir="ltr">
          {/* Sidebar */}
          <div className="w-full lg:w-1/3 space-y-6 text-right" dir="rtl">
            {/* ملخص الطلب */}
            <Card className="text-right">
              <CardHeader className="text-right">
                <CardTitle className="text-right">ملخص طلب الصرف</CardTitle>
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
                        <span className="text-muted-foreground font-medium">الحد الأقصى المتاح للدفعة:</span>
                        <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                          {remainingAmount.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
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
            <Card className="text-right border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-right text-base font-bold text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  بيانات طلب الصرف
                </CardTitle>
                <CardDescription className="text-right">معلومات أساسية عن طلب الصرف الحالي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 text-right">
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">التاريخ الميلادي *</Label>
                  <Input
                    type="date"
                    value={formData.dateMiladi}
                    disabled={isPaid}
                    onChange={(e) => {
                      if (isPaid) return;
                      const newDate = e.target.value;
                      const norm = formatDateToYYYYMMDD(newDate);
                      if (dateOf100 && norm && norm > dateOf100) {
                        toast.error(`لا يمكن اختيار تاريخ بعد الدفعة المكتملة بنسبة 100% (${dateOf100})`);
                      }
                      setFormData({ ...formData, dateMiladi: newDate });
                    }}
                    required
                    className={cn(
                      "text-right rounded-xl h-10 border-border/60",
                      (formData.dateMiladi && (isDateAlreadyUsed(formData.dateMiladi) || isAfter100PercentPayment)) && "border-2 border-destructive",
                      isPaid && "bg-muted cursor-not-allowed opacity-80"
                    )}
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
                      <span>لا يمكن تعديل الدفعة لتكون بعد تاريخ ({dateOf100 || prevPaymentRef?.date}) لأن الدفعة بلغت نسبة إنجازها 100%، ولا توجد نسبة إنجاز أعلى من 100%.</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">المشروع</Label>
                  <ProjectSearchSelect
                    projects={projects}
                    value={formData.projectId > 0 ? formData.projectId.toString() : ""}
                    onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value) || 0, contractId: 0 })}
                    disabled={true}
                    placeholder="اختر المشروع"
                  />
                </div>
                
                {formData.projectId > 0 && projectContracts && projectContracts.contracts && projectContracts.contracts.length > 0 && (
                  <div className="space-y-2 text-right">
                    <Label className="text-right font-semibold">العقد</Label>
                    <Select
                      value={formData.contractId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, contractId: parseInt(value) })}
                      disabled={true}
                    >
                      <SelectTrigger className="text-right bg-muted/30 border-border/40 rounded-xl h-10 w-full" dir="rtl">
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
                  <Label className="text-right font-semibold">عنوان طلب الصرف *</Label>
                  <Input
                    value={formData.title}
                    disabled={isPaid}
                    onChange={(e) => {
                      if (isPaid) return;
                      setFormData({ ...formData, title: e.target.value });
                    }}
                    placeholder="مثال: صرف الدفعة الأولى لمشروع ترميم مسجد..."
                    required
                    className={cn("text-right rounded-xl h-10 border-border/60", isPaid && "bg-muted cursor-not-allowed opacity-80")}
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">وصف الأعمال التي سوف تنفذ *</Label>
                  <Textarea
                    value={formData.description}
                    disabled={isPaid}
                    onChange={(e) => {
                      if (isPaid) return;
                      setFormData({ ...formData, description: e.target.value });
                    }}
                    placeholder="وصف تفصيلي للأعمال التي سوف تنفذ..."
                    rows={3}
                    required
                    className={cn("text-right rounded-xl border-border/60", isPaid && "bg-muted cursor-not-allowed opacity-80")}
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
                                  <p>📅 الدفعة السابقة ({prevDate}): نسبة إنجازها <strong>{prevPaymentCompletion}%</strong> ← يجب أن تكون النسبة الحالية أكبر من ذلك</p>
                                )}
                                {nextPaymentCompletion !== null && (
                                  <p>📅 الدفعة التالية ({nextDate}): نسبة إنجازها <strong>{nextPaymentCompletion}%</strong> ← يجب أن تكون النسبة الحالية أقل من ذلك</p>
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
                              disabled={!formData.dateMiladi || isPaid}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              onChange={(e) => {
                                if (isPaid) return;
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
                                if (isPaid) return;
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
                                "text-right rounded-xl h-10 font-bold transition-all",
                                (isBelowPrev || isAboveNext)
                                  ? "border-2 border-destructive bg-destructive/5 text-destructive ring-2 ring-destructive/20" 
                                  : "border-border/60",
                                isPaid && "bg-muted cursor-not-allowed opacity-80"
                              )}
                            />
                            {isBelowPrev && (
                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>غير مقبول: يجب أن تكون النسبة ({currentComp}%) أكبر من الدفعة بتاريخ ${prevDate} (${prevPaymentCompletion}%). الحد الأدنى هو {minAllowed}%.</span>
                              </div>
                            )}
                            {isAboveNext && (
                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>غير مقبول: يجب أن تكون النسبة ({currentComp}%) أقل من الدفعة بتاريخ ${nextDate} (${nextPaymentCompletion}%). الحد الأقصى هو {maxAllowed}%.</span>
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

            {/* بنود وأصناف التوريد - حصرياً لبرامج سدانة */}
            {isSedanaProgram && (
              <Card className="text-right border-emerald-500/30 bg-emerald-500/5 shadow-sm">
                <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 py-4 text-right">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-right">
                      <CardTitle className="flex items-center gap-2 text-right text-base font-bold text-emerald-950 dark:text-emerald-200">
                        <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        أصناف التوريد المرتبطة بهذه الدفعة (خاص بسدانة)
                      </CardTitle>
                      <CardDescription className="text-right text-xs text-emerald-800/80 dark:text-emerald-300/80">
                        حدد البنود والكميات التي سيقوم المورد بتوريدها في هذه الدفعة لربطها بأوامر الإدخال
                      </CardDescription>
                    </div>
                    {sedanaItems.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleMatchAmountWithSedanaItems}
                        className="text-xs bg-white dark:bg-card border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                      >
                        مطابقة مبلغ الدفعة مع مجموع البنود
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-right pt-5 space-y-4">
                  {/* أداة إضافة صنف من العقد */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-card rounded-xl border border-emerald-500/20">
                    <div className="flex-1 text-right">
                      <Select
                        value={selectedContractItemName}
                        onValueChange={(val) => {
                          setSelectedContractItemName(val);
                          handleAddSedanaItemFromContract(val);
                        }}
                      >
                        <SelectTrigger className="text-right bg-background border-border/60 rounded-xl h-9 text-xs" dir="rtl">
                          <SelectValue placeholder="اختر صنفاً من بنود العقد / جدول الكميات لإضافته..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {availableContractItems.length > 0 ? (
                            availableContractItems.map((it, i) => (
                              <SelectItem key={i} value={it.itemName} className="text-right text-xs">
                                {it.itemName} ({it.unit}) {it.unitPrice ? `- ${it.unitPrice.toLocaleString()} ر.س` : ""}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-xs text-muted-foreground text-center">لا توجد بنود مسجلة في العقد</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddCustomSedanaItem}
                      className="text-xs h-9"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إضافة بند مخصص
                    </Button>
                  </div>

                  {/* جدول البنود المضافة */}
                  {sedanaItems.length > 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 overflow-hidden bg-card">
                      <Table>
                        <TableHeader className="bg-emerald-500/10">
                          <TableRow>
                            <TableHead className="text-right font-bold text-xs py-2.5">اسم الصنف</TableHead>
                            <TableHead className="text-right font-bold text-xs py-2.5 w-24">الكمية</TableHead>
                            <TableHead className="text-right font-bold text-xs py-2.5 w-24">الوحدة</TableHead>
                            <TableHead className="text-right font-bold text-xs py-2.5 w-28">سعر الوحدة</TableHead>
                            <TableHead className="text-right font-bold text-xs py-2.5 w-28">الإجمالي</TableHead>
                            <TableHead className="text-center font-bold text-xs py-2.5 w-12">حذف</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sedanaItems.map((item, idx) => (
                            <TableRow key={item.id || idx}>
                              <TableCell className="p-2">
                                <Input
                                  value={item.itemName}
                                  onChange={(e) => handleUpdateSedanaItem(idx, "itemName", e.target.value)}
                                  placeholder="اسم الصنف..."
                                  className="h-8 text-xs text-right"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateSedanaItem(idx, "quantity", e.target.value)}
                                  className="h-8 text-xs font-sans text-right"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  value={item.unit}
                                  onChange={(e) => handleUpdateSedanaItem(idx, "unit", e.target.value)}
                                  placeholder="م² / حبة"
                                  className="h-8 text-xs text-right"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.unitPrice || 0}
                                  onChange={(e) => handleUpdateSedanaItem(idx, "unitPrice", e.target.value)}
                                  className="h-8 text-xs font-sans text-right"
                                />
                              </TableCell>
                              <TableCell className="p-2 font-bold text-xs font-sans text-foreground">
                                {Number(item.totalPrice || (Number(item.quantity || 0) * Number(item.unitPrice || 0))).toLocaleString()} ر.س
                              </TableCell>
                              <TableCell className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveSedanaItem(idx)}
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-3 bg-muted/20 border-t border-emerald-500/20 flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">إجمالي قيمة أصناف الدفعة:</span>
                        <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 font-sans">
                          {sedanaItems.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0).toLocaleString()} ر.س
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-emerald-500/30 rounded-xl">
                      <Package className="w-8 h-8 text-emerald-600/40 mx-auto mb-2" />
                      لم يتم ربط أي أصناف توريد بهذه الدفعة حتى الآن. يمكنك اختيار أصناف من القائمة أعلاه.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* الموردون المستفيدون */}
            <Card className="text-right border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <CardTitle className="flex items-center gap-2 text-right text-base font-bold text-foreground">
                      <Building2 className="h-5 w-5 text-primary" />
                      معلومات المورد المستفيد
                    </CardTitle>
                    <CardDescription className="text-right">بيانات المستفيد من الصرف</CardDescription>
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
                        disabled={formData.contractId > 0 || isPaid}
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
                        disabled={isPaid}
                        value={contractAmount ? Number(((supplier.amount / contractAmount) * 100).toFixed(2)) : ""}
                        onChange={(e) => {
                          if (isPaid) return;
                          const pct = parseFloat(e.target.value) || 0;
                          const calculatedAmount = contractAmount ? (contractAmount * pct) / 100 : 0;
                          updateSupplier(supplier.id, "amount", Number(calculatedAmount.toFixed(2)));
                        }}
                        placeholder="0"
                        className={cn("text-right font-bold text-primary border-border/60 rounded-xl h-10 bg-background", isPaid && "bg-muted cursor-not-allowed opacity-80")}
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
                        disabled={isPaid}
                        value={supplier.amount || ""}
                        onChange={(e) => {
                          if (isPaid) return;
                          const val = parseFloat(e.target.value) || 0;
                          updateSupplier(supplier.id, "amount", val);
                        }}
                        placeholder="0.00"
                        className={cn("text-right font-bold text-foreground border-border/60 rounded-xl h-10 bg-background", isPaid && "bg-muted cursor-not-allowed opacity-80")}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
