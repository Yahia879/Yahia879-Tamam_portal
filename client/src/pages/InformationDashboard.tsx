import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
// DashboardLayout removed to support native full screen view
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
  Shield,
  FileSpreadsheet,
  FileCheck2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
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
  const canView = hasInfoPerm;

  type SectionTab = "all" | "mosques" | "requests" | "procurement" | "financial";
  const [activeTab, setActiveTab] = useState<SectionTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as SectionTab;
      if (["mosques", "requests", "procurement", "financial"].includes(tab)) return tab;
    } catch {}
    return "all";
  });

  const handleTabChange = (tab: SectionTab) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      if (tab === "all") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // محاولة تفعيل ملء الشاشة تلقائياً عند فتح الصفحة
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // يتطلب المتصفح تفاعل المستخدم أولاً، والزر في الهيدر جاهز
        });
      }
    } catch {}

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  };

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
      <div className="min-h-screen w-full bg-slate-50/60 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md p-8 rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-4 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-muted-foreground">
            عذراً، لا تمتلك الصلاحية الكافية لعرض لوحة المعلومات. يرجى مراجعة مدير النظام للحصول على الصلاحية.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="mt-2 rounded-xl">
            العودة للرئيسية
          </Button>
        </div>
      </div>
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


  return (
    <div className="min-h-screen w-full bg-slate-50/60 dark:bg-zinc-950 text-foreground flex flex-col font-sans">
      {/* شريط التحكم العلوي الخاص بوضع الشاشة الكاملة */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* اليمين: زر العودة + الشعار والعنوان */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2 rounded-xl text-xs font-bold border-border/80 hover:bg-primary/5 hover:text-primary transition-all shrink-0 cursor-pointer shadow-xs"
              title="العودة للرئيسية والمنظومة"
            >
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">العودة للرئيسية</span>
            </Button>

            <div className="h-5 w-px bg-border/80 hidden sm:block" />

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                    لوحة المعلومات
                  </h1>
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* اليسار: أدوات التحكم وملء الشاشة */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1.5 text-xs font-bold rounded-xl h-9 cursor-pointer shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              title={isFullscreen ? "إنهاء وضع ملء الشاشة (Esc)" : "تفعيل وضع ملء الشاشة الكامل"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">إنهاء ملء الشاشة</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">ملء الشاشة</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1920px] mx-auto">
        

        {/* 2. شريط التنقل المحوري والتبديل بين الأقسام */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
              <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1 hidden xl:inline">
                الأقسام:
              </span>
              {[
                { id: "all" as const, label: "عرض شامل", icon: LayoutGrid, color: "text-primary", badge: "الكل" },
                { id: "mosques" as const, label: "المساجد والتغطية", icon: Building2, color: "text-emerald-600", badge: "المساجد" },
                { id: "requests" as const, label: "الطلبات والبرامج", icon: FileText, color: "text-blue-600", badge: "الطلبات" },
                { id: "procurement" as const, label: "المشاريع والعقود", icon: Briefcase, color: "text-amber-600", badge: "المشاريع" },
                { id: "financial" as const, label: "المالية والصرف", icon: SaudiRiyal, color: "text-teal-600", badge: "المالية" },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.02]"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : tab.color}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground border border-border/50"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. قسم المساجد والزيارات الميدانية */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "mosques") && (
          <section id="section-mosques" className="space-y-6 pt-2 scroll-mt-36">
            {/* هيدر قسم المساجد */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      إحصائيات وتغطية المساجد والجوامع
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                      قطاع المساجد
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    المساجد المعتمدة رسمياً، المساجد النشطة المستفيدة من الخدمات، ونسب التغطية الميدانية والنمو
                  </p>
                </div>
              </div>
              <Link href="/mosques">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-emerald-300 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer">
                  <span>فتح دليل المساجد</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم المساجد */}
            {mosqueCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">مؤشرات المساجد والانتشار الميداني</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {mosqueCards.map((stat, idx) => renderCard(stat, `mosque-${idx}`))}
                </div>
              </div>
            )}

            {/* مخططات قسم المساجد من لوحة التحليلات */}
            <div className="pt-2">
              <BoardDashboard embedded={true} forceAnalytics={true} initialTab="mosques" hideTabs={true} hideCards={true} />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 2. قسم الطلبات وبرامج الخدمات */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "requests") && (
          <section id="section-requests" className="space-y-6 pt-6 border-t-2 border-border/80 scroll-mt-36">
            {/* هيدر قسم الطلبات */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      إحصائيات الطلبات وبرامج الخدمات التسعة
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 shrink-0">
                      تقارير الطلبات
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مخططات توزيع الطلبات على البرامج التسعة، والمنحنى الشهري لتطور الطلبات ومراحل الإنجاز
                  </p>
                </div>
              </div>
              <Link href="/requests">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-blue-300 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 shrink-0 cursor-pointer">
                  <span>فتح سجل الطلبات</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم الطلبات */}
            {requestCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">تفصيل حالات الطلبات ومراحل المعالجة</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {requestCards.map((stat, idx) => renderCard(stat, `req-${idx}`))}
                </div>
              </div>
            )}

            {/* مخططات التقارير الفنية للطلبات */}
            <div className="pt-2">
              <Reports embedded={true} />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 3. قسم المشاريع والعقود والمشتريات */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "procurement") && (
          <section id="section-procurement" className="space-y-6 pt-6 border-t-2 border-border/80 scroll-mt-36">
            {/* هيدر قسم المشاريع والعقود */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      المشاريع والعقود وشبكة الموردين
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                      المشاريع والعقود
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مشاريع الدعم، الميزانيات المعتمدة، شبكة الموردين المؤهلين، ومجموع قيم العقود الرسمية
                  </p>
                </div>
              </div>
              <Link href="/projects">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-amber-300 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0 cursor-pointer">
                  <span>فتح إدارة المشاريع</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم المشاريع والعقود */}
            {(procurementCards.length > 0 || projectAndVoucherCards.length > 0) && (
              <div className="space-y-5">
                {procurementCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">المشتريات وشبكة الموردين والعقود</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {procurementCards.map((stat, idx) => renderCard(stat, `proc-${idx}`))}
                    </div>
                  </div>
                )}

                {projectAndVoucherCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-violet-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">مشاريع الدعم والميزانيات</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {projectAndVoucherCards.map((stat, idx) => renderCard(stat, `pv-${idx}`))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* مخططات المشتريات والعقود من لوحة التحليلات */}
            <div className="pt-2">
              <BoardDashboard embedded={true} forceAnalytics={true} initialTab="procurement" hideTabs={true} hideCards={true} />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 4. قسم المالية وأوامر الصرف والتدفقات */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "financial") && (
          <section id="section-financial" className="space-y-6 pt-6 border-t-2 border-border/80 scroll-mt-36">
            {/* هيدر قسم المالية */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md shadow-teal-500/20 shrink-0">
                  <SaudiRiyal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      التقرير والتحليلات المالية والتدفقات النقدية
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shrink-0">
                      المالية والصرف
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الرسوم البيانية للتدفقات النقدية، أوامر الصرف المنفذة، سندات القبض، ومشاريع الدعم والتغطية
                  </p>
                </div>
              </div>
              <Link href="/financial-report">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-teal-300 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 shrink-0 cursor-pointer">
                  <span>فتح التقرير المالي</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم المالية */}
            {financialCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">مؤشرات المصروفات وأوامر الصرف وسندات القبض</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {financialCards.map((stat, idx) => renderCard(stat, `fin-${idx}`))}
                </div>
              </div>
            )}

            {/* المخططات المالية الشاملة */}
            <div className="pt-2">
              <FinancialReport embedded={true} />
            </div>
          </section>
        )}


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
            </main>
    </div>
  );
}
