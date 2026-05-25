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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  
  // بيانات تقرير جديد
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
  });

  // استعلامات البيانات
  const { data: reportsData, refetch: refetchReports } = trpc.progressReports.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });
  
  // إحصائيات التقارير - سيتم إضافتها لاحقاً
  const statsData = { total: 0, draft: 0, submitted: 0, reviewed: 0, approved: 0, avgProgress: 0 };
  const { data: projectsData } = trpc.projects.getAll.useQuery({});

  // جلب تفاصيل المشروع المحدد للتحقق من جدولة الدفعات
  const { data: projectDetails, isLoading: isProjectDetailsLoading } = trpc.projects.getById.useQuery(
    { id: newReport.projectId },
    { enabled: newReport.projectId > 0 }
  );

  const totalContractAmount = projectDetails?.contracts?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0) || 0;
  const totalScheduledPayments = projectDetails?.payments?.filter((p: any) => p.source === "contract" || (p.source === "disbursement" && p.contractPaymentId)).reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0) || 0;

  const hasIncompleteSchedule = newReport.projectId > 0 && !isProjectDetailsLoading && (totalContractAmount === 0 || Math.abs(totalContractAmount - totalScheduledPayments) > 0.01);

  // Mutations
  const createMutation = trpc.progressReports.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء التقرير بنجاح - رقم ${data.reportNumber}`);
      setShowCreateDialog(false);
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
    });
  };

  // معالجة اختيار الدفعة وملء الحقول تلقائياً
  const handleSelectPayment = (payment: any) => {
    setSelectedPaymentId(payment.id);
    
    const budget = parseFloat(projectDetails?.budget || "0");
    const spent = parseFloat(payment.amount || "0");
    const remaining = Math.max(0, budget - spent);

    setNewReport(prev => ({
      ...prev,
      title: `تقرير إنجاز - ${payment.description || payment.paymentNumber}`,
      plannedProgress: payment.completionPercentage || 0,
      actualProgress: payment.completionPercentage || 0,
      overallProgress: payment.completionPercentage || 0,
      budgetSpent: payment.amount?.toString() || "0",
      budgetRemaining: remaining.toString(),
      workSummary: payment.workDescription || payment.description || "",
    }));

    toast.success("تم اختيار الدفعة وملء البيانات تلقائياً");
  };

  // إنشاء تقرير جديد
  const handleCreateReport = () => {
    if (!newReport.projectId) {
      toast.error("يرجى اختيار المشروع");
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
    
    createMutation.mutate(newReport);
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
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 ml-2" />
              تقرير جديد
            </Button>
          )}
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التقارير</p>
                  <p className="text-2xl font-bold">{statsData?.total || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مسودات</p>
                  <p className="text-2xl font-bold text-gray-600">{statsData?.draft || 0}</p>
                </div>
                <Edit className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                  <p className="text-2xl font-bold text-blue-600">{statsData?.submitted || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">معتمدة</p>
                  <p className="text-2xl font-bold text-green-600">{statsData?.approved || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">متوسط الإنجاز</p>
                  <p className="text-2xl font-bold">{statsData?.avgProgress || 0}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary" />
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

        {/* نافذة إنشاء تقرير جديد */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء تقرير إنجاز جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات تقرير الإنجاز للمشروع
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* المعلومات الأساسية */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  المعلومات الأساسية
                </h3>
                
                <div className="space-y-2">
                  <Label>المشروع <span className="text-red-500">*</span></Label>
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
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المشروع" />
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

                {newReport.projectId > 0 && (
                  <div className="space-y-3 pt-3 border-t border-dashed border-border/80">
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
                          const statusStyles = getPaymentStatusStyles(payment.status);
                          const statusLabel = PAYMENT_STATUS_MAP[payment.status]?.label || payment.status;
                          
                          return (
                            <div
                              key={payment.id}
                              onClick={() => handleSelectPayment(payment)}
                              className={`relative p-4 rounded-xl border-2 text-right cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 ${
                                isSelected
                                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/20"
                                  : "border-transparent bg-background hover:border-primary/40 hover:bg-accent/10 hover:shadow-sm"
                              }`}
                            >
                              {/* Selected checkmark badge */}
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
                                <Progress value={payment.completionPercentage || 0} className="h-1.5 bg-muted/60 animate-all duration-500" />
                              </div>
                              
                              {payment.workDescription && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1 border-t pt-1.5 border-dashed border-border/60">
                                  {payment.workDescription}
                                </p>
                              )}
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

                {hasIncompleteSchedule && (
                  <div className="bg-amber-50/80 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl p-4 flex items-start gap-3 text-right backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-200 col-span-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm">
                        لا يمكن صرف تقرير إنجاز للمشروع
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        لا يمكن صرف تقرير إنجاز حتى تجدول كل دفعات المشروع. يرجى الذهاب إلى تفاصيل المشروع وجدولة جميع الدفعات لتتساوى مع كامل قيمة العقد لتجنب أي عوائق.
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-amber-900 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200/40 w-fit">
                        <span>قيمة العقد: <span className="font-bold">{totalContractAmount.toLocaleString()} ريال</span></span>
                        <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                        <span>الدفعات المجدولة: <span className="font-bold">{totalScheduledPayments.toLocaleString()} ريال</span></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>عنوان التقرير <span className="text-red-500">*</span></Label>
                  <Input
                    value={newReport.title}
                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                    placeholder="مثال: تقرير إنجاز شهر يناير 2026"
                  />
                </div>
                

              </div>
              
              <Separator />
              
              {/* نسب الإنجاز */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  نسب الإنجاز
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>نسبة الإنجاز الإجمالية</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newReport.overallProgress}
                        onChange={(e) => setNewReport({ ...newReport, overallProgress: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <Progress value={newReport.overallProgress} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>نسبة الإنجاز المخططة</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newReport.plannedProgress}
                        onChange={(e) => setNewReport({ ...newReport, plannedProgress: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>نسبة الإنجاز الفعلية</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newReport.actualProgress}
                        onChange={(e) => setNewReport({ ...newReport, actualProgress: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                
                {/* عرض الانحراف */}
                <div className={`p-3 rounded-lg ${
                  newReport.actualProgress - newReport.plannedProgress > 0 
                    ? "bg-green-50 border border-green-200" 
                    : newReport.actualProgress - newReport.plannedProgress < 0
                    ? "bg-red-50 border border-red-200"
                    : "bg-gray-50 border border-gray-200"
                }`}>
                  <div className="flex items-center gap-2">
                    {getVarianceIcon(newReport.actualProgress - newReport.plannedProgress)}
                    <span className={getVarianceColor(newReport.actualProgress - newReport.plannedProgress)}>
                      الانحراف: {newReport.actualProgress - newReport.plannedProgress > 0 ? "+" : ""}
                      {newReport.actualProgress - newReport.plannedProgress}%
                      {newReport.actualProgress - newReport.plannedProgress > 0 
                        ? " (متقدم عن الخطة)" 
                        : newReport.actualProgress - newReport.plannedProgress < 0
                        ? " (متأخر عن الخطة)"
                        : " (حسب الخطة)"}
                    </span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* ملخص الأعمال */}
              <div className="space-y-4">
                <h3 className="font-semibold">ملخص الأعمال</h3>
                
                <div className="space-y-2">
                  <Label>الأعمال المنجزة</Label>
                  <Textarea
                    value={newReport.workSummary}
                    onChange={(e) => setNewReport({ ...newReport, workSummary: e.target.value })}
                    placeholder="اذكر الأعمال التي تم إنجازها خلال فترة التقرير..."
                    rows={3}
                  />
                </div>

              </div>
              
              <Separator />
              
              {/* البيانات المالية */}
              <div className="space-y-4">
                <h3 className="font-semibold">البيانات المالية</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المبلغ المصروف (ريال)</Label>
                    <Input
                      type="number"
                      value={newReport.budgetSpent}
                      onChange={(e) => setNewReport({ ...newReport, budgetSpent: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ المتبقي (ريال)</Label>
                    <Input
                      type="number"
                      value={newReport.budgetRemaining}
                      onChange={(e) => setNewReport({ ...newReport, budgetRemaining: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateReport} disabled={createMutation.isPending || hasIncompleteSchedule}>
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء التقرير"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
