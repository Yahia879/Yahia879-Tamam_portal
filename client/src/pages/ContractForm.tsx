import { useState, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import {
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign,
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
} from "lucide-react";

// وحدات المدة
const DURATION_UNITS = [
  { value: "days", label: "يوم" },
  { value: "weeks", label: "أسبوع" },
  { value: "months", label: "شهر" },
  { value: "years", label: "سنة" },
];

// أنواع الدفعات
const PAYMENT_TYPES = [
  { value: "advance", label: "دفعة مقدمة" },
  { value: "progress", label: "دفعة تقدم" },
  { value: "milestone", label: "دفعة إنجاز" },
  { value: "final", label: "دفعة نهائية" },
];

interface PaymentScheduleItem {
  id: string;
  name: string;
  type: string;
  percentage: number;
  amount: number;
  dueDate: string;
  description: string;
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
  const params = useParams();
  const search = useSearch();
  
  // قراءة requestId من query parameters
  const searchParams = new URLSearchParams(search || '');
  const requestIdFromQuery = searchParams.get('requestId');
  const projectIdFromQuery = searchParams.get('projectId');
  
  // كشف وضع التعديل من المسار
  const isEditMode = window.location.pathname.includes('/edit');
  const editContractId = isEditMode && params.id ? parseInt(params.id) : undefined;
  
  const requestId = requestIdFromQuery ? parseInt(requestIdFromQuery) : 
                   (params.requestId ? parseInt(params.requestId) : undefined);
  
  const projectId = projectIdFromQuery ? parseInt(projectIdFromQuery) :
                   (params.projectId ? parseInt(params.projectId) : undefined);
                   
  const [effectiveRequestId, setEffectiveRequestId] = useState<number | null>(requestId || null);
  
  const { user } = useAuth();
  const utils = trpc.useContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    supplierId: null as number | null,
    
    // تفاصيل العقد
    subject: "",
    description: "",
    
    // المدة
    duration: 0,
    durationUnit: "months" as string,
    startDate: "",
    
    // القيمة المالية
    totalValue: 0,
    managementPercentage: 0, // نسبة الإشراف/الإدارة
    baseValue: 0, // القيمة الأساسية قبل النسبة
    
    // ملاحظات
    notes: "",
  });

  // بنود العقد
  const [clauseValues, setClauseValues] = useState<ClauseValue[]>([]);
  
  // جدول الدفعات
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);

  // البنود المخصصة
  const [customClauses, setCustomClauses] = useState<{title: string; description: string}[]>([]);

  // جلب قوالب العقود
  const { data: templatesData, isLoading: templatesLoading } = trpc.contracts.getTemplates.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب بنود القالب المختار
  const { data: templateClauses, isLoading: clausesLoading } = trpc.contracts.getTemplateClauses.useQuery(
    { templateId: contractData.templateId! },
    { enabled: !!contractData.templateId }
  );

  // جلب الموردين المعتمدين
  const { data: suppliersData, isLoading: suppliersLoading } = trpc.suppliers.list.useQuery({
    approvalStatus: "approved",
    limit: 100,
  });

  // جلب المشاريع
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.getAll.useQuery({
    limit: 100,
  });

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.contracts.getOrganizationSettings.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب قائمة المفوضين
  const { data: signatoriesData } = trpc.organization.getSignatories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب المشروع إذا تم تمرير معرفه فقط للحصول على معرف الطلب المرتبط
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId && !requestId }
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

  // جلب تفاصيل الطلب للحصول على المشروع المرتبط
  const { data: requestDetails, isLoading: isLoadingRequest } = trpc.requests.getById.useQuery(
    { id: effectiveRequestId! },
    { enabled: !!effectiveRequestId }
  );

  // جلب تفاصيل المورد المختار
  const { data: selectedSupplier } = trpc.suppliers.getById.useQuery(
    { id: contractData.supplierId! },
    { enabled: !!contractData.supplierId }
  );

  // تحديد ما إذا كان هناك عرض سعر معتمد (لتثبيت المورد)
  const approvedSupplierQuotation = Array.isArray((approvedQuotation as any)?.quotations)
    ? (approvedQuotation as any).quotations.find((q: any) => q.status === "accepted" || q.status === "approved")
    : null;
  const hasApprovedSupplier = !!approvedSupplierQuotation;

  // Mutation لإنشاء العقد
  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء العقد بنجاح");
      navigate(`/contracts/${data.id}/preview`);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء العقد");
      setIsSubmitting(false);
    },
  });

  // Mutation لتحديث العقد (وضع التعديل)
  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => {
      // إبطال التخزين المؤقت لضمان تحديث البيانات في المعاينة
      utils.contracts.getById.invalidate({ id: editContractId! });
      toast.success("تم تحديث العقد بنجاح");
      navigate(`/contracts/${editContractId}/preview`);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث العقد");
      setIsSubmitting(false);
    },
  });

  // جلب بيانات العقد الحالي (في وضع التعديل)
  const { data: existingContract, isLoading: isLoadingContract } = trpc.contracts.getById.useQuery(
    { id: editContractId! },
    { enabled: !!editContractId }
  );

  // تعبئة النموذج ببيانات العقد الحالي عند فتح وضع التعديل
  useEffect(() => {
    if (isEditMode && existingContract?.contract && !editDataLoaded) {
      const c = existingContract.contract;
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
        startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : "",
        totalValue: c.contractAmount ? parseFloat(c.contractAmount) : 0,
        managementPercentage: c.managementPercentage ? parseFloat(c.managementPercentage) : 0,
        baseValue: c.contractAmount ? parseFloat(c.contractAmount) : 0,
        notes: c.customTerms || "",
      });

      // تحميل جدول الدفعات من العقد الحالي
      if (c.paymentScheduleJson) {
        try {
          const schedule = JSON.parse(c.paymentScheduleJson);
          if (Array.isArray(schedule)) {
            setPaymentSchedule(schedule);
          }
        } catch (e) {
          console.error("خطأ في تحليل جدول الدفعات:", e);
        }
      }

      // تحميل بنود العقد من العقد الحالي
      if (c.clauseValuesJson) {
        try {
          const clauses = JSON.parse(c.clauseValuesJson);
          if (Array.isArray(clauses)) {
            setClauseValues(clauses);
          }
        } catch (e) {
          console.error("خطأ في تحليل بنود العقد:", e);
        }
      }

      setEditDataLoaded(true);
    }
  }, [isEditMode, existingContract, editDataLoaded]);

  // تحديث بنود العقد عند تغيير القالب
  useEffect(() => {
    if (templateClauses) {
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
  }, [templateClauses]);

  // تحديث القيمة والمورد من العرض المعتمد
  useEffect(() => {
    if (approvedSupplierQuotation) {
      // المبلغ الأصلي من المورد
      const originalAmount = parseFloat(approvedSupplierQuotation.totalAmount) || 0;
      
      // المبلغ بعد التفاوض (إن وجد)
      const negotiatedAmount = approvedSupplierQuotation.negotiatedAmount 
        ? parseFloat(approvedSupplierQuotation.negotiatedAmount) 
        : null;
      
      // المبلغ المعتمد (إن وجد)
      const approvedAmount = approvedSupplierQuotation.approvedAmount 
        ? parseFloat(approvedSupplierQuotation.approvedAmount) 
        : null;
      
      // الأولوية: المبلغ المعتمد > المبلغ بعد التفاوض > المبلغ النهائي للعرض > المبلغ الأصلي
      const finalAmount = approvedAmount ?? negotiatedAmount ?? (approvedSupplierQuotation.finalAmount ? parseFloat(approvedSupplierQuotation.finalAmount) : null) ?? originalAmount;
      
      // حساب النسبة إذا كانت مخزنة في العرض
      const managementPercentage = approvedSupplierQuotation.managementPercentage 
        ? parseFloat(approvedSupplierQuotation.managementPercentage) 
        : 0;
      
      setContractData(prev => ({
        ...prev,
        supplierId: approvedSupplierQuotation.supplierId,
        baseValue: finalAmount,
        managementPercentage: managementPercentage,
        totalValue: finalAmount,
      }));
    }
  }, [approvedSupplierQuotation]);

  // تحديث المشروع والحقول الأخرى من بيانات الطلب
  useEffect(() => {
    if (requestDetails) {
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
        updates.startDate = new Date().toISOString().split('T')[0];
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

  // إضافة دفعة جديدة
  const addPayment = () => {
    const newPayment: PaymentScheduleItem = {
      id: `payment-${Date.now()}`,
      name: `الدفعة ${paymentSchedule.length + 1}`,
      type: "progress",
      percentage: 0,
      amount: 0,
      dueDate: "",
      description: "",
    };
    setPaymentSchedule([...paymentSchedule, newPayment]);
  };

  // حذف دفعة
  const removePayment = (id: string) => {
    setPaymentSchedule(paymentSchedule.filter(p => p.id !== id));
  };

  // تحديث دفعة
  const updatePayment = (id: string, field: keyof PaymentScheduleItem, value: any) => {
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
        // التحقق من صحة جدول الدفعات
        if (paymentSchedule.length === 0) {
          return true;
        }

        // التأكد من صحة حقول الدفعات أولاً
        for (let i = 0; i < paymentSchedule.length; i++) {
          const p = paymentSchedule[i];
          if (!p.dueDate) {
            toast.error(`يرجى تحديد تاريخ الاستحقاق للدفعة ${i + 1}`);
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
        }

        const totalPayments = paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
        
        if (totalPayments !== contractData.totalValue) {
          toast.error(`يجب أن يكون إجمالي مبالغ الدفعات مساوياً لقيمة العقد تماماً (${contractData.totalValue.toLocaleString()} ريال). الإجمالي الحالي: ${totalPayments.toLocaleString()} ريال`);
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // الانتقال للخطوة التالية
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 7));
    }
  };

  // الانتقال للخطوة السابقة
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // إرسال العقد
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    // في وضع التعديل
    if (isEditMode && editContractId) {
      updateMutation.mutate({
        id: editContractId,
        contractTitle: contractData.subject,
        signatoryId: contractData.signatoryId,
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
        duration: contractData.duration,
        durationUnit: contractData.durationUnit as any,
        contractDate: contractData.startDate,
        customTerms: contractData.notes || undefined,
        // جدول الدفعات
        paymentSchedule: paymentSchedule.length > 0 ? JSON.stringify(paymentSchedule) : undefined,
        // بنود العقد المخصصة
        clauseValues: clauseValues.length > 0 ? JSON.stringify(clauseValues.filter(c => c.isIncluded)) : undefined,
        customClausesJson: customClauses.some(c => c.title || c.description) ? JSON.stringify(customClauses.filter(c => c.title || c.description)) : undefined,
      });
      return;
    }
    
    const supplier = selectedSupplier;
    if (!supplier) {
      toast.error("يرجى اختيار المورد");
      setIsSubmitting(false);
      return;
    }

    const selectedTemplate = templatesData?.find((t: any) => t.id === contractData.templateId);
    
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
      duration: contractData.duration,
      durationUnit: contractData.durationUnit as any,
      contractDate: contractData.startDate,
      startDate: contractData.startDate,
      // جدول الدفعات
      paymentSchedule: paymentSchedule.length > 0 ? JSON.stringify(paymentSchedule) : undefined,
      // بنود العقد
      clauseValues: clauseValues.length > 0 ? JSON.stringify(clauseValues.filter(c => c.isIncluded)) : undefined,
      customClausesJson: customClauses.some(c => c.title || c.description) ? JSON.stringify(customClauses.filter(c => c.title || c.description)) : undefined,
      // ملاحظات
      customTerms: contractData.notes || undefined,
    });
  };

  const suppliers = suppliersData?.suppliers || [];
  const projects = projectsData || [];
  const templates = templatesData || [];

  // خطوات النموذج
  const steps = [
    { id: 1, title: "القالب", icon: FileText },
    { id: 2, title: "الطرف الثاني", icon: Building2 },
    { id: 3, title: "التفاصيل", icon: DollarSign },
    { id: 4, title: "الدفعات", icon: Calendar },
    { id: 5, title: "البنود", icon: Edit },
    { id: 6, title: "البنود المخصصة", icon: Plus },
    { id: 7, title: "المراجعة", icon: Eye },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0">
        {/* العنوان */}
        <div>
         <h1 className="text-2xl font-bold">{isEditMode ? "تعديل العقد" : "إنشاء عقد جديد"}</h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? "تعديل بيانات العقد الحالي" 
              : "إنشاء عقد باستخدام قالب مع إمكانية التخصيص"
            }
          </p>
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
                  <p className="font-semibold text-blue-900">
                    {contractData.totalValue > 0 
                      ? `${contractData.totalValue.toLocaleString('ar-SA')} ريال`
                      : "لم يتم التحديد"}
                  </p>
                </div>
              </div>
              {requestDetails.project && (
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
                          onClick={() => setContractData({ ...contractData, templateId: template.id })}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              contractData.templateId === template.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-gray-100"
                            }`}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{template.name}</h3>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                              <Badge variant="outline" className="mt-2">
                                {template.type === "supply" ? "توريد" :
                                 template.type === "construction" ? "مقاولات" :
                                 template.type === "supervision" ? "إشراف" :
                                 template.type === "maintenance" ? "صيانة" :
                                 template.type === "services" ? "خدمات" : template.type}
                              </Badge>
                            </div>
                            {contractData.templateId === template.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
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

                {/* إظهار المشروع المرتبط بالطلب أو اختيار مشروع */}
                {(effectiveRequestId && requestDetails?.project?.id) || (isEditMode && contractData.projectId) ? (
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
                          // في وضع التعديل، نبحث عن اسم المشروع من القائمة
                          (() => {
                            const project = projects.find((p: any) => p.id === contractData.projectId);
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
                  // عند عدم وجود طلب، نعرض قائمة اختيار المشروع
                  <div className="space-y-2">
                    <Label>المشروع (اختياري)</Label>
                    <Select
                      value={contractData.projectId?.toString() || "none"}
                      onValueChange={(value) => setContractData({ 
                        ...contractData, 
                        projectId: value === "none" ? null : parseInt(value) 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المشروع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مشروع</SelectItem>
                        {projects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.projectNumber} - {project.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* الخطوة 2: الطرف الثاني */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {hasApprovedSupplier && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Check className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">تم اختيار المورد تلقائياً</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      تم تحديد المورد "{approvedSupplierQuotation.supplierName}" بناءً على عرض السعر المعتمد في المرحلة المالية.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>المورد (الطرف الثاني) *</Label>
                  {suppliersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Select
                      value={contractData.supplierId?.toString() || ""}
                      onValueChange={(value) => setContractData({ 
                        ...contractData, 
                        supplierId: parseInt(value) 
                      })}
                      disabled={isEditMode || hasApprovedSupplier}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {hasApprovedSupplier && (
                    <p className="text-xs text-blue-600 font-medium">
                      لا يمكن تغيير المورد لوجود عرض سعر معتمد مرتب بهذا الطلب.
                    </p>
                  )}
                </div>

                {selectedSupplier && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">بيانات المورد</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">الاسم:</span>
                        <span className="mr-2 font-medium">{selectedSupplier.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">السجل التجاري:</span>
                        <span className="mr-2 font-medium">{selectedSupplier.commercialRegister || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المسؤول:</span>
                        <span className="mr-2 font-medium">{selectedSupplier.contactPerson || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الجوال:</span>
                        <span className="mr-2 font-medium">{selectedSupplier.phone || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البريد:</span>
                        <span className="mr-2 font-medium">{selectedSupplier.email || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">العنوان:</span>
                        <span className="mr-2 font-medium">{selectedSupplier.address || "-"}</span>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Label>تاريخ البدء *</Label>
                    <Input
                      type="date"
                      value={contractData.startDate}
                      onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* التفاصيل المالية */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>قيمة العقد (ريال) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={contractData.totalValue || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setContractData({ 
                          ...contractData, 
                          totalValue: val,
                          baseValue: val
                        });
                      }}
                      placeholder="أدخل قيمة العقد"
                      className="font-bold text-green-700"
                    />
                    <p className="text-xs text-muted-foreground">قيمة العقد المستحقة للمورد</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>نسبة الجمعية (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={contractData.managementPercentage || ""}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        setContractData({ 
                          ...contractData, 
                          managementPercentage: percentage
                        });
                      }}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">نسبة الإشراف/الإدارة للجمعية</p>
                  </div>

                  <div className="space-y-2">
                    <Label>قيمة الجمعية (ريال)</Label>
                    <Input
                      type="text"
                      disabled
                      value={((contractData.totalValue * (contractData.managementPercentage || 0)) / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      className="bg-muted text-muted-foreground font-semibold text-right"
                    />
                    <p className="text-xs text-muted-foreground">قيمة نسبة الجمعية المحسوبة</p>
                  </div>

                  <div className="space-y-2">
                    <Label>القيمة الكلية (ريال)</Label>
                    <Input
                      type="text"
                      disabled
                      value={(contractData.totalValue + (contractData.totalValue * (contractData.managementPercentage || 0)) / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      className="bg-blue-50 text-blue-900 border-blue-200 font-bold text-right"
                    />
                    <p className="text-xs text-muted-foreground">إجمالي القيمة الكلية للمشروع</p>
                  </div>
                </div>
              </div>
            )}

            {/* الخطوة 4: جدول الدفعات */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">جدول الدفعات</h3>
                    <p className="text-sm text-muted-foreground">
                      حدد الدفعات ومواعيدها (اختياري)
                    </p>
                  </div>
                  <Button onClick={addPayment} variant="outline" size="sm">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة دفعة
                  </Button>
                </div>

                {paymentSchedule.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لم يتم إضافة دفعات بعد</p>
                    <p className="text-sm">يمكنك تخطي هذه الخطوة إذا لم تكن هناك دفعات محددة</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentSchedule.map((payment, index) => (
                      <Card key={payment.id} className="p-4 relative">
                        <div className="flex flex-col md:flex-row items-start gap-4">
                          <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:justify-start gap-2 text-muted-foreground border-b md:border-0 pb-2 md:pb-0 mb-2 md:mb-0">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-5 w-5 hidden md:block" />
                              <span className="font-bold text-primary md:text-foreground">الدفعة {index + 1}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePayment(payment.id)}
                              className="text-destructive h-8 w-8 p-0 md:hidden"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">التاريخ الميلادي</Label>
                              <Input
                                type="date"
                                value={payment.dueDate}
                                required
                                className="w-full rounded-xl"
                                onChange={(e) => {
                                  const selectedDate = e.target.value;
                                  // التحقق من أن التاريخ ضمن فترة العقد
                                  if (contractData.startDate && contractData.duration > 0) {
                                    const startDate = new Date(contractData.startDate);
                                    const endDate = new Date(contractData.startDate);
                                    
                                    // حساب تاريخ انتهاء العقد
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
                                    if (selected < startDate || selected > endDate) {
                                      toast.error(`يجب أن يكون تاريخ الاستحقاق بين ${startDate.toLocaleDateString('ar-SA')} و ${endDate.toLocaleDateString('ar-SA')}`);
                                      return;
                                    }
                                  }
                                  updatePayment(payment.id, "dueDate", selectedDate);
                                }}
                                min={contractData.startDate || undefined}
                                max={(() => {
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
                                  return endDate.toISOString().split('T')[0];
                                })()}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">عنوان طلب الصرف</Label>
                              <Input
                                value={payment.name}
                                required
                                className="w-full rounded-xl"
                                onChange={(e) => updatePayment(payment.id, "name", e.target.value)}
                                placeholder="عنوان الطلب"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">النسبة (%)</Label>
                              <Input
                                type="number"
                                value={payment.percentage || ""}
                                required
                                className="w-full rounded-xl font-bold text-primary"
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  const amount = contractData.totalValue ? (contractData.totalValue * pct) / 100 : 0;
                                  setPaymentSchedule(prev => prev.map(p => 
                                    p.id === payment.id ? { ...p, percentage: pct, amount: Number(amount.toFixed(2)) } : p
                                  ));
                                }}
                                placeholder="0"
                                min="0"
                                max="100"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">المبلغ</Label>
                              <Input
                                type="number"
                                value={payment.amount || ""}
                                required
                                className="w-full rounded-xl font-bold"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const pct = contractData.totalValue ? (val / contractData.totalValue) * 100 : 0;
                                  setPaymentSchedule(prev => prev.map(p => 
                                    p.id === payment.id ? { ...p, amount: val, percentage: Number(pct.toFixed(2)) } : p
                                  ));
                                }}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePayment(payment.id)}
                            className="text-destructive hidden md:flex"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}

                    {/* ملخص الدفعات */}
                    <Card className="bg-muted/50 p-4 rounded-xl border-dashed border-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">إجمالي المبالغ:</span>
                            <span className={`font-black text-base ${
                              paymentSchedule.reduce((sum, p) => sum + p.amount, 0) === contractData.totalValue 
                                ? "text-green-600 dark:text-green-400" 
                                : paymentSchedule.reduce((sum, p) => sum + p.amount, 0) > contractData.totalValue 
                                  ? "text-destructive" 
                                  : "text-amber-600"
                            }`}>
                              {paymentSchedule.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} ريال
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">من قيمة العقد:</span>
                            <span className="font-bold text-foreground">
                              {contractData.totalValue.toLocaleString()} ريال
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {paymentSchedule.reduce((sum, p) => sum + p.amount, 0) > contractData.totalValue && (
                            <div className="flex items-center gap-2 text-destructive text-xs font-bold bg-destructive/10 p-2 rounded-lg">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>تنبيه: إجمالي الدفعات يتجاوز قيمة العقد</span>
                            </div>
                          )}
                          {paymentSchedule.reduce((sum, p) => sum + p.amount, 0) < contractData.totalValue && (
                            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold bg-amber-500/10 p-2 rounded-lg">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>تنبيه: متبقي للصرف { (contractData.totalValue - paymentSchedule.reduce((sum, p) => sum + p.amount, 0)).toLocaleString() } ريال</span>
                            </div>
                          )}
                          {paymentSchedule.reduce((sum, p) => sum + p.amount, 0) === contractData.totalValue && (
                            <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-500/10 p-2 rounded-lg">
                              <Check className="h-4 w-4 shrink-0" />
                              <span>تمت تغطية كامل قيمة العقد</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
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
                    {templates.find((t: any) => t.id === contractData.templateId)?.name || "-"}
                  </CardContent>
                </Card>

                {/* ملخص الطرف الثاني */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">الطرف الثاني</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedSupplier?.name || "-"}</p>
                    <p className="text-sm text-muted-foreground">{selectedSupplier?.phone || "-"}</p>
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
                      <p className="font-medium">{contractData.startDate || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">قيمة العقد:</span>
                      <p className="font-medium text-green-700 font-bold">{contractData.totalValue.toLocaleString()} ريال</p>
                    </div>
                    {contractData.managementPercentage > 0 && (
                      <>
                        <div>
                          <span className="text-muted-foreground">نسبة الجمعية:</span>
                          <p className="font-medium">{contractData.managementPercentage}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">قيمة الجمعية:</span>
                          <p className="font-medium text-orange-600">
                            {((contractData.totalValue * contractData.managementPercentage) / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                          </p>
                        </div>
                        <div className="sm:col-span-2 border-t pt-2 mt-2">
                          <span className="text-muted-foreground">القيمة الكلية للمشروع:</span>
                          <p className="text-base font-bold text-blue-700">
                            {(contractData.totalValue + (contractData.totalValue * contractData.managementPercentage) / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* ملخص الدفعات */}
                {paymentSchedule.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">جدول الدفعات ({paymentSchedule.length} دفعات)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {paymentSchedule.map((payment, index) => (
                          <div key={payment.id} className="flex items-center justify-between text-sm">
                            <span>{payment.name}</span>
                            <span className="font-medium">{payment.amount.toLocaleString()} ريال</span>
                          </div>
                        ))}
                      </div>
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
                    <div className="space-y-1">
                      {clauseValues.filter(c => c.isIncluded).map((clause, index) => (
                        <div key={clause.clauseId} className="text-sm">
                          <span className="text-muted-foreground">المادة {index + 1}:</span>
                          <span className="mr-2">{clause.titleAr || clause.title}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* أزرار التنقل */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                السابق
              </Button>

              {currentStep < 7 ? (
                <Button onClick={nextStep}>
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      إنشاء العقد
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
