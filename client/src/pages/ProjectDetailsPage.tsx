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

  return (
    <DashboardLayout>
      <div className="space-y-6 container mx-auto px-4 md:px-0" dir="rtl">
        {/* العنوان */}
        <div className="flex items-center gap-4 text-right">
          <Button 
            variant="ghost" 
            size="icon" 
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
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{project.projectNumber}</h1>
              <Badge variant="outline" className={statusColors[project.status || "planning"]}>
                {getStatusLabel()}
              </Badge>
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1 max-w-md">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8 py-1 px-2 text-sm text-foreground bg-background border border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 px-3 text-xs gradient-primary text-white font-semibold"
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
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditedName(project.name || "");
                  }}
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground">{project.name}</p>
                {canEditProjectName && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted/55 rounded-full p-0"
                    onClick={() => {
                      setEditedName(project.name || "");
                      setIsEditingName(true);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* بطاقات المعلومات الرئيسية وشريط التقدم - تظهر فقط لمن يملك صلاحية التفاصيل كاملة */}
        {!financialsOnly && (
          <>
            <TooltipProvider delayDuration={300}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* الميزانية - تظهر للمشاريع المباشرة أو عندما تكون حالة الطلب المرتبط هي "التقييم المالي واعتماد العرض" أو بعدها */}
                {(!project.request || project.isMultiMosque || BUDGET_VISIBLE_STAGES.includes(project.request.currentStage)) ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-right">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-muted-foreground font-bold">الميزانية</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>الميزانية هي قيمة الإجمالي الكلي لجدول الكميات وتظهر بعد مرحلة التقييم المالي واعتماد العرض</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="font-bold text-foreground">
                            {boqData && boqData.total > 0
                              ? formatCurrency(boqData.total.toString())
                              : formatCurrency(project.budget)
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-right">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-muted-foreground font-bold">الميزانية</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>الميزانية تظهر بعد وصول الطلب لمرحلة التقييم المالي واعتماد العرض</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="font-bold text-muted-foreground text-sm">لم تُحدد بعد</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-muted-foreground font-bold">التكلفة الفعلية</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>هي التكلفة النهائية المتفقة عليها في العقد والتي تشمل نسبة الجمعية</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="font-bold text-foreground">{formatCurrency(project.actualCost)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-muted-foreground font-bold">نسبة الإنجاز</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>النسبة تزداد بشكل تلقائي اعتماداً على اكتمال مراحل المشروع</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="font-bold text-foreground">{project.completionPercentage || 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-muted-foreground font-bold">مدير المشروع</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>هو المسؤول عن إدارة المشروع</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {isEditingManager ? (
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1">
                              <Select
                                value={project.managerId?.toString() || ""}
                                onValueChange={(val) => handleUpdateManager(parseInt(val))}
                              >
                                <SelectTrigger className="h-9 w-full border-slate-200 text-xs font-semibold focus:ring-indigo-500/20 bg-white dark:bg-slate-950">
                                  <SelectValue placeholder="اختر مدير المشروع..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {projectManagers.map((m: any) => (
                                    <SelectItem key={m.id} value={m.id.toString()} className="text-xs font-medium">
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setIsEditingManager(false)} 
                              className="h-8 w-8 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-lg shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground">{project.managerName || "غير محدد"}</p>
                            {canChangeManager && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted/55 rounded-full p-0"
                                onClick={() => setIsEditingManager(true)} 
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TooltipProvider>

            {/* شريط التقدم */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-right">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">تقدم المشروع</span>
                  <span className="text-sm text-muted-foreground">{project.completionPercentage || 0}%</span>
                </div>
                <Progress value={project.completionPercentage || 0} className="h-3" />
              </CardContent>
            </Card>
          </>
        )}

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          {!financialsOnly && (
            <TabsList className={`flex items-center justify-start overflow-x-auto pb-1 scrollbar-hide flex-nowrap w-full md:grid ${canViewFinancials ? 'md:grid-cols-7' : 'md:grid-cols-6'} h-auto p-1 bg-muted`}>
              <TabsTrigger value="overview" className="shrink-0">نظرة عامة</TabsTrigger>
              <TabsTrigger value="progress_milestones" className="shrink-0">الإنجاز والمعالم</TabsTrigger>
              <TabsTrigger value="phases" className="shrink-0">المراحل</TabsTrigger>
              <TabsTrigger value="boq" className="shrink-0">جدول الكميات</TabsTrigger>
              {canViewFinancials && <TabsTrigger value="financials" className="shrink-0">المالية</TabsTrigger>}
              <TabsTrigger value="contracts" className="shrink-0">العقود</TabsTrigger>
              <TabsTrigger value="payments" className="shrink-0">الدفعات</TabsTrigger>
            </TabsList>
          )}

          {/* نظرة عامة */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="text-right">
                  <CardTitle className="text-lg">معلومات المشروع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-right">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">رقم المشروع</p>
                      <p className="font-medium">{project.projectNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الحالة</p>
                      <Badge variant="outline" className={statusColors[project.status || "planning"]}>
                        {getStatusLabel()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ البدء</p>
                      <p className="font-medium">
                        {project.startDate 
                          ? new Date(project.startDate).toLocaleDateString("ar-SA")
                          : "لم يبدأ بعد"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الانتهاء المتوقع</p>
                      <p className="font-medium">
                        {project.expectedEndDate 
                          ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA")
                          : "غير محدد"
                        }
                      </p>
                    </div>
                    {project.donorName && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">اسم المانح / الجهة الداعمة</p>
                        <p className="font-bold text-primary">{project.donorName}</p>
                      </div>
                    )}
                    {project.isMultiMosque && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">نوع المشروع</p>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 mt-1 font-bold">
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
                      <p className="font-medium text-xs sm:text-sm text-foreground bg-muted/40 p-3 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {project.isMultiMosque ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="text-right">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      إدارة ومساجد المشروع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-right">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">مدير المشروع</p>
                        <p className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                          <Users className="w-4 h-4 text-primary" />
                          {project.managerName || "غير محدد"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">عدد المساجد المشمولة</p>
                        <p className="font-bold text-primary flex items-center gap-1.5 mt-0.5">
                          <Building className="w-4 h-4 text-primary" />
                          {(project as any).linkedMosques?.length || 0} مساجد
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">المدة المخططة</p>
                        <p className="font-medium text-foreground">
                          {project.startDate && project.expectedEndDate
                            ? `${Math.round((new Date(project.expectedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم`
                            : "غير محددة"
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">المرحلة الحالية</p>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 mt-1 font-bold">
                          إعداد جدول الكميات (مباشر)
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : project.request ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="text-right">
                    <CardTitle className="text-lg">الطلب المرتبط</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-right">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">رقم الطلب</p>
                        <Link href={`/requests/${project.request.id}`}>
                          <p className="font-medium text-primary hover:underline cursor-pointer">
                            {project.request.requestNumber}
                          </p>
                        </Link>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">البرنامج</p>
                        <p className="font-medium">{project.request.programType}</p>
                      </div>
                      {project.request.mosqueName && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">المسجد</p>
                          <p className="font-medium">{project.request.mosqueName} - {project.request.mosqueCity}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* بطاقة المساجد المشمولة في حالة مشروع عدة مساجد المباشر */}
            {(project as any).linkedMosques && (project as any).linkedMosques.length > 0 && (
              <Card className="border-0 shadow-sm mt-6">
                <CardHeader className="text-right flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2" dir="rtl">
                      <Building className="w-5 h-5 text-primary" />
                      المساجد المشمولة بالمشروع (عدة مساجد)
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      قائمة المساجد المعتمدة والمشمولة ضمن هذا المشروع المباشر
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">
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
              <Card className="border-0 shadow-sm mt-6">
                <CardHeader className="text-right">
                  <CardTitle className="text-lg flex items-center gap-2" dir="rtl">
                    <FileText className="w-5 h-5 text-primary" />
                    ملاحظات التقييم الفني
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(project as any).evaluations.map((evalNote: any) => (
                      <div key={evalNote.id} className="p-4 bg-muted/30 rounded-lg space-y-2 border border-muted/50 text-right" dir="rtl">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-semibold text-primary">{evalNote.userName || "موظف التقييم"}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {new Date(evalNote.createdAt).toLocaleString("ar-SA")}
                          </span>
                        </div>
                        <div className="text-sm space-y-2">
                          {evalNote.justification && (
                            <div>
                              <span className="text-muted-foreground block text-xs mb-1">المبررات:</span>
                              <p className="whitespace-pre-wrap text-foreground font-medium leading-relaxed">{evalNote.justification}</p>
                            </div>
                          )}
                          {evalNote.notes && (
                            <div>
                              <span className="text-muted-foreground block text-xs mb-1">ملاحظات إضافية:</span>
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
          <TabsContent value="progress_milestones" className="space-y-4">
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
          <TabsContent value="phases" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="text-right">
                <CardTitle className="text-lg">مراحل المشروع</CardTitle>
                <CardDescription>متابعة تقدم مراحل المشروع</CardDescription>
              </CardHeader>
              <CardContent className="text-right">
                {project.phases && project.phases.length > 0 ? (
                  <div className="space-y-4">
                    {project.phases.map((phase, index) => (
                      <div key={phase.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          phase.status === "completed" ? "bg-green-500 text-white" :
                          phase.status === "in_progress" ? "bg-blue-500 text-white" :
                          "bg-gray-200 text-gray-600"
                        }`}>
                          {phase.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{phase.phaseName}</h4>
                            <Badge variant="outline" className={phaseStatusColors[phase.status || "pending"]}>
                              {phaseStatusLabels[phase.status || "pending"]}
                            </Badge>
                          </div>
                          {phase.description && (
                            <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                          )}
                            <div className="flex items-center gap-4 mt-2">
                              <Progress value={phase.completionPercentage || 0} className="flex-1 h-2" />
                              <span className="text-sm text-muted-foreground font-medium">
                                {phase.completionPercentage || 0}%
                                {phase.completionPercentage === 100 && " (مكتمل)"}
                              </span>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد مراحل محددة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* جدول الكميات */}
          <TabsContent value="boq" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg">جداول الكميات (BOQ)</CardTitle>
                  <CardDescription>
                    {project.isMultiMosque
                      ? "إدارة جداول الكميات لمشروع عدة مساجد"
                      : "إدارة جداول الكميات المرتبطة بهذا المشروع"}
                  </CardDescription>
                </div>
                {!isBOQLocked && (
                  <Button 
                    className="gradient-primary text-white" 
                    onClick={() => boqTabRef.current?.openAddDialog()}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة بند جديد
                  </Button>
                )}
              </CardHeader>
              <CardContent>
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
                      className="gradient-primary text-white shadow-md hover:shadow-lg transition-all gap-2"
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
            <TabsContent value="financials" className="space-y-4 pt-2">
              {isFinancialsLocked ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <div className="bg-amber-50/50 p-8 rounded-xl border border-amber-100/60 max-w-lg mx-auto shadow-sm backdrop-blur-sm">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-6 mx-auto border border-amber-200">
                          <Lock className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold text-amber-900 mb-3">قسم المالية مقفل حالياً</h3>
                        <p className="text-amber-700 text-sm leading-relaxed mb-6">
                          هذا القسم غير متاح للعرض أو الإضافة حالياً. سيتم إلغاء قفل قسم المالية وتفعيله بالكامل تلقائياً بمجرد اكتمال **المرحلة الثالثة: التقييم المالي والاعتماد** للمشروع.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/40 border border-amber-200/50 rounded-lg text-amber-800 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
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
          <TabsContent value="contracts" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">العقود</CardTitle>
                  </div>
                  <CardDescription>
                    {isExecutionStarted 
                      ? "تم قفل التعديل على العقود بسبب بدء مرحلة التنفيذ وصرف المدفوعات"
                      : "عقود المقاولين والموردين"
                    }
                  </CardDescription>
                </div>
                {!isContractsLocked && !isExecutionStarted && (!project.contracts || project.contracts.length === 0) && (
                  <Button 
                    className="gradient-primary text-white" 
                    onClick={() => navigate(`/contracts/new/request/${project.requestId}?projectId=${project.id}`)}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة عقد
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isContractsLocked ? (
                  <div className="text-center py-12">
                    <div className="bg-amber-50/50 p-8 rounded-xl border border-amber-100/60 max-w-lg mx-auto shadow-sm backdrop-blur-sm">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-6 mx-auto border border-amber-200">
                        <Lock className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                      </div>
                      <h3 className="text-xl font-bold text-amber-900 mb-3">قسم العقود مقفل حالياً</h3>
                      <p className="text-amber-700 text-sm leading-relaxed mb-6">
                        هذا القسم غير متاح للعرض أو الإضافة حالياً. سيتم إلغاء قفل قسم العقود وتفعيله بالكامل تلقائياً بمجرد اكتمال **المرحلة الثالثة: التقييم المالي والاعتماد** للمشروع.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/40 border border-amber-200/50 rounded-lg text-amber-800 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        يتطلب اكتمال مرحلة التقييم المالي واعتماد عروض الأسعار أولاً
                      </div>
                    </div>
                  </div>
                ) : project.contracts && project.contracts.length > 0 ? (
                  <div className="overflow-x-auto w-full scrollbar-hide">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم العقد</TableHead>
                        <TableHead className="text-right">المورد</TableHead>
                        <TableHead className="text-right">نوع العقد</TableHead>
                        <TableHead className="text-right">القيمة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium text-right">{contract.contractNumber}</TableCell>
                          <TableCell className="text-right">{contract.supplierName || "غير محدد"}</TableCell>
                          <TableCell className="text-right">{contract.contractType || "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(contract.amount)}</TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant="outline"
                              className={
                                contract.status === "approved" || contract.status === "active" ? "bg-green-100 text-green-800 border-green-200" :
                                contract.status === "draft" ? "bg-gray-100 text-gray-800 border-gray-200" :
                                contract.status === "pending_approval" ? "bg-blue-100 text-blue-800 border-blue-200" :
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
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {/* زر التعديل - يظهر فقط إذا كان العقد مسودة ولم تبدأ مرحلة التنفيذ */}
                              {contract.status === "draft" && !isExecutionStarted && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                                  title="تعديل العقد"
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              {/* زر المعاينة - يظهر فقط إذا تجاوز العقد مرحلة المسودة (أي تم الضغط على إنشاء واعتماد العقد) */}
                              {contract.status !== "draft" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
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
                    <div className="text-center py-8">
                      <FileSignature className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">لا توجد عقود مسجلة</p>
                    </div>
                  )}

                {showApproveContractButton && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      className="gradient-primary text-white shadow-md hover:shadow-lg transition-all gap-2"
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
                      )}              </CardContent>
            </Card>
          </TabsContent>

          {/* الدفعات */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex items-center justify-between text-right">
                <div className="flex-1">
                  <CardTitle className="text-lg">الدفعات</CardTitle>
                  <CardDescription>سجل الدفعات المالية للمشروع</CardDescription>
                </div>
                {!isPaymentsLocked && (
                  <Button 
                    className="gradient-primary text-white" 
                    onClick={() => navigate(`/disbursements/new/${project.id}`)}
                    disabled={isContractFullyAllocated}
                    title={isContractFullyAllocated ? "تم الوصول للحد الأقصى لقيمة العقد" : ""}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة دفعة
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isPaymentsLocked ? (
                  <div className="text-center py-12">
                    <div className="bg-amber-50/50 p-8 rounded-xl border border-amber-100/60 max-w-lg mx-auto shadow-sm backdrop-blur-sm">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-6 mx-auto border border-amber-200">
                        <Lock className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                      </div>
                      <h3 className="text-xl font-bold text-amber-900 mb-3">قسم الدفعات مقفل حالياً</h3>
                      <p className="text-amber-700 text-sm leading-relaxed mb-6">
                        هذا القسم غير متاح للصرف أو العرض حالياً. سيتم إلغاء قفل قسم الدفعات وتفعيله بالكامل تلقائياً بمجرد اكتمال **المرحلة الرابعة: التعاقد** للمشروع.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/40 border border-amber-200/50 rounded-lg text-amber-800 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
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
                      <Alert className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/50 mb-6 text-right">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        <AlertTitle className="font-bold text-amber-800 dark:text-amber-400">تنبيه: توجد دفعات بمعلومات ناقصة</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed">
                          بعض الدفعات المضافة تفتقر إلى "نسبة الإنجاز المطلوبة" أو "وصف الأعمال التي سوف تنجز". يرجى استكمال هذه البيانات من خلال الضغط على أيقونة التعديل (📝) بجانب الدفعة المعنية لتجنب أي عوائق في مسار الاعتماد المالي.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="overflow-x-auto w-full scrollbar-hide">
                      <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الدفعة</TableHead>
                        <TableHead className="text-right">عنوان الدفعة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium text-right">{payment.paymentNumber}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col text-right">
                              <span className="font-semibold text-foreground">{payment.description || "-"}</span>
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
                          <TableCell className="text-right">
                            <span className="font-bold">{formatCurrency(payment.amount)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={
                              payment.status === "paid" ? "bg-green-100 text-green-800" :
                              payment.status === "approved" ? "bg-blue-100 text-blue-800" :
                              payment.status === "rejected" ? "bg-red-100 text-red-800" :
                              payment.status === "due" ? "bg-orange-100 text-orange-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {payment.status === "pending" ? "قيد الانتظار" :
                               payment.status === "approved" ? "معتمد" :
                               payment.status === "paid" ? "مسدد" : 
                               payment.status === "due" ? "مستحق" : "مرفوض"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
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
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {payment.id && payment.status !== "paid" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/payments/edit/${payment.id}`)}
                                  title="تعديل الدفعة"
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl flex flex-col sm:flex-row items-center justify-between border border-dashed border-slate-200 dark:border-slate-800 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium text-sm sm:text-base">إجمالي قيم المدفوعات:</span>
                      <span className="font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(paidPaymentsSum.toString())}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium text-sm sm:text-base">المتبقي:</span>
                      <span className="font-bold text-base sm:text-lg text-amber-600 dark:text-amber-400">{formatCurrency(remainingContractSum.toString())}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium text-sm sm:text-base">من إجمالي قيمة العقد:</span>
                      <span className="font-bold text-base sm:text-lg text-foreground">{formatCurrency(totalContractsSum.toString())}</span>
                    </div>
                  </div>
                </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد دفعات مسجلة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>



      </div>
    </DashboardLayout>
  );
}
