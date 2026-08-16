import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import {
  Building2, CheckCircle2, Clock, Crown, Wallet, TrendingUp,
  FileText, Users, Activity, BarChart3, RefreshCw, ShieldCheck,
  ArrowUpRight, AlertCircle, Banknote, Receipt, MapPin, Layers,
  ChevronLeft, Sparkles, PieChart as PieIcon
} from "lucide-react";
import { Link } from "wouter";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function BoardDashboard() {
  const [activeTab, setActiveTab] = useState("mosques");

  const { data, isLoading, isError, error, refetch, isRefetching } = trpc.board.getExecutiveStats.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const isChairman = data?.isChairman ?? false;

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto space-y-8" dir="rtl">
        {/* ==================== 👑 الهيدر التنفيذي والتمايز القيادي ==================== */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-600" />
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {isChairman ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30 px-3.5 py-1.5 text-sm font-bold rounded-xl flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500 animate-pulse" />
                    رئيس مجلس الإدارة (صلاحيات قيادية واعتماد مباشر)
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30 px-3.5 py-1.5 text-sm font-bold rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    عضو مجلس الإدارة (الاطلاع الإحصائي والتحليلي)
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  محدّث تلقائياً
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                اللوحة الإحصائية القيادية لمجلس الإدارة
              </h1>
              
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {isChairman
                  ? "مرحباً بك، رئيس مجلس الإدارة. واجهة استراتيجية فاخرة تُتيح لك الاطلاع الشامل والعميق على كافة المؤشرات التشغيلية والمالية مع صلاحية الاعتماد المباشر للتحويلات البنكية."
                  : "مرحباً بك، عضو مجلس الإدارة. واجهة تنفيذية متكاملة توفر لك رؤية استراتيجية دقيقة ومتابعة مستمرة لجميع إحصائيات ومؤشرات أداء منصة وبوابة عمارة المساجد."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
                تحديث البيانات
              </Button>

              {isChairman && (data?.financials?.pendingApprovalsCount ?? 0) > 0 && (
                <Link href="/disbursement-orders">
                  <Button className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 font-bold gap-2">
                    <Banknote className="w-4 h-4" />
                    طلبات بانتظار الاعتماد ({data?.financials?.pendingApprovalsCount})
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ==================== 📊 حالة التحميل والأخطاء ==================== */}
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
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">عذراً، حدث خطأ أثناء جلب البيانات القيادية</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error?.message || "تأكد من وجود صلاحية الوصول المطلوبة."}</p>
            <Button variant="outline" className="mt-4 rounded-xl border-red-300" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </Card>
        )}

        {data && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* navigation tabs bar */}
            <div className="flex justify-center sm:justify-start">
              <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1">
                <TabsTrigger
                  value="mosques"
                  className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-md transition-all gap-2"
                >
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  إحصائيات المساجد
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-md transition-all gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  إحصائيات الطلبات
                </TabsTrigger>
                <TabsTrigger
                  value="financials"
                  className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-md transition-all gap-2"
                >
                  <Wallet className="w-4 h-4 text-amber-500" />
                  المالية والتدرج المالي
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ==================== 1️⃣ تبويب المساجد (Mosques Analytics) ==================== */}
            <TabsContent value="mosques" className="space-y-8 animate-in fade-in-50 duration-300">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-slate-200/30 dark:shadow-none hover:shadow-xl transition-all">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">إجمالي المساجد المسجلة</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.mosques.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> مسجلة رسمياً بالبوابة
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-slate-200/30 dark:shadow-none hover:shadow-xl transition-all">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">المساجد النشطة</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.mosques.active.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">تشمل الخدمات والزيارات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Activity className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-slate-200/30 dark:shadow-none hover:shadow-xl transition-all">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">مسجلة خلال آخر 30 يوماً</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        +{data.mosques.recent.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> نمو مستمر
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-slate-200/30 dark:shadow-none hover:shadow-xl transition-all">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">نسبة التغطية الكلية</p>
                      <h3 className="text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.mosques.total > 0 ? Math.round((data.mosques.active / data.mosques.total) * 100) : 100}%
                      </h3>
                      <p className="text-xs text-muted-foreground">مساجد مفعّلة بالخدمات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <PieIcon className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: التوزيع الجغرافي */}
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      التوزيع الجغرافي للمساجد (حسب المدن)
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
                            contentStyle={{ borderRadius: "16px", background: "#0f172a", color: "#fff", border: "none" }}
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

                {/* Chart 2: توزيع الحالة */}
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <PieIcon className="w-5 h-5 text-blue-500" />
                      توزيع المساجد حسب الحالة التشغيلية
                    </CardTitle>
                    <CardDescription>مقارنة المساجد النشطة بالغير نشطة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72 flex items-center justify-center">
                    {data.mosques.byStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.mosques.byStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {data.mosques.byStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "16px", background: "#0f172a", color: "#fff", border: "none" }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-muted-foreground text-sm">لا توجد بيانات حالات متاحة</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ==================== 2️⃣ تبويب الطلبات (Requests Analytics) ==================== */}
            <TabsContent value="requests" className="space-y-8 animate-in fade-in-50 duration-300">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">إجمالي الطلبات المقدمة</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.requests.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">كافة طلبات الخدمات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <FileText className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">الطلبات المعتمدة والمكتملة</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.requests.approved.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> نسبة اعتماد عالية
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">الطلبات قيد التنفيذ والمراجعة</p>
                      <h3 className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                        {(data.requests.inProgress + data.requests.pending).toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">مرحلية العمل جارية</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">الطلبات الاعتذارية/المرفوضة</p>
                      <h3 className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                        {data.requests.rejected.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">لعدم اكتمال المتطلبات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stage chart & Top Mosques */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-500" />
                      توزيع الطلبات حسب مراحل دورة العمل (Stages)
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
                            contentStyle={{ borderRadius: "16px", background: "#0f172a", color: "#fff", border: "none" }}
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

                {/* Top Mosques */}
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-500" />
                      أكثر المساجد طلباً للخدمات
                    </CardTitle>
                    <CardDescription>المساجد الأكثر تفاعلاً وطلباً للصيانة والبرامج</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    {data.requests.topMosques.length > 0 ? (
                      data.requests.topMosques.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {item.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="rounded-xl font-bold bg-white dark:bg-slate-900">
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

            {/* ==================== 3️⃣ تبويب المالية والصرف (Financials Analytics) ==================== */}
            <TabsContent value="financials" className="space-y-8 animate-in fade-in-50 duration-300">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">إجمالي الميزانيات المعتمدة</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.financials.totalApprovedBudget.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">للمشاريع والعقود المعتمدة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">إجمالي المصروفات الفعلية</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.financials.totalDisbursedAmount.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> أوامر صرف منفذة
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Banknote className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">التحويلات البنكية المكتملة</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.financials.completedBankTransfersCount.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        بمبلغ: {data.financials.completedBankTransfersAmount.toLocaleString("ar-SA")} ريال
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">إجمالي سندات القبض</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.financials.totalReceiptVouchersAmount.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">سندات قبض مسجلة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Receipt className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Flow Chart */}
              <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    التدفق المالي وتطور الصرف الشهري المعتمد
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
                          contentStyle={{ borderRadius: "16px", background: "#0f172a", color: "#fff", border: "none" }}
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
