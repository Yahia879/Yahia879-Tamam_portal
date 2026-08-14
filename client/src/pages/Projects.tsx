import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPermissions } from "@/hooks/usePermission";
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
  DollarSign,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { Link, useLocation } from "wouter";
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

const typeFilterOptions = [
  { value: "all", label: "جميع أنواع المشاريع" },
  { value: "multi", label: "مشاريع متعددة المساجد" },
  { value: "single", label: "مشاريع مفردة (مسجد واحد)" },
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
  const [page, setPage] = useState(1);
  const limit = 20;

  const serverPermissions = useUserPermissions();
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const canViewDetails = isAdmin || serverPermissions.includes("projects.view_details");
  const canViewFinancials = serverPermissions.includes("projects.financials");
  const canAccessProjectPage = canViewDetails || canViewFinancials;
  const canCreateProject = isAdmin || ["projects_office", "financial", "financial_manager"].includes(user?.role || "") || serverPermissions.includes("projects.create") || serverPermissions.includes("projects");

  // جلب المشاريع من قاعدة البيانات
  const { data, isLoading } = trpc.projects.search.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    page,
    limit,
  });

  const projectsList = data?.projects || [];
  const total = data?.total || 0;
  const filteredStats = data?.stats;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المشاريع</h1>
            <p className="text-muted-foreground">متابعة وإدارة مشاريع المساجد</p>
          </div>
          {canCreateProject && (
            <Link href="/projects/new">
              <Button
                className="gradient-primary text-white font-bold gap-2 shadow-sm rounded-xl px-5 h-11 self-start sm:self-auto"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة مشروع لعدة مساجد</span>
              </Button>
            </Link>
          )}
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشاريع</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{filteredStats?.total || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{filteredStats?.inProgress || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {filteredStats?.completed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الميزانية</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {filteredStats?.totalBudget 
                      ? `${(parseFloat(filteredStats.totalBudget.toString()) / 1000).toFixed(0)}K` 
                      : "0"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فلاتر البحث */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم المشروع أو الاسم..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pr-10 h-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-[210px] h-10">
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
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-[200px] h-10">
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
          </CardContent>
        </Card>

        {/* جدول المشاريع */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : projectsList.length === 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">لا توجد مشاريع</h3>
                <p className="text-muted-foreground text-sm mt-1">لم يتم العثور على مشاريع تطابق معايير البحث</p>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">رقم المشروع</TableHead>
                        <TableHead className="text-right">المرحلة الحالية</TableHead>
                        <TableHead className="text-right">نسبة الإنجاز</TableHead>
                        <TableHead className="text-right">الميزانية</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                        {canAccessProjectPage && <TableHead className="w-[50px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsList.map((project: any) => (
                        <TableRow key={project.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {project.isMultiMosque ? (
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs shrink-0" title="مشروع مباشر لعدة مساجد">
                                  <MultiMosquesIcon className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <FolderKanban className="w-5 h-5 text-primary" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                                  {project.isMultiMosque && (
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 font-semibold">
                                      عدّة مساجد
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
                            <span className="text-sm font-mono">{project.projectNumber}</span>
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
                                <span className="font-medium whitespace-nowrap">{parseFloat(project.budget).toLocaleString()} ريال</span>
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
                                {new Date(project.createdAt).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                          </TableCell>
                          {canAccessProjectPage && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Link href={`/projects/${project.id}`}>
                                    <DropdownMenuItem>
                                      <Eye className="w-4 h-4 ml-2" />
                                      {canViewFinancials && !canViewDetails ? "عرض المالية" : "عرض التفاصيل"}
                                    </DropdownMenuItem>
                                  </Link>
                                  {canViewDetails && project.requestId && user?.role !== "project_manager" && (
                                    <Link href={`/requests/${project.requestId}`}>
                                      <DropdownMenuItem>
                                        <FileText className="w-4 h-4 ml-2" />
                                        عرض الطلب
                                      </DropdownMenuItem>
                                    </Link>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border">
                  {projectsList.map((project: any) => (
                    <div key={project.id} className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FolderKanban className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className="font-bold truncate">{project.name}</p>
                              {(!project.requestId || project.isMultiMosque) && (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1 font-semibold">
                                  عدّة مساجد
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-mono text-muted-foreground">{project.projectNumber}</p>
                          </div>
                        </div>
                        {canAccessProjectPage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/projects/${project.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 ml-2" />
                                  {canViewFinancials && !canViewDetails ? "عرض المالية" : "عرض التفاصيل"}
                                </DropdownMenuItem>
                              </Link>
                              {canViewDetails && project.requestId && user?.role !== "project_manager" && (
                                <Link href={`/requests/${project.requestId}`}>
                                  <DropdownMenuItem>
                                    <FileText className="w-4 h-4 ml-2" />
                                    عرض الطلب
                                  </DropdownMenuItem>
                                </Link>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border/50">
                        <div>
                          <span className="text-muted-foreground text-xs block">المرحلة:</span>
                          <Badge className={`${statusColors[project.status || "planning"]} text-xs font-normal`}>
                            {project.currentPhaseName || statusLabels[project.status || "planning"]}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">الميزانية:</span>
                          {(!project.requestId || (project.requestCurrentStage && BUDGET_VISIBLE_STAGES.includes(project.requestCurrentStage))) ? (
                            <span className="font-medium">{project.budget ? `${parseFloat(project.budget).toLocaleString()} ريال` : "-"}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">لم تُحدد بعد</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>نسبة الإنجاز</span>
                          <span>{project.completionPercentage || 0}%</span>
                        </div>
                        <Progress value={project.completionPercentage || 0} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {total > limit && (
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <div className="text-sm text-muted-foreground">
              عرض {(page - 1) * limit + 1} إلى {Math.min(page * limit, total)} من أصل {total} مشروع
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="gap-1"
              >
                السابق
              </Button>
              
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">{page}</span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="gap-1"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
