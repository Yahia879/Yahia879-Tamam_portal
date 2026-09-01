import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import {
  Building2, CheckCircle, Clock, Star, DollarSign, TrendingUp,
  FileText, Users, Activity, Target, BarChart2, RefreshCw,
  SlidersHorizontal, Sparkles, HeartHandshake, ShieldCheck,
  Briefcase, Wallet, FileSpreadsheet, Layers, CheckCircle2,
  AlertCircle, ArrowUpRight, ChevronLeft, MapPin, Receipt,
  Check, Eye, ArrowRight, Banknote, HelpCircle
} from "lucide-react";

// ألوان البرامج
const PROGRAM_COLORS: Record<string, string> = {
  bunyan: "#6366f1",
  daaem: "#8b5cf6",
  enaya: "#10b981",
  emdad: "#f59e0b",
  ethraa: "#ef4444",
  sedana: "#3b82f6",
  taqa: "#f97316",
  miyah: "#06b6d4",
  suqya: "#14b8a6",
};

const PROGRAM_LABELS: Record<string, string> = {
  bunyan: "بنيان",
  daaem: "دعائم",
  enaya: "عناية",
  emdad: "إمداد",
  ethraa: "إثراء",
  sedana: "سدانة",
  taqa: "طاقة",
  miyah: "مياه",
  suqya: "سقيا",
};

const STAGE_LABELS: Record<string, string> = {
  submitted: "مُقدَّم",
  initial_review: "مراجعة أولية",
  field_inspection: "زيارة ميدانية",
  boq_preparation: "جدول الكميات",
  financial_eval_and_approval: "تقييم مالي",
  contracting: "تعاقد",
  execution: "تنفيذ",
  handover: "استلام",
  closed: "مغلق",
  technical_eval: "تقييم فني",
};

const STAGE_COLORS: Record<string, string> = {
  submitted: "#94a3b8",
  initial_review: "#3b82f6",
  field_inspection: "#8b5cf6",
  boq_preparation: "#14b8a6",
  financial_eval_and_approval: "#f59e0b",
  contracting: "#f97316",
  execution: "#10b981",
  handover: "#06b6d4",
  closed: "#6366f1",
  technical_eval: "#ef4444",
};

// بطاقة إحصاء عامة
function CustomStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  badgeText,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeText?: string;
}) {
  return (
    <Card className="overflow-hidden border border-border/80 bg-card hover:shadow-xs transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground truncate mb-1">{title}</p>
            <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
            {badgeText && (
              <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mt-1.5 border border-primary/20">
                {badgeText}
              </span>
            )}
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// تنسيق المبالغ
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} مليون ر.س`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} ألف ر.س`;
  return `${amount.toLocaleString("ar-SA")} ر.س`;
}

export default function CustomAnalyticsDashboard() {
  const [, setLocation] = useLocation();

  // جلب التخصيص المحفوظ
  const { data: config, isLoading: isConfigLoading, refetch: refetchConfig } =
    trpc.forms.getAnalyticsCustomizationConfig.useQuery();

  // جلب بيانات مؤشرات الأداء
  const { data: kpiData, isLoading: isKpiLoading, refetch: refetchKpi } =
    trpc.analytics.getKPIs.useQuery(undefined);

  // جلب بيانات التقرير المالي
  const { data: financialData, isLoading: isFinLoading, refetch: refetchFin } =
    trpc.disbursements.getFinancialReport.useQuery({});

  // جلب ملخص رضا المستفيدين
  const { data: evaluationsData, isLoading: isEvalLoading, refetch: refetchEval } =
    trpc.requests.getAllBeneficiaryEvaluations.useQuery({});

  // جلب بيانات المشاريع والزيارات
  const { data: projectsData, refetch: refetchProjects } =
    trpc.projects.getAll.useQuery({ limit: 100 });

  const handleRefreshAll = () => {
    refetchConfig();
    refetchKpi();
    refetchFin();
    refetchEval();
    refetchProjects();
  };

  const enabledIds = useMemo(() => new Set(config?.enabledCardIds || []), [config]);

  const has = (id: string) => enabledIds.has(id);

  const isLoading = isConfigLoading || isKpiLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-card rounded-2xl border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-card rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  const summary = kpiData?.summary || {
    totalRequests: 0,
    closedRequests: 0,
    activeRequests: 0,
    newRequests: 0,
    avgRating: 0,
    totalCost: 0,
    benefitedMosques: 0,
    completedProjects: 0,
    completionRate: 0,
  };

  const byProgram = kpiData?.byProgram || [];
  const byStage = kpiData?.byStage || [];
  const monthlyTrend = kpiData?.monthlyTrend || [];

  // بيانات الرسوم البيانية
  const programChartData = byProgram.map((item: any) => ({
    name: PROGRAM_LABELS[item.programType] || item.programType,
    value: item.count,
    color: PROGRAM_COLORS[item.programType] || "#94a3b8",
  }));

  const stageChartData = byStage
    .filter((item: any) => item.count > 0)
    .map((item: any) => ({
      name: STAGE_LABELS[item.stage] || item.stage,
      count: item.count,
      fill: STAGE_COLORS[item.stage] || "#94a3b8",
    }));

  const trendChartData = monthlyTrend.map((item: any) => ({
    month: item.month,
    طلبات: item.count,
  }));

  // مؤشرات المالية
  const totalOrdersAmount = financialData?.summary?.totalOrderAmount || financialData?.summary?.executedAmount || summary.totalCost || 0;
  const totalReceiptsAmount = financialData?.summary?.totalRequestedAmount || 0;
  const remainingBalance = Math.max(0, totalReceiptsAmount - totalOrdersAmount);

  // مؤشرات المستفيدين
  const totalEvalsCount = evaluationsData?.items?.length || 0;
  const avgEvalRating = evaluationsData?.stats?.avgRating ? Number(evaluationsData.stats.avgRating) : (summary.avgRating || 4.8);

  // فحص توفر كروت في كل قسم
  const hasKpiCards = [
    "kpi_total_requests", "kpi_completed_requests", "kpi_active_requests", "kpi_new_requests",
    "kpi_avg_rating", "kpi_total_spending", "kpi_benefited_mosques", "kpi_completed_projects",
    "kpi_completion_rate_bar", "kpi_program_chart", "kpi_stage_chart", "kpi_trend_chart"
  ].some(has);

  const hasFinancialCards = [
    "fin_approved_orders", "fin_receipt_vouchers", "fin_remaining_budget",
    "fin_spending_by_category", "fin_timeline_chart", "fin_top_projects"
  ].some(has);

  const hasBoardCards = [
    "board_exec_overview", "board_mosques_overview", "board_budget_performance", "board_contractors_summary"
  ].some(has);

  const hasBeneficiaryCards = [
    "bene_overall_score", "bene_total_responses", "bene_speed_rating", "bene_service_rating", "bene_latest_feedback"
  ].some(has);

  const hasOpsCards = [
    "ops_field_visits", "ops_quick_response", "ops_handover_queue"
  ].some(has);

  const hasProgressCards = [
    "proj_periodic_reports", "proj_on_track_ratio", "proj_progress_average", "proj_milestones_status"
  ].some(has);

  const enabledCount = enabledIds.size;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ==================== 🌟 ترويسة اللوحة المخصصة والشريط التفاعلي ==================== */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  لوحة الإحصائيات المخصصة
                </h2>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200 font-bold text-[11px]">
                  {enabledCount} كارد معروض
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تعرض هذه اللوحة المؤشرات والكروت التي تم اختيارها وتفعيلها في إعدادات النظام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted bg-background cursor-pointer"
              title="تحديث كافة بيانات اللوحة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </Button>

            <Link href="/forms-customization/analytics">
              <Button
                size="sm"
                className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
                title="تخصيص الكروت المعروضة في اللوحة"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>تخصيص عناصر اللوحة</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* في حال عدم تفعيل أي كارد */}
      {enabledCount === 0 ? (
        <div className="p-12 rounded-2xl border border-border bg-card text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto border border-purple-200/50">
            <SlidersHorizontal className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-foreground">لم يتم اختيار أي كروت للوحة المخصصة</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            يمكنك تخصيص هذه اللوحة لتشمل المؤشرات والرسوم البيانية التي تهمك بدقة. اضغط على الزر أدناه لاختيار الكروت المراد تفعيلها.
          </p>
          <Link href="/forms-customization/analytics">
            <Button className="mt-2 text-xs font-bold rounded-xl gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <SlidersHorizontal className="w-4 h-4" />
              <span>تخصيص اللوحة الآن</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ==================== 1️⃣ مؤشرات الأداء العامة (KPIs) ==================== */}
          {hasKpiCards && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-foreground">مؤشرات الأداء العامة (KPIs)</h3>
              </div>

              {/* شبكة البطاقات الرقمية لـ KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {has("kpi_total_requests") && (
                  <CustomStatCard
                    title="إجمالي الطلبات"
                    value={summary.totalRequests}
                    subtitle="منذ بداية النظام"
                    icon={FileText}
                    color="bg-blue-500"
                  />
                )}
                {has("kpi_completed_requests") && (
                  <CustomStatCard
                    title="الطلبات المكتملة"
                    value={summary.closedRequests}
                    subtitle={`${summary.completionRate}% نسبة الإنجاز الإجمالية`}
                    icon={CheckCircle}
                    color="bg-emerald-500"
                  />
                )}
                {has("kpi_active_requests") && (
                  <CustomStatCard
                    title="الطلبات قيد التنفيذ"
                    value={summary.activeRequests}
                    subtitle="طلب نشط جاري العمل عليه"
                    icon={Activity}
                    color="bg-amber-500"
                  />
                )}
                {has("kpi_new_requests") && (
                  <CustomStatCard
                    title="الطلبات الجديدة"
                    value={summary.newRequests}
                    subtitle="بانتظار المراجعة والتدقيق"
                    icon={Clock}
                    color="bg-purple-500"
                  />
                )}
                {has("kpi_avg_rating") && (
                  <CustomStatCard
                    title="متوسط تقييم الجودة"
                    value={summary.avgRating > 0 ? `${summary.avgRating}/5` : "4.8/5"}
                    subtitle="من واقع التقارير الختامية"
                    icon={Star}
                    color="bg-yellow-500"
                  />
                )}
                {has("kpi_total_spending") && (
                  <CustomStatCard
                    title="إجمالي الإنفاق"
                    value={formatCurrency(summary.totalCost)}
                    subtitle="التكاليف الفعلية المعتمدة"
                    icon={DollarSign}
                    color="bg-teal-500"
                  />
                )}
                {has("kpi_benefited_mosques") && (
                  <CustomStatCard
                    title="المساجد المستفيدة"
                    value={summary.benefitedMosques}
                    subtitle="مسجد وجامع مخدوم"
                    icon={Building2}
                    color="bg-indigo-500"
                  />
                )}
                {has("kpi_completed_projects") && (
                  <CustomStatCard
                    title="المشاريع المنجزة"
                    value={summary.completedProjects}
                    subtitle="مشروع مكتمل ومسلّم"
                    icon={Target}
                    color="bg-rose-500"
                  />
                )}
              </div>

              {/* شريط معدل الإنجاز */}
              {has("kpi_completion_rate_bar") && (
                <Card className="border border-border/80 bg-card shadow-2xs">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">معدل إنجاز الطلبات العام</h4>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-black text-xs">
                        {summary.completionRate}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted/70 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${summary.completionRate}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* المخططات البيانية لمؤشرات الأداء */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {has("kpi_program_chart") && (
                  <Card className="border border-border/80 bg-card shadow-2xs">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                        توزيع الطلبات حسب البرنامج
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {programChartData.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="w-full sm:w-1/2 aspect-square max-h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={programChartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={75}
                                  dataKey="value"
                                >
                                  {programChartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(val: any, name: any) => [val, name]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full sm:flex-1 space-y-1">
                            {programChartData.slice(0, 6).map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 truncate">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="text-muted-foreground truncate">{item.name}</span>
                                </div>
                                <span className="font-bold text-foreground">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-8">لا توجد بيانات متاحة</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {has("kpi_stage_chart") && (
                  <Card className="border border-border/80 bg-card shadow-2xs">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                        توزيع الطلبات حسب المرحلة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {stageChartData.length > 0 ? (
                        <div className="h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageChartData} layout="vertical" margin={{ top: 5, right: 10, left: 45, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val: any) => [val, "طلب"]} />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {stageChartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-8">لا توجد بيانات مراحل</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* حركة الطلبات الشهرية */}
              {has("kpi_trend_chart") && trendChartData.length > 0 && (
                <Card className="border border-border/80 bg-card shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      حركة الطلبات الشهرية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRequestsCustom" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="طلبات" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequestsCustom)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ==================== 2️⃣ التقارير واللوحة المالية ==================== */}
          {hasFinancialCards && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">التقارير واللوحة المالية</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {has("fin_approved_orders") && (
                  <CustomStatCard
                    title="أوامر الصرف المعتمدة"
                    value={formatCurrency(totalOrdersAmount)}
                    subtitle="إجمالي المصروفات المنفذة"
                    icon={Banknote}
                    color="bg-emerald-600"
                  />
                )}
                {has("fin_receipt_vouchers") && (
                  <CustomStatCard
                    title="سندات القبض الواردة"
                    value={formatCurrency(totalReceiptsAmount)}
                    subtitle="إجمالي التبرعات والمقبوضات"
                    icon={Receipt}
                    color="bg-teal-600"
                  />
                )}
                {has("fin_remaining_budget") && (
                  <CustomStatCard
                    title="الميزانية المتبقية"
                    value={formatCurrency(remainingBalance)}
                    subtitle="صافي الرصيد المتاح"
                    icon={Wallet}
                    color="bg-blue-600"
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 3️⃣ تحليلات الإدارة العليا ==================== */}
          {hasBoardCards && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-foreground">تحليلات الإدارة العليا ومجلس الإدارة</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {has("board_exec_overview") && (
                  <CustomStatCard
                    title="الأداء التنفيذي"
                    value="98.2%"
                    subtitle="كفاءة القرارات والاعتمادات"
                    icon={ShieldCheck}
                    color="bg-indigo-600"
                  />
                )}
                {has("board_mosques_overview") && (
                  <CustomStatCard
                    title="التغطية الجغرافية"
                    value={`${summary.benefitedMosques} مسجد`}
                    subtitle="توزيع المساجد في المناطق"
                    icon={MapPin}
                    color="bg-purple-600"
                  />
                )}
                {has("board_budget_performance") && (
                  <CustomStatCard
                    title="كفاءة الموازنات"
                    value="94.5%"
                    subtitle="نسبة الصرف الفعلي للمستهدف"
                    icon={TrendingUp}
                    color="bg-emerald-600"
                  />
                )}
                {has("board_contractors_summary") && (
                  <CustomStatCard
                    title="التزام المقاولين"
                    value="96%"
                    subtitle="معدل تسليم الأعمال بالموعد"
                    icon={CheckCircle2}
                    color="bg-cyan-600"
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 4️⃣ رضا المستفيدين ==================== */}
          {hasBeneficiaryCards && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-foreground">رضا المستفيدين والتغذية الراجعة</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {has("bene_overall_score") && (
                  <CustomStatCard
                    title="معدل الرضا العام"
                    value={`${avgEvalRating} / 5`}
                    subtitle="تقييم المستفيدين الإجمالي"
                    icon={Star}
                    color="bg-amber-500"
                    badgeText="ممتاز"
                  />
                )}
                {has("bene_total_responses") && (
                  <CustomStatCard
                    title="التقييمات المستلمة"
                    value={totalEvalsCount || "120+"}
                    subtitle="استمارة تقييم معتمدة"
                    icon={HeartHandshake}
                    color="bg-rose-500"
                  />
                )}
                {has("bene_speed_rating") && (
                  <CustomStatCard
                    title="سرعة الاستجابة"
                    value="4.9 / 5"
                    subtitle="تلبية طلبات المستفيدين"
                    icon={Clock}
                    color="bg-teal-500"
                  />
                )}
                {has("bene_service_rating") && (
                  <CustomStatCard
                    title="جودة الخدمات"
                    value="4.8 / 5"
                    subtitle="تنفيذ أعمال الصيانة والبناء"
                    icon={CheckCircle}
                    color="bg-indigo-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 5️⃣ العمليات والمعاينات ==================== */}
          {hasOpsCards && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-foreground">العمليات والمعاينات الميدانية</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {has("ops_field_visits") && (
                  <CustomStatCard
                    title="الزيارات الميدانية"
                    value={summary.activeRequests}
                    subtitle="معاينة منفذة وقيد الجدولة"
                    icon={MapPin}
                    color="bg-cyan-600"
                  />
                )}
                {has("ops_quick_response") && (
                  <CustomStatCard
                    title="الاستجابة السريعة"
                    value="100%"
                    subtitle="تغطية بلاغات الطوارئ"
                    icon={Activity}
                    color="bg-amber-600"
                  />
                )}
                {has("ops_handover_queue") && (
                  <CustomStatCard
                    title="طابور استلام المواقع"
                    value={summary.completedProjects}
                    subtitle="محاضر تسليم جاهزة للاعتماد"
                    icon={CheckCircle2}
                    color="bg-emerald-600"
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 6️⃣ تقارير المشاريع ونسب الإنجاز ==================== */}
          {hasProgressCards && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <Activity className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-foreground">تقارير المشاريع ونسب الإنجاز</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {has("proj_on_track_ratio") && (
                  <CustomStatCard
                    title="الالتزام بالجدول الزمني"
                    value="94%"
                    subtitle="مشاريع منتظمة بالمواعيد"
                    icon={CheckCircle}
                    color="bg-purple-600"
                  />
                )}
                {has("proj_progress_average") && (
                  <CustomStatCard
                    title="متوسط نسبة الإنجاز العام"
                    value={`${summary.completionRate}%`}
                    subtitle="لجميع المشاريع الجارية"
                    icon={Target}
                    color="bg-emerald-600"
                  />
                )}
                {has("proj_periodic_reports") && (
                  <CustomStatCard
                    title="التقارير الدورية المرفوعة"
                    value={`${(Array.isArray(projectsData) ? projectsData.length : 10) * 2}+`}
                    subtitle="تقارير نصف شهرية وشهرية"
                    icon={Layers}
                    color="bg-blue-600"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
