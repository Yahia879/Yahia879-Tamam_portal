import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowRight, 
  FolderKanban, 
  Building2, 
  Calendar, 
  DollarSign,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Banknote,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import GanttChart from "@/components/GanttChart";

const STATUS_LABELS: Record<string, string> = {
  planning: "تخطيط",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  on_hold: "متوقف",
  cancelled: "ملغي",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ProjectDetails() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportData, setReportData] = useState({
    title: "",
    reportDate: new Date().toISOString().split("T")[0],
    overallProgress: 0,
    plannedProgress: 0,
    actualProgress: 0,
    workSummary: "",
    challenges: "",
    nextSteps: "",
  });

  // استعلامات البيانات
  const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  // المراحل ستأتي من بيانات المشروع
  const phases: any[] = [];

  const { data: disbursements } = trpc.disbursements.listRequests.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const { data: progressReports, refetch: refetchReports } = trpc.progressReports.list.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Mutations
  const createReportMutation = trpc.progressReports.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء التقرير بنجاح");
      setShowReportDialog(false);
      refetchReports();
      setReportData({
        title: "",
        reportDate: new Date().toISOString().split("T")[0],
        overallProgress: 0,
        plannedProgress: 0,
        actualProgress: 0,
        workSummary: "",
        challenges: "",
        nextSteps: "",
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // تحويل المراحل لمخطط جانت
  const ganttTasks = phases?.map((phase: any) => ({
    id: phase.id,
    name: phase.name,
    startDate: new Date(phase.startDate || project?.startDate || new Date()),
    endDate: new Date(phase.endDate || new Date()),
    progress: phase.progress || 0,
    status: (phase.status === "completed" ? "completed" :
            phase.status === "in_progress" ? "in_progress" :
            phase.status === "delayed" ? "delayed" : "pending") as "pending" | "in_progress" | "completed" | "delayed",
  })) || [];

  const handleCreateReport = () => {
    createReportMutation.mutate({
      projectId,
      ...reportData,
    });
  };

  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">المشروع غير موجود</p>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">العودة للمشاريع</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const budget = parseFloat(project.budget || "0");
  const spent = disbursements?.requests?.reduce((sum: number, d: any) => 
    d.status === "approved" ? sum + parseFloat(d.amount) : sum, 0) || 0;
  const progress = (project as any).overallProgress || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {project.projectNumber}
            </p>
          </div>
          <Badge className={STATUS_COLORS[project.status || "planning"]}>
            {STATUS_LABELS[project.status || "planning"]}
          </Badge>
        </div>

        {/* بطاقات الملخص */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">نسبة الإنجاز</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{progress}%</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
              </div>
              <Progress value={progress} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الميزانية</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{budget.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ريال سعودي</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المصروف</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{spent.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {budget > 0 ? `${((spent / budget) * 100).toFixed(0)}% من الميزانية` : ""}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {(project as any).endDate ? new Date((project as any).endDate).toLocaleDateString("ar-SA") : "-"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات */}
        <Tabs defaultValue="gantt" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="gantt">مخطط جانت</TabsTrigger>
            <TabsTrigger value="phases">مراحل المشروع</TabsTrigger>
            <TabsTrigger value="disbursements">طلبات الصرف</TabsTrigger>
            <TabsTrigger value="reports">تقارير الإنجاز</TabsTrigger>
            <TabsTrigger value="documents">المستندات</TabsTrigger>
          </TabsList>

          {/* مخطط جانت */}
          <TabsContent value="gantt">
            <GanttChart
              tasks={ganttTasks}
              projectStartDate={new Date(project.startDate || new Date())}
              projectEndDate={new Date((project as any).endDate || new Date())}
              title="الجدول الزمني للمشروع"
            />
          </TabsContent>

          {/* مراحل المشروع */}
          <TabsContent value="phases">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>مراحل المشروع</CardTitle>
                <CardDescription>متابعة تقدم مراحل التنفيذ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phases?.map((phase: any, index: number) => (
                    <div key={phase.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        phase.status === "completed" ? "bg-green-100" :
                        phase.status === "in_progress" ? "bg-yellow-100" : "bg-muted"
                      }`}>
                        {phase.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : phase.status === "in_progress" ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{phase.name}</p>
                        <Progress value={phase.progress || 0} className="h-2 mt-2" />
                      </div>
                      <span className="text-sm text-muted-foreground">{phase.progress || 0}%</span>
                    </div>
                  ))}
                  {(!phases || phases.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">لا توجد مراحل محددة</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* طلبات الصرف */}
          <TabsContent value="disbursements">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>طلبات الصرف</CardTitle>
                  <CardDescription>سجل طلبات الصرف والدفعات</CardDescription>
                </div>
                <Link href="/disbursements">
                  <Button>
                    <Plus className="w-4 h-4 ml-2" />
                    طلب صرف جديد
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {disbursements?.requests?.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          request.status === "approved" ? "bg-green-100" :
                          request.status === "pending" ? "bg-yellow-100" :
                          request.status === "rejected" ? "bg-red-100" : "bg-muted"
                        }`}>
                          <Banknote className={`w-5 h-5 ${
                            request.status === "approved" ? "text-green-600" :
                            request.status === "pending" ? "text-yellow-600" :
                            request.status === "rejected" ? "text-red-600" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{request.requestNumber}</p>
                          <p className="text-sm text-muted-foreground">{request.description}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{parseFloat(request.amount).toLocaleString()} ر.س</p>
                        <Badge variant="outline" className={
                          request.status === "approved" ? "border-green-500 text-green-600" :
                          request.status === "pending" ? "border-yellow-500 text-yellow-600" :
                          request.status === "rejected" ? "border-red-500 text-red-600" : ""
                        }>
                          {request.status === "approved" ? "معتمد" :
                           request.status === "pending" ? "قيد الانتظار" :
                           request.status === "rejected" ? "مرفوض" : request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!disbursements?.requests || disbursements.requests.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">لا توجد طلبات صرف</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تقارير الإنجاز */}
          <TabsContent value="reports">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>تقارير الإنجاز</CardTitle>
                  <CardDescription>متابعة تقدم المشروع وتقارير الأداء</CardDescription>
                </div>
                <Button onClick={() => setShowReportDialog(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  تقرير جديد
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progressReports?.map((report: any) => (
                    <div key={report.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-sm text-muted-foreground">{report.reportNumber}</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {report.status === "draft" ? "مسودة" :
                           report.status === "submitted" ? "مقدم" :
                           report.status === "reviewed" ? "تمت المراجعة" :
                           report.status === "approved" ? "معتمد" : report.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">الإنجاز الفعلي:</span>
                          <span className="font-medium">{report.actualProgress}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">المخطط:</span>
                          <span className="font-medium">{report.plannedProgress}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">الانحراف:</span>
                          <span className={`font-medium flex items-center gap-1 ${
                            report.variance > 0 ? "text-green-600" :
                            report.variance < 0 ? "text-red-600" : ""
                          }`}>
                            {report.variance > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : report.variance < 0 ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : null}
                            {report.variance}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!progressReports || progressReports.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">لا توجد تقارير إنجاز</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* المستندات */}
          <TabsContent value="documents">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد مستندات مرفقة</p>
                <Button variant="outline" className="mt-4">رفع مستند</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* نافذة إنشاء تقرير إنجاز */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء تقرير إنجاز جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات تقرير الإنجاز للمشروع
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان التقرير</Label>
                <Input
                  value={reportData.title}
                  onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                  placeholder="تقرير الإنجاز الشهري"
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ التقرير</Label>
                <Input
                  type="date"
                  value={reportData.reportDate}
                  onChange={(e) => setReportData({ ...reportData, reportDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>نسبة الإنجاز الإجمالية %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={reportData.overallProgress}
                  onChange={(e) => setReportData({ ...reportData, overallProgress: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>نسبة الإنجاز المخططة %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={reportData.plannedProgress}
                  onChange={(e) => setReportData({ ...reportData, plannedProgress: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>نسبة الإنجاز الفعلية %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={reportData.actualProgress}
                  onChange={(e) => setReportData({ ...reportData, actualProgress: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملخص الأعمال المنجزة</Label>
              <Textarea
                value={reportData.workSummary}
                onChange={(e) => setReportData({ ...reportData, workSummary: e.target.value })}
                placeholder="وصف الأعمال التي تم إنجازها خلال الفترة..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>التحديات والمعوقات</Label>
              <Textarea
                value={reportData.challenges}
                onChange={(e) => setReportData({ ...reportData, challenges: e.target.value })}
                placeholder="المشاكل والتحديات التي واجهت المشروع..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>الخطوات القادمة</Label>
              <Textarea
                value={reportData.nextSteps}
                onChange={(e) => setReportData({ ...reportData, nextSteps: e.target.value })}
                placeholder="الأعمال المخطط تنفيذها في الفترة القادمة..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateReport}
              disabled={!reportData.title || createReportMutation.isPending}
            >
              {createReportMutation.isPending ? "جاري الحفظ..." : "حفظ التقرير"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
