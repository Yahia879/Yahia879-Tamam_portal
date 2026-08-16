import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import {
  Building2, CheckCircle2, Clock, Crown, Wallet, TrendingUp,
  FileText, Activity, RefreshCw, ShieldCheck,
  ArrowUpRight, AlertCircle, Banknote, Receipt, MapPin, Layers,
  Check, X
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

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto space-y-8" dir="rtl">
        {/* ==================== الهيدر التنفيذي والتمييز القيادي ==================== */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 text-right">
              <div className="flex items-center gap-3">
                {isChairman ? (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1 font-bold text-xs rounded-lg flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    رئيس مجلس الإدارة
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 px-3 py-1 font-bold text-xs rounded-lg flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    عضو مجلس الإدارة
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                اللوحة الإحصائية القيادية لمجلس الإدارة
              </h1>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {isChairman
                  ? "مرحباً بك رئيس مجلس الإدارة، تُتيح لك هذه اللوحة الاطلاع الشامل على جميع المؤشرات التشغيلية والمالية وإجراء الاعتماد البنكي المباشر لأوامر الصرف."
                  : "مرحباً بك عضو مجلس الإدارة، واجهة قيادية متكاملة للمتابعة والاستطلاع الشامل لكافة مؤشرات وأداء البوابة."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                className="rounded-xl gap-2 font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </div>

        {/* ==================== قسم الاعتماد البنكي المباشر (رئيس مجلس الإدارة) ==================== */}
        {isChairman && data?.financials?.pendingOrders && data.financials.pendingOrders.length > 0 && (
          <Card className="rounded-3xl border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">
                  طلبات وأوامر الصرف بانتظار الاعتماد البنكي المباشر
                </h2>
                <Badge className="bg-amber-500 text-white rounded-lg font-bold px-2 py-0.5 text-xs">
                  {data.financials.pendingOrders.length}
                </Badge>
              </div>
              <Link href="/disbursement-orders">
                <Button variant="ghost" size="sm" className="text-amber-800 dark:text-amber-300 font-bold gap-1 text-xs">
                  عرض كافة الأوامر
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.financials.pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 shadow-sm flex flex-col justify-between space-y-3 text-right"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {order.orderNumber}
                      </span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {order.paymentMethod === "bank_transfer" ? "تحويل بنكي" : "سداد"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">المستفيد: {order.beneficiaryName}</p>
                    <p className="text-xs text-slate-500 truncate">البنك: {order.beneficiaryBank}</p>
                    <p className="text-base font-black text-amber-600 dark:text-amber-400">
                      {order.amount.toLocaleString("ar-SA")} ريال
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleDirectApprove(order.id)}
                    disabled={approvingId === order.id}
                    className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs"
                  >
                    <Check className="w-4 h-4" />
                    {approvingId === order.id ? "جاري الاعتماد البنكي..." : "اعتماد بنكي مباشر"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ==================== حالة التحميل والأخطاء ==================== */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-32 rounded-2xl animate-pulse bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-red-700 dark:text-red-400">حدث خطأ أثناء تحميل البيانات</h3>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error?.message}</p>
          </Card>
        )}

        {data && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* الشريط العلوي للتبويبات */}
            <div className="flex justify-start">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <TabsTrigger
                  value="mosques"
                  className="rounded-lg px-4 py-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary gap-2"
                >
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  إحصائيات المساجد
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="rounded-lg px-4 py-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  إحصائيات الطلبات
                </TabsTrigger>
                <TabsTrigger
                  value="financials"
                  className="rounded-lg px-4 py-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary gap-2"
                >
                  <Wallet className="w-4 h-4 text-amber-600" />
                  الأمور المالية والصرف
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ==================== 1️⃣ تبويب إحصائيات المساجد ==================== */}
            <TabsContent value="mosques" className="space-y-6">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">إجمالي المساجد</p>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {data.mosques.total.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">المساجد النشطة</p>
                      <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {data.mosques.active.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Activity className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">المسجلة حديثاً</p>
                      <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        +{data.mosques.recent.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">نسبة التغطية</p>
                      <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400">
                        {data.mosques.total > 0 ? Math.round((data.mosques.active / data.mosques.total) * 100) : 100}%
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <CardHeader className="p-0 mb-4 text-right">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      توزيع المساجد حسب المدن
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-64">
                    {data.mosques.byCity.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.mosques.byCity} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                          />
                          <Bar dataKey="value" name="عدد المساجد" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        لا توجد بيانات مدن مسجلة
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <CardHeader className="p-0 mb-4 text-right">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      توزيع المساجد حسب الحالة التشغيلية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-64 flex items-center justify-center">
                    {data.mosques.byStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.mosques.byStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {data.mosques.byStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-400 text-xs">لا توجد بيانات متاحة</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 2️⃣ تبويب إحصائيات الطلبات ==================== */}
            <TabsContent value="requests" className="space-y-6">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">إجمالي الطلبات</p>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {data.requests.total.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">الطلبات المعتمدة</p>
                      <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {data.requests.approved.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">قيد التنفيذ والمراجعة</p>
                      <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {(data.requests.inProgress + data.requests.pending).toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">الطلبات المرفوضة</p>
                      <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        {data.requests.rejected.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stage chart & Top Mosques */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <CardHeader className="p-0 mb-4 text-right">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      توزيع الطلبات حسب مراحل دورة العمل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-72">
                    {data.requests.byStage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.requests.byStage} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                          />
                          <Bar dataKey="value" name="عدد الطلبات" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        لا توجد طلبات مسجلة
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <CardHeader className="p-0 mb-4 text-right">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      أكثر المساجد طلباً للخدمات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    {data.requests.topMosques.length > 0 ? (
                      data.requests.topMosques.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.name}
                            </span>
                          </div>
                          <Badge variant="secondary" className="font-bold text-xs">
                            {item.count} طلبات
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6">لا توجد بيانات متاحة</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 3️⃣ تبويب الأمور المالية والصرف ==================== */}
            <TabsContent value="financials" className="space-y-6">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">إجمالي الميزانيات المعتمدة</p>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {data.financials.totalApprovedBudget.toLocaleString("ar-SA")} <span className="text-xs font-normal text-slate-500">ريال</span>
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">إجمالي المصروفات الفعلية</p>
                      <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {data.financials.totalDisbursedAmount.toLocaleString("ar-SA")} <span className="text-xs font-normal text-slate-500">ريال</span>
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Banknote className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">التحويلات البنكية المكتملة</p>
                      <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {data.financials.completedBankTransfersCount.toLocaleString("ar-SA")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">إجمالي سندات القبض</p>
                      <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400">
                        {data.financials.totalReceiptVouchersAmount.toLocaleString("ar-SA")} <span className="text-xs font-normal text-slate-500">ريال</span>
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                      <Receipt className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Flow Chart */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <CardHeader className="p-0 mb-4 text-right">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    التدفق المالي وتطور الصرف الشهري
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-72">
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
                          formatter={(val: any) => [`${Number(val).toLocaleString("ar-SA")} ريال`, "المبلغ المصروف"]}
                          contentStyle={{ borderRadius: "12px", background: "#0f172a", color: "#fff", border: "none", textAlign: "right" }}
                        />
                        <Area type="monotone" dataKey="disbursed" name="المصروفات" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDisbursed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
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
