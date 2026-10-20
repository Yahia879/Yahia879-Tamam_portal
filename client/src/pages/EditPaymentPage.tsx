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
  AlertTriangle,
  CheckCircle,
  Loader2,
  Package,
  Lock,
  Percent,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
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
  const [showExceedingWarningDialog, setShowExceedingWarningDialog] = useState(false);
  const [exceedingReason, setExceedingReason] = useState("");

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

const isRequestClosed = Boolean(
    (projectDetails as any)?.isRequestClosed ||
    projectDetails?.request?.currentStage === "closed" ||
    (projectDetails as any)?.request?.status === "completed" ||
    (projectDetails as any)?.request?.closureStatus === "confirmed"
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

  // نسبة الإنجاز المعتمدة من تقرير الإنجاز أو بيانات المشروع
  const benchmarkActualProgress = Number(projectDetails?.completionPercentage || 0);
  const currentComp = formData.completionPercentage !== "" ? Number(formData.completionPercentage) : 0;
  const isExceedingProgress = benchmarkActualProgress > 0 && (currentComp > benchmarkActualProgress);

  // حساب مجموع مبالغ الدفعات السابقة لتحديد نسبة الإنجاز التراكمية تلقائياً
  const effectivePriorPaymentsSum = useMemo(() => {
    // 1. إذا كانت الدفعة من جدول دفعات العقد
    if (contractDetails?.contract?.paymentScheduleJson) {
      try {
        const s = typeof contractDetails.contract.paymentScheduleJson === "string" 
          ? JSON.parse(contractDetails.contract.paymentScheduleJson) 
          : contractDetails.contract.paymentScheduleJson;
        const list = Array.isArray(s) ? s : (Array.isArray(s?.schedule) ? s.schedule : []);
        const idx = list.findIndex((item: any, i: number) => {
          return item.id === paymentId || 
                 item.id === `cp-${payment?.contractPaymentId}` ||
                 (payment?.contractPaymentId && item.id === String(payment.contractPaymentId)) ||
                 ((payment as any)?.phaseOrder !== undefined && i === (payment as any).phaseOrder) ||
                 (payment?.title && item.name === payment.title);
        });
        if (idx > 0) {
          const sum = list.slice(0, idx).reduce((acc: number, it: any) => acc + (Number(it.amount) || 0), 0);
          if (sum > 0) return sum;
        }
      } catch (e) {}
    }

    // 2. حسب التاريخ الميلادي مقارنة بالدفعات السابقة
    if (normalizedSelectedDate) {
      const before = otherPayments.filter((p: any) => {
        if (p.status === "rejected" || p.status === "cancelled") return false;
        const d = formatDateToYYYYMMDD(p.date || p.dateMiladi || p.paidAt || p.createdAt) || "";
        return d < normalizedSelectedDate;
      });
      return before.reduce((sum: number, p: any) => sum + getPaymentEffectiveAmount(p), 0);
    }

    return 0;
  }, [contractDetails, payment, paymentId, normalizedSelectedDate, otherPayments]);

  // معالج تعديل مبلغ الدفعة وتحديث نسب الإنجاز التراكمية تلقائياً بناءً على المبلغ
  const handleAmountChange = (val: number) => {
    if (isPaid) return;
    const numVal = Math.max(0, isNaN(val) ? 0 : val);
    
    setSuppliers(prev => {
      if (prev.length === 0) {
        return [{ id: crypto.randomUUID(), name: "", work: "", amount: numVal, iban: "", bank: "" }];
      }
      return prev.map((s, idx) => idx === 0 ? { ...s, amount: numVal } : s);
    });

    if (contractAmount > 0) {
      const cumulativeAmt = effectivePriorPaymentsSum + numVal;
      const rawPct = (cumulativeAmt / contractAmount) * 100;
      const comp = Math.min(100, Math.max(0, Number(rawPct.toFixed(2))));
      const finalComp = comp % 1 === 0 ? Math.round(comp) : comp;
      setFormData(prev => ({ ...prev, completionPercentage: finalComp }));
    }
  };

  // معالج تعديل نسبة الدفعة وتحديث المبالغ ونسب الإنجاز التراكمية
  const handlePercentageChange = (pct: number) => {
    if (isPaid) return;
    const numPct = Math.max(0, Math.min(100, isNaN(pct) ? 0 : pct));
    const calculatedAmount = contractAmount > 0 ? Number(((contractAmount * numPct) / 100).toFixed(2)) : 0;

    setSuppliers(prev => {
      if (prev.length === 0) {
        return [{ id: crypto.randomUUID(), name: "", work: "", amount: calculatedAmount, iban: "", bank: "" }];
      }
      return prev.map((s, idx) => idx === 0 ? { ...s, amount: calculatedAmount } : s);
    });

    if (contractAmount > 0) {
      const cumulativeAmt = effectivePriorPaymentsSum + calculatedAmount;
      const rawPct = (cumulativeAmt / contractAmount) * 100;
      const comp = Math.min(100, Math.max(0, Number(rawPct.toFixed(2))));
      const finalComp = comp % 1 === 0 ? Math.round(comp) : comp;
      setFormData(prev => ({ ...prev, completionPercentage: finalComp }));
    }
  };

  // النسبة التراكمية المحسوبة تلقائياً لعرضها كإرشاد
  const autoCalculatedCompletion = useMemo(() => {
    if (contractAmount <= 0) return undefined;
    const cumulativeAmt = effectivePriorPaymentsSum + totalAmount;
    const rawPct = (cumulativeAmt / contractAmount) * 100;
    const comp = Math.min(100, Math.max(0, Number(rawPct.toFixed(2))));
    return comp % 1 === 0 ? Math.round(comp) : comp;
  }, [contractAmount, effectivePriorPaymentsSum, totalAmount]);

  // قيمة الدفعة الحالية كنسبة مئوية من قيمة العقد
  const currentPaymentPercentage = useMemo(() => {
    if (contractAmount <= 0) return 0;
    const p = Number(((totalAmount / contractAmount) * 100).toFixed(2));
    return p % 1 === 0 ? Math.round(p) : p;
  }, [contractAmount, totalAmount]);

  // تحديث بيانات المورد مع مزامنة المبلغ ونسب الإنجاز تلقائياً
  const updateSupplier = (id: string, field: keyof SupplierEntry, value: string | number) => {
    if (field === "amount") {
      handleAmountChange(Number(value));
    } else {
      setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s));
    }
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

  const executeUpdatePayment = (reasonOverride?: string) => {
    let finalDescription = formData.description || formData.title;
    if (reasonOverride && reasonOverride.trim()) {
      finalDescription += `\n[ملاحظة المستخلص: تم تأكيد تعديل دفعة تتجاوز نسبة الإنجاز المعتمدة (${benchmarkActualProgress}%): ${reasonOverride.trim()}]`;
    }

    updateMutation.mutate({
      id: paymentId,
      title: formData.title,
      description: finalDescription,
      amount: totalAmount,
      dateMiladi: formData.dateMiladi,
      completionPercentage: Number(formData.completionPercentage),
      items: isSedanaProgram ? sedanaItems : undefined,
    });
  };

  // حفظ التغييرات
  const handleSubmit = () => {
    if (isPaid) {
      toast.error("لا يمكن تعديل دفعة مسددة نهائياً");
      return;
    }
    if (isRequestClosed) {
      toast.error("لا يمكن تعديل الدفعة لأن الطلب المرتبط بالمشروع مغلق نهائياً");
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

    // تنبيه ذكي: إذا كان المستخلص أعلى من تقرير الإنجاز الفعلي
    if (isExceedingProgress) {
      setShowExceedingWarningDialog(true);
      return;
    }
    
    executeUpdatePayment();
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
            <Button onClick={handleSubmit} disabled={updateMutation.isPending || isPaid || isRequestClosed} className="w-full sm:w-auto shadow-sm">
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
        {isRequestClosed && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: الطلب المرتبط بالمشروع مغلق</AlertTitle>
            <AlertDescription>
              تم إغلاق الطلب المرتبط بهذا المشروع نهائياً. لا يمكن تعديل بيانات هذه الدفعة.
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
              <CardContent className="space-y-5 pt-6 text-right">
                {/* اختيار المشروع والعقد */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
                  <div className="space-y-1.5 text-right">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>المشروع</span>
                    </Label>
                    <ProjectSearchSelect
                      projects={projects}
                      value={formData.projectId > 0 ? formData.projectId.toString() : ""}
                      onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value) || 0, contractId: 0 })}
                      disabled={true}
                      placeholder="اختر المشروع"
                    />
                  </div>
                  
                  {formData.projectId > 0 && projectContracts && projectContracts.contracts && projectContracts.contracts.length > 0 && (
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>العقد</span>
                      </Label>
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
                </div>

                {/* شبكة حقول الدفعة الملونة بالألوان الهادئة المتناسقة */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* الحقل 1: قيمة الدفعة (مبلغ مالي) - أخضر هادئ */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                    isPaid
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : "bg-emerald-500/[0.03] border-emerald-500/20 dark:bg-emerald-950/15 dark:border-emerald-500/20"
                  )}>
                    <Label className={cn(
                      "text-xs font-semibold flex items-center gap-1.5",
                      isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                    )}>
                      <SaudiRiyal className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
                      <span>قيمة الدفعة (مبلغ مالي) *</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={totalAmount || ""}
                        disabled={isPaid}
                        required
                        className={cn(
                          "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all text-right",
                          isPaid
                            ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                            : "bg-background border-border/80 text-foreground focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/15 shadow-2xs"
                        )}
                        onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <SaudiRiyal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/60 dark:text-emerald-400/60 pointer-events-none" />
                    </div>
                  </div>

                  {/* الحقل 2: قيمة الدفعة (نسبة مئوية) - أزرق هادئ */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                    isPaid
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : "bg-blue-500/[0.03] border-blue-500/20 dark:bg-blue-950/15 dark:border-blue-500/20"
                  )}>
                    <Label className={cn(
                      "text-xs font-semibold flex items-center gap-1.5",
                      isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                    )}>
                      <Percent className="w-3.5 h-3.5 text-blue-600/80 dark:text-blue-400/80 shrink-0" />
                      <span>قيمة الدفعة (نسبة مئوية) *</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={currentPaymentPercentage || ""}
                        disabled={isPaid}
                        required
                        className={cn(
                          "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all text-right",
                          isPaid
                            ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                            : "bg-background border-border/80 text-foreground focus-visible:border-blue-500/40 focus-visible:ring-blue-500/15 shadow-2xs"
                        )}
                        onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600/60 dark:text-blue-400/60 font-bold text-xs pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  {/* الحقل 3: عنوان طلب الصرف - نيلي هادئ */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                    isPaid
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : "bg-indigo-500/[0.03] border-indigo-500/20 dark:bg-indigo-950/15 dark:border-indigo-500/20"
                  )}>
                    <Label className={cn(
                      "text-xs font-semibold flex items-center gap-1.5",
                      isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                    )}>
                      <FileText className="w-3.5 h-3.5 text-indigo-600/80 dark:text-indigo-400/80 shrink-0" />
                      <span>عنوان طلب الصرف *</span>
                    </Label>
                    <Input
                      value={formData.title}
                      disabled={isPaid}
                      required
                      className={cn(
                        "w-full rounded-xl font-medium transition-all text-right",
                        isPaid
                          ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                          : "bg-background border-border/80 text-foreground focus-visible:border-indigo-500/40 focus-visible:ring-indigo-500/15 shadow-2xs"
                      )}
                      onChange={(e) => {
                        if (isPaid) return;
                        setFormData({ ...formData, title: e.target.value });
                      }}
                      placeholder="مثال: صرف الدفعة الأولى لمشروع..."
                    />
                  </div>

                  {/* الحقل 4: التاريخ الميلادي - كهرماني هادئ */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                    isPaid
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : "bg-amber-500/[0.03] border-amber-500/20 dark:bg-amber-950/15 dark:border-amber-500/20"
                  )}>
                    <Label className={cn(
                      "text-xs font-semibold flex items-center gap-1.5",
                      isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                    )}>
                      <Calendar className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0" />
                      <span>التاريخ الميلادي *</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.dateMiladi}
                      disabled={isPaid}
                      required
                      className={cn(
                        "w-full rounded-xl font-sans text-sm transition-all text-right",
                        (formData.dateMiladi && (isDateAlreadyUsed(formData.dateMiladi) || isAfter100PercentPayment)) && "border-2 border-destructive",
                        isPaid
                          ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                          : "bg-background border-border/80 text-foreground focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15 shadow-2xs"
                      )}
                      onChange={(e) => {
                        if (isPaid) return;
                        const newDate = e.target.value;
                        const norm = formatDateToYYYYMMDD(newDate);
                        if (dateOf100 && norm && norm > dateOf100) {
                          toast.error(`لا يمكن اختيار تاريخ بعد الدفعة المكتملة بنسبة 100% (${dateOf100})`);
                        }
                        setFormData({ ...formData, dateMiladi: newDate });
                      }}
                    />
                  </div>

                  {/* الحقل 5: وصف الأعمال التي سوف تُنفّذ - تركوازي هادئ */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all space-y-2 md:col-span-2 lg:col-span-1",
                    isPaid
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : "bg-teal-500/[0.03] border-teal-500/20 dark:bg-teal-950/15 dark:border-teal-500/20"
                  )}>
                    <Label className={cn(
                      "text-xs font-semibold flex items-center gap-1.5",
                      isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                    )}>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600/80 dark:text-teal-400/80 shrink-0" />
                      <span>وصف الأعمال التي سوف تُنفّذ *</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      disabled={isPaid}
                      rows={2}
                      required
                      className={cn(
                        "w-full rounded-xl transition-all resize-none text-right text-xs",
                        isPaid
                          ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                          : "bg-background border-border/80 text-foreground focus-visible:border-teal-500/40 focus-visible:ring-teal-500/15 shadow-2xs"
                      )}
                      onChange={(e) => {
                        if (isPaid) return;
                        setFormData({ ...formData, description: e.target.value });
                      }}
                      placeholder="وصف تفصيلي للأعمال التي سوف تنفذ..."
                    />
                  </div>

                  {/* الحقل 6: نسبة الإنجاز التراكمية (%) - بنفسجي هادئ */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all space-y-2 md:col-span-2 lg:col-span-1",
                    isPaid
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : "bg-purple-500/[0.03] border-purple-500/20 dark:bg-purple-950/15 dark:border-purple-500/20"
                  )}>
                    <Label className={cn(
                      "text-xs font-semibold flex items-center justify-between gap-1.5",
                      isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                    )}>
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-600/80 dark:text-purple-400/80 shrink-0" />
                        <span>نسبة الإنجاز التراكمية (%) *</span>
                      </span>
                      {autoCalculatedCompletion !== undefined && (
                        <span className="text-[11px] text-purple-700 dark:text-purple-300 font-normal">
                          (محسوبة: {autoCalculatedCompletion}%)
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={formData.completionPercentage}
                        disabled={!formData.dateMiladi || isPaid}
                        required
                        className={cn(
                          "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all text-right",
                          isExceedingProgress
                            ? "border-amber-400 bg-amber-500/5 text-amber-900 ring-1 ring-amber-400/40"
                            : isPaid
                              ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                              : "bg-background border-border/80 text-foreground focus-visible:border-purple-500/40 focus-visible:ring-purple-500/15 shadow-2xs"
                        )}
                        onChange={(e) => {
                          if (isPaid) return;
                          if (e.target.value === "") {
                            setFormData({ ...formData, completionPercentage: "" });
                          } else {
                            const val = parseFloat(e.target.value);
                            setFormData({
                              ...formData,
                              completionPercentage: isNaN(val) ? "" : Math.min(100, Math.max(0, val))
                            });
                          }
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600/60 dark:text-purple-400/60 font-bold text-xs pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* التنبيهات والإرشادات المرتبطة بالتاريخ ونسب الإنجاز */}
                <div className="space-y-2 text-right pt-1">
                  {formData.dateMiladi && isDateAlreadyUsed(formData.dateMiladi) && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>هذا التاريخ مستخدم بالفعل لدفعة أخرى. يرجى اختيار تاريخ مختلف</span>
                    </div>
                  )}

                  {isAfter100PercentPayment && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2.5 rounded-lg border border-destructive/30 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>لا يمكن تعديل الدفعة لتكون بعد تاريخ ({dateOf100 || prevPaymentRef?.date}) لأن الدفعة بلغت نسبة إنجازها 100%، ولا توجد نسبة إنجاز أعلى من 100%.</span>
                    </div>
                  )}

                  {(() => {
                    const currentCompVal = formData.completionPercentage !== "" ? Number(formData.completionPercentage) : null;
                    const minAllowed = prevPaymentCompletion !== null ? prevPaymentCompletion + 1 : 0;
                    const maxAllowed = nextPaymentCompletion !== null ? Math.max(minAllowed, nextPaymentCompletion - 1) : 100;
                    const prevDate = prevPaymentRef ? (formatDateToYYYYMMDD(prevPaymentRef.date || prevPaymentRef.dateMiladi || prevPaymentRef.paidAt || prevPaymentRef.createdAt) || "") : "";
                    const nextDate = nextPaymentRef ? (formatDateToYYYYMMDD(nextPaymentRef.date || nextPaymentRef.dateMiladi || nextPaymentRef.paidAt || nextPaymentRef.createdAt) || "") : "";

                    return (
                      <>
                        {/* نطاق مسموح به */}
                        {formData.dateMiladi && !isAfter100PercentPayment && (prevPaymentCompletion !== null || nextPaymentCompletion !== null) && (
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
                        {benchmarkActualProgress > 0 && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              نسبة تقرير الإنجاز الفعلي المعتمدة للمشروع:
                            </span>
                            <span className="font-bold font-sans text-sm">{benchmarkActualProgress}%</span>
                          </div>
                        )}

                        {/* التنبيه الذكي عند تجاوز نسبة الإنجاز الفعلي */}
                        {isExceedingProgress && (
                          <div className="flex items-start gap-2 text-xs font-semibold bg-amber-500/10 text-amber-900 dark:text-amber-200 p-2.5 rounded-lg border border-amber-500/30 animate-in fade-in">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span>تنبيه: المستخلص الحالي ({currentCompVal}%) يتجاوز تقرير الإنجاز الفعلي المعتمد للمشروع ({benchmarkActualProgress}%).</span>
                              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-normal">
                                تطبيقاً لمرونة المستخلصات، يمكنك المتابعة وسيطلب منك النظام تأكيد الصرف الاستثنائي عند الإرسال.
                              </p>
                            </div>
                          </div>
                        )}

                        {prevPaymentCompletion !== null && currentCompVal !== null && currentCompVal <= prevPaymentCompletion && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/50">
                            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>ملاحظة: نسبة الإنجاز ({currentCompVal}%) أقل أو مساوية للدفعة السابقة ({prevPaymentCompletion}%). النظام يسمح بذلك لمرونة المستخلصات.</span>
                          </div>
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

                    {/* قيمة الدفعة (نسبة مئوية) */}
                    <div className={cn(
                      "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                      isPaid
                        ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                        : "bg-blue-500/[0.03] border-blue-500/20 dark:bg-blue-950/15 dark:border-blue-500/20"
                    )}>
                      <Label className={cn(
                        "text-xs font-semibold flex items-center gap-1.5",
                        isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                      )}>
                        <Percent className="w-3.5 h-3.5 text-blue-600/80 dark:text-blue-400/80 shrink-0" />
                        <span>قيمة الدفعة (نسبة مئوية) *</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={isPaid}
                          value={currentPaymentPercentage || ""}
                          onChange={(e) => {
                            if (isPaid) return;
                            const pct = parseFloat(e.target.value) || 0;
                            handlePercentageChange(pct);
                          }}
                          placeholder="0"
                          className={cn(
                            "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all text-right",
                            isPaid
                              ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                              : "bg-background border-border/80 text-foreground focus-visible:border-blue-500/40 focus-visible:ring-blue-500/15 shadow-2xs"
                          )}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600/60 dark:text-blue-400/60 font-bold text-xs pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    {/* قيمة الدفعة (مبلغ مالي) */}
                    <div className={cn(
                      "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                      isPaid
                        ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                        : "bg-emerald-500/[0.03] border-emerald-500/20 dark:bg-emerald-950/15 dark:border-emerald-500/20"
                    )}>
                      <Label className={cn(
                        "text-xs font-semibold flex items-center gap-1.5",
                        isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                      )}>
                        <SaudiRiyal className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
                        <span>قيمة الدفعة (مبلغ مالي) *</span>
                      </Label>
                      <div className="relative">
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
                            handleAmountChange(val);
                          }}
                          placeholder="0.00"
                          className={cn(
                            "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all text-right",
                            isPaid
                              ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                              : "bg-background border-border/80 text-foreground focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/15 shadow-2xs"
                          )}
                        />
                        <SaudiRiyal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/60 dark:text-emerald-400/60 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* نافذة التأكيد الذكية عند تجاوز المستخلص لتقرير الإنجاز الفعلي */}
      <Dialog open={showExceedingWarningDialog} onOpenChange={setShowExceedingWarningDialog}>
        <DialogContent className="max-w-md text-right font-sans" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>تأكيد تعديل مستخلص أعلى من تقرير الإنجاز</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
              التحقق من صحة صرف دفعة تتجاوز نسبة الإنجاز الفعلي المعتمدة للمشروع
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs text-right">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-2">
              <div className="flex justify-between items-center text-amber-900 dark:text-amber-200">
                <span className="font-medium">نسبة تقرير الإنجاز المعتمد للمشروع:</span>
                <span className="font-bold text-sm font-sans">{benchmarkActualProgress}%</span>
              </div>
              <div className="flex justify-between items-center text-amber-900 dark:text-amber-200">
                <span className="font-medium">نسبة هذا المستخلص / الدفعة:</span>
                <span className="font-bold text-sm text-primary font-sans">{currentComp}%</span>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              ترى الدفعة والمستخلص أعلى من تقرير الإنجاز الفعلي المسجل للمشروع. هل أنت متأكد من حفظ هذه التعديلات وصرف الدفعة للمقاول؟
            </p>

            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-foreground">
                سبب / مبرر الصرف الاستثنائي (اختياري):
              </Label>
              <Textarea
                placeholder="مثال: دفعة لشراء وتأمين مواد التشطيب بالموقع قبل بدء المرحلة..."
                value={exceedingReason}
                onChange={(e) => setExceedingReason(e.target.value)}
                className="text-xs min-h-[70px] bg-background text-right"
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse sm:justify-start gap-2 pt-2">
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              onClick={() => {
                setShowExceedingWarningDialog(false);
                executeUpdatePayment(exceedingReason);
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1.5" /> : null}
              نعم، تأكيد ومتابعة الصرف
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-xs font-semibold"
              onClick={() => setShowExceedingWarningDialog(false)}
            >
              مراجعة وتعديل القيمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
