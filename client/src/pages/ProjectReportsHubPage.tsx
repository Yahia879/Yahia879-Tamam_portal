import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { FOLLOW_UP_REPORT_TITLE, isFollowUpReport } from "@shared/followUpReport";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPermissions } from "@/hooks/usePermission";
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
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { ReportPrintPreviewModal } from "@/components/project-reports/ReportPrintPreviewModal";

const formatDateArabic = (dateVal: any): string => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(dateVal);
  }
};
const formatDateArabicShort = (dateVal: any): string => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
};

const formatPeriodArabic = (startVal: any, endVal: any, reportDateVal: any): string => {
  if (startVal && endVal) {
    const sStr = formatDateArabicShort(startVal);
    const eStr = formatDateArabicShort(endVal);
    if (sStr && eStr) {
      return `من ${sStr} إلى ${eStr}`;
    }
  }
  if (startVal) {
    return `من ${formatDateArabicShort(startVal)}`;
  }
  if (reportDateVal) {
    return `بتاريخ ${formatDateArabicShort(reportDateVal)}`;
  }
  return "—";
};

export default function ProjectReportsHubPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const serverPermissions = useUserPermissions();
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");

  const canCreateReports = 
    isAdmin || 
    serverPermissions.includes("project_reports.create");

  const canEditOrApprove = 
    isAdmin || 
    serverPermissions.includes("project_reports.create");

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

  const deleteMutation = trpc.progressReports.delete.useMutation({
    onSuccess: () => {
      refetchReports();
      toast.success("تم حذف التقرير بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف التقرير");
    },
  });

  const deleteAllMutation = trpc.progressReports.deleteAll.useMutation({
    onSuccess: () => {
      refetchReports();
      toast.success("تم مسح جميع التقارير بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء مسح التقارير");
    },
  });

  const reports = useMemo(() => {
    if (!dbReports) return [];

    // عرض تقارير المتابعة الجديدة وتقارير المشاريع المسجلة سابقاً.
    const filteredDbReports = dbReports.filter((r) => {
      if ((r as any).disbursementRequestId) return false;
      if (isFollowUpReport(r)) return true;

      const titleLower = (r.title || "").toLowerCase();
      const reportNumUpper = (r.reportNumber || "").toUpperCase();

      let diffDays = 0;
      if (r.reportPeriodStart && r.reportPeriodEnd) {
        const start = new Date(r.reportPeriodStart);
        const end = new Date(r.reportPeriodEnd);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      return (
        titleLower.includes("زيارة") || titleLower.includes("visit") || reportNumUpper.includes("VISIT") ||
        titleLower.includes("ربع") || titleLower.includes("quarterly") || reportNumUpper.includes("Q") || (diffDays >= 70 && diffDays <= 110) ||
        titleLower.includes("نصف") || titleLower.includes("semi") || reportNumUpper.includes("SEMI") || (diffDays >= 10 && diffDays <= 20) ||
        titleLower.includes("شهري") || titleLower.includes("monthly") || reportNumUpper.includes("MONTH") || (diffDays >= 25 && diffDays <= 35)
      );
    });

    return filteredDbReports.map((r) => {
      let typeKey: "semi-monthly" | "monthly" | "quarterly" | "visit" | "follow-up" = "monthly";
      let typeLabel = "تقرير شهري";

      const titleLower = (r.title || "").toLowerCase();
      const reportNumUpper = (r.reportNumber || "").toUpperCase();

      let diffDays = 0;
      if (r.reportPeriodStart && r.reportPeriodEnd) {
        const start = new Date(r.reportPeriodStart);
        const end = new Date(r.reportPeriodEnd);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      if (isFollowUpReport(r)) {
        typeKey = "follow-up";
        typeLabel = FOLLOW_UP_REPORT_TITLE;
      } else if (titleLower.includes("زيارة") || titleLower.includes("visit") || reportNumUpper.includes("VISIT")) {
        typeKey = "visit";
        typeLabel = "تقرير زيارة";
      } else if (titleLower.includes("ربع") || titleLower.includes("quarterly") || reportNumUpper.includes("Q") || (diffDays >= 70 && diffDays <= 110)) {
        typeKey = "quarterly";
        typeLabel = "تقرير ربعي";
      } else if (titleLower.includes("نصف") || titleLower.includes("semi") || reportNumUpper.includes("SEMI") || (diffDays >= 10 && diffDays <= 20)) {
        typeKey = "semi-monthly";
        typeLabel = "تقرير نصف شهري";
      } else if (titleLower.includes("شهري") || titleLower.includes("monthly") || reportNumUpper.includes("MONTH") || (diffDays >= 25 && diffDays <= 35)) {
        typeKey = "monthly";
        typeLabel = "تقرير شهري";
      }

      // حساب RAG بناءً على الفارق بين الإنجاز المخطط والإنجاز الفعلي
      const planned = r.plannedProgress ?? 0;
      const actual = r.actualProgress ?? 0;
      const gap = planned - actual;

      let ragLabel = "أخضر";
      if (typeKey === "follow-up" && (r.plannedProgress == null || r.actualProgress == null)) {
        ragLabel = "—";
      } else if (gap >= 25) {
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
        period: formatPeriodArabic(r.reportPeriodStart, r.reportPeriodEnd, r.reportDate),
        date: formatDateArabic(r.reportDate),
        rag: ragLabel,
        status: statusLabel,
        raw: r,
      };
    });
  }, [dbReports]);

  const stats = useMemo(() => {
    return {
      total: reports.length,
      followUp: reports.filter((r) => r.typeKey === "follow-up").length,
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

  const content = (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-6 animate-in fade-in duration-300" dir="rtl">
        {/* Header Block with New Report Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-600/10 border border-teal-600/20 text-teal-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">مركز تقارير المشاريع</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">استعراض ومتابعة وتعبئة التقارير النصف شهرية والشهرية والربعية والزيارات الميدانية</p>
            </div>
          </div>

          {canCreateReports && (
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Link href="/project-reports/new" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm min-h-10 max-lg:min-h-11 px-5 rounded-xl shadow-sm flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>تقرير جديد</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* 4 Pure Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground">{FOLLOW_UP_REPORT_TITLE}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black text-foreground">{stats.followUp}</span>
          </div>
          {/* Card 1: Semi-monthly */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground leading-snug">التقارير النصف شهرية</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-1.5 pt-1">
              <span className="text-xl sm:text-2xl font-black text-foreground">{stats.semiMonthly}</span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full">كل أسبوعين</span>
            </div>
          </div>

          {/* Card 2: Monthly */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground leading-snug">التقارير الشهرية</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-1.5 pt-1">
              <span className="text-xl sm:text-2xl font-black text-foreground">{stats.monthly}</span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">شهرياً</span>
            </div>
          </div>

          {/* Card 3: Quarterly */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground leading-snug">التقارير الربعية</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-1.5 pt-1">
              <span className="text-xl sm:text-2xl font-black text-foreground">{stats.quarterly}</span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">كل 3 أشهر</span>
            </div>
          </div>

          {/* Card 4: Visits */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900 shadow-2xs space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground leading-snug">تقارير الزيارات الميدانية</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-1.5 pt-1">
              <span className="text-xl sm:text-2xl font-black text-foreground">{stats.visit}</span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">توثيق ميداني</span>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden py-0 gap-0">
          <CardHeader className="bg-muted/30 border-b border-border/60 p-4 sm:py-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                  قائمة تقارير المشاريع
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">سجل كافة تقارير المتابعة والزيارات الميدانية مع الحالة ومؤشر RAG</CardDescription>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 w-full lg:w-auto max-w-full overflow-x-auto scrollbar-none">
                <Button
                  variant={filterType === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="shrink-0 h-8 sm:h-9 max-lg:min-h-10 text-xs rounded-lg font-bold px-3"
                >
                  الكل ({stats.total})
                </Button>
                <Button
                  variant={filterType === "follow-up" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("follow-up")}
                  className="shrink-0 h-8 sm:h-9 max-lg:min-h-10 text-xs rounded-lg font-semibold px-3"
                >
                  {FOLLOW_UP_REPORT_TITLE}
                </Button>
                <Button
                  variant={filterType === "semi-monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("semi-monthly")}
                  className="shrink-0 h-8 sm:h-9 max-lg:min-h-10 text-xs rounded-lg font-semibold px-3"
                >
                  نصف شهري
                </Button>
                <Button
                  variant={filterType === "monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("monthly")}
                  className="shrink-0 h-8 sm:h-9 max-lg:min-h-10 text-xs rounded-lg font-semibold px-3"
                >
                  شهري
                </Button>
                <Button
                  variant={filterType === "quarterly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("quarterly")}
                  className="shrink-0 h-8 sm:h-9 max-lg:min-h-10 text-xs rounded-lg font-semibold px-3"
                >
                  ربعي
                </Button>
                <Button
                  variant={filterType === "visit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("visit")}
                  className="shrink-0 h-8 sm:h-9 max-lg:min-h-10 text-xs rounded-lg font-semibold px-3"
                >
                  زيارة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile & iPad Cards View */}
            <div className="xl:hidden p-3 sm:p-4 bg-muted/15">
              {filteredReports.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  لا توجد تقارير مطابقة للتصنيف المحدد
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {report.typeKey === "follow-up" ? <bdi>{report.reportNumber}</bdi> : report.id}
                            </span>
                            <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
                              {report.type}
                            </span>
                          </div>
                          <Badge
                            className={`shrink-0 ${
                              report.rag === "—"
                                ? "bg-muted text-muted-foreground text-[10px]"
                                : report.rag === "أخضر"
                                ? "bg-emerald-500 text-white text-[10px]"
                                : report.rag === "أصفر"
                                ? "bg-amber-500 text-white text-[10px]"
                                : "bg-rose-500 text-white text-[10px]"
                            }`}
                          >
                            {report.rag}
                          </Badge>
                        </div>

                        <div className="text-sm font-bold text-foreground leading-snug break-words">
                          {report.project}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            {report.period}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {report.date}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-border/60 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground shrink-0">الحالة:</span>
                          {canEditOrApprove ? (
                            <Select
                              value={report.status}
                              onValueChange={(newStatus) => handleUpdateReportStatus(report.id, newStatus)}
                            >
                              <SelectTrigger className="h-9 max-lg:min-h-10 border-border/80 w-36 text-xs font-semibold bg-background">
                                <SelectValue placeholder="حالة التقرير" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="مسودة" className="text-xs font-semibold">مسودة</SelectItem>
                                <SelectItem value="تم الاطلاع" className="text-xs font-semibold text-teal-600">تم الاطلاع</SelectItem>
                                <SelectItem value="معتمد" className="text-xs font-semibold text-emerald-600">معتمد</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-xs font-semibold">
                              {report.status}
                            </Badge>
                          )}
                        </div>

                        {(report.typeKey === "follow-up" || report.status === "معتمد") && (
                          <Link href={`/project-reports/${report.id}/pdf?type=${report.typeKey}`} className="w-full">
                            <Button
                              variant="outline"
                              className="w-full min-h-10 max-lg:min-h-11 gap-2 text-xs font-bold text-teal-700 border-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            >
                              <Printer className="w-4 h-4 text-teal-600 shrink-0" />
                              <span>معاينة وطباعة التقرير (PDF)</span>
                            </Button>
                          </Link>
                        )}
                        {report.status === "مسودة" && (canCreateReports || canEditOrApprove) && (
                          <Link href={`/project-reports/${report.typeKey}?editId=${report.id}`} className="w-full">
                            <Button
                              variant="outline"
                              className="w-full min-h-10 max-lg:min-h-11 gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>إكمال التقرير</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden xl:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">معرف التقرير</TableHead>
                    <TableHead className="text-xs font-bold">نوع التقرير</TableHead>
                    <TableHead className="text-xs font-bold">المشروع</TableHead>
                    <TableHead className="text-xs font-bold">فترة التقرير</TableHead>
                    <TableHead className="text-xs font-bold">تاريخ التقرير</TableHead>
                    <TableHead className="text-xs font-bold text-center">مؤشر RAG</TableHead>
                    <TableHead className="text-xs font-bold text-center">الحالة</TableHead>
                    <TableHead className="text-xs font-bold text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        لا توجد تقارير مطابقة للتصنيف المحدد
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {report.typeKey === "follow-up" ? <bdi>{report.reportNumber}</bdi> : report.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{report.type}</TableCell>
                        <TableCell className="text-xs font-medium max-w-xs truncate">{report.project}</TableCell>
                        <TableCell>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg inline-block border border-emerald-500/20 whitespace-nowrap">
                            {report.period}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{report.date}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              report.rag === "—"
                                ? "bg-muted text-muted-foreground text-[10px]"
                                : report.rag === "أخضر"
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
                          {canEditOrApprove ? (
                            <Select
                              value={report.status}
                              onValueChange={(newStatus) => handleUpdateReportStatus(report.id, newStatus)}
                            >
                              <SelectTrigger className="h-8 pointer-coarse:min-h-10 border-border/80 w-28 text-xs font-semibold bg-background mx-auto">
                                <SelectValue placeholder="حالة التقرير" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="مسودة" className="text-xs font-semibold">مسودة</SelectItem>
                                <SelectItem value="تم الاطلاع" className="text-xs font-semibold text-teal-600">تم الاطلاع</SelectItem>
                                <SelectItem value="معتمد" className="text-xs font-semibold text-emerald-600">معتمد</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-xs font-semibold">
                              {report.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 pointer-coarse:min-h-10 pointer-coarse:min-w-10 text-slate-700 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/50 mx-auto">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-right text-xs">
                              {(report.typeKey === "follow-up" || report.status === "معتمد") && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/project-reports/${report.id}/pdf?type=${report.typeKey}`} className="gap-2 cursor-pointer flex items-center w-full font-bold text-teal-700">
                                    <Printer className="w-4 h-4 text-teal-600" />
                                    <span>معاينة وطباعة التقرير (PDF)</span>
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {report.status === "مسودة" && (canCreateReports || canEditOrApprove) && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/project-reports/${report.typeKey}?editId=${report.id}`} className="gap-2 cursor-pointer flex items-center w-full font-semibold text-amber-700 dark:text-amber-400">
                                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                                    <span>إكمال التقرير</span>
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
    );

  if (embedded) {
    return content;
  }

  return (
    <DashboardLayout tabletNavigation>
      {content}
    </DashboardLayout>
  );
}
