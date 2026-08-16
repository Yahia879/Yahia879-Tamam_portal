import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import {
  Building2, CheckCircle2, Clock, Crown, Wallet, TrendingUp,
  FileText, Activity, RefreshCw, ShieldCheck,
  AlertCircle, Banknote, Receipt, MapPin, Layers,
  Check, CreditCard, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function BoardDashboard() {
  const [activeTab, setActiveTab] = useState("mosques");
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, isError, error, refetch, isRefetching } = trpc.board.getExecutiveStats.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم الاعتماد البنكي المباشر لأمر الصرف بنجاح");
      setApprovingId(null);
      refetch();
      utils.disbursements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الاعتماد البنكي");
      setApprovingId(null);
    },
  });

  const handleDirectApprove = (id: number) => {
    setApprovingId(id);
    approveOrderMutation.mutate({ id });
  };

  const isChairman = data?.isChairman ?? false;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + " ريال";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold">اللوحة القيادية لمجلس الإدارة</h1>
              {isChairman ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-600 ml-1" />
                  رئيس مجلس الإدارة
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 font-bold px-3 py-1 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-slate-600 ml-1" />
                  عضو مجلس الإدارة
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              متابعة شاملة لإحصائيات المساجد والطلبات والمؤشرات المالية والتشغيلية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
              className="text-xs sm:text-sm"
            >
              <RefreshCw className={`ml-2 h-4 w-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
              تحديث البيانات
            </Button>
          </div>
        </div>

        {/* ==================== قسم الاعتماد البنكي المباشر (رئيس مجلس الإدارة) ==================== */}
        {isChairman && data?.financials?.pendingOrders && data.financials.pendingOrders.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-200">
                    أوامر الصرف بانتظار الاعتماد البنكي المباشر
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    يمكنك إجراء الاعتماد البنكي المباشر فوراً بنقرة واحدة
                  </CardDescription>
                </div>
              </div>
              <Link href="/disbursement-orders">
                <Button variant="ghost" size="sm" className="text-amber-800 dark:text-amber-300 font-bold text-xs gap-1">
                  عرض كل الأوامر
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/40 overflow-hidden bg-white dark:bg-slate-900">
                <Table>
                  <TableHeader className="bg-amber-100/50 dark:bg-amber-950/30">
                    <TableRow>
                      <TableHead className="text-right font-bold text-xs">رقم الأمر</TableHead>
                      <TableHead className="text-right font-bold text-xs">المستفيد</TableHead>
                      <TableHead className="text-right font-bold text-xs">المصرف</TableHead>
                      <TableHead className="text-right font-bold text-xs">المبلغ</TableHead>
                      <TableHead className="text-right font-bold text-xs">طريقة الدفع</TableHead>
                      <TableHead className="text-center font-bold text-xs">الإجراء المباشر</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.financials.pendingOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20">
                        <TableCell className="font-bold text-xs">{order.orderNumber}</TableCell>
                        <TableCell className="text-xs">{order.beneficiaryName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{order.beneficiaryBank}</TableCell>
                        <TableCell className="font-extrabold text-xs text-amber-700 dark:text-amber-400">
                          {formatCurrency(order.amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="font-normal text-[11px]">
                            {order.paymentMethod === "bank_transfer" ? "تحويل بنكي" : "سداد"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleDirectApprove(order.id)}
                            disabled={approvingId === order.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3"
                          >
                            <Check className="ml-1 h-3.5 w-3.5" />
                            {approvingId === order.id ? "جاري الاعتماد..." : "اعتماد بنكي مباشر"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================== حالة التحميل والأخطاء ==================== */}
        {isLoading && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse h-28" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-red-700 dark:text-red-400">حدث خطأ أثناء جلب البيانات</h3>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error?.message}</p>
          </Card>
        )}

        {data && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="mosques" className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5">
                <Building2 className="h-4 w-4 ml-1 text-emerald-600" />
                إحصائيات المساجد
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5">
                <FileText className="h-4 w-4 ml-1 text-blue-600" />
                إحصائيات الطلبات
              </TabsTrigger>
              <TabsTrigger value="financials" className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5">
                <Wallet className="h-4 w-4 ml-1 text-amber-600" />
                الأمور المالية والصرف
              </TabsTrigger>
            </TabsList>

            {/* ==================== 1️⃣ تبويب إحصائيات المساجد ==================== */}
            <TabsContent value="mosques" className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>إجمالي المساجد المسجلة</span>
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {data.mosques.total.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>المساجد النشطة</span>
                      <Activity className="h-4 w-4 text-blue-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {data.mosques.active.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>المسجلة حديثاً</span>
                      <Clock className="h-4 w-4 text-amber-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      +{data.mosques.recent.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>نسبة التغطية</span>
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {data.mosques.total > 0 ? Math.round((data.mosques.active / data.mosques.total) * 100) : 100}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600 ml-1" />
                      توزيع المساجد حسب المدن
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    {data.mosques.byCity.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.mosques.byCity} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                          />
                          <Bar dataKey="value" name="عدد المساجد" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                        لا توجد بيانات متاحة
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600 ml-1" />
                      توزيع المساجد حسب الحالة التشغيلية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center pt-2">
                    {data.mosques.byStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.mosques.byStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {data.mosques.byStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-muted-foreground text-xs">لا توجد بيانات متاحة</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 2️⃣ تبويب إحصائيات الطلبات ==================== */}
            <TabsContent value="requests" className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>إجمالي الطلبات</span>
                      <FileText className="h-4 w-4 text-blue-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {data.requests.total.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>الطلبات المعتمدة</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {data.requests.approved.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>قيد التنفيذ والمراجعة</span>
                      <Clock className="h-4 w-4 text-amber-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {(data.requests.inProgress + data.requests.pending).toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>الطلبات المرفوضة</span>
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                      {data.requests.rejected.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600 ml-1" />
                      توزيع الطلبات حسب مراحل دورة العمل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    {data.requests.byStage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.requests.byStage} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                          />
                          <Bar dataKey="value" name="عدد الطلبات" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                        لا توجد طلبات مسجلة
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600 ml-1" />
                      أكثر المساجد طلباً للخدمات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-2">
                    {data.requests.topMosques.length > 0 ? (
                      data.requests.topMosques.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                              {item.name}
                            </span>
                          </div>
                          <Badge variant="secondary" className="font-bold text-[11px]">
                            {item.count} طلبات
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات متاحة</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 3️⃣ تبويب الأمور المالية والصرف ==================== */}
            <TabsContent value="financials" className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>إجمالي الميزانيات المعتمدة</span>
                      <Wallet className="h-4 w-4 text-amber-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                      {formatCurrency(data.financials.totalApprovedBudget)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>إجمالي المصروفات الفعلية</span>
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {formatCurrency(data.financials.totalDisbursedAmount)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>التحويلات البنكية المكتملة</span>
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.financials.completedBankTransfersCount.toLocaleString("ar-SA")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>إجمالي سندات القبض</span>
                      <Receipt className="h-4 w-4 text-purple-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400 truncate">
                      {formatCurrency(data.financials.totalReceiptVouchersAmount)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600 ml-1" />
                    التدفق المالي وتطور الصرف الشهري
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 pt-2">
                  {data.financials.monthlyFlow.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.financials.monthlyFlow} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <Tooltip
                          formatter={(val: any) => [formatCurrency(Number(val)), "المبلغ المصروف"]}
                          contentStyle={{ borderRadius: "8px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                        />
                        <Area type="monotone" dataKey="disbursed" name="المصروفات" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDisbursed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                      لا توجد بيانات تدفق شهري سابقة
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
