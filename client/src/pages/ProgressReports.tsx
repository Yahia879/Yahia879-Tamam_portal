import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  Calendar,
  Building2,
  Printer,
  Send,
  Edit,
  BarChart3,
  Check,
  Coins,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  submitted: { label: "مقدم للمراجعة", variant: "default" },
  reviewed: { label: "تمت المراجعة", variant: "outline" },
  approved: { label: "معتمد", variant: "outline" },
};

const PAYMENT_TYPE_MAP: Record<string, string> = {
  advance: "دفعة مقدمة",
  progress: "دفعة إنجاز",
  final: "دفعة ختامية",
  retention: "ضمان مسترجع",
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "مدفوعة", variant: "outline" },
  pending: { label: "مستحقة", variant: "secondary" },
  draft: { label: "مسودة", variant: "secondary" },
  submitted: { label: "قيد المراجعة", variant: "default" },
  approved: { label: "معتمدة", variant: "outline" },
};

const getPaymentStatusStyles = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
    case "submitted":
    case "approved":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
};

export default function ProgressReports() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // نوافذ الحوار
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  
  const [newReport, setNewReport] = useState({
    projectId: 0,
    title: "",
    reportDate: new Date().toISOString().split("T")[0],
    reportPeriodStart: "",
    reportPeriodEnd: "",
    overallProgress: 0,
    plannedProgress: 0,
    actualProgress: 0,
    workSummary: "",
    challenges: "",
    nextSteps: "",
    recommendations: "",
    budgetSpent: "",
    budgetRemaining: "",
    agreedPaymentAmount: "",
    actualWorkDone: "",
  });

  // استعلامات البيانات
  const { data: reportsData, refetch: refetchReports } = trpc.progressReports.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });
  
  // إحصائيات التقارير المحسوبة ديناميكياً من البيانات
  const statsData = (() => {
    if (!reportsData || reportsData.length === 0) {
      return { total: 0, draft: 0, submitted: 0, reviewed: 0, approved: 0, avgProgress: 0 };
    }
    const total = reportsData.length;
    const draft = reportsData.filter((r: any) => r.status === "draft").length;
    const submitted = reportsData.filter((r: any) => r.status === "submitted").length;
    const reviewed = reportsData.filter((r: any) => r.status === "reviewed").length;
    const approved = reportsData.filter((r: any) => r.status === "approved").length;
    
    const sumProgress = reportsData.reduce((sum: number, r: any) => sum + (r.overallProgress || 0), 0);
    const avgProgress = Math.round(sumProgress / total);

    return { total, draft, submitted, reviewed, approved, avgProgress };
  })();

  const { data: projectsData } = trpc.projects.getAll.useQuery({});

  // جلب تفاصيل المشروع المحدد للتحقق من جدولة الدفعات
  const { data: projectDetails, isLoading: isProjectDetailsLoading } = trpc.projects.getById.useQuery(
    { id: newReport.projectId },
    { enabled: newReport.projectId > 0 }
  );

  const totalContractAmount = projectDetails?.contracts?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0) || 0;
  const totalScheduledPayments = projectDetails?.payments?.filter((p: any) => p.source === "contract" || (p.source === "disbursement" && p.contractPaymentId)).reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0) || 0;

  const hasIncompleteSchedule = newReport.projectId > 0 && !isProjectDetailsLoading && (totalContractAmount === 0 || Math.abs(totalContractAmount - totalScheduledPayments) > 0.01);

  // التحقق من وجود دفعة سابقة تم صرف مبلغ أقل من قيمتها المتفقة (مما يقفل المشروع)
  const lockedPaymentInfo = (() => {
    if (newReport.projectId <= 0 || !projectDetails?.payments || !reportsData) return null;

    for (const payment of projectDetails.payments) {
      // البحث عن تقرير إنجاز مرتبط بهذه الدفعة
      const paymentTitle = `تقرير إنجاز - ${payment.description || payment.paymentNumber}`;
      const correspondingReport = reportsData.find((report: any) => 
        report.projectId === newReport.projectId && 
        (report.title === paymentTitle || 
         report.title.includes(payment.description || payment.paymentNumber) || 
         (report.workSummary && report.workSummary.includes(`[معرف الدفعة: ${payment.id}]`)))
      );

      if (correspondingReport) {
        const agreedAmount = parseFloat(payment.amount || "0");
        const spentAmount = parseFloat(correspondingReport.budgetSpent || "0");
        
        // إذا كان الصرف الفعلي أقل من القيمة المتفقة للدفعة، فهناك فارق مالي يعيق الجدولة
        if (spentAmount < agreedAmount) {
          return {
            paymentId: payment.id,
            paymentName: payment.description || payment.paymentNumber,
            agreedAmount,
            spentAmount,
            difference: agreedAmount - spentAmount,
          };
        }
      }
    }
    return null;
  })();

  // Mutations
  const createMutation = trpc.progressReports.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء التقرير بنجاح - رقم ${data.reportNumber}`);
      setActiveTab("list");
      resetNewReport();
      refetchReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء التقرير");
    },
  });

  const submitMutation = trpc.progressReports.submit.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم التقرير للمراجعة");
      refetchReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const reviewMutation = trpc.progressReports.review.useMutation({
    onSuccess: () => {
      toast.success("تمت المراجعة بنجاح");
      setShowDetailsDialog(false);
      refetchReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // إعادة تعيين النموذج
  const resetNewReport = () => {
    setSelectedPaymentId(null);
    setNewReport({
      projectId: 0,
      title: "",
      reportDate: new Date().toISOString().split("T")[0],
      reportPeriodStart: "",
      reportPeriodEnd: "",
      overallProgress: 0,
      plannedProgress: 0,
      actualProgress: 0,
      workSummary: "",
      challenges: "",
      nextSteps: "",
      recommendations: "",
      budgetSpent: "",
      budgetRemaining: "",
      agreedPaymentAmount: "",
      actualWorkDone: "",
    });
  };

  // معالجة اختيار الدفعة وملء الحقول تلقائياً
  const handleSelectPayment = (payment: any) => {
    if (lockedPaymentInfo) {
      toast.error("عذراً، لا يمكن اختيار أي دفعة لأن المشروع مقفل مالياً بسبب عدم تطابق صرف دفعة سابقة. يرجى مراجعة التنبيه الأحمر بالأسفل.");
      return;
    }

    if (!payment.workDescription || !payment.completionPercentage) {
      toast.error("عذراً، لا يمكن اختيار هذه الدفعة لعدم اكتمال بياناتها (وصف الأعمال ونسبة الإنجاز المطلوبة) في تفاصيل المشروع.");
      return;
    }

    const paymentTitle = `تقرير إنجاز - ${payment.description || payment.paymentNumber}`;
    const isAlreadyReported = reportsData?.some((report: any) => 
      report.projectId === newReport.projectId && 
      (report.title === paymentTitle || report.title.includes(payment.description || payment.paymentNumber) ||
       (report.workSummary && report.workSummary.includes(`[معرف الدفعة: ${payment.id}]`)))
    );

    if (isAlreadyReported) {
      toast.error("عذراً، تم تقديم تقرير إنجاز سابق لهذه الدفعة بالفعل ولا يمكن تكراره.");
      return;
    }

    setSelectedPaymentId(payment.id);
    
    const budget = parseFloat(projectDetails?.budget || "0");
    const spent = parseFloat(payment.amount || "0");
    const remaining = Math.max(0, budget - spent);

    setNewReport(prev => ({
      ...prev,
      title: paymentTitle,
      plannedProgress: payment.completionPercentage || 0,
      actualProgress: payment.completionPercentage || 0,
      overallProgress: payment.completionPercentage || 0,
      budgetSpent: payment.amount?.toString() || "0",
      budgetRemaining: remaining.toString(),
      workSummary: payment.workDescription || payment.description || "",
      agreedPaymentAmount: payment.amount?.toString() || "0",
    }));

    toast.success("تم اختيار الدفعة وملء البيانات تلقائياً");
  };

  // إنشاء تقرير جديد
  const handleCreateReport = () => {
    if (!newReport.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (lockedPaymentInfo) {
      toast.error("عذراً، لا يمكن إنشاء تقرير جديد لأن المشروع مقفل مالياً بسبب عدم توازن الدفعات السابقة.");
      return;
    }
    if (hasIncompleteSchedule) {
      toast.error("لا يمكن صرف تقرير إنجاز حتى تجدول كل دفعات المشروع");
      return;
    }
    if (!newReport.title.trim()) {
      toast.error("يرجى إدخال عنوان التقرير");
      return;
    }
    if (!newReport.actualWorkDone.trim()) {
      toast.error("يرجى إدخال الأعمال المنجزة فعلياً");
      return;
    }

    const agreed = parseFloat(newReport.agreedPaymentAmount || "0");
    const spent = parseFloat(newReport.budgetSpent || "0");
    if (spent < agreed) {
      toast.info("تنبيه: لقد قمت بتحديد مبلغ مستحق صرفه أقل من القيمة المتفقة للدفعة. سيتم قفل رفع تقارير جديدة لهذا المشروع حتى تقوم بتعديل الدفعات.");
    }

    const combinedWorkSummary = `الأعمال المجدولة للدفعة:\n${newReport.workSummary}\n\nالأعمال المنفذة فعلياً:\n${newReport.actualWorkDone}\n\n[معرف الدفعة: ${selectedPaymentId}]`;
    
    createMutation.mutate({
      ...newReport,
      workSummary: combinedWorkSummary,
    });
  };

  // عرض تفاصيل التقرير
  const handleViewDetails = (report: any) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
  };

  // حساب الانحراف
  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-green-600";
    if (variance < 0) return "text-red-600";
    return "text-gray-500";
  };

  // تصفية التقارير
  const filteredReports = reportsData?.filter((report: any) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        report.reportNumber?.toLowerCase().includes(search) ||
        report.title?.toLowerCase().includes(search) ||
        report.projectName?.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  // التحقق من الصلاحيات
  const canCreateReport = ["super_admin", "system_admin", "projects_office", "project_manager"].includes(user?.role || "");
  const canReviewReport = ["super_admin", "system_admin", "general_manager"].includes(user?.role || "");

  if (activeTab === "create") {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setActiveTab("list");
                  resetNewReport();
                }}
                className="rounded-full hover:bg-muted"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">إنشاء تقرير إنجاز جديد</h1>
                <p className="text-sm text-muted-foreground">أدخل تفاصيل التقرير والنسب المالية للمشروع</p>
              </div>
            </div>
          </div>

          {/* Form Body - Premium Styled Cards */}
          <div className="grid grid-cols-1 gap-6">
            {/* Card 1: Project & Payments */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="w-4.5 h-4.5 text-primary" />
                  المشروع وجدولة الدفعات
                </CardTitle>
                <CardDescription>اختر المشروع أولاً ثم حدد الدفعة المالية المجدولة المرتبطة</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">المشروع <span className="text-red-500">*</span></Label>
                  <Select
                    value={newReport.projectId.toString()}
                    onValueChange={(v) => {
                      const nextProjectId = parseInt(v);
                      setSelectedPaymentId(null);
                      setNewReport(prev => ({
                        ...prev,
                        projectId: nextProjectId,
                        title: "",
                        plannedProgress: 0,
                        actualProgress: 0,
                        overallProgress: 0,
                        budgetSpent: "",
                        budgetRemaining: "",
                        workSummary: "",
                        agreedPaymentAmount: "",
                        actualWorkDone: "",
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11 text-right">
                      <SelectValue placeholder="اختر المشروع المراد رفع تقرير له" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsData?.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payments Section */}
                {newReport.projectId > 0 && (
                  <div className="space-y-3 pt-4 border-t border-dashed border-border/80">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      الدفعات وجدولة الإنجاز المرتبطة للمشروع
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      اختر الدفعة التي ترغب بإنشاء تقرير إنجاز لها لملء البيانات والمبالغ تلقائياً:
                    </p>
                    {isProjectDetailsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="h-28 rounded-xl border border-dashed border-muted-foreground/20 animate-pulse bg-muted/40" />
                        <div className="h-28 rounded-xl border border-dashed border-muted-foreground/20 animate-pulse bg-muted/40" />
                      </div>
                    ) : projectDetails?.payments && projectDetails.payments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1.5 bg-muted/30 rounded-xl border border-border/60">
                        {projectDetails.payments.map((payment: any) => {
                          const isSelected = selectedPaymentId === payment.id;
                          const isIncomplete = !payment.workDescription || !payment.completionPercentage;
                          const isAlreadyReported = reportsData?.some((report: any) => 
                            report.projectId === newReport.projectId && 
                            (report.title === `تقرير إنجاز - ${payment.description || payment.paymentNumber}` || 
                             report.title.includes(payment.description || payment.paymentNumber) ||
                             (report.workSummary && report.workSummary.includes(`[معرف الدفعة: ${payment.id}]`)))
                          );
                          
                          const statusStyles = isIncomplete
                            ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
                            : isAlreadyReported
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50 font-bold"
                            : getPaymentStatusStyles(payment.status);
                            
                          const statusLabel = isIncomplete 
                            ? "بيانات غير مكتملة" 
                            : isAlreadyReported
                            ? "تم تقديم تقرير"
                            : (PAYMENT_STATUS_MAP[payment.status]?.label || payment.status);
                          
                          return (
                            <div
                              key={payment.id}
                              onClick={() => handleSelectPayment(payment)}
                              className={`relative p-4 rounded-xl border-2 text-right cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 ${
                                lockedPaymentInfo
                                  ? "border-muted bg-muted/10 opacity-50 cursor-not-allowed"
                                  : isSelected
                                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/20"
                                  : isIncomplete
                                  ? "border-destructive/20 bg-destructive/[0.02] hover:border-destructive/40 hover:bg-destructive/[0.04] opacity-75 cursor-not-allowed"
                                  : isAlreadyReported
                                  ? "border-green-200 bg-green-50/10 hover:border-green-400 opacity-90 cursor-not-allowed"
                                  : "border-transparent bg-background hover:border-primary/40 hover:bg-accent/10 hover:shadow-sm"
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm animate-in zoom-in duration-200">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                              
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                    <Coins className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-sm leading-none block text-foreground">
                                    {payment.description || payment.paymentNumber}
                                  </span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusStyles}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              
                              <div className="flex items-baseline justify-between mt-1 border-t border-dashed border-border/40 pt-2">
                                <span className="text-[11px] text-muted-foreground">قيمة الدفعة:</span>
                                <span className="font-extrabold text-base text-foreground">
                                  {parseFloat(payment.amount || "0").toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">ريال</span>
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">نسبة الإنجاز المطلوبة:</span>
                                  <span className="font-bold text-primary">{payment.completionPercentage || 0}%</span>
                                </div>
                                <Progress value={payment.completionPercentage || 0} className="h-1.5 bg-muted/60" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-muted-foreground/30 text-center bg-muted/10">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">لا توجد دفعات أو جدولة إنجاز معرفة لهذا المشروع.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Report Info & Progress */}
            {newReport.projectId > 0 && (
              <>
                {(hasIncompleteSchedule || !!lockedPaymentInfo) && (
                  <div className="bg-amber-50/80 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl p-4 flex items-start gap-3 text-right backdrop-blur-sm animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm">لا يمكن صرف تقرير إنجاز للمشروع</h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        لا يمكن صرف تقرير إنجاز حتى تجدول كل دفعات المشروع. يرجى الذهاب إلى تفاصيل المشروع وجدولة جميع الدفعات.
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-amber-900 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200/40 w-fit">
                        <span>قيمة العقد: <span className="font-bold">{totalContractAmount.toLocaleString()} ريال</span></span>
                        <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                        <span>الدفعات المجدولة: <span className="font-bold">{totalScheduledPayments.toLocaleString()} ريال</span></span>
                      </div>
                    </div>
                  </div>
                )}

                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <FileText className="w-4.5 h-4.5 text-primary" />
                      بيانات التقرير ونسب الإنجاز
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">عنوان التقرير <span className="text-red-500">*</span></Label>
                      <Input
                        value={newReport.title}
                        onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                        placeholder="مثال: تقرير إنجاز دفعة الإنجاز الأولى"
                        className="h-11 text-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">نسبة الإنجاز المخططة <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={newReport.plannedProgress}
                            readOnly
                            className="bg-muted/40 font-extrabold border-muted-foreground/20 text-slate-900 dark:text-slate-100 cursor-not-allowed h-11 pl-10 text-right focus-visible:ring-0"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">حقل تلقائي يأتي من الدفعة المختارة</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">نسبة الإنجاز الفعلية <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={newReport.actualProgress}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setNewReport(prev => ({
                                ...prev,
                                actualProgress: val,
                                overallProgress: val,
                              }));
                            }}
                            className="h-11 font-bold text-foreground pl-10 text-right"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">أدخل نسبة إنجاز العمل الحالية بالموقع</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">نسبة الإنجاز الإجمالية <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={newReport.overallProgress}
                            readOnly
                            className="bg-muted/40 font-extrabold border-muted-foreground/20 text-slate-900 dark:text-slate-100 cursor-not-allowed h-11 pl-10 text-right focus-visible:ring-0"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">تطابق نسبة الإنجاز الفعلية تلقائياً</p>
                      </div>
                    </div>

                    {/* Progress Deviation Display */}
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      newReport.actualProgress - newReport.plannedProgress > 0 
                        ? "bg-green-50/50 border-green-200/60 dark:bg-green-950/20 dark:border-green-900/40" 
                        : newReport.actualProgress - newReport.plannedProgress < 0
                        ? "bg-red-50/50 border-red-200/60 dark:bg-red-950/20 dark:border-red-900/40"
                        : "bg-gray-50/50 border-gray-200/60 dark:bg-gray-800/40 dark:border-gray-700/40"
                    }`}>
                      <div className="p-1 rounded-full bg-background border">
                        {getVarianceIcon(newReport.actualProgress - newReport.plannedProgress)}
                      </div>
                      <span className={`font-bold text-sm ${getVarianceColor(newReport.actualProgress - newReport.plannedProgress)}`}>
                        الانحراف عن الخطة المحددة للدفعة: {newReport.actualProgress - newReport.plannedProgress > 0 ? "+" : ""}
                        {newReport.actualProgress - newReport.plannedProgress}%
                        {newReport.actualProgress - newReport.plannedProgress > 0 
                          ? " (متقدم عن النسبة المخططة للدفعة)" 
                          : newReport.actualProgress - newReport.plannedProgress < 0
                          ? " (متأخر عن النسبة المخططة للدفعة)"
                          : " (مطابق للنسبة المخططة للدفعة)"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Completed Works */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <FileText className="w-4.5 h-4.5 text-primary" />
                      الأعمال والملاحظات الفنية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground flex items-center gap-1.5">
                        الأعمال المنجزة المجدولة للدفعة <span className="text-xs text-muted-foreground">(غير قابلة للتعديل)</span>
                      </Label>
                      <Textarea
                        value={newReport.workSummary}
                        readOnly
                        placeholder="الأعمال المخططة التي تأتي تلقائياً من الدفعة..."
                        className="bg-muted/40 border-muted-foreground/20 text-slate-900 dark:text-slate-100 font-semibold cursor-not-allowed min-h-[100px] leading-relaxed resize-none text-right focus-visible:ring-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">الأعمال المنجزة فعلياً بالموقع <span className="text-red-500">*</span></Label>
                      <Textarea
                        value={newReport.actualWorkDone}
                        onChange={(e) => setNewReport({ ...newReport, actualWorkDone: e.target.value })}
                        placeholder="اذكر بالتفصيل ما تم إنجازه وتنفيذه فعلياً على أرض الواقع..."
                        className="min-h-[120px] leading-relaxed text-foreground text-right"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 4: Financial Data */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Coins className="w-4.5 h-4.5 text-primary" />
                      البيانات والمبالغ المالية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground flex items-center gap-1.5">
                          قيمة الدفعة المتفقة <span className="text-xs text-muted-foreground">(غير قابلة للتعديل)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={newReport.agreedPaymentAmount ? parseFloat(newReport.agreedPaymentAmount).toLocaleString() : "0"}
                            readOnly
                            className="bg-muted/40 border-muted-foreground/20 text-slate-900 dark:text-slate-100 font-extrabold cursor-not-allowed h-11 pl-12 text-right focus-visible:ring-0"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">ريال</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">المبلغ المستحق صرفه فعلياً <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={newReport.budgetSpent}
                            onChange={(e) => {
                              const val = e.target.value;
                              const budget = parseFloat(projectDetails?.budget || "0");
                              const spent = parseFloat(val || "0");
                              const remaining = Math.max(0, budget - spent);
                              setNewReport(prev => ({
                                ...prev,
                                budgetSpent: val,
                                budgetRemaining: remaining.toString(),
                              }));
                            }}
                            placeholder="0.00"
                            className="h-11 pl-12 text-foreground font-bold text-right"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">ريال</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                      <span className="text-sm font-semibold text-muted-foreground">المبلغ المتبقي من ميزانية المشروع:</span>
                      <span className="text-lg font-black text-primary">
                        {newReport.budgetRemaining ? parseFloat(newReport.budgetRemaining).toLocaleString() : "0"} <span className="text-xs font-normal">ريال</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setActiveTab("list");
                      resetNewReport();
                    }}
                    className="px-6 h-12"
                  >
                    إلغاء وتراجع
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleCreateReport}
                    disabled={createMutation.isPending || hasIncompleteSchedule || !newReport.actualWorkDone.trim() || !newReport.title.trim() || !!lockedPaymentInfo}
                    className="px-8 h-12 shadow-sm font-bold bg-primary hover:bg-primary/90"
                  >
                    {createMutation.isPending ? "جاري الحفظ والإنشاء..." : "حفظ وإنشاء التقرير"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">تقارير الإنجاز</h1>
            <p className="text-muted-foreground">متابعة وتوثيق تقدم المشاريع</p>
          </div>
          {canCreateReport && (
            <Button onClick={() => setActiveTab("create")}>
              <Plus className="w-4 h-4 ml-2" />
              تقرير جديد
            </Button>
          )}
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-blue-100 dark:border-blue-900/50 bg-blue-50/10 dark:bg-blue-950/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">إجمالي التقارير</p>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{statsData.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-100 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-900/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">مسودات</p>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{statsData.draft}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                <Edit className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-amber-100 dark:border-amber-900/50 bg-amber-50/10 dark:bg-amber-950/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">قيد المراجعة</p>
                <p className="text-3xl font-black text-amber-700 dark:text-amber-400">{statsData.submitted}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-100 dark:border-green-900/50 bg-green-50/10 dark:bg-green-950/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">معتمدة</p>
                <p className="text-3xl font-black text-green-700 dark:text-green-400">{statsData.approved}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                <CheckCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 dark:border-primary/30 bg-primary/[0.02] dark:bg-primary/[0.05] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary">متوسط الإنجاز</p>
                <p className="text-3xl font-black text-primary">{statsData.avgProgress}%</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                <BarChart3 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أدوات البحث والتصفية */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم التقرير أو العنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="submitted">مقدم للمراجعة</SelectItem>
              <SelectItem value="reviewed">تمت المراجعة</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* جدول التقارير */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم التقرير</TableHead>
                  <TableHead>المشروع</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>تاريخ التقرير</TableHead>
                  <TableHead>نسبة الإنجاز</TableHead>
                  <TableHead>الانحراف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.reportNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {report.projectName}
                      </div>
                    </TableCell>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(report.reportDate).toLocaleDateString("ar-SA")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={report.overallProgress} className="w-20 h-2" />
                        <span className="text-sm">{report.overallProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${getVarianceColor(report.variance)}`}>
                        {getVarianceIcon(report.variance)}
                        <span>{report.variance > 0 ? "+" : ""}{report.variance}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[report.status]?.variant || "secondary"}>
                        {STATUS_MAP[report.status]?.label || report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(report)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {report.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => submitMutation.mutate({ id: report.id })}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد تقارير
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>


        {/* نافذة تفاصيل التقرير */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل تقرير الإنجاز</DialogTitle>
              <DialogDescription>
                {selectedReport?.reportNumber} - {selectedReport?.title}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-6 py-4">
                {/* المعلومات الأساسية */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">المشروع</p>
                    <p className="font-medium">{selectedReport.projectName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ التقرير</p>
                    <p className="font-medium">
                      {new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    <Badge variant={STATUS_MAP[selectedReport.status]?.variant || "secondary"}>
                      {STATUS_MAP[selectedReport.status]?.label || selectedReport.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">معد التقرير</p>
                    <p className="font-medium">{selectedReport.createdByName}</p>
                  </div>
                </div>
                
                <Separator />
                
                {/* نسب الإنجاز */}
                <div className="space-y-4">
                  <h3 className="font-semibold">نسب الإنجاز</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-3xl font-bold">{selectedReport.overallProgress}%</p>
                      <p className="text-sm text-muted-foreground">الإنجاز الإجمالي</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-700">{selectedReport.plannedProgress}%</p>
                      <p className="text-sm text-blue-600">المخطط</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-700">{selectedReport.actualProgress}%</p>
                      <p className="text-sm text-green-600">الفعلي</p>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    selectedReport.variance > 0 
                      ? "bg-green-50 border border-green-200" 
                      : selectedReport.variance < 0
                      ? "bg-red-50 border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}>
                    {getVarianceIcon(selectedReport.variance)}
                    <span className={getVarianceColor(selectedReport.variance)}>
                      الانحراف: {selectedReport.variance > 0 ? "+" : ""}{selectedReport.variance}%
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                {/* ملخص الأعمال */}
                {selectedReport.workSummary && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">الأعمال المنجزة</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.workSummary}</p>
                  </div>
                )}
                
                {selectedReport.challenges && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">التحديات والمعوقات</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.challenges}</p>
                  </div>
                )}
                
                {selectedReport.nextSteps && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">الخطوات القادمة</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.nextSteps}</p>
                  </div>
                )}
                
                {selectedReport.recommendations && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">التوصيات</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.recommendations}</p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>
              {canReviewReport && selectedReport?.status === "submitted" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => reviewMutation.mutate({ id: selectedReport.id, status: "reviewed" })}
                  >
                    تمت المراجعة
                  </Button>
                  <Button
                    onClick={() => reviewMutation.mutate({ id: selectedReport.id, status: "approved" })}
                  >
                    اعتماد
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
