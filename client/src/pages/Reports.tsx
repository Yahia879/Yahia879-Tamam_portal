import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  Download, 
  FileText, 
  Building2, 
  Users, 
  TrendingUp, 
  Loader2,
  AlertCircle,
  Eye,
  Coins,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { PROGRAM_LABELS, STATUS_LABELS, STAGE_LABELS } from "@shared/constants";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COLORS = [
  '#0f766e', // Teal 700
  '#4338ca', // Indigo 700
  '#6d28d9', // Violet 700
  '#be185d', // Pink 700
  '#b45309', // Amber 700
  '#047857', // Emerald 700
  '#0369a1', // Sky 700
  '#1d4ed8', // Blue 700
  '#a21caf', // Fuchsia 700
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs font-medium opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-semibold text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
          <span className="text-muted-foreground">عدد الطلبات:</span>
          <span className="font-bold text-foreground mr-auto">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border shadow-xl p-3 rounded-xl text-xs font-semibold text-foreground min-w-[150px] opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{data.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: payload[0].color }} />
          <span className="text-muted-foreground">عدد الطلبات:</span>
          <span className="font-black text-foreground mr-auto">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("year");
  const [page, setPage] = useState(1);

  // حساب التواريخ بناءً على الفترة الزمنية
  const dateRange = useMemo(() => {
    const now = new Date();
    const fromDate = new Date();
    
    if (timeRange === "week") {
      fromDate.setDate(now.getDate() - 7);
    } else if (timeRange === "month") {
      fromDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === "quarter") {
      fromDate.setMonth(now.getMonth() - 3);
    } else {
      fromDate.setFullYear(now.getFullYear() - 1);
    }
    
    return {
      fromDate: fromDate.toISOString(),
      toDate: now.toISOString()
    };
  }, [timeRange]);

  // استعلام مؤشرات الأداء
  const { data: kpiData, isLoading: kpiLoading, isError: kpiError, refetch: refetchKPI } = trpc.analytics.getKPIs.useQuery({
    programType: programFilter,
    status: statusFilter,
    ...dateRange
  });

  // استعلام قائمة الطلبات (للجدول)
  const { data: requestsData, isLoading: requestsLoading } = trpc.requests.search.useQuery({
    programType: programFilter !== "all" ? programFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    ...dateRange,
    page,
    limit: 10
  });

  const programChartData = useMemo(() => {
    if (!kpiData?.byProgram) return [];
    return kpiData.byProgram.map(item => ({
      name: PROGRAM_LABELS[item.programType as keyof typeof PROGRAM_LABELS] || item.programType,
      value: item.count
    }));
  }, [kpiData]);

  const programChartTotal = useMemo(() => {
    return programChartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [programChartData]);

  const trendChartData = useMemo(() => {
    if (!kpiData?.monthlyTrend) return [];
    return kpiData.monthlyTrend.map(item => ({
      name: item.month,
      الطلبات: item.count
    }));
  }, [kpiData]);

  const handleExport = () => {
    toast.info("تصدير التقرير قيد التنفيذ...");
  };

  const isLoading = kpiLoading || requestsLoading;

  if (kpiError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button className="mt-4" onClick={() => refetchKPI()}>إعادة المحاولة</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">التقارير الإحصائية</h1>
            <p className="text-muted-foreground">عرض وتصدير بيانات الطلبات والمشاريع المباشرة</p>
          </div>
          <Button className="flex items-center gap-2" onClick={handleExport} disabled={isLoading}>
            <Download className="w-4 h-4" />
            تصدير البيانات
          </Button>
        </div>

        {/* فلاتر التقارير */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select value={programFilter} onValueChange={(v) => { setProgramFilter(v); setPage(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="البرنامج" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع البرامج</SelectItem>
                  {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">آخر 7 أيام</SelectItem>
                  <SelectItem value="month">آخر 30 يوم</SelectItem>
                  <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
                  <SelectItem value="year">آخر سنة</SelectItem>
                </SelectContent>
              </Select>

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse mr-auto">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">جاري التحديث...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* بطاقات الملخص */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-primary/10 shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-primary/5 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {kpiLoading ? "..." : kpiData?.summary?.totalRequests.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shadow-inner">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-500/10 shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-emerald-500/5 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">المساجد المخدومة</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {kpiLoading ? "..." : kpiData?.summary?.benefitedMosques.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shadow-inner">
                  <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-amber-500/10 shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-amber-500/5 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي التكاليف</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {kpiLoading ? "..." : (kpiData?.summary?.totalCost || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ر.س</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shadow-inner">
                  <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-violet-500/10 shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-violet-500/5 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">نسبة الإنجاز</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {kpiLoading ? "..." : (kpiData?.summary?.completionRate || 0)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center shadow-inner">
                  <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/60 shadow-sm bg-gradient-to-b from-card to-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">الطلبات حسب البرنامج</CardTitle>
              <CardDescription>توزيع الطلبات على البرامج المختلفة ونسبتها المئوية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full relative">
                {!kpiLoading && programChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={programChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {programChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-muted/20 rounded-xl text-muted-foreground border border-dashed border-border/80">
                    {kpiLoading ? <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" /> : <BarChart3 className="w-12 h-12 mb-2 text-muted-foreground/60" />}
                    <p className="text-sm font-medium">{kpiLoading ? "جاري التحميل..." : "لا توجد بيانات للعرض"}</p>
                  </div>
                )}
                {/* Total counter in the center of the doughnut */}
                {!kpiLoading && programChartTotal > 0 && (
                  <div className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[55%] text-center pointer-events-none">
                    <p className="text-2xl font-black text-foreground">{programChartTotal}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">إجمالي الطلبات</p>
                  </div>
                )}
              </div>
              {!kpiLoading && programChartData.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4 max-h-32 overflow-y-auto pr-2 text-[10px] sm:text-xs">
                  {programChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 hover:bg-muted/30 p-1.5 rounded-lg transition-colors duration-150">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate text-muted-foreground font-medium">{item.name}</span>
                      <span className="font-bold text-foreground mr-auto shrink-0">
                        {item.value} <span className="text-[10px] font-normal text-muted-foreground">({programChartTotal > 0 ? ((item.value / programChartTotal) * 100).toFixed(1) : 0}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm bg-gradient-to-b from-card to-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">تطور الطلبات</CardTitle>
              <CardDescription>عدد الطلبات شهرياً وتوجهات التقديم خلال الفترة المختارة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                {!kpiLoading && trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="الطلبات" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-muted/20 rounded-xl text-muted-foreground border border-dashed border-border/80">
                    {kpiLoading ? <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" /> : <BarChart3 className="w-12 h-12 mb-2 text-muted-foreground/60" />}
                    <p className="text-sm font-medium">{kpiLoading ? "جاري التحميل..." : "لا توجد بيانات للعرض"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول البيانات التفصيلي */}
        <Card className="border border-border/60 shadow-sm bg-gradient-to-b from-card to-card/50">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">سجل الطلبات التفصيلي</CardTitle>
              <CardDescription>عرض تفاصيل الطلبات بناءً على الفلاتر المختارة</CardDescription>
            </div>
            {/* عرض الفلاتر النشطة بجانب العنوان لربط السياق */}
            <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                الفترة: {
                  timeRange === "week" ? "آخر 7 أيام" :
                  timeRange === "month" ? "آخر 30 يوم" :
                  timeRange === "quarter" ? "آخر 3 أشهر" : "آخر سنة"
                }
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                البرنامج: {programFilter === "all" ? "جميع البرامج" : PROGRAM_LABELS[programFilter as keyof typeof PROGRAM_LABELS] || programFilter}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
                الحالة: {statusFilter === "all" ? "جميع الحالات" : STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS] || statusFilter}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-inner">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold text-foreground py-3.5">رقم الطلب</TableHead>
                    <TableHead className="font-bold text-foreground py-3.5">المسجد</TableHead>
                    <TableHead className="font-bold text-foreground py-3.5">البرنامج</TableHead>
                    <TableHead className="font-bold text-foreground py-3.5">المرحلة</TableHead>
                    <TableHead className="font-bold text-foreground py-3.5">الحالة</TableHead>
                    <TableHead className="font-bold text-foreground py-3.5">تاريخ الطلب</TableHead>
                    <TableHead className="text-left font-bold text-foreground py-3.5">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : requestsData?.requests && requestsData.requests.length > 0 ? (
                    requestsData.requests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-muted/30 transition-colors duration-200">
                        <TableCell className="font-mono font-bold text-primary">{request.requestNumber}</TableCell>
                        <TableCell className="font-medium py-3.5">
                          <span className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                            {request.mosqueName || "بنيان (عام)"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS]}</TableCell>
                        <TableCell className="font-medium">
                          <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-semibold border border-border/40">
                            {STAGE_LABELS[request.currentStage as keyof typeof STAGE_LABELS]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              request.status === "completed" 
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold px-2.5 py-0.5 rounded-full" 
                                : request.status === "rejected" 
                                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 font-semibold px-2.5 py-0.5 rounded-full" 
                                : "bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800 font-semibold px-2.5 py-0.5 rounded-full"
                            }
                          >
                            {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-medium">{new Date(request.createdAt).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell className="text-left">
                          <Link href={`/requests/${request.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/15 hover:text-primary transition-all duration-200 rounded-full">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        لا توجد طلبات تطابق معايير البحث
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!requestsLoading && requestsData && requestsData.total > 10 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/60 mt-4 pt-4 gap-4">
                <div className="text-xs text-muted-foreground font-semibold">
                  يتم عرض {(page - 1) * 10 + 1} - {Math.min(page * 10, requestsData.total)} من أصل {requestsData.total} طلب
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 flex items-center gap-1.5 hover:bg-muted/80 transition-colors rounded-lg text-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    السابق
                  </Button>
                  <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                    صفحة {page} من {Math.ceil(requestsData.total / 10)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(requestsData.total / 10)}
                    className="h-8 flex items-center gap-1.5 hover:bg-muted/80 transition-colors rounded-lg text-xs"
                  >
                    التالي
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
