import React, { useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { ROLE_LABELS } from "@shared/constants";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Target,
  LifeBuoy,
  SlidersHorizontal,
  Briefcase,
  BarChart3,
  FileText,
  Building2,
  Clock,
  CheckCircle2,
  Receipt,
  Wallet,
  FolderKanban,
  Banknote,
  Store,
  ShieldCheck,
  FileSpreadsheet,
  FileCheck2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

import Reports from "@/pages/Reports";
import FinancialReport from "@/pages/FinancialReport";
import BoardDashboard from "@/pages/BoardDashboard";

export default function InformationDashboard() {
  const [, navigate] = useLocation();
  const { user, loading: isUserLoading } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const isSystemAdmin = user?.role === "system_admin";
  const hasInfoPerm = usePermission("information_dashboard.view") || usePermission("information_dashboard");
  const canView = isSuperAdmin || isSystemAdmin || hasInfoPerm;

  const customRoleNameAr = (user as any)?.customRoleNameAr || "";
  const roleLabel = customRoleNameAr || ROLE_LABELS[user?.role || ""] || user?.role || "مستخدم";

  // جلب إعدادات تخصيص اللوحة المفصلة
  const { data: detailedDashboardConfig } = trpc.forms.getDetailedDashboardCustomizationConfig.useQuery();

  const enabledDetailedElementIds = useMemo(() => {
    return new Set(detailedDashboardConfig?.enabledElementIds || []);
  }, [detailedDashboardConfig]);

  const isDetailedElementEnabled = (elementId: string) => {
    if (!detailedDashboardConfig?.isCustomized) return true;
    return enabledDetailedElementIds.has(elementId);
  };

  // الاستعلامات لجلب البيانات
  const { data: requestStats } = trpc.requests.getStats.useQuery(undefined, { enabled: canView });
  const { data: mosqueStats } = trpc.mosques.getStats.useQuery(undefined, { enabled: canView });
  const { data: growthStats } = trpc.analytics.getMonthlyGrowth.useQuery(undefined, { enabled: canView });
  const { data: disbursementStats } = trpc.disbursements.getStats.useQuery(undefined, { enabled: canView });
  const { data: supplierStats } = trpc.suppliers.getStats.useQuery(undefined, { enabled: canView });
  const { data: projectStats } = trpc.projects.getStats.useQuery(undefined, { enabled: canView });
  const { data: boardStats } = trpc.board.getExecutiveStats.useQuery({ page: 1, pageSize: 1 }, { enabled: canView });
  const { data: financialReportData } = trpc.disbursements.getFinancialReport.useQuery({}, { enabled: canView });
  const { data: allReceiptVouchersData = [] } = trpc.projects.getAllReceiptVouchers.useQuery(undefined, { enabled: canView });
  const { data: pendingUsers } = trpc.auth.getPendingUsers.useQuery(undefined, { enabled: canView });

  // التحقق من الصلاحية
  if (!isUserLoading && user && !canView) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            عذراً، لا تمتلك الصلاحية الكافية لعرض لوحة المعلومات. يرجى مراجعة مدير النظام للحصول على الصلاحية.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="mt-2">
            العودة للرئيسية
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const completionRate = requestStats?.total 
    ? Math.round(((requestStats?.byStatus?.completed || 0) / requestStats.total) * 100) 
    : 0;

  // دالة موحدة لرسم أي بطاقة بنفس الـ UI الأصلي للمنظومة
  const renderCard = (stat: {
    title: string;
    value: string | number;
    subtext?: string;
    icon: any;
    gradient: string;
    bgLight: string;
    isCurrency?: boolean;
    change?: number;
  }, key: any) => (
    <Card key={key} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all bg-card">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <p className="text-xl sm:text-3xl font-bold text-foreground leading-none font-sans">
                {stat.value}
              </p>
              {stat.isCurrency && <SaudiRiyal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />}
            </div>
            {stat.subtext && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {stat.subtext}
              </p>
            )}
            {typeof stat.change === "number" && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {stat.change >= 0 ? (
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                ) : (
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 transform scale-y-[-1]" />
                )}
                <span className={`text-[10px] sm:text-xs font-semibold ${stat.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {stat.change >= 0 ? "+" : ""}{stat.change}%
                </span>
                <span className="text-[9px] sm:text-[11px] text-muted-foreground whitespace-nowrap">هذا الشهر</span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md shrink-0 order-first sm:order-last text-white`}>
            <stat.icon className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
        </div>
        {/* Decorative element */}
        <div className={`absolute -bottom-4 -left-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full ${stat.bgLight} opacity-50 pointer-events-none`} />
      </CardContent>
    </Card>
  );

  // 1. المؤشرات الرئيسية الإجمالية
  const mainOverviewCardDefs = [
    {
      id: "main_total_requests",
      title: "إجمالي الطلبات",
      value: (requestStats?.total || 0).toLocaleString("en-US"),
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      change: growthStats?.totalRequests.percentage,
      subtext: "طلب مسجل بالبوابة",
    },
    {
      id: "main_registered_mosques",
      title: "المساجد المسجلة",
      value: (mosqueStats?.total || 0).toLocaleString("en-US"),
      icon: Building2,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      change: growthStats?.registeredMosques.percentage,
      subtext: "مسجد وجامع معتمد",
    },
    {
      id: "main_in_progress_requests",
      title: "قيد التنفيذ",
      value: (requestStats?.byStatus?.in_progress || 0).toLocaleString("en-US"),
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
      change: growthStats?.inProgressRequests.percentage,
      subtext: "بمختلف المراحل النشطة",
    },
    {
      id: "main_completed_requests",
      title: "مكتملة",
      value: (requestStats?.byStatus?.completed || 0).toLocaleString("en-US"),
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      bgLight: "bg-green-50 dark:bg-green-950/40",
      change: growthStats?.completedRequests.percentage,
      subtext: `نسبة الإنجاز: ${completionRate}%`,
    },
    {
      id: "main_approved_contracts",
      title: "العقود المعتمدة",
      value: ((disbursementStats as any)?.approvedContractsAmount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      icon: Briefcase,
      gradient: "from-indigo-500 to-indigo-600",
      bgLight: "bg-indigo-50 dark:bg-indigo-950/40",
      subtext: `${(disbursementStats as any)?.approvedContractsCount || 0} عقود نشطة`,
    },
    {
      id: "main_paid_amounts",
      title: "المبالغ المصروفة",
      value: ((disbursementStats as any)?.totalPaid || (disbursementStats as any)?.approvedOrdersAmount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      icon: Receipt,
      gradient: "from-rose-500 to-rose-600",
      bgLight: "bg-rose-50 dark:bg-rose-950/40",
      subtext: `${(disbursementStats as any)?.executedOrders || 0} أمر صرف منفذ`,
    },
    {
      id: "main_receipt_vouchers",
      title: "سندات القبض",
      value: ((disbursementStats as any)?.approvedReceiptVouchersAmount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      icon: Wallet,
      gradient: "from-teal-500 to-teal-600",
      bgLight: "bg-teal-50 dark:bg-teal-950/40",
      subtext: `${(disbursementStats as any)?.approvedReceiptVouchersCount || 0} سند معتمد`,
    },
    {
      id: "main_active_projects",
      title: "المشاريع النشطة",
      value: ((projectStats as any)?.active || projectStats?.total || 0).toLocaleString("en-US"),
      icon: FolderKanban,
      gradient: "from-violet-500 to-violet-600",
      bgLight: "bg-violet-50 dark:bg-violet-950/40",
      subtext: `الميزانية: ${(parseFloat(projectStats?.totalBudget || "0")).toLocaleString("en-US", { maximumFractionDigits: 0 })} ر.س`,
    },
  ];

  const mainOverviewCards = mainOverviewCardDefs.filter(c => isDetailedElementEnabled(c.id));

  // 2. كروت تبويب المساجد
  const boardMosquesTotal = boardStats?.mosques?.total ?? mosqueStats?.total ?? 0;
  const boardMosquesActive = boardStats?.mosques?.active ?? (mosqueStats as any)?.active ?? 0;
  const boardMosquesRecent = boardStats?.mosques?.recent ?? 0;
  const boardMosqueCoverage = boardMosquesTotal > 0 ? Math.round((boardMosquesActive / boardMosquesTotal) * 100) : 100;

  const mosqueCardDefs = [
    {
      id: "mosque_total",
      title: "المساجد المسجلة",
      value: boardMosquesTotal.toLocaleString("en-US"),
      subtext: "مسجلة رسمياً بالبوابة",
      icon: Building2,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      id: "mosque_active",
      title: "المساجد النشطة",
      value: boardMosquesActive.toLocaleString("en-US"),
      subtext: "تتلقى الخدمات والزيارات",
      icon: Activity,
      gradient: "from-teal-500 to-teal-600",
      bgLight: "bg-teal-50 dark:bg-teal-950/40",
    },
    {
      id: "mosque_recent",
      title: "مساجد جديدة (30 يوم)",
      value: `+${boardMosquesRecent.toLocaleString("en-US")}`,
      subtext: "نمو تسجيلي مستمر",
      icon: Clock,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: "mosque_coverage",
      title: "نسبة التغطية",
      value: `${boardMosqueCoverage}%`,
      subtext: "مساجد مفعّلة بالخدمات",
      icon: Target,
      gradient: "from-purple-500 to-purple-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  const mosqueCards = mosqueCardDefs.filter(c => isDetailedElementEnabled(c.id));

  // 3. كروت تبويب الطلبات
  const boardRequestsTotal = boardStats?.requests?.total ?? requestStats?.total ?? 0;
  const boardRequestsCompleted = boardStats?.requests?.approved ?? requestStats?.byStatus?.completed ?? 0;
  const boardRequestsInProgress = (boardStats?.requests?.inProgress ?? 0) + (boardStats?.requests?.pending ?? 0) || (requestStats?.byStatus?.in_progress ?? 0);
  const boardRequestsRejected = boardStats?.requests?.rejected ?? requestStats?.byStatus?.rejected ?? 0;

  const requestCardDefs = [
    {
      id: "request_total",
      title: "إجمالي الطلبات",
      value: boardRequestsTotal.toLocaleString("en-US"),
      subtext: "كافة طلبات الخدمات",
      icon: FileText,
      gradient: "from-blue-600 to-indigo-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: "request_completed",
      title: "الطلبات المكتملة",
      value: boardRequestsCompleted.toLocaleString("en-US"),
      subtext: "تم إنجازها بنجاح",
      icon: CheckCircle2,
      gradient: "from-green-500 to-emerald-600",
      bgLight: "bg-green-50 dark:bg-green-950/40",
    },
    {
      id: "request_in_progress",
      title: "قيد التنفيذ",
      value: boardRequestsInProgress.toLocaleString("en-US"),
      subtext: "مراحل دراسة وتنفيذ",
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      id: "request_rejected",
      title: "الطلبات المرفوضة",
      value: boardRequestsRejected.toLocaleString("en-US"),
      subtext: "لعدم اكتمال المتطلبات",
      icon: XCircle,
      gradient: "from-rose-500 to-red-600",
      bgLight: "bg-rose-50 dark:bg-rose-950/40",
    },
  ];

  const requestCards = requestCardDefs.filter(c => isDetailedElementEnabled(c.id));

  // 4. كروت تبويب المشتريات والعقود
  const boardSuppliersTotal = boardStats?.procurement?.totalSuppliers ?? supplierStats?.total ?? 0;
  const boardSuppliersApproved = boardStats?.procurement?.approvedSuppliers ?? supplierStats?.approved ?? 0;
  const boardContractsCount = boardStats?.procurement?.totalContracts ?? (disbursementStats as any)?.approvedContractsCount ?? 0;
  const boardContractsValue = boardStats?.procurement?.totalContractsValue ?? (disbursementStats as any)?.approvedContractsAmount ?? 0;

  const procurementCardDefs = [
    {
      id: "procurement_suppliers_total",
      title: "إجمالي الموردين",
      value: boardSuppliersTotal.toLocaleString("en-US"),
      subtext: "موردون بالشبكة",
      icon: Store,
      gradient: "from-orange-500 to-amber-600",
      bgLight: "bg-orange-50 dark:bg-orange-950/40",
    },
    {
      id: "procurement_suppliers_approved",
      title: "موردون معتمدون",
      value: boardSuppliersApproved.toLocaleString("en-US"),
      subtext: "منشآت مؤهلة رسمياً",
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      id: "procurement_contracts_count",
      title: "العقود المعتمدة",
      value: boardContractsCount.toLocaleString("en-US"),
      subtext: "عقود رسمية سارية",
      icon: FileSpreadsheet,
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: "procurement_contracts_value",
      title: "قيمة العقود",
      value: Number(boardContractsValue).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      subtext: "مجموع قيم العقود",
      icon: Wallet,
      gradient: "from-purple-500 to-violet-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  const procurementCards = procurementCardDefs.filter(c => isDetailedElementEnabled(c.id));

  // 5. كروت تبويب المالية والصرف
  const boardDisbReqCount = boardStats?.financials?.approvedDisbursementRequestsCount ?? (disbursementStats as any)?.approvedRequests ?? 0;
  const boardDisbOrdersCount = boardStats?.financials?.executiveApprovedOrdersCount ?? (disbursementStats as any)?.totalOrders ?? 0;
  const boardDisbAmount = boardStats?.financials?.executedDisbursementOrdersAmount ?? (disbursementStats as any)?.totalPaid ?? 0;
  const boardReceiptsCount = boardStats?.financials?.approvedReceiptVouchersCount ?? (disbursementStats as any)?.approvedReceiptVouchersCount ?? 0;
  const boardReceiptsAmount = boardStats?.financials?.approvedReceiptVouchersAmount ?? (disbursementStats as any)?.approvedReceiptVouchersAmount ?? 0;

  const financialCardDefs = [
    {
      id: "financial_disb_requests",
      title: "طلبات الصرف",
      value: boardDisbReqCount.toLocaleString("en-US"),
      subtext: "طلبات معتمدة رسمياً",
      icon: Receipt,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      id: "financial_disb_orders",
      title: "أوامر الصرف",
      value: boardDisbOrdersCount.toLocaleString("en-US"),
      subtext: "أوامر معتمدة للتحويل",
      icon: FileCheck2,
      gradient: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      id: "financial_total_expenses",
      title: "إجمالي المصروفات",
      value: Number(boardDisbAmount).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      subtext: "أوامر صرف منفذة بنكياً",
      icon: Banknote,
      gradient: "from-blue-600 to-cyan-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: "financial_receipt_vouchers",
      title: "سندات القبض",
      value: boardReceiptsCount.toLocaleString("en-US"),
      subtext: `بمبلغ: ${Number(boardReceiptsAmount).toLocaleString("en-US", { maximumFractionDigits: 0 })} ر.س`,
      icon: Wallet,
      gradient: "from-purple-600 to-indigo-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  const financialCards = financialCardDefs.filter(c => isDetailedElementEnabled(c.id));

  // 6. كروت تبويب المشاريع وسندات القبض
  const finApprovedVouchers = allReceiptVouchersData.filter((v: any) => v.status === "approved");
  const finApprovedVouchersAmount = finApprovedVouchers.reduce((acc: number, v: any) => acc + (parseFloat(v.amount) || 0), 0);
  const finTotalProjectsCount = financialReportData?.byProject?.length ?? projectStats?.total ?? 0;
  const finTotalProjectsBudget = parseFloat(projectStats?.totalBudget || "0");

  const projectAndVoucherCardDefs = [
    {
      id: "project_vouchers_amount",
      title: "مبالغ سندات القبض",
      value: Number(finApprovedVouchersAmount || (disbursementStats as any)?.approvedReceiptVouchersAmount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      subtext: `من واقع ${finApprovedVouchers.length} سند معتمد`,
      icon: Wallet,
      gradient: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      id: "project_support_projects",
      title: "مشاريع الدعم",
      value: finTotalProjectsCount.toLocaleString("en-US"),
      subtext: `نشط: ${(projectStats as any)?.active || 0} | مكتمل: ${(projectStats as any)?.completed || 0}`,
      icon: FolderKanban,
      gradient: "from-indigo-500 to-violet-600",
      bgLight: "bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      id: "project_budget",
      title: "ميزانية المشاريع",
      value: Number(finTotalProjectsBudget).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      subtext: "الموازنة الكلية المعتمدة",
      icon: Banknote,
      gradient: "from-purple-500 to-indigo-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
    },
    {
      id: "project_paid_amount",
      title: "المبالغ المصروفة",
      value: Number((financialReportData?.summary?.totalOrderAmount || (disbursementStats as any)?.totalPaid || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      subtext: "المصروف الفعلي المنفذ",
      icon: Banknote,
      gradient: "from-teal-500 to-teal-600",
      bgLight: "bg-teal-50 dark:bg-teal-950/40",
    },
  ];

  const projectAndVoucherCards = projectAndVoucherCardDefs.filter(c => isDetailedElementEnabled(c.id));

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* ========================================================================= */}
        {/* 1. الهيدر الفاخر لرسالة الترحيب ونسبة الإنجاز وتخصيص اللوحة والدعم الفني */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-4 sm:px-6 py-4 sm:py-6 text-white shadow-lg">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-white/60 text-[10px] sm:text-xs">
                <Activity className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
                <span>/</span>
                <span className="text-white font-medium">لوحة المعلومات</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/30" />
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate" title={user?.name}>
                  لوحة المعلومات الشاملة
                </h1>
                <div className="hidden sm:block w-px h-4 bg-white/40" />
                <span className="text-white/80 text-[10px] sm:text-sm font-medium bg-white/15 rounded-full px-2 sm:px-3 py-0.5 whitespace-nowrap">
                  {roleLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap sm:flex-nowrap shrink-0">
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 w-fit shrink-0">
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">نسبة الإنجاز: {completionRate}%</span>
              </div>
              {isSuperAdmin && (
                <Link href="/forms-customization/dashboard">
                  <Button
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-10 rounded-xl shadow-xs cursor-pointer"
                    title="تخصيص عناصر وأقسام لوحة المعلومات"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">تخصيص اللوحة</span>
                  </Button>
                </Link>
              )}
              <Link href="/support">
                <Button 
                  size="default" 
                  variant="ghost" 
                  className="group flex items-center gap-2.5 bg-[#fafaf9] hover:bg-[#f4f4f3] text-teal-950 rounded-xl px-5 h-10 border border-neutral-200/30 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
                  title="طلب الدعم الفني"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-[ping_3s_infinite] absolute inline-flex h-full w-full rounded-full bg-emerald-600/30"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <LifeBuoy className="w-4 h-4 shrink-0 text-teal-700 transition-transform group-hover:rotate-12 duration-500" />
                  <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">الدعم الفني</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* أزرار الانتقال السريع بين الأقسام */}
        {isDetailedElementEnabled("quick_nav") && (
          <div className="sticky top-2 z-20 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1">انتقال سريع:</span>
              {isDetailedElementEnabled("section_board") && (
                <button
                  type="button"
                  onClick={() => scrollToSection("section-board")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-500/30 transition-colors shrink-0 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  <span>مخططات مجلس الإدارة</span>
                </button>
              )}
              {isDetailedElementEnabled("section_financial") && (
                <button
                  type="button"
                  onClick={() => scrollToSection("section-financial")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors shrink-0 cursor-pointer"
                >
                  <SaudiRiyal className="w-3.5 h-3.5 text-emerald-600" />
                  <span>التقرير المالي</span>
                </button>
              )}
              {isDetailedElementEnabled("section_reports") && (
                <button
                  type="button"
                  onClick={() => scrollToSection("section-reports")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-colors shrink-0 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                  <span>تقارير الطلبات</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. بطاقات المؤشرات الرقمية الرئيسية */}
        {/* ========================================================================= */}
        {mainOverviewCards.length > 0 && (
          <div id="section-cards" className="space-y-4 scroll-mt-28">
            <div className="flex items-center gap-2 pb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                المؤشرات الرقمية والبطاقات الرئيسية
              </h2>
              <span className="text-xs text-muted-foreground mr-1">
                (الملخص الإجمالي للطلبات، المساجد، العقود، والمصروفات)
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {mainOverviewCards.map((stat, idx) => renderCard(stat, `main-${idx}`))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. بطاقات كافة التبويبات بالمنظومة */}
        {/* ========================================================================= */}
        {(mosqueCards.length > 0 || requestCards.length > 0 || procurementCards.length > 0 || financialCards.length > 0 || projectAndVoucherCards.length > 0) && (
          <div id="section-tabs-cards" className="space-y-6 pt-4 border-t border-border/60 scroll-mt-28">
            {/* أ) إحصائيات المساجد */}
            {mosqueCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-foreground">إحصائيات المساجد</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {mosqueCards.map((stat, idx) => renderCard(stat, `mosque-${idx}`))}
                </div>
              </div>
            )}

            {/* ب) إحصائيات الطلبات */}
            {requestCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-foreground">إحصائيات الطلبات</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {requestCards.map((stat, idx) => renderCard(stat, `req-${idx}`))}
                </div>
              </div>
            )}

            {/* ج) المشتريات والعقود */}
            {procurementCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-600" />
                  <h4 className="text-sm font-bold text-foreground">المشتريات والعقود</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {procurementCards.map((stat, idx) => renderCard(stat, `proc-${idx}`))}
                </div>
              </div>
            )}

            {/* د) المالية وأوامر الصرف */}
            {financialCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-foreground">المالية وأوامر الصرف</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {financialCards.map((stat, idx) => renderCard(stat, `fin-${idx}`))}
                </div>
              </div>
            )}

            {/* هـ) التقرير المالي والمشاريع */}
            {projectAndVoucherCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <SaudiRiyal className="w-4 h-4 text-teal-600" />
                  <h4 className="text-sm font-bold text-foreground">التقرير المالي والمشاريع</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {projectAndVoucherCards.map((stat, idx) => renderCard(stat, `pv-${idx}`))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. الإحصائيات والمخططات والتحليلات */}
        {/* ========================================================================= */}

        {/* أ) المخططات والتحليلات الخاصة بمجلس الإدارة والإدارة العليا */}
        {isDetailedElementEnabled("section_board") && (
          <div id="section-board" className="space-y-4 pt-8 border-t-2 border-border/80 scroll-mt-28">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/20">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    مخططات وتحليلات مجلس الإدارة والمؤشرات الإستراتيجية
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    مخططات المساجد، توزيع عقود المشاريع، مؤشرات أوامر الصرف، ومصفوفة الأداء الإستراتيجي
                  </p>
                </div>
              </div>
            </div>
            <BoardDashboard embedded={true} forceAnalytics={true} />
          </div>
        )}

        {/* ب) المخططات والتحليلات المالية الشاملة */}
        {isDetailedElementEnabled("section_financial") && (
          <div id="section-financial" className="space-y-4 pt-8 border-t-2 border-border/80 scroll-mt-28">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/20">
                  <SaudiRiyal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    المخططات والتحليلات المالية الشاملة
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    الرسوم البيانية للتدفقات النقدية، المصروفات، سندات القبض، وتحليلات مشاريع الدعم والتغطية
                  </p>
                </div>
              </div>
            </div>
            <FinancialReport embedded={true} />
          </div>
        )}

        {/* ج) مخططات التقارير الإحصائية للطلبات */}
        {isDetailedElementEnabled("section_reports") && (
          <div id="section-reports" className="space-y-4 pt-8 border-t-2 border-border/80 scroll-mt-28">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm border border-purple-500/20">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    المخططات الإحصائية والفنية للطلبات
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    مخططات توزيع الطلبات على البرامج التسعة، والمنحنى الشهري لتطور الطلبات
                  </p>
                </div>
              </div>
            </div>
            <Reports embedded={true} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. تنبيه المستخدمين بانتظار الاعتماد */}
        {/* ========================================================================= */}
        {isDetailedElementEnabled("section_pending_users") && pendingUsers && pendingUsers.length > 0 && (
          <div className="pt-4 border-t border-border/60">
            <Card className="border-0 shadow-sm border-r-4 border-r-rose-500 rounded-2xl bg-card">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/80 dark:border-rose-800/80">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      يوجد <span className="text-rose-600 font-black">{pendingUsers.length}</span> مستخدم بانتظار المراجعة والاعتماد
                    </p>
                    <p className="text-[11px] text-muted-foreground">يتطلب اتخاذ إجراء إداري لتفعيل الحسابات</p>
                  </div>
                </div>
                <Link href="/requester-approvals">
                  <Button size="sm" variant="outline" className="text-xs font-bold hover:border-rose-300 hover:text-rose-600 gap-1 rounded-xl">
                    <span>مراجعة الطلبات</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
