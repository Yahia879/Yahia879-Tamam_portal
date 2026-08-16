import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Check, Sparkles, PieChart as PieIcon, ClipboardList, Truck, Handshake, LifeBuoy
} from "lucide-react";
import { Link } from "wouter";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const TOOLTIP_CONTENT_STYLE = {
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  borderColor: "#cbd5e1",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
  color: "#0f172a",
  padding: "10px 14px",
  textAlign: "right" as const,
  direction: "rtl" as const,
};

const TOOLTIP_ITEM_STYLE = {
  color: "#0f172a",
  fontWeight: "bold",
  fontSize: "13px",
};

const TOOLTIP_LABEL_STYLE = {
  color: "#475569",
  fontWeight: "bold",
  fontSize: "12px",
  marginBottom: "4px",
};

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
      <div className="container py-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
        {/* ==================== 👑 الهيدر التنفيذي والتمايز القيادي الفاخر ==================== */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-600" />
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3 text-right">
              <div className="flex items-center gap-3 justify-start">
                {isChairman ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                    <span>رئيس مجلس الإدارة</span>
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>عضو مجلس الإدارة</span>
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  محدّث تلقائياً
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                اللوحة الإحصائية القيادية لمجلس الإدارة
              </h1>
              
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {isChairman
                  ? "مرحباً بك رئيس مجلس الإدارة، واجهة قيادية تُتيح لك الاطلاع الشامل والعميق على كافة المؤشرات التشغيلية والهندسية والمالية والحوكمة وإجراء الاعتماد البنكي المباشر لأوامر الصرف."
                  : "مرحباً بك عضو مجلس الإدارة، واجهة تنفيذية متكاملة توفر لك رؤية استراتيجية دقيقة ومتابعة مستمرة لجميع إحصائيات ومشاريع منصة وبوابة عمارة المساجد."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors gap-2 font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
                <span>تحديث البيانات</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ==================== ⚡ قسم الاعتماد البنكي المباشر (رئيس مجلس الإدارة) ==================== */}
        {isChairman && data?.financials?.pendingOrders && data.financials.pendingOrders.length > 0 && (
          <div className="rounded-3xl border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-8 space-y-6 backdrop-blur-lg shadow-lg shadow-amber-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 dark:border-amber-900/40 pb-4">
              <div className="flex items-center gap-3 text-right">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                    أوامر الصرف بانتظار الاعتماد البنكي المباشر
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    يتوفر لديك {data.financials.pendingOrders.length} أمر صرف يتطلب اعتمادك البنكي المباشر
                  </p>
                </div>
              </div>

              <Link href="/disbursement-orders">
                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1 text-xs">
                  <span>كافة أوامر الصرف</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.financials.pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/70 dark:border-amber-900/50 shadow-md hover:shadow-xl transition-all space-y-4 text-right flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                        {order.orderNumber}
                      </span>
                      <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/40 text-[11px] font-bold">
                        {order.paymentMethod === "bank_transfer" ? "تحويل بنكي" : "سداد"}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">المستفيد:</span> {order.beneficiaryName}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">المصرف:</span> {order.beneficiaryBank}</p>
                    </div>

                    <div className="pt-1">
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(order.amount)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleDirectApprove(order.id)}
                    disabled={approvingId === order.id}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold text-xs gap-2 py-2.5 shadow-md shadow-amber-500/20"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{approvingId === order.id ? "جاري الاعتماد البنكي..." : "اعتماد بنكي مباشر"}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== حالة التحميل والأخطاء ==================== */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-32 rounded-2xl border-slate-200/80 animate-pulse bg-slate-100/60 dark:bg-slate-800/40" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">حدث خطأ أثناء جلب البيانات القيادية</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error?.message}</p>
            <Button variant="outline" className="mt-4 rounded-xl border-red-300 font-bold" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </Card>
        )}

        {data && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 w-full" dir="rtl">
            {/* شريط التبويبات الـ 5 المنسق والمتوزع بعرض الصفحة مع تباعد ممتاز */}
            <div className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 gap-2 sm:gap-3">
                <TabsTrigger
                  value="mosques"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>إحصائيات المساجد</span>
                </TabsTrigger>

                <TabsTrigger
                  value="requests"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>إحصائيات الطلبات</span>
                </TabsTrigger>

                <TabsTrigger
                  value="projects"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>الهندسة والمشاريع</span>
                </TabsTrigger>

                <TabsTrigger
                  value="procurement"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Truck className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>المشتريات والعقود</span>
                </TabsTrigger>

                <TabsTrigger
                  value="financials"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>المالية والصرف</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ==================== 1️⃣ تبويب إحصائيات المساجد ==================== */}
            <TabsContent value="mosques" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي المساجد المسجلة</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.mosques.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> مسجلة رسمياً بالبوابة
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المساجد النشطة</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.mosques.active.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">تتلقى الخدمات والزيارات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المسجلة خلال آخر 30 يوماً</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        +{data.mosques.recent.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 shrink-0" /> نمو مستمر
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">نسبة التغطية الكلية</p>
                      <h3 className="text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.mosques.total > 0 ? Math.round((data.mosques.active / data.mosques.total) * 100) : 100}%
                      </h3>
                      <p className="text-xs text-muted-foreground">مساجد مفعّلة بالخدمات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <PieIcon className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>توزيع المساجد حسب المدن</span>
                    </CardTitle>
                    <CardDescription>أبرز المناطق والمدن الأكثر تغطية وتسجيلاً للمساجد</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72">
                    {data.mosques.byCity.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.mosques.byCity} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                          <Tooltip
                            formatter={(value: any) => [`${value} مسجد`, "عدد المساجد"]}
                            contentStyle={TOOLTIP_CONTENT_STYLE}
                            itemStyle={TOOLTIP_ITEM_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                          />
                          <Bar dataKey="value" name="عدد المساجد" fill="#10b981" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات مدن مسجلة حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <PieIcon className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>توزيع المساجد حسب الحالة التشغيلية</span>
                    </CardTitle>
                    <CardDescription>مقارنة المساجد النشطة بالغير نشطة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72 flex items-center justify-center">
                    {data.mosques.byStatus.length > 0 ? (
                      <div className="w-full flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-full sm:w-1/2 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.mosques.byStatus}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {data.mosques.byStatus.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any, name: any) => [`${value} مسجد`, name]}
                                contentStyle={TOOLTIP_CONTENT_STYLE}
                                itemStyle={TOOLTIP_ITEM_STYLE}
                                labelStyle={TOOLTIP_LABEL_STYLE}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full sm:w-1/2 space-y-3 text-right">
                          {data.mosques.byStatus.map((item, index) => {
                            const total = data.mosques.total || 1;
                            const percent = Math.round((item.value / total) * 100);
                            return (
                              <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-3.5 h-3.5 rounded-full shrink-0"
                                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                  />
                                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                    {item.value}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    ({percent}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">لا توجد بيانات حالات متاحة</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 2️⃣ تبويب إحصائيات الطلبات ==================== */}
            <TabsContent value="requests" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي الطلبات المقدمة</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.requests.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">كافة طلبات الخدمات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الطلبات المعتمدة والمكتملة</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.requests.approved.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> نسبة اعتماد عالية
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الطلبات قيد التنفيذ والمراجعة</p>
                      <h3 className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                        {(data.requests.inProgress + data.requests.pending).toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">مرحلية العمل جارية</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الطلبات المرفوضة</p>
                      <h3 className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                        {data.requests.rejected.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">لعدم اكتمال المتطلبات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>توزيع الطلبات حسب مراحل دورة العمل</span>
                    </CardTitle>
                    <CardDescription>موزعة على مراحل التقديم والمعاينة وجداول الكميات والتعاقد والتنفيذ</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-80">
                    {data.requests.byStage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.requests.byStage} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                          <Tooltip
                            formatter={(value: any) => [`${value} طلب`, "عدد الطلبات"]}
                            contentStyle={TOOLTIP_CONTENT_STYLE}
                            itemStyle={TOOLTIP_ITEM_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                          />
                          <Bar dataKey="value" name="عدد الطلبات" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        لا توجد طلبات مسجلة في المراحل
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-500 shrink-0" />
                      <span>أكثر المساجد طلباً للخدمات</span>
                    </CardTitle>
                    <CardDescription>المساجد الأكثر تفاعلاً وطلباً للصيانة والبرامج</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    {data.requests.topMosques.length > 0 ? (
                      data.requests.topMosques.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {item.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="rounded-xl font-bold bg-white dark:bg-slate-900 shrink-0">
                            {item.count} طلبات
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات متاحة</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 3️⃣ تبويب الهندسة والمشاريع ==================== */}
            <TabsContent value="projects" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي المشاريع الهندسية</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.projects.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">مشاريع مسجلة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المشاريع قيد التنفيذ</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.projects.active.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <Activity className="w-3 h-3 shrink-0" /> أعمال إنشائية جارية
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المشاريع المكتملة</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.projects.completed.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">تم الاستلام النهائي</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">ميزانيات المشاريع</p>
                      <h3 className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.projects.totalBudget.toLocaleString("ar-SA")} <span className="text-xs font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">ميزانية معتمدة للمشاريع</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects Chart */}
              <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                <CardHeader className="p-0 mb-6 text-right">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span>توزيع المشاريع الهندسية حسب الحالات التشغيلية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-72">
                  {data.projects.byStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.projects.byStatus} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value} مشروع`, "عدد المشاريع"]}
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          labelStyle={TOOLTIP_LABEL_STYLE}
                        />
                        <Bar dataKey="value" name="عدد المشاريع" fill="#6366f1" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد مشاريع مسجلة حالياً
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== 4️⃣ تبويب المشتريات والعقود والموردين ==================== */}
            <TabsContent value="procurement" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي الموردين المسجلين</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.procurement.totalSuppliers.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">موردون بالشبكة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                      <Truck className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الموردون المعتمدون</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.procurement.approvedSuppliers.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> منشآت مؤهلة رسمياً
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي العقود المبرمة</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.procurement.totalContracts.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">عقود رسمية نشطة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">قيمة العقود المبرمة</p>
                      <h3 className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.procurement.totalContractsValue.toLocaleString("ar-SA")} <span className="text-xs font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">إجمالي قيمة العقود</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 5️⃣ تبويب الأمور المالية والصرف ==================== */}
            <TabsContent value="financials" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي الميزانيات المعتمدة</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.financials.totalApprovedBudget.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">للمشاريع والعقود المعتمدة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي المصروفات الفعلية</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.financials.totalDisbursedAmount.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> أوامر صرف منفذة
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Banknote className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">التحويلات البنكية المكتملة</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.financials.completedBankTransfersCount.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        مبلغ: {data.financials.completedBankTransfersAmount.toLocaleString("ar-SA")} ريال
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي سندات القبض</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.financials.totalReceiptVouchersAmount.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">سندات قبض مسجلة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <Receipt className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Flow Chart */}
              <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                <CardHeader className="p-0 mb-6 text-right">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>التدفق المالي وتطور الصرف الشهري المعتمد</span>
                  </CardTitle>
                  <CardDescription>التغيرات والمبالغ المصروفة عبر أوامر الصرف المعتمدة شهرياً</CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-80">
                  {data.financials.monthlyFlow.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.financials.monthlyFlow} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                        <Tooltip
                          formatter={(val: any) => [`${Number(val).toLocaleString("ar-SA")} ريال`, "المبلغ المصروف"]}
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          labelStyle={TOOLTIP_LABEL_STYLE}
                        />
                        <Area type="monotone" dataKey="disbursed" name="المصروفات" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDisbursed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
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
