import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Save,
  RotateCcw,
  CheckCircle2,
  X,
  Loader2,
  Layers,
  TrendingUp,
  Briefcase,
  Building2,
  FileText,
  Store,
  Banknote,
  FolderKanban,
  ShieldAlert,
  LayoutDashboard,
  Check,
  AlertTriangle,
  Plus,
  Target,
  Activity,
  Clock,
  Receipt,
  Wallet,
  FileSpreadsheet,
  FileCheck2,
  XCircle,
  Undo2,
  LifeBuoy,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import BoardDashboard from "@/pages/BoardDashboard";
import FinancialReport from "@/pages/FinancialReport";
import Reports from "@/pages/Reports";

const CATEGORY_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    iconBg: string;
    badgeColor: string;
  }
> = {
  main_cards: {
    icon: TrendingUp,
    accentColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-200/60 dark:bg-blue-950/40 dark:border-blue-800/40",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
  },
  mosque_cards: {
    icon: Building2,
    accentColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/40",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  request_cards: {
    icon: FileText,
    accentColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-200/60 dark:bg-cyan-950/40 dark:border-cyan-800/40",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
  procurement_cards: {
    icon: Store,
    accentColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-200/60 dark:bg-amber-950/40 dark:border-amber-800/40",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300",
  },
  financial_cards: {
    icon: Banknote,
    accentColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-800/40",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  project_cards: {
    icon: FolderKanban,
    accentColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-200/60 dark:bg-purple-950/40 dark:border-purple-800/40",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300",
  },
  major_sections: {
    icon: Layers,
    accentColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-200/60 dark:bg-rose-950/40 dark:border-rose-800/40",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

export default function FormsCustomizationDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const roleLabel = "مدير النظام الشامل";

  const utils = trpc.useUtils();

  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isRestoreSheetOpen, setIsRestoreSheetOpen] = useState(false);

  // استعلام الإعدادات
  const { data: configData, isLoading: isConfigLoading } = trpc.forms.getDetailedDashboardCustomizationConfig.useQuery();

  // جلب إحصائيات حية لنفس شاشة الـ Dashboard المفصلة
  const { data: requestStats } = trpc.requests.getStats.useQuery();
  const { data: mosqueStats } = trpc.mosques.getStats.useQuery();
  const { data: disbursementStats } = trpc.disbursements.getStats.useQuery();
  const { data: supplierStats } = trpc.suppliers.getStats.useQuery();
  const { data: growthStats } = trpc.analytics.getMonthlyGrowth.useQuery();
  const { data: projectStats } = trpc.projects.getStats.useQuery();
  const { data: boardStats } = trpc.board.getExecutiveStats.useQuery();
  const { data: financialReportData } = trpc.disbursements.getFinancialReport.useQuery();
  const { data: allReceiptVouchersData = [] } = trpc.projects.getAllReceiptVouchers.useQuery();
  const { data: pendingUsers = [] } = trpc.auth.getPendingUsers.useQuery();

  // تهيئة المعرفات عند تحميل البيانات
  useEffect(() => {
    if (configData?.enabledElementIds && !isInitialized) {
      setEnabledIds(configData.enabledElementIds);
      setInitialIds(configData.enabledElementIds);
      setIsInitialized(true);
    }
  }, [configData, isInitialized]);

  // حفظ التخصيص
  const saveMutation = trpc.forms.saveDetailedDashboardCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ تخصيص اللوحة المفصلة بنجاح وتطبيقه على النظام");
      setInitialIds(enabledIds);
      utils.forms.getDetailedDashboardCustomizationConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التخصيص");
    },
  });

  // استعادة الإعدادات الافتراضية
  const resetMutation = trpc.forms.resetDetailedDashboardCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تمت استعادة الإعدادات الافتراضية بنجاح");
      setShowResetDialog(false);
      utils.forms.getDetailedDashboardCustomizationConfig.invalidate().then((data: any) => {
        if (data?.enabledElementIds) {
          setEnabledIds(data.enabledElementIds);
          setInitialIds(data.enabledElementIds);
        }
      });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء استعادة الافتراضي");
    },
  });

  const allElements = useMemo(() => configData?.elements || [], [configData]);

  // العناصر المستبعدة حالياً (المخفية)
  const removedElements = useMemo(() => {
    return allElements.filter((el) => !enabledIds.includes(el.id));
  }, [allElements, enabledIds]);

  // هل يوجد تعديلات غير محفوظة؟
  const hasChanges = useMemo(() => {
    if (!isInitialized) return false;
    if (enabledIds.length !== initialIds.length) return true;
    const initialSet = new Set(initialIds);
    return enabledIds.some((id) => !initialSet.has(id));
  }, [enabledIds, initialIds, isInitialized]);

  // إزالة عنصر (إخفاءه من اللوحة عبر زر X)
  const handleRemoveElement = (id: string, title?: string) => {
    setEnabledIds((prev) => prev.filter((item) => item !== id));
    toast.info(`تم إخفاء "${title || id}" من اللوحة ونقله لصندوق الاستعادة`, {
      action: {
        label: "تراجع",
        onClick: () => handleRestoreElement(id, title),
      },
      duration: 3500,
    });
  };

  // إعادة إضافة عنصر إلى اللوحة
  const handleRestoreElement = (id: string, title?: string) => {
    setEnabledIds((prev) => Array.from(new Set([...prev, id])));
    toast.success(`تمت استعادة "${title || id}" إلى اللوحة`);
  };

  const isDetailedElementEnabled = (elementId: string) => enabledIds.includes(elementId);

  // دالة موحدة لرسم بطاقة الإحصائيات مع زر الإزالة (X)
  const renderCard = (stat: {
    id: string;
    title: string;
    value: string | number;
    subtext?: string;
    icon: any;
    gradient: string;
    bgLight: string;
    isCurrency?: boolean;
    change?: number;
  }) => (
    <div key={stat.id} className="relative group/card transition-all duration-200">
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all bg-card">
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
          <div className={`absolute -bottom-4 -left-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full ${stat.bgLight} opacity-50 pointer-events-none`} />
        </CardContent>
      </Card>

      {/* زر الإزالة X المباشر على كل كرت */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveElement(stat.id, stat.title);
        }}
        className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer border-2 border-white dark:border-slate-850"
        title={`إخفاء بطاقة "${stat.title}" من اللوحة`}
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );

  // حساب نسبة إنجاز الطلبات
  const completionRate = requestStats?.total 
    ? Math.round(((requestStats?.byStatus?.completed || 0) / requestStats.total) * 100) 
    : 0;

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

  const visibleMainCards = mainOverviewCardDefs.filter((c) => isDetailedElementEnabled(c.id));

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

  const visibleMosqueCards = mosqueCardDefs.filter((c) => isDetailedElementEnabled(c.id));

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

  const visibleRequestCards = requestCardDefs.filter((c) => isDetailedElementEnabled(c.id));

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

  const visibleProcurementCards = procurementCardDefs.filter((c) => isDetailedElementEnabled(c.id));

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

  const visibleFinancialCards = financialCardDefs.filter((c) => isDetailedElementEnabled(c.id));

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

  const visibleProjectCards = projectAndVoucherCardDefs.filter((c) => isDetailedElementEnabled(c.id));

  // خريطة لكافة كروت الإحصائيات للوصول لخصائصها البصرية
  const allCardDefsMap = useMemo(() => {
    const map = new Map<string, any>();
    [
      ...mainOverviewCardDefs,
      ...mosqueCardDefs,
      ...requestCardDefs,
      ...procurementCardDefs,
      ...financialCardDefs,
      ...projectAndVoucherCardDefs,
    ].forEach((card) => map.set(card.id, card));
    return map;
  }, [
    mainOverviewCardDefs,
    mosqueCardDefs,
    requestCardDefs,
    procurementCardDefs,
    financialCardDefs,
    projectAndVoucherCardDefs,
  ]);

  // دالة لرسم العنصر المستبعد بصرياً طبق الأصل في صندوق الاستعادة
  const renderRemovedVisualElement = (el: any) => {
    const meta = CATEGORY_META[el.category] || CATEGORY_META.main_cards;
    const cardDef = allCardDefsMap.get(el.id);

    // إذا كان كرت إحصائي عادي (28 بطاقة إحصائية)
    if (cardDef) {
      return (
        <div
          key={el.id}
          onClick={() => handleRestoreElement(el.id, el.title)}
          className="relative group/restoreCard rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 bg-card hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 p-4 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          {/* خلفية تزيينية خفيفة */}
          <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full ${cardDef.bgLight} opacity-40 pointer-events-none`} />

          {/* شارة التصنيف مع زر الإضافة العلوي */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${meta.badgeColor}`}>
              {el.categoryName}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRestoreElement(el.id, el.title);
              }}
              className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title={`إعادة إضافة ${el.title} للوحة`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* محتوى البطاقة الفعلي المطابق تماماً للوحة */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate">{cardDef.title}</p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className="text-xl sm:text-2xl font-bold text-foreground leading-none font-sans">
                  {cardDef.value}
                </p>
                {cardDef.isCurrency && <SaudiRiyal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </div>
              {cardDef.subtext && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {cardDef.subtext}
                </p>
              )}
              {typeof cardDef.change === "number" && (
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {cardDef.change >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-red-500 transform scale-y-[-1]" />
                  )}
                  <span className={`text-[10px] font-semibold ${cardDef.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {cardDef.change >= 0 ? "+" : ""}{cardDef.change}%
                  </span>
                  <span className="text-[9px] text-muted-foreground">هذا الشهر</span>
                </div>
              )}
            </div>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cardDef.gradient} flex items-center justify-center shadow-sm shrink-0 text-white`}>
              <cardDef.icon className="w-5 h-5" />
            </div>
          </div>

          {/* زر إعادة الإضافة أسفل الكرت */}
          <div className="pt-3 mt-3 border-t border-border/60 relative z-10">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRestoreElement(el.id, el.title);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إعادة إضافة للوحة</span>
            </Button>
          </div>
        </div>
      );
    }

    // إذا كان أحد الأقسام الكبرى (5 أقسام رئيسية)
    return (
      <div
        key={el.id}
        onClick={() => handleRestoreElement(el.id, el.title)}
        className="col-span-1 sm:col-span-2 relative group/restoreSection rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 bg-card hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 p-4 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[10px] px-2.5 py-0.5 rounded-md border font-bold ${meta.badgeColor}`}>
            {el.categoryName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRestoreElement(el.id, el.title);
            }}
            className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            title={`إعادة إضافة ${el.title} للوحة`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* نموذج بصري مصغر ومميز للقسم */}
        {el.id === "quick_nav" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                <LayoutDashboard className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{el.title}</h4>
                <p className="text-[11px] text-muted-foreground truncate">{el.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20 whitespace-nowrap">
                مخططات مجلس الإدارة
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 whitespace-nowrap">
                التقرير المالي
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20 whitespace-nowrap">
                تقارير الطلبات
              </span>
            </div>
          </div>
        )}

        {el.id === "section_board" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{el.title}</h4>
                <p className="text-[11px] text-muted-foreground truncate">{el.description}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">معاينة: تحليلات المساجد، عقود المشاريع، مؤشرات أوامر الصرف</span>
              <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                <BarChart3 className="w-4 h-4" />
                <span>لوحة قيادة تفاعلية متكاملة</span>
              </div>
            </div>
          </div>
        )}

        {el.id === "section_financial" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                <SaudiRiyal className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{el.title}</h4>
                <p className="text-[11px] text-muted-foreground truncate">{el.description}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">معاينة: التدفقات النقدية، المصروفات، سندات القبض، وتحليلات مشاريع الدعم</span>
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <Banknote className="w-4 h-4" />
                <span>التقرير المالي العام</span>
              </div>
            </div>
          </div>
        )}

        {el.id === "section_reports" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{el.title}</h4>
                <p className="text-[11px] text-muted-foreground truncate">{el.description}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">معاينة: توزيع الطلبات على البرامج التسعة والمنحنى الشهري</span>
              <div className="flex items-center gap-1.5 text-purple-600 font-bold">
                <Activity className="w-4 h-4" />
                <span>المخططات الإحصائية والفنية</span>
              </div>
            </div>
          </div>
        )}

        {el.id === "section_pending_users" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{el.title}</h4>
                <p className="text-[11px] text-muted-foreground truncate">{el.description}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 flex items-center justify-between text-[11px]">
              <span className="text-rose-700 dark:text-rose-300 font-medium">شريط تنبيه أحمر بارز للحسابات الجديدة بانتظار الاعتماد</span>
              <span className="text-rose-600 font-bold">تنبيه إداري</span>
            </div>
          </div>
        )}

        {/* زر إعادة الإضافة للقسم */}
        <div className="pt-3 mt-3 border-t border-border/60">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRestoreElement(el.id, el.title);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إعادة إضافة القسم للوحة</span>
          </Button>
        </div>
      </div>
    );
  };

  // تحقق صلاحية super_admin
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح بالدخول</h2>
          <p className="text-sm text-muted-foreground">
            تخصيص لوحة القيادة المفصلة متاح حصرياً لمدير النظام الشامل (Super Admin).
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/forms-customization")}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة لصفحة تخصيص النماذج
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const enabledCount = enabledIds.length;
  const totalCount = allElements.length;
  const disabledCount = removedElements.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-24" dir="rtl">
        {/* شريط الأدوات العلوي المثبت للتحكم والتخصيص */}
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/forms-customization">
                <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-xl hover:bg-muted">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-foreground">
                    تخصيص ومعاينة لوحة القيادة المفصلة
                  </h1>
                  <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300">
                    معاينة تفاعلية مباشرة
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  اضغط على زر <span className="text-rose-500 font-bold px-1 bg-rose-50 dark:bg-rose-950/50 rounded">X</span> على أي بطاقة أو قسم لإزالته فوراً، ويمكنك استعادة أي عنصر بصرياً من صندوق الاستعادة.
                </p>
              </div>
            </div>

            {/* أزرار الإجراءات وصندوق الاستعادة */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* زر صندوق الاستعادة المميز */}
              <Button
                variant={disabledCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRestoreSheetOpen(true)}
                className={`gap-1.5 rounded-xl text-xs font-bold shadow-xs relative ${
                  disabledCount > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                    : "border-border/80 text-muted-foreground"
                }`}
                title="فتح صندوق استعادة العناصر والبطاقات المستبعدة"
              >
                <Undo2 className="w-4 h-4" />
                <span>صندوق استعادة العناصر</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  disabledCount > 0 ? "bg-white text-emerald-700" : "bg-muted text-muted-foreground"
                }`}>
                  {disabledCount}
                </span>
              </Button>

              {/* زر استعادة الافتراضي */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                disabled={resetMutation.isPending || !configData?.isCustomized}
                className="gap-1.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                title="استعادة الحالة الافتراضية لكافة العناصر"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">استعادة الافتراضي</span>
              </Button>

              {/* زر حفظ التخصيص */}
              <Button
                size="sm"
                onClick={() => saveMutation.mutate({ enabledElementIds: enabledIds })}
                disabled={saveMutation.isPending || !hasChanges}
                className={`gap-1.5 rounded-xl text-xs font-bold px-4 shadow-sm transition-all ${
                  hasChanges
                    ? "bg-primary hover:bg-primary/90 text-white animate-pulse"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{hasChanges ? "حفظ التخصيص *" : "تم الحفظ"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {isConfigLoading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">جاري تحميل المعاينة التفاعلية للوحة المفصلة...</p>
          </div>
        ) : (
          /* ========================================================================= */
          /* وضع المعاينة التفاعلية الحية المباشرة (مع أزرار X على كل كرت وقسم) */
          /* ========================================================================= */
          <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
            {/* الهيدر الترحيبي للوحة المفصلة */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-4 sm:px-6 py-4 sm:py-6 text-white shadow-lg">
              <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-white/60 text-[10px] sm:text-xs">
                    <Activity className="w-3.5 h-3.5" />
                    <span>الرئيسية (وضع المعاينة والتحرير)</span>
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-white/30" />
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                      مرحباً، {user?.name || "مدير النظام"}
                    </h2>
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
                  <Button
                    size="sm"
                    onClick={() => setIsRestoreSheetOpen(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-10 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>استعادة العناصر ({disabledCount})</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* شريط الانتقال السريع بين الأقسام مع زر X لإزالته */}
            {isDetailedElementEnabled("quick_nav") && (
              <div className="relative group/nav bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                  <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1">انتقال سريع:</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>مخططات مجلس الإدارة</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                    <SaudiRiyal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>التقرير المالي</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                    <span>تقارير الطلبات</span>
                  </div>
                </div>

                {/* زر X لإخفاء شريط الانتقال السريع */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveElement("quick_nav", "شريط الانتقال السريع")}
                  className="h-7 px-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer shrink-0"
                  title="إخفاء شريط الانتقال السريع من اللوحة"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">إخفاء الشريط</span>
                </Button>
              </div>
            )}

            {/* 1. المؤشرات الرقمية والبطاقات الرئيسية */}
            {visibleMainCards.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      المؤشرات الرقمية والبطاقات الرئيسية
                    </h2>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      ({visibleMainCards.length} من {mainOverviewCardDefs.length} بطاقة معروضة)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      mainOverviewCardDefs.forEach((c) => {
                        setEnabledIds((prev) => prev.filter((id) => id !== c.id));
                      });
                      toast.info("تم إخفاء بطاقات المؤشرات الرئيسية الـ 8 ونقلها لصندوق الاستعادة");
                    }}
                    className="h-7 px-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer"
                    title="إخفاء كافة بطاقات هذا القسم دفعة واحدة"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إخفاء كل بطاقات القسم</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {visibleMainCards.map((stat) => renderCard(stat))}
                </div>
              </div>
            )}

            {/* 2. بطاقات التبويبات بالمنظومة */}
            {(visibleMosqueCards.length > 0 || visibleRequestCards.length > 0 || visibleProcurementCards.length > 0 || visibleFinancialCards.length > 0 || visibleProjectCards.length > 0) && (
              <div className="space-y-6 pt-4 border-t border-border/60">
                {/* أ) إحصائيات المساجد */}
                {visibleMosqueCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-sm font-bold text-foreground">إحصائيات المساجد ({visibleMosqueCards.length}/4)</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          mosqueCardDefs.forEach((c) => setEnabledIds((prev) => prev.filter((id) => id !== c.id)));
                          toast.info("تم إخفاء كروت إحصائيات المساجد");
                        }}
                        className="h-6.5 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg gap-1 border border-rose-200/50"
                      >
                        <X className="w-3 h-3" />
                        <span>إخفاء كروت المساجد</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {visibleMosqueCards.map((stat) => renderCard(stat))}
                    </div>
                  </div>
                )}

                {/* ب) إحصائيات الطلبات */}
                {visibleRequestCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-foreground">إحصائيات الطلبات ({visibleRequestCards.length}/4)</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          requestCardDefs.forEach((c) => setEnabledIds((prev) => prev.filter((id) => id !== c.id)));
                          toast.info("تم إخفاء كروت إحصائيات الطلبات");
                        }}
                        className="h-6.5 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg gap-1 border border-rose-200/50"
                      >
                        <X className="w-3 h-3" />
                        <span>إخفاء كروت الطلبات</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {visibleRequestCards.map((stat) => renderCard(stat))}
                    </div>
                  </div>
                )}

                {/* ج) المشتريات والعقود */}
                {visibleProcurementCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-orange-600" />
                        <h4 className="text-sm font-bold text-foreground">المشتريات والعقود ({visibleProcurementCards.length}/4)</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          procurementCardDefs.forEach((c) => setEnabledIds((prev) => prev.filter((id) => id !== c.id)));
                          toast.info("تم إخفاء كروت المشتريات والعقود");
                        }}
                        className="h-6.5 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg gap-1 border border-rose-200/50"
                      >
                        <X className="w-3 h-3" />
                        <span>إخفاء كروت المشتريات</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {visibleProcurementCards.map((stat) => renderCard(stat))}
                    </div>
                  </div>
                )}

                {/* د) المالية وأوامر الصرف */}
                {visibleFinancialCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-sm font-bold text-foreground">المالية وأوامر الصرف ({visibleFinancialCards.length}/4)</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          financialCardDefs.forEach((c) => setEnabledIds((prev) => prev.filter((id) => id !== c.id)));
                          toast.info("تم إخفاء كروت المالية وأوامر الصرف");
                        }}
                        className="h-6.5 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg gap-1 border border-rose-200/50"
                      >
                        <X className="w-3 h-3" />
                        <span>إخفاء كروت المالية</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {visibleFinancialCards.map((stat) => renderCard(stat))}
                    </div>
                  </div>
                )}

                {/* هـ) التقرير المالي والمشاريع */}
                {visibleProjectCards.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SaudiRiyal className="w-4 h-4 text-teal-600" />
                        <h4 className="text-sm font-bold text-foreground">التقرير المالي والمشاريع ({visibleProjectCards.length}/4)</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          projectAndVoucherCardDefs.forEach((c) => setEnabledIds((prev) => prev.filter((id) => id !== c.id)));
                          toast.info("تم إخفاء كروت التقرير المالي والمشاريع");
                        }}
                        className="h-6.5 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg gap-1 border border-rose-200/50"
                      >
                        <X className="w-3 h-3" />
                        <span>إخفاء كروت المشاريع</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {visibleProjectCards.map((stat) => renderCard(stat))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. المخططات والتحليلات الخاصة بمجلس الإدارة والإدارة العليا */}
            {isDetailedElementEnabled("section_board") && (
              <div className="relative group/section space-y-4 pt-8 border-t-2 border-border/80">
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

                  {/* زر X لإخفاء قسم مخططات مجلس الإدارة */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveElement("section_board", "مخططات وتحليلات مجلس الإدارة")}
                    className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl gap-1.5 border border-rose-200 dark:border-rose-900/60 cursor-pointer shrink-0"
                    title="إخفاء قسم مخططات مجلس الإدارة من اللوحة"
                  >
                    <X className="w-4 h-4" />
                    <span>إخفاء هذا القسم</span>
                  </Button>
                </div>
                <BoardDashboard embedded={true} forceAnalytics={true} />
              </div>
            )}

            {/* 4. المخططات والتحليلات المالية الشاملة */}
            {isDetailedElementEnabled("section_financial") && (
              <div className="relative group/section space-y-4 pt-8 border-t-2 border-border/80">
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

                  {/* زر X لإخفاء قسم التحليلات المالية */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveElement("section_financial", "المخططات والتحليلات المالية الشاملة")}
                    className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl gap-1.5 border border-rose-200 dark:border-rose-900/60 cursor-pointer shrink-0"
                    title="إخفاء قسم التحليلات المالية من اللوحة"
                  >
                    <X className="w-4 h-4" />
                    <span>إخفاء هذا القسم</span>
                  </Button>
                </div>
                <FinancialReport embedded={true} />
              </div>
            )}

            {/* 5. مخططات التقارير الإحصائية للطلبات */}
            {isDetailedElementEnabled("section_reports") && (
              <div className="relative group/section space-y-4 pt-8 border-t-2 border-border/80">
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

                  {/* زر X لإخفاء قسم تقارير الطلبات */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveElement("section_reports", "المخططات الإحصائية للطلبات")}
                    className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl gap-1.5 border border-rose-200 dark:border-rose-900/60 cursor-pointer shrink-0"
                    title="إخفاء قسم تقارير الطلبات من اللوحة"
                  >
                    <X className="w-4 h-4" />
                    <span>إخفاء هذا القسم</span>
                  </Button>
                </div>
                <Reports embedded={true} />
              </div>
            )}

            {/* 6. تنبيه المستخدمين بانتظار الاعتماد */}
            {isDetailedElementEnabled("section_pending_users") && pendingUsers && pendingUsers.length > 0 && (
              <div className="relative group/alert pt-4 border-t border-border/60">
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
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold hover:border-rose-300 hover:text-rose-600 gap-1 rounded-xl"
                      >
                        <span>مراجعة الطلبات</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleRemoveElement("section_pending_users", "تنبيه المستخدمين المعلقين")}
                        className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors"
                        title="إخفاء هذا التنبيه من اللوحة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* الزر العائم المثبت بالأسفل لفتح صندوق استعادة العناصر المحذوفة */}
        {/* ========================================================================= */}
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2">
          <Button
            size="lg"
            onClick={() => setIsRestoreSheetOpen(true)}
            className={`shadow-2xl rounded-full px-5 py-3 font-bold gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer ${
              disabledCount > 0
                ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce ring-4 ring-emerald-500/20"
                : "bg-card border border-border text-foreground hover:bg-muted"
            }`}
          >
            <Undo2 className="w-4 h-4" />
            <span>صندوق استعادة العناصر</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
              disabledCount > 0 ? "bg-white text-emerald-700" : "bg-muted text-muted-foreground"
            }`}>
              {disabledCount}
            </span>
          </Button>

          {hasChanges && (
            <Button
              size="lg"
              onClick={() => saveMutation.mutate({ enabledElementIds: enabledIds })}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white shadow-2xl rounded-full px-5 py-3 font-bold text-xs sm:text-sm gap-2 animate-pulse"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ التخصيص</span>
            </Button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* المكون الرئيسي لاستعادة العناصر المحذوفة (Restore Elements Component) */}
        {/* ========================================================================= */}
        <Sheet open={isRestoreSheetOpen} onOpenChange={setIsRestoreSheetOpen}>
          <SheetContent side="left" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col bg-card" dir="rtl">
            <SheetHeader className="p-4 sm:p-5 border-b border-border/70 space-y-2 text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    <Undo2 className="w-5 h-5" />
                  </div>
                  <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
                    صندوق استعادة العناصر المحذوفة
                  </SheetTitle>
                </div>
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                  {disabledCount} عناصر مستبعدة
                </Badge>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                العناصر والبطاقات والمخططات التي تم إخفاؤها من اللوحة المفصلة معروضة بشكلها المرئي الأصلي. انقر على أي كرت أو اضغط على (+ إعادة إضافة) لإرجاعه فوراً إلى مكانه.
              </SheetDescription>
            </SheetHeader>

            {/* قائمة العناصر المستبعدة المعروضة بصرياً طبق الأصل */}
            <div className="flex-1 overflow-y-auto p-4">
              {disabledCount === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/60">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    كافة العناصر والبطاقات ظاهرة ومفعلة!
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    لا يوجد أي عنصر مستبعد حالياً. عند النقر على زر <span className="text-rose-600 font-bold">X</span> على أي كرت أو قسم بالصفحة، سيظهر هنا فوراً بشكله المرئي الأصلي لإعادة إضافته متى شئت.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {removedElements.map((el) => renderRemovedVisualElement(el))}
                </div>
              )}
            </div>

            {/* تذييل صندوق الاستعادة */}
            <div className="p-3.5 border-t border-border/70 bg-muted/20 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRestoreSheetOpen(false)}
                className="text-xs font-semibold text-muted-foreground"
              >
                إغلاق الصندوق
              </Button>
              {hasChanges && (
                <Button
                  size="sm"
                  onClick={() => {
                    saveMutation.mutate({ enabledElementIds: enabledIds });
                    setIsRestoreSheetOpen(false);
                  }}
                  disabled={saveMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl gap-1.5 px-4"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التخصيص الآن</span>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* نافذة تأكيد استعادة الإعدادات الافتراضية */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                تأكيد استعادة الإعدادات الافتراضية
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية للوحة القيادة المفصلة؟ سيتم تفعيل وإظهار كافة البطاقات والمؤشرات والأقسام الـ {totalCount} كما كانت عند تثبيت النظام.
            </p>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(false)}
                className="text-xs font-semibold"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="text-xs font-bold gap-1.5"
              >
                {resetMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>تأكيد الاستعادة</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
