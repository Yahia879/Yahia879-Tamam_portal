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
  Sparkles,
  TrendingUp,
  Layers,
  MapPin,
  UserCheck,
  CheckCircle,
  Tag,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStageOrder } from "@shared/constants";
import BoqTab, { BoqTabHandle } from "@/components/BoqTab";
import ProjectProgressMilestonesTab from "@/components/ProjectProgressMilestonesTab";
import ProjectFinancialsTab from "@/components/ProjectFinancialsTab";
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
  planning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold",
  on_hold: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 font-bold",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-bold",
};

const statusLabels: Record<string, string> = {
  planning: "إعداد جدول الكميات",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const phaseStatusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
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
  const serverPermissions = useUserPermissions();
  const canChangeManager = isAdmin || user?.role === 'projects_office';
  const canViewDetails = serverPermissions.includes("projects.view_details");
  const canEditProjectName = canViewDetails || isAdmin;
  const canViewFinancials = serverPermissions.includes("projects.financials");
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

  // شرط إلغاء قفل وتفعيل قسم "المالية"
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
        setIsEditingManager(false);
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

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "غير محدد";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  // شروط القفل
  const isBOQLocked = project?.phases?.some(p => 
    (p.phaseOrder === 2 && p.status === "completed") || 
    (p.phaseOrder > 2 && (p.status === "in_progress" || p.status === "completed"))
  );

  const isContractsLocked = !project?.phases?.some(p => 
    p.phaseOrder === 3 && p.status === "completed"
  );

  const isExecutionStarted = project?.phases?.some(p => 
    p.phaseOrder >= 5 && (p.status === "in_progress" || p.status === "completed")
  );

  const isContractingPhase = project?.phases?.some(p => 
    p.phaseOrder === 4 && p.status === "in_progress"
  );

  const isBOQPreparationPhase = project?.phases?.some(p => 
    p.phaseOrder === 2 && p.status === "in_progress"
  );

  const hasBOQItems = (boqData?.items?.length || 0) > 0;
  const isAllowedToApproveBOQ = ["super_admin", "system_admin", "projects_office"].includes(user?.role || "");
  const showApproveBOQButton = (isBOQPreparationPhase || project?.status === "planning") && hasBOQItems && isAllowedToApproveBOQ;
  const showApproveContractButton = isContractingPhase && project?.contracts?.length === 1 && (project?.contracts[0].status === "draft" || project?.contracts[0].status === "pending_approval");

  const isPaymentsLocked = !project?.phases?.some(p => 
    p.phaseOrder === 4 && p.status === "completed"
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 container mx-auto px-4 py-8">
          <div className="h-36 bg-muted/60 animate-pulse rounded-3xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted/60 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-muted/60 animate-pulse rounded-3xl" />
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
                : "حدث خطأ أثناء تحميل بيانات المشروع"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
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

  const getStatusLabel = () => {
    if (project.status === "completed") return "مكتمل";
    if (project.status === "cancelled") return "ملغي";
    if (project.status === "on_hold") return "متوقف";
    
    const activePhase = project.phases?.find(p => p.status !== "completed");
    if (activePhase) {
      return activePhase.phaseName.replace(/^المرحلة .* : /, "");
    }
    
    return statusLabels[project.status || "planning"];
  };

  const paidPaymentsSum = project?.payments
    ?.filter(p => p.status === "paid" || p.status === "executed" || !!p.paidAt)
    ?.reduce((sum, p) => {
      const amt = parseFloat(String(p.amount || "0").replace(/,/g, ""));
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0) || 0;

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
      <div className="space-y-6 container mx-auto px-4 md:px-0 dir-rtl" dir="rtl">
        
        {/* Ultra-Compact Executive Project Header Card */}
        <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-4 space-y-3">
            {/* Top Row: Back button, Project Number & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-8 w-8 shrink-0 border-border/70 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      navigate("/project-management");
                    }
                  }}
                  title="العودة"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-black text-base sm:text-lg font-mono text-foreground tracking-tight">{project.projectNumber}</span>
                  <Badge variant="outline" className={statusColors[project.status || "planning"]}>
                    {getStatusLabel()}
                  </Badge>
                  {project.donorName && (
                    <Badge variant="secondary" className="rounded-xl font-bold text-[11px] px-2.5 py-0.5">
                      المانح: {project.donorName}
                    </Badge>
                  )}
                  {project.isMultiMosque && (
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-[11px] px-2.5 py-0.5 border border-indigo-200/50">
                      مشروع مباشر (عدة مساجد)
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Editable Title on Right + Inline Progress Bar Widget on Left */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2 max-w-xl">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-8 rounded-xl text-xs font-bold text-foreground bg-background border-primary focus-visible:ring-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 rounded-xl px-3 text-xs gradient-primary text-white font-bold shrink-0"
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
                      className="h-8 rounded-xl px-2.5 text-xs shrink-0"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(project.name || "");
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight leading-snug truncate">
                      {project.name}
                    </h1>
                    {canEditProjectName && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted/60 rounded-lg shrink-0"
                        onClick={() => {
                          setEditedName(project.name || "");
                          setIsEditingName(true);
                        }}
                        title="تعديل الاسم"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline Progress Bar Widget - Extended Width */}
              {!financialsOnly && (
                <div className="flex items-center gap-3 shrink-0 w-full sm:w-80 md:w-96 bg-muted/40 px-3.5 py-2 rounded-xl border border-border/50">
                  <span className="text-xs font-bold text-muted-foreground shrink-0">الإنجاز الكلي:</span>
                  <Progress value={project.completionPercentage || 0} className="h-2.5 rounded-full flex-1" />
                  <span className="font-extrabold text-primary font-mono text-xs shrink-0">
                    {project.completionPercentage || 0}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unified Key Metrics Bar */}
        {!financialsOnly && (
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Budget */}
              {(!project.request || project.isMultiMosque || BUDGET_VISIBLE_STAGES.includes(project.request.currentStage)) ? (
                <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl bg-background">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                        <span>الميزانية الإجمالية</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">الميزانية هي إجمالي قيمة جدول الكميات المعتمد</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-lg sm:text-xl font-extrabold text-foreground">
                        {boqData && boqData.total > 0
                          ? formatCurrency(boqData.total.toString())
                          : formatCurrency(project.budget)
                        }
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/60 shadow-xs rounded-2xl bg-background">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">الميزانية الإجمالية</p>
                      <p className="text-sm font-bold text-muted-foreground">لم تُحدد بعد</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card 2: Actual Cost */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl bg-background">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                      <span>التكلفة الفعلية</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">التكلفة المتفق عليها بالعقد المعتمد</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg sm:text-xl font-extrabold text-foreground">{formatCurrency(project.actualCost)}</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Completion percentage */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl bg-background">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">نسبة الإنجاز</p>
                    <p className="text-lg sm:text-xl font-extrabold text-foreground">{project.completionPercentage || 0}%</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Project Manager */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl bg-background">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">مدير المشروع</p>
                    {isEditingManager ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Select
                          value={project.managerId?.toString() || ""}
                          onValueChange={(val) => handleUpdateManager(parseInt(val))}
                        >
                          <SelectTrigger className="h-8 rounded-xl text-xs font-bold border-border/60 bg-background">
                            <SelectValue placeholder="اختر الموظف..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
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
                          className="h-8 w-8 hover:bg-red-50 text-red-500 rounded-xl shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 truncate">
                        <p className="font-extrabold text-sm sm:text-base text-foreground truncate">
                          {project.managerName || "غير محدد"}
                        </p>
                        {canChangeManager && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted/60 rounded-full p-0 shrink-0"
                            onClick={() => setIsEditingManager(true)} 
                            title="تغيير مدير المشروع"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 mr-2">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

            </div>
          </TooltipProvider>
        )}

        {/* Tab Navigation & Content Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="space-y-6">
          {!financialsOnly && (
            <div className="overflow-x-auto pb-1">
              <TabsList className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border/50 w-full sm:w-auto shrink-0 justify-start">
                <TabsTrigger value="overview" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                  <FolderOpen className="w-4 h-4" />
                  <span>نظرة عامة</span>
                </TabsTrigger>
                <TabsTrigger value="progress_milestones" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                  <TrendingUp className="w-4 h-4" />
                  <span>الإنجاز والمعالم</span>
                </TabsTrigger>
                <TabsTrigger value="phases" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                  <Layers className="w-4 h-4" />
                  <span>المراحل</span>
                </TabsTrigger>
                <TabsTrigger value="boq" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                  <ClipboardList className="w-4 h-4" />
                  <span>جدول الكميات</span>
                </TabsTrigger>
                {canViewFinancials && (
                  <TabsTrigger value="financials" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                    <DollarSign className="w-4 h-4" />
                    <span>المالية</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="contracts" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                  <FileSignature className="w-4 h-4" />
                  <span>العقود</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5 whitespace-nowrap">
                  <CreditCard className="w-4 h-4" />
                  <span>الدفعات</span>
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Main Specs Card */}
              <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
                <CardHeader className="p-5 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span>معلومات المشروع الأساسية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs sm:text-sm">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-primary/70" />
                        <span>رقم المشروع</span>
                      </p>
                      <p className="font-extrabold text-foreground font-mono text-sm">{project.projectNumber}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary/70" />
                        <span>حالة المشروع</span>
                      </p>
                      <Badge variant="outline" className={`rounded-lg ${statusColors[project.status || "planning"]}`}>
                        {getStatusLabel()}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        <span>تاريخ البدء</span>
                      </p>
                      <p className="font-bold text-foreground">
                        {project.startDate 
                          ? new Date(project.startDate).toLocaleDateString("ar-SA")
                          : "لم يبدأ بعد"
                        }
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        <span>تاريخ الانتهاء المتوقع</span>
                      </p>
                      <p className="font-bold text-foreground">
                        {project.expectedEndDate 
                          ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA")
                          : "غير محدد"
                        }
                      </p>
                    </div>

                    {project.donorName && (
                      <div className="col-span-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                        <p className="text-amber-700 dark:text-amber-300 text-[11px] font-semibold">اسم المانح / الجهة الداعمة</p>
                        <p className="font-extrabold text-amber-800 dark:text-amber-200 text-sm">{project.donorName}</p>
                      </div>
                    )}
                  </div>

                  {project.description && (
                    <div className="pt-2">
                      <p className="text-muted-foreground text-xs font-bold mb-1.5">الوصف المرفق للمشروع</p>
                      <p className="font-medium text-foreground leading-relaxed bg-muted/40 p-3.5 rounded-xl border border-border/50 text-xs">
                        {project.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Linked Service Request Card */}
              {project.request && (
                <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
                  <CardHeader className="p-5 border-b border-border/50 bg-muted/20">
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>بيانات الطلب المرتبط</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs sm:text-sm">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                        <p className="text-muted-foreground text-[11px] font-semibold">رقم الطلب</p>
                        <Link href={`/requests/${project.request.id}`}>
                          <span className="font-mono font-extrabold text-primary hover:underline cursor-pointer flex items-center gap-1 text-sm">
                            {project.request.requestNumber}
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                        <p className="text-muted-foreground text-[11px] font-semibold">البرنامج الفني</p>
                        <p className="font-bold text-foreground">{project.request.programType}</p>
                      </div>

                      {project.request.mosqueName && (
                        <div className="col-span-2 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                          <p className="text-primary text-[11px] font-semibold">المسجد المستفيد</p>
                          <p className="font-extrabold text-foreground flex items-center gap-1.5 text-sm">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span>{project.request.mosqueName}</span>
                            {project.request.mosqueCity && <span className="text-xs text-muted-foreground">({project.request.mosqueCity})</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Linked Mosques Table (Multi-Mosque Direct Projects) */}
            {(project as any).linkedMosques && (project as any).linkedMosques.length > 0 && (
              <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
                <CardHeader className="p-5 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <Building className="w-5 h-5 text-primary" />
                      <span>المساجد المشمولة بالمشروع (عدة مساجد)</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      قائمة المساجد المخصصة ضمن هذا المشروع والميزانية المخصصة وشروط الأعمال
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 rounded-xl shrink-0">
                    {(project as any).linkedMosques.length} مساجد
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-right font-bold text-xs">المسجد</TableHead>
                          <TableHead className="text-right font-bold text-xs">المدينة / الحي</TableHead>
                          <TableHead className="text-right font-bold text-xs">الميزانية المخصصة</TableHead>
                          <TableHead className="text-right font-bold text-xs">الإمام / التواصل</TableHead>
                          <TableHead className="text-right font-bold text-xs">الشروط والملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(project as any).linkedMosques.map((item: any) => (
                          <TableRow key={item.id} className="hover:bg-muted/20">
                            <TableCell className="font-bold text-foreground text-xs">
                              {item.mosqueName || `مسجد #${item.mosqueId}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {item.mosqueCity || "—"} {item.mosqueDistrict ? ` - ${item.mosqueDistrict}` : ""}
                            </TableCell>
                            <TableCell className="font-extrabold text-primary font-mono text-xs">
                              {item.allocatedBudget ? `${parseFloat(item.allocatedBudget).toLocaleString()} ريال` : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.imamName ? (
                                <div>
                                  <span className="font-bold block text-foreground">{item.imamName}</span>
                                  <span className="text-muted-foreground font-mono text-[11px]">{item.imamPhone || ""}</span>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs">
                              {item.notes || "لا توجد ملاحظات خاصة"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technical Evaluation Notes */}
            {(project as any).evaluations && (project as any).evaluations.length > 0 && (
              <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
                <CardHeader className="p-5 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>ملاحظات ومبررات التقييم الفني</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-3">
                    {(project as any).evaluations.map((evalNote: any) => (
                      <div key={evalNote.id} className="p-4 bg-muted/30 rounded-xl space-y-2 border border-border/40">
                        <div className="flex justify-between items-center w-full text-xs">
                          <span className="font-extrabold text-primary">{evalNote.userName || "موظف التقييم"}</span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {new Date(evalNote.createdAt).toLocaleString("ar-SA")}
                          </span>
                        </div>
                        <div className="text-xs space-y-2 pt-1">
                          {evalNote.justification && (
                            <div>
                              <span className="text-muted-foreground font-bold block mb-1">المبررات:</span>
                              <p className="whitespace-pre-wrap text-foreground font-medium leading-relaxed bg-background p-3 rounded-xl border border-border/40">{evalNote.justification}</p>
                            </div>
                          )}
                          {evalNote.notes && (
                            <div>
                              <span className="text-muted-foreground font-bold block mb-1">ملاحظات إضافية:</span>
                              <p className="whitespace-pre-wrap text-foreground leading-relaxed bg-background p-3 rounded-xl border border-border/40">{evalNote.notes}</p>
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

          {/* TAB 2: PROGRESS & MILESTONES */}
          <TabsContent value="progress_milestones" className="space-y-6">
            <ProjectProgressMilestonesTab
              projectId={project.id}
              initialPlannedProgress={project.plannedProgress}
              actualProgress={project.completionPercentage}
              initialStartDate={project.startDate}
              initialMilestones={project.milestones}
              onSaveSuccess={refetch}
            />
          </TabsContent>

          {/* TAB 3: PHASES */}
          <TabsContent value="phases" className="space-y-6">
            <Card className="border border-border/60 shadow-xs rounded-3xl bg-background overflow-hidden">
              <CardHeader className="p-6 border-b border-border/40 bg-muted/30">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <span>مراحل المشروع والدورة المستندية</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  متابعة حالة وتقدم كل مرحلة تنفيدية بالخط الزمني للمشروع
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {project.phases && project.phases.length > 0 ? (
                  <div className="space-y-4">
                    {project.phases.map((phase, index) => (
                      <div key={phase.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-sm ${
                          phase.status === "completed" ? "bg-emerald-500 text-white shadow-xs" :
                          phase.status === "in_progress" ? "bg-blue-500 text-white shadow-xs" :
                          "bg-muted text-muted-foreground border border-border/60"
                        }`}>
                          {phase.status === "completed" ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-foreground">{phase.phaseName}</h4>
                            <Badge variant="outline" className={`rounded-xl text-[11px] px-2.5 py-0.5 font-bold ${phaseStatusColors[phase.status || "pending"]}`}>
                              {phaseStatusLabels[phase.status || "pending"]}
                            </Badge>
                          </div>
                          {phase.description && (
                            <p className="text-xs text-muted-foreground">{phase.description}</p>
                          )}
                          <div className="flex items-center gap-3 pt-1">
                            <Progress value={phase.completionPercentage || 0} className="flex-1 h-2 rounded-full" />
                            <span className="text-xs font-mono font-extrabold text-primary shrink-0">
                              {phase.completionPercentage || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground">لا توجد مراحل محددة لهذا المشروع</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: BOQ */}
          <TabsContent value="boq" className="space-y-6">
            <Card className="border border-border/60 shadow-xs rounded-3xl bg-background overflow-hidden">
              <CardHeader className="p-6 border-b border-border/40 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <span>جداول الكميات (BOQ)</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {project.isMultiMosque
                      ? "إدارة بنود وتفاصيل جداول الكميات لمشروع عدة مساجد"
                      : "إدارة بنود وأسعار جداول الكميات التقديرية للمشروع"}
                  </CardDescription>
                </div>
                {!isBOQLocked && (
                  <Button 
                    className="rounded-2xl gradient-primary text-white font-bold text-xs gap-1.5 shadow-md h-10 px-4" 
                    onClick={() => boqTabRef.current?.openAddDialog()}
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة بند جديد</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <BoqTab 
                  requestId={project.requestId || undefined} 
                  projectId={project.id} 
                  isLocked={isBOQLocked} 
                  ref={boqTabRef} 
                  hideAddButton={true} 
                />
                {showApproveBOQButton && project.requestId && (
                  <div className="mt-6 flex justify-center border-t border-border/40 pt-6">
                    <Button 
                      className="rounded-2xl gradient-primary text-white font-bold shadow-lg hover:shadow-xl transition-all gap-2 px-8 h-11"
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
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      <span>اعتماد جداول الكميات ونقل المرحلة</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: FINANCIALS */}
          {canViewFinancials && (
            <TabsContent value="financials" className="space-y-6">
              {isFinancialsLocked ? (
                <Card className="border border-border/60 shadow-xs rounded-3xl bg-background overflow-hidden text-center p-8 sm:p-12">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">قسم المالية مقفل حالياً</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      سيتم إلغاء قفل وتفعيل هذا القسم تلقائياً فور وصول المشروع لمرحلة اعتماد عرض السعر والتقييم المالي.
                    </p>
                  </div>
                </Card>
              ) : (
                <ProjectFinancialsTab projectId={parseInt(id || "0")} />
              )}
            </TabsContent>
          )}

          {/* TAB 6: CONTRACTS */}
          <TabsContent value="contracts" className="space-y-6">
            <Card className="border border-border/60 shadow-xs rounded-3xl bg-background overflow-hidden">
              <CardHeader className="p-6 border-b border-border/40 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-primary" />
                    <span>عقود المقاولين والموردين</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {isExecutionStarted 
                      ? "تم قفل التعديل على العقود بسبب بدء مرحلة التنفيذ وصرف المدفوعات"
                      : "توثيق وإدارة العروض والعقود المبرمة للمشروع"
                    }
                  </CardDescription>
                </div>
                {!isContractsLocked && !isExecutionStarted && (!project.contracts || project.contracts.length === 0) && (
                  <Button 
                    className="rounded-2xl gradient-primary text-white font-bold text-xs gap-1.5 shadow-md h-10 px-4" 
                    onClick={() => navigate(`/contracts/new/request/${project.requestId}?projectId=${project.id}`)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة عقد جديد</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {isContractsLocked ? (
                  <div className="text-center py-12 max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">قسم العقود مقفل حالياً</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      سيتم فتح قسم العقود بمجرد اكتمال مرحلة التقييم المالي واعتماد عرض السعر المخصص للمشروع.
                    </p>
                  </div>
                ) : project.contracts && project.contracts.length > 0 ? (
                  <div className="space-y-6">
                    <div className="overflow-x-auto rounded-2xl border border-border/60">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="text-right font-bold">رقم العقد</TableHead>
                            <TableHead className="text-right font-bold">المورد / المقاول</TableHead>
                            <TableHead className="text-right font-bold">نوع العقد</TableHead>
                            <TableHead className="text-right font-bold">القيمة الإجمالية</TableHead>
                            <TableHead className="text-right font-bold">الحالة</TableHead>
                            <TableHead className="text-center font-bold">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {project.contracts.map((contract) => (
                            <TableRow key={contract.id} className="hover:bg-muted/20">
                              <TableCell className="font-mono font-bold text-foreground">{contract.contractNumber}</TableCell>
                              <TableCell className="font-bold text-xs">{contract.supplierName || "غير محدد"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{contract.contractType || "-"}</TableCell>
                              <TableCell className="font-mono font-extrabold text-primary">{formatCurrency(contract.amount)}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline"
                                  className={`rounded-xl text-[11px] font-bold px-2.5 py-0.5 ${
                                    contract.status === "approved" || contract.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                    contract.status === "draft" ? "bg-slate-100 text-slate-700 border-slate-200" :
                                    contract.status === "pending_approval" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                    "bg-slate-100 text-slate-700"
                                  }`}
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
                                <div className="flex items-center gap-1.5 justify-center">
                                  {contract.status === "draft" && !isExecutionStarted && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-xl h-8 w-8 text-blue-600 hover:bg-blue-50"
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
                                      className="rounded-xl h-8 w-8 text-foreground hover:bg-muted"
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

                    {showApproveContractButton && (
                      <div className="flex justify-center border-t border-border/40 pt-6">
                        <Button 
                          className="rounded-2xl gradient-primary text-white font-bold shadow-lg hover:shadow-xl transition-all gap-2 px-8 h-11"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من اعتماد هذا العقد؟\nعند الاعتماد سيتم تحويل المشروع لمرحلة التنفيذ وصرف المدفوعات.")) {
                              approveContractMutation.mutate({ id: project.contracts![0].id });
                            }
                          }}
                          disabled={approveContractMutation.isPending}
                        >
                          {approveContractMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                          <span>اعتماد العقد وبدء التنفيذ</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileSignature className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground">لا توجد عقود مسجلة لهذا المشروع بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: PAYMENTS */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="border border-border/60 shadow-xs rounded-3xl bg-background overflow-hidden">
              <CardHeader className="p-6 border-b border-border/40 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between text-right gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>سجل الدفعات المالية للمشروع</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    متابعة كشوفات الصرف والتحويلات المالية المخصصة
                  </CardDescription>
                </div>
                {!isPaymentsLocked && (
                  <Button 
                    className="rounded-2xl gradient-primary text-white font-bold text-xs gap-1.5 shadow-md h-10 px-4" 
                    onClick={() => navigate(`/disbursements/new/${project.id}`)}
                    disabled={isContractFullyAllocated}
                    title={isContractFullyAllocated ? "تم الوصول للحد الأقصى لقيمة العقد" : ""}
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة دفعة</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {isPaymentsLocked ? (
                  <div className="text-center py-12 max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">قسم الدفعات مقفل حالياً</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      هذا القسم غير متاح الصرف أو الإضافة فيه حالياً. سيتم إلغاء القفل بمجرد توثيق واعتماد العقد لمرحلة التنفيذ.
                    </p>
                  </div>
                ) : project.payments && project.payments.length > 0 ? (
                  <div className="space-y-6">
                    {project.payments.some(payment => payment.source !== "manual" && (
                      payment.completionPercentage === null || 
                      payment.completionPercentage === undefined || 
                      payment.completionPercentage === 0 ||
                      !payment.workDescription || 
                      payment.workDescription.trim() === ""
                    )) && (
                      <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-2xl p-4 text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <AlertTitle className="font-bold text-sm">تنبيه: توجد دفعات بمعلومات ناقصة</AlertTitle>
                        <AlertDescription className="mt-1 leading-relaxed">
                          بعض الدفعات تفتقر إلى "نسبة الإنجاز المطلوبة" أو "وصف الأعمال الإنجازية". يُرجى استكمال البيانات عبر أيقونة التعديل (📝).
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="overflow-x-auto rounded-2xl border border-border/60">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="text-right font-bold">رقم الدفعة</TableHead>
                            <TableHead className="text-right font-bold">عنوان الدفعة والتفاصيل</TableHead>
                            <TableHead className="text-right font-bold">المبلغ</TableHead>
                            <TableHead className="text-right font-bold">الحالة</TableHead>
                            <TableHead className="text-right font-bold">التاريخ</TableHead>
                            <TableHead className="text-center font-bold">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {project.payments.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-muted/20">
                              <TableCell className="font-mono font-bold text-foreground">{payment.paymentNumber}</TableCell>
                              <TableCell className="text-xs">
                                <div className="space-y-1">
                                  <span className="font-bold text-foreground block">{payment.description || "-"}</span>
                                  {payment.source !== "manual" && (
                                    payment.completionPercentage === null || 
                                    payment.completionPercentage === undefined || 
                                    payment.completionPercentage === 0 ||
                                    !payment.workDescription || 
                                    payment.workDescription.trim() === ""
                                  ) && (
                                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-amber-600">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>بيانات غير مكتملة</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono font-extrabold text-emerald-600">{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`rounded-xl text-[11px] font-bold px-2.5 py-0.5 ${
                                  payment.status === "paid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                  payment.status === "approved" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                  payment.status === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                  "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}>
                                  {payment.status === "pending" ? "قيد الانتظار" :
                                   payment.status === "approved" ? "معتمد" :
                                   payment.status === "paid" ? "مسدد" : 
                                   payment.status === "due" ? "مستحق" : "مرفوض"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
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
                                <div className="flex items-center justify-center">
                                  {payment.id && payment.status !== "paid" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-xl h-8 w-8 text-blue-600 hover:bg-blue-50"
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

                    {/* Financial Summary Footer */}
                    <div className="p-4 sm:p-5 bg-muted/40 rounded-2xl border border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-muted-foreground">إجمالي المدفوعات:</span>
                        <span className="font-extrabold text-emerald-600 font-mono text-sm sm:text-base">{formatCurrency(paidPaymentsSum.toString())}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-muted-foreground">المتبقي الصرف:</span>
                        <span className="font-extrabold text-amber-600 font-mono text-sm sm:text-base">{formatCurrency(remainingContractSum.toString())}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-muted-foreground">قيمة العقد الكلية:</span>
                        <span className="font-extrabold text-foreground font-mono text-sm sm:text-base">{formatCurrency(totalContractsSum.toString())}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground">لا توجد دفعات مالية مسجلة بعد</p>
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
