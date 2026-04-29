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
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  submitted: { label: "مقدم للمراجعة", variant: "default" },
  reviewed: { label: "تمت المراجعة", variant: "outline" },
  approved: { label: "معتمد", variant: "outline" },
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

  // إنشاء تقرير جديد
  const handleCreateReport = () => {
    if (!newReport.projectId) {
      toast.error("يرجى اختيار المشروع");
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المشروع <span className="text-red-500">*</span></Label>
                    <Select
                      value={newReport.projectId.toString()}
                      onValueChange={(v) => setNewReport({ ...newReport, projectId: parseInt(v) })}
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
                  
                  <div className="space-y-2">
                    <Label>تاريخ التقرير <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={newReport.reportDate}
                      onChange={(e) => setNewReport({ ...newReport, reportDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>عنوان التقرير <span className="text-red-500">*</span></Label>
                  <Input
                    value={newReport.title}
                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                    placeholder="مثال: تقرير إنجاز شهر يناير 2026"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>بداية فترة التقرير</Label>
                    <Input
                      type="date"
                      value={newReport.reportPeriodStart}
                      onChange={(e) => setNewReport({ ...newReport, reportPeriodStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نهاية فترة التقرير</Label>
                    <Input
                      type="date"
                      value={newReport.reportPeriodEnd}
                      onChange={(e) => setNewReport({ ...newReport, reportPeriodEnd: e.target.value })}
                    />
                  </div>
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
                
                <div className="space-y-2">
                  <Label>التحديات والمعوقات</Label>
                  <Textarea
                    value={newReport.challenges}
                    onChange={(e) => setNewReport({ ...newReport, challenges: e.target.value })}
                    placeholder="اذكر التحديات والمعوقات التي واجهت المشروع..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>الخطوات القادمة</Label>
                  <Textarea
                    value={newReport.nextSteps}
                    onChange={(e) => setNewReport({ ...newReport, nextSteps: e.target.value })}
                    placeholder="اذكر الخطوات المخطط تنفيذها في الفترة القادمة..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>التوصيات</Label>
                  <Textarea
                    value={newReport.recommendations}
                    onChange={(e) => setNewReport({ ...newReport, recommendations: e.target.value })}
                    placeholder="أي توصيات أو مقترحات لتحسين سير العمل..."
                    rows={2}
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
              <Button onClick={handleCreateReport} disabled={createMutation.isPending}>
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
