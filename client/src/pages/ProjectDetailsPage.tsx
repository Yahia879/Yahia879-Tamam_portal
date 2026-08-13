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
  Layers,
  Send,
  TrendingUp,
  MapPin,
  ShieldAlert,
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
  planning: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold",
  on_hold: "bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20 font-bold",
};

const statusLabels: Record<string, string> = {
  planning: "إعداد جدول الكميات",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const phaseStatusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
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

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "غير محدد";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  // قيود القفل للمراحل
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
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="h-10 w-48 bg-muted animate-pulse rounded-2xl" />
          <div className="h-44 bg-muted animate-pulse rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}
          </div>
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
        <div className="text-center py-16 max-w-lg mx-auto dir-rtl" dir="rtl">
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
            <Button variant="outline" className="rounded-2xl font-bold" onClick={() => navigate("/project-management")}>
              العودة للمشاريع
            </Button>
            {isUnconvertedRequest && (
              <Button className="rounded-2xl gradient-primary font-bold text-white" onClick={() => navigate(`/requests/${id}`)}>
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
        <div className="text-center py-12 dir-rtl" dir="rtl">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">المشروع غير موجود</h2>
          <Button className="mt-4 rounded-2xl" onClick={() => navigate("/project-management")}>
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
    
    const activePhase = project.phases?.find(p => p.status !== "completed");
    if (activePhase) {
      return activePhase.phaseName.replace(/^المرحلة .* : /, "");
    }
    
    return statusLabels[project.status || "planning"];
  };

  // المبالغ المحسوبة
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
      <div className="space-y-6 container mx-auto px-4 md:px-0 dir-rtl max-w-7xl font-sans" dir="rtl">
        
        {/* Project Sleek Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-muted/40 to-muted/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Title & Info */}
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-2xl h-10 w-10 hover:bg-background/80 shrink-0 border border-border/60"
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

                <Badge variant="outline" className="rounded-xl px-3 py-1 font-mono font-bold text-xs bg-background">
                  {project.projectNumber}
                </Badge>

                <Badge variant="outline" className={`rounded-xl px-3 py-1 text-xs ${statusColors[project.status || "planning"]}`}>
                  {getStatusLabel()}
                </Badge>

                {project.isMultiMosque && (
                  <Badge className="rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 font-bold text-xs">
                    مشروع مباشر لعدة مساجد
                  </Badge>
                )}
              </div>

              {/* Editable Name */}
              {isEditingName ? (
                <div className="flex items-center gap-2 max-w-lg pt-1">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-10 rounded-2xl text-sm font-bold bg-background border-primary focus-visible:ring-primary"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="rounded-xl gradient-primary text-white font-bold h-10 px-4 shrink-0"
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
                    className="rounded-xl font-bold h-10 px-3 shrink-0"
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
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                    {project.name}
                  </h1>
                  {canEditProjectName && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-background/80 rounded-xl shrink-0"
                      onClick={() => {
                        setEditedName(project.name || "");
                        setIsEditingName(true);
                      }}
                      title="تعديل اسم المشروع"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions & Manager */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              {showApproveBOQButton && project.requestId && (
                <Button 
                  className="rounded-2xl gradient-primary text-white font-bold gap-2 shadow-md hover:opacity-95"
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
                  {updateRequestStageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>اعتماد جدول الكميات</span>
                </Button>
              )}

              {showApproveContractButton && (
                <Button 
                  className="rounded-2xl gradient-primary text-white font-bold gap-2 shadow-md hover:opacity-95"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من اعتماد هذا العقد؟\nعند الاعتماد سيتم تحويل المشروع لمرحلة التنفيذ وصرف المدفوعات.")) {
                      approveContractMutation.mutate({ id: project.contracts![0].id });
                    }
                  }}
                  disabled={approveContractMutation.isPending}
                >
                  {approveContractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>اعتماد العقد</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Metric Cards KPI Grid */}
        {!financialsOnly && (
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* الميزانية */}
              {(!project.request || project.isMultiMosque || BUDGET_VISIBLE_STAGES.includes(project.request.currentStage)) ? (
                <Card className="border border-border/60 shadow-xs rounded-2xl bg-background hover:border-primary/20 transition-all">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-muted-foreground">الميزانية</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="rounded-xl max-w-xs text-xs">
                            إجمالي قيمة جدول الكميات المخصص للمشروع
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-lg sm:text-xl font-extrabold text-foreground truncate">
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
                      <span className="text-xs font-bold text-muted-foreground">الميزانية</span>
                      <p className="text-sm font-bold text-muted-foreground mt-1">لم تُحدد بعد</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* التكلفة الفعلية */}
              <Card className="border border-border/60 shadow-xs rounded-2xl bg-background hover:border-primary/20 transition-all">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">التكلفة الفعلية</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-xl max-w-xs text-xs">
                          التكلفة المتفق عليها بالعقود
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg sm:text-xl font-extrabold text-foreground truncate">
                      {formatCurrency(project.actualCost)}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* نسبة الإنجاز */}
              <Card className="border border-border/60 shadow-xs rounded-2xl bg-background hover:border-primary/20 transition-all">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pl-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-muted-foreground">نسبة الإنجاز</span>
                      <span className="text-xs font-black text-primary font-mono">{project.completionPercentage || 0}%</span>
                    </div>
                    <Progress value={project.completionPercentage || 0} className="h-2 rounded-full" />
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* مدير المشروع */}
              <Card className="border border-border/60 shadow-xs rounded-2xl bg-background hover:border-primary/20 transition-all">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-muted-foreground block mb-1">مدير المشروع</span>
                    {isEditingManager ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Select
                          value={project.managerId?.toString() || ""}
                          onValueChange={(val) => handleUpdateManager(parseInt(val))}
                        >
                          <SelectTrigger className="h-8 rounded-xl text-xs font-bold border-border/60">
                            <SelectValue placeholder="اختر المدرب..." />
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
                          className="h-8 w-8 text-rose-500 rounded-lg shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-sm text-foreground truncate">{project.managerName || "غير محدد"}</p>
                        {canChangeManager && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full p-0 shrink-0"
                            onClick={() => setIsEditingManager(true)} 
                            title="تغيير مدير المشروع"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TooltipProvider>
        )}

        {/* Tabbed Navigation Bar */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
          {!financialsOnly && (
            <div className="overflow-x-auto pb-1 scrollbar-hide">
              <TabsList className="inline-flex h-12 items-center justify-start rounded-2xl bg-muted/60 p-1.5 border border-border/50 text-muted-foreground min-w-full sm:min-w-0">
                <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                  <FolderOpen className="w-3.5 h-3.5 ml-1.5" />
                  <span>نظرة عامة</span>
                </TabsTrigger>
                <TabsTrigger value="progress_milestones" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5 ml-1.5" />
                  <span>الإنجاز والمعالم</span>
                </TabsTrigger>
                <TabsTrigger value="phases" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                  <Layers className="w-3.5 h-3.5 ml-1.5" />
                  <span>المراحل</span>
                </TabsTrigger>
                <TabsTrigger value="boq" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                  <ClipboardList className="w-3.5 h-3.5 ml-1.5" />
                  <span>جدول الكميات</span>
                  {hasBOQItems && <Badge variant="secondary" className="mr-1.5 text-[10px] h-4 px-1 rounded-md">{boqData?.items?.length}</Badge>}
                </TabsTrigger>
                {canViewFinancials && (
                  <TabsTrigger value="financials" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                    <DollarSign className="w-3.5 h-3.5 ml-1.5" />
                    <span>المالية</span>
                    {isFinancialsLocked && <Lock className="w-3 h-3 mr-1 text-amber-500" />}
                  </TabsTrigger>
                )}
                <TabsTrigger value="contracts" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                  <FileSignature className="w-3.5 h-3.5 ml-1.5" />
                  <span>العقود</span>
                  {project.contracts && project.contracts.length > 0 && (
                    <Badge variant="secondary" className="mr-1.5 text-[10px] h-4 px-1 rounded-md">{project.contracts.length}</Badge>
                  )}
                  {isContractsLocked && <Lock className="w-3 h-3 mr-1 text-amber-500" />}
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
                  <CreditCard className="w-3.5 h-3.5 ml-1.5" />
                  <span>الدفعات</span>
                  {project.payments && project.payments.length > 0 && (
                    <Badge variant="secondary" className="mr-1.5 text-[10px] h-4 px-1 rounded-md">{project.payments.length}</Badge>
                  )}
                  {isPaymentsLocked && <Lock className="w-3 h-3 mr-1 text-amber-500" />}
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Project Basic Info */}
              <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
                <CardHeader className="p-5 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span>معلومات المشروع الأساسية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">رقم المشروع</span>
                      <p className="font-extrabold font-mono text-foreground text-sm">{project.projectNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">الحالة الحالية</span>
                      <div>
                        <Badge variant="outline" className={`rounded-xl text-[11px] ${statusColors[project.status || "planning"]}`}>
                          {getStatusLabel()}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">تاريخ البدء</span>
                      <p className="font-bold text-foreground">
                        {project.startDate ? new Date(project.startDate).toLocaleDateString("ar-SA") : "لم يبدأ بعد"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">الانتهاء المتوقع</span>
                      <p className="font-bold text-foreground">
                        {project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA") : "غير محدد"}
                      </p>
                    </div>

                    {project.donorName && (
                      <div className="col-span-2 space-y-1 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                        <span className="text-muted-foreground font-medium">اسم المانح / الجهة الداعمة</span>
                        <p className="font-extrabold text-primary text-sm">{project.donorName}</p>
                      </div>
                    )}
                  </div>

                  {project.description && (
                    <div className="pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground font-medium block mb-1">وصف المشروع</span>
                      <p className="text-xs font-normal leading-relaxed text-foreground bg-muted/30 p-3 rounded-2xl border border-border/40">
                        {project.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Linked Request Info */}
              {project.request ? (
                <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
                  <CardHeader className="p-5 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>بيانات الطلب المرتبط</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">رقم الطلب</span>
                        <Link href={`/requests/${project.request.id}`}>
                          <p className="font-extrabold text-primary hover:underline cursor-pointer font-mono text-sm flex items-center gap-1">
                            <span>{project.request.requestNumber}</span>
                            <Eye className="w-3.5 h-3.5" />
                          </p>
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">برنامج الخدمة</span>
                        <p className="font-bold text-foreground">{project.request.programType}</p>
                      </div>

                      {project.request.mosqueName && (
                        <div className="col-span-2 space-y-1 p-3 rounded-2xl bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            <span>المسجد المستفيد</span>
                          </span>
                          <p className="font-bold text-foreground text-xs">
                            {project.request.mosqueName} • {project.request.mosqueCity || "أبها"}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background flex flex-col items-center justify-center p-8 text-center">
                  <Building className="w-12 h-12 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">مشروع مباشر بدون طلب مرتبط منفرد</p>
                </Card>
              )}
            </div>

            {/* Linked Mosques (For Direct Multi-Mosque Projects) */}
            {(project as any).linkedMosques && (project as any).linkedMosques.length > 0 && (
              <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
                <CardHeader className="p-5 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary" />
                      <span>المساجد المشمولة بالمشروع (عدة مساجد)</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      قائمة المساجد المخصصة ضمن هذا المشروع والميزانية وشروط الأعمال لكل مسجد
                    </CardDescription>
                  </div>
                  <Badge className="rounded-xl bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 text-xs">
                    {(project as any).linkedMosques.length} مساجد
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-right font-bold text-xs">المسجد</TableHead>
                          <TableHead className="text-right font-bold text-xs">المدينة / الحي</TableHead>
                          <TableHead className="text-right font-bold text-xs">الميزانية المخصصة</TableHead>
                          <TableHead className="text-right font-bold text-xs">الإمام / التواصل</TableHead>
                          <TableHead className="text-right font-bold text-xs">الشروط وملاحظات الأعمال</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(project as any).linkedMosques.map((item: any) => (
                          <TableRow key={item.id} className="hover:bg-muted/20 text-xs">
                            <TableCell className="font-bold text-foreground">
                              {item.mosqueName || `مسجد #${item.mosqueId}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.mosqueCity || "—"} {item.mosqueDistrict ? ` - ${item.mosqueDistrict}` : ""}
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              {item.allocatedBudget ? `${parseFloat(item.allocatedBudget).toLocaleString()} ريال` : "—"}
                            </TableCell>
                            <TableCell>
                              {item.imamName ? (
                                <div>
                                  <span className="font-semibold block">{item.imamName}</span>
                                  <span className="text-muted-foreground">{item.imamPhone || ""}</span>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
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

            {/* Technical Evaluations Notes */}
            {(project as any).evaluations && (project as any).evaluations.length > 0 && (
              <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
                <CardHeader className="p-5 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>ملاحظات التقييم الفني</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {(project as any).evaluations.map((evalNote: any) => (
                    <div key={evalNote.id} className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-primary">{evalNote.userName || "موظف التقييم"}</span>
                        <span className="text-muted-foreground">
                          {new Date(evalNote.createdAt).toLocaleString("ar-SA")}
                        </span>
                      </div>
                      <div className="text-xs space-y-2 pt-1">
                        {evalNote.justification && (
                          <div>
                            <span className="text-muted-foreground block text-[11px] mb-0.5">المبررات:</span>
                            <p className="whitespace-pre-wrap font-medium text-foreground">{evalNote.justification}</p>
                          </div>
                        )}
                        {evalNote.notes && (
                          <div>
                            <span className="text-muted-foreground block text-[11px] mb-0.5">ملاحظات إضافية:</span>
                            <p className="whitespace-pre-wrap text-muted-foreground">{evalNote.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: PROGRESS & MILESTONES */}
          <TabsContent value="progress_milestones" className="pt-4">
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
          <TabsContent value="phases" className="pt-4">
            <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
              <CardHeader className="p-5 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>مراحل خط سير المشروع</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  متابعة حالة واكتمال كل مرحلة معتمدة من المراحل الخمس الرئيسية
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {project.phases && project.phases.length > 0 ? (
                  <div className="space-y-4">
                    {project.phases.map((phase, index) => (
                      <div key={phase.id} className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            phase.status === "completed" ? "bg-emerald-500 text-white shadow-xs" :
                            phase.status === "in_progress" ? "bg-blue-500 text-white shadow-xs" :
                            "bg-slate-200 dark:bg-slate-800 text-slate-600"
                          }`}>
                            {phase.status === "completed" ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <span className="font-bold text-xs">{index + 1}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground">{phase.phaseName}</h4>
                              <Badge variant="outline" className={`rounded-xl text-[10px] ${phaseStatusColors[phase.status || "pending"]}`}>
                                {phaseStatusLabels[phase.status || "pending"]}
                              </Badge>
                            </div>
                            {phase.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="w-full sm:w-48 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium">النسبة</span>
                            <span className="font-bold text-primary font-mono">{phase.completionPercentage || 0}%</span>
                          </div>
                          <Progress value={phase.completionPercentage || 0} className="h-2 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">لا توجد مراحل محددة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: BOQ */}
          <TabsContent value="boq" className="pt-4">
            <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
              <CardHeader className="p-5 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <span>جداول الكميات (BOQ)</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {project.isMultiMosque
                      ? "إدارة بنود جداول الكميات والتسعير لمشروع عدة مساجد"
                      : "إدارة جداول الكميات والتسعير المرتبطة بهذا المشروع"}
                  </CardDescription>
                </div>
                {!isBOQLocked && (
                  <Button 
                    className="rounded-2xl gradient-primary text-white font-bold text-xs gap-1.5 shadow-md" 
                    onClick={() => boqTabRef.current?.openAddDialog()}
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة بند جديد</span>
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
                      className="rounded-2xl gradient-primary text-white font-bold shadow-md hover:shadow-lg transition-all gap-2 px-6 h-11"
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
                      {updateRequestStageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>اعتماد جداول الكميات</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: FINANCIALS */}
          {canViewFinancials && (
            <TabsContent value="financials" className="pt-4">
              {isFinancialsLocked ? (
                <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
                  <CardContent className="p-8 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                        <Lock className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-extrabold text-foreground">قسم المالية مقفل حالياً</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        هذا القسم غير متاح للعرض أو الإضافة حالياً. سيتم إلغاء القفل وتفعيل التبويب تلقائياً عند اكتمال مرحلة التقييم المالي والاعتماد للمشروع.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ProjectFinancialsTab projectId={parseInt(id || "0")} />
              )}
            </TabsContent>
          )}

          {/* TAB 6: CONTRACTS */}
          <TabsContent value="contracts" className="pt-4">
            <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
              <CardHeader className="p-5 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-primary" />
                    <span>سجل العقود والموردين</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {isExecutionStarted 
                      ? "تم قفل التعديل على العقود بسبب بدء مرحلة التنفيذ وصرف المدفوعات"
                      : "عقود المقاولين والموردين المعتمدة"
                    }
                  </CardDescription>
                </div>

                {!isContractsLocked && !isExecutionStarted && (!project.contracts || project.contracts.length === 0) && (
                  <Button 
                    className="rounded-2xl gradient-primary text-white font-bold text-xs gap-1.5 shadow-md" 
                    onClick={() => navigate(`/contracts/new/request/${project.requestId}?projectId=${project.id}`)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة عقد جديد</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-5">
                {isContractsLocked ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">قسم العقود مقفل حالياً</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      سيتم فتح التبويب فور الوصول لمرحلة التعاقد واكتمال الدراسة والاعتماد المالي.
                    </p>
                  </div>
                ) : project.contracts && project.contracts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-right font-bold text-xs">رقم العقد</TableHead>
                          <TableHead className="text-right font-bold text-xs">المورد</TableHead>
                          <TableHead className="text-right font-bold text-xs">نوع العقد</TableHead>
                          <TableHead className="text-right font-bold text-xs">القيمة الإجمالية</TableHead>
                          <TableHead className="text-right font-bold text-xs">الحالة</TableHead>
                          <TableHead className="text-center font-bold text-xs">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {project.contracts.map((contract) => (
                          <TableRow key={contract.id} className="hover:bg-muted/20 text-xs">
                            <TableCell className="font-extrabold font-mono text-foreground">{contract.contractNumber}</TableCell>
                            <TableCell>{contract.supplierName || "غير محدد"}</TableCell>
                            <TableCell>{contract.contractType || "-"}</TableCell>
                            <TableCell className="font-extrabold text-primary">{formatCurrency(contract.amount)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={`rounded-xl text-[10px] font-bold ${
                                  contract.status === "approved" || contract.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                  contract.status === "draft" ? "bg-slate-100 text-slate-700" :
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
                                    className="h-8 w-8 text-blue-600 rounded-xl"
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
                                    className="h-8 w-8 rounded-xl text-primary"
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
                  <div className="text-center py-10">
                    <FileSignature className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">لا توجد عقود مسجلة بعد</p>
                  </div>
                )}

                {showApproveContractButton && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      className="rounded-2xl gradient-primary text-white font-bold shadow-md hover:shadow-lg transition-all gap-2 px-6 h-11"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من اعتماد هذا العقد؟\nعند الاعتماد سيتم تحويل المشروع لمرحلة التنفيذ وصرف المدفوعات.")) {
                          approveContractMutation.mutate({ id: project.contracts![0].id });
                        }
                      }}
                      disabled={approveContractMutation.isPending}
                    >
                      {approveContractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>اعتماد العقد الآن</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: PAYMENTS */}
          <TabsContent value="payments" className="pt-4">
            <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
              <CardHeader className="p-5 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>سجل الدفعات والتحويلات المالية</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    متابعة وصرف الدفعات المستحقة والمصروفة للمشروع
                  </CardDescription>
                </div>

                {!isPaymentsLocked && (
                  <Button 
                    className="rounded-2xl gradient-primary text-white font-bold text-xs gap-1.5 shadow-md" 
                    onClick={() => navigate(`/disbursements/new/${project.id}`)}
                    disabled={isContractFullyAllocated}
                    title={isContractFullyAllocated ? "تم الوصول للحد الأقصى لقيمة العقد" : ""}
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة دفعة جديدة</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {isPaymentsLocked ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">قسم الدفعات مقفل حالياً</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      سيتم فتح قسم الدفعات فور توثيق العقد واكتمال مرحلة التعاقد.
                    </p>
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
                      <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-2xl p-4">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="mr-2">
                          <AlertTitle className="font-bold text-xs">تنبيه: توجد دفعات بمعلومات غير مكتملة</AlertTitle>
                          <AlertDescription className="text-[11px] mt-0.5 leading-relaxed">
                            بعض الدفعات تفتقر إلى نسبة الإنجاز المطلوبة أو وصف الأعمال. يرجى استكمال البيانات بالضغط على أيقونة التعديل (📝).
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="text-right font-bold text-xs">رقم الدفعة</TableHead>
                            <TableHead className="text-right font-bold text-xs">عنوان / بيان الدفعة</TableHead>
                            <TableHead className="text-right font-bold text-xs">المبلغ</TableHead>
                            <TableHead className="text-right font-bold text-xs">الحالة</TableHead>
                            <TableHead className="text-right font-bold text-xs">التاريخ</TableHead>
                            <TableHead className="text-center font-bold text-xs">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {project.payments.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-muted/20 text-xs">
                              <TableCell className="font-extrabold font-mono text-foreground">{payment.paymentNumber}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground">{payment.description || "-"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-extrabold text-primary">{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`rounded-xl text-[10px] font-bold ${
                                    payment.status === "paid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                    payment.status === "approved" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                    payment.status === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                    "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  }`}
                                >
                                  {payment.status === "pending" ? "قيد الانتظار" :
                                   payment.status === "approved" ? "معتمد" :
                                   payment.status === "paid" ? "مسدد" : 
                                   payment.status === "due" ? "مستحق" : "مرفوض"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {(() => {
                                  const raw = payment.paidAt || payment.date;
                                  if (!raw) return "-";
                                  if (typeof raw === 'string') {
                                    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
                                  }
                                  const d = new Date(raw);
                                  if (isNaN(d.getTime())) return "-";
                                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                })()}
                              </TableCell>
                              <TableCell className="text-center">
                                {payment.id && payment.status !== "paid" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 rounded-xl"
                                    onClick={() => navigate(`/payments/edit/${payment.id}`)}
                                    title="تعديل الدفعة"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Financial Summary Footer Bar */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">المدفوعات المسددة:</span>
                        <span className="text-emerald-600 font-mono font-extrabold">{formatCurrency(paidPaymentsSum.toString())}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">المتبقي:</span>
                        <span className="text-amber-600 font-mono font-extrabold">{formatCurrency(remainingContractSum.toString())}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">إجمالي العقود:</span>
                        <span className="text-foreground font-mono font-extrabold">{formatCurrency(totalContractsSum.toString())}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">لا توجد دفعات مسجلة بعد</p>
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
