import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
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
  FileCheck
} from "lucide-react";

export default function ProjectReportsHubPage() {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();

  const realProjects = useMemo(() => {
    return dbProjectsData || [];
  }, [dbProjectsData]);

  const recentReports = useMemo(() => [
    {
      id: "REP-001",
      title: "تقرير نصف شهري - النصف الأول من يوليو",
      type: "تقرير نصف شهري",
      typeKey: "semi-monthly",
      project: realProjects[0]?.name || "مشروع إنشاء وتجهيز جامع الإيمان الذهبي",
      date: "2026-07-15",
      rag: "أخضر",
      status: "تم الاطلاع",
    },
    {
      id: "REP-002",
      title: "التقرير الشهري لشهر يونيو 2026",
      type: "تقرير شهري",
      typeKey: "monthly",
      project: realProjects[1]?.name || "مشروع صيانة وتأهيل أنظمة التكييف - مسجد الصفا",
      date: "2026-06-30",
      rag: "أحمر",
      status: "معتمد",
    },
    {
      id: "REP-003",
      title: "التقرير الربعي - Q2 2026",
      type: "تقرير ربعي",
      typeKey: "quarterly",
      project: realProjects[2]?.name || "مشروع تركيب منظومة الطاقة الشمسية الذكية",
      date: "2026-06-30",
      rag: "أخضر",
      status: "معتمد",
    },
    {
      id: "REP-004",
      title: "تقرير زيارة تفقدية للموقع",
      type: "تقرير زيارة",
      typeKey: "visit",
      project: "مشروع سدنة السقاية والتأهيل المعماري لجامع الفتح",
      date: "2026-07-12",
      rag: "أصفر",
      status: "تم الاطلاع",
    },
  ], [realProjects]);

  const filteredReports = filterType === "all"
    ? recentReports
    : recentReports.filter((r) => r.typeKey === filterType);

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 px-4 space-y-8">
        {/* Banner */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <BarChart3 className="w-6 h-6" />
                </span>
                <h1 className="text-2xl font-black text-foreground tracking-tight">مركز تقارير المشاريع</h1>
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30 text-xs font-bold">
                  4 نماذج قياسية
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mr-12 leading-relaxed">
                إدارة وإنشاء وتقييم جميع نماذج التقارير الدورية والميدانية للمشاريع (نصف شهرية، شهرية، ربعية، وزيارات ميدانية).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/projects">
                <Button variant="outline" size="sm" className="gap-2 h-10 text-xs font-medium">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  قائمة المشاريع
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Models Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">نماذج التقارير المعتمدة</h2>
              <p className="text-xs text-muted-foreground">اختر التقرير المطلوب لتعبئة البيانات وإنشائه فوراً</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Model 1: Semi-Monthly */}
            <Link href="/project-reports/semi-monthly">
              <div className="group bg-card hover:bg-accent/40 border border-border/80 hover:border-teal-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                      <Clock className="w-5 h-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">دورية كل أسبوعين</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                      تقرير نصف شهري
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      متابعة تشغيلية مركزة على التقدم والانحرافات التشغيلية.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-teal-600 font-bold">
                  <span>تعبئة النموذج (20 حقل)</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Model 2: Monthly */}
            <Link href="/project-reports/monthly">
              <div className="group bg-card hover:bg-accent/40 border border-border/80 hover:border-teal-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 group-hover:scale-105 transition-transform">
                      <Calendar className="w-5 h-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">دورية شهرية</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                      تقرير شهري
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      تقرير تنفيذي بالمؤشرات الخمسة والقيمة والأثر الميداني.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-teal-600 font-bold">
                  <span>تعبئة النموذج (23 حقل)</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Model 3: Quarterly */}
            <Link href="/project-reports/quarterly">
              <div className="group bg-card hover:bg-accent/40 border border-border/80 hover:border-teal-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                      <BarChart3 className="w-5 h-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">كل 3 أشهر</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                      تقرير ربعي
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      تقرير قيادي استراتيجي بالقيمة والأثر والاتجاه الاستراتيجي.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-teal-600 font-bold">
                  <span>تعبئة النموذج (25 حقل)</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Model 4: Visit */}
            <Link href="/project-reports/visit">
              <div className="group bg-card hover:bg-accent/40 border border-border/80 hover:border-teal-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                      <MapPin className="w-5 h-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">تقرير خفيف</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                      تقرير زيارة
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      ملاحظات وتاريخ ميداني يُرفع للإدارة للاطلاع أو القرار.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-teal-600 font-bold">
                  <span>تعبئة النموذج (8 حقول)</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Reports List */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {report.status}
                      </Badge>
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
