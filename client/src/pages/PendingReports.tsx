import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FolderKanban, 
  Search, 
  Eye,
  Calendar,
  FileText,
  Loader2,
  AlertTriangle,
  User,
  Clock,
  ShieldAlert,
  Building2,
  Zap,
  Phone,
  Mail,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { ColoredDialog } from "@/components/ColoredDialog";

const typeLabels: Record<string, string> = {
  field_visit: "زيارة ميدانية",
  quick_response: "استجابة سريعة",
  final_report: "تقرير ختامي",
};

const typeColors: Record<string, string> = {
  field_visit: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900",
  quick_response: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900",
  final_report: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900",
};

export default function PendingReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  const userPermissions = (user as any)?.permissions ?? [];
  const isAdmin = user && ["super_admin", "system_admin"].includes(user.role);
  const hasViewPermission = isAdmin || userPermissions.includes("pending_reports.view");
  const hasIntervenePermission = isAdmin || userPermissions.includes("pending_reports.intervene");
  const hasRequestViewDetails = isAdmin || userPermissions.includes("requests.view_details");

  const [selectedRequestIdForView, setSelectedRequestIdForView] = useState<number | null>(null);
  const [selectedReportTypeForView, setSelectedReportTypeForView] = useState<"field_visit" | "quick_response" | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const { data: singleRequestData, isLoading: singleRequestLoading } = trpc.requests.getById.useQuery(
    { id: selectedRequestIdForView ?? 0 },
    { enabled: !!selectedRequestIdForView }
  );

  const { data: reportsData, isLoading, error } = trpc.requests.getPendingReports.useQuery({
    search,
    typeFilter,
    statusFilter,
    page,
    limit,
  }, {
    enabled: !!hasViewPermission,
    refetchOnWindowFocus: true,
  });

  if (!hasViewPermission) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح بالدخول</h2>
          <p className="text-muted-foreground mb-4">هذه الصفحة مخصصة لمدير النظام فقط.</p>
          <Button onClick={() => setLocation("/dashboard")}>العودة للوحة التحكم</Button>
        </div>
      </DashboardLayout>
    );
  }

  const reportsList = reportsData?.reports ?? [];
  const total = reportsData?.total ?? 0;
  const stats = reportsData?.stats ?? {
    totalCount: 0,
    pendingCount: 0,
    fieldVisitsCount: 0,
    quickResponsesCount: 0,
    finalReportsCount: 0,
    lateCount: 0,
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6" dir="rtl">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">تقارير الطلبات</h1>
            <p className="text-muted-foreground">متابعة وإدارة المهام والزيارات الميدانية المتأخرة والتقارير المعلقة والتقارير المكتملة</p>
          </div>
        </div>

        {/* بطاقات الإحصائيات الستة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* كارد جميع التقارير */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">جميع التقارير</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.totalCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* كارد التقارير المعلقة */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">التقارير المعلقة</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.pendingCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* كارد الزيارات الميدانية */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">الزيارات الميدانية المعلقة</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.fieldVisitsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* كارد الاستجابة السريعة */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">الاستجابة السريعة المعلقة</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.quickResponsesCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* كارد التقارير الختامية */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">التقارير الختامية المعلقة</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.finalReportsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* كارد التقارير المتأخرة */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">التقارير المتأخرة</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.lateCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فلاتر البحث */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب، المسجد أو الموظف..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pr-10"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="نوع التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="field_visit">زيارة ميدانية</SelectItem>
                    <SelectItem value="quick_response">استجابة سريعة</SelectItem>
                    <SelectItem value="final_report">تقرير ختامي</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="الحالة الزمنية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="late">متأخر فقط</SelectItem>
                    <SelectItem value="pending">بانتظار الرفع</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول المهام المعلقة - Desktop & Card View - Mobile */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p>فشل تحميل البيانات المعلقة: {error.message}</p>
              </div>
            ) : reportsList.length > 0 ? (
              <div>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الطلب والمسجد</TableHead>
                        <TableHead className="text-right">نوع التقرير</TableHead>
                        <TableHead className="text-right">المسؤول عن الرفع</TableHead>
                        <TableHead className="text-right">الموعد / تاريخ الاستحقاق</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-left pl-6">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportsList.map((item: any) => (
                        <TableRow key={`${item.reportType}-${item.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                {item.reportType === "quick_response" ? (
                                  <Zap className="w-5 h-5 text-purple-600" />
                                ) : item.reportType === "field_visit" ? (
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-emerald-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm block">
                                  {item.requestNumber}
                                </span>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
                                  {item.mosqueName} ({item.mosqueCity})
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${typeColors[item.reportType]} border-0 whitespace-nowrap`}>
                              {typeLabels[item.reportType]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.assignedTo ? (
                              <div>
                                <p className="font-medium text-sm">{item.assignedTo.name}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                  {item.assignedTo.phone && (
                                    <span className="flex items-center gap-0.5">
                                      <Phone className="w-2.5 h-2.5" /> {item.assignedTo.phone}
                                    </span>
                                  )}
                                  {item.assignedTo.email && (
                                    <span className="flex items-center gap-0.5 max-w-[150px] truncate" title={item.assignedTo.email}>
                                      <Mail className="w-2.5 h-2.5" /> {item.assignedTo.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-red-500 text-xs font-bold">غير مسند</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">{item.dueDate}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              item.isCompleted 
                                ? "bg-emerald-100 text-emerald-800 border-0" 
                                : item.isLate 
                                  ? "bg-red-100 text-red-800 border-0" 
                                  : "bg-yellow-100 text-yellow-800 border-0"
                            }>
                              {item.isCompleted ? "مكتمل" : item.isLate ? "متأخر" : "بانتظار الرفع"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left pl-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {item.isCompleted && (
                                  item.reportType === "final_report" ? (
                                    <Link href={`/final-report/${item.reportId}`}>
                                      <DropdownMenuItem className="cursor-pointer">
                                        <FileText className="w-4 h-4 ml-2" />
                                        عرض التقرير
                                      </DropdownMenuItem>
                                    </Link>
                                  ) : (
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setSelectedRequestIdForView(item.id);
                                        setSelectedReportTypeForView(item.reportType);
                                        setReportDialogOpen(true);
                                      }}
                                    >
                                      <FileText className="w-4 h-4 ml-2" />
                                      عرض التقرير
                                    </DropdownMenuItem>
                                  )
                                )}
                                {!item.isCompleted && item.isLate ? (
                                  hasIntervenePermission ? (
                                    <Link href={item.actionUrl}>
                                      <DropdownMenuItem className="cursor-pointer">
                                        <FileText className="w-4 h-4 ml-2" />
                                        التدخل ورفع التقرير
                                      </DropdownMenuItem>
                                    </Link>
                                  ) : (
                                    <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed text-muted-foreground">
                                      <FileText className="w-4 h-4 ml-2" />
                                      غير مصرح بالتدخل
                                    </DropdownMenuItem>
                                  )
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border">
                  {reportsList.map((item: any) => (
                    <div key={`${item.reportType}-${item.id}`} className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {item.reportType === "quick_response" ? (
                              <Zap className="w-5 h-5 text-purple-600" />
                            ) : item.reportType === "field_visit" ? (
                              <Building2 className="w-5 h-5 text-blue-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm block">{item.requestNumber}</span>
                            <p className="text-xs text-muted-foreground truncate">{item.mosqueName}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {item.isCompleted && (
                              item.reportType === "final_report" ? (
                                <Link href={`/final-report/${item.reportId}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <FileText className="w-4 h-4 ml-2" />
                                    عرض التقرير
                                  </DropdownMenuItem>
                                </Link>
                              ) : (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedRequestIdForView(item.id);
                                    setSelectedReportTypeForView(item.reportType);
                                    setReportDialogOpen(true);
                                  }}
                                >
                                  <FileText className="w-4 h-4 ml-2" />
                                  عرض التقرير
                                </DropdownMenuItem>
                              )
                            )}
                            {!item.isCompleted && item.isLate ? (
                              hasIntervenePermission ? (
                                <Link href={item.actionUrl}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <FileText className="w-4 h-4 ml-2" />
                                    التدخل ورفع التقرير
                                  </DropdownMenuItem>
                                </Link>
                              ) : (
                                <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed text-muted-foreground">
                                  <FileText className="w-4 h-4 ml-2" />
                                  غير مصرح بالتدخل
                                </DropdownMenuItem>
                              )
                            ) : !item.isCompleted ? (
                              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed text-muted-foreground">
                                <FileText className="w-4 h-4 ml-2" />
                                التدخل غير متاح
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">نوع التقرير</p>
                          <Badge className={`${typeColors[item.reportType]} border-0 whitespace-nowrap`}>
                            {typeLabels[item.reportType]}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">الحالة</p>
                          <Badge className={
                            item.isCompleted 
                              ? "bg-emerald-100 text-emerald-800 border-0" 
                              : item.isLate 
                                ? "bg-red-100 text-red-800 border-0" 
                                : "bg-yellow-100 text-yellow-800 border-0"
                          }>
                            {item.isCompleted ? "مكتمل" : item.isLate ? "متأخر" : "بانتظار الرفع"}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground mb-1">تاريخ الاستحقاق / الموعد</p>
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{item.dueDate}</span>
                          </div>
                        </div>
                        {item.assignedTo && (
                          <div className="col-span-2 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                            <p className="text-muted-foreground mb-1 flex items-center gap-1">
                              <User className="w-3 h-3" /> المسؤول عن الرفع:
                            </p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{item.assignedTo.name}</p>
                            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-1 font-medium">
                              {item.assignedTo.phone && <span>هاتف: {item.assignedTo.phone}</span>}
                              {item.assignedTo.email && <span className="truncate max-w-[180px]">إيميل: {item.assignedTo.email}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with Pagination */}
                <div className="px-4 py-4 bg-muted/20 border-t flex flex-col items-center justify-center gap-4">
                  <div className="text-[11px] md:text-xs text-muted-foreground text-center">
                    {`يعرض ${total > 0 ? (page - 1) * limit + 1 : 0} - ${Math.min(page * limit, total)} من أصل ${total} تقرير`}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalPages <= 5 ||
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 1 && p <= page + 1)
                        ) {
                          return (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              className={`h-8 min-w-[32px] px-2 text-[11px] shrink-0 ${page === p ? 'gradient-primary text-white border-0' : ''}`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          );
                        } else if (
                          (p === page - 2 && page > 3) ||
                          (p === page + 2 && page < totalPages - 2)
                        ) {
                          return <span key={p} className="px-0.5 text-muted-foreground">...</span>;
                        }
                        return null;
                      })}

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-600 dark:text-emerald-400 mb-4 animate-pulse">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">لا توجد تقارير معلقة</h3>
                <p className="text-muted-foreground text-sm max-w-md">تم رفع جميع التقارير المطلوبة بنجاح للخيارات والبحث الحالي.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>

    {/* Dialog لعرض التقرير الميداني أو الاستجابة السريعة */}
    <ColoredDialog
      open={reportDialogOpen}
      onOpenChange={(val) => {
        setReportDialogOpen(val);
        if (!val) {
          setSelectedRequestIdForView(null);
          setSelectedReportTypeForView(null);
        }
      }}
      title={selectedReportTypeForView === "field_visit" ? "تقرير المعاينة الميدانية الرسمي" : "تقرير الاستجابة السريعة المعتمد"}
      color={selectedReportTypeForView === "field_visit" ? "indigo" : "purple"}
      icon={selectedReportTypeForView === "field_visit" ? <FileText className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
    >
      {singleRequestLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">جاري تحميل تفاصيل التقرير...</p>
        </div>
      ) : !singleRequestData ? (
        selectedRequestIdForView === null ? null : (
          <div className="p-6 text-center text-red-500 flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>فشل تحميل تفاصيل التقرير أو غير مصرح بعرضه.</p>
          </div>
        )
      ) : selectedReportTypeForView === "field_visit" ? (
        <div className="space-y-6 text-right" dir="rtl">
          {(!singleRequestData.fieldReports || singleRequestData.fieldReports.length === 0) ? (
            <p className="text-center text-muted-foreground py-6">لا توجد تقارير معاينة ميدانية مسجلة لهذا الطلب.</p>
          ) : (
            singleRequestData.fieldReports.map((report: any) => {
              const conditionLabels: Record<string, string> = {
                excellent: "ممتاز",
                good: "جيد",
                fair: "مقبول",
                poor: "سيء",
                critical: "حرج / إنشائي"
              };
              const conditionColors: Record<string, string> = {
                excellent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
                good: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
                fair: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900",
                poor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
                critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
              };

              const menLength = parseFloat(report.menPrayerLength || "0");
              const menWidth = parseFloat(report.menPrayerWidth || "0");
              const menArea = menLength * menWidth;

              const womenLength = parseFloat(report.womenPrayerLength || "0");
              const womenWidth = parseFloat(report.womenPrayerWidth || "0");
              const womenArea = womenLength * womenWidth;

              const teamMembers = [
                report.teamMember1,
                report.teamMember2,
                report.teamMember3,
                report.teamMember4,
                report.teamMember5
              ].filter(Boolean);

              const ratingLabels: Record<number, string> = {
                1: "غير صحيحة تماماً (البيانات مخالفة للواقع كلياً)",
                2: "غير صحيحة غالباً (هناك اختلافات جوهرية كثيرة)",
                3: "مقبولة / صحيحة جزئياً (تتطابق في بعض الجوانب دون أخرى)",
                4: "صحيحة ودقيقة غالباً (تطابق شبه كامل مع اختلافات طفيفة)",
                5: "صحيحة ودقيقة بالكامل (مطابقة تامة وموثوقة 100%)"
              };

              return (
                <div key={report.id} className="space-y-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-base sm:text-lg">تفاصيل التقرير الميداني</h4>
                      <p className="text-xs text-slate-500">تمت الزيارة في: {report.visitDate ? new Date(report.visitDate).toLocaleDateString('ar-SA') : "غير محدد"}</p>
                    </div>
                    {report.conditionRating && (
                      <div className={`px-3 py-1 rounded-full border text-xs font-bold ${conditionColors[report.conditionRating] || ''}`}>
                        الحالة: {conditionLabels[report.conditionRating] || report.conditionRating}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {menArea > 0 && (
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">أبعاد مصلى الرجال</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                            {menArea.toLocaleString('ar-SA')} م²
                          </span>
                          <span className="text-xs text-slate-500">
                            ({menLength.toLocaleString('ar-SA')}م × {menWidth.toLocaleString('ar-SA')}م)
                          </span>
                        </div>
                        {report.menPrayerHeight && (
                          <p className="text-xs text-slate-500 mt-1">الارتفاع: {parseFloat(report.menPrayerHeight).toLocaleString('ar-SA')}م</p>
                        )}
                      </div>
                    )}

                    {report.womenPrayerExists && (
                      womenArea > 0 ? (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">أبعاد مصلى النساء</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                              {womenArea.toLocaleString('ar-SA')} م²
                            </span>
                            <span className="text-xs text-slate-500">
                              ({womenLength.toLocaleString('ar-SA')}م × {womenWidth.toLocaleString('ar-SA')}م)
                            </span>
                          </div>
                          {report.womenPrayerHeight && (
                            <p className="text-xs text-slate-500 mt-1">الارتفاع: {parseFloat(report.womenPrayerHeight).toLocaleString('ar-SA')}م</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 flex items-center">
                          <div>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">مصلى النساء</span>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">موجود (لم تحدد الأبعاد)</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="space-y-4">
                    {report.generalDescription && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">التوصيف العام للحالة الميدانية</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.generalDescription}
                        </p>
                      </div>
                    )}

                    {report.requiredNeeds && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">الاحتياجات والمتطلبات المقترحة</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.requiredNeeds}
                        </p>
                      </div>
                    )}

                    {teamMembers.length > 0 && (
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">فريق المعاينة الميدانية:</span>
                        <div className="flex flex-wrap gap-2">
                          {teamMembers.map((member: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-white/85 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {member}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.beneficiaryInfoAccuracyRating && (
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">تقييم دقة بيانات مقدم الطلب:</span>
                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                          {report.beneficiaryInfoAccuracyRating} / 5 - {ratingLabels[report.beneficiaryInfoAccuracyRating] || ""}
                        </p>
                        {report.beneficiaryInfoAccuracyNotes && (
                          <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap font-medium">ملاحظات الدقة: {report.beneficiaryInfoAccuracyNotes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : selectedReportTypeForView === "quick_response" ? (
        <div className="space-y-6 text-right" dir="rtl">
          {(!singleRequestData.quickReports || singleRequestData.quickReports.length === 0) ? (
            <p className="text-center text-muted-foreground py-6">لا توجد تقارير استجابة سريعة مسجلة لهذا الطلب.</p>
          ) : (
            singleRequestData.quickReports.map((report: any) => {
              const evaluationLabels: Record<string, string> = {
                excellent: "ممتاز",
                good: "جيد",
                acceptable: "مقبول",
                needs_improvement: "يحتاج تحسين",
                poor: "ضعيف"
              };
              const evaluationColors: Record<string, string> = {
                excellent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
                good: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
                acceptable: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
                needs_improvement: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
                poor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
              };

              return (
                <div key={report.id} className="space-y-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-purple-100 dark:border-purple-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-purple-950 dark:text-purple-100 text-base sm:text-lg">تفاصيل التقرير الفني</h4>
                      <p className="text-xs text-slate-500">تم تقديم التقرير في: {report.responseDate ? new Date(report.responseDate).toLocaleDateString('ar-SA') : "غير محدد"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.finalEvaluation && (
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold ${evaluationColors[report.finalEvaluation] || ''}`}>
                          التقييم: {evaluationLabels[report.finalEvaluation] || report.finalEvaluation}
                        </div>
                      )}
                      <div className={`px-3 py-1 rounded-full border text-xs font-bold ${report.resolved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {report.resolved ? 'تم حل المشكلة بالكامل' : 'قيد المتابعة'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">الفني المختص</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {report.technicianName || "غير محدد"}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">حالة المشروع المتكامل</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {report.projectStatus || "غير محدد"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {report.executedWorkDescription && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">وصف الأعمال المنفذة</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.executedWorkDescription}
                        </p>
                      </div>
                    )}

                    {report.recommendations && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">التوصيات والملاحظات الفنية</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.recommendations}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </ColoredDialog>
    </>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
