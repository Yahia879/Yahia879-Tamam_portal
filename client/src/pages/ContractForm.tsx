import React, { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import {
  FileText,
  Building2,
  User,
  Calendar,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Heart,
  Package,
  Sparkles,
  Layers,
  Copy,
  Lock,
  Info,
  ArrowUpDown,
  CreditCard,
  FileSpreadsheet,
  Percent,
  TrendingUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// وحدات المدة
const DURATION_UNITS = [
  { value: "days", label: "يوم" },
  { value: "weeks", label: "أسبوع" },
  { value: "months", label: "شهر" },
  { value: "years", label: "سنة" },
];

function toHijriDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      calendar: 'islamic-umalqura',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    return `${year}/${month}/${day}`;
  } catch (e) {
    const gregorianYear = date.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    const hijriMonth = String(((date.getMonth() + 9) % 12) + 1).padStart(2, '0');
    const hijriDay = String(date.getDate()).padStart(2, '0');
    return `${hijriYear}/${hijriMonth}/${hijriDay}`;
  }
}

function formatHijriInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 0) return "";
  if (digits.length <= 4) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  } else {
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
  }
}

function HijriDateInput({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  const cleanVal = (value || "").replace(/[^0-9/]/g, "");
  const parts = cleanVal.split("/");
  const year = parts[0] || "";
  const month = parts[1] || "";
  const day = parts[2] || "";

  const updateParts = (newYear: string, newMonth: string, newDay: string) => {
    if (!newYear && !newMonth && !newDay) {
      onChange("");
      return;
    }
    onChange(`${newYear}/${newMonth}/${newDay}`);
  };

  return (
    <div className="relative flex items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-within:outline-hidden focus-within:ring-2 focus-within:ring-ring font-mono dir-ltr">
      <div className="flex items-center gap-1.5 flex-1">
        {/* السنة */}
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          placeholder="السنة"
          maxLength={4}
          value={year}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
            updateParts(val, month, day);
            if (val.length === 4) {
              monthRef.current?.focus();
            }
          }}
          className="w-12 text-center bg-transparent border-0 outline-hidden p-0 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
        <span className="text-muted-foreground font-bold select-none pointer-events-none text-base">/</span>

        {/* الشهر */}
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          placeholder="الشهر"
          maxLength={2}
          value={month}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 2);
            updateParts(year, val, day);
            if (val.length === 2) {
              dayRef.current?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !month) {
              yearRef.current?.focus();
            }
          }}
          className="w-9 text-center bg-transparent border-0 outline-hidden p-0 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
        <span className="text-muted-foreground font-bold select-none pointer-events-none text-base">/</span>

        {/* اليوم */}
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          placeholder="اليوم"
          maxLength={2}
          value={day}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 2);
            updateParts(year, month, val);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !day) {
              monthRef.current?.focus();
            }
          }}
          className="w-9 text-center bg-transparent border-0 outline-hidden p-0 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
      </div>

      {/* الرمز الهجري الثابت */}
      <span className="text-sm font-bold text-muted-foreground select-none pointer-events-none shrink-0 pr-1">
        هـ
      </span>
    </div>
  );
}



// أنواع الدفعات
const PAYMENT_TYPES = [
  { value: "advance", label: "دفعة مقدمة" },
  { value: "progress", label: "دفعة تقدم" },
  { value: "milestone", label: "دفعة إنجاز" },
  { value: "final", label: "دفعة نهائية" },
];

export interface PaymentScheduleContractItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
}

interface PaymentScheduleItem {
  id: string;
  name: string;
  type: string;
  percentage: number;
  amount: number;
  dueDate: string;
  description: string;
  completionPercentage?: number;
  items?: PaymentScheduleContractItem[];
  isPaid?: boolean;
  status?: string;
  agreedAmount?: number;
  paidAmount?: number;
  isPartiallyPaid?: boolean;
}

interface ClauseValue {
  clauseId: number;
  title: string;
  titleAr: string;
  content: string;
  customContent: string;
  isIncluded: boolean;
  isEditable: boolean;
  isRequired: boolean;
  orderIndex: number;
}

export default function ContractForm() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const params = useParams();
  const search = useSearch();
  
  // قراءة المعاملات من query parameters
  const searchParams = new URLSearchParams(search || '');
  const requestIdFromQuery = searchParams.get('requestId');
  const projectIdFromQuery = searchParams.get('projectId');
  const supplierIdFromQuery = searchParams.get('supplierId') ? parseInt(searchParams.get('supplierId')!) : null;
  const quotationIdFromQuery = searchParams.get('quotationId') ? parseInt(searchParams.get('quotationId')!) : null;
  const amountFromQuery = searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : null;
  
  // كشف وضع التعديل من المسار أو المسودة المنشأة حديثاً
  const [createdDraftId, setCreatedDraftId] = useState<number | null>(null);
  const isEditMode = window.location.pathname.includes('/edit') || !!createdDraftId;
  const editContractId = (window.location.pathname.includes('/edit') && params.id) ? parseInt(params.id) : (createdDraftId || undefined);
  
  const requestId = requestIdFromQuery ? parseInt(requestIdFromQuery) : 
                   (params.requestId ? parseInt(params.requestId) : undefined);
  
  const projectId = projectIdFromQuery ? parseInt(projectIdFromQuery) :
                   (params.projectId ? parseInt(params.projectId) : undefined);
                   
  const [effectiveRequestId, setEffectiveRequestId] = useState<number | null>(requestId || null);
  
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const loadedDraftStateRef = useRef<string | null>(null);
  const hasInitializedFinancialsRef = useRef(false);

  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set());
  const [editDataLoaded, setEditDataLoaded] = useState(false);

  // بيانات العقد
  const [contractData, setContractData] = useState({
    // القالب والمشروع
    templateId: null as number | null,
    projectId: projectId || null as number | null,
    requestId: requestId || null as number | null,
    
    // مفوض التوقيع
    signatoryId: null as number | null,
    
    // المورد (الطرف الثاني)
    supplierId: supplierIdFromQuery || null as number | null,
    
    // تفاصيل العقد
    subject: "",
    description: "",
    
    // المدة
    duration: 0,
    durationUnit: "months" as string,
    startDate: "",
    startDateHijri: "",
    
    // القيمة المالية
    totalValue: 0,
    managementPercentage: 0, // نسبة الإشراف/الإدارة
    managementAmount: 0, // قيمة الجمعية / الأجور الإدارية بالريال
    managementFeeType: "percentage" as "percentage" | "fixed",
    baseValue: 0, // القيمة الأساسية قبل النسبة
    
    // ملاحظات
    notes: "",

    // بيانات الدعم والتمويل
    supportingEntity: "",
    customSupportingEntity: "",
    supportType: "full",
    supportedAmount: 0,
  });

  const totalProjectCost = contractData.totalValue;

  // بنود العقد
  const [clauseValues, setClauseValues] = useState<ClauseValue[]>([]);
  const [selectedTemplateChanged, setSelectedTemplateChanged] = useState(false);
  
  // جدول الدفعات ونظام الصرف
  const [paymentSystem, setPaymentSystem] = useState<"installments" | "milestones" | "">("");
  const [hasFinalPayment, setHasFinalPayment] = useState<boolean>(false);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [expandedGuidanceMap, setExpandedGuidanceMap] = useState<Record<string, boolean>>({});

  // دالة مساعدة لترتيب الدفعات حسب التاريخ
  const sortPaymentsByDate = (payments: PaymentScheduleItem[]): PaymentScheduleItem[] => {
    return [...payments].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      const compA = a.completionPercentage !== undefined && a.completionPercentage !== null ? Number(a.completionPercentage) : Infinity;
      const compB = b.completionPercentage !== undefined && b.completionPercentage !== null ? Number(b.completionPercentage) : Infinity;
      return compA - compB;
    });
  };

  // دالة مساعدة لحساب المبلغ الفعلي المعتمد للدفعة في إجمالي الجدول
  // الدفعات المسددة كلياً أو جزئياً تعتمد المبلغ المسدد، والدفعات الأخرى غير المسددة تعتمد مبلغ الدفعة
  const getPaymentEffectiveAmount = (p: PaymentScheduleItem): number => {
    const paidAmt = Number(p.paidAmount || 0);
    const isPaid = Boolean(p.isPaid || p.status === "paid" || p.status === "partially_paid" || paidAmt > 0);
    if (isPaid && paidAmt > 0) {
      return paidAmt;
    }
    return Number(p.amount || 0);
  };

  // دالة مساعدة لضبط مسميات الدفعات وضمان أن الدفعة الختامية هي فقط الدفعة الأخيرة دائماً
  const normalizePaymentNames = (schedule: PaymentScheduleItem[], closingMode: boolean): PaymentScheduleItem[] => {
    if (!closingMode || schedule.length < 2) {
      return schedule.map((p, idx) => {
        if (p.name === "الدفعة الختامية") {
          return { ...p, name: `الدفعة ${idx + 1}` };
        }
        return p;
      });
    }
    const lastIdx = schedule.length - 1;
    return schedule.map((p, idx) => {
      if (idx === lastIdx) {
        if (!p.name || p.name.trim() === "" || /^الدفعة \d+$/.test(p.name)) {
          return { ...p, name: "الدفعة الختامية" };
        }
      } else {
        if (p.name === "الدفعة الختامية") {
          return { ...p, name: `الدفعة ${idx + 1}` };
        }
      }
      return p;
    });
  };

  // دالة مساعدة لإعادة حساب نسب الإنجاز التراكمية ونسب الدفعات بناءً على مبالغ الدفعات وقيمة العقد الإجمالية
  // ملاحظة: في حال وجود دفعة ختامية، فإن قيمتها ليست ضمن قيمة المشروع بل إضافية، وتُحسب نسب الإنجاز التراكمية على دفعات الأعمال فقط لتصل 100% في الدفعة قبل الأخيرة
  const recalculateScheduleWithCumulativeCompletion = (
    schedule: PaymentScheduleItem[],
    totalVal: number = contractData.totalValue || 0,
    withFinalPayment: boolean = hasFinalPayment
  ): PaymentScheduleItem[] => {
    let runningCumulative = 0;
    const isClosingFinalMode = withFinalPayment && schedule.length >= 2;
    const penultimateIdx = schedule.length - 2;
    const finalIdx = schedule.length - 1;

    const normalizedSchedule = normalizePaymentNames(schedule, isClosingFinalMode);

    // حساب مجموع مبالغ دفعات الأعمال السابقة للدفعة قبل الأخيرة
    let priorWorksSum = 0;
    if (isClosingFinalMode) {
      for (let i = 0; i < penultimateIdx; i++) {
        const item = normalizedSchedule[i];
        const isItemPaid = Boolean(item.isPaid || item.status === "paid" || (Number(item.paidAmount || 0) > 0));
        const amt = isItemPaid && Number(item.paidAmount || 0) > 0 ? Number(item.paidAmount) : (Number(item.amount) || 0);
        priorWorksSum += amt;
      }
    }

    return normalizedSchedule.map((p, idx) => {
      const isPaid = Boolean(p.isPaid || p.status === "paid" || (Number(p.paidAmount || 0) > 0));
      const isFinalClosing = isClosingFinalMode && idx === finalIdx;
      const isPenultimateClosing = isClosingFinalMode && idx === penultimateIdx;

      let pAmt = Number(p.amount) || 0;
      // الدفعة قبل الأخيرة دائماً تكفي باقي المبلغ تلقائياً لتصل إلى 100%
      if (isPenultimateClosing && !isPaid) {
        pAmt = Math.max(0, Number((totalVal - priorWorksSum).toFixed(2)));
      }

      const effectiveAmt = isPaid && Number(p.paidAmount || 0) > 0 ? Number(p.paidAmount) : pAmt;

      // الدفعة الختامية ليست ضمن قيمة المشروع، لذلك لا تُجمع في تراكمي أعمال المشروع
      if (!isFinalClosing) {
        runningCumulative += effectiveAmt;
      }

      const pct = totalVal > 0 ? Number(((effectiveAmt / totalVal) * 100).toFixed(2)) : (p.percentage || 0);

      let comp: number | undefined = p.completionPercentage;
      if (isFinalClosing) {
        // الدفعة الأخيرة ختامية وغير مرتبطة بنسبة إنجاز
        comp = undefined;
      } else if (isPenultimateClosing) {
        // شرط أن تصل الدفعة قبل الأخيرة إلى 100%
        comp = 100;
      } else if (totalVal > 0) {
        if (effectiveAmt > 0 || (idx === 0 && p.completionPercentage === 0)) {
          const rawPct = (runningCumulative / totalVal) * 100;
          const targetLastWorkIdx = isClosingFinalMode ? penultimateIdx : finalIdx;
          if (idx === targetLastWorkIdx || runningCumulative >= totalVal - 0.05) {
            comp = 100;
          } else {
            const rounded = Number(rawPct.toFixed(2));
            comp = Math.min(99.99, Math.max(0, rounded));
          }
        } else if (effectiveAmt === 0 && !isPaid) {
          comp = undefined;
        }
      }

      return {
        ...p,
        amount: isPenultimateClosing && !isPaid ? pAmt : p.amount,
        percentage: pct,
        completionPercentage: comp,
      };
    });
  };

  // معالج تفعيل أو تعطيل خيار الدفعة الختامية
  const handleToggleFinalPayment = (enabled: boolean) => {
    setHasFinalPayment(enabled);
    setPaymentSchedule(prev => recalculateScheduleWithCumulativeCompletion(prev, contractData.totalValue, enabled));
    toast.success(
      enabled
        ? "تم تفعيل خيار الدفعة الختامية (تطبيق شرط 100% إنجاز على الدفعة قبل الأخيرة)"
        : "تم إيقاف خيار الدفعة الختامية (تطبيق شرط 100% إنجاز على الدفعة الأخيرة)"
    );
  };

  // معالج تعديل مبلغ الدفعة وتحديث نسب الإنجاز التراكمية تلقائياً
  const handlePaymentAmountChange = (paymentId: string, val: number) => {
    const totalVal = contractData.totalValue || 0;
    setPaymentSchedule(prev => {
      const updated = prev.map(p => {
        if (p.id === paymentId) {
          return { ...p, amount: val };
        }
        return p;
      });
      return recalculateScheduleWithCumulativeCompletion(updated, totalVal, hasFinalPayment);
    });
  };

  // معالج تعديل نسبة الدفعة وتحديث المبالغ ونسب الإنجاز التراكمية
  const handlePaymentPercentageChange = (paymentId: string, pct: number) => {
    const totalVal = contractData.totalValue || 0;
    const amount = totalVal ? (totalVal * pct) / 100 : 0;
    setPaymentSchedule(prev => {
      const updated = prev.map(p => {
        if (p.id === paymentId) {
          return { ...p, percentage: pct, amount: Number(amount.toFixed(2)) };
        }
        return p;
      });
      return recalculateScheduleWithCumulativeCompletion(updated, totalVal, hasFinalPayment);
    });
  };

  // معالج تعديل نسبة الإنجاز للدفعة ومزامنة المبالغ ونسب الإنجاز اللاحقة
  const handlePaymentCompletionPercentageChange = (paymentId: string, compVal: number | undefined) => {
    if (compVal === undefined || isNaN(compVal)) {
      setPaymentSchedule(prev => prev.map(p => p.id === paymentId ? { ...p, completionPercentage: undefined } : p));
      return;
    }
    const val = Math.min(100, Math.max(0, compVal));
    const totalVal = contractData.totalValue || 0;

    setPaymentSchedule(prev => {
      const targetIndex = prev.findIndex(p => p.id === paymentId);
      if (targetIndex === -1) return prev;

      // الدفعة الختامية غير مرتبطة بنسبة إنجاز
      if (hasFinalPayment && prev.length >= 2 && targetIndex === prev.length - 1) {
        return prev;
      }

      if (totalVal > 0) {
        let prevCumulative = 0;
        for (let i = 0; i < targetIndex; i++) {
          prevCumulative += getPaymentEffectiveAmount(prev[i]);
        }

        const prevComp = (prevCumulative / totalVal) * 100;
        if (val <= prevComp) {
          return prev.map((p, idx) => idx === targetIndex ? { ...p, completionPercentage: val } : p);
        }
        const targetCumulative = (val / 100) * totalVal;
        const incrementalAmt = Math.max(0, targetCumulative - prevCumulative);
        const incrementalPct = Number(((incrementalAmt / totalVal) * 100).toFixed(2));

        const updated = prev.map((p, idx) => {
          if (idx === targetIndex) {
            return {
              ...p,
              amount: Number(incrementalAmt.toFixed(2)),
              percentage: incrementalPct,
              completionPercentage: val,
            };
          }
          return p;
        });
        return recalculateScheduleWithCumulativeCompletion(updated, totalVal, hasFinalPayment);
      } else {
        return prev.map((p, idx) => idx === targetIndex ? { ...p, completionPercentage: val } : p);
      }
    });
  };

  // البنود المخصصة
  const [customClauses, setCustomClauses] = useState<{title: string; description: string}[]>([]);

  // مصادر الدعم والتمويل
  const [supportSources, setSupportSources] = useState<{ entity: string; customEntity?: string; amount: number }[]>([
    { entity: "", customEntity: "", amount: 0 }
  ]);

  const addSupportSource = () => {
    setSupportSources(prev => [...prev, { entity: "", customEntity: "", amount: 0 }]);
  };

  const removeSupportSource = (index: number) => {
    setSupportSources(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [{ entity: "", customEntity: "", amount: 0 }];
    });
  };

  const updateSupportSource = (index: number, updates: Partial<{ entity: string; customEntity: string; amount: number }>) => {
    setSupportSources(prev => prev.map((src, i) => i === index ? { ...src, ...updates } : src));
  };

  // جلب الفئات لاستخراج الجهات الداعمة
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });
  const fundingSupportCategories = (allCategories || []).filter((cat: any) => cat.type === "funding_support" && cat.isActive !== false);

  // جلب قوالب العقود
  const { data: templatesData, isLoading: templatesLoading } = trpc.contracts.getTemplates.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب بنود القالب المختار
  const { data: templateClauses, isLoading: clausesLoading } = trpc.contracts.getTemplateClauses.useQuery(
    { templateId: contractData.templateId! },
    { enabled: !!contractData.templateId }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.contracts.getOrganizationSettings.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب قائمة المفوضين
  const { data: signatoriesData } = trpc.organization.getSignatories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب جميع الموردين النشطين
  const { data: suppliersList = [] } = trpc.contracts.getSuppliers.useQuery();

  // جلب المشروع إذا تم تمرير معرفه أو في وضع التعديل للحصول على بيانات المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: (projectId || contractData.projectId)! },
    { enabled: !!projectId || (isEditMode && !!contractData.projectId) }
  );

  // تحديث معرف الطلب الفعلي عند تحميل تفاصيل المشروع
  useEffect(() => {
    if (projectDetails?.requestId && !effectiveRequestId) {
      setEffectiveRequestId(projectDetails.requestId);
      setContractData(prev => ({
        ...prev,
        requestId: projectDetails.requestId,
      }));
    }
  }, [projectDetails, effectiveRequestId]);

  // جلب العرض المعتمد للطلب (إن وجد)
  const { data: approvedQuotation } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId: effectiveRequestId! },
    { enabled: !!effectiveRequestId }
  );

  // جلب كافة العقود المسجلة لهذا الطلب
  const { data: requestContractsList = [] } = trpc.contracts.getAllByRequestId.useQuery(
    { requestId: effectiveRequestId! },
    { enabled: !!effectiveRequestId }
  );

  // جلب تفاصيل الطلب للحصول على المشروع المرتبط وبيانات التخصيص
  const { data: requestDetails, isLoading: isLoadingRequest } = trpc.requests.getById.useQuery(
    { id: effectiveRequestId! },
    { enabled: !!effectiveRequestId }
  );

  // استخراج كافة عروض الأسعار المعتمدة للطلب في الأصل
  const rawApprovedQuotations = useMemo(() => {
    return Array.isArray((approvedQuotation as any)?.quotations)
      ? (approvedQuotation as any).quotations.filter((q: any) => q.status === "accepted" || q.status === "approved")
      : [];
  }, [approvedQuotation]);

  // استخراج بيانات التخصيص من جدول تأمين سدانة إن وجدت
  const sedanaProcurementData = useMemo(() => {
    let pData = (requestDetails as any)?.programData;
    if (typeof pData === "string") {
      try {
        pData = JSON.parse(pData);
      } catch {
        pData = {};
      }
    }
    return pData?.sedanaProcurement || null;
  }, [requestDetails]);

  // التحقق مما إذا كان طلب سدانة لم ينتقل بعد إلى مرحلة التشغيل والتنفيذ
  const isSedanaNotReadyForContract = useMemo(() => {
    if (!requestDetails || (requestDetails as any).programType !== 'sedana') return false;
    const currentStage = (requestDetails as any).currentStage;
    return !['execution', 'handover', 'closed'].includes(currentStage);
  }, [requestDetails]);

  // فلترة عروض الأسعار المعتمدة بحيث تشمل فقط الموردين المحددين لمسار "العقد" في جدول التأمين
  const allApprovedQuotations = useMemo(() => {
    if (!sedanaProcurementData) {
      return rawApprovedQuotations;
    }

    const suppliersAlloc = sedanaProcurementData.suppliersAllocation || {};
    const itemsAlloc = sedanaProcurementData.itemsAllocation || {};
    const hasSupplierAlloc = Object.keys(suppliersAlloc).length > 0;
    const hasItemAlloc = Object.keys(itemsAlloc).length > 0;

    if (!hasSupplierAlloc && !hasItemAlloc) {
      return rawApprovedQuotations;
    }

    return rawApprovedQuotations.filter((q: any) => {
      // 1. فحص التخصيص المباشر للمورد أو عرض السعر في suppliersAllocation
      const keysToCheck = [
        `quo_${q.id}`,
        String(q.id),
        `quo_${q.quotationNumber}`,
        `sup_${q.supplierId}`,
        String(q.supplierId),
      ];

      for (const k of keysToCheck) {
        if (suppliersAlloc[k] !== undefined) {
          return suppliersAlloc[k] === "contract";
        }
      }

      // فحص حسب اسم المورد إن وجد في مفاتيح التخصيص
      if (q.supplierName) {
        for (const [sKey, method] of Object.entries(suppliersAlloc)) {
          if (sKey === `award_${q.supplierName}` || sKey.includes(q.supplierName)) {
            return method === "contract";
          }
        }
      }

      // 2. فحص تخصيص بنود عرض السعر في itemsAllocation
      if (hasItemAlloc) {
        let qItems: any[] = [];
        if (Array.isArray(q.items)) qItems = q.items;
        else if (typeof q.items === "string") {
          try { qItems = JSON.parse(q.items); } catch {}
        }

        if (qItems.length > 0) {
          const hasContractItem = qItems.some((it: any) => {
            const itId = String(it.boqItemId ?? it.boq_item_id ?? it.itemId ?? it.id);
            return itemsAlloc[itId] === "contract";
          });
          const hasOtherItem = qItems.some((it: any) => {
            const itId = String(it.boqItemId ?? it.boq_item_id ?? it.itemId ?? it.id);
            return itemsAlloc[itId] === "purchase_order" || itemsAlloc[itId] === "csr_letter";
          });
          if (hasContractItem) return true;
          if (hasOtherItem) return false;
        }
      }

      return true;
    });
  }, [rawApprovedQuotations, sedanaProcurementData]);

  const isMultiVendorSedana = rawApprovedQuotations.length > 1;

  // تحديد معرف المشروع المرتبط للحصول على التفاصيل المالية للأجور الإدارية
  const targetProjectId = contractData.projectId || projectDetails?.id || requestDetails?.project?.id;

  // جلب التفاصيل المالية للمشروع (الأجور الإدارية / قيمة الجمعية)
  const { data: projectFinancials } = trpc.projects.getFinancialData.useQuery(
    { projectId: targetProjectId! },
    { enabled: !!targetProjectId }
  );

  // جلب تفاصيل جدول الكميات للطلب
  const { data: boqResult } = trpc.projects.getBOQ.useQuery(
    { requestId: effectiveRequestId! },
    { enabled: !!effectiveRequestId && effectiveRequestId > 0 }
  );

  // تحديد ما إذا كان العقد يخص برنامج سدانة حصراً
  const isSedanaProgram = useMemo(() => {
    if (requestDetails?.programType === "sedana") return true;
    if (projectDetails?.programType === "sedana") return true;
    const pData = (requestDetails as any)?.programData;
    if (pData) {
      if (typeof pData === "string") {
        return pData.includes("sedana") || pData.includes("sedanaProcurement") || pData.includes("basketItems");
      }
      if (typeof pData === "object") {
        return Boolean(pData.isSedana || pData.sedanaProcurement || pData.basketItems);
      }
    }
    return false;
  }, [requestDetails, projectDetails]);

  // استخراج البنود والأصناف المتاحة للتعاقد في برنامج سدانة
  const availableContractItems = useMemo(() => {
    if (!isSedanaProgram) return [];

    const itemsMap = new Map<string, {
      id: string;
      itemName: string;
      unit: string;
      totalQuantity: number;
      unitPrice: number;
      totalPrice: number;
      description?: string;
    }>();

    // 1. من عرض السعر المعتمد للمورد المحدد
    const currentQuotation = (allApprovedQuotations || []).find((q: any) => q.supplierId === contractData.supplierId)
      || (rawApprovedQuotations || []).find((q: any) => q.supplierId === contractData.supplierId)
      || (allApprovedQuotations || [])[0];

    if (currentQuotation?.items) {
      let qItems: any[] = [];
      if (Array.isArray(currentQuotation.items)) qItems = currentQuotation.items;
      else if (typeof currentQuotation.items === "string") {
        try { qItems = JSON.parse(currentQuotation.items); } catch {}
      }

      qItems.forEach((it: any, idx: number) => {
        const id = String(it.boqItemId || it.itemId || it.id || `q_${idx + 1}`);
        const name = it.itemName || it.item_name || it.name || `بند ${idx + 1}`;
        const qty = parseFloat(it.quantity || "1");
        const price = parseFloat(it.unitPrice || it.unit_price || "0");
        itemsMap.set(id, {
          id,
          itemName: name,
          unit: it.unit || "وحدة",
          totalQuantity: qty,
          unitPrice: price,
          totalPrice: it.totalPrice ? parseFloat(it.totalPrice) : qty * price,
          description: it.description || "",
        });
      });
    }

    // 2. من جدول الكميات (BOQ) إذا لم تكن بنود عرض السعر كافية
    if (itemsMap.size === 0 && boqResult?.items && boqResult.items.length > 0) {
      const itemsAlloc = sedanaProcurementData?.itemsAllocation || {};
      const itemSuppMap = sedanaProcurementData?.itemSupplierMap || {};

      boqResult.items.forEach((b: any, idx: number) => {
        const bId = String(b.id);
        const isForContract = !itemsAlloc[bId] || itemsAlloc[bId] === "contract";
        const isForThisSupplier = !contractData.supplierId || !itemSuppMap[bId]?.supplierId || itemSuppMap[bId].supplierId === contractData.supplierId;

        if (isForContract && isForThisSupplier) {
          const qty = parseFloat(b.quantity || "1");
          const price = parseFloat(b.unitPrice || "0");
          itemsMap.set(bId, {
            id: bId,
            itemName: b.itemName || `صنف ${idx + 1}`,
            unit: b.unit || "وحدة",
            totalQuantity: qty,
            unitPrice: price,
            totalPrice: b.totalPrice ? parseFloat(b.totalPrice) : qty * price,
            description: b.itemDescription || "",
          });
        }
      });
    }

    // 3. من سلة الاحتياج (basketItems)
    if (itemsMap.size === 0) {
      let pData = (requestDetails as any)?.programData;
      if (typeof pData === "string") {
        try { pData = JSON.parse(pData); } catch { pData = {}; }
      }
      const basket = pData?.basketItems || [];
      if (Array.isArray(basket) && basket.length > 0) {
        basket.forEach((b: any, idx: number) => {
          const id = String(b.id || `b_${idx + 1}`);
          const qty = parseFloat(b.quantity || "1");
          const price = parseFloat(b.price || b.unitPrice || "0");
          itemsMap.set(id, {
            id,
            itemName: b.name || b.itemName || `صنف ${idx + 1}`,
            unit: b.unit || "وحدة",
            totalQuantity: qty,
            unitPrice: price,
            totalPrice: qty * price,
          });
        });
      }
    }

    // 4. من الدفعات المسجلة مسبقاً إذا وُجدت
    if (paymentSchedule.length > 0) {
      paymentSchedule.forEach((p) => {
        if (Array.isArray(p.items)) {
          p.items.forEach((it) => {
            if (!itemsMap.has(String(it.id))) {
              itemsMap.set(String(it.id), {
                id: String(it.id),
                itemName: it.itemName,
                unit: it.unit || "وحدة",
                totalQuantity: it.quantity,
                unitPrice: it.unitPrice || 0,
                totalPrice: it.totalPrice || 0,
              });
            }
          });
        }
      });
    }

    // استخراج سلة الاحتياج (basketItems) لربط الكميات الدورية المتفق عليها
    let pData = (requestDetails as any)?.programData;
    if (typeof pData === "string") {
      try { pData = JSON.parse(pData); } catch { pData = {}; }
    }
    const basket: any[] = Array.isArray(pData?.basketItems) ? pData.basketItems : [];

    return Array.from(itemsMap.values()).map(item => {
      const match = basket.find((b: any) => {
        if (!b) return false;
        if (b.name && item.itemName && b.name.trim().toLowerCase() === item.itemName.trim().toLowerCase()) return true;
        if (b.itemName && item.itemName && b.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase()) return true;
        if (b.id && (String(b.id) === String(item.id) || String(item.id).includes(String(b.id)))) return true;
        return false;
      });

      const monthlyLimit = match?.monthlyLimit ?? match?.periodLimits?.['شهري'] ?? match?.periodLimits?.monthly;
      const quarterlyLimit = match?.quarterlyLimit ?? match?.periodLimits?.['ربع سنوي'];
      const semiAnnualLimit = match?.semiAnnualLimit ?? match?.periodLimits?.['نصف سنوي'];
      const frequency = match?.frequency || 'شهري';

      let agreedPeriodicLabel = '';
      let suggestedPeriodQty = 1;

      if (frequency === 'مرة واحدة') {
        suggestedPeriodQty = Number(item.totalQuantity) || 1;
        agreedPeriodicLabel = `توريد مرة واحدة: ${suggestedPeriodQty} ${item.unit}`;
      } else if (frequency === 'شهري' && monthlyLimit && Number(monthlyLimit) > 0) {
        suggestedPeriodQty = Number(monthlyLimit);
        agreedPeriodicLabel = `متفق عليه شهرياً: ${monthlyLimit} ${item.unit}`;
      } else if (frequency === 'ربع سنوي' && quarterlyLimit && Number(quarterlyLimit) > 0) {
        suggestedPeriodQty = Number(quarterlyLimit);
        agreedPeriodicLabel = `متفق عليه ربع سنوياً: ${quarterlyLimit} ${item.unit}`;
      } else if (frequency === 'نصف سنوي' && semiAnnualLimit && Number(semiAnnualLimit) > 0) {
        suggestedPeriodQty = Number(semiAnnualLimit);
        agreedPeriodicLabel = `متفق عليه نصف سنوياً: ${semiAnnualLimit} ${item.unit}`;
      } else if (monthlyLimit && Number(monthlyLimit) > 0) {
        suggestedPeriodQty = Number(monthlyLimit);
        agreedPeriodicLabel = `متفق عليه شهرياً: ${monthlyLimit} ${item.unit}`;
      } else if (contractData.duration && contractData.duration > 0 && item.totalQuantity > 0) {
        const perMonth = Math.max(1, Math.round(item.totalQuantity / contractData.duration));
        suggestedPeriodQty = perMonth;
        agreedPeriodicLabel = `المتفق عليه شهرياً: ${perMonth} ${item.unit}`;
      } else if (item.totalQuantity > 0) {
        suggestedPeriodQty = item.totalQuantity;
        agreedPeriodicLabel = `الكمية المعتمدة بالطلب: ${item.totalQuantity} ${item.unit}`;
      }

      return {
        ...item,
        monthlyLimit: monthlyLimit ? Number(monthlyLimit) : undefined,
        frequency,
        agreedPeriodicLabel,
        suggestedPeriodQty,
      };
    });
  }, [isSedanaProgram, allApprovedQuotations, rawApprovedQuotations, contractData.supplierId, contractData.duration, boqResult, sedanaProcurementData, requestDetails, paymentSchedule]);

  // عكس الأجور الإدارية ونسبة الجمعية المحددة في المشروع تلقائياً عند إنشاء العقد
  useEffect(() => {
    if (!isEditMode && !hasInitializedFinancialsRef.current && projectFinancials?.financialDetail) {
      const fd = projectFinancials.financialDetail;
      const feeVal = parseFloat(fd.adminFeeValue || "0");
      const feeAmt = parseFloat(fd.adminFeeAmount || "0");
      const assocAmt = parseFloat(fd.associationFundingAmount || "0");

      let initialPct = 0;
      let initialAmt = 0;
      let feeType: "percentage" | "fixed" = (fd.adminFeeType as "percentage" | "fixed") || "percentage";

      if (fd.adminFeeType === "percentage" && feeVal > 0) {
        initialPct = feeVal;
        initialAmt = contractData.totalValue > 0 ? (contractData.totalValue * feeVal) / 100 : feeAmt;
        feeType = "percentage";
      } else if (fd.adminFeeType === "fixed" && (feeVal > 0 || feeAmt > 0)) {
        initialAmt = feeAmt > 0 ? feeAmt : feeVal;
        initialPct = contractData.totalValue > 0 ? Number(((initialAmt / contractData.totalValue) * 100).toFixed(2)) : 0;
        feeType = "fixed";
      } else if (assocAmt > 0) {
        initialAmt = assocAmt;
        initialPct = contractData.totalValue > 0 ? Number(((assocAmt / contractData.totalValue) * 100).toFixed(2)) : 0;
        feeType = "fixed";
      }

      if (initialPct > 0 || initialAmt > 0) {
        hasInitializedFinancialsRef.current = true;
        setContractData(prev => ({
          ...prev,
          managementPercentage: initialPct,
          managementAmount: initialAmt,
          managementFeeType: feeType,
        }));
      }
    }
  }, [projectFinancials, isEditMode, contractData.totalValue]);

  // جلب تفاصيل المورد المختار
  const { data: selectedSupplier } = trpc.suppliers.getById.useQuery(
    { id: contractData.supplierId! },
    { enabled: !!contractData.supplierId }
  );

  // تحديد ما إذا كان هناك عرض سعر معتمد (لتثبيت المورد)
  const approvedSupplierQuotation = allApprovedQuotations.find((q: any) => 
    contractData.supplierId ? q.supplierId === contractData.supplierId : true
  ) || (allApprovedQuotations.length === 1 ? allApprovedQuotations[0] : null);
  const hasApprovedSupplier = allApprovedQuotations.length > 0;

  // Mutation لإنشاء العقد
  const createMutation = trpc.contracts.create.useMutation({
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء العقد");
      setIsSubmitting(false);
      setIsSavingDraft(false);
    },
  });

  // Mutation لتحديث العقد (وضع التعديل)
  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => {
      if (editContractId) {
        utils.contracts.getById.invalidate({ id: editContractId });
      }
      utils.contracts.invalidate();
      utils.projects.invalidate();
      utils.disbursements.invalidate();
      utils.disbursements.getFinancialReport.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث العقد");
      setIsSubmitting(false);
      setIsSavingDraft(false);
    },
  });

  // جلب العقد الموجود مسبقاً بناءً على requestId و supplierId إن وجد في وضع الإنشاء
  const { data: contractByRequest } = trpc.contracts.getByRequestId.useQuery(
    { 
      requestId: effectiveRequestId!,
      supplierId: contractData.supplierId || undefined
    },
    { enabled: !editContractId && !createdDraftId && !!effectiveRequestId && !!contractData.supplierId }
  );

  // إذا وجد مسودة سابقة لنفس الطلب والمورد المحدد، يتم فتحها وتعيين المعرف
  useEffect(() => {
    const rawContract = contractByRequest as any;
    const c = rawContract?.contract || (rawContract?.id ? rawContract : null);
    if (!editContractId && !createdDraftId && c && c.supplierId === contractData.supplierId) {
      if (c.status === "draft") {
        setCreatedDraftId(c.id);
      }
    }
  }, [contractByRequest, editContractId, createdDraftId, contractData.supplierId]);

  // جلب بيانات العقد الحالي (في وضع التعديل)
  const { data: existingContract, isLoading: isLoadingContract } = trpc.contracts.getById.useQuery(
    { id: editContractId! },
    { enabled: !!editContractId }
  );

  // تعبئة النموذج ببيانات العقد الحالي عند فتح وضع التعديل
  useEffect(() => {
    if (isEditMode && existingContract?.contract && !editDataLoaded) {
      const c = existingContract.contract;
      const dbCategories = fundingSupportCategories.map((cat: any) => cat.nameAr);
      const PREDEFINED_ENTITIES = Array.from(new Set([...dbCategories, "متجر التبرعات", "منصة احسان", "تبرع مباشر"]));
      const dbSupportingEntity = c.supportingEntity || "";
      
      let parsedSources: { entity: string; customEntity?: string; amount: number }[] = [];
      if (dbSupportingEntity && dbSupportingEntity.trim().startsWith('[')) {
        try {
          parsedSources = JSON.parse(dbSupportingEntity);
        } catch (e) {
          console.error("Failed to parse supportingEntity JSON", e);
        }
      }
      if (parsedSources.length === 0 && dbSupportingEntity) {
        const isPredefined = PREDEFINED_ENTITIES.includes(dbSupportingEntity);
        const entity = isPredefined ? dbSupportingEntity : "اخرى";
        const customEntity = !isPredefined ? dbSupportingEntity : "";
        const amt = c.supportedAmount ? parseFloat(c.supportedAmount) : 0;
        parsedSources = [{
          entity,
          customEntity,
          amount: amt
        }];
      }
      if (parsedSources.length === 0) {
        parsedSources = [{ entity: "", customEntity: "", amount: 0 }];
      }
      
      setSupportSources(parsedSources);

      const isPredefined = PREDEFINED_ENTITIES.includes(dbSupportingEntity);
      
      const supportingEntity = dbSupportingEntity 
        ? (isPredefined ? dbSupportingEntity : "اخرى") 
        : "";
      const customSupportingEntity = dbSupportingEntity && !isPredefined ? dbSupportingEntity : "";
      const supportType = c.supportType || "full";
      const supportedAmount = c.supportedAmount ? parseFloat(c.supportedAmount) : 0;

      const fd = (c as any).financialDetail || projectFinancials?.financialDetail;
      const approvedQ = allApprovedQuotations.find((q: any) => c.supplierId ? q.supplierId === c.supplierId : true)
        || (allApprovedQuotations.length === 1 ? allApprovedQuotations[0] : null);
      const approvedAmt = approvedQ?.approvedAmount 
        ? parseFloat(String(approvedQ.approvedAmount)) 
        : (approvedQ?.negotiatedAmount
          ? parseFloat(String(approvedQ.negotiatedAmount))
          : (approvedQ?.finalAmount 
            ? parseFloat(String(approvedQ.finalAmount)) 
            : (approvedQ?.totalAmount ? parseFloat(String(approvedQ.totalAmount)) : 0)));
      const savedContractAmt = c.contractAmount ? parseFloat(String(c.contractAmount)) : 0;
      const cAmt = savedContractAmt > 0 ? savedContractAmt : (approvedAmt > 0 ? approvedAmt : 0);
      let initMgmtPct = c.managementPercentage ? parseFloat(c.managementPercentage) : 0;
      let initMgmtAmt = (c as any).managementAmount !== undefined ? (c as any).managementAmount : ((cAmt > 0 && initMgmtPct > 0) ? (cAmt * initMgmtPct) / 100 : 0);
      let initFeeType: "percentage" | "fixed" = (fd?.adminFeeType as "percentage" | "fixed") || "percentage";

      if (fd) {
        const feeVal = parseFloat(fd.adminFeeValue || "0");
        const feeAmt = parseFloat(fd.adminFeeAmount || "0");
        if (fd.adminFeeType === "fixed" && (feeVal > 0 || feeAmt > 0)) {
          initMgmtAmt = feeAmt > 0 ? feeAmt : feeVal;
          initMgmtPct = cAmt > 0 ? Number(((initMgmtAmt / cAmt) * 100).toFixed(2)) : initMgmtPct;
          initFeeType = "fixed";
        } else if (fd.adminFeeType === "percentage" && feeVal > 0) {
          initMgmtPct = feeVal;
          initMgmtAmt = cAmt > 0 ? (cAmt * feeVal) / 100 : feeAmt;
          initFeeType = "percentage";
        }
      }

      setContractData({
        templateId: c.templateId || null,
        projectId: c.projectId || null,
        requestId: c.requestId || null,
        signatoryId: c.signatoryId || null,
        supplierId: c.supplierId || null,
        subject: c.contractTitle || "",
        description: "",
        duration: c.duration || 0,
        durationUnit: c.durationUnit || "months",
        startDate: c.startDate ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(c.startDate)) : "",
        startDateHijri: c.contractDateHijri ? c.contractDateHijri.replace(/[^0-9/]/g, '') : (c.startDate ? toHijriDate(new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(c.startDate))) : ""),
        totalValue: cAmt,
        managementPercentage: initMgmtPct,
        managementAmount: initMgmtAmt,
        managementFeeType: initFeeType,
        baseValue: cAmt,
        notes: c.customTerms || "",
        supportingEntity,
        customSupportingEntity,
        supportType,
        supportedAmount,
      });

      // تحميل جدول الدفعات من العقد الحالي (الأولوية دائماً لجدول الدفعات الفعلي contractPayments من قاعدة البيانات)
      let parsedSchedule: PaymentScheduleItem[] = [];
      let jsonSchedule: any[] = [];
      let detectedPaymentSystem: "installments" | "milestones" | undefined = undefined;
      if (c.paymentScheduleJson) {
        try {
          let schedule: any = c.paymentScheduleJson;
          if (typeof schedule === 'string') {
            try {
              schedule = JSON.parse(schedule);
              if (typeof schedule === 'string') {
                schedule = JSON.parse(schedule);
              }
            } catch (e) {
              console.error("Failed to parse paymentScheduleJson string:", e);
            }
          }
          if (schedule && !Array.isArray(schedule) && schedule.paymentSystem) {
            detectedPaymentSystem = schedule.paymentSystem;
            setPaymentSystem(schedule.paymentSystem);
            if (schedule.hasFinalPayment !== undefined) {
              setHasFinalPayment(Boolean(schedule.hasFinalPayment));
            }
            if (schedule.paymentSystem === "installments" && Array.isArray(schedule.schedule)) {
              jsonSchedule = schedule.schedule;
            }
          } else if (Array.isArray(schedule) && schedule.length > 0) {
            jsonSchedule = schedule;
          }
        } catch (e) {
          console.error("خطأ في تحليل جدول الدفعات من JSON:", e);
        }
      }

      if (existingContract.payments && existingContract.payments.length > 0 && detectedPaymentSystem !== "milestones") {
        parsedSchedule = existingContract.payments.map((p: any, idx: number) => {
          const comp = (p.completionPercentage !== undefined && p.completionPercentage !== null && p.completionPercentage !== "")
            ? Number(p.completionPercentage)
            : undefined;
          const paidAmt = p.paidAmount ? parseFloat(String(p.paidAmount)) : 0;
          const amt = p.agreedAmount ? parseFloat(String(p.agreedAmount)) : (p.amount ? parseFloat(String(p.amount)) : 0);
          const totalVal = c.contractAmount ? parseFloat(String(c.contractAmount)) : 0;

          // البحث عن بيانات الدفعة المقابلة في JSON للحفاظ على النسبة والبنود
          const jsonMatch = jsonSchedule.find((s: any) => 
            (s.id && String(s.id) === String(p.id)) || 
            (s.name && s.name === p.phaseName)
          ) || jsonSchedule[idx];

          let pct = (p.percentage !== undefined && p.percentage !== null && !isNaN(Number(p.percentage)))
            ? parseFloat(String(p.percentage))
            : (jsonMatch?.percentage !== undefined && jsonMatch?.percentage !== null && !isNaN(Number(jsonMatch.percentage)))
              ? parseFloat(String(jsonMatch.percentage))
              : (totalVal > 0 ? Number(((amt / totalVal) * 100).toFixed(2)) : 0);

          // حماية النسبة بحيث لا تتجاوز 100% ولا تقل عن 0%
          if (pct > 100) pct = 100;
          if (pct < 0) pct = 0;

          const isPaid = Boolean(p.isPaid === true || p.status === "paid" || p.status === "partially_paid" || paidAmt > 0);
          const isPartiallyPaid = Boolean(p.isPartiallyPaid === true || p.status === "partially_paid" || (paidAmt > 0 && paidAmt < amt));

          let formattedDueDate = "";
          if (p.dueDate) {
            try {
              const dStr = String(p.dueDate);
              if (dStr.includes("T")) {
                formattedDueDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(p.dueDate));
              } else {
                formattedDueDate = dStr.split(" ")[0];
              }
            } catch (e) {
              formattedDueDate = "";
            }
          }

          return {
            id: p.id ? String(p.id) : (jsonMatch?.id || `payment_${idx + 1}`),
            name: p.phaseName || p.name || jsonMatch?.name || `الدفعة ${idx + 1}`,
            type: p.type || jsonMatch?.type || "progress",
            percentage: pct,
            amount: amt,
            agreedAmount: amt,
            paidAmount: paidAmt,
            dueDate: formattedDueDate || jsonMatch?.dueDate || "",
            description: p.notes || p.description || p.condition || jsonMatch?.description || "",
            completionPercentage: comp ?? jsonMatch?.completionPercentage,
            items: Array.isArray(p.items) ? p.items : (Array.isArray(jsonMatch?.items) ? jsonMatch.items : []),
            status: isPaid ? (isPartiallyPaid ? "partially_paid" : "paid") : (p.status || "pending"),
            isPaid: isPaid,
            isPartiallyPaid: isPartiallyPaid,
          };
        });
      } else if (jsonSchedule.length > 0) {
        parsedSchedule = jsonSchedule.map((p: any, idx: number) => {
          const comp = (p.completionPercentage !== undefined && p.completionPercentage !== null && p.completionPercentage !== "")
            ? Number(p.completionPercentage)
            : undefined;
          const paidAmt = p.paidAmount ? parseFloat(String(p.paidAmount)) : 0;
          const amt = p.agreedAmount ? parseFloat(String(p.agreedAmount)) : (p.amount ? parseFloat(String(p.amount)) : 0);
          const totalVal = c.contractAmount ? parseFloat(String(c.contractAmount)) : 0;
          let pct = (p.percentage !== undefined && p.percentage !== null && !isNaN(Number(p.percentage)))
            ? parseFloat(String(p.percentage))
            : (totalVal > 0 ? Number(((amt / totalVal) * 100).toFixed(2)) : 0);

          if (pct > 100) pct = 100;
          if (pct < 0) pct = 0;

          const isPaid = Boolean(p.isPaid === true || p.status === "paid" || p.status === "partially_paid" || paidAmt > 0);
          const isPartiallyPaid = Boolean(p.isPartiallyPaid === true || p.status === "partially_paid" || (paidAmt > 0 && paidAmt < amt));

          let formattedDueDate = "";
          if (p.dueDate) {
            try {
              const dStr = String(p.dueDate);
              if (dStr.includes("T")) {
                formattedDueDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(p.dueDate));
              } else {
                formattedDueDate = dStr.split(" ")[0];
              }
            } catch (e) {
              formattedDueDate = "";
            }
          }

          return {
            id: p.id || `payment_${idx + 1}`,
            name: p.name || p.phaseName || `الدفعة ${idx + 1}`,
            type: p.type || "progress",
            percentage: pct,
            amount: amt,
            agreedAmount: amt,
            paidAmount: paidAmt,
            dueDate: formattedDueDate,
            description: p.description || p.notes || "",
            completionPercentage: comp,
            items: Array.isArray(p.items) ? p.items : [],
            status: isPaid ? (isPartiallyPaid ? "partially_paid" : "paid") : (p.status || "pending"),
            isPaid: isPaid,
            isPartiallyPaid: isPartiallyPaid,
          };
        });
      }
      setPaymentSchedule(sortPaymentsByDate(parsedSchedule));

      // تحميل بنود العقد من العقد الحالي
      let parsedClauses: ClauseValue[] = [];
      if (c.clauseValuesJson) {
        try {
          const clauses = typeof c.clauseValuesJson === 'string'
            ? JSON.parse(c.clauseValuesJson)
            : c.clauseValuesJson;
          if (Array.isArray(clauses) && clauses.length > 0) {
            parsedClauses = clauses;
          }
        } catch (e) {
          console.error("خطأ في تحليل بنود العقد من JSON:", e);
        }
      }
      if (parsedClauses.length === 0 && existingContract.clauseValues && existingContract.clauseValues.length > 0) {
        parsedClauses = existingContract.clauseValues.map((cv: any) => ({
          clauseId: cv.clauseId,
          title: cv.title || cv.originalTitle || "",
          titleAr: cv.originalTitleAr || cv.title || "",
          content: cv.originalContent || cv.content || "",
          customContent: cv.customContent || "",
          isIncluded: cv.isIncluded ?? true,
          isEditable: true,
          isRequired: false,
          orderIndex: cv.orderIndex || 0,
        }));
      }
      if (parsedClauses.length > 0) {
        setClauseValues(parsedClauses);
      }

      // تحميل البنود المخصصة الإضافية وخطوة المسودة من العقد الحالي
      if (c.customClausesJson) {
        try {
          const custom = typeof c.customClausesJson === 'string'
            ? JSON.parse(c.customClausesJson)
            : c.customClausesJson;
          if (Array.isArray(custom)) {
            setCustomClauses(custom);
          } else if (custom && typeof custom === 'object') {
            if (Array.isArray(custom.clauses)) {
              setCustomClauses(custom.clauses);
            }
          }
        } catch (e) {
          console.error("خطأ في تحليل البنود المخصصة:", e);
        }
      }

      // Clamp currentStep to max 7 (Step 7: المراجعة) as there are only 7 steps in the wizard
      if (typeof c.currentStep === 'number' && c.currentStep >= 1) {
        setCurrentStep(Math.min(Math.max(c.currentStep, 1), 7));
      }

      setEditDataLoaded(true);
    }
  }, [isEditMode, existingContract, editDataLoaded, allCategories]);

  // متابعة أي تغيير في بيانات العقد مقارنة بلقطة المسودة المحفوظة
  useEffect(() => {
    if (editDataLoaded) {
      const currentState = JSON.stringify({
        contractData,
        paymentSchedule,
        clauseValues,
        customClauses,
        supportSources,
        currentStep
      });

      if (!loadedDraftStateRef.current) {
        loadedDraftStateRef.current = currentState;
        if (existingContract?.contract?.status === "draft") {
          setIsDraftSaved(true);
        }
        return;
      }

      if (currentState !== loadedDraftStateRef.current) {
        setIsDraftSaved(false);
      } else if (existingContract?.contract?.status === "draft") {
        setIsDraftSaved(true);
      }
    }
  }, [contractData, paymentSchedule, clauseValues, customClauses, supportSources, currentStep, editDataLoaded, existingContract]);

  // تحديث بنود العقد عند تغيير القالب أو في حال عدم وجود بنود محمّلة
  useEffect(() => {
    if (templateClauses && (!isEditMode || selectedTemplateChanged || clauseValues.length === 0)) {
      const values: ClauseValue[] = templateClauses.map((clause: any) => ({
        clauseId: clause.id,
        title: clause.title,
        titleAr: clause.titleAr,
        content: clause.content,
        customContent: "",
        isIncluded: true,
        isEditable: clause.isEditable,
        isRequired: clause.isRequired,
        orderIndex: clause.orderIndex,
      }));
      setClauseValues(values.sort((a, b) => a.orderIndex - b.orderIndex));
    }
  }, [templateClauses, isEditMode, selectedTemplateChanged, clauseValues.length]);


  // دالة تطبيق بيانات عرض السعر المعتمد على بيانات العقد
  const applySupplierQuotation = (targetQuotation: any) => {
    if (!targetQuotation) return;
    const sId = targetQuotation.supplierId;
    const originalAmount = parseFloat(targetQuotation.totalAmount) || 0;
    const negotiatedAmount = targetQuotation.negotiatedAmount 
      ? parseFloat(targetQuotation.negotiatedAmount) 
      : null;
    const approvedAmount = targetQuotation.approvedAmount 
      ? parseFloat(targetQuotation.approvedAmount) 
      : null;
    const finalAmount = approvedAmount ?? negotiatedAmount ?? (targetQuotation.finalAmount ? parseFloat(targetQuotation.finalAmount) : null) ?? originalAmount;
    const managementPercentage = targetQuotation.managementPercentage 
      ? parseFloat(targetQuotation.managementPercentage) 
      : 0;

    let itemsList: any[] = [];
    if (Array.isArray(targetQuotation.items)) {
      itemsList = targetQuotation.items;
    } else if (typeof targetQuotation.items === "string") {
      try {
        itemsList = JSON.parse(targetQuotation.items);
      } catch (e) {
        itemsList = [];
      }
    }

    const supplierObj = suppliersList.find((s: any) => s.id === sId);
    const supplierName = targetQuotation.supplierName || supplierObj?.name || "";

    const mosqueName = requestDetails?.mosque?.name || "";
    const isSedana = requestDetails?.programType === 'sedana';
    const progTitle = isSedana ? 'نظافة وتشغيل' : 'توريد وخدمات';

    let updatedSubject = "";
    if (supplierName && mosqueName) {
      updatedSubject = `عقد ${progTitle} لمسجد ${mosqueName} - (${supplierName})`;
    } else if (mosqueName) {
      updatedSubject = `عقد ${progTitle} لمسجد ${mosqueName}`;
    }

    const itemNames = itemsList.map((it: any) => it.itemName || it.item_name || it.name).filter(Boolean).join("، ");
    const updatedDesc = itemNames ? `يشمل العقد البنود المعتمدة من عرض السعر: ${itemNames}` : "";

    setContractData(prev => ({
      ...prev,
      supplierId: sId,
      baseValue: finalAmount,
      totalValue: finalAmount,
      managementPercentage: managementPercentage || prev.managementPercentage,
      subject: updatedSubject || prev.subject,
      description: updatedDesc,
    }));
  };

  // اختيار مورد من كارت عروض الأسعار والتعامل الذكي مع التبديل وتصفير البيانات
  const handleSelectVendorForContract = (quotation: any, existingContract?: any) => {
    const sId = quotation.supplierId;
    const sObj = suppliersList.find((s: any) => s.id === sId);
    const sName = quotation.supplierName || sObj?.name || `مورد رقم ${sId}`;

    if (existingContract) {
      setCurrentStep(1);
      setEditDataLoaded(false);
      setCreatedDraftId(null);
      navigate(`/contracts/${existingContract.id}/edit`);
      toast.info(`الانتقال لتعديل عقد (${sName})`);
    } else {
      // تصفير البيانات والعودة للخطوة الأولى لإنشاء عقد جديد للمورد الآخر
      setCurrentStep(1);
      setCreatedDraftId(null);
      setEditDataLoaded(false);
      setPaymentSchedule([]);
      setClauseValues([]);
      setCustomClauses([]);
      loadedDraftStateRef.current = null;
      hasInitializedSupplierRef.current = true;
      applySupplierQuotation(quotation);
      navigate(`/contracts/new?requestId=${effectiveRequestId || requestId}&supplierId=${sId}`);
      toast.info(`بدء إنشاء عقد جديد للمورد (${sName}) من الخطوة الأولى`);
    }
  };

  // مراقبة الانتقال بين وضع التعديل والإنشاء الجديد وتصفير الخطوات والدفعات
  const prevSupplierQueryRef = useRef<number | null>(supplierIdFromQuery);
  const prevIsEditModeRef = useRef<boolean>(isEditMode);

  useEffect(() => {
    const editModeChanged = prevIsEditModeRef.current !== isEditMode;
    const supplierChanged = prevSupplierQueryRef.current !== supplierIdFromQuery;
    prevIsEditModeRef.current = isEditMode;
    prevSupplierQueryRef.current = supplierIdFromQuery;

    if (!isEditMode && (editModeChanged || supplierChanged)) {
      hasInitializedAmountRef.current = false;
      setCurrentStep(1);
      setEditDataLoaded(false);
      setPaymentSchedule([]);
      setCreatedDraftId(null);
      if (supplierIdFromQuery) {
        const q = allApprovedQuotations.find((item: any) => item.supplierId === supplierIdFromQuery);
        if (q) {
          applySupplierQuotation(q);
        }
      }
    }
  }, [isEditMode, supplierIdFromQuery, allApprovedQuotations]);

  // تهيئة وتحديد المورد وعرض السعر المعتمد تلقائياً عند فتح النموذج
  const hasInitializedSupplierRef = useRef(false);
  useEffect(() => {
    if (allApprovedQuotations.length > 0 && !isEditMode && !createdDraftId && !hasInitializedSupplierRef.current) {
      if (supplierIdFromQuery) {
        const matchingQ = allApprovedQuotations.find((q: any) => q.supplierId === supplierIdFromQuery);
        if (matchingQ) {
          applySupplierQuotation(matchingQ);
          hasInitializedSupplierRef.current = true;
          return;
        }
      }

      if (!contractData.supplierId || !allApprovedQuotations.some((q: any) => q.supplierId === contractData.supplierId)) {
        const uncontractedQ = allApprovedQuotations.find((q: any) => 
          !requestContractsList.some((c: any) => c.supplierId === q.supplierId)
        );
        const selectedQ = uncontractedQ || allApprovedQuotations[0];
        applySupplierQuotation(selectedQ);
        hasInitializedSupplierRef.current = true;
      }
    }
  }, [allApprovedQuotations, isEditMode, createdDraftId, supplierIdFromQuery, contractData.supplierId, requestContractsList]);

  // مزامنة مبدئية فقط لقيمة العقد عند إنشاء عقد جديد من عرض السعر المعتمد للمورد إن لم تكن محددة
  const hasInitializedAmountRef = useRef<boolean>(false);
  useEffect(() => {
    if (isEditMode) return;
    if (hasInitializedAmountRef.current) return;
    if (approvedSupplierQuotation) {
      const qAmt = parseFloat(
        String(
          approvedSupplierQuotation.approvedAmount ||
          approvedSupplierQuotation.negotiatedAmount ||
          approvedSupplierQuotation.finalAmount ||
          approvedSupplierQuotation.totalAmount ||
          0
        )
      );
      if (qAmt > 0 && (!contractData.totalValue || contractData.totalValue === 0)) {
        hasInitializedAmountRef.current = true;
        setContractData(prev => {
          const mgmtAmt = prev.managementFeeType === "fixed"
            ? prev.managementAmount
            : (qAmt * prev.managementPercentage) / 100;
          return {
            ...prev,
            totalValue: qAmt,
            baseValue: qAmt,
            managementAmount: mgmtAmt,
            supportedAmount: prev.supportType === "full" ? qAmt : prev.supportedAmount,
          };
        });
      }
    }
  }, [
    isEditMode,
    approvedSupplierQuotation?.finalAmount,
    approvedSupplierQuotation?.totalAmount,
    approvedSupplierQuotation?.negotiatedAmount,
    approvedSupplierQuotation?.approvedAmount,
  ]);

  // تحديث المشروع والحقول الأخرى من بيانات الطلب
  useEffect(() => {
    if (requestDetails && !isEditMode) {
      const updates: any = {};
      
      // ربط المشروع
      if (requestDetails.project?.id) {
        updates.projectId = requestDetails.project.id;
      }
      
      // ملء موضوع العقد تلقائياً إذا كان فارغاً
      if (!contractData.subject) {
        if (requestDetails.project?.name) {
          updates.subject = requestDetails.project.name;
        } else if (requestDetails.mosque?.name) {
          const programName = requestDetails.programType === 'bunyan' ? 'بناء' :
                             requestDetails.programType === 'daaem' ? 'استكمال' :
                             requestDetails.programType === 'enaya' ? 'صيانة وترميم' :
                             requestDetails.programType === 'emdad' ? 'تجهيزات' :
                             requestDetails.programType === 'ethraa' ? 'سداد فواتير' :
                             requestDetails.programType === 'sedana' ? 'نظافة' :
                             requestDetails.programType === 'taqa' ? 'طاقة شمسية' :
                             requestDetails.programType === 'miyah' ? 'أنظمة مياه' :
                             requestDetails.programType === 'suqya' ? 'ماء شرب' : 'خدمة';
          
          updates.subject = `عقد ${programName} لمسجد ${requestDetails.mosque.name}`;
        }
      }
      
      // تعيين تاريخ البدء إلى اليوم إذا كان فارغاً
      if (!contractData.startDate) {
        const todayStr = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        updates.startDate = todayStr;
        if (!contractData.startDateHijri) {
          updates.startDateHijri = toHijriDate(todayStr);
        }
      }
      
      // تعيين مدة افتراضية (3 أشهر) إذا كانت فارغة
      if (!contractData.duration || contractData.duration === 0) {
        updates.duration = 3;
        updates.durationUnit = 'months';
      }
      
      if (Object.keys(updates).length > 0) {
        setContractData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [requestDetails]);

  // إضافة دفعة جديدة في نهاية الجدول
  const addPayment = () => {
    if (!paymentSystem) {
      toast.info("يرجى اختيار آلية استحقاق وصرف مستحقات العقد (دفعات أو مستخلصات) أولاً");
      return;
    }
    if (paymentSystem === "milestones") {
      return;
    }
    const isClosingMode = hasFinalPayment && paymentSchedule.length >= 2;

    if (!hasFinalPayment) {
      const lastPayment = paymentSchedule.length > 0 ? paymentSchedule[paymentSchedule.length - 1] : null;
      if (lastPayment && Number(lastPayment.completionPercentage) >= 100 && contractData.totalValue > 0) {
        const totalPayments = paymentSchedule.reduce((sum, p) => sum + getPaymentEffectiveAmount(p), 0);
        if (Math.abs(totalPayments - contractData.totalValue) <= 0.05) {
          toast.info("الدفعة الأخيرة بلغت نسبة إنجازها 100% وتمت تغطية كامل قيمة العقد. لا يمكن إضافة دفعات بعد إنجاز كامل.");
          return;
        }
      }
    }

    const newPayment: PaymentScheduleItem = {
      id: `payment-${Date.now()}`,
      name: "",
      type: "progress",
      percentage: 0,
      amount: 0,
      dueDate: "",
      description: "",
      completionPercentage: undefined,
      items: [],
    };

    let updated: PaymentScheduleItem[];
    if (isClosingMode) {
      // إدراج الدفعة الجديدة قبل الدفعة الختامية لتبقى الدفعة الختامية في النهاية دائماً
      const finalPayment = paymentSchedule[paymentSchedule.length - 1];
      const workPayments = paymentSchedule.slice(0, -1);
      newPayment.name = `الدفعة ${workPayments.length + 1}`;
      updated = [...workPayments, newPayment, finalPayment];
    } else if (hasFinalPayment && paymentSchedule.length === 1) {
      newPayment.name = "الدفعة الختامية";
      updated = [...paymentSchedule, newPayment];
    } else {
      newPayment.name = `الدفعة ${paymentSchedule.length + 1}`;
      updated = [...paymentSchedule, newPayment];
    }

    setPaymentSchedule(recalculateScheduleWithCumulativeCompletion(updated, contractData.totalValue, hasFinalPayment));
  };

  // إدراج دفعة بين دفعتين
  const insertPaymentAt = (targetIndex: number) => {
    const prevPayment = targetIndex > 0 ? paymentSchedule[targetIndex - 1] : null;
    const nextPayment = targetIndex < paymentSchedule.length ? paymentSchedule[targetIndex] : null;

    const prevComp = (prevPayment?.completionPercentage !== undefined && prevPayment?.completionPercentage !== null && !isNaN(Number(prevPayment.completionPercentage)))
      ? Number(prevPayment.completionPercentage)
      : null;

    if (prevComp !== null && prevComp >= 100) {
      toast.error("الدفعة السابقة بلغت نسبة إنجازها 100%، ولا يمكن إدراج دفعة بنسبة أعلى منها.");
      return;
    }

    let suggestedDueDate = "";
    if (prevPayment?.dueDate && nextPayment?.dueDate) {
      try {
        const d1 = new Date(prevPayment.dueDate).getTime();
        const d2 = new Date(nextPayment.dueDate).getTime();
        if (d2 > d1) {
          const midDate = new Date(d1 + (d2 - d1) / 2);
          suggestedDueDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(midDate);
        }
      } catch (e) {}
    } else if (prevPayment?.dueDate) {
      suggestedDueDate = prevPayment.dueDate;
    }

    const newPayment: PaymentScheduleItem = {
      id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `الدفعة ${targetIndex + 1}`,
      type: "progress",
      percentage: 0,
      amount: 0,
      dueDate: suggestedDueDate,
      description: "",
      completionPercentage: undefined,
    };

    const newSchedule = [...paymentSchedule];
    newSchedule.splice(targetIndex, 0, newPayment);
    const sorted = sortPaymentsByDate(newSchedule);

    // إعادة ترقيم أسماء الدفعات التلقائية غير المعدلة يدوياً
    const renamed = sorted.map((p, idx) => {
      if (p.isPaid) return p;
      if (/^الدفعة \d+$/.test(p.name)) {
        return { ...p, name: `الدفعة ${idx + 1}` };
      }
      return p;
    });

    setPaymentSchedule(recalculateScheduleWithCumulativeCompletion(renamed));
    toast.success(`تم إدراج دفعة جديدة بين الدفعات (الموضع: الدفعة ${targetIndex + 1})`);
  };

  // إضافة صنف لدفعة محددة (خاص بسدانة)
  const handleAddItemToPayment = (paymentId: string, itemId: string) => {
    const targetItem = availableContractItems.find(i => String(i.id) === String(itemId));
    if (!targetItem) return;

    setPaymentSchedule(prev => prev.map(p => {
      if (p.id !== paymentId) return p;
      const currentItems = Array.isArray(p.items) ? p.items : [];
      if (currentItems.some(i => String(i.id) === String(itemId))) {
        toast.info("هذا الصنف مضاف بالفعل لهذه الدفعة");
        return p;
      }

      const initialQty = (targetItem as any).suggestedPeriodQty || (targetItem as any).monthlyLimit || (targetItem.totalQuantity > 0 ? targetItem.totalQuantity : 1);

      const newItem: PaymentScheduleContractItem = {
        id: String(targetItem.id),
        itemName: targetItem.itemName,
        quantity: initialQty,
        unit: targetItem.unit,
        unitPrice: targetItem.unitPrice || 0,
        totalPrice: initialQty * (targetItem.unitPrice || 0),
      };

      return {
        ...p,
        items: [...currentItems, newItem],
      };
    }));
    toast.success(`تمت إضافة البند (${targetItem.itemName}) للدفعة`);
  };

  // تحديث صنف داخل دفعة (خاص بسدانة)
  const handleUpdatePaymentItem = (paymentId: string, itemId: string, updates: Partial<PaymentScheduleContractItem>) => {
    setPaymentSchedule(prev => prev.map(p => {
      if (p.id !== paymentId) return p;
      const currentItems = Array.isArray(p.items) ? p.items : [];
      return {
        ...p,
        items: currentItems.map(it => {
          if (String(it.id) === String(itemId)) {
            const updated = { ...it, ...updates };
            if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
              const q = updates.quantity !== undefined ? updates.quantity : updated.quantity;
              const pr = updates.unitPrice !== undefined ? updates.unitPrice : (updated.unitPrice || 0);
              updated.totalPrice = q * pr;
            }
            return updated;
          }
          return it;
        }),
      };
    }));
  };

  // حذف صنف من دفعة (خاص بسدانة)
  const handleRemoveItemFromPayment = (paymentId: string, itemId: string) => {
    setPaymentSchedule(prev => prev.map(p => {
      if (p.id !== paymentId) return p;
      const currentItems = Array.isArray(p.items) ? p.items : [];
      return {
        ...p,
        items: currentItems.filter(it => String(it.id) !== String(itemId)),
      };
    }));
  };

  // إدراج كافة بنود العقد لهذه الدفعة بالكميات الشهرية / الدورية المتفق عليها
  const handleInsertAllItemsForPayment = (paymentId: string) => {
    if (availableContractItems.length === 0) {
      toast.error("لا توجد بنود متاحة في العقد");
      return;
    }

    setPaymentSchedule(prev => {
      const currentPayment = prev.find(p => p.id === paymentId);
      if (!currentPayment) return prev;
      const currentItems = Array.isArray(currentPayment.items) ? [...currentPayment.items] : [];

      availableContractItems.forEach(avail => {
        const defaultQty = (avail as any).suggestedPeriodQty || (avail as any).monthlyLimit || (avail.totalQuantity > 0 ? avail.totalQuantity : 1);
        const existingIdx = currentItems.findIndex(i => String(i.id) === String(avail.id));

        if (existingIdx >= 0) {
          if (!currentItems[existingIdx].quantity || currentItems[existingIdx].quantity <= 0) {
            currentItems[existingIdx] = {
              ...currentItems[existingIdx],
              quantity: defaultQty,
              totalPrice: defaultQty * (currentItems[existingIdx].unitPrice || avail.unitPrice || 0),
            };
          }
        } else {
          currentItems.push({
            id: String(avail.id),
            itemName: avail.itemName,
            quantity: defaultQty,
            unit: avail.unit,
            unitPrice: avail.unitPrice || 0,
            totalPrice: defaultQty * (avail.unitPrice || 0),
          });
        }
      });

      return prev.map(p => p.id === paymentId ? { ...p, items: currentItems } : p);
    });
    toast.success("تم إدراج كافة بنود العقد بالكميات المتفق عليها لهذه الدفعة");
  };

  // تطبيق بنود هذه الدفعة على جميع الدفعات الأخرى (خاص بسدانة)
  const handleApplyItemsToAllPayments = (sourcePaymentId: string) => {
    const sourcePayment = paymentSchedule.find(p => p.id === sourcePaymentId);
    if (!sourcePayment || !sourcePayment.items || sourcePayment.items.length === 0) {
      toast.error("لا توجد أصناف في هذه الدفعة لتطبيقها");
      return;
    }

    const itemsToCopy = sourcePayment.items.map(it => ({ ...it }));
    setPaymentSchedule(prev => prev.map(p => ({
      ...p,
      items: itemsToCopy.map(it => ({ ...it })),
    })));
    toast.success(`تم نسخ وتطبيق البنود والكميات على جميع الدفعات (${paymentSchedule.length} دفعات)`);
  };

  // تعبئة كافة دفعات العقد تلقائياً بالبنود والكميات الدورية المتفق عليها
  const handleAutoFillAllPaymentsWithAgreedItems = () => {
    if (availableContractItems.length === 0) {
      toast.error("لا توجد بنود متاحة للتعاقد");
      return;
    }
    if (paymentSchedule.length === 0) {
      toast.info("يرجى إضافة دفعات أولاً");
      return;
    }

    setPaymentSchedule(prev => prev.map(p => {
      const allItems = availableContractItems.map(avail => {
        const defaultQty = (avail as any).suggestedPeriodQty || (avail as any).monthlyLimit || (avail.totalQuantity > 0 ? avail.totalQuantity : 1);
        return {
          id: String(avail.id),
          itemName: avail.itemName,
          quantity: defaultQty,
          unit: avail.unit,
          unitPrice: avail.unitPrice || 0,
          totalPrice: defaultQty * (avail.unitPrice || 0),
        };
      });
      return { ...p, items: allItems };
    }));
    toast.success(`تمت تعبئة جميع الدفعات (${paymentSchedule.length} دفعة) بكافة بنود العقد والكميات المتفق عليها`);
  };

  // مطابقة مبلغ الدفعة ونسبتها مع مجموع أسعار بنودها (خاص بسدانة)
  const handleMatchPaymentWithItems = (paymentId: string, itemsSum: number) => {
    if (itemsSum <= 0) return;
    const roundedSum = Number(itemsSum.toFixed(2));
    const pct = contractData.totalValue > 0 ? Number(((roundedSum / contractData.totalValue) * 100).toFixed(2)) : 0;

    setPaymentSchedule(prev => {
      const updated = prev.map(p => {
        if (p.id === paymentId) {
          return {
            ...p,
            amount: roundedSum,
            percentage: pct,
          };
        }
        return p;
      });
      return recalculateScheduleWithCumulativeCompletion(updated);
    });
    toast.success(`تم تعديل مبلغ الدفعة ليصبح ${roundedSum.toLocaleString("ar-SA")} ر.س (${pct}%)`);
  };

  // حذف دفعة
  const removePayment = (id: string) => {
    const target = paymentSchedule.find(p => p.id === id);
    if (target && (target.isPaid || target.status === "paid" || Number(target.paidAmount || 0) > 0)) {
      toast.error("لا يمكن حذف دفعة مسددة نهائياً");
      return;
    }
    const filtered = paymentSchedule.filter(p => p.id !== id);
    setPaymentSchedule(recalculateScheduleWithCumulativeCompletion(filtered));
  };

  // تحديث دفعة
  const updatePayment = (id: string, field: keyof PaymentScheduleItem, value: any) => {
    const target = paymentSchedule.find(p => p.id === id);
    if (target && (target.isPaid || target.status === "paid" || Number(target.paidAmount || 0) > 0)) {
      toast.error("لا يمكن تعديل دفعة مسددة");
      return;
    }
    setPaymentSchedule(paymentSchedule.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // تبديل تضمين بند
  const toggleClauseInclusion = (clauseId: number) => {
    setClauseValues(clauseValues.map(c => {
      if (c.clauseId === clauseId && !c.isRequired) {
        return { ...c, isIncluded: !c.isIncluded };
      }
      return c;
    }));
  };

  // تحديث محتوى بند مخصص
  const updateClauseContent = (clauseId: number, content: string) => {
    setClauseValues(clauseValues.map(c => {
      if (c.clauseId === clauseId) {
        return { ...c, customContent: content };
      }
      return c;
    }));
  };

  // تبديل توسيع بند
  const toggleClauseExpansion = (clauseId: number) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  // التحقق من صحة الخطوة الحالية
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!contractData.templateId) {
          toast.error("يرجى اختيار قالب العقد");
          return false;
        }
        if (!contractData.signatoryId) {
          toast.error("يرجى اختيار مفوض التوقيع (الطرف الأول)");
          return false;
        }
        return true;
      case 2:
        if (!contractData.supplierId) {
          toast.error("يرجى اختيار المورد");
          return false;
        }
        return true;
      case 3:
        if (!contractData.subject) {
          toast.error("يرجى إدخال موضوع العقد");
          return false;
        }
        if (!contractData.duration || contractData.duration <= 0) {
          toast.error("يرجى إدخال مدة العقد");
          return false;
        }
        if (!contractData.startDate) {
          toast.error("يرجى تحديد تاريخ البدء");
          return false;
        }
        if (!contractData.totalValue || contractData.totalValue <= 0) {
          toast.error("يرجى إدخال قيمة العقد");
          return false;
        }
        return true;
      case 4:
        if (!paymentSystem) {
          toast.error("يرجى اختيار آلية استحقاق وصرف مستحقات العقد (دفعات أو مستخلصات)");
          return false;
        }

        // في نظام المستخلصات: لا يتم تحديد أو جدولة مستخلصات مسبقة أثناء إنشاء العقد
        if (paymentSystem === "milestones") {
          return true;
        }

        // في نظام الدفعات: في حال عدم إضافة دفعات، يمكن تخطي هذه الخطوة
        if (paymentSchedule.length === 0) {
          return true;
        }

        // إذا تم تفعيل خيار الدفعة الختامية، يجب أن يكون هناك دفعتان على الأقل
        if (hasFinalPayment && paymentSchedule.length < 2) {
          toast.error("عند تفعيل خيار الدفعة الختامية، يجب إضافة دفعتين على الأقل (دفعة إنجاز الأعمال + الدفعة الختامية)");
          return false;
        }

        // التأكد من صحة حقول الدفعات في نظام الدفعات المجدولة أولاً
        for (let i = 0; i < paymentSchedule.length; i++) {
          const p = paymentSchedule[i];
          const isClosing = hasFinalPayment && i === paymentSchedule.length - 1 && paymentSchedule.length >= 2;

          if (!p.dueDate) {
            toast.error(`يرجى تحديد تاريخ الاستحقاق للدفعة ${i + 1}`);
            return false;
          }
          if (contractData.startDate && p.dueDate < contractData.startDate) {
            toast.error(`تاريخ الدفعة ${i + 1} (${p.dueDate}) لا يمكن أن يكون قبل تاريخ العقد (${contractData.startDate})`);
            return false;
          }
          if (i > 0 && paymentSchedule[i - 1].dueDate && p.dueDate < paymentSchedule[i - 1].dueDate) {
            toast.error(`تاريخ الدفعة ${i + 1} (${p.dueDate}) لا يمكن أن يكون قبل تاريخ الدفعة السابقة (${paymentSchedule[i - 1].name || `الدفعة ${i}`}: ${paymentSchedule[i - 1].dueDate})`);
            return false;
          }
          if (i < paymentSchedule.length - 1 && paymentSchedule[i + 1].dueDate && p.dueDate > paymentSchedule[i + 1].dueDate) {
            toast.error(`تاريخ الدفعة ${i + 1} (${p.dueDate}) لا يمكن أن يتجاوز تاريخ الدفعة التالية (${paymentSchedule[i + 1].name || `الدفعة ${i + 2}`}: ${paymentSchedule[i + 1].dueDate})`);
            return false;
          }
          if (!p.name) {
            toast.error(`يرجى إدخال عنوان للدفعة ${i + 1}`);
            return false;
          }
          if (!p.amount || p.amount <= 0) {
            toast.error(`يرجى إدخال مبلغ صحيح للدفعة ${i + 1}`);
            return false;
          }
          if (!p.description || !p.description.trim()) {
            toast.error(`يرجى إدخال وصف الأعمال للدفعة ${i + 1}`);
            return false;
          }

          // التحقق من نسبة الإنجاز: يتم لجميع الدفعات باستثناء الدفعة الختامية
          if (!isClosing) {
            if (p.completionPercentage === undefined || p.completionPercentage === null || isNaN(p.completionPercentage) || p.completionPercentage < 0 || p.completionPercentage > 100) {
              toast.error(`يرجى تحديد نسبة إنجاز صحيحة (بين 0 و 100) للدفعة ${i + 1}`);
              return false;
            }
            if (i > 0) {
              const prevComp = paymentSchedule[i - 1].completionPercentage;
              if (prevComp !== undefined && prevComp !== null && !isNaN(prevComp)) {
                if (p.completionPercentage <= prevComp) {
                  toast.error(`نسبة إنجاز الدفعة ${i + 1} (${p.completionPercentage}%) يجب أن تكون أكبر من نسبة إنجاز الدفعة السابقة (${paymentSchedule[i - 1].name || `الدفعة ${i}`}: ${prevComp}%)`);
                  return false;
                }
              }
            }
            if (i < paymentSchedule.length - 1 && !(hasFinalPayment && i === paymentSchedule.length - 2)) {
              const nextComp = paymentSchedule[i + 1].completionPercentage;
              if (nextComp !== undefined && nextComp !== null && !isNaN(nextComp)) {
                if (p.completionPercentage >= nextComp) {
                  toast.error(`نسبة إنجاز الدفعة ${i + 1} (${p.completionPercentage}%) يجب أن تكون أقل من نسبة إنجاز الدفعة التالية (${paymentSchedule[i + 1].name || `الدفعة ${i + 2}`}: ${nextComp}%)`);
                  return false;
                }
              }
            }
          }
        }

        // شرط أن تصل نسبة الإنجاز إلى 100% (على الدفعة قبل الأخيرة في حال تفعيل الدفعة الختامية، أو على الدفعة الأخيرة في الوضع العادي):
        if (hasFinalPayment && paymentSchedule.length >= 2) {
          const penultimatePayment = paymentSchedule[paymentSchedule.length - 2];
          if (Number(penultimatePayment.completionPercentage) !== 100) {
            toast.error(`يجب أن تصل نسبة الإنجاز التراكمية في الدفعة قبل الأخيرة (${penultimatePayment.name || `الدفعة ${paymentSchedule.length - 1}`}) إلى 100%`);
            return false;
          }
        } else if (!hasFinalPayment && paymentSchedule.length > 0) {
          const lastPayment = paymentSchedule[paymentSchedule.length - 1];
          if (Number(lastPayment.completionPercentage) !== 100) {
            toast.error(`يجب أن تصل نسبة الإنجاز التراكمية في الدفعة الأخيرة (${lastPayment.name || `الدفعة ${paymentSchedule.length}`}) إلى 100%`);
            return false;
          }
        }

        // التحقق من مبالغ الدفعات:
        // في حال تفعيل الدفعة الختامية، فإن قيمتها ليست ضمن قيمة المشروع، لذلك يجب أن تغطي دفعات الأعمال كامل قيمة المشروع
        if (hasFinalPayment && paymentSchedule.length >= 2) {
          const workPayments = paymentSchedule.slice(0, -1);
          const workPaymentsTotal = workPayments.reduce((sum, p) => sum + getPaymentEffectiveAmount(p), 0);
          if (Math.abs(workPaymentsTotal - contractData.totalValue) > 0.05) {
            toast.error(`يجب أن يكون إجمالي مبالغ دفعات إنجاز الأعمال مساوياً لقيمة المشروع (${contractData.totalValue.toLocaleString()} ريال). الإجمالي الحالي لدفعات الأعمال: ${workPaymentsTotal.toLocaleString()} ريال`);
            return false;
          }
          const finalPayment = paymentSchedule[paymentSchedule.length - 1];
          const finalAmt = Number(finalPayment.amount || 0);
          if (finalAmt <= 0) {
            toast.error("يرجى إدخال مبلغ صحيح للدفعة الختامية");
            return false;
          }
        } else if (!hasFinalPayment && paymentSchedule.length > 0) {
          const totalPayments = paymentSchedule.reduce((sum, p) => sum + getPaymentEffectiveAmount(p), 0);
          if (Math.abs(totalPayments - contractData.totalValue) > 0.05) {
            toast.error(`يجب أن يكون إجمالي مبالغ الدفعات مساوياً لقيمة العقد تماماً (${contractData.totalValue.toLocaleString()} ريال). الإجمالي الحالي: ${totalPayments.toLocaleString()} ريال`);
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  // الانتقال للخطوة التالية
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setIsDraftSaved(false);
      setCurrentStep(prev => Math.min(prev + 1, 7));
    }
  };

  // الانتقال للخطوة السابقة
  const prevStep = () => {
    setIsDraftSaved(false);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // إرسال العقد
  const handleSubmit = async () => {
    if (isSedanaNotReadyForContract) {
      toast.error("لا يمكن إبرام العقد لطلب سدانة إلا بعد انتقال الطلب إلى مرحلة 'التشغيل والتنفيذ'");
      return;
    }
    if (!validateStep(currentStep)) return;
    if (paymentSchedule.length > 0 && !validateStep(4)) return;
    
    setIsSubmitting(true);
    
    const selectedTemplate = templatesData?.find((t: any) => t.id === contractData.templateId);

    // في وضع التعديل
    if (isEditMode && editContractId) {
      updateMutation.mutate({
        id: editContractId,
        contractType: selectedTemplate?.type || undefined,
        contractTitle: contractData.subject,
        signatoryId: contractData.signatoryId,
        templateId: contractData.templateId || undefined,
        // بيانات الطرف الثاني من المورد
        secondPartyName: selectedSupplier?.name,
        secondPartyCommercialRegister: selectedSupplier?.commercialRegister || undefined,
        secondPartyRepresentative: selectedSupplier?.contactPerson || undefined,
        secondPartyTitle: selectedSupplier?.contactPersonTitle || undefined,
        secondPartyAddress: selectedSupplier?.address || undefined,
        secondPartyPhone: selectedSupplier?.phone || undefined,
        secondPartyEmail: selectedSupplier?.email || undefined,
        secondPartyBankName: selectedSupplier?.bankName || undefined,
        secondPartyIban: selectedSupplier?.iban || undefined,
        secondPartyAccountName: selectedSupplier?.bankAccountName || undefined,
        // قيمة ومدة العقد
        contractAmount: contractData.totalValue,
        managementPercentage: contractData.managementPercentage,
        managementAmount: contractData.managementAmount,
        managementFeeType: contractData.managementFeeType,
        duration: contractData.duration,
        durationUnit: contractData.durationUnit as any,
        contractDate: contractData.startDate,
        contractDateHijri: contractData.startDateHijri ? `${contractData.startDateHijri.replace(/[^0-9/]/g, '')} هـ` : (contractData.startDate ? `${toHijriDate(contractData.startDate)} هـ` : undefined),
        startDate: contractData.startDate,
        customTerms: contractData.notes || undefined,
        // جدول الدفعات ونظام الصرف
        paymentSchedule: JSON.stringify({ 
          paymentSystem: paymentSystem || "installments", 
          hasFinalPayment: Boolean(hasFinalPayment),
          schedule: paymentSystem === "milestones" ? [] : paymentSchedule 
        }),
        paymentSystem: (paymentSystem || undefined) as any,
        // بنود العقد المخصصة
        clauseValues: JSON.stringify(clauseValues.filter(c => c.isIncluded)),
        customClausesJson: JSON.stringify(customClauses.filter(c => (c.title && c.title.trim()) || (c.description && c.description.trim()))),
        // بيانات الدعم والتمويل والاعتماد
        supportingEntity: JSON.stringify(supportSources),
        supportType: Math.abs(supportSources.reduce((sum, src) => sum + src.amount, 0) - totalProjectCost) < 0.01 ? "full" : "partial",
        supportedAmount: supportSources.reduce((sum, src) => sum + src.amount, 0),
        status: existingContract?.contract?.status === "approved" ? "approved" : "pending_approval",
        currentStep: 8,
      }, {
        onSuccess: () => {
          toast.success(existingContract?.contract?.status === "approved" ? "تم تعديل العقد بنجاح" : "تم اعتماد العقد بنجاح");
          navigate(`/contracts/${editContractId}/preview`);
        }
      });
      return;
    }
    
    const supplier = selectedSupplier;
    if (!supplier) {
      toast.error("يرجى اختيار المورد");
      setIsSubmitting(false);
      return;
    }

    
    createMutation.mutate({
      contractType: selectedTemplate?.type || "supply",
      contractTitle: contractData.subject,
      projectId: contractData.projectId || undefined,
      requestId: contractData.requestId || undefined,
      supplierId: contractData.supplierId!,
      templateId: contractData.templateId || undefined,
      signatoryId: contractData.signatoryId || undefined,
      // بيانات الطرف الثاني من المورد
      secondPartyName: supplier.name,
      secondPartyCommercialRegister: supplier.commercialRegister || undefined,
      secondPartyRepresentative: supplier.contactPerson || undefined,
      secondPartyTitle: supplier.contactPersonTitle || undefined,
      secondPartyAddress: supplier.address || undefined,
      secondPartyPhone: supplier.phone || undefined,
      secondPartyEmail: supplier.email || undefined,
      secondPartyBankName: supplier.bankName || undefined,
      secondPartyIban: supplier.iban || undefined,
      secondPartyAccountName: supplier.bankAccountName || undefined,
      // قيمة ومدة العقد
      contractAmount: contractData.totalValue,
      managementPercentage: contractData.managementPercentage,
      managementAmount: contractData.managementAmount,
      managementFeeType: contractData.managementFeeType,
      duration: contractData.duration,
      durationUnit: contractData.durationUnit as any,
      contractDate: contractData.startDate,
      contractDateHijri: contractData.startDateHijri ? `${contractData.startDateHijri.replace(/[^0-9/]/g, '')} هـ` : (contractData.startDate ? `${toHijriDate(contractData.startDate)} هـ` : undefined),
      startDate: contractData.startDate,
      // جدول الدفعات ونظام الصرف
      paymentSchedule: JSON.stringify({ 
        paymentSystem: paymentSystem || "installments", 
        hasFinalPayment: Boolean(hasFinalPayment),
        schedule: paymentSystem === "milestones" ? [] : paymentSchedule 
      }),
      paymentSystem: (paymentSystem || undefined) as any,
      // بنود العقد
      clauseValues: clauseValues.length > 0 ? JSON.stringify(clauseValues.filter(c => c.isIncluded)) : undefined,
      customClausesJson: JSON.stringify(customClauses.filter(c => (c.title && c.title.trim()) || (c.description && c.description.trim()))),
      // ملاحظات
      customTerms: contractData.notes || undefined,
      // بيانات الدعم والتمويل والاعتماد
      supportingEntity: JSON.stringify(supportSources),
      supportType: Math.abs(supportSources.reduce((sum, src) => sum + src.amount, 0) - totalProjectCost) < 0.01 ? "full" : "partial",
      supportedAmount: supportSources.reduce((sum, src) => sum + src.amount, 0),
      status: "pending_approval",
      currentStep: 8,
    }, {
      onSuccess: (data) => {
        toast.success("تم إنشاء العقد بنجاح");
        navigate(`/contracts/${data.id}/preview`);
      }
    });
  };

  // حفظ العقد كمسودة في أي مرحلة
  const handleSaveDraft = async () => {
    if (isSedanaNotReadyForContract) {
      toast.error("لا يمكن حفظ العقد لطلب سدانة إلا بعد انتقال الطلب إلى مرحلة 'التشغيل والتنفيذ'");
      return;
    }
    setIsSavingDraft(true);
    
    const selectedTemplate = templatesData?.find((t: any) => t.id === contractData.templateId);
    const supplier = selectedSupplier;

    // عنوان افتراضي في حال لم يتم إدخاله بعد
    const defaultTitle = contractData.subject?.trim() 
      || (requestDetails?.mosque?.name ? `عقد ${requestDetails.mosque.name}` : `مسودة عقد جديد`);

    const payload: any = {
      contractType: selectedTemplate?.type || "supply",
      contractTitle: defaultTitle,
      projectId: contractData.projectId || undefined,
      requestId: contractData.requestId || undefined,
      supplierId: contractData.supplierId || undefined,
      templateId: contractData.templateId || undefined,
      signatoryId: contractData.signatoryId || undefined,
      
      // بيانات الطرف الثاني
      secondPartyName: supplier?.name || "غير محدد (مسودة)",
      secondPartyCommercialRegister: supplier?.commercialRegister || undefined,
      secondPartyRepresentative: supplier?.contactPerson || undefined,
      secondPartyTitle: supplier?.contactPersonTitle || undefined,
      secondPartyAddress: supplier?.address || undefined,
      secondPartyPhone: supplier?.phone || undefined,
      secondPartyEmail: supplier?.email || undefined,
      secondPartyBankName: supplier?.bankName || undefined,
      secondPartyIban: supplier?.iban || undefined,
      secondPartyAccountName: supplier?.bankAccountName || undefined,
      
      // قيمة ومدة العقد
      contractAmount: contractData.totalValue || 0,
      managementPercentage: contractData.managementPercentage || 0,
      managementAmount: contractData.managementAmount || 0,
      managementFeeType: contractData.managementFeeType,
      duration: contractData.duration || 1,
      durationUnit: (contractData.durationUnit || "months") as any,
      contractDate: contractData.startDate || undefined,
      contractDateHijri: contractData.startDateHijri ? `${contractData.startDateHijri.replace(/[^0-9/]/g, '')} هـ` : (contractData.startDate ? `${toHijriDate(contractData.startDate)} هـ` : undefined),
      startDate: contractData.startDate || undefined,
      customTerms: contractData.notes || undefined,
      
      // جدول الدفعات والبنود ونظام الصرف
      paymentSchedule: JSON.stringify({ paymentSystem: paymentSystem || "installments", schedule: paymentSystem === "milestones" ? [] : paymentSchedule }),
      paymentSystem: (paymentSystem || undefined) as any,
      clauseValues: clauseValues.length > 0 ? JSON.stringify(clauseValues.filter(c => c.isIncluded)) : undefined,
      customClausesJson: JSON.stringify({
        clauses: customClauses.filter(c => (c.title && c.title.trim()) || (c.description && c.description.trim())),
        draftStep: currentStep,
      }),
      
      // بيانات الدعم والتمويل والخطوة الحالية
      supportingEntity: JSON.stringify(supportSources),
      supportType: Math.abs(supportSources.reduce((sum, src) => sum + src.amount, 0) - totalProjectCost) < 0.01 ? "full" : "partial",
      supportedAmount: supportSources.reduce((sum, src) => sum + src.amount, 0),
      currentStep: currentStep,
      status: existingContract?.contract?.status === "approved" ? "approved" : "draft",
    };

    const targetId = editContractId || createdDraftId;

    const updateSavedSnapshot = () => {
      loadedDraftStateRef.current = JSON.stringify({
        contractData,
        paymentSchedule,
        clauseValues,
        customClauses,
        supportSources,
        currentStep
      });
      setIsDraftSaved(true);
    };

    if (targetId) {
      updateMutation.mutate({ id: targetId, ...payload }, {
        onSuccess: () => {
          toast.success(existingContract?.contract?.status === "approved" ? "تم حفظ التعديلات بنجاح" : "تم حفظ المسودة بنجاح");
          setIsSavingDraft(false);
          updateSavedSnapshot();
        },
        onError: (err: any) => {
          toast.error(err.message || "حدث خطأ أثناء حفظ المسودة");
          setIsSavingDraft(false);
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: (data: any) => {
          toast.success("تم حفظ المسودة بنجاح");
          setIsSavingDraft(false);
          updateSavedSnapshot();
          if (data?.id) {
            setCreatedDraftId(data.id);
            window.history.replaceState(null, "", `/contracts/${data.id}/edit`);
          }
        },
        onError: (err: any) => {
          toast.error(err.message || "حدث خطأ أثناء حفظ المسودة");
          setIsSavingDraft(false);
        }
      });
    }
  };

  const templates = templatesData || [];

  // خطوات النموذج
  const steps = [
    { id: 1, title: "القالب", icon: FileText },
    { id: 2, title: "الطرف الثاني", icon: Building2 },
    { id: 3, title: "التفاصيل", icon: SaudiRiyal },
    { id: 4, title: "الدفعات", icon: Calendar },
    { id: 5, title: "البنود", icon: Edit },
    { id: 6, title: "البنود المخصصة", icon: Plus },
    { id: 7, title: "المراجعة", icon: Eye },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* العنوان */}
        <div className="flex items-center gap-3 sm:gap-4 text-right">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/contracts')} 
            className="rounded-full hover:bg-slate-100 transition-colors shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            title="الرجوع إلى العقود"
          >
            <ArrowRight className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEditMode ? "تعديل العقد" : "إنشاء عقد جديد"}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {isEditMode 
                ? "تعديل بيانات العقد الحالي" 
                : "إنشاء عقد باستخدام قالب مع إمكانية التخصيص والحفظ كمسودة"
              }
            </p>
          </div>
        </div>

        {/* بطاقة معلومات الطلب عند وجود effectiveRequestId */}
        {effectiveRequestId && isLoadingRequest && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جاري تحميل بيانات الطلب...</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {effectiveRequestId && !isLoadingRequest && requestDetails && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                معلومات الطلب المرتبط
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">رقم الطلب:</span>
                  <p className="font-semibold text-blue-900">{requestDetails.requestNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">المسجد:</span>
                  <p className="font-semibold text-blue-900">{requestDetails.mosque?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">المبلغ المعتمد:</span>
                  <p className="font-semibold text-blue-900 inline-flex items-center gap-1">
                    {contractData.totalValue > 0 
                      ? <>{contractData.totalValue.toLocaleString('ar-SA')} <SaudiRiyal className="w-3.5 h-3.5 inline" /></>
                      : "لم يتم التحديد"}
                  </p>
                  {(allApprovedQuotations.length > 1 || rawApprovedQuotations.length > 1) && (
                    <span className="block text-[11px] text-muted-foreground font-medium">
                      (خاص بالمورد المحدد من إجمالي الطلب)
                    </span>
                  )}
                </div>
              </div>
              {!isSedanaProgram && requestDetails.project && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">المشروع:</span>
                    <span className="font-medium text-blue-900">
                      {requestDetails.project.projectNumber} - {requestDetails.project.name}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* تنبيه إذا كان طلب سدانة لم ينتقل بعد لمرحلة التشغيل والتنفيذ */}
        {isSedanaNotReadyForContract && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">تنبيه: الطلب لم يصل بعد إلى مرحلة التشغيل والتنفيذ</span>
              <span className="text-xs text-amber-700 dark:text-amber-300">
                طلب سدانة حالياً في مرحلة "{(requestDetails as any).currentStage === 'contracting' ? 'اعتماد نوع التوريد' : (requestDetails as any).currentStage}". يرجى استكمال خطة التوريد والانتقال لمرحلة "التشغيل والتنفيذ" قبل إبرام العقود.
              </span>
            </div>
          </div>
        )}

        {/* بطاقة اختيار المورد لعقود سدانة متعددة الموردين */}
        {effectiveRequestId && allApprovedQuotations.length > 0 && (rawApprovedQuotations.length > 1 || allApprovedQuotations.length > 1 || !!sedanaProcurementData) && (
          <Card className="border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50/70 via-slate-50/50 to-teal-50/60 dark:from-emerald-950/20 dark:to-slate-900/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      عروض الأسعار المعتمدة للطلب (عقود سدانة للموردين)
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-bold text-xs">
                        {allApprovedQuotations.length === 1 ? "مورد واحد معتمد للعقد" : `${allApprovedQuotations.length} موردين معتمدين للعقود`}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {allApprovedQuotations.length > 1
                        ? "تمت ترسية بنود هذا الطلب لمسار العقود على عدة موردين. يجب إنشاء عقد مستقل لكل مورد بقيمة البنود المعتمدة له."
                        : "المورد المعتمد لمسار عقود التوريد والخدمات وفقاً لجدول تأمين الطلب."}
                    </CardDescription>
                  </div>
                </div>

                {requestContractsList.length > 0 && (
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-200">
                    تم إنشاء {requestContractsList.length} من أصل {allApprovedQuotations.length} عقود
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allApprovedQuotations.map((quotation: any) => {
                  const sId = quotation.supplierId;
                  const sObj = suppliersList.find((s: any) => s.id === sId);
                  const sName = quotation.supplierName || sObj?.name || `مورد رقم ${sId}`;
                  const qAmount = parseFloat(quotation.approvedAmount || quotation.negotiatedAmount || quotation.finalAmount || quotation.totalAmount || "0");
                  const existingContract = requestContractsList.find((c: any) => c.supplierId === sId);
                  const isSelected = contractData.supplierId === sId;

                  let itemsCount = 0;
                  if (Array.isArray(quotation.items)) {
                    itemsCount = quotation.items.length;
                  } else if (typeof quotation.items === "string") {
                    try {
                      itemsCount = JSON.parse(quotation.items).length;
                    } catch (e) {
                      itemsCount = 1;
                    }
                  }

                  return (
                    <div
                      key={`vendor-card-${sId || quotation.id}`}
                      onClick={() => handleSelectVendorForContract(quotation, existingContract)}
                      className={cn(
                        "p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3",
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/20"
                          : "border-border bg-background/80 hover:border-emerald-400 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-foreground">{sName}</span>
                            {isSelected && (
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 flex items-center gap-1">
                                <Check className="w-3 h-3" /> المورد المحدد
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {itemsCount > 0 && <span>عدد البنود المعتمدة: <strong>{itemsCount}</strong></span>}
                            {sObj?.phone && <span>• جوال: {sObj.phone}</span>}
                          </div>
                        </div>

                        {existingContract ? (
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[11px] font-bold shrink-0",
                              existingContract.status === 'approved'
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            )}
                          >
                            {existingContract.status === 'approved' ? 'عقد معتمد' : 'مسودة عقد'} ({existingContract.contractNumber})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-bold shrink-0">
                            بانتظار إنشاء العقد
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <div className="text-xs font-semibold text-muted-foreground">
                          قيمة الترسية: <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400">{qAmount.toLocaleString("ar-SA")} ريال</strong>
                        </div>

                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "text-xs h-7 px-3 font-bold",
                            isSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectVendorForContract(quotation, existingContract);
                          }}
                        >
                          {existingContract ? "تعديل العقد" : isSelected && !isEditMode ? "محدد للإنشاء" : "إنشاء العقد لهذا المورد"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* شريط الخطوات */}
        <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-hide flex-nowrap w-full gap-2 px-1">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center shrink-0">
                <div className="flex flex-col items-center min-w-[60px] shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      isActive ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-1 mx-1 shrink-0 ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* محتوى الخطوات */}
        <Card>
          <CardContent className="pt-6">
            {isEditMode && (isLoadingContract || !editDataLoaded) ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium text-sm">جاري تحميل بيانات العقد للمراجعة والتعديل...</p>
              </div>
            ) : (
              <>
            {/* الخطوة 1: اختيار القالب */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>قالب العقد *</Label>
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>لا توجد قوالب عقود</p>
                      <Button
                        variant="link"
                        onClick={() => navigate("/contract-templates")}
                      >
                        إنشاء قالب جديد
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((template: any) => (
                        <div
                          key={template.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            contractData.templateId === template.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-400"
                          }`}
                          onClick={() => {
                            if (contractData.templateId !== template.id) {
                              setContractData({ ...contractData, templateId: template.id });
                              setSelectedTemplateChanged(true);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3 justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`p-2 rounded-lg shrink-0 ${
                                contractData.templateId === template.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-gray-100"
                              }`}>
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <h3 className="font-medium truncate">{template.nameAr || template.name}</h3>
                                <p className="text-sm text-muted-foreground truncate">{template.description || "لا يوجد وصف"}</p>
                                <Badge variant="outline" className="mt-2">
                                  {template.type === "supply" ? "توريد" :
                                   template.type === "construction" ? "مقاولات" :
                                   template.type === "supervision" ? "إشراف" :
                                   template.type === "maintenance" ? "صيانة" :
                                   template.type === "services" ? "خدمات" : template.type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1.5 self-stretch shrink-0">
                              {contractData.templateId === template.id && (
                                <Check className="h-5 w-5 text-primary shrink-0" />
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentPath = window.location.pathname + window.location.search;
                                  navigate(`/contract-templates/${template.id}/preview?backUrl=${encodeURIComponent(currentPath)}`);
                                }}
                                title="معاينة القالب"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* اختيار مفوض التوقيع */}
                <div className="space-y-2">
                  <Label>مفوض التوقيع (الطرف الأول) *</Label>
                  <Select
                    value={contractData.signatoryId?.toString() || ""}
                    onValueChange={(value) => setContractData({ 
                      ...contractData, 
                      signatoryId: value ? parseInt(value) : null 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مفوض التوقيع" />
                    </SelectTrigger>
                    <SelectContent>
                      {signatoriesData?.map((signatory: any) => (
                        <SelectItem key={signatory.id} value={signatory.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{signatory.name}</span>
                            <span className="text-muted-foreground">- {signatory.title}</span>
                            {signatory.isDefault && (
                              <Badge variant="secondary" className="mr-2">افتراضي</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    الشخص المفوض بالتوقيع على العقد من جهة الجمعية
                  </p>
                </div>

                {/* إظهار المشروع المرتبط بالطلب أو اختيار مشروع (يتم إخفاؤه في برنامج سدانة) */}
                {!isSedanaProgram && (
                  (effectiveRequestId && requestDetails?.project?.id) || (isEditMode && contractData.projectId) ? (
                    // عند وجود طلب مرتبط بمشروع أو في وضع التعديل، نعرض المشروع كقيمة ثابتة
                    <div className="space-y-2">
                      <Label>{effectiveRequestId ? "المشروع المرتبط" : "المشروع"}</Label>
                      <div className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {effectiveRequestId && requestDetails?.project ? (
                            <>
                              <span className="font-medium">
                                {requestDetails.project.projectNumber}
                              </span>
                              <span className="text-muted-foreground">-</span>
                              <span>
                                {requestDetails.project.name}
                              </span>
                            </>
                          ) : (
                            // في وضع التعديل، نبحث عن اسم المشروع من البيانات المجلوبة بالمعرف
                            (() => {
                              const project = projectDetails || requestDetails?.project;
                              return (
                                <>
                                  <span className="font-medium">
                                    {project?.projectNumber || "-"}
                                  </span>
                                  <span className="text-muted-foreground">-</span>
                                  <span>
                                    {project?.name || "-"}
                                  </span>
                                </>
                              );
                            })()
                          )}
                        </div>
                        {effectiveRequestId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            هذا العقد مرتبط بالطلب رقم {requestDetails?.requestNumber}
                          </p>
                        )}
                        {isEditMode && !effectiveRequestId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            لا يمكن تغيير المشروع بعد إنشاء العقد.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // عند عدم وجود طلب، نعرض اسم المشروع المحدد أو قيمة فارغة
                    <div className="space-y-2">
                      <Label>المشروع</Label>
                      <Input 
                        value={projectDetails ? `${projectDetails.projectNumber} - ${projectDetails.name}` : "بدون مشروع"} 
                        readOnly 
                        className="bg-muted" 
                      />
                    </div>
                  )
                )}
              </div>
            )}

            {/* الخطوة 2: الطرف الثاني (اختيار المورد) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2 text-right" dir="rtl">
                  <Label className="text-sm font-bold">المورد (الطرف الثاني) *</Label>
                  {hasApprovedSupplier ? (
                    <Input
                      value={selectedSupplier?.name || approvedSupplierQuotation?.supplierName || ""}
                      readOnly
                      className="bg-muted font-bold cursor-not-allowed text-foreground"
                    />
                  ) : (
                    <Select
                      value={contractData.supplierId?.toString() || ""}
                      onValueChange={(val) => {
                        const suppId = parseInt(val);
                        setContractData(prev => ({
                          ...prev,
                          supplierId: suppId,
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm font-medium">
                        <SelectValue placeholder="اختر المورد (الطرف الثاني) المراد إصدار العقد له..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="text-right">
                        {suppliersList.map((supp: any) => (
                          <SelectItem key={`all-supp-${supp.id}`} value={String(supp.id)} className="text-sm cursor-pointer">
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span>{supp.name}</span>
                              {supp.commercialRegister && (
                                <span className="text-xs text-muted-foreground">س.ت: {supp.commercialRegister}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedSupplier && (
                  <Card className="bg-muted/50 border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        بيانات المورد المختار (الطرف الثاني)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">اسم المورد:</span>
                        <span className="mr-2 font-bold text-foreground">{selectedSupplier.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">السجل التجاري:</span>
                        <span className="mr-2 font-bold text-foreground">{selectedSupplier.commercialRegister || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المسؤول:</span>
                        <span className="mr-2 font-bold text-foreground">{selectedSupplier.contactPerson || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">رقم الجوال:</span>
                        <span className="mr-2 font-bold text-foreground">{selectedSupplier.phone || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البريد الإلكتروني:</span>
                        <span className="mr-2 font-bold text-foreground">{selectedSupplier.email || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">العنوان:</span>
                        <span className="mr-2 font-bold text-foreground">{selectedSupplier.address || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* الخطوة 3: تفاصيل العقد */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>موضوع العقد *</Label>
                  <Input
                    value={contractData.subject}
                    onChange={(e) => setContractData({ ...contractData, subject: e.target.value })}
                    placeholder="مثال: توريد مواد بناء لمشروع ترميم مسجد..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>وصف العقد</Label>
                  <Textarea
                    value={contractData.description}
                    onChange={(e) => setContractData({ ...contractData, description: e.target.value })}
                    placeholder="وصف تفصيلي للعقد..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>مدة العقد *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={contractData.duration || ""}
                      onChange={(e) => setContractData({ 
                        ...contractData, 
                        duration: parseInt(e.target.value) || 0 
                      })}
                      placeholder="المدة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>وحدة المدة</Label>
                    <Select
                      value={contractData.durationUnit}
                      onValueChange={(value) => setContractData({ ...contractData, durationUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ البدء (ميلادي) *</Label>
                    <Input
                      type="date"
                      value={contractData.startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContractData(prev => ({
                          ...prev,
                          startDate: val,
                          startDateHijri: val ? toHijriDate(val) : prev.startDateHijri
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ البدء (هجري)</Label>
                    <HijriDateInput
                      value={contractData.startDateHijri}
                      onChange={(formatted) => setContractData(prev => ({ ...prev, startDateHijri: formatted }))}
                    />
                  </div>
                </div>

                {/* التفاصيل المالية */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      القيمة المتفقة مع المورد (<SaudiRiyal className="w-3.5 h-3.5" />) *
                      {hasApprovedSupplier && (
                        <span className="text-[11px] font-normal text-muted-foreground mr-1">
                          (معتمدة من عرض السعر)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={contractData.totalValue || ""}
                      disabled={hasApprovedSupplier}
                      readOnly={hasApprovedSupplier}
                      onChange={(e) => {
                        if (hasApprovedSupplier) return;
                        const val = parseFloat(e.target.value) || 0;
                        setContractData(prev => {
                          const mgmtAmt = prev.managementFeeType === "fixed"
                            ? prev.managementAmount
                            : (val * prev.managementPercentage) / 100;
                          const mgmtPct = val > 0 && mgmtAmt > 0 ? Number(((mgmtAmt / val) * 100).toFixed(2)) : prev.managementPercentage;
                          return { 
                            ...prev, 
                            totalValue: val,
                            baseValue: val,
                            managementAmount: mgmtAmt,
                            managementPercentage: mgmtPct,
                            supportedAmount: prev.supportType === "full" ? val : prev.supportedAmount
                          };
                        });
                        setPaymentSchedule(prev => recalculateScheduleWithCumulativeCompletion(prev, val));
                      }}
                      placeholder="أدخل القيمة المتفق عليها"
                      className={cn(
                        "font-bold text-green-700 font-sans",
                        hasApprovedSupplier && "bg-muted cursor-not-allowed opacity-90"
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>نسبة الجمعية (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={contractData.managementPercentage || ""}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        setContractData(prev => {
                          const mgmtAmt = (prev.totalValue * percentage) / 100;
                          return { 
                            ...prev, 
                            managementPercentage: percentage,
                            managementAmount: mgmtAmt,
                            managementFeeType: "percentage",
                            supportedAmount: prev.supportType === "full" ? prev.totalValue : prev.supportedAmount
                          };
                        });
                      }}
                      placeholder="0"
                      className="font-sans"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">قيمة الجمعية (<SaudiRiyal className="w-3.5 h-3.5" />)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={contractData.managementAmount || ""}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const amount = valStr === "" ? 0 : (parseFloat(valStr) || 0);
                        setContractData(prev => {
                          const percentage = prev.totalValue > 0 ? Number(((amount / prev.totalValue) * 100).toFixed(2)) : prev.managementPercentage;
                          return {
                            ...prev,
                            managementAmount: amount,
                            managementPercentage: percentage,
                            managementFeeType: "fixed",
                            supportedAmount: prev.supportType === "full" ? prev.totalValue : prev.supportedAmount
                          };
                        });
                      }}
                      placeholder="أدخل قيمة الجمعية"
                      className="font-semibold text-right font-sans"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">القيمة الكلية (<SaudiRiyal className="w-3.5 h-3.5" />)</Label>
                    <Input
                      type="text"
                      disabled
                      value={contractData.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      className="bg-blue-50 text-blue-900 border-blue-200 font-bold text-right font-sans"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* الخطوة 4: آلية الدفعات والمستخلصات */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* اختيار نظام الدفعات أو المستخلصات */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">آلية استحقاق وصرف مستحقات العقد</h4>
                      <p className="text-xs text-muted-foreground">اختر كيف سيتم التعامل مع دفعات ومستخلصات هذا العقد</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {/* خيار 1: نظام الدفعات المجدولة */}
                    <div 
                      onClick={() => setPaymentSystem("installments")}
                      className={cn(
                        "cursor-pointer p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-right",
                        paymentSystem === "installments"
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:border-muted-foreground/30 bg-card"
                      )}
                    >
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>📅 نظام الدفعات المجدولة</span>
                      </span>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mr-2",
                        paymentSystem === "installments" ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                      )}>
                        {paymentSystem === "installments" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    {/* خيار 2: نظام المستخلصات بحسب الإنجاز */}
                    <div 
                      onClick={() => setPaymentSystem("milestones")}
                      className={cn(
                        "cursor-pointer p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-right",
                        paymentSystem === "milestones"
                          ? "border-emerald-600 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20"
                          : "border-border hover:border-muted-foreground/30 bg-card"
                      )}
                    >
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>🏗️ نظام المستخلصات بحسب الإنجاز</span>
                      </span>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mr-2",
                        paymentSystem === "milestones" ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40"
                      )}>
                        {paymentSystem === "milestones" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* بطاقة تحديد خيار الدفعة الختامية (تظهر لنظام الدفعات ونظام المستخلصات) بتصميم أنيق وعصري */}
                {(paymentSystem === "installments" || paymentSystem === "milestones") && (
                  <div 
                    onClick={() => handleToggleFinalPayment(!hasFinalPayment)}
                    className={cn(
                      "cursor-pointer p-4 rounded-2xl border transition-all flex items-start sm:items-center justify-between gap-4 text-right select-none",
                      hasFinalPayment
                        ? "border-amber-400/50 bg-amber-500/[0.04] dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-400/20"
                        : "border-border/80 hover:border-amber-500/30 bg-card hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 sm:mt-0",
                        hasFinalPayment 
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            هل يتضمن جدول الدفعات دفعة ختامية؟
                          </span>
                          {hasFinalPayment ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[11px] font-semibold">
                              {paymentSystem === "installments"
                                ? "✓ مفعّل: اكتمال الإنجاز 100% في الدفعة قبل الأخيرة"
                                : "✓ مفعّل: يتضمن دفعة ختامية مستقلة"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
                              {paymentSystem === "installments"
                                ? "غير مفعّل: اكتمال الإنجاز 100% في الدفعة الأخيرة"
                                : "غير مفعّل: بدون دفعة ختامية"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {paymentSystem === "installments"
                            ? "عند تفعيل هذا الخيار، تكون الدفعة الأخيرة دفعة ختامية غير مرتبطة بنسبة إنجاز، ويتحول شرط اكتمال نسبة الإنجاز التراكمية (100%) تلقائياً إلى الدفعة قبل الأخيرة."
                            : "عند تفعيل هذا الخيار، يتضمن العقد دفعة ختامية مستقلة غير مرتبطة بنسبة إنجاز، تُصرف كدفعة نهائية بعد استكمال إنجاز كافة أعمال المشروع ومستخلصاته بنسبة 100%."}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 sm:pt-0 shrink-0 mr-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={hasFinalPayment}
                        onCheckedChange={(checked) => handleToggleFinalPayment(Boolean(checked))}
                        className="h-5 w-5 rounded-md data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 focus-visible:ring-amber-500/30"
                      />
                    </div>
                  </div>
                )}

                {/* في حال اختيار نظام المستخلصات: إخفاء جدول الدفعات وعرض بطاقة معلومات توضيحية */}
                {paymentSystem === "milestones" && (
                  <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 p-5 rounded-2xl">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 mt-0.5">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5 text-right flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                            نظام المستخلصات بحسب الإنجاز الفعلي
                          </h4>
                          {hasFinalPayment && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold">
                              🏆 يتضمن دفعة ختامية مستقلة
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          في نظام المستخلصات، لا يتم تحديد أو جدولة مستخلصات مسبقة أثناء إنشاء العقد. يتم تقديم المستخلصات وصرفها لاحقاً وبشكل مرن بناءً على نسب الإنجاز الفعلية والمراحل المنجزة في المشروع.
                        </p>
                        {hasFinalPayment && (
                          <div className="text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 font-medium">
                            ✓ تم اعتماد دفعة ختامية للعقد: تصرف كدفعة نهائية عند التسليم بعد اكتمال أعمال المشروع ومستخلصاته بنسبة 100%.
                          </div>
                        )}
                        <div className="pt-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                          <span>✓ يمكنك المتابعة للخطوة التالية مباشرة دون الحاجة لجدولة أي مستخلصات.</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* في حال عدم اختيار آلية الاستحقاق بعد */}
                {!paymentSystem && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl space-y-1">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-foreground">لم يتم اختيار آلية الاستحقاق بعد</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">يرجى اختيار آلية الاستحقاق (دفعات أو مستخلصات) من الخيارات أعلاه للمتابعة</p>
                  </div>
                )}

                {/* في حال اختيار نظام الدفعات: يظهر جدول الدفعات المجدولة */}
                {paymentSystem === "installments" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          <span>جدول الدفعات</span>
                          {isSedanaProgram && (
                            <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-xs">
                              برنامج سدانة - ربط البنود التوريدية
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isSedanaProgram
                            ? "حدد الدفعات واربط كل دفعة بالأصناف أو البنود الموردة خلالها لتسهيل الربط بأمر الإدخال المستودعي لاحقاً"
                            : "حدد الدفعات ومواعيدها وقيمها"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button" 
                          onClick={() => {
                            setPaymentSchedule(prev => sortPaymentsByDate(prev));
                            toast.success("تم ترتيب الجدول حسب التاريخ بنجاح");
                          }} 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          ترتيب حسب التاريخ
                        </Button>
                        <Button 
                          onClick={addPayment} 
                          variant="outline"
                          size="sm" 
                          className="rounded-xl"
                        >
                          <Plus className="h-4 w-4 ml-1.5" />
                          إضافة دفعة
                        </Button>
                      </div>
                    </div>

                {/* لوحة استعراض بنود العقد والكميات المتفق عليها - تظهر لبرامج سدانة */}
                {isSedanaProgram && availableContractItems.length > 0 && (
                  <Card className="bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50 p-4 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-sky-600" />
                        <div>
                          <h4 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                            بنود العقد المعتمدة
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            البنود المعتمدة في هذا العقد وحصصها المتفق عليها
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 border-sky-300 text-sky-800 dark:text-sky-300 font-bold text-xs">
                        {availableContractItems.length} بنود في العقد
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {availableContractItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-sky-200/80 bg-white dark:bg-slate-900/90 text-xs flex items-center justify-between gap-2"
                        >
                          <span className="truncate max-w-[160px] font-semibold text-foreground">{item.itemName}</span>
                          {(item as any).agreedPeriodicLabel ? (
                            <Badge variant="outline" className="bg-sky-100/70 dark:bg-sky-900/50 text-sky-900 dark:text-sky-300 border-sky-300 text-[10px] py-0 px-2 h-5 font-semibold shrink-0">
                              {(item as any).agreedPeriodicLabel}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 shrink-0">
                              {item.unit}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                    {paymentSchedule.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg space-y-1">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-foreground">لم يتم إضافة دفعات بعد</p>
                        <p className="text-sm">يمكنك تخطي هذه الخطوة إذا لم تكن هناك دفعات محددة</p>
                      </div>
                    ) : (
                  <div className="space-y-4">
                    {paymentSchedule.map((payment, index) => {
                      const agreedAmt = Number(payment.agreedAmount || payment.amount || 0);
                      const paidAmt = Number(payment.paidAmount || 0);
                      const isPaid = Boolean(payment.isPaid || payment.status === "paid" || payment.status === "partially_paid" || paidAmt > 0);
                      const isPartiallyPaid = Boolean(payment.isPartiallyPaid || payment.status === "partially_paid" || (paidAmt > 0 && paidAmt < agreedAmt));

                      const prevPayment = index > 0 ? paymentSchedule[index - 1] : null;
                      const nextPayment = index < paymentSchedule.length - 1 ? paymentSchedule[index + 1] : null;
                      const prevPaymentDate = prevPayment?.dueDate || undefined;
                      const nextPaymentDate = nextPayment?.dueDate || undefined;

                      const isLastPayment = index === paymentSchedule.length - 1;
                      const isPenultimatePayment = index === paymentSchedule.length - 2;
                      const isFinalClosingPayment = hasFinalPayment && isLastPayment && paymentSchedule.length >= 2;
                      const isPenultimateClosingWork = hasFinalPayment && isPenultimatePayment && paymentSchedule.length >= 2;

                      return (
                      <React.Fragment key={payment.id}>
                        {index > 0 && (
                          <div className="flex items-center justify-center my-2 py-1 group">
                            <div className="h-[1px] flex-1 bg-border/60 group-hover:bg-primary/40 transition-all" />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => insertPaymentAt(index)}
                              className="mx-3 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 rounded-full h-7 px-3.5 flex items-center gap-1.5 shadow-2xs transition-all bg-background"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>
                                إدراج دفعة بين الدفعة {index} والدفعة {index + 1}
                              </span>
                            </Button>
                            <div className="h-[1px] flex-1 bg-border/60 group-hover:bg-primary/40 transition-all" />
                          </div>
                        )}
                        <Card 
                          className={cn(
                            "p-4 sm:p-5 relative transition-all rounded-2xl border", 
                            isPaid 
                              ? (isPartiallyPaid
                                  ? "bg-amber-50/75 dark:bg-amber-950/25 border-2 border-amber-500/60 shadow-sm"
                                  : "bg-emerald-50/75 dark:bg-emerald-950/25 border-2 border-emerald-500/60 shadow-sm")
                              : isFinalClosingPayment
                                ? "bg-amber-500/[0.02] border-amber-400/40 shadow-2xs"
                                : isPenultimateClosingWork
                                  ? "bg-purple-500/[0.015] border-purple-400/30 shadow-2xs"
                                  : "bg-card border-border/70"
                          )}
                        >
                          {isPaid && (
                            <div 
                              className={cn(
                                "flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold w-fit mb-3 border",
                                isPartiallyPaid
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
                                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                              )}
                            >
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {isPartiallyPaid 
                                  ? "دفعة مسددة جزئياً (مقفلة وغير قابلة للتعديل أو الحذف)" 
                                  : "دفعة مسددة بالكامل (مقفلة وغير قابلة للتعديل أو الحذف)"}
                              </span>
                              <span className="bg-background/90 dark:bg-background/60 px-2 py-0.5 rounded shadow-xs font-semibold text-foreground">
                                المتفق: {agreedAmt.toLocaleString()} ر.س
                              </span>
                              {paidAmt > 0 && (
                                <span className={cn(
                                  "px-2 py-0.5 rounded shadow-xs font-bold",
                                  isPartiallyPaid
                                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100"
                                    : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100"
                                )}>
                                  المسدد: {paidAmt.toLocaleString()} ر.س
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-col md:flex-row items-start gap-4">
                            <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:justify-start gap-2 text-muted-foreground border-b md:border-0 pb-2 md:pb-0 mb-2 md:mb-0">
                              <div className="flex items-start gap-2">
                                {!isPaid && <GripVertical className="h-5 w-5 hidden md:block mt-0.5 text-muted-foreground/50 shrink-0" />}
                                {isPaid && <Lock className="h-4 w-4 hidden md:block text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
                                <div className="flex flex-col items-start gap-1">
                                  <span className={cn(
                                    "font-bold text-sm sm:text-base leading-tight",
                                    isFinalClosingPayment ? "text-amber-800 dark:text-amber-300" : isPenultimateClosingWork ? "text-purple-800 dark:text-purple-300" : "text-primary md:text-foreground"
                                  )}>
                                    الدفعة {index + 1}
                                  </span>
                                  {isFinalClosingPayment && (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold py-0.5 px-2">
                                      🏆 الدفعة الختامية
                                    </Badge>
                                  )}
                                  {isPenultimateClosingWork && (
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold py-0.5 px-2">
                                      🎯 اكتمال الأعمال (100%)
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {!isPaid && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePayment(payment.id)}
                                  className="text-destructive h-8 w-8 p-0 md:hidden"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="flex-1 space-y-4 w-full">
                              {/* الصف الأول: معلومات الدفعة والقيم المالية */}
                              <div className="grid gap-3.5 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                                {/* الحقل الأول: قيمة الدفعة (مبلغ مالي) */}
                                <div className={cn(
                                  "p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2",
                                  isPaid
                                    ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                                    : isFinalClosingPayment
                                      ? "bg-amber-500/[0.03] border-amber-500/20 dark:bg-amber-950/15"
                                      : "bg-emerald-500/[0.03] border-emerald-500/20 dark:bg-emerald-950/15 dark:border-emerald-500/20"
                                )}>
                                  <Label className={cn(
                                    "text-xs font-semibold flex items-center gap-1.5",
                                    isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                                  )}>
                                    <SaudiRiyal className={cn(
                                      "w-3.5 h-3.5 shrink-0",
                                      isFinalClosingPayment ? "text-amber-600/80 dark:text-amber-400/80" : "text-emerald-600/80 dark:text-emerald-400/80"
                                    )} />
                                    <span>
                                      {isPaid 
                                        ? (isPartiallyPaid ? "قيمة الدفعة (مبلغ مالي) - المتفق عليه" : "قيمة الدفعة (مبلغ مالي) - المسدد") 
                                        : isFinalClosingPayment
                                          ? "قيمة الدفعة الختامية (مبلغ مالي) *"
                                          : "قيمة الدفعة (مبلغ مالي) *"}
                                    </span>
                                  </Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={payment.amount || ""}
                                      disabled={isPaid || isPenultimateClosingWork}
                                      readOnly={isPenultimateClosingWork}
                                      required
                                      className={cn(
                                        "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all", 
                                        isPaid 
                                          ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner" 
                                          : isPenultimateClosingWork
                                            ? "bg-purple-500/[0.04] border-purple-500/30 text-purple-900 dark:text-purple-200 cursor-not-allowed"
                                            : "bg-background border-border/80 text-foreground focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/15 shadow-2xs"
                                      )}
                                      onChange={(e) => {
                                        if (isPaid || isPenultimateClosingWork) return;
                                        const val = parseFloat(e.target.value) || 0;
                                        handlePaymentAmountChange(payment.id, val);
                                      }}
                                      placeholder="0.00"
                                    />
                                    <SaudiRiyal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/60 dark:text-emerald-400/60 pointer-events-none" />
                                  </div>
                                  {isPenultimateClosingWork && (
                                    <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold pt-0.5">
                                      محسوبة تلقائياً لتغطية باقي قيمة أعمال المشروع (لتصبح 100%)
                                    </p>
                                  )}
                                  {isPartiallyPaid && paidAmt > 0 && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold pt-0.5">
                                      المبلغ المسدد الفعلي: {paidAmt.toLocaleString()} ر.س
                                    </p>
                                  )}
                                </div>

                                {/* الحقل الثاني: قيمة الدفعة (نسبة مئوية) */}
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
                                      value={payment.percentage || ""}
                                      disabled={isPaid || isPenultimateClosingWork}
                                      readOnly={isPenultimateClosingWork}
                                      required
                                      className={cn(
                                        "w-full rounded-xl font-bold font-sans text-base pl-3 pr-8 transition-all", 
                                        isPaid 
                                          ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner" 
                                          : isPenultimateClosingWork
                                            ? "bg-purple-500/[0.04] border-purple-500/30 text-purple-900 dark:text-purple-200 cursor-not-allowed"
                                            : "bg-background border-border/80 text-foreground focus-visible:border-blue-500/40 focus-visible:ring-blue-500/15 shadow-2xs"
                                      )}
                                      onChange={(e) => {
                                        if (isPaid || isPenultimateClosingWork) return;
                                        const pct = parseFloat(e.target.value) || 0;
                                        handlePaymentPercentageChange(payment.id, pct);
                                      }}
                                      placeholder="0"
                                      min="0"
                                      max="100"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600/60 dark:text-blue-400/60 font-bold text-xs pointer-events-none">
                                      %
                                    </span>
                                  </div>
                                </div>

                                {/* الحقل الثالث: عنوان طلب الصرف */}
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
                                    value={payment.name}
                                    disabled={isPaid}
                                    required
                                    className={cn(
                                      "w-full rounded-xl font-medium transition-all", 
                                      isPaid 
                                        ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                                        : "bg-background border-border/80 text-foreground focus-visible:border-indigo-500/40 focus-visible:ring-indigo-500/15 shadow-2xs"
                                    )}
                                    onChange={(e) => {
                                      if (isPaid) return;
                                      updatePayment(payment.id, "name", e.target.value);
                                    }}
                                    placeholder="مثال: الدفعة الأولى"
                                  />
                                </div>

                                {/* الحقل الرابع: التاريخ الميلادي */}
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
                                    value={payment.dueDate}
                                    disabled={isPaid}
                                    required
                                    className={cn(
                                      "w-full rounded-xl font-sans transition-all", 
                                      isPaid 
                                        ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                                        : "bg-background border-border/80 text-foreground focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15 shadow-2xs"
                                    )}
                                    onChange={(e) => {
                                      if (isPaid) return;
                                      const selectedDate = e.target.value;

                                      // التحقق من ألا يكون التاريخ قبل تاريخ العقد
                                      if (contractData.startDate && selectedDate < contractData.startDate) {
                                        toast.error(`لا يمكن وضع تاريخ الدفعة قبل تاريخ العقد (${contractData.startDate})`);
                                        return;
                                      }

                                      // التحقق من ألا يكون التاريخ قبل تاريخ الدفعة السابقة
                                      if (prevPaymentDate && selectedDate < prevPaymentDate) {
                                        toast.error(`لا يمكن وضع تاريخ الدفعة ${index + 1} قبل تاريخ الدفعة السابقة (${prevPayment?.name || `الدفعة ${index}`}: ${prevPaymentDate})`);
                                        return;
                                      }

                                      // التحقق من ألا يتجاوز التاريخ تاريخ الدفعة التالية إن وجدت
                                      if (nextPaymentDate && selectedDate > nextPaymentDate) {
                                        toast.error(`لا يمكن وضع تاريخ الدفعة ${index + 1} بعد تاريخ الدفعة التالية (${nextPayment?.name || `الدفعة ${index + 2}`}: ${nextPaymentDate})`);
                                        return;
                                      }

                                      // التحقق من ألا يتجاوز التاريخ نهاية العقد
                                      if (contractData.startDate && contractData.duration > 0) {
                                        const startDate = new Date(contractData.startDate);
                                        const endDate = new Date(contractData.startDate);
                                        
                                        if (contractData.durationUnit === "days") {
                                          endDate.setDate(endDate.getDate() + contractData.duration);
                                        } else if (contractData.durationUnit === "weeks") {
                                          endDate.setDate(endDate.getDate() + (contractData.duration * 7));
                                        } else if (contractData.durationUnit === "months") {
                                          endDate.setMonth(endDate.getMonth() + contractData.duration);
                                        } else if (contractData.durationUnit === "years") {
                                          endDate.setFullYear(endDate.getFullYear() + contractData.duration);
                                        }
                                        
                                        const selected = new Date(selectedDate);
                                        if (selected > endDate) {
                                          toast.error(`تاريخ الدفعة يتجاوز تاريخ نهاية العقد (${endDate.toLocaleDateString('ar-SA')})`);
                                          return;
                                        }
                                      }
                                      updatePayment(payment.id, "dueDate", selectedDate);
                                    }}
                                    onBlur={() => {
                                      setPaymentSchedule(prev => sortPaymentsByDate(prev));
                                    }}
                                    min={prevPaymentDate || contractData.startDate || undefined}
                                    max={nextPaymentDate || (() => {
                                      if (!contractData.startDate || contractData.duration <= 0) return undefined;
                                      const endDate = new Date(contractData.startDate);
                                      if (contractData.durationUnit === "days") {
                                        endDate.setDate(endDate.getDate() + contractData.duration);
                                      } else if (contractData.durationUnit === "weeks") {
                                        endDate.setDate(endDate.getDate() + (contractData.duration * 7));
                                      } else if (contractData.durationUnit === "months") {
                                        endDate.setMonth(endDate.getMonth() + contractData.duration);
                                      } else if (contractData.durationUnit === "years") {
                                        endDate.setFullYear(endDate.getFullYear() + contractData.duration);
                                      }
                                      return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(endDate);
                                    })()}
                                  />
                                </div>
                              </div>

                              {/* الصف الثاني: تفاصيل الأعمال المطلوبة ونسبة الإنجاز التراكمية لتفعيل الدفعة */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 w-full">
                                {/* الحقل الخامس: وصف الأعمال التي سوف تُنفّذ */}
                                <div className={cn(
                                  "p-3 rounded-xl border transition-all md:col-span-2 lg:col-span-2 flex flex-col justify-between space-y-2 text-right",
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
                                    value={payment.description || ""}
                                    disabled={isPaid}
                                    required
                                    placeholder="وصف تفصيلي للأعمال التي سوف تُنفّذ لإطلاق وصرف هذه الدفعة..."
                                    rows={3}
                                    className={cn(
                                      "w-full rounded-xl text-right font-medium transition-all h-full min-h-[88px]", 
                                      isPaid 
                                        ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                                        : "bg-background border-border/80 text-foreground focus-visible:border-teal-500/40 focus-visible:ring-teal-500/15 shadow-2xs"
                                    )}
                                    onChange={(e) => {
                                      if (isPaid) return;
                                      updatePayment(payment.id, "description", e.target.value);
                                    }}
                                  />
                                </div>

                                {/* الحقل السادس: نسبة الإنجاز التراكمية (%) */}
                                <div className={cn(
                                  "p-3 rounded-xl border transition-all md:col-span-2 lg:col-span-2 flex flex-col justify-between space-y-2 text-right",
                                  isPaid
                                    ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                                    : isFinalClosingPayment
                                      ? "bg-amber-500/[0.03] border-amber-500/20 dark:bg-amber-950/15"
                                      : isPenultimateClosingWork
                                        ? "bg-purple-500/[0.03] border-purple-500/25 dark:bg-purple-950/20"
                                        : "bg-purple-500/[0.03] border-purple-500/20 dark:bg-purple-950/15 dark:border-purple-500/20"
                                )}>
                                  {isFinalClosingPayment ? (
                                    <div className="space-y-2.5 flex flex-col justify-between h-full">
                                      <div className="flex items-center justify-between flex-wrap gap-1">
                                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/85">
                                          <Sparkles className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0" />
                                          <span>نسبة الإنجاز: دفعة ختامية</span>
                                        </Label>
                                      </div>
                                      <div className="bg-amber-500/[0.06] dark:bg-amber-950/25 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                                          <Check className="w-4 h-4 shrink-0 text-amber-600" />
                                          <span>دفعة ختامية — غير مرتبطة بنسبة إنجاز</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                          هذه الدفعة مخصصة للصرف الختامي بعد استكمال أعمال المشروع بنسبة 100% في الدفعة السابقة، ولا تتطلب إدراج نسبة إنجاز.
                                        </p>
                                      </div>
                                    </div>
                                  ) : (() => {
                                    const cumulativeAmount = paymentSchedule.slice(0, index + 1).reduce((sum, p) => sum + getPaymentEffectiveAmount(p), 0);
                                    const prevComp = (prevPayment?.completionPercentage !== undefined && prevPayment?.completionPercentage !== null && !isNaN(Number(prevPayment.completionPercentage)))
                                      ? Number(prevPayment.completionPercentage)
                                      : null;
                                    const nextComp = (nextPayment?.completionPercentage !== undefined && nextPayment?.completionPercentage !== null && !isNaN(Number(nextPayment.completionPercentage)))
                                      ? Number(nextPayment.completionPercentage)
                                      : null;
                                    const currentComp = (payment.completionPercentage !== undefined && payment.completionPercentage !== null && !isNaN(Number(payment.completionPercentage)))
                                      ? Number(payment.completionPercentage)
                                      : null;

                                    const hasAmount = Number(payment.amount || 0) > 0 || (payment.percentage || 0) > 0;
                                    const isBelowPrev = prevComp !== null && currentComp !== null && currentComp <= prevComp && hasAmount;
                                    const isAboveNext = nextComp !== null && currentComp !== null && currentComp >= nextComp && hasAmount;
                                    const hasRedAlert = Boolean((isBelowPrev || isAboveNext) && hasAmount);
                                    const minAllowed = index === 0 ? 0 : (prevComp !== null ? prevComp + 1 : 0);
                                    const maxAllowed = nextComp !== null ? Math.max(minAllowed, nextComp - 1) : 100;
                                    const isAfter100 = prevComp !== null && prevComp >= 100 && !isFinalClosingPayment;

                                    const isExpanded = expandedGuidanceMap[payment.id] !== undefined
                                      ? expandedGuidanceMap[payment.id]
                                      : hasRedAlert;

                                    const prevName = prevPayment ? (prevPayment.name || `الدفعة ${index}`) : "";
                                    const nextName = nextPayment ? (nextPayment.name || `الدفعة ${index + 2}`) : "";

                                    return (
                                      <div className="space-y-2 flex flex-col justify-between h-full">
                                        <div className="flex items-center justify-between flex-wrap gap-1">
                                          <Label className={cn(
                                            "text-xs font-semibold flex items-center gap-1.5",
                                            isPaid ? "text-slate-600 dark:text-slate-400" : "text-foreground/85"
                                          )}>
                                            <TrendingUp className="w-3.5 h-3.5 text-purple-600/80 dark:text-purple-400/80 shrink-0" />
                                            <span>نسبة الإنجاز التراكمية (%) *</span>
                                            {isPenultimateClosingWork ? (
                                              <Badge variant="outline" className="bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold mr-1">
                                                اكتمال أعمال المشروع (100%)
                                              </Badge>
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground font-normal mr-1">(محسوبة تراكمياً بناءً على المبلغ)</span>
                                            )}
                                          </Label>
                                        </div>
                                        {isAfter100 ? (
                                          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2.5 text-xs text-destructive font-bold flex items-center gap-2 animate-in fade-in">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            <div className="space-y-0.5">
                                              <p className="font-bold">غير متاح إدراج نسبة إنجاز بعد دفعة مكتملة (100%)</p>
                                              <p className="font-normal text-[11px] text-destructive/90">
                                                الدفعة السابقة ({prevName}) بلغت نسبة إنجازها التراكمية 100%. لا يمكن إضافة دفعة بنسبة أعلى من 100%.
                                              </p>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            {/* صندوق التوضيح والشروط: قابل للطي ويكون مغلقاً تلقائياً إلا إذا كان هناك تنبيه أحمر */}
                                            {(prevComp !== null || nextComp !== null) && (
                                              <div className={cn(
                                                "rounded-xl border transition-all duration-200 overflow-hidden mb-1.5",
                                                hasRedAlert 
                                                  ? "bg-destructive/5 border-destructive/40 shadow-xs" 
                                                  : "bg-purple-500/[0.04] dark:bg-purple-950/30 border-purple-500/15 dark:border-purple-800/30"
                                              )}>
                                                <button
                                                  type="button"
                                                  onClick={() => setExpandedGuidanceMap(prev => ({ ...prev, [payment.id]: !isExpanded }))}
                                                  className={cn(
                                                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors select-none text-right font-medium",
                                                    hasRedAlert 
                                                      ? "text-destructive hover:bg-destructive/10" 
                                                      : "text-foreground/80 hover:bg-purple-500/[0.06] dark:hover:bg-purple-900/30"
                                                  )}
                                                >
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Info className={cn("w-3.5 h-3.5 shrink-0", hasRedAlert ? "text-destructive" : "text-purple-600/80 dark:text-purple-400/80")} />
                                                    <span>شروط ونطاق نسبة الإنجاز التراكمية:</span>
                                                    <span className={cn(
                                                      "font-bold px-1.5 py-0.5 rounded text-[11px] font-sans border",
                                                      hasRedAlert 
                                                        ? "bg-destructive/10 text-destructive border-destructive/30" 
                                                        : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                                                    )}>
                                                      {isPenultimateClosingWork ? "100%" : `${minAllowed}% – ${maxAllowed}%`}
                                                    </span>
                                                    {hasRedAlert && (
                                                      <span className="text-[10px] font-bold text-destructive bg-destructive/15 px-1.5 py-0.5 rounded border border-destructive/30 animate-pulse">
                                                        ⚠️ يوجد تعارض في النسبة
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-normal shrink-0 mr-1">
                                                    <span>{isExpanded ? "طي" : "عرض الشروط"}</span>
                                                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
                                                  </div>
                                                </button>

                                                {isExpanded && (
                                                  <div className={cn(
                                                    "p-2.5 pt-1.5 text-xs space-y-1 border-t animate-in fade-in duration-150",
                                                    hasRedAlert 
                                                      ? "border-destructive/20 text-destructive/95 bg-destructive/[0.02]" 
                                                      : "border-purple-500/10 text-foreground/80"
                                                  )}>
                                                    {isPenultimateClosingWork ? (
                                                      <p className="font-semibold text-purple-700 dark:text-purple-300">
                                                        🎯 هذه الدفعة هي الدفعة قبل الأخيرة لمرحلة إنجاز الأعمال، لذلك تشترط استكمال الأعمال بنسبة 100% تمهيداً للدفعة الختامية.
                                                      </p>
                                                    ) : (
                                                      <>
                                                        {prevComp !== null && (
                                                          <p>
                                                            📅 <strong>الدفعة السابقة ({prevName}):</strong> نسبة إنجازها التراكمية <strong>{prevComp}%</strong> ← يجب أن تكون النسبة الحالية <strong>أكبر من ذلك</strong>
                                                          </p>
                                                        )}
                                                        {nextComp !== null && (
                                                          <p>
                                                            📅 <strong>الدفعة التالية ({nextName}):</strong> نسبة إنجازها التراكمية <strong>{nextComp}%</strong> ← يجب أن تكون النسبة الحالية <strong>أقل من ذلك</strong>
                                                          </p>
                                                        )}
                                                        {prevComp === null && (
                                                          <p>⭐ <strong>الدفعة الأولى:</strong> يمكن أن تبدأ نسبة الإنجاز من 0% فما فوق</p>
                                                        )}
                                                        <p className={cn("font-bold", hasRedAlert ? "text-destructive" : "text-purple-700 dark:text-purple-300")}>
                                                          النطاق المسموح به: {minAllowed}% – {maxAllowed}%
                                                        </p>
                                                      </>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            <div className="relative">
                                              <Input
                                                type="number"
                                                min={minAllowed}
                                                max={100}
                                                disabled={isPaid || isPenultimateClosingWork}
                                                required
                                                value={isPenultimateClosingWork ? 100 : (payment.completionPercentage !== undefined && payment.completionPercentage !== null ? payment.completionPercentage : "")}
                                                placeholder={index === 0 ? "مثال: 0" : `الحد الأدنى: ${minAllowed}%`}
                                                className={cn(
                                                  "w-full rounded-xl text-right font-bold transition-all font-sans pl-3 pr-8 text-base",
                                                  !isPenultimateClosingWork && (isBelowPrev || isAboveNext) && "border-2 border-destructive bg-destructive/5 text-destructive ring-2 ring-destructive/20",
                                                  isPaid || isPenultimateClosingWork
                                                    ? "bg-slate-200/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed shadow-inner"
                                                    : "bg-background border-border/80 text-foreground focus-visible:border-purple-500/40 focus-visible:ring-purple-500/15 shadow-2xs"
                                                )}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                  }
                                                }}
                                                onChange={(e) => {
                                                  if (isPaid || isPenultimateClosingWork) return;
                                                  if (e.target.value === "") {
                                                    handlePaymentCompletionPercentageChange(payment.id, undefined);
                                                  } else {
                                                    let val = parseFloat(e.target.value);
                                                    if (isNaN(val)) {
                                                      handlePaymentCompletionPercentageChange(payment.id, undefined);
                                                    } else {
                                                      if (val > 100) val = 100;
                                                      if (val < 0) val = 0;
                                                      handlePaymentCompletionPercentageChange(payment.id, val);
                                                    }
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  if (isPaid || isPenultimateClosingWork) return;
                                                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                                  if (val !== undefined && !isNaN(val)) {
                                                    if (prevComp !== null && val <= prevComp) {
                                                      toast.error(`نسبة إنجاز الدفعة ${index + 1} (${val}%) غير مقبولة — يجب أن تكون أكبر من نسبة إنجاز الدفعة السابقة (${prevName}: ${prevComp}%). تم ضبطها على الحد الأدنى (${minAllowed}%).`);
                                                      handlePaymentCompletionPercentageChange(payment.id, minAllowed);
                                                    } else if (nextComp !== null && val >= nextComp) {
                                                      const maxVal = Math.max(minAllowed, nextComp - 1);
                                                      toast.error(`نسبة إنجاز الدفعة ${index + 1} (${val}%) غير مقبولة — يجب أن تكون أقل من نسبة إنجاز الدفعة التالية (${nextName}: ${nextComp}%). تم ضبطها على (${maxVal}%).`);
                                                      handlePaymentCompletionPercentageChange(payment.id, maxVal);
                                                    }
                                                  }
                                                }}
                                              />
                                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600/60 dark:text-purple-400/60 font-bold text-xs pointer-events-none">
                                                %
                                              </span>
                                            </div>

                                            {isBelowPrev && !isPenultimateClosingWork && (
                                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                                <span>غير مقبول: النسبة ({currentComp}%) يجب أن تكون أكبر من الدفعة السابقة ({prevName}: {prevComp}%). الحد الأدنى هو {minAllowed}%.</span>
                                              </div>
                                            )}
                                            {isAboveNext && !isPenultimateClosingWork && (
                                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/30 mt-1.5 animate-in fade-in">
                                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                                <span>غير مقبول: النسبة ({currentComp}%) يجب أن تكون أقل من الدفعة التالية ({nextName}: {nextComp}%). الحد الأقصى هو {maxAllowed}%.</span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>


                            {/* قسم ربط الأصناف والبنود الموردة في هذه الدفعة - خاص ببرنامج سدانة فقط */}
                            {isSedanaProgram && (
                              <div className="mt-4 pt-4 border-t border-sky-100 dark:border-sky-950/60 bg-sky-50/40 dark:bg-sky-950/20 p-4 rounded-xl space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                      <Package className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-2">
                                        الأصناف والبنود الموردة في هذه الدفعة
                                        <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-300 text-[11px] font-bold">
                                          {(payment.items || []).length} أصناف
                                        </Badge>
                                      </h4>
                                      <p className="text-[11px] text-muted-foreground">
                                        حدد الكميات التي سيلتزم المورد بتسليمها في هذه الدفعة لربطها التلقائي بأمر الإدخال المستودعي
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {availableContractItems.length > 0 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleInsertAllItemsForPayment(payment.id)}
                                        className="text-xs h-8 border-sky-300 text-sky-800 dark:text-sky-300 hover:bg-sky-100/60 dark:hover:bg-sky-900/40 gap-1 font-semibold"
                                        title="إدراج كافة بنود العقد لهذه الدفعة بالكميات الشهرية المتفق عليها"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                                        إدراج كافة بنود العقد
                                      </Button>
                                    )}
                                    {(payment.items || []).length > 0 && paymentSchedule.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApplyItemsToAllPayments(payment.id)}
                                        className="text-xs h-8 border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-semibold"
                                        title="تطبيق نفس هذه البنود والكميات على جميع الدفعات الأخرى في الجدول"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-emerald-600" />
                                        تطبيق هذه البنود على باقي الدفعات
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {(!payment.items || payment.items.length === 0) ? (
                                  <div className="text-center py-6 px-4 bg-white/70 dark:bg-slate-900/60 rounded-lg border border-dashed border-sky-200 dark:border-sky-900/50 space-y-3">
                                    <Package className="w-8 h-8 mx-auto text-sky-400 opacity-60" />
                                    <div>
                                      <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">لم يتم ربط أي أصناف توريد بهذه الدفعة بعد</p>
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        انقر على الزر أدناه لإدراج بنود العقد لهذه الدفعة
                                      </p>
                                    </div>
                                    <div className="flex justify-center pt-1">
                                      <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleInsertAllItemsForPayment(payment.id)}
                                        className="text-xs h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        إدراج بنود العقد لهذه الدفعة
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="overflow-x-auto bg-white dark:bg-slate-900/80 rounded-lg border border-sky-200/80 dark:border-sky-900/50 shadow-2xs">
                                      <Table className="text-right text-xs">
                                        <TableHeader className="bg-sky-100/50 dark:bg-sky-950/40">
                                          <TableRow>
                                            <TableHead className="text-right font-bold text-sky-950 dark:text-sky-200 w-10">م</TableHead>
                                            <TableHead className="text-right font-bold text-sky-950 dark:text-sky-200 min-w-[200px]">اسم الصنف / البند</TableHead>
                                            <TableHead className="text-right font-bold text-sky-950 dark:text-sky-200 w-32">الكمية الموردة</TableHead>
                                            <TableHead className="text-right font-bold text-sky-950 dark:text-sky-200 w-24">الوحدة</TableHead>
                                            <TableHead className="w-12 text-center"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {payment.items.map((it, itIdx) => {
                                            const avail = availableContractItems.find(a => String(a.id) === String(it.id));

                                            return (
                                              <TableRow key={it.id || itIdx} className="hover:bg-sky-50/40 dark:hover:bg-sky-950/30">
                                                <TableCell className="font-mono text-muted-foreground">{itIdx + 1}</TableCell>
                                                <TableCell>
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-foreground text-xs">{it.itemName}</span>
                                                    {(avail as any)?.agreedPeriodicLabel && (
                                                      <span className="text-[11px] text-sky-700 dark:text-sky-400 font-medium">
                                                        {(avail as any).agreedPeriodicLabel}
                                                      </span>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="الكمية"
                                                    value={it.quantity !== undefined && it.quantity !== null ? it.quantity : ""}
                                                    className="h-8 text-right font-bold w-full rounded-lg bg-white dark:bg-slate-900"
                                                    onChange={(e) => {
                                                      const val = parseFloat(e.target.value) || 0;
                                                      handleUpdatePaymentItem(payment.id, it.id, {
                                                        quantity: val,
                                                        totalPrice: val * (it.unitPrice || 0),
                                                      });
                                                    }}
                                                  />
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="secondary" className="font-normal text-[11px]">
                                                    {it.unit || "وحدة"}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItemFromPayment(payment.id, it.id)}
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </Button>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <div>
                                        {availableContractItems.length > (payment.items || []).length && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleInsertAllItemsForPayment(payment.id)}
                                            className="text-xs h-7 text-sky-700 dark:text-sky-300 hover:bg-sky-100/50 gap-1 font-medium"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            استعادة كافة بنود العقد
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              )}
                            </div>
                            {!isPaid && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePayment(payment.id)}
                                className="text-destructive hidden md:flex"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </React.Fragment>
                    );
                    })}

                    {/* ملخص الدفعات */}
                    {(() => {
                      const isClosingMode = hasFinalPayment && paymentSchedule.length >= 2;
                      const workPayments = isClosingMode ? paymentSchedule.slice(0, -1) : paymentSchedule;
                      const finalPayment = isClosingMode ? paymentSchedule[paymentSchedule.length - 1] : null;

                      const workPaymentsAmount = workPayments.reduce((sum, p) => sum + getPaymentEffectiveAmount(p), 0);
                      const finalPaymentAmount = finalPayment ? getPaymentEffectiveAmount(finalPayment) : 0;
                      const totalPaymentsAmount = workPaymentsAmount + finalPaymentAmount;

                      const targetValue = contractData.totalValue || 0;
                      const isExact = Math.abs(workPaymentsAmount - targetValue) <= 0.05;
                      const isOver = workPaymentsAmount > targetValue + 0.05;
                      const isUnder = workPaymentsAmount < targetValue - 0.05;
                      const diff = targetValue - workPaymentsAmount;

                      return (
                        <Card className="bg-muted/50 p-4 sm:p-5 rounded-2xl border-dashed border-2">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {isClosingMode ? "إجمالي دفعات الأعمال (قيمة المشروع):" : "إجمالي المبالغ:"}
                                </span>
                                <span className={`font-black text-base ${
                                  isExact 
                                    ? "text-green-600 dark:text-green-400" 
                                    : isOver 
                                      ? "text-destructive" 
                                      : "text-amber-600"
                                }`}>
                                    {workPaymentsAmount.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">قيمة المشروع المعتمدة:</span>
                                <span className="font-bold text-foreground inline-flex items-center gap-1">
                                  {targetValue.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                </span>
                              </div>
                              {isClosingMode && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">الدفعة الختامية (خارج قيمة المشروع):</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                                      {finalPaymentAmount.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 border-r pr-4">
                                    <span className="text-muted-foreground">إجمالي العقد الكلي (مع الختامية):</span>
                                    <span className="font-black text-foreground inline-flex items-center gap-1">
                                      {totalPaymentsAmount.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              {isOver && (
                                <div className="flex items-center gap-2 text-destructive text-xs font-bold bg-destructive/10 p-2 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  <span>{isClosingMode ? "تنبيه: دفعات أعمال المشروع تتجاوز قيمة المشروع" : "تنبيه: إجمالي الدفعات يتجاوز قيمة العقد"}</span>
                                </div>
                              )}
                              {isUnder && (
                                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold bg-amber-500/10 p-2 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  <span className="inline-flex items-center gap-1">
                                    تنبيه: متبقٍ لتغطية قيمة المشروع { diff.toLocaleString() } <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                  </span>
                                </div>
                              )}
                              {isExact && (
                                <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-500/10 p-2 rounded-lg">
                                  <Check className="h-4 w-4 shrink-0" />
                                  <span>
                                    {isClosingMode ? "تمت تغطية كامل قيمة أعمال المشروع (100% في الدفعة قبل الأخيرة)" : "تمت تغطية كامل قيمة العقد"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

            {/* الخطوة 5: بنود العقد */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium">بنود العقد</h3>
                  <p className="text-sm text-muted-foreground">
                    راجع البنود وقم بتخصيصها حسب الحاجة
                  </p>
                </div>

                {clausesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : clauseValues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد بنود في هذا القالب</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clauseValues.map((clause, index) => (
                      <Card key={clause.clauseId} className={`${!clause.isIncluded ? "opacity-50" : ""}`}>
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={clause.isIncluded}
                              onCheckedChange={() => toggleClauseInclusion(clause.clauseId)}
                              disabled={clause.isRequired}
                            />
                            <div className="flex-1">
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleClauseExpansion(clause.clauseId)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    المادة {index + 1}: {clause.titleAr || clause.title}
                                  </span>
                                  {clause.isRequired && (
                                    <Badge variant="secondary" className="text-xs">إلزامي</Badge>
                                  )}
                                  {clause.isEditable && (
                                    <Badge variant="outline" className="text-xs">قابل للتعديل</Badge>
                                  )}
                                </div>
                                {expandedClauses.has(clause.clauseId) ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              
                              {expandedClauses.has(clause.clauseId) && (
                                <div className="mt-3 space-y-3">
                                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded">
                                    {clause.content}
                                  </div>
                                  {clause.isEditable && clause.isIncluded && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">تعديل المحتوى (اختياري)</Label>
                                      <Textarea
                                        value={clause.customContent}
                                        onChange={(e) => updateClauseContent(clause.clauseId, e.target.value)}
                                        placeholder="اترك فارغاً لاستخدام النص الافتراضي..."
                                        rows={3}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* الخطوة 6: البنود المخصصة */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg">البنود المخصصة (اختياري)</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCustomClauses([...customClauses, { title: "", description: "" }])}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة بند مخصص
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  يمكنك إضافة بنود إضافية خاصة بهذا العقد فقط. ستظهر هذه البنود قبل القيمة المالية وتفاصيل الحساب.
                </p>
                
                {customClauses.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                    لا توجد بنود مخصصة. يمكنك المتابعة للخطوة التالية بالنقر على "التالي".
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customClauses.map((clause, index) => (
                      <Card key={index} className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 left-2 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const newClauses = [...customClauses];
                            newClauses.splice(index, 1);
                            setCustomClauses(newClauses);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="pt-6 space-y-4 text-right" dir="rtl">
                          <div className="space-y-2">
                            <Label>اسم البند</Label>
                            <Input 
                              placeholder="مثال: التزامات إضافية على الطرف الثاني" 
                              value={clause.title}
                              onChange={(e) => {
                                const newClauses = [...customClauses];
                                newClauses[index].title = e.target.value;
                                setCustomClauses(newClauses);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>وصف البند</Label>
                            <Textarea 
                              placeholder="أدخل نص البند وتفاصيله..." 
                              rows={4}
                              value={clause.description}
                              onChange={(e) => {
                                const newClauses = [...customClauses];
                                newClauses[index].description = e.target.value;
                                setCustomClauses(newClauses);
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* الخطوة 7: المراجعة */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <h3 className="font-medium text-lg">مراجعة العقد</h3>
                
                {/* ملخص القالب */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">قالب العقد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {templates.find((t: any) => t.id === contractData.templateId)?.name || (existingContract?.contract as any)?.templateName || "-"}
                  </CardContent>
                </Card>

                {/* ملخص الطرف الثاني */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">الطرف الثاني</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedSupplier?.name || (existingContract?.contract as any)?.secondPartyName || "-"}</p>
                    <p className="text-sm text-muted-foreground">{selectedSupplier?.phone || (existingContract?.contract as any)?.secondPartyPhone || "-"}</p>
                  </CardContent>
                </Card>
                {/* ملخص البنود المخصصة */}
                {customClauses.filter(c => c.title || c.description).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">البنود المخصصة ({customClauses.filter(c => c.title || c.description).length} بنود)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 text-right" dir="rtl">
                        {customClauses.filter(c => c.title || c.description).map((clause, index) => (
                          <div key={index} className="text-sm border-b pb-3 last:border-0 last:pb-0">
                            <div className="font-bold mb-1">{clause.title || `بند إضافي ${index + 1}`}</div>
                            <div className="text-muted-foreground whitespace-pre-wrap">{clause.description}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ملخص التفاصيل */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">تفاصيل العقد</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">الموضوع:</span>
                      <p className="font-medium">{contractData.subject || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المدة:</span>
                      <p className="font-medium">
                        {contractData.duration} {DURATION_UNITS.find(u => u.value === contractData.durationUnit)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">تاريخ البدء:</span>
                      <p className="font-medium">
                        {contractData.startDate || "-"} {contractData.startDateHijri ? `(${contractData.startDateHijri} هـ)` : ""}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">القيمة المتفقة مع المورد:</span>
                      <p className="font-medium text-green-700 font-bold font-sans inline-flex items-center gap-1">{contractData.totalValue.toLocaleString("en-US")} <SaudiRiyal className="w-3.5 h-3.5 inline" /></p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">آلية الاستحقاق والصرف:</span>
                      <p className="font-medium text-foreground">
                        {paymentSystem === "milestones" 
                          ? "نظام المستخلصات بحسب الإنجاز" 
                          : paymentSystem === "installments" 
                            ? "نظام الدفعات المجدولة" 
                            : "-"}
                      </p>
                    </div>
                    {(contractData.managementPercentage > 0 || (contractData.managementAmount && contractData.managementAmount > 0)) && (
                      <>
                        <div>
                          <span className="text-muted-foreground">نسبة الجمعية:</span>
                          <p className="font-medium font-sans">{contractData.managementPercentage ? `${contractData.managementPercentage}%` : "-"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">قيمة الجمعية (المستقطعة):</span>
                          <p className="font-medium text-orange-600 font-sans inline-flex items-center gap-1">
                            {(contractData.managementAmount || ((contractData.totalValue * contractData.managementPercentage) / 100)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                          </p>
                        </div>
                        <div className="sm:col-span-2 border-t pt-2 mt-2">
                          <span className="text-muted-foreground">القيمة الكلية للعقد:</span>
                          <p className="text-base font-bold text-blue-700 font-sans inline-flex items-center gap-1">
                            {contractData.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* ملخص الدفعات */}
                {paymentSystem === "installments" && paymentSchedule.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">جدول الدفعات ({paymentSchedule.length} دفعات)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {paymentSchedule.map((payment, index) => {
                          const effAmt = getPaymentEffectiveAmount(payment);
                          const paidAmt = Number(payment.paidAmount || 0);
                          const isPaid = Boolean(payment.isPaid || payment.status === "paid" || payment.status === "partially_paid" || paidAmt > 0);
                          const isPartiallyPaid = Boolean(payment.isPartiallyPaid || payment.status === "partially_paid" || (paidAmt > 0 && paidAmt < Number(payment.agreedAmount || payment.amount || 0)));

                          return (
                            <div key={payment.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0 border-border/40">
                              <div className="flex items-center gap-2">
                                <span>{payment.name}</span>
                                {isPaid && (
                                  <Badge variant="outline" className={cn(
                                    "text-[10px] px-1.5 py-0 h-4 font-semibold",
                                    isPartiallyPaid ? "border-amber-500 text-amber-600 bg-amber-50" : "border-emerald-500 text-emerald-600 bg-emerald-50"
                                  )}>
                                    {isPartiallyPaid ? "مسددة جزئياً" : "مسددة"}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-medium inline-flex items-center gap-1">
                                {effAmt.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* بطاقة توضيحية لنظام المستخلصات في المراجعة */}
                {paymentSystem === "milestones" && (
                  <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                        <Check className="w-4 h-4 text-emerald-600" />
                        آلية المستخلصات (حسب الإنجاز الفعلي)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      لا توجد دفعات أو مستخلصات مجدولة مسبقاً لهذا العقد. يتم تقديم المستخلصات والصرف تدريجياً بحسب الإنجاز الفعلي والمراحل المنجزة في المشروع.
                    </CardContent>
                  </Card>
                )}

                {/* ملخص البنود */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      بنود العقد ({clauseValues.filter(c => c.isIncluded).length} بند)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clauseValues.filter(c => c.isIncluded).length > 0 ? (
                      <div className="space-y-1">
                        {clauseValues.filter(c => c.isIncluded).map((clause, index) => (
                          <div key={clause.clauseId} className="text-sm">
                            <span className="text-muted-foreground">المادة {index + 1}:</span>
                            <span className="mr-2">{clause.titleAr || clause.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">لا توجد بنود مخصصة أو محددة لهذه النسخة.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            </>
            )}

            {/* أزرار التنقل وحفظ المسودة */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting || isSavingDraft}
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                السابق
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || isSavingDraft || isDraftSaved}
                  className="border-amber-500/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold text-xs sm:text-sm disabled:opacity-60"
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري حفظ المسودة...
                    </>
                  ) : isDraftSaved ? (
                    <>
                      <Check className="h-4 w-4 ml-2 text-green-600" />
                      تم حفظ المسودة
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      حفظ كمسودة
                    </>
                  )}
                </Button>

                {currentStep < 7 ? (
                  <Button onClick={nextStep} disabled={isSubmitting || isSavingDraft}>
                    التالي
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSavingDraft}
                    className="bg-green-600 hover:bg-green-700 font-bold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري إنشاء العقد...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 ml-2" />
                        إنشاء العقد
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
