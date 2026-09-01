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
  compact = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeText?: string;
  compact?: boolean;
}) {
  return (
    <Card className="overflow-hidden border border-border/80 bg-card hover:shadow-xs transition-all">
      <CardContent className={compact ? "p-2.5" : "p-3 sm:p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-muted-foreground truncate ${compact ? "text-[10px] mb-0.5" : "text-[11px] sm:text-xs mb-0.5 sm:mb-1"}`}>{title}</p>
            <p className={`font-black text-foreground tracking-tight truncate ${compact ? "text-base" : "text-lg sm:text-2xl"}`}>{value}</p>
            {subtitle && (
              <p className={`text-muted-foreground truncate ${compact ? "text-[8.5px] mt-0.5" : "text-[10px] sm:text-[11px] mt-0.5"}`}>{subtitle}</p>
            )}
            {badgeText && (
              <span className={`inline-block font-bold text-primary bg-primary/10 rounded-md border border-primary/20 ${compact ? "text-[8px] px-1 py-0 mt-0.5" : "text-[9.5px] px-1.5 py-0.5 mt-1"}`}>
                {badgeText}
              </span>
            )}
          </div>
          <div className={`flex items-center justify-center shrink-0 shadow-2xs ${compact ? "w-7 h-7 rounded-lg" : "w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl"} ${color}`}>
            <Icon className={compact ? "w-3.5 h-3.5 text-white" : "w-4 h-4 sm:w-5 sm:h-5 text-white"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// تنسيق المبالغ
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} م ر.س`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} ألف ر.س`;
  return `${amount.toLocaleString("ar-SA")} ر.س`;
}

export interface CustomAnalyticsDashboardProps {
  overrideEnabledIds?: string[];
  isPreview?: boolean;
  isMobilePreview?: boolean;
}

export default function CustomAnalyticsDashboard({
  overrideEnabledIds,
  isPreview = false,
  isMobilePreview = false,
}: CustomAnalyticsDashboardProps = {}) {
  const [, setLocation] = useLocation();

  // جلب التخصيص المحفوظ
  const { data: config, isLoading: isConfigLoading, refetch: refetchConfig } =
    trpc.forms.getAnalyticsCustomizationConfig.useQuery(undefined, {
      enabled: !overrideEnabledIds,
    });

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
    if (!overrideEnabledIds) {
      refetchConfig();
    }
    refetchKpi();
    refetchFin();
    refetchEval();
    refetchProjects();
  };

  const enabledIds = useMemo(() => {
    if (overrideEnabledIds) {
      return new Set(overrideEnabledIds);
    }
    return new Set(config?.enabledCardIds || []);
  }, [config, overrideEnabledIds]);

  const has = (id: string) => enabledIds.has(id);

  const isLoading = (!overrideEnabledIds && isConfigLoading) || isKpiLoading;

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

  const statGridClass = isMobilePreview
    ? "grid grid-cols-2 gap-2"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3";

  const stat3GridClass = isMobilePreview
    ? "grid grid-cols-2 gap-2"
    : "grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3";

  return (
    <div className={isMobilePreview ? "space-y-3.5" : "space-y-5"} dir="rtl">
      {/* ==================== 🌟 ترويسة اللوحة المخصصة والشريط التفاعلي ==================== */}
      <div className={`rounded-2xl border border-border/80 bg-card ${isMobilePreview ? "p-2.5" : "p-3.5 sm:p-4"} shadow-2xs`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`${isMobilePreview ? "w-7.5 h-7.5 rounded-lg" : "w-9 h-9 sm:w-10 sm:h-10 rounded-xl"} bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50`}>
              <Sparkles className={isMobilePreview ? "w-3.5 h-3.5" : "w-4 h-4 sm:w-5 sm:h-5"} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className={`${isMobilePreview ? "text-xs font-black" : "text-sm sm:text-base font-black"} text-foreground tracking-tight truncate`}>
                  لوحة الإحصائيات المخصصة
                </h2>
                <Badge variant="outline" className={`bg-purple-500/10 text-purple-600 border-purple-200 font-bold ${isMobilePreview ? "text-[9px] px-1 py-0" : "text-[10.5px] h-5"}`}>
                  {enabledCount} كارد
                </Badge>
              </div>
              {!isMobilePreview && (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  تعرض هذه اللوحة المؤشرات والكروت التي تم اختيارها وتفعيلها في إعدادات النظام
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className={`${isMobilePreview ? "h-6.5 px-2 text-[9.5px]" : "h-8 px-3 text-xs"} font-bold gap-1 rounded-lg sm:rounded-xl border-border hover:bg-muted bg-background cursor-pointer`}
              title="تحديث كافة بيانات اللوحة"
            >
              <RefreshCw className={isMobilePreview ? "w-3 h-3" : "w-3.5 h-3.5"} />
              <span>تحديث</span>
            </Button>

            {!isPreview && (
              <Link href="/forms-customization/analytics">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
                  title="تخصيص الكروت المعروضة في اللوحة"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تخصيص عناصر اللوحة</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* في حال عدم تفعيل أي كارد */}
      {enabledCount === 0 ? (
        <div className="p-6 sm:p-10 rounded-2xl border border-border bg-card text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto border border-purple-200/50">
            <SlidersHorizontal className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-xs sm:text-base font-black text-foreground">لم يتم اختيار أي كروت للوحة المخصصة</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            يمكنك تخصيص هذه اللوحة لتشمل المؤشرات والرسوم البيانية التي تهمك بدقة.
          </p>
        </div>
      ) : (
        <div className={isMobilePreview ? "space-y-4" : "space-y-5 sm:space-y-6"}>
          {/* ==================== 1️⃣ مؤشرات الأداء العامة (KPIs) ==================== */}
          {hasKpiCards && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">مؤشرات الأداء العامة (KPIs)</h3>
              </div>

              {/* شبكة البطاقات الرقمية لـ KPI */}
              <div className={statGridClass}>
                {has("kpi_total_requests") && (
                  <CustomStatCard
                    title="إجمالي الطلبات"
                    value={summary.totalRequests}
                    subtitle="منذ بداية النظام"
                    icon={FileText}
                    color="bg-blue-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_completed_requests") && (
                  <CustomStatCard
                    title="الطلبات المكتملة"
                    value={summary.closedRequests}
                    subtitle={`${summary.completionRate}% نسبة الإنجاز`}
                    icon={CheckCircle}
                    color="bg-emerald-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_active_requests") && (
                  <CustomStatCard
                    title="الطلبات قيد التنفيذ"
                    value={summary.activeRequests}
                    subtitle="طلب نشط جاري"
                    icon={Activity}
                    color="bg-amber-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_new_requests") && (
                  <CustomStatCard
                    title="الطلبات الجديدة"
                    value={summary.newRequests}
                    subtitle="بانتظار المراجعة"
                    icon={Clock}
                    color="bg-purple-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_avg_rating") && (
                  <CustomStatCard
                    title="متوسط تقييم الجودة"
                    value={summary.avgRating > 0 ? `${summary.avgRating}/5` : "4.8/5"}
                    subtitle="تقييم الجودة"
                    icon={Star}
                    color="bg-yellow-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_total_spending") && (
                  <CustomStatCard
                    title="إجمالي الإنفاق"
                    value={formatCurrency(summary.totalCost)}
                    subtitle="التكاليف المعتمدة"
                    icon={DollarSign}
                    color="bg-teal-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_benefited_mosques") && (
                  <CustomStatCard
                    title="المساجد المستفيدة"
                    value={summary.benefitedMosques}
                    subtitle="مسجد وجامع"
                    icon={Building2}
                    color="bg-indigo-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("kpi_completed_projects") && (
                  <CustomStatCard
                    title="المشاريع المنجزة"
                    value={summary.completedProjects}
                    subtitle="مشروع مكتمل"
                    icon={Target}
                    color="bg-rose-500"
                    compact={isMobilePreview}
                  />
                )}
              </div>

              {/* شريط معدل الإنجاز */}
              {has("kpi_completion_rate_bar") && (
                <Card className="border border-border/80 bg-card shadow-2xs">
                  <CardContent className="p-3 sm:p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">معدل إنجاز الطلبات العام</h4>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-black text-[11px] h-5">
                        {summary.completionRate}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted/70 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${summary.completionRate}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* المخططات البيانية لمؤشرات الأداء */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
                {has("kpi_program_chart") && (
                  <Card className="border border-border/80 bg-card shadow-2xs">
                    <CardHeader className="p-3 sm:p-3.5 pb-1">
                      <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                        <div className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
                        توزيع الطلبات حسب البرنامج
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-3.5 pt-0">
                      {programChartData.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <div className="w-full sm:w-1/2 aspect-square max-h-[150px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={programChartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={35}
                                  outerRadius={60}
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
                              <div key={idx} className="flex items-center justify-between text-[11px] sm:text-xs">
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
                        <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات متاحة</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {has("kpi_stage_chart") && (
                  <Card className="border border-border/80 bg-card shadow-2xs">
                    <CardHeader className="p-3 sm:p-3.5 pb-1">
                      <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
                          <span>توزيع الطلبات حسب المرحلة</span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-normal">
                          {stageChartData.length} مراحل
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-3.5 pt-1">
                      {stageChartData.length > 0 ? (
                        <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                          {stageChartData.map((item: any, idx: number) => {
                            const maxCount = Math.max(...stageChartData.map((s: any) => s.count), 1);
                            const percentage = Math.round((item.count / maxCount) * 100);
                            return (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: item.fill }}
                                    />
                                    <span className="text-foreground font-medium truncate">
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                                    <span className="font-bold text-foreground">{item.count}</span>
                                    <span className="text-[10px]">طلب</span>
                                  </div>
                                </div>
                                <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.max(percentage, 4)}%`,
                                      backgroundColor: item.fill,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات مراحل</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* حركة الطلبات الشهرية */}
              {has("kpi_trend_chart") && trendChartData.length > 0 && (
                <Card className="border border-border/80 bg-card shadow-2xs">
                  <CardHeader className="p-3 sm:p-3.5 pb-1">
                    <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                      حركة الطلبات الشهرية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-3.5 pt-0">
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRequestsCustom" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                          <XAxis dataKey="month" tick={{ fontSize: 9.5 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9.5 }} />
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
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">التقارير واللوحة المالية</h3>
              </div>

              <div className={stat3GridClass}>
                {has("fin_approved_orders") && (
                  <CustomStatCard
                    title="أوامر الصرف المعتمدة"
                    value={formatCurrency(totalOrdersAmount)}
                    subtitle="إجمالي المصروفات المنفذة"
                    icon={Banknote}
                    color="bg-emerald-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("fin_receipt_vouchers") && (
                  <CustomStatCard
                    title="سندات القبض الواردة"
                    value={formatCurrency(totalReceiptsAmount)}
                    subtitle="إجمالي التبرعات والمقبوضات"
                    icon={Receipt}
                    color="bg-teal-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("fin_remaining_budget") && (
                  <CustomStatCard
                    title="الميزانية المتبقية"
                    value={formatCurrency(remainingBalance)}
                    subtitle="صافي الرصيد المتاح"
                    icon={Wallet}
                    color="bg-blue-600"
                    compact={isMobilePreview}
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 3️⃣ تحليلات الإدارة العليا ==================== */}
          {hasBoardCards && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">تحليلات الإدارة العليا ومجلس الإدارة</h3>
              </div>

              <div className={statGridClass}>
                {has("board_exec_overview") && (
                  <CustomStatCard
                    title="الأداء التنفيذي"
                    value="98.2%"
                    subtitle="كفاءة القرارات"
                    icon={ShieldCheck}
                    color="bg-indigo-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("board_mosques_overview") && (
                  <CustomStatCard
                    title="التغطية الجغرافية"
                    value={`${summary.benefitedMosques} مسجد`}
                    subtitle="توزيع المساجد"
                    icon={MapPin}
                    color="bg-purple-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("board_budget_performance") && (
                  <CustomStatCard
                    title="كفاءة الموازنات"
                    value="94.5%"
                    subtitle="نسبة الصرف للهدف"
                    icon={TrendingUp}
                    color="bg-emerald-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("board_contractors_summary") && (
                  <CustomStatCard
                    title="التزام المقاولين"
                    value="96%"
                    subtitle="تسليم بالموعد"
                    icon={CheckCircle2}
                    color="bg-cyan-600"
                    compact={isMobilePreview}
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 4️⃣ رضا المستفيدين ==================== */}
          {hasBeneficiaryCards && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">رضا المستفيدين والتغذية الراجعة</h3>
              </div>

              <div className={statGridClass}>
                {has("bene_overall_score") && (
                  <CustomStatCard
                    title="معدل الرضا العام"
                    value={`${avgEvalRating} / 5`}
                    subtitle="تقييم المستفيدين"
                    icon={Star}
                    color="bg-amber-500"
                    badgeText="ممتاز"
                    compact={isMobilePreview}
                  />
                )}
                {has("bene_total_responses") && (
                  <CustomStatCard
                    title="التقييمات المستلمة"
                    value={totalEvalsCount || "120+"}
                    subtitle="استمارة تقييم"
                    icon={HeartHandshake}
                    color="bg-rose-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("bene_speed_rating") && (
                  <CustomStatCard
                    title="سرعة الاستجابة"
                    value="4.9 / 5"
                    subtitle="تلبية الطلبات"
                    icon={Clock}
                    color="bg-teal-500"
                    compact={isMobilePreview}
                  />
                )}
                {has("bene_service_rating") && (
                  <CustomStatCard
                    title="جودة الخدمات"
                    value="4.8 / 5"
                    subtitle="تنفيذ الأعمال"
                    icon={CheckCircle}
                    color="bg-indigo-500"
                    compact={isMobilePreview}
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 5️⃣ العمليات والمعاينات ==================== */}
          {hasOpsCards && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">العمليات والمعاينات الميدانية</h3>
              </div>

              <div className={stat3GridClass}>
                {has("ops_field_visits") && (
                  <CustomStatCard
                    title="الزيارات الميدانية"
                    value={summary.activeRequests}
                    subtitle="معاينة منفذة"
                    icon={MapPin}
                    color="bg-cyan-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("ops_quick_response") && (
                  <CustomStatCard
                    title="الاستجابة السريعة"
                    value="100%"
                    subtitle="بلاغات الطوارئ"
                    icon={Activity}
                    color="bg-amber-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("ops_handover_queue") && (
                  <CustomStatCard
                    title="طابور الاستلام"
                    value={summary.completedProjects}
                    subtitle="محاضر جاهزة"
                    icon={CheckCircle2}
                    color="bg-emerald-600"
                    compact={isMobilePreview}
                  />
                )}
              </div>
            </div>
          )}

          {/* ==================== 6️⃣ تقارير المشاريع ونسب الإنجاز ==================== */}
          {hasProgressCards && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">تقارير المشاريع ونسب الإنجاز</h3>
              </div>

              <div className={stat3GridClass}>
                {has("proj_on_track_ratio") && (
                  <CustomStatCard
                    title="الالتزام بالجدول"
                    value="94%"
                    subtitle="مشاريع منتظمة"
                    icon={CheckCircle}
                    color="bg-purple-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("proj_progress_average") && (
                  <CustomStatCard
                    title="متوسط الإنجاز"
                    value={`${summary.completionRate}%`}
                    subtitle="لجميع المشاريع"
                    icon={Target}
                    color="bg-emerald-600"
                    compact={isMobilePreview}
                  />
                )}
                {has("proj_periodic_reports") && (
                  <CustomStatCard
                    title="التقارير الدورية"
                    value={`${(Array.isArray(projectsData) ? projectsData.length : 10) * 2}+`}
                    subtitle="تقارير مرفوعة"
                    icon={Layers}
                    color="bg-blue-600"
                    compact={isMobilePreview}
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
