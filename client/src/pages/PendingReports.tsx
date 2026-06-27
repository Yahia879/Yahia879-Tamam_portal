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
  MoreVertical
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
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const isAdmin = user && ["super_admin", "system_admin"].includes(user.role);

  const { data: reportsData, isLoading, error } = trpc.requests.getPendingReports.useQuery(undefined, {
    enabled: !!isAdmin,
    refetchOnWindowFocus: true,
  });

  if (!isAdmin) {
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

  // تجميع وتنسيق البيانات في مصفوفة موحدة
  const allReportsList: any[] = [];
  
  if (reportsData) {
    reportsData.fieldVisits.forEach((r: any) => {
      allReportsList.push({
        ...r,
        reportType: "field_visit",
        dueDate: r.scheduledDate ? `${new Date(r.scheduledDate).toLocaleDateString("ar-SA")} ${r.scheduledTime || ""}` : "غير محدد",
        actionUrl: `/requests/${r.id}/field-inspection`,
      });
    });

    reportsData.quickResponses.forEach((r: any) => {
      allReportsList.push({
        ...r,
        reportType: "quick_response",
        dueDate: r.scheduledDate ? `${new Date(r.scheduledDate).toLocaleDateString("ar-SA")} ${r.scheduledTime || ""}` : "غير محدد",
        actionUrl: `/requests/${r.id}/quick-response`,
      });
    });

    reportsData.finalReports.forEach((r: any) => {
      allReportsList.push({
        ...r,
        reportType: "final_report",
        dueDate: r.scheduledDate ? `${new Date(r.scheduledDate).toLocaleDateString("ar-SA")} ${r.scheduledTime || ""}` : "غير محدد",
        actionUrl: `/final-report/new?requestId=${r.id}`,
      });
    });
  }

  // فلترة القائمة بناءً على البحث والخيارات المحددة
  const filteredReportsList = allReportsList.filter((item) => {
    const matchesSearch = 
      item.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.mosqueName.toLowerCase().includes(search.toLowerCase()) ||
      (item.assignedTo?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || item.reportType === typeFilter;
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "late" && !item.isCompleted && item.isLate) || 
      (statusFilter === "pending" && !item.isCompleted && !item.isLate) ||
      (statusFilter === "completed" && item.isCompleted);

    return matchesSearch && matchesType && matchesStatus;
  });

  // حساب الإحصائيات
  const fieldVisitsCount = allReportsList.filter(r => r.reportType === "field_visit" && !r.isCompleted).length;
  const quickResponsesCount = allReportsList.filter(r => r.reportType === "quick_response" && !r.isCompleted).length;
  const finalReportsCount = allReportsList.filter(r => r.reportType === "final_report" && !r.isCompleted).length;
  const pendingCount = allReportsList.filter(r => !r.isCompleted).length;
  const totalCount = allReportsList.length;
  const lateCount = allReportsList.filter(r => !r.isCompleted && r.isLate).length;

  return (
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
                  <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{pendingCount}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{fieldVisitsCount}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{quickResponsesCount}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{finalReportsCount}</p>
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
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{lateCount}</p>
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            ) : filteredReportsList.length > 0 ? (
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
                      {filteredReportsList.map((item: any) => (
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
                                <Link href={`/requests/${item.id}`}>
                                  <a className="font-bold text-primary hover:underline text-sm block">
                                    {item.requestNumber}
                                  </a>
                                </Link>
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
                                <Link href={`/requests/${item.id}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <Eye className="w-4 h-4 ml-2" />
                                    عرض الطلب
                                  </DropdownMenuItem>
                                </Link>
                                {item.isCompleted ? (
                                  item.reportType === "final_report" ? (
                                    <Link href={`/final-report/${item.reportId}`}>
                                      <DropdownMenuItem className="cursor-pointer">
                                        <FileText className="w-4 h-4 ml-2" />
                                        عرض التقرير الختامي
                                      </DropdownMenuItem>
                                    </Link>
                                  ) : (
                                    <Link href={`/requests/${item.id}`}>
                                      <DropdownMenuItem className="cursor-pointer">
                                        <FileText className="w-4 h-4 ml-2" />
                                        عرض تفاصيل التقرير
                                      </DropdownMenuItem>
                                    </Link>
                                  )
                                ) : item.isLate ? (
                                  <Link href={item.actionUrl}>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <FileText className="w-4 h-4 ml-2" />
                                      التدخل ورفع التقرير
                                    </DropdownMenuItem>
                                  </Link>
                                ) : (
                                  <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed text-muted-foreground">
                                    <FileText className="w-4 h-4 ml-2" />
                                    التدخل غير متاح
                                  </DropdownMenuItem>
                                )}
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
                  {filteredReportsList.map((item: any) => (
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
                            <Link href={`/requests/${item.id}`}>
                              <a className="font-bold text-primary text-sm hover:underline">{item.requestNumber}</a>
                            </Link>
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
                            <Link href={`/requests/${item.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Eye className="w-4 h-4 ml-2" />
                                عرض الطلب
                              </DropdownMenuItem>
                            </Link>
                            {item.isCompleted ? (
                              item.reportType === "final_report" ? (
                                <Link href={`/final-report/${item.reportId}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <FileText className="w-4 h-4 ml-2" />
                                    عرض التقرير الختامي
                                  </DropdownMenuItem>
                                </Link>
                              ) : (
                                <Link href={`/requests/${item.id}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <FileText className="w-4 h-4 ml-2" />
                                    عرض تفاصيل التقرير
                                  </DropdownMenuItem>
                                </Link>
                              )
                            ) : item.isLate ? (
                              <Link href={item.actionUrl}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <FileText className="w-4 h-4 ml-2" />
                                  التدخل ورفع التقرير
                                </DropdownMenuItem>
                              </Link>
                            ) : (
                              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed text-muted-foreground">
                                <FileText className="w-4 h-4 ml-2" />
                                التدخل غير متاح
                              </DropdownMenuItem>
                            )}
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
