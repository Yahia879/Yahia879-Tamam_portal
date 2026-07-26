import { useState, useMemo, useEffect } from "react";
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
  FileText, 
  Clock, 
  Calendar, 
  BarChart3, 
  MapPin, 
  Plus, 
  ArrowLeft,
  Search,
  Printer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  FileCheck,
  RefreshCw
} from "lucide-react";

export default function ProjectReportsHubPage() {
  const [filterType, setFilterType] = useState<string>("all");

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
      let typeKey = "semi-monthly";
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
    let statusEnum: "draft" | "submitted" | "reviewed" | "approved" = "draft";
    if (newStatus === "تم الاطلاع") {
      statusEnum = "submitted";
    } else if (newStatus === "معتمد") {
      statusEnum = "approved";
    }
    updateStatusMutation.mutate({ id, status: statusEnum });
  };

  const filteredReports = useMemo(() => {
    return filterType === "all"
      ? reports
      : reports.filter((r) => r.typeKey === filterType);
  }, [reports, filterType]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
        {/* Title Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز تقارير المشاريع</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">إنشاء ومتابعة التقارير الدورية والزيارات الميدانية للمشاريع</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/project-reports/new">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-10 px-4 font-bold shadow-sm">
                <Plus className="w-4 h-4" />
                تقرير جديد
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Pure Statistics Cards Grid (Non-clickable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Semi-Monthly */}
          <Card className="border border-border/80 shadow-2xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">تقارير نصف شهرية</p>
                <p className="text-2xl font-extrabold text-foreground">{stats.semiMonthly}</p>
                <span className="text-[11px] text-amber-600 font-semibold block">إجمالي المسجلة</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Monthly */}
          <Card className="border border-border/80 shadow-2xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">تقارير شهرية</p>
                <p className="text-2xl font-extrabold text-foreground">{stats.monthly}</p>
                <span className="text-[11px] text-teal-600 font-semibold block">إجمالي المسجلة</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Quarterly */}
          <Card className="border border-border/80 shadow-2xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">تقارير ربعية</p>
                <p className="text-2xl font-extrabold text-foreground">{stats.quarterly}</p>
                <span className="text-[11px] text-blue-600 font-semibold block">إجمالي المسجلة</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Visit */}
          <Card className="border border-border/80 shadow-2xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">تقارير زيارات ميدانية</p>
                <p className="text-2xl font-extrabold text-foreground">{stats.visit}</p>
                <span className="text-[11px] text-purple-600 font-semibold block">إجمالي المسجلة</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">التقارير السابقة المرفوعة</CardTitle>
                <CardDescription className="text-xs mt-0.5">سجل تقارير المشاريع وحالاتها</CardDescription>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Button
                  variant={filterType === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="h-8 text-xs rounded-lg"
                >
                  الكل
                </Button>
                <Button
                  variant={filterType === "semi-monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("semi-monthly")}
                  className="h-8 text-xs rounded-lg"
                >
                  نصف شهري
                </Button>
                <Button
                  variant={filterType === "monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("monthly")}
                  className="h-8 text-xs rounded-lg"
                >
                  شهري
                </Button>
                <Button
                  variant={filterType === "quarterly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("quarterly")}
                  className="h-8 text-xs rounded-lg"
                >
                  ربعي
                </Button>
                <Button
                  variant={filterType === "visit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("visit")}
                  className="h-8 text-xs rounded-lg"
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
                      <Link href={`/project-reports/${report.typeKey}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-teal-600 gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          عرض/تعديل
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
