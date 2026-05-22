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
  Eye
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c'];

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
          <Card className="border-0 shadow-sm relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {kpiLoading ? "..." : kpiData?.summary?.totalRequests.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المساجد المخدومة</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {kpiLoading ? "..." : kpiData?.summary?.benefitedMosques.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التكاليف</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {kpiLoading ? "..." : (kpiData?.summary?.totalCost || 0).toLocaleString()} <span className="text-sm font-normal">ر.س</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">نسبة الإنجاز</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {kpiLoading ? "..." : (kpiData?.summary?.completionRate || 0)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>الطلبات حسب البرنامج</CardTitle>
              <CardDescription>توزيع الطلبات على البرامج المختلفة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                {!kpiLoading && programChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={programChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {programChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                    {kpiLoading ? <Loader2 className="w-8 h-8 animate-spin mb-2" /> : <BarChart3 className="w-12 h-12 mb-2" />}
                    <p>{kpiLoading ? "جاري التحميل..." : "لا توجد بيانات للعرض"}</p>
                  </div>
                )}
              </div>
              {!kpiLoading && programChartData.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4 max-h-32 overflow-y-auto pr-2 text-[10px] sm:text-xs">
                  {programChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate">{item.name}</span>
                      <span className="font-bold mr-auto">({item.value})</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>تطور الطلبات</CardTitle>
              <CardDescription>عدد الطلبات شهرياً خلال الفترة المختارة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                {!kpiLoading && trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Bar dataKey="الطلبات" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                    {kpiLoading ? <Loader2 className="w-8 h-8 animate-spin mb-2" /> : <BarChart3 className="w-12 h-12 mb-2" />}
                    <p>{kpiLoading ? "جاري التحميل..." : "لا توجد بيانات للعرض"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول البيانات التفصيلي */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>سجل الطلبات التفصيلي</CardTitle>
              <CardDescription>عرض تفاصيل الطلبات بناءً على الفلاتر المختارة</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">رقم الطلب</TableHead>
                    <TableHead>المسجد</TableHead>
                    <TableHead>البرنامج</TableHead>
                    <TableHead>المرحلة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
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
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.requestNumber}</TableCell>
                        <TableCell>{request.mosqueName || "بنيان (عام)"}</TableCell>
                        <TableCell>{PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS]}</TableCell>
                        <TableCell>{STAGE_LABELS[request.currentStage as keyof typeof STAGE_LABELS]}</TableCell>
                        <TableCell>
                          <Badge variant={request.status === "completed" ? "default" : request.status === "rejected" ? "destructive" : "secondary"} className={request.status === "completed" ? "bg-green-600" : ""}>
                            {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell className="text-left">
                          <Link href={`/requests/${request.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        لا توجد طلبات تطابق معايير البحث
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!requestsLoading && requestsData && requestsData.total > 10 && (
              <div className="flex items-center justify-end space-x-2 space-x-reverse py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  السابق
                </Button>
                <div className="text-sm font-medium">
                  صفحة {page} من {Math.ceil(requestsData.total / 10)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(requestsData.total / 10)}
                >
                  التالي
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
