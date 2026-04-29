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
  const requestId = requestIdFromQuery ? parseInt(requestIdFromQuery) : 
                   (params.requestId ? parseInt(params.requestId) : undefined);
  
  const projectId = params.projectId ? parseInt(params.projectId) : undefined;
  
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set());

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

  // جلب قوالب العقود
  const { data: templatesData, isLoading: templatesLoading } = trpc.contracts.getTemplates.useQuery();

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
  const { data: orgSettings } = trpc.contracts.getOrganizationSettings.useQuery();

  // جلب قائمة المفوضين
  const { data: signatoriesData } = trpc.organization.getSignatories.useQuery();

  // جلب تفاصيل المورد المختار
  const { data: selectedSupplier } = trpc.suppliers.getById.useQuery(
    { id: contractData.supplierId! },
    { enabled: !!contractData.supplierId }
  );

  // جلب العرض المعتمد للطلب (إن وجد)
  const { data: approvedQuotation } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId: contractData.requestId! },
    { enabled: !!contractData.requestId }
  );

  // جلب تفاصيل الطلب للحصول على المشروع المرتبط
  const { data: requestDetails, isLoading: isLoadingRequest } = trpc.requests.getById.useQuery(
    { id: requestId! },
    { enabled: !!requestId }
  );

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

  // تحديث القيمة من العرض المعتمد
  useEffect(() => {
    if (approvedQuotation) {
      const quotations = (approvedQuotation as any).quotations || approvedQuotation;
      if (Array.isArray(quotations)) {
        const accepted = quotations.find((q: any) => q.status === "accepted" || q.status === "approved");
        if (accepted) {
          // المبلغ الأصلي من المورد
          const originalAmount = parseFloat(accepted.totalAmount) || 0;
          
          // المبلغ بعد التفاوض (إن وجد)
          const negotiatedAmount = accepted.negotiatedAmount 
            ? parseFloat(accepted.negotiatedAmount) 
            : null;
          
          // المبلغ المعتمد (إن وجد)
          const approvedAmount = accepted.approvedAmount 
            ? parseFloat(accepted.approvedAmount) 
            : null;
          
          // الأولوية: المبلغ المعتمد > المبلغ بعد التفاوض > المبلغ الأصلي
          const finalAmount = approvedAmount ?? negotiatedAmount ?? originalAmount;
          
          // حساب النسبة إذا كانت مخزنة في العرض
          const managementPercentage = accepted.managementPercentage 
            ? parseFloat(accepted.managementPercentage) 
            : 0;
          
          setContractData(prev => ({
            ...prev,
            supplierId: accepted.supplierId,
            baseValue: originalAmount, // المبلغ الأصلي للمرجع
            managementPercentage: managementPercentage,
            totalValue: finalAmount, // القيمة النهائية (بعد التفاوض أو المعتمدة)
          }));
        }
      }
    }
  }, [approvedQuotation]);

  // تحديث المشروع والحقول الأخرى من بيانات الطلب
  useEffect(() => {
    if (requestDetails) {
      const updates: any = {};
      
      // ربط المشروع
      if (requestDetails.project?.id) {
        updates.projectId = requestDetails.project.id;
      }
      
      // ملء موضوع العقد تلقائياً إذا كان فارغاً
      if (!contractData.subject && requestDetails.mosque?.name) {
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
        const updated = { ...p, [field]: value };
        // حساب المبلغ تلقائياً من النسبة
        if (field === "percentage") {
          updated.amount = (contractData.totalValue * value) / 100;
        }
        return updated;
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
        // التحقق من أن مجموع الدفعات = 100%
        if (paymentSchedule.length > 0) {
          const totalPercentage = paymentSchedule.reduce((sum, p) => sum + p.percentage, 0);
          if (Math.abs(totalPercentage - 100) > 0.01) {
            toast.error(`مجموع نسب الدفعات يجب أن يساوي 100% (الحالي: ${totalPercentage}%)`);
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
      setCurrentStep(prev => Math.min(prev + 1, 6));
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
      duration: contractData.duration,
      durationUnit: contractData.durationUnit as any,
      contractDate: contractData.startDate,
      startDate: contractData.startDate,
      // جدول الدفعات
      paymentSchedule: paymentSchedule.length > 0 ? JSON.stringify(paymentSchedule) : undefined,
      // بنود العقد المخصصة
      clauseValues: clauseValues.length > 0 ? JSON.stringify(clauseValues.filter(c => c.isIncluded)) : undefined,
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
    { id: 6, title: "المراجعة", icon: Eye },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* العنوان */}
        <div>
          <h1 className="text-2xl font-bold">إنشاء عقد جديد</h1>
          <p className="text-muted-foreground">
            إنشاء عقد باستخدام قالب مع إمكانية التخصيص
          </p>
        </div>

        {/* بطاقة معلومات الطلب عند وجود requestId */}
        {requestId && isLoadingRequest && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جاري تحميل بيانات الطلب...</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {requestId && !isLoadingRequest && requestDetails && (
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

        {/* تحذير عندما لا يتم تمرير requestId */}
        {!requestId && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 text-orange-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>تحذير هام</AlertTitle>
            <AlertDescription>
              لم يتم ربط هذا العقد بطلب. لن يتم تحديث مرحلة الطلب تلقائياً عند اعتماد العقد.
              <br />
              يفضل إنشاء العقد من صفحة تفاصيل الطلب لضمان الربط الصحيح.
            </AlertDescription>
          </Alert>
        )}

        {/* شريط الخطوات */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[60px]">
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
                    className={`w-8 md:w-16 h-1 mx-1 ${
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
                            <span className="text-muted-foreground">- {signatory.position}</span>
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
                {requestId && requestDetails?.project?.id ? (
                  // عند وجود طلب مرتبط بمشروع، نعرض المشروع كقيمة ثابتة
                  <div className="space-y-2">
                    <Label>المشروع المرتبط</Label>
                    <div className="p-3 bg-muted rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {requestDetails.project.projectNumber}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span>
                          {requestDetails.project.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        هذا العقد مرتبط بالطلب رقم {requestDetails.requestNumber}
                      </p>
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
                </div>

                {selectedSupplier && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">بيانات المورد</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
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

                {/* القيمة الأساسية والنسبة */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>القيمة الأساسية (ريال)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={contractData.baseValue || ""}
                      onChange={(e) => {
                        const base = parseFloat(e.target.value) || 0;
                        const percentage = contractData.managementPercentage || 0;
                        const total = base + (base * percentage / 100);
                        setContractData({ 
                          ...contractData, 
                          baseValue: base,
                          totalValue: total
                        });
                      }}
                      placeholder="القيمة الأساسية"
                    />
                    <p className="text-xs text-muted-foreground">المبلغ المعتمد من عرض السعر</p>
                  </div>
                  <div className="space-y-2">
                    <Label>نسبة الإشراف/الإدارة (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={contractData.managementPercentage || ""}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        const base = contractData.baseValue || 0;
                        const total = base + (base * percentage / 100);
                        setContractData({ 
                          ...contractData, 
                          managementPercentage: percentage,
                          totalValue: total
                        });
                      }}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">نسبة الجمعية من العقد</p>
                  </div>
                  <div className="space-y-2">
                    <Label>إجمالي قيمة العقد (ريال) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={contractData.totalValue || ""}
                      onChange={(e) => setContractData({ 
                        ...contractData, 
                        totalValue: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="إجمالي القيمة"
                      className="font-bold text-green-700"
                    />
                    <p className="text-xs text-muted-foreground">
                      القيمة النهائية شاملة النسبة
                      {contractData.managementPercentage > 0 && (
                        <span className="text-green-600 mr-1">
                          (+{(contractData.baseValue * contractData.managementPercentage / 100).toLocaleString()} ريال)
                        </span>
                      )}
                    </p>
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
                      <Card key={payment.id} className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="h-5 w-5" />
                            <span className="font-medium">{index + 1}</span>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">اسم الدفعة</Label>
                              <Input
                                value={payment.name}
                                onChange={(e) => updatePayment(payment.id, "name", e.target.value)}
                                placeholder="اسم الدفعة"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">النوع</Label>
                              <Select
                                value={payment.type}
                                onValueChange={(value) => updatePayment(payment.id, "type", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">النسبة (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={payment.percentage || ""}
                                onChange={(e) => updatePayment(payment.id, "percentage", parseFloat(e.target.value) || 0)}
                                placeholder="النسبة"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">المبلغ (ريال)</Label>
                              <Input
                                type="number"
                                value={payment.amount.toFixed(2)}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">تاريخ الاستحقاق</Label>
                              <Input
                                type="date"
                                value={payment.dueDate}
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
                              {contractData.startDate && contractData.duration > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  فترة العقد: {contractData.startDate} - {(() => {
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
                                </p>
                              )}
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <Label className="text-xs">الوصف</Label>
                              <Input
                                value={payment.description}
                                onChange={(e) => updatePayment(payment.id, "description", e.target.value)}
                                placeholder="وصف الدفعة..."
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePayment(payment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}

                    {/* ملخص الدفعات */}
                    <Card className="bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <span>إجمالي النسب:</span>
                        <span className={`font-bold ${
                          Math.abs(paymentSchedule.reduce((sum, p) => sum + p.percentage, 0) - 100) < 0.01
                            ? "text-green-600"
                            : "text-red-600"
                        }`}>
                          {paymentSchedule.reduce((sum, p) => sum + p.percentage, 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span>إجمالي المبالغ:</span>
                        <span className="font-bold">
                          {paymentSchedule.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} ريال
                        </span>
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

            {/* الخطوة 6: المراجعة */}
            {currentStep === 6 && (
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

                {/* ملخص التفاصيل */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">تفاصيل العقد</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
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
                      <span className="text-muted-foreground">القيمة:</span>
                      <p className="font-medium">{contractData.totalValue.toLocaleString()} ريال</p>
                    </div>
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
                            <span className="font-medium">{payment.amount.toLocaleString()} ريال ({payment.percentage}%)</span>
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

              {currentStep < 6 ? (
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
