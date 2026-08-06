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
  ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const serverPermissions = useUserPermissions();
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const canViewDetails = isAdmin || serverPermissions.includes("projects.view_details");
  // مَن لديه فقط صلاحية المالية (بدون تفاصيل المشروع) يمكنه الدخول على صفحة المشروع لعرض قسم المالية فقط
  const canViewFinancials = serverPermissions.includes("projects.financials");
  // يظهر عمود الإجراءات لأي شخص يملك صلاحية عرض التفاصيل أو مالية المشاريع
  const canAccessProjectPage = canViewDetails || canViewFinancials;

  // جلب المشاريع من قاعدة البيانات باستخدام الإجراء الجديد search
  const { data, isLoading } = trpc.projects.search.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم المشروع أو الاسم..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* جدول المشاريع - Desktop & Card View - Mobile */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : projectsList.length > 0 ? (
              <div>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">رقم المشروع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التقدم</TableHead>
                        <TableHead className="text-right">الميزانية</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                        {canAccessProjectPage && <TableHead className="text-right">الإجراءات</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsList.map((project: any) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="w-5 h-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate max-w-[200px]">{project.name}</p>
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
                            {project.requestCurrentStage && BUDGET_VISIBLE_STAGES.includes(project.requestCurrentStage) ? (
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
                            <p className="font-bold truncate">{project.name}</p>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">الحالة</p>
                          <Badge className={`${statusColors[project.status || "planning"]} text-[10px] px-2 py-0`}>
                            {project.currentPhaseName || statusLabels[project.status || "planning"]}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">الميزانية</p>
                          {project.requestCurrentStage && BUDGET_VISIBLE_STAGES.includes(project.requestCurrentStage) ? (
                            <p className="text-sm font-semibold">
                              {project.budget ? `${parseFloat(project.budget).toLocaleString()} ريال` : "-"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">لم تُحدد بعد</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">التقدم</span>
                          <span className="font-medium">{project.completionPercentage || 0}%</span>
                        </div>
                        <Progress value={project.completionPercentage || 0} className="h-1.5" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(project.createdAt).toLocaleDateString("ar-SA")}</span>
                        </div>
                        {project.managerName && (
                          <div className="truncate max-w-[150px]">
                            مدير: {project.managerName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    يعرض {(page - 1) * limit + 1} - {Math.min(page * limit, total)} من أصل {total} مشروع
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalPages <= 7 ||
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 1 && p <= page + 1)
                        ) {
                          return (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              className={`h-8 w-8 text-xs ${page === p ? 'gradient-primary text-white border-0' : ''}`}
                              onClick={() => handlePageChange(p)}
                            >
                              {p}
                            </Button>
                          );
                        } else if (
                          (p === page - 2 && page > 3) ||
                          (p === page + 2 && page < totalPages - 2)
                        ) {
                          return <span key={p} className="px-1 text-muted-foreground">...</span>;
                        }
                        return null;
                      })}

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">لا توجد مشاريع</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== "all" 
                    ? "لا توجد نتائج تطابق معايير البحث" 
                    : "يتم إنشاء المشاريع تلقائياً عند اعتماد الطلبات"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
