import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Clock, 
  Calendar, 
  BarChart3, 
  MapPin, 
  Plus, 
  Printer,
  Eye,
  MoreVertical,
  Edit,
  Sparkles
} from "lucide-react";
import { ReportPrintPreviewModal } from "@/components/project-reports/ReportPrintPreviewModal";

export default function ProjectReportsHubPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<any>(null);

  const { data: dbReports, refetch: refetchReports } = trpc.progressReports.list.useQuery();
  const updateStatusMutation = trpc.progressReports.updateStatus.useMutation({
    onSuccess: () => {
      refetchReports();
      toast.success("تم تحديث حالة التقرير بنجاح");
    },
    onError: (err) => {
      toast.error(`حدث خطأ أثناء تحديث الحالة: ${err.message}`);
    }
  });

  const reports = useMemo(() => {
    if (!dbReports) return [];
    return dbReports.map((r) => {
      let typeKey: "semi-monthly" | "monthly" | "quarterly" | "visit" = "semi-monthly";
      let typeLabel = "تقرير نصف شهري";
      
      const titleLower = r.title.toLowerCase();
      if (titleLower.includes("ربع") || titleLower.includes("quarterly") || titleLower.includes("q1") || titleLower.includes("q2") || titleLower.includes("q3") || titleLower.includes("q4")) {
        typeKey = "quarterly";
        typeLabel = "تقرير ربعي";
      } else if (titleLower.includes("شهري") || titleLower.includes("monthly")) {
        if (titleLower.includes("نصف") || titleLower.includes("semi")) {
          typeKey = "semi-monthly";
          typeLabel = "تقرير نصف شهري";
        } else {
          typeKey = "monthly";
          typeLabel = "تقرير شهري";
        }
      } else if (titleLower.includes("زيارة") || titleLower.includes("visit")) {
        typeKey = "visit";
        typeLabel = "تقرير زيارة";
      }

      // حساب RAG بناءً على الفارق بين الإنجاز المخطط والإنجاز الفعلي
      const planned = r.plannedProgress ?? 0;
      const actual = r.actualProgress ?? 0;
      const gap = planned - actual;

      let ragLabel = "أخضر";
      if (gap >= 25) {
        ragLabel = "أحمر";
      } else if (gap >= 5) {
        ragLabel = "أصفر";
      } else {
        ragLabel = "أخضر";
      }

      let statusLabel = "مسودة";
      if (r.status === "submitted" || r.status === "reviewed") {
        statusLabel = "تم الاطلاع";
      } else if (r.status === "approved") {
        statusLabel = "معتمد";
      }

      return {
        id: r.id,
        reportNumber: r.reportNumber,
        title: r.title,
        type: typeLabel,
        typeKey: typeKey,
        project: r.projectName || "مشروع غير محدد",
        date: r.reportDate ? String(r.reportDate).split("T")[0] : "",
        rag: ragLabel,
        status: statusLabel,
        raw: r,
      };
    });
  }, [dbReports]);

  const stats = useMemo(() => {
    return {
      total: reports.length,
      semiMonthly: reports.filter((r) => r.typeKey === "semi-monthly").length,
      monthly: reports.filter((r) => r.typeKey === "monthly").length,
      quarterly: reports.filter((r) => r.typeKey === "quarterly").length,
      visit: reports.filter((r) => r.typeKey === "visit").length,
    };
  }, [reports]);

  const handleUpdateReportStatus = (id: number, newStatus: string) => {
    let dbStatus: "draft" | "submitted" | "approved" | "reviewed" = "draft";
    if (newStatus === "تم الاطلاع") dbStatus = "submitted";
    if (newStatus === "معتمد") dbStatus = "approved";

    updateStatusMutation.mutate({
      id,
      status: dbStatus,
    });
  };

  const handleOpenPreviewModal = (reportItem: any) => {
    const raw = reportItem.raw || {};
    setSelectedReportForPreview({
      reportType: reportItem.typeKey,
      reportTitle: reportItem.title,
      data: {
        id: reportItem.id,
        reportNumber: reportItem.reportNumber || `REP-${reportItem.id}`,
        reportDate: reportItem.date,
        status: reportItem.status,
        projectName: reportItem.project,
        projectManager: raw.createdByName || "مدير المشروع",
        ownerDepartment: "إدارة المشاريع",
        plannedProgress: raw.plannedProgress ?? 0,
        actualProgress: raw.actualProgress ?? 0,
        ragStatus: reportItem.rag,
        milestones: raw.milestones ? (typeof raw.milestones === "string" ? JSON.parse(raw.milestones) : raw.milestones) : [],
        challenges: raw.challenges || raw.risks || "",
        recommendations: raw.recommendations || "",
        notes: raw.workSummary || raw.notes || "",
        periodFrom: raw.startDate ? String(raw.startDate).split("T")[0] : "",
        periodTo: raw.endDate ? String(raw.endDate).split("T")[0] : "",
      }
    });
    setPreviewModalOpen(true);
  };

  const filteredReports = useMemo(() => {
    if (filterType === "all") return reports;
    return reports.filter((r) => r.typeKey === filterType);
  }, [reports, filterType]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-in fade-in duration-300" dir="rtl">
        {/* Header Block with New Report Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/10 border border-teal-600/20 text-teal-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">مركز تقارير المشاريع</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">استعراض ومتابعة وتعبئة التقارير النصف شهرية والشهرية والربعية والزيارات الميدانية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/project-reports/new">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>تقرير جديد</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Pure Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Semi-monthly */}
          <div className="p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">التقارير النصف شهرية</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-black text-foreground">{stats.semiMonthly}</span>
              <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full">كل أسبوعين</span>
            </div>
          </div>

          {/* Card 2: Monthly */}
          <div className="p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">التقارير الشهرية</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-black text-foreground">{stats.monthly}</span>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">شهرياً</span>
            </div>
          </div>

          {/* Card 3: Quarterly */}
          <div className="p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">التقارير الربعية</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-black text-foreground">{stats.quarterly}</span>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">كل 3 أشهر</span>
            </div>
          </div>

          {/* Card 4: Visits */}
          <div className="p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">تقارير الزيارات الميدانية</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-black text-foreground">{stats.visit}</span>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">توثيق ميداني</span>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  قائمة تقارير المشاريع
                </CardTitle>
                <CardDescription className="text-xs">سجل كافة تقارير المتابعة والزيارات الميدانية مع الحالة ومؤشر RAG</CardDescription>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto overflow-x-auto">
                <Button
                  variant={filterType === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="h-8 text-xs rounded-lg font-bold"
                >
                  الكل ({stats.total})
                </Button>
                <Button
                  variant={filterType === "semi-monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("semi-monthly")}
                  className="h-8 text-xs rounded-lg font-semibold"
                >
                  نصف شهري
                </Button>
                <Button
                  variant={filterType === "monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("monthly")}
                  className="h-8 text-xs rounded-lg font-semibold"
                >
                  شهري
                </Button>
                <Button
                  variant={filterType === "quarterly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("quarterly")}
                  className="h-8 text-xs rounded-lg font-semibold"
                >
                  ربعي
                </Button>
                <Button
                  variant={filterType === "visit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("visit")}
                  className="h-8 text-xs rounded-lg font-semibold"
                >
                  زيارة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">معرف التقرير</TableHead>
                  <TableHead className="text-xs font-bold">نوع التقرير</TableHead>
                  <TableHead className="text-xs font-bold">المشروع</TableHead>
                  <TableHead className="text-xs font-bold">تاريخ التقرير</TableHead>
                  <TableHead className="text-xs font-bold text-center">مؤشر RAG</TableHead>
                  <TableHead className="text-xs font-bold text-center">الحالة</TableHead>
                  <TableHead className="text-xs font-bold text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-bold text-primary">{report.id}</TableCell>
                    <TableCell className="text-xs font-semibold">{report.type}</TableCell>
                    <TableCell className="text-xs font-medium max-w-xs truncate">{report.project}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{report.date}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          report.rag === "أخضر"
                            ? "bg-emerald-500 text-white text-[10px]"
                            : report.rag === "أصفر"
                            ? "bg-amber-500 text-white text-[10px]"
                            : "bg-rose-500 text-white text-[10px]"
                        }
                      >
                        {report.rag}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select
                        value={report.status}
                        onValueChange={(newStatus) => handleUpdateReportStatus(report.id, newStatus)}
                      >
                        <SelectTrigger className="h-8 border-border/80 w-28 text-xs font-semibold bg-background mx-auto">
                          <SelectValue placeholder="حالة التقرير" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مسودة" className="text-xs font-semibold">مسودة</SelectItem>
                          <SelectItem value="تم الاطلاع" className="text-xs font-semibold text-teal-600">تم الاطلاع</SelectItem>
                          <SelectItem value="معتمد" className="text-xs font-semibold text-emerald-600">معتمد</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/50 mx-auto">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-right text-xs">
                          <DropdownMenuItem asChild>
                            <Link href={`/project-reports/${report.id}/print`} className="gap-2 cursor-pointer flex items-center w-full font-bold text-teal-700">
                              <Printer className="w-4 h-4 text-teal-600" />
                              <span>معاينة وطباعة التقرير (PDF)</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/project-reports/${report.typeKey}`} className="gap-2 cursor-pointer flex items-center w-full">
                              <Edit className="w-4 h-4 text-muted-foreground" />
                              <span>تعديل التقرير</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Print & PDF Preview Modal */}
        {selectedReportForPreview && (
          <ReportPrintPreviewModal
            isOpen={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            reportType={selectedReportForPreview.reportType}
            reportTitle={selectedReportForPreview.reportTitle}
            data={selectedReportForPreview.data}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
