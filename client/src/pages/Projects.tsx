import { useState } from "react";
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

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Projects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // جلب المشاريع من قاعدة البيانات باستخدام الإجراء الجديد search
  const { data, isLoading } = trpc.projects.search.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    page,
    limit,
  }, {
    keepPreviousData: true
  });

  const projectsList = data?.projects || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // جلب الإحصائيات (يمكن استخدام getAll القديم أو إحصائيات منفصلة)
  const { data: stats } = trpc.projects.getStats.useQuery();

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
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.total || 0}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.inProgress || 0}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.completed || 0}</p>
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
                    {stats?.totalBudget ? `${(parseFloat(stats.totalBudget.toString()) / 1000).toFixed(0)}K` : "0"}
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
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* جدول المشاريع */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : projectsList.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">رقم المشروع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التقدم</TableHead>
                        <TableHead className="text-right">الميزانية</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsList.map((project: any) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FolderKanban className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{project.name}</p>
                                {project.managerName && (
                                  <p className="text-xs text-muted-foreground">مدير: {project.managerName}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">{project.projectNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[project.status || "planning"]}>
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
                            {project.budget ? (
                              <span className="font-medium">{parseFloat(project.budget).toLocaleString()} ريال</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">
                                {new Date(project.createdAt).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                          </TableCell>
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
                                    عرض التفاصيل
                                  </DropdownMenuItem>
                                </Link>
                                {project.requestId && (
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
