import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { projectAccess } from "@shared/projectPermissions";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FolderKanban, 
  Search, 
  MoreVertical,
  Eye,
  Calendar,
  FileText,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Link, useLocation } from "wouter";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { MultiMosquesIcon } from "@/components/MultiMosquesIcon";

const statusLabels: Record<string, string> = {
  planning: "إعداد جدول الكميات",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  on_hold: "متوقف",
  cancelled: "ملغي",
};

const filterOptions = [
  { value: "all", label: "جميع الحالات" },
  { value: "إعداد جدول الكميات", label: "إعداد جدول الكميات" },
  { value: "اعتماد عرض السعر المناسب", label: "اعتماد عرض السعر المناسب" },
  { value: "التعاقد", label: "التعاقد" },
  { value: "صرف المدفوعات", label: "صرف المدفوعات" },
  { value: "المراجعة والإغلاق", label: "المراجعة والإغلاق" },
  { value: "completed", label: "مكتمل" },
];

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

// المراحل التي تظهر فيها الميزانية (من التقييم المالي واعتماد العرض وما بعدها)
const BUDGET_VISIBLE_STAGES = [
  "financial_eval_and_approval",
  "contracting",
  "execution",
  "handover",
  "closed",
];

export default function Projects() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage, resetPage] = usePersistedPage("projects_table_page");
  const limit = 20;

  const { data: serverPermissions = [] } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, staleTime: 0, refetchInterval: 5000, refetchOnMount: true, refetchOnWindowFocus: true },
  );
  const access = projectAccess(serverPermissions);
  const canAccessProjectPage = access.canOpenProject;
  const canCreateProject = access.canCreate;

  // خيارات نوع المشروع
  const typeFilterOptions = useMemo(() => [
    { value: "all", label: "جميع أنواع المشاريع" },
    { value: "sedana", label: "مشاريع برنامج سدانة" },
    { value: "multi", label: "مشاريع متعددة المساجد" },
    { value: "single", label: "مشاريع مفردة (مسجد واحد)" },
  ], []);

  // جلب المشاريع من قاعدة البيانات
  const { data, isLoading } = trpc.projects.search.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    page,
    limit,
  }, { enabled: access.canView });

  const projectsList = data?.projects || [];
  const total = data?.total || 0;
  const filteredStats = data?.stats;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!access.canView) return <DashboardLayout tabletNavigation><div className="py-16 px-4 text-center text-sm sm:text-base text-muted-foreground" dir="rtl">غير مصرح لك بعرض المشاريع</div></DashboardLayout>;

  return (
    <DashboardLayout tabletNavigation>
      <div className="min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-6" dir="rtl">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">إدارة المشاريع</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">متابعة وإدارة مشاريع المساجد</p>
          </div>
          {canCreateProject && (
            <Link href="/projects/new" className="w-full sm:w-auto">
              <Button
                className="gradient-primary text-white font-bold gap-2 shadow-sm rounded-xl px-5 h-11 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span>إضافة مشروع متعدد المساجد</span>
              </Button>
            </Link>
          )}
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="py-0 gap-0 border-0 shadow-sm">
            <CardContent className="p-3.5 sm:p-5 lg:p-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المشاريع</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 font-mono">{filteredStats?.total || 0}</p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0 gap-0 border-0 shadow-sm">
            <CardContent className="p-3.5 sm:p-5 lg:p-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">قيد التنفيذ</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 font-mono">{filteredStats?.inProgress || 0}</p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0 gap-0 border-0 shadow-sm">
            <CardContent className="p-3.5 sm:p-5 lg:p-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">مكتملة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 font-mono">
                    {filteredStats?.completed || 0}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg bg-green-100 dark:bg-green-950/50 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0 gap-0 border-0 shadow-sm">
            <CardContent className="p-3.5 sm:p-5 lg:p-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الميزانية</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 font-mono">
                    {filteredStats?.totalBudget 
                      ? `${(parseFloat(filteredStats.totalBudget.toString()) / 1000).toFixed(0)}K` 
                      : "0"}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                  <SaudiRiyal className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فلاتر البحث */}
        <Card className="py-0 gap-0 border-0 shadow-sm">
          <CardContent className="p-3.5 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="البحث برقم المشروع أو الاسم..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPage();
                  }}
                  className="pr-10 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 max-md:text-base"
                />
              </div>
              <div className="min-w-0">
                <Select value={typeFilter} onValueChange={(v) => {
                  setTypeFilter(v);
                  resetPage();
                }}>
                  <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11">
                    <SelectValue placeholder="نوع المشروع" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {typeFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Select value={statusFilter} onValueChange={(v) => {
                  setStatusFilter(v);
                  resetPage();
                }}>
                  <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11">
                    <SelectValue placeholder="حالة المشروع" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {filterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول المشاريع */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : projectsList.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-foreground">لا توجد مشاريع</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">لم يتم العثور على مشاريع تطابق معايير البحث</p>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">رقم المشروع</TableHead>
                        <TableHead className="text-right">المرحلة الحالية</TableHead>
                        <TableHead className="text-right">نسبة الإنجاز</TableHead>
                        <TableHead className="text-right">الميزانية</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                        {canAccessProjectPage && <TableHead className="text-center">الإجراءات</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsList.map((project: any) => {
                        const isSedana = project.programType === "sedana";
                        return (
                        <TableRow 
                          key={project.id} 
                          className={cn(
                            "group transition-colors",
                            isSedana && "bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/35 border-r-4 border-r-blue-600"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {project.isMultiMosque ? (
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs shrink-0" title="مشروع مباشر لعدة مساجد">
                                  <MultiMosquesIcon className="w-5 h-5" />
                                </div>
                              ) : isSedana ? (
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-300 dark:border-blue-700 shadow-xs shrink-0" title="مشروع سدانة (تشغيل ورعاية المساجد)">
                                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <FolderKanban className="w-5 h-5 text-primary" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {canAccessProjectPage ? (
                                    <Link
                                      href={`/projects/${project.id}`}
                                      className="font-medium text-foreground hover:text-primary transition-colors hover:underline cursor-pointer"
                                    >
                                      {project.name}
                                    </Link>
                                  ) : (
                                    <p className="font-medium text-foreground">{project.name}</p>
                                  )}
                                  {project.isMultiMosque && (
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 font-semibold">
                                      عدّة مساجد
                                    </Badge>
                                  )}
                                  {isSedana && (
                                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 text-[10px] py-0 px-2 font-bold inline-flex items-center gap-1 shadow-2xs">
                                      <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                      برنامج سدانة
                                    </Badge>
                                  )}
                                </div>
                                {project.managerName && (
                                  <p className="text-xs text-muted-foreground truncate">مدير: {project.managerName}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-sans font-bold">{project.projectNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[project.status || "planning"]} whitespace-nowrap`}>
                              {project.currentPhaseName || statusLabels[project.status || "planning"]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={project.completionPercentage || 0} className="w-20 h-2" />
                              <span className="text-sm text-muted-foreground">{project.completionPercentage || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(!project.requestId || (project.requestCurrentStage && BUDGET_VISIBLE_STAGES.includes(project.requestCurrentStage))) ? (
                              project.budget ? (
                                <span className="font-medium whitespace-nowrap inline-flex items-center gap-1">
                                  {parseFloat(project.budget).toLocaleString("en-US")}
                                  <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">لم تُحدد بعد</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">
                                {new Date(project.createdAt).toLocaleDateString("en-CA")}
                              </span>
                            </div>
                          </TableCell>
                          {canAccessProjectPage && (
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="pointer-coarse:size-10">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Link href={`/projects/${project.id}`}>
                                    <DropdownMenuItem className="pointer-coarse:min-h-11">
                                      <Eye className="w-4 h-4 ml-2" />
                                      عرض تفاصيل المشروع
                                    </DropdownMenuItem>
                                  </Link>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile & iPad Portrait View Cards */}
                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 bg-muted/15">
                  {projectsList.map((project: any) => {
                    const isSedana = project.programType === "sedana";
                    return (
                    <div 
                      key={project.id} 
                      className={cn(
                        "rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3 transition-colors",
                        isSedana && "bg-blue-50/40 dark:bg-blue-950/20 border-r-4 border-r-blue-600"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                            {project.isMultiMosque ? (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs shrink-0">
                                <MultiMosquesIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                              </div>
                            ) : isSedana ? (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-300 dark:border-blue-700 shadow-xs shrink-0">
                                <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {canAccessProjectPage ? (
                                  <Link
                                    href={`/projects/${project.id}`}
                                    className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors hover:underline cursor-pointer leading-snug break-words"
                                  >
                                    {project.name}
                                  </Link>
                                ) : (
                                  <p className="font-bold text-sm sm:text-base leading-snug break-words">{project.name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground">{project.projectNumber}</span>
                                {(!project.requestId || project.isMultiMosque) && (
                                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 font-semibold">
                                    عدّة مساجد
                                  </Badge>
                                )}
                                {isSedana && (
                                  <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 text-[10px] py-0 px-1.5 font-bold inline-flex items-center gap-1 shadow-2xs">
                                    <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    برنامج سدانة
                                  </Badge>
                                )}
                              </div>
                              {project.managerName && (
                                <p className="text-[11px] text-muted-foreground truncate">مدير: {project.managerName}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm pt-2.5 border-t border-border/50">
                          <div className="min-w-0">
                            <span className="text-muted-foreground text-[11px] block mb-1">المرحلة:</span>
                            <Badge className={`${statusColors[project.status || "planning"]} text-[11px] font-medium max-w-full truncate`}>
                              {project.currentPhaseName || statusLabels[project.status || "planning"]}
                            </Badge>
                          </div>
                          <div className="min-w-0">
                            <span className="text-muted-foreground text-[11px] block mb-1">الميزانية:</span>
                            {(!project.requestId || (project.requestCurrentStage && BUDGET_VISIBLE_STAGES.includes(project.requestCurrentStage))) ? (
                              <span className="font-semibold text-xs sm:text-sm font-mono inline-flex items-center gap-1">
                                {project.budget ? (
                                  <>
                                    {parseFloat(project.budget).toLocaleString("en-US")}
                                    <SaudiRiyal className="w-3.5 h-3.5 inline shrink-0" />
                                  </>
                                ) : "-"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">لم تُحدد بعد</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>نسبة الإنجاز</span>
                            <span className="font-mono font-semibold text-foreground">{project.completionPercentage || 0}%</span>
                          </div>
                          <Progress value={project.completionPercentage || 0} className="h-2" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(project.createdAt).toLocaleDateString("en-CA")}</span>
                        </div>
                        {canAccessProjectPage && (
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="outline" size="sm" className="h-9 max-lg:min-h-10 px-3 text-xs font-semibold gap-1.5 rounded-xl">
                              <Eye className="w-3.5 h-3.5" />
                              <span>التفاصيل</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        <EnhancedPagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={total}
          itemsPerPage={limit}
          itemName="مشروع"
          itemNamePlural="مشاريع"
          className="rounded-xl border border-border/50 shadow-xs max-sm:px-2 max-sm:[&_button]:px-2 pointer-coarse:[&_button]:min-h-11"
        />
      </div>
    </DashboardLayout>
  );
}
