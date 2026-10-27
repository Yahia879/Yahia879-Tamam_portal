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

  type SectionTab = "all" | "board" | "financial" | "reports";
  const [activeTab, setActiveTab] = useState<SectionTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as SectionTab;
      if (tab === "board" || tab === "financial" || tab === "reports") return tab;
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
                <p className="text-[10px] text-muted-foreground hidden md:block truncate">
                  عرض تحليلي شامل لمؤشرات المنظومة والمشاريع والمالية والطلبات
                </p>
              </div>
            </div>
          </div>

          {/* اليسار: أدوات التحكم وملء الشاشة */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 bg-muted/60 dark:bg-muted/30 border border-border/60 rounded-xl px-3 py-1.5 text-xs">
              <Target className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground font-medium">نسبة الإنجاز:</span>
              <span className="font-bold text-foreground">{completionRate}%</span>
            </div>

            {isSuperAdmin && (
              <Link href="/forms-customization/dashboard">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold gap-1.5 h-9 rounded-xl border-border/80 hover:bg-primary/5 hover:text-primary cursor-pointer shadow-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تخصيص اللوحة</span>
                </Button>
              </Link>
            )}

            {/* زر ملء الشاشة الكامل */}
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

        {/* 2. شريط التنقل المحوري والتبديل بين الأقسام */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
              <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1 hidden lg:inline">
                الأقسام:
              </span>
              {[
                { id: "all" as const, label: "كافة الأقسام", icon: LayoutGrid, color: "text-primary", badge: "عرض شامل" },
                ...(isDetailedElementEnabled("section_board")
                  ? [{ id: "board" as const, label: "مجلس الإدارة والقيادة العليا", icon: Briefcase, color: "text-blue-600", badge: "الإدارة العليا" }]
                  : []),
                ...(isDetailedElementEnabled("section_financial")
                  ? [{ id: "financial" as const, label: "التقرير والتحليلات المالية", icon: SaudiRiyal, color: "text-emerald-600", badge: "المالية" }]
                  : []),
                ...(isDetailedElementEnabled("section_reports")
                  ? [{ id: "reports" as const, label: "التقارير الفنية والإحصائية", icon: BarChart3, color: "text-purple-600", badge: "الطلبات" }]
                  : []),
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
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

            {activeTab === "all" && (
              <div className="hidden xl:flex items-center gap-2.5 shrink-0 text-xs text-muted-foreground border-r border-border/80 pr-3 mr-2">
                <span className="font-bold text-foreground">انتقال سريع:</span>
                {isDetailedElementEnabled("section_board") && (
                  <button
                    type="button"
                    onClick={() => scrollToSection("section-board")}
                    className="hover:text-blue-600 transition-colors font-medium hover:underline cursor-pointer"
                  >
                    مجلس الإدارة
                  </button>
                )}
                {isDetailedElementEnabled("section_financial") && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => scrollToSection("section-financial")}
                      className="hover:text-emerald-600 transition-colors font-medium hover:underline cursor-pointer"
                    >
                      المالية
                    </button>
                  </>
                )}
                {isDetailedElementEnabled("section_reports") && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => scrollToSection("section-reports")}
                      className="hover:text-purple-600 transition-colors font-medium hover:underline cursor-pointer"
                    >
                      التقارير
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ملخص المؤشرات الرقمية العامة عند اختيار كافة الأقسام */}
        {activeTab === "all" && mainOverviewCards.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 pb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                المؤشرات الرقمية القيادية العامة
              </h3>
              <span className="text-xs text-muted-foreground mr-1">
                (الملخص الإجمالي لكافة أعمال المنظومة)
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {mainOverviewCards.slice(0, 4).map((stat, idx) => renderCard(stat, `headline-${idx}`))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* القسم الأول: تحليلات مجلس الإدارة والقيادة العليا (board-analytics) */}
        {/* ========================================================================= */}
        {isDetailedElementEnabled("section_board") && (activeTab === "all" || activeTab === "board") && (
          <section id="section-board" className="space-y-6 pt-2 scroll-mt-36">
            {/* هيدر قسم مجلس الإدارة */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      تحليلات مجلس الإدارة والقيادة العليا
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 shrink-0">
                      لوحة الإدارة العليا
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مؤشرات المساجد الفعالة، المشتريات وشبكة الموردين، العقود المعتمدة، ومصفوفة الأداء الإستراتيجي
                  </p>
                </div>
              </div>
              <Link href="/board-analytics">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-blue-300 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 shrink-0 cursor-pointer">
                  <span>فتح لوحة مجلس الإدارة</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم مجلس الإدارة */}
            {(mosqueCards.length > 0 || procurementCards.length > 0) && (
              <div className="space-y-5">
                {mosqueCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">إحصائيات المساجد والتغطية</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {mosqueCards.map((stat, idx) => renderCard(stat, `mosque-${idx}`))}
                    </div>
                  </div>
                )}

                {procurementCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-orange-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">المشتريات وشبكة الموردين والعقود</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {procurementCards.map((stat, idx) => renderCard(stat, `proc-${idx}`))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* مخططات قسم مجلس الإدارة */}
            <div className="pt-2">
              <BoardDashboard embedded={true} forceAnalytics={true} />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* القسم الثاني: التقرير والتحليلات المالية (financial-report) */}
        {/* ========================================================================= */}
        {isDetailedElementEnabled("section_financial") && (activeTab === "all" || activeTab === "financial") && (
          <section id="section-financial" className="space-y-6 pt-6 border-t-2 border-border/80 scroll-mt-36">
            {/* هيدر قسم المالية */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20 shrink-0">
                  <SaudiRiyal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      التقرير والتحليلات المالية الشاملة
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                      المالية والصرف
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الرسوم البيانية للتدفقات النقدية، أوامر الصرف المنفذة، سندات القبض، ومشاريع الدعم والتغطية
                  </p>
                </div>
              </div>
              <Link href="/financial-report">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-emerald-300 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer">
                  <span>فتح التقرير المالي</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم المالية */}
            {(financialCards.length > 0 || projectAndVoucherCards.length > 0) && (
              <div className="space-y-5">
                {financialCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">المالية وأوامر الصرف</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {financialCards.map((stat, idx) => renderCard(stat, `fin-${idx}`))}
                    </div>
                  </div>
                )}

                {projectAndVoucherCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <SaudiRiyal className="w-4 h-4 text-teal-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">مشاريع الدعم وسندات القبض</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {projectAndVoucherCards.map((stat, idx) => renderCard(stat, `pv-${idx}`))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* مخططات قسم المالية */}
            <div className="pt-2">
              <FinancialReport embedded={true} />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* القسم الثالث: التقارير الفنية والإحصائية (reports) */}
        {/* ========================================================================= */}
        {isDetailedElementEnabled("section_reports") && (activeTab === "all" || activeTab === "reports") && (
          <section id="section-reports" className="space-y-6 pt-6 border-t-2 border-border/80 scroll-mt-36">
            {/* هيدر قسم التقارير */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-500/20 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                      التقارير الفنية والإحصائية للطلبات
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 shrink-0">
                      تقارير الطلبات
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مخططات توزيع الطلبات على البرامج التسعة، والمنحنى الشهري لتطور الطلبات ومراحل الإنجاز
                  </p>
                </div>
              </div>
              <Link href="/reports">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl border-purple-300 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 shrink-0 cursor-pointer">
                  <span>فتح التقارير الفنية</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* كروت قسم التقارير */}
            {(mainOverviewCards.length > 0 || requestCards.length > 0) && (
              <div className="space-y-5">
                {mainOverviewCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">المؤشرات الإجمالية العامة</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {mainOverviewCards.map((stat, idx) => renderCard(stat, `main-${idx}`))}
                    </div>
                  </div>
                )}

                {requestCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">تفصيل حالات الطلبات</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {requestCards.map((stat, idx) => renderCard(stat, `req-${idx}`))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* مخططات قسم التقارير */}
            <div className="pt-2">
              <Reports embedded={true} />
            </div>
          </section>
        )}

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
            </main>
    </div>
  );
}
