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

      let ragLabel = "أخضر";
      const variance = r.variance || 0;
      if (variance < -10) {
        ragLabel = "أحمر";
      } else if (variance < 0) {
        ragLabel = "أصفر";
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
            <Link href="/projects">
              <Button variant="outline" size="sm" className="gap-2 h-9 text-xs font-semibold border-border/80 shadow-xs">
                <Layers className="w-4 h-4 text-muted-foreground" />
                قائمة المشاريع
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Stats Cards Grid for Report Models */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Semi-Monthly */}
          <Link href="/project-reports/semi-monthly">
            <Card className="border-0 shadow-xs hover:shadow-md hover:bg-accent/40 cursor-pointer transition-all duration-200 group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">نموذج تقرير</p>
                  <p className="text-base font-bold text-foreground group-hover:text-teal-600 transition-colors">تقرير نصف شهري</p>
                  <span className="text-[10px] text-teal-600 font-semibold block">كل أسبوعين (20 حقل)</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 2: Monthly */}
          <Link href="/project-reports/monthly">
            <Card className="border-0 shadow-xs hover:shadow-md hover:bg-accent/40 cursor-pointer transition-all duration-200 group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">نموذج تقرير</p>
                  <p className="text-base font-bold text-foreground group-hover:text-teal-600 transition-colors">تقرير شهري</p>
                  <span className="text-[10px] text-teal-600 font-semibold block">دورية شهرية (23 حقل)</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 3: Quarterly */}
          <Link href="/project-reports/quarterly">
            <Card className="border-0 shadow-xs hover:shadow-md hover:bg-accent/40 cursor-pointer transition-all duration-200 group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">نموذج تقرير</p>
                  <p className="text-base font-bold text-foreground group-hover:text-teal-600 transition-colors">تقرير ربعي</p>
                  <span className="text-[10px] text-teal-600 font-semibold block">كل 3 أشهر (25 حقل)</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 4: Visit */}
          <Link href="/project-reports/visit">
            <Card className="border-0 shadow-xs hover:shadow-md hover:bg-accent/40 cursor-pointer transition-all duration-200 group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">نموذج تقرير</p>
                  <p className="text-base font-bold text-foreground group-hover:text-teal-600 transition-colors">تقرير زيارة</p>
                  <span className="text-[10px] text-teal-600 font-semibold block">زيارة ميدانية (8 حقول)</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
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
