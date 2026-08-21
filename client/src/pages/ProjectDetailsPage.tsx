import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPermissions } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  FileText, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  BarChart3,
  FolderOpen,
  PauseCircle,
  Edit,
  Trash2,
  Package,
  FileSignature,
  CreditCard,
  ClipboardList,
  Building,
  Copy,
  Eye,
  HelpCircle,
  Check,
  Loader2,
  Lock,
  AlertTriangle,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { getStageOrder, getNextStage } from "@shared/constants";
import BoqTab, { BoqTabHandle } from "@/components/BoqTab";
import ProjectProgressMilestonesTab from "@/components/ProjectProgressMilestonesTab";
import ProjectFinancialsTab from "@/components/ProjectFinancialsTab";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  planning: "إعداد جدول الكميات",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const phaseStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const phaseStatusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
};

// المراحل التي تظهر فيها الميزانية (من التقييم المالي واعتماد العرض وما بعدها)
const BUDGET_VISIBLE_STAGES = [
  "financial_eval_and_approval",
  "contracting",
  "execution",
  "handover",
  "closed",
];

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const boqTabRef = useRef<BoqTabHandle>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isEditingManager, setIsEditingManager] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  // جلب الصلاحيات المحسوبة من السيرفر (تأخذ بالاعتبار الأدوار + الحجب الخاص والحظر)
  const serverPermissions = useUserPermissions();
  const canChangeManager = isAdmin || user?.role === 'projects_office';
  // صلاحية عرض تفاصيل المشروع → تعرض جميع الأقسام (إلا إذا تم حجبها خاصاً)
  const canViewDetails = serverPermissions.includes("projects.view_details");
  const canEditProjectName = canViewDetails || isAdmin;
  // صلاحية مالية المشاريع → تعرض قسم المالية
  const canViewFinancials = serverPermissions.includes("projects.financials");
  // إذا كان المستخدم يملك فقط صلاحية المالية بدون صلاحية عرض التفاصيل
  const financialsOnly = canViewFinancials && !canViewDetails;

  useEffect(() => {
    if (financialsOnly) {
      setActiveTab("financials");
    } else if (!canViewFinancials && activeTab === "financials") {
      setActiveTab("overview");
    }
  }, [financialsOnly, canViewFinancials, activeTab]);

  // جلب تفاصيل المشروع
  const { data: project, isLoading, error: projectError, refetch } = trpc.projects.getById.useQuery({ 
    id: parseInt(id || "0"),
  }, {
    retry: false,
  });

  // جلب مديري المشاريع المتاحين
  const { data: managersResult } = trpc.users.getAll.useQuery(
    {
      roles: ['project_manager'],
      permission: 'projects.assign_as_manager',
      limit: 100,
    },
    {
      enabled: !!canChangeManager
    }
  );
  const projectManagers = managersResult?.items || [];

  // شرط إلغاء قفل وتفعيل قسم "المالية": بعد وصول المشروع إلى مرحلة "اعتماد عرض السعر" وتصبح حالتها مكتملة (100%)
  const currentRequestStage = project?.request?.currentStage || "";
  const quotationApprovalStageOrder = getStageOrder("quotation_approval");
  const currentStageOrder = getStageOrder(currentRequestStage);
  const hasApprovedQuotation = (project?.quotations || []).some((q: any) => q.status === "approved");
  const isQuotationPhaseDone = (project?.phases || []).some((p: any) => 
    (p.phaseName?.includes("اعتماد") || p.phaseName?.includes("عرض السعر")) && p.completionPercentage === 100
  );

  const isFinancialsUnlocked = 
    (currentStageOrder > quotationApprovalStageOrder) ||
    (currentStageOrder === quotationApprovalStageOrder && hasApprovedQuotation) ||
    hasApprovedQuotation ||
    isQuotationPhaseDone;

  const isFinancialsLocked = !isFinancialsUnlocked;

  useEffect(() => {
    if (project) {
      setEditedName(project.name || "");
    }
  }, [project]);

  // جلب جدول الكميات لعرض الإجمالي
  const { data: boqData } = trpc.projects.getBOQ.useQuery({ 
    projectId: parseInt(id || "0") 
  }, { enabled: !!id });

  // تحديث مرحلة المشروع
  const updatePhaseMutation = trpc.projects.updatePhase.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المرحلة بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المرحلة");
    },
  });

  // تحديث بيانات المشروع
  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleUpdateManager = (managerId: number) => {
    updateProjectMutation.mutate({
      id: parseInt(id || "0"),
      managerId
    }, {
      onSuccess: () => {
        toast.success("تم تحديث مدير المشروع بنجاح");
      },
      onError: (err) => {
        toast.error(err.message || "حدث خطأ أثناء تحديث مدير المشروع");
      }
    });
  };



  // تحديث مرحلة الطلب
  const updateRequestStageMutation = trpc.requests.updateStage.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد جدول الكميات بنجاح وتحويل الطلب للمرحلة التالية");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المرحلة");
    },
  });

  // تكرار عقد
  const duplicateContractMutation = trpc.contracts.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تكرار العقد بنجاح - رقم العقد الجديد: ${data.contractNumber}`);
      navigate(`/contracts/${data.id}/preview`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تكرار العقد");
    },
  });

  // اعتماد عقد
  const approveContractMutation = trpc.contracts.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد العقد بنجاح وتم تحويل المشروع لمرحلة التنفيذ");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد العقد");
    },
  });

  const handleDuplicateContract = (contractId: number) => {
    if (confirm("هل تريد تكرار هذا العقد؟ \nسيتم إنشاء نسخة جديدة برقم عقد مختلف.")) {
      duplicateContractMutation.mutate({ id: contractId });
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "غير محدد";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  // التحقق مما إذا كان جدول الكميات مقفلاً (إذا اكتملت المرحلة الثانية أو بدأت مراحل بعدها)
  const isBOQLocked = project?.phases?.some(p => 
    (p.phaseOrder === 2 && p.status === "completed") || 
    (p.phaseOrder > 2 && (p.status === "in_progress" || p.status === "completed"))
  );

  // التحقق مما إذا كانت العقود مقفلة (إذا لم تكتمل المرحلة الثالثة بعد)
  const isContractsLocked = !project?.phases?.some(p => 
    p.phaseOrder === 3 && p.status === "completed"
  );

  // التحقق مما إذا كان قد بدأ التنفيذ (المرحلة الخامسة: صرف المدفوعات)
  // إذا بدأت هذه المرحلة أو ما بعدها، يتم قفل التعديل على العقود
  const isExecutionStarted = project?.phases?.some(p => 
    p.phaseOrder >= 5 && (p.status === "in_progress" || p.status === "completed")
  );

  // التحقق من مرحلة التعاقد (المرحلة الرابعة)
  const isContractingPhase = project?.phases?.some(p => 
    p.phaseOrder === 4 && p.status === "in_progress"
  );

  // التحقق من مرحلة إعداد جدول الكميات (المرحلة الثانية)
  const isBOQPreparationPhase = project?.phases?.some(p => 
    p.phaseOrder === 2 && p.status === "in_progress"
  );

  const hasBOQItems = (boqData?.items?.length || 0) > 0;
  
  // شرط ظهور زر اعتماد جدول الكميات: في مرحلة إعداد جدول الكميات (المرحلة الثانية) ويوجد بنود في الجدول ولديه الصلاحية
  const isAllowedToApproveBOQ = ["super_admin", "system_admin", "projects_office"].includes(user?.role || "");
  
  // شرط أكثر مرونة للتحقق من المرحلة (المرحلة 2 قيد التنفيذ أو قيد التخطيط)
  const showApproveBOQButton = (isBOQPreparationPhase || project?.status === "planning") && hasBOQItems && isAllowedToApproveBOQ;

  // شرط ظهور زر اعتماد العقد: في مرحلة التعاقد ويوجد عقد واحد فقط بانتظار الاعتماد
  const showApproveContractButton = isContractingPhase && project?.contracts?.length === 1 && (project?.contracts[0].status === "draft" || project?.contracts[0].status === "pending_approval");

  // التحقق مما إذا كانت الدفعات مقفلة (إذا لم تكتمل المرحلة الرابعة بعد)
  const isPaymentsLocked = !project?.phases?.some(p => 
    p.phaseOrder === 4 && p.status === "completed"
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (projectError) {
    const errObj = projectError as any;
    const isForbidden = 
      errObj?.data?.code === "FORBIDDEN" || 
      errObj?.shape?.data?.code === "FORBIDDEN" || 
      errObj?.message?.includes("صلاحية") ||
      errObj?.data?.httpStatus === 403;
    
    const errorMessage = errObj?.message || "تحقق من صحة رقم المشروع أو ربما تم حذفه";
    const isUnconvertedRequest = errorMessage.includes("الطلب رقم") || errorMessage.includes("لم يتم تحويله إلى مشروع");

    return (
      <DashboardLayout>
        <div className="text-center py-16 max-w-lg mx-auto">
          <AlertCircle className={`w-14 h-14 mx-auto mb-4 ${isForbidden ? "text-amber-500" : isUnconvertedRequest ? "text-blue-500" : "text-destructive"}`} />
          <h2 className="text-xl font-bold mb-2">
            {isForbidden 
              ? "ليس لديك صلاحية لعرض هذا المشروع" 
              : isUnconvertedRequest
                ? "الطلب غير مرتبط بمشروع بعد"
                : "المشروع غير موجود"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            {isForbidden 
              ? "تواصل مع مدير النظام لمنحك الصلاحية المطلوبة"
              : errorMessage}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/project-management")}>
              العودة للمشاريع
            </Button>
            {isUnconvertedRequest && (
              <Button onClick={() => navigate(`/requests/${id}`)}>
                عرض تفاصيل الطلب
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">المشروع غير موجود</h2>
          <Button className="mt-4" onClick={() => navigate("/project-management")}>
            العودة للمشاريع
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // تحديد تسمية الحالة بناءً على المرحلة النشطة
  const getStatusLabel = () => {
    if (project.status === "completed") return "مكتمل";
    if (project.status === "cancelled") return "ملغي";
    if (project.status === "on_hold") return "متوقف";
    
    // البحث عن أول مرحلة غير مكتملة
    const activePhase = project.phases?.find(p => p.status !== "completed");
    if (activePhase) {
      // إزالة مقدمة "المرحلة X : " للحصول على المسمى فقط إذا رغبت، أو استخدامه كما هو
      return activePhase.phaseName.replace(/^المرحلة .* : /, "");
    }
    
    return statusLabels[project.status || "planning"];
  };

  // 1. الدفعات المسددة فعلياً (تظهر في البار بالأسفل)
  const paidPaymentsSum = project?.payments
    ?.filter(p => p.status === "paid" || p.status === "executed" || !!p.paidAt)
    ?.reduce((sum, p) => {
      const amt = parseFloat(String(p.amount || "0").replace(/,/g, ""));
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0) || 0;

  // 2. كـافة الدفعات المخصصة بالجدول (لمعرفة هل تم تخصيص العقد بالكامل)
  const allPaymentsSum = project?.payments
    ?.filter(p => p.status !== "rejected" && p.status !== "cancelled")
    ?.reduce((sum, p) => {
      const amt = parseFloat(String(p.amount || "0").replace(/,/g, ""));
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0) || 0;

  const totalContractsSum = project?.contracts?.reduce((sum, c) => {
    const amt = parseFloat(String(c.amount || "0").replace(/,/g, ""));
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0) || 0;

  const remainingContractSum = Math.max(0, totalContractsSum - paidPaymentsSum);
  const isContractFullyAllocated = allPaymentsSum >= totalContractsSum && totalContractsSum > 0;

  const completedPhasesCount = project?.phases?.filter(p => p.status === "completed").length || 0;
  const totalPhasesCount = project?.phases?.length || 0;
  const boqItemsCount = boqData?.items?.length || 0;
  const contractsCount = project?.contracts?.length || 0;
  const paymentsCount = project?.payments?.length || 0;

  const navItems = [
    { id: "overview", label: "نظرة عامة", icon: Building2 },
    { id: "progress_milestones", label: "الإنجاز والمعالم", icon: BarChart3 },
    { 
      id: "phases", 
      label: "مراحل المشروع", 
      icon: CheckCircle2, 
      badge: totalPhasesCount > 0 ? `${completedPhasesCount}/${totalPhasesCount}` : undefined 
    },
    { 
      id: "boq", 
      label: "جدول الكميات", 
      icon: ClipboardList, 
      badge: boqItemsCount > 0 ? `${boqItemsCount}` : undefined 
    },
    ...(canViewFinancials ? [{ 
      id: "financials", 
      label: "المالية", 
      icon: DollarSign, 
      isLocked: isFinancialsLocked 
    }] : []),
    { 
      id: "contracts", 
      label: "العقود", 
      icon: FileSignature, 
      badge: contractsCount > 0 ? `${contractsCount}` : undefined,
      isLocked: isContractsLocked 
    },
    { 
      id: "payments", 
      label: "الدفعات", 
      icon: CreditCard, 
      badge: paymentsCount > 0 ? `${paymentsCount}` : undefined,
      isLocked: isPaymentsLocked 
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 container mx-auto px-4 md:px-0 font-sans" dir="rtl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/60 shadow-xs text-right">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-xl shrink-0 hover:bg-muted/70 transition-colors"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate("/project-management");
                }
              }}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground font-mono">{project.projectNumber}</h1>
                <Badge variant="outline" className={`${statusColors[project.status || "planning"]} font-bold text-xs px-2.5 py-0.5 rounded-lg`}>
                  {getStatusLabel()}
                </Badge>
                {project.isMultiMosque && (
                  <Badge className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                    مشروع مباشر لعدة مساجد
                  </Badge>
                )}
                {project.donorName && (
                  <Badge className="bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                    المانح: {project.donorName}
                  </Badge>
                )}
              </div>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-2 max-w-md">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-9 py-1 px-3 text-sm text-foreground bg-background border border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-9 px-3.5 text-xs gradient-primary text-white font-bold rounded-xl"
                    onClick={() => {
                      if (!editedName.trim()) {
                        toast.error("اسم المشروع لا يمكن أن يكون فارغاً");
                        return;
                      }
                      updateProjectMutation.mutate({
                        id: project.id,
                        name: editedName,
                      }, {
                        onSuccess: () => {
                          toast.success("تم تحديث اسم المشروع بنجاح");
                          setIsEditingName(false);
                        },
                        onError: (err) => {
                          toast.error(err.message || "حدث خطأ أثناء تحديث اسم المشروع");
                        }
                      });
                    }}
                    disabled={updateProjectMutation.isPending}
                  >
                    حفظ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 text-xs rounded-xl"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(project.name || "");
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-sm sm:text-base font-semibold text-muted-foreground truncate">{project.name}</p>
                  {canEditProjectName && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-muted/60 rounded-lg p-0"
                      onClick={() => {
                        setEditedName(project.name || "");
                        setIsEditingName(true);
                      }}
                      title="تعديل اسم المشروع"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* بطاقات الإحصائيات الرئيسية الموحدة */}
        {!financialsOnly && (
          <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* الميزانية التقديرية */}
              <Card className="rounded-2xl border border-border/60 shadow-xs bg-card p-4 sm:p-5 text-right transition-all hover:border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">الميزانية التقديرية</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>الميزانية هي قيمة الإجمالي الكلي لجدول الكميات وتظهر بعد مرحلة التقييم المالي واعتماد العرض</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-foreground truncate">
                      {(!project.request || project.isMultiMosque || BUDGET_VISIBLE_STAGES.includes(project.request.currentStage))
                        ? (boqData && boqData.total > 0
                            ? formatCurrency(boqData.total.toString())
                            : formatCurrency(project.budget))
                        : "لم تُحدد بعد"
                      }
                    </p>
                  </div>
                </div>
              </Card>

              {/* التكلفة الفعلية */}
              <Card className="rounded-2xl border border-border/60 shadow-xs bg-card p-4 sm:p-5 text-right transition-all hover:border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">التكلفة الفعلية</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>التكلفة النهائية المتفق عليها في العقد والتي تشمل نسبة الجمعية</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      {formatCurrency(project.actualCost)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* نسبة الإنجاز */}
              <Card className="rounded-2xl border border-border/60 shadow-xs bg-card p-4 sm:p-5 text-right transition-all hover:border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">نسبة الإنجاز</span>
                      <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                        {project.completionPercentage || 0}%
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, project.completionPercentage || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* مدير المشروع */}
              <Card className="rounded-2xl border border-border/60 shadow-xs bg-card p-4 sm:p-5 text-right transition-all hover:border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">مدير المشروع</span>
                      {canChangeManager && !isEditingManager && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-muted-foreground hover:text-primary rounded-md p-0"
                          onClick={() => setIsEditingManager(true)}
                          title="تغيير مدير المشروع"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {isEditingManager ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Select
                          value={project.managerId?.toString() || ""}
                          onValueChange={(val) => {
                            handleUpdateManager(parseInt(val));
                            setIsEditingManager(false);
                          }}
                        >
                          <SelectTrigger className="h-8 w-full border-slate-200 text-xs font-semibold focus:ring-primary/20 bg-background rounded-lg">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projectManagers.map((m: any) => (
                              <SelectItem key={m.id} value={m.id.toString()} className="text-xs font-medium">
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setIsEditingManager(false)} 
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base font-bold text-foreground truncate">
                        {project.managerName || "غير محدد"}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </TooltipProvider>
        )}

        {/* Main Grid: Collapsible Vertical Sidebar Tabs + Content Area */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Mobile Tabs Bar (Horizontal Pills on Mobile) */}
          {!financialsOnly && (
            <div className="lg:hidden w-full overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-2xl border border-border/60 w-max min-w-full font-sans">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-sans ${
                      activeTab === item.id 
                        ? "bg-background text-foreground shadow-xs border border-border/80" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted font-bold font-mono">
                        {item.badge}
                      </span>
                    )}
                    {item.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop Collapsible Vertical Sidebar (Default Closed / Collapsed) */}
          {!financialsOnly && (
            <aside
              className={`hidden lg:flex flex-col gap-4 sticky top-20 transition-all duration-300 shrink-0 font-sans ${
                isNavCollapsed ? "w-[68px]" : "w-64 xl:w-72"
              }`}
            >
              {/* Vertical Navigation Card */}
              <div className="p-2 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
                {/* Header with Toggle Collapse/Expand Button */}
                <div className={`flex items-center pb-2 mb-1 border-b border-border/50 ${
                  isNavCollapsed ? "justify-center" : "justify-between px-2 pt-1"
                }`}>
                  {!isNavCollapsed && (
                    <span className="text-xs font-bold text-muted-foreground font-sans">أقسام المشروع</span>
                  )}
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
                          onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                          title={isNavCollapsed ? "توسيع القائمة" : "طي القائمة"}
                        >
                          {isNavCollapsed ? (
                            <ChevronLeft className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs font-bold font-sans">
                        {isNavCollapsed ? "توسيع القائمة" : "طي القائمة"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Tab Buttons */}
                <TooltipProvider delayDuration={150}>
                  {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const buttonEl = (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center p-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer font-sans ${
                          isNavCollapsed ? "justify-center h-10 w-10 mx-auto" : "justify-between"
                        } ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                          {!isNavCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!isNavCollapsed && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold ${
                                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            {item.isLocked && (
                              <Lock className={`w-3.5 h-3.5 ${isActive ? "text-primary-foreground" : "text-amber-500"}`} />
                            )}
                          </div>
                        )}
                      </button>
                    );

                    if (isNavCollapsed) {
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <div>{buttonEl}</div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="flex items-center gap-2 text-xs font-bold font-sans">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">{item.badge}</span>
                            )}
                            {item.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return buttonEl;
                  })}
                </TooltipProvider>
              </div>

              {/* Quick Info Sidebar Widget (visible when expanded) */}
              {!isNavCollapsed && (
                <Card className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-right space-y-3 font-sans">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/50">
                    <Briefcase className="w-4 h-4 text-primary" />
                    بيانات سريعة
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">المدة الزمنية:</span>
                      <p className="font-bold text-foreground mt-0.5 font-sans">
                        {project.startDate && project.expectedEndDate
                          ? `${Math.round((new Date(project.expectedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم`
                          : "غير محددة"
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">المرحلة الحالية:</span>
                      <Badge variant="outline" className={`${statusColors[project.status || "planning"]} text-[10px] font-bold mt-1 font-sans`}>
                        {getStatusLabel()}
                      </Badge>
                    </div>
                    {project.request && (
                      <div className="pt-2 border-t border-border/40">
                        <span className="text-muted-foreground block text-[11px]">الطلب المرتبط:</span>
                        <Link href={`/requests/${project.request.id}`}>
                          <span className="font-bold text-primary hover:underline flex items-center gap-1 mt-1 cursor-pointer font-sans">
                            {project.request.requestNumber}
                            <ArrowRight className="w-3 h-3 rotate-180" />
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </aside>
          )}

          {/* Main Tab Content Area (full width when collapsed) */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
              {/* نظرة عامة */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                    <CardHeader className="text-right border-b border-border/40 bg-muted/20 p-5">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        معلومات المشروع الأساسية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 text-right">
                      <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                        <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                          <p className="text-xs text-muted-foreground font-semibold">رقم المشروع</p>
                          <p className="font-mono font-black text-foreground mt-0.5">{project.projectNumber}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                          <p className="text-xs text-muted-foreground font-semibold">الحالة</p>
                          <Badge variant="outline" className={`${statusColors[project.status || "planning"]} mt-1 text-xs font-bold`}>
                            {getStatusLabel()}
                          </Badge>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                          <p className="text-xs text-muted-foreground font-semibold">تاريخ البدء</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {project.startDate 
                              ? new Date(project.startDate).toLocaleDateString("ar-SA")
                              : "لم يبدأ بعد"
                            }
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                          <p className="text-xs text-muted-foreground font-semibold">تاريخ الانتهاء المتوقع</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {project.expectedEndDate 
                              ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA")
                              : "غير محدد"
                            }
                          </p>
                        </div>
                        {project.donorName && (
                          <div className="col-span-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-xs text-muted-foreground font-semibold">اسم المانح / الجهة الداعمة</p>
                            <p className="font-bold text-primary text-sm mt-0.5">{project.donorName}</p>
                          </div>
                        )}
                        {project.isMultiMosque && (
                          <div className="col-span-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                            <p className="text-xs text-muted-foreground font-semibold">نوع المشروع</p>
                            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-200 mt-1 font-bold">
                              مشروع مباشر لعدة مساجد
                            </Badge>
                          </div>
                        )}
                      </div>
                      {project.description && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            وصف الأعمال التي ستنجز خلال المشروع
                          </p>
                          <p className="font-medium text-xs sm:text-sm text-foreground bg-muted/40 p-3.5 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                            {project.description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {project.isMultiMosque ? (
                    <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                      <CardHeader className="text-right border-b border-border/40 bg-muted/20 p-5">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          إدارة ومساجد المشروع
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4 text-right">
                        <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-xs text-muted-foreground font-semibold">مدير المشروع</p>
                            <p className="font-bold text-foreground flex items-center gap-1.5 mt-1">
                              <Users className="w-4 h-4 text-primary" />
                              {project.managerName || "غير محدد"}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-xs text-muted-foreground font-semibold">عدد المساجد المشمولة</p>
                            <p className="font-bold text-primary flex items-center gap-1.5 mt-1">
                              <Building className="w-4 h-4 text-primary" />
                              {(project as any).linkedMosques?.length || 0} مساجد
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-xs text-muted-foreground font-semibold">المدة المخططة</p>
                            <p className="font-bold text-foreground mt-1">
                              {project.startDate && project.expectedEndDate
                                ? `${Math.round((new Date(project.expectedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم`
                                : "غير محددة"
                              }
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-xs text-muted-foreground font-semibold">المرحلة الحالية</p>
                            <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 mt-1 font-bold text-xs">
                              إعداد جدول الكميات (مباشر)
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : project.request ? (
                    <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                      <CardHeader className="text-right border-b border-border/40 bg-muted/20 p-5">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary" />
                          الطلب المرتبط والمسجد
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4 text-right">
                        <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-xs text-muted-foreground font-semibold">رقم الطلب</p>
                            <Link href={`/requests/${project.request.id}`}>
                              <p className="font-bold text-primary hover:underline cursor-pointer flex items-center gap-1 mt-1">
                                {project.request.requestNumber}
                                <ArrowRight className="w-3 h-3 rotate-180" />
                              </p>
                            </Link>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-xs text-muted-foreground font-semibold">البرنامج</p>
                            <p className="font-bold text-foreground mt-1">{project.request.programType || "—"}</p>
                          </div>
                          {project.request.mosqueName && (
                            <div className="col-span-2 p-3 rounded-xl bg-muted/20 border border-border/40">
                              <p className="text-xs text-muted-foreground font-semibold">المسجد</p>
                              <p className="font-bold text-foreground mt-1">{project.request.mosqueName} - {project.request.mosqueCity || ""}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>

                {/* بطاقة المساجد المشمولة في حالة مشروع عدة مساجد المباشر */}
                {(project as any).linkedMosques && (project as any).linkedMosques.length > 0 && (
                  <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                    <CardHeader className="text-right border-b border-border/40 bg-muted/20 p-5 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2" dir="rtl">
                          <Building className="w-4 h-4 text-primary" />
                          المساجد المشمولة بالمشروع (عدة مساجد)
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          قائمة المساجد المعتمدة والمشمولة ضمن هذا المشروع المباشر
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 rounded-lg">
                        {(project as any).linkedMosques.length} مساجد
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table dir="rtl">
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="text-center font-bold w-16 pr-6 pl-2 py-3.5">#</TableHead>
                            <TableHead className="text-right font-bold px-4 py-3.5">اسم المسجد</TableHead>
                            <TableHead className="text-right font-bold px-4 py-3.5">المدينة / المنطقة</TableHead>
                            <TableHead className="text-right font-bold px-4 py-3.5">الحي</TableHead>
                            <TableHead className="text-left font-bold pl-6 pr-4 py-3.5">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(project as any).linkedMosques.map((item: any, idx: number) => (
                            <TableRow key={item.id} className="hover:bg-muted/20">
                              <TableCell className="text-center font-bold text-muted-foreground text-xs pr-6 pl-2 py-3.5">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-bold text-foreground px-4 py-3.5">
                                {item.mosqueName || `مسجد #${item.mosqueId}`}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs px-4 py-3.5">
                                {item.mosqueCity || "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs px-4 py-3.5">
                                {item.mosqueDistrict || "—"}
                              </TableCell>
                              <TableCell className="text-left pl-6 pr-4 py-3.5">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                                  مشمول بالمشروع
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {(project as any).evaluations && (project as any).evaluations.length > 0 && (
                  <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                    <CardHeader className="text-right border-b border-border/40 bg-muted/20 p-5">
                      <CardTitle className="text-base font-bold flex items-center gap-2" dir="rtl">
                        <FileText className="w-4 h-4 text-primary" />
                        ملاحظات التقييم الفني
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div className="space-y-3">
                        {(project as any).evaluations.map((evalNote: any) => (
                          <div key={evalNote.id} className="p-4 bg-muted/20 rounded-xl space-y-2 border border-border/40 text-right" dir="rtl">
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-primary text-xs sm:text-sm">{evalNote.userName || "موظف التقييم"}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                {new Date(evalNote.createdAt).toLocaleString("ar-SA")}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm space-y-2">
                              {evalNote.justification && (
                                <div>
                                  <span className="text-muted-foreground block text-[11px] font-bold mb-1">المبررات:</span>
                                  <p className="whitespace-pre-wrap text-foreground font-medium leading-relaxed">{evalNote.justification}</p>
                                </div>
                              )}
                              {evalNote.notes && (
                                <div>
                                  <span className="text-muted-foreground block text-[11px] font-bold mb-1">ملاحظات إضافية:</span>
                                  <p className="whitespace-pre-wrap text-foreground leading-relaxed">{evalNote.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* الإنجاز والمعالم */}
              <TabsContent value="progress_milestones" className="space-y-6 mt-0">
                <ProjectProgressMilestonesTab
                  projectId={project.id}
                  initialPlannedProgress={project.plannedProgress}
                  actualProgress={project.completionPercentage}
                  initialStartDate={project.startDate}
                  initialMilestones={project.milestones}
                  onSaveSuccess={refetch}
                />
              </TabsContent>

              {/* المراحل */}
              <TabsContent value="phases" className="space-y-6 mt-0">
                <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                  <CardHeader className="text-right border-b border-border/40 bg-muted/20 p-5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      مراحل سير المشروع
                    </CardTitle>
                    <CardDescription className="text-xs">
                      متابعة وتحديث تقدم المراحل التنفيذية للمشروع
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 text-right">
                    {project.phases && project.phases.length > 0 ? (
                      <div className="space-y-3.5">
                        {project.phases.map((phase, index) => (
                          <div key={phase.id} className="flex items-center gap-4 p-4 bg-muted/20 hover:bg-muted/30 transition-all rounded-xl border border-border/40">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs font-mono font-bold ${
                              phase.status === "completed" ? "bg-emerald-500 text-white" :
                              phase.status === "in_progress" ? "bg-blue-600 text-white" :
                              "bg-muted text-muted-foreground border border-border/60"
                            }`}>
                              {phase.status === "completed" ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                <h4 className="font-bold text-sm text-foreground">{phase.phaseName}</h4>
                                <Badge variant="outline" className={`${phaseStatusColors[phase.status || "pending"]} text-xs font-bold`}>
                                  {phaseStatusLabels[phase.status || "pending"]}
                                </Badge>
                              </div>
                              {phase.description && (
                                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{phase.description}</p>
                              )}
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      phase.status === "completed" ? "bg-emerald-500" : "bg-blue-600"
                                    }`} 
                                    style={{ width: `${Math.min(100, Math.max(0, phase.completionPercentage || 0))}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground font-mono font-bold shrink-0">
                                  {phase.completionPercentage || 0}%
                                  {phase.completionPercentage === 100 && " (مكتمل)"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">لا توجد مراحل محددة لهذا المشروع</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* جدول الكميات */}
              <TabsContent value="boq" className="space-y-6 mt-0">
                <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4 border-b border-border/40 bg-muted/20 p-5">
                    <div className="flex-1">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        جداول الكميات (BOQ)
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {project.isMultiMosque
                          ? "إدارة جداول الكميات لمشروع عدة مساجد"
                          : "إدارة جداول الكميات والبنود المرتبطة بهذا المشروع"}
                      </CardDescription>
                    </div>
                    {!isBOQLocked && (
                      <Button 
                        className="gradient-primary text-white rounded-xl shadow-xs text-xs font-bold h-9" 
                        onClick={() => boqTabRef.current?.openAddDialog()}
                      >
                        <Plus className="w-4 h-4 ml-1.5" />
                        إضافة بند جديد
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-5">
                    <BoqTab 
                      requestId={project.requestId || undefined} 
                      projectId={project.id} 
                      isLocked={isBOQLocked} 
                      ref={boqTabRef} 
                      hideAddButton={true} 
                    />
                    {showApproveBOQButton && project.requestId && (
                      <div className="mt-6 flex justify-center">
                        <Button 
                          className="gradient-primary text-white shadow-md hover:shadow-lg transition-all gap-2 rounded-xl h-10 px-6 font-bold text-xs sm:text-sm"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من اعتماد جدول الكميات؟\nعند الاعتماد سيتم تحويل المشروع لمرحلة التقييم المالي واعتماد العرض.")) {
                              updateRequestStageMutation.mutate({ 
                                requestId: project.requestId!, 
                                newStage: "financial_eval_and_approval" as any 
                              });
                            }
                          }}
                          disabled={updateRequestStageMutation.isPending}
                        >
                          {updateRequestStageMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          اعتماد جداول الكميات
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* المالية */}
              {canViewFinancials && (
                <TabsContent value="financials" className="space-y-6 mt-0">
                  {isFinancialsLocked ? (
                    <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                      <CardContent className="pt-6">
                        <div className="text-center py-12">
                          <div className="bg-amber-500/5 p-8 rounded-2xl border border-amber-500/20 max-w-lg mx-auto shadow-xs">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto border border-amber-500/20">
                              <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">قسم المالية مقفل حالياً</h3>
                            <p className="text-amber-800/80 dark:text-amber-300/80 text-xs sm:text-sm leading-relaxed mb-5">
                              هذا القسم غير متاح للعرض أو الإضافة حالياً. سيتم إلغاء قفل قسم المالية وتفعيله بالكامل تلقائياً بمجرد اكتمال <strong>المرحلة الثالثة: التقييم المالي والاعتماد</strong> للمشروع.
                            </p>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold">
                              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              يتطلب اكتمال مرحلة التقييم المالي واعتماد عروض الأسعار أولاً
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <ProjectFinancialsTab projectId={parseInt(id || "0")} />
                  )}
                </TabsContent>
              )}

              {/* العقود */}
              <TabsContent value="contracts" className="space-y-6 mt-0">
                <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4 border-b border-border/40 bg-muted/20 p-5">
                    <div className="flex-1">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <FileSignature className="w-4 h-4 text-primary" />
                        العقود
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {isExecutionStarted 
                          ? "تم قفل التعديل على العقود بسبب بدء مرحلة التنفيذ وصرف المدفوعات"
                          : "عقود المقاولين والموردين المعتمدة للمشروع"
                        }
                      </CardDescription>
                    </div>
                    {!isContractsLocked && !isExecutionStarted && (!project.contracts || project.contracts.length === 0) && (
                      <Button 
                        className="gradient-primary text-white rounded-xl shadow-xs text-xs font-bold h-9" 
                        onClick={() => navigate(`/contracts/new/request/${project.requestId}?projectId=${project.id}`)}
                      >
                        <Plus className="w-4 h-4 ml-1.5" />
                        إضافة عقد
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-5">
                    {isContractsLocked ? (
                      <div className="text-center py-12">
                        <div className="bg-amber-500/5 p-8 rounded-2xl border border-amber-500/20 max-w-lg mx-auto shadow-xs">
                          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto border border-amber-500/20">
                            <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">قسم العقود مقفل حالياً</h3>
                          <p className="text-amber-800/80 dark:text-amber-300/80 text-xs sm:text-sm leading-relaxed mb-5">
                            هذا القسم غير متاح للعرض أو الإضافة حالياً. سيتم إلغاء قفل قسم العقود وتفعيله بالكامل تلقائياً بمجرد اكتمال <strong>المرحلة الثالثة: التقييم المالي والاعتماد</strong> للمشروع.
                          </p>
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            يتطلب اكتمال مرحلة التقييم المالي واعتماد عروض الأسعار أولاً
                          </div>
                        </div>
                      </div>
                    ) : project.contracts && project.contracts.length > 0 ? (
                      <div className="overflow-x-auto w-full scrollbar-hide rounded-xl border border-border/40">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="text-right font-bold py-3.5 px-4">رقم العقد</TableHead>
                              <TableHead className="text-right font-bold py-3.5 px-4">المورد</TableHead>
                              <TableHead className="text-right font-bold py-3.5 px-4">نوع العقد</TableHead>
                              <TableHead className="text-right font-bold py-3.5 px-4">القيمة</TableHead>
                              <TableHead className="text-right font-bold py-3.5 px-4">الحالة</TableHead>
                              <TableHead className="text-center font-bold py-3.5 px-4">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {project.contracts.map((contract) => (
                              <TableRow key={contract.id} className="hover:bg-muted/20">
                                <TableCell className="font-bold text-right font-mono py-3.5 px-4">{contract.contractNumber}</TableCell>
                                <TableCell className="text-right font-medium py-3.5 px-4">{contract.supplierName || "غير محدد"}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs py-3.5 px-4">{contract.contractType || "-"}</TableCell>
                                <TableCell className="text-right font-bold font-mono py-3.5 px-4">{formatCurrency(contract.amount)}</TableCell>
                                <TableCell className="text-right py-3.5 px-4">
                                  <Badge 
                                    variant="outline"
                                    className={
                                      contract.status === "approved" || contract.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      contract.status === "draft" ? "bg-gray-100 text-gray-800 border-gray-200" :
                                      contract.status === "pending_approval" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                      "bg-gray-100 text-gray-800 border-gray-200"
                                    }
                                  >
                                    {contract.status === "draft" ? "مسودة" :
                                     contract.status === "pending_approval" ? "بانتظار الاعتماد" :
                                     contract.status === "approved" ? "معتمد" :
                                     contract.status === "active" ? "نشط" :
                                     contract.status === "completed" ? "مكتمل" : 
                                     contract.status === "terminated" ? "منتهي" : 
                                     contract.status === "cancelled" ? "ملغي" : "غير محدد"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center py-3.5 px-4">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    {contract.status === "draft" && !isExecutionStarted && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                                        onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                                        title="تعديل العقد"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {contract.status !== "draft" && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-muted rounded-lg"
                                        onClick={() => navigate(`/contracts/${contract.id}/preview`)}
                                        title="معاينة العقد"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileSignature className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">لا توجد عقود مسجلة</p>
                      </div>
                    )}

                    {showApproveContractButton && (
                      <div className="mt-6 flex justify-center">
                        <Button 
                          className="gradient-primary text-white shadow-md hover:shadow-lg transition-all gap-2 rounded-xl h-10 px-6 font-bold text-xs sm:text-sm"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من اعتماد هذا العقد؟\nعند الاعتماد سيتم تحويل المشروع لمرحلة التنفيذ وصرف المدفوعات.")) {
                              approveContractMutation.mutate({ id: project.contracts![0].id });
                            }
                          }}
                          disabled={approveContractMutation.isPending}
                        >
                          {approveContractMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          اعتماد العقد
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* الدفعات */}
              <TabsContent value="payments" className="space-y-6 mt-0">
                <Card className="rounded-2xl border border-border/60 shadow-xs bg-card overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4 border-b border-border/40 bg-muted/20 p-5">
                    <div className="flex-1">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        الدفعات المالية
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        سجل الدفعات والمستخلصات المالية للمشروع
                      </CardDescription>
                    </div>
                    {!isPaymentsLocked && (
                      <Button 
                        className="gradient-primary text-white rounded-xl shadow-xs text-xs font-bold h-9" 
                        onClick={() => navigate(`/disbursements/new/${project.id}`)}
                        disabled={isContractFullyAllocated}
                        title={isContractFullyAllocated ? "تم الوصول للحد الأقصى لقيمة العقد" : ""}
                      >
                        <Plus className="w-4 h-4 ml-1.5" />
                        إضافة دفعة
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-5">
                    {isPaymentsLocked ? (
                      <div className="text-center py-12">
                        <div className="bg-amber-500/5 p-8 rounded-2xl border border-amber-500/20 max-w-lg mx-auto shadow-xs">
                          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto border border-amber-500/20">
                            <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">قسم الدفعات مقفل حالياً</h3>
                          <p className="text-amber-800/80 dark:text-amber-300/80 text-xs sm:text-sm leading-relaxed mb-5">
                            هذا القسم غير متاح للصرف أو العرض حالياً. سيتم إلغاء قفل قسم الدفعات وتفعيله بالكامل تلقائياً بمجرد اكتمال <strong>المرحلة الرابعة: التعاقد</strong> للمشروع.
                          </p>
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            يتطلب اكتمال مرحلة التعاقد وتوثيق العقد أولاً
                          </div>
                        </div>
                      </div>
                    ) : project.payments && project.payments.length > 0 ? (
                      <>
                        {project.payments.some(payment => payment.source !== "manual" && (
                          payment.completionPercentage === null || 
                          payment.completionPercentage === undefined || 
                          payment.completionPercentage === 0 ||
                          !payment.workDescription || 
                          payment.workDescription.trim() === ""
                        )) && (
                          <Alert className="bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/50 mb-5 text-right rounded-2xl">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <AlertTitle className="font-bold text-amber-800 dark:text-amber-400 text-sm">تنبيه: توجد دفعات بمعلومات ناقصة</AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed">
                              بعض الدفعات المضافة تفتقر إلى "نسبة الإنجاز المطلوبة" أو "وصف الأعمال التي سوف تنجز". يرجى استكمال هذه البيانات من خلال الضغط على أيقونة التعديل (📝) بجانب الدفعة المعنية لتجنب أي عوائق في مسار الاعتماد المالي.
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="overflow-x-auto w-full scrollbar-hide rounded-xl border border-border/40">
                          <Table>
                            <TableHeader className="bg-muted/40">
                              <TableRow>
                                <TableHead className="text-right font-bold py-3.5 px-4">رقم الدفعة</TableHead>
                                <TableHead className="text-right font-bold py-3.5 px-4">عنوان الدفعة</TableHead>
                                <TableHead className="text-right font-bold py-3.5 px-4">المبلغ</TableHead>
                                <TableHead className="text-right font-bold py-3.5 px-4">الحالة</TableHead>
                                <TableHead className="text-right font-bold py-3.5 px-4">التاريخ</TableHead>
                                <TableHead className="text-center font-bold py-3.5 px-4">الإجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {project.payments.map((payment) => (
                                <TableRow key={payment.id} className="hover:bg-muted/20">
                                  <TableCell className="font-bold text-right font-mono py-3.5 px-4">{payment.paymentNumber}</TableCell>
                                  <TableCell className="text-right py-3.5 px-4">
                                    <div className="flex flex-col text-right">
                                      <span className="font-bold text-foreground text-xs sm:text-sm">{payment.description || "-"}</span>
                                      {payment.source !== "manual" && (
                                        payment.completionPercentage === null || 
                                        payment.completionPercentage === undefined || 
                                        payment.completionPercentage === 0 ||
                                        !payment.workDescription || 
                                        payment.workDescription.trim() === ""
                                      ) && (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                          <span>بيانات غير مكتملة:</span>
                                          {(payment.completionPercentage === null || payment.completionPercentage === undefined || payment.completionPercentage === 0) && (
                                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200/50">
                                              نسبة الإنجاز ناقصة
                                            </span>
                                          )}
                                          {(!payment.workDescription || payment.workDescription.trim() === "") && (
                                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200/50">
                                              وصف الأعمال ناقص
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-3.5 px-4 font-mono font-black text-foreground">
                                    {formatCurrency(payment.amount)}
                                  </TableCell>
                                  <TableCell className="text-right py-3.5 px-4">
                                    <Badge variant="outline" className={
                                      payment.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      payment.status === "approved" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                      payment.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                                      payment.status === "due" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                      "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    }>
                                      {payment.status === "pending" ? "قيد الانتظار" :
                                       payment.status === "approved" ? "معتمد" :
                                       payment.status === "paid" ? "مسدد" : 
                                       payment.status === "due" ? "مستحق" : "مرفوض"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-xs font-mono py-3.5 px-4">
                                    {(() => {
                                      const raw = payment.paidAt || payment.date;
                                      if (!raw) return "-";
                                      if (typeof raw === 'string') {
                                        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
                                      }
                                      const d = new Date(raw);
                                      if (isNaN(d.getTime())) return "-";
                                      const year = d.getFullYear();
                                      const month = String(d.getMonth() + 1).padStart(2, '0');
                                      const day = String(d.getDate()).padStart(2, '0');
                                      return `${year}-${month}-${day}`;
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-center py-3.5 px-4">
                                    <div className="flex items-center gap-1.5 justify-center">
                                      {payment.id && payment.status !== "paid" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                                          onClick={() => navigate(`/payments/edit/${payment.id}`)}
                                          title="تعديل الدفعة"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="mt-5 p-4 sm:p-5 bg-muted/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between border border-border/50 gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-semibold text-xs sm:text-sm">إجمالي قيم المدفوعات:</span>
                            <span className="font-black text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(paidPaymentsSum.toString())}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-semibold text-xs sm:text-sm">المتبقي:</span>
                            <span className="font-black text-sm sm:text-base font-mono text-amber-600 dark:text-amber-400">{formatCurrency(remainingContractSum.toString())}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-semibold text-xs sm:text-sm">من إجمالي قيمة العقد:</span>
                            <span className="font-black text-sm sm:text-base font-mono text-foreground">{formatCurrency(totalContractsSum.toString())}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">لا توجد دفعات مسجلة</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
