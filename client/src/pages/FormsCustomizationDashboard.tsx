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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Save,
  RotateCcw,
  CheckCircle2,
  X,
  Loader2,
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
  ShieldCheck,
  BarChart3,
  Users,
  User,
  Globe,
  Search,
  LayoutGrid,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { ROLE_LABELS } from "@shared/constants";
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
  mosque_section: {
    icon: Building2,
    accentColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/40",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  request_section: {
    icon: FileText,
    accentColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-200/60 dark:bg-blue-950/40 dark:border-blue-800/40",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
  },
  procurement_section: {
    icon: Briefcase,
    accentColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-200/60 dark:bg-amber-950/40 dark:border-amber-800/40",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300",
  },
  financial_section: {
    icon: SaudiRiyal,
    accentColor: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-500/10 border-teal-200/60 dark:bg-teal-950/40 dark:border-teal-800/40",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300",
  },
  general_section: {
    icon: AlertTriangle,
    accentColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-200/60 dark:bg-rose-950/40 dark:border-rose-800/40",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

type TargetType = "global" | "role" | "user";

export default function FormsCustomizationDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: userPermsData } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user }
  );
  const effectivePerms = useMemo(() => {
    return Array.isArray(userPermsData) ? userPermsData : [];
  }, [userPermsData]);

  const canGlobal = effectivePerms.includes("forms_customization.dashboard_global") || effectivePerms.includes("*");
  const canRole = effectivePerms.includes("forms_customization.dashboard_role") || effectivePerms.includes("*");
  const canUser = effectivePerms.includes("forms_customization.dashboard_user") || effectivePerms.includes("*");
  const canAnyDashboard = canGlobal || canRole || canUser;

  const utils = trpc.useUtils();

  // نوع الهدف الحالي للتخصيص: عام، حسب الدور، أو حسب المستخدم
  const [targetType, setTargetType] = useState<TargetType>("global");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");

  // تبويب المعاينة الفعالة
  const [previewTab, setPreviewTab] = useState<string>("all");

  // المعرفات المفعلة والمستبعدة
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isRestoreSheetOpen, setIsRestoreSheetOpen] = useState(false);

  // جلب الأدوار والمستخدمين المؤهلين فقط (من يملكون صلاحية الوصول إلى لوحة المعلومات)
  const { data: eligibleTargets, isLoading: isLoadingTargets } =
    trpc.forms.getEligibleDashboardTargets.useQuery();
  const eligibleRoles = eligibleTargets?.roles || [];
  const eligibleUsers = eligibleTargets?.users || [];

  // جلب الأهداف المخصصة حالياً (لعرض شارات التخصيص)
  const { data: customizedTargets } = trpc.forms.getCustomizedDashboardTargets.useQuery();

  // تحديد الـ targetId الحالي
  const currentTargetId = useMemo(() => {
    if (targetType === "role") return selectedRoleId || undefined;
    if (targetType === "user") return selectedUserId || undefined;
    return undefined;
  }, [targetType, selectedRoleId, selectedUserId]);

  // تعيين دور افتراضي عند اختيار تبويب الأدوار لأول مرة
  useEffect(() => {
    if (targetType === "role" && (!selectedRoleId || !eligibleRoles.some((r: any) => r.id === selectedRoleId || r.nameEn === selectedRoleId)) && eligibleRoles.length > 0) {
      // نفضل مستخدم لوحة المعلومات إن وجد
      const dvRole = eligibleRoles.find((r: any) => r.id === "dashboard_viewer" || r.nameEn === "dashboard_viewer");
      if (dvRole) {
        setSelectedRoleId(dvRole.id || dvRole.nameEn);
      } else {
        setSelectedRoleId(eligibleRoles[0].id || eligibleRoles[0].nameEn);
      }
    }
  }, [targetType, selectedRoleId, eligibleRoles]);

  // تعيين مستخدم افتراضي عند اختيار تبويب المستخدمين لأول مرة
  useEffect(() => {
    if (targetType === "user" && (!selectedUserId || !eligibleUsers.some((u: any) => String(u.id) === selectedUserId)) && eligibleUsers.length > 0) {
      setSelectedUserId(String(eligibleUsers[0].id));
    }
  }, [targetType, selectedUserId, eligibleUsers]);

  // التبديل التلقائي للهدف المسموح به وفق الصلاحيات
  useEffect(() => {
    if (!canGlobal && targetType === "global") {
      if (canRole) setTargetType("role");
      else if (canUser) setTargetType("user");
    } else if (!canRole && targetType === "role") {
      if (canGlobal) setTargetType("global");
      else if (canUser) setTargetType("user");
    } else if (!canUser && targetType === "user") {
      if (canGlobal) setTargetType("global");
      else if (canRole) setTargetType("role");
    }
  }, [canGlobal, canRole, canUser, targetType]);
  // استعلام الإعدادات للهدف الحالي
  const {
    data: configData,
    isLoading: isConfigLoading,
  } = trpc.forms.getDetailedDashboardCustomizationConfig.useQuery(
    {
      targetType,
      targetId: currentTargetId,
    },
    {
      enabled: targetType === "global" || !!currentTargetId,
    }
  );

  // تحديث المعرفات عند تغيير الهدف أو جلب البيانات
  useEffect(() => {
    if (configData?.enabledElementIds) {
      setEnabledIds(configData.enabledElementIds);
      setInitialIds(configData.enabledElementIds);
      setIsInitialized(true);
    }
  }, [configData, targetType, currentTargetId]);

  // جلب إحصائيات حية للمعاينة
  const { data: requestStats } = trpc.requests.getStats.useQuery();
  const { data: mosqueStats } = trpc.mosques.getStats.useQuery();
  const { data: disbursementStats } = trpc.disbursements.getStats.useQuery();
  const { data: supplierStats } = trpc.suppliers.getStats.useQuery();
  const { data: projectStats } = trpc.projects.getStats.useQuery();
  const { data: boardStats } = trpc.board.getExecutiveStats.useQuery();
  const { data: financialReportData } = trpc.disbursements.getFinancialReport.useQuery();
  const { data: allReceiptVouchersData = [] } = trpc.projects.getAllReceiptVouchers.useQuery();

  // حفظ التخصيص للهدف المحدد
  const saveMutation = trpc.forms.saveDetailedDashboardCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ التخصيص بنجاح وتطبيقه على النظام");
      setInitialIds(enabledIds);
      utils.forms.getDetailedDashboardCustomizationConfig.invalidate();
      utils.forms.getCustomizedDashboardTargets.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التخصيص");
    },
  });

  // استعادة الإعدادات للهدف المحدد
  const resetMutation = trpc.forms.resetDetailedDashboardCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تمت استعادة الإعدادات بنجاح");
      setShowResetDialog(false);
      utils.forms.getDetailedDashboardCustomizationConfig.invalidate();
      utils.forms.getCustomizedDashboardTargets.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الاستعادة");
    },
  });

  const allElements = useMemo(() => configData?.elements || [], [configData]);

  // العناصر المستبعدة حالياً (المخفية)
  const removedElements = useMemo(() => {
    return allElements.filter((el) => !enabledIds.includes(el.id));
  }, [allElements, enabledIds]);

  // هل يوجد تعديلات غير محفوظة للهدف الحالي؟
  const canEditCurrentTarget = (targetType === "global" && canGlobal) || (targetType === "role" && canRole) || (targetType === "user" && canUser);
  const hasChanges = useMemo(() => {
    if (!isInitialized) return false;
    if (enabledIds.length !== initialIds.length) return true;
    const initialSet = new Set(initialIds);
    return enabledIds.some((id) => !initialSet.has(id));
  }, [enabledIds, initialIds, isInitialized]);

  // إزالة عنصر (إخفاؤه من اللوحة عبر زر X)
  const handleRemoveElement = (id: string, title?: string) => {
    setEnabledIds((prev) => prev.filter((item) => item !== id));
    toast.info(`تم إخفاء "${title || id}" ونقله لصندوق الاستعادة`, {
      action: {
        label: "تراجع",
        onClick: () => handleRestoreElement(id, title),
      },
      duration: 3500,
    });
  };

  // استعادة عنصر إلى اللوحة
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
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className="text-xl sm:text-2xl font-bold text-foreground leading-none font-sans">
                  {stat.value}
                </p>
                {stat.isCurrency && <SaudiRiyal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </div>
              {stat.subtext && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {stat.subtext}
                </p>
              )}
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md shrink-0 order-first sm:order-last text-white`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className={`absolute -bottom-4 -left-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full ${stat.bgLight} opacity-50 pointer-events-none`} />
        </CardContent>
      </Card>

      {/* زر الإزالة X المباشر على كل كرت */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveElement(stat.id, stat.title);
        }}
        className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer border border-white dark:border-zinc-800"
        title={`إخفاء بطاقة "${stat.title}" من اللوحة`}
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );

  // 1. كروت تبويب المساجد
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

  // 2. كروت تبويب الطلبات
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

  // 3. كروت تبويب المشتريات والعقود
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

  // 4. كروت تبويب المشاريع وسندات القبض
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
      title: "المبالغ المصروفة للمشاريع",
      value: Number(financialReportData?.summary?.totalOrderAmount || (disbursementStats as any)?.totalPaid || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      isCurrency: true,
      subtext: "المصروف الفعلي المنفذ",
      icon: Banknote,
      gradient: "from-teal-500 to-teal-600",
      bgLight: "bg-teal-50 dark:bg-teal-950/40",
    },
  ];

  const visibleProjectCards = projectAndVoucherCardDefs.filter((c) => isDetailedElementEnabled(c.id));

  // 5. كروت تبويب المالية والصرف
  const boardDisbReqCount = boardStats?.financials?.approvedDisbursementRequestsCount ?? (disbursementStats as any)?.approvedRequests ?? 0;
  const boardDisbOrdersCount = boardStats?.financials?.executiveApprovedOrdersCount ?? (disbursementStats as any)?.totalOrders ?? 0;
  const boardDisbAmount = boardStats?.financials?.executedDisbursementOrdersAmount ?? (disbursementStats as any)?.totalPaid ?? 0;
  const boardReceiptsCount = boardStats?.financials?.approvedReceiptVouchersCount ?? (disbursementStats as any)?.approvedReceiptVouchersCount ?? 0;

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
      subtext: "سندات معتمدة بالمنظومة",
      icon: Wallet,
      gradient: "from-purple-600 to-indigo-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  const visibleFinancialCards = financialCardDefs.filter((c) => isDetailedElementEnabled(c.id));

  // خريطة لكافة كروت الإحصائيات للوصول لخصائصها البصرية
  const allCardDefsMap = useMemo(() => {
    const map = new Map<string, any>();
    [
      ...mosqueCardDefs,
      ...requestCardDefs,
      ...procurementCardDefs,
      ...projectAndVoucherCardDefs,
      ...financialCardDefs,
    ].forEach((card) => map.set(card.id, card));
    return map;
  }, [
    mosqueCardDefs,
    requestCardDefs,
    procurementCardDefs,
    projectAndVoucherCardDefs,
    financialCardDefs,
  ]);

  // دالة لرسم العنصر المستبعد بصرياً طبق الأصل في صندوق الاستعادة
  const renderRemovedVisualElement = (el: any) => {
    const meta = CATEGORY_META[el.category] || CATEGORY_META.general_section;
    const cardDef = allCardDefsMap.get(el.id);

    // إذا كان كرت إحصائي
    if (cardDef) {
      return (
        <div
          key={el.id}
          onClick={() => handleRestoreElement(el.id, el.title)}
          className="relative group/restoreCard rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 bg-card hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 p-4 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full ${cardDef.bgLight} opacity-40 pointer-events-none`} />

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

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate">{cardDef.title}</p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className="text-xl font-bold text-foreground leading-none font-sans">
                  {cardDef.value}
                </p>
                {cardDef.isCurrency && <SaudiRiyal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </div>
              {cardDef.subtext && (
                <p className="text-[11px] text-muted-foreground truncate">{cardDef.subtext}</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cardDef.gradient} flex items-center justify-center shadow-sm shrink-0 text-white`}>
              <cardDef.icon className="w-5 h-5" />
            </div>
          </div>

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

    // إذا كان أحد الأقسام أو المخططات
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

        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center font-bold text-xs shrink-0`}>
              <meta.icon className={`w-4.5 h-4.5 ${meta.accentColor}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{el.title}</h4>
              <p className="text-[11px] text-muted-foreground truncate">{el.description}</p>
            </div>
          </div>
        </div>

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
            <span>إعادة إضافة العنصر للوحة</span>
          </Button>
        </div>
      </div>
    );
  };

  // المستخدم الحالي المحدد بالاسم
  const selectedUserObj = eligibleUsers.find((u: any) => String(u.id) === selectedUserId);
  const selectedRoleObj = eligibleRoles.find((r: any) => r.id === selectedRoleId || r.nameEn === selectedRoleId);

  // تصفية المستخدمين للبحث
  const filteredUsers = eligibleUsers.filter((u: any) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const disabledCount = removedElements.length;
  const totalCount = allElements.length;

  // هل الهدف الحالي يمتلك تخصيصاً خاصاً به؟
  const currentTargetHasOverride = useMemo(() => {
    if (targetType === "global") return !!customizedTargets?.hasGlobal;
    if (targetType === "role") return !!customizedTargets?.roles?.includes(selectedRoleId);
    if (targetType === "user") return !!customizedTargets?.userIds?.includes(selectedUserId);
    return false;
  }, [targetType, selectedRoleId, selectedUserId, customizedTargets]);

  // التحقق من صلاحية مدير النظام الشامل
  if (!canAnyDashboard) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح بالدخول</h2>
          <p className="text-sm text-muted-foreground">
            تخصيص لوحة المعلومات متاح حصرياً لمدير النظام الشامل (Super Admin).
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-24" dir="rtl">
        {/* شريط الأدوات العلوي المثبت للتحكم والتخصيص */}
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
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
                    تخصيص لوحة المعلومات
                  </h1>
                  <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300">
                    عام، حسب الدور، أو حسب المستخدم
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  تحكم بظهور أو إخفاء أي بطاقة أو قسم عبر زر <span className="text-rose-500 font-bold px-1 bg-rose-50 dark:bg-rose-950/50 rounded">X</span>، واستعدها متى شئت من صندوق الاستعادة.
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
                disabled={resetMutation.isPending || !currentTargetHasOverride || !canEditCurrentTarget}
                className="gap-1.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                title="استعادة الحالة الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">استعادة الافتراضي</span>
              </Button>

              {/* زر حفظ التخصيص */}
              <Button
                size="sm"
                onClick={() =>
                  saveMutation.mutate({
                    targetType,
                    targetId: currentTargetId,
                    enabledElementIds: enabledIds,
                  })
                }
                disabled={saveMutation.isPending || !hasChanges || !canEditCurrentTarget}
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

          {/* تبويبات اختيار الهدف (عام / بالدور / بالمستخدم) */}
          <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60 flex-wrap">
              {canGlobal && (
                <button
                  type="button"
                  onClick={() => setTargetType("global")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetType === "global"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>افتراضي عام للجميع</span>
                  {customizedTargets?.hasGlobal && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="مخصص" />
                  )}
                </button>
              )}

              {canRole && (
                <button
                  type="button"
                  onClick={() => setTargetType("role")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetType === "role"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-amber-500" />
                  <span>تخصيص حسب الدور</span>
                  <span className="text-[10px] text-muted-foreground font-normal">({eligibleRoles.length})</span>
                  {customizedTargets?.roles?.length ? (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold bg-amber-500/10 text-amber-600 border-amber-300">
                      {customizedTargets.roles.length} مخصص
                    </Badge>
                  ) : null}
                </button>
              )}

              {canUser && (
                <button
                  type="button"
                  onClick={() => setTargetType("user")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetType === "user"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-purple-500" />
                  <span>تخصيص لمستخدم محدد</span>
                  <span className="text-[10px] text-muted-foreground font-normal">({eligibleUsers.length})</span>
                  {customizedTargets?.userIds?.length ? (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold bg-purple-500/10 text-purple-600 border-purple-300">
                      {customizedTargets.userIds.length} مخصص
                    </Badge>
                  ) : null}
                </button>
              )}
            </div>

            {/* محدد الدور عند اختيار التخصيص حسب الدور */}
            {targetType === "role" && (
              <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">الدور المصرح له:</span>
                <Select value={selectedRoleId} onValueChange={(val) => setSelectedRoleId(val)}>
                  <SelectTrigger className="w-full text-xs font-bold h-9 rounded-xl bg-background border-border">
                    <SelectValue placeholder="اختر الدور الوظيفي..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64" dir="rtl">
                    {eligibleRoles.map((role: any) => {
                      const roleVal = role.id || role.nameEn;
                      const isCustom = customizedTargets?.roles?.includes(role.id) || customizedTargets?.roles?.includes(role.nameEn);
                      const label = role.nameAr || ROLE_LABELS[role.id] || ROLE_LABELS[role.nameEn] || role.nameEn;
                      return (
                        <SelectItem key={roleVal} value={roleVal} className="text-xs font-medium">
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span>{label}</span>
                            {isCustom && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                                مخصص
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* محدد المستخدم عند اختيار التخصيص لمستخدم محدد */}
            {targetType === "user" && (
              <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">المستخدم المصرح له:</span>
                <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val)}>
                  <SelectTrigger className="w-full text-xs font-bold h-9 rounded-xl bg-background border-border">
                    <SelectValue placeholder="اختر المستخدم..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72" dir="rtl">
                    <div className="p-2 border-b border-border/60 sticky top-0 bg-popover z-10">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5" />
                        <Input
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="ابحث بين المستخدمين المصرح لهم..."
                          className="h-8 text-xs pr-8 pl-2 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {filteredUsers.map((u: any) => {
                      const isCustom = customizedTargets?.userIds?.includes(String(u.id));
                      const roleName = ROLE_LABELS[u.role] || u.role;
                      return (
                        <SelectItem key={u.id} value={String(u.id)} className="text-xs font-medium">
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold truncate">{u.name || "مستخدم"}</span>
                              <span className="text-[10px] text-muted-foreground truncate">({roleName})</span>
                            </div>
                            {isCustom && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/40 shrink-0">
                                مخصص
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>


        {isConfigLoading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">جاري تحميل المعاينة التفاعلية للوحة المعلومات...</p>
          </div>
        ) : (
          /* ========================================================================= */
          /* وضع المعاينة التفاعلية الحية المباشرة (مطابق تماماً لـ InformationDashboard) */
          /* ========================================================================= */
          <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
            {/* شريط تبديل الأقسام بالمعاينة */}
            <div className="bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-xs">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1 hidden xl:inline">
                  معاينة الأقسام:
                </span>
                {[
                  { id: "all", label: "عرض شامل", icon: LayoutGrid, color: "text-primary" },
                  { id: "mosques", label: "المساجد والتغطية", icon: Building2, color: "text-emerald-600", sectionId: "section_mosques" },
                  { id: "requests", label: "الطلبات والبرامج", icon: FileText, color: "text-blue-600", sectionId: "section_requests" },
                  { id: "procurement", label: "المشاريع والعقود", icon: Briefcase, color: "text-amber-600", sectionId: "section_procurement" },
                  { id: "financial", label: "المالية والصرف", icon: SaudiRiyal, color: "text-teal-600", sectionId: "section_financial" },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = previewTab === tab.id;
                  const isSecDisabled = tab.sectionId && !isDetailedElementEnabled(tab.sectionId);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewTab(tab.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                      } ${isSecDisabled ? "opacity-50 line-through" : ""}`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : tab.color}`} />
                      <span>{tab.label}</span>
                      {isSecDisabled && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-600 font-normal">مخفي</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. قسم المساجد والزيارات الميدانية */}
            {/* ========================================================================= */}
            {(previewTab === "all" || previewTab === "mosques") && (
              <div className="space-y-6 pt-2">
                {isDetailedElementEnabled("section_mosques") ? (
                  <section id="section-mosques" className="space-y-6 pt-2">
                    {/* هيدر قسم المساجد مع زر إخفاء القسم */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                              إحصائيات وتغطية المساجد والجوامع
                            </h2>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                              قطاع المساجد
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            المساجد المعتمدة رسمياً، المساجد النشطة المستفيدة من الخدمات، ونسب التغطية الميدانية والنمو
                          </p>
                        </div>
                      </div>

                      {/* زر إخفاء قسم المساجد بالكامل */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveElement("section_mosques", "قسم المساجد والتغطية")}
                        className="h-7 px-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer shrink-0"
                        title="إخفاء قسم المساجد بالكامل مع تبويبه"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">إخفاء قسم المساجد بالكامل</span>
                      </Button>
                    </div>

                    {/* كروت قسم المساجد */}
                    {visibleMosqueCards.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">مؤشرات المساجد والانتشار الميداني ({visibleMosqueCards.length}/4)</h4>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                          {visibleMosqueCards.map((stat) => renderCard(stat))}
                        </div>
                      </div>
                    )}

                    {/* مخططات قسم المساجد مع زر إخفاء المخططات */}
                    {isDetailedElementEnabled("mosques_charts") && (
                      <div className="relative group/chart space-y-2 pt-2">
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-xs font-bold text-muted-foreground">مخططات وتوزيع المساجد الجغرافية</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveElement("mosques_charts", "مخططات وتوزيع المساجد الجغرافية")}
                            className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>إخفاء المخططات</span>
                          </Button>
                        </div>
                        <BoardDashboard embedded={true} forceAnalytics={true} initialTab="mosques" hideTabs={true} hideCards={true} />
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/40 bg-rose-50/20 text-center flex items-center justify-between">
                    <span className="text-xs text-rose-600 font-bold">قسم المساجد والتغطية مخفي حالياً من اللوحة</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreElement("section_mosques", "قسم المساجد والتغطية")}
                      className="text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-7"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إظهار القسم
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. قسم الطلبات وبرامج الخدمات */}
            {/* ========================================================================= */}
            {(previewTab === "all" || previewTab === "requests") && (
              <div className="space-y-6 pt-6 border-t-2 border-border/80">
                {isDetailedElementEnabled("section_requests") ? (
                  <section id="section-requests" className="space-y-6">
                    {/* هيدر قسم الطلبات مع زر إخفاء القسم */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                              إحصائيات الطلبات وبرامج الخدمات
                            </h2>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 shrink-0">
                              تقارير الطلبات
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            مخططات توزيع الطلبات على برامج الخدمات، والمنحنى الشهري لتطور الطلبات ومراحل الإنجاز
                          </p>
                        </div>
                      </div>

                      {/* زر إخفاء قسم الطلبات بالكامل */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveElement("section_requests", "قسم الطلبات وبرامج الخدمات")}
                        className="h-7 px-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer shrink-0"
                        title="إخفاء قسم الطلبات بالكامل مع تبويبه"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">إخفاء قسم الطلبات بالكامل</span>
                      </Button>
                    </div>

                    {/* كروت قسم الطلبات */}
                    {visibleRequestCards.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">تفصيل حالات الطلبات ومراحل المعالجة ({visibleRequestCards.length}/4)</h4>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                          {visibleRequestCards.map((stat) => renderCard(stat))}
                        </div>
                      </div>
                    )}

                    {/* مخططات التقارير الفنية للطلبات */}
                    {isDetailedElementEnabled("requests_charts") && (
                      <div className="relative group/chart space-y-2 pt-2">
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-xs font-bold text-muted-foreground">مخططات تقارير الطلبات الفنية</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveElement("requests_charts", "مخططات تقارير الطلبات الفنية")}
                            className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>إخفاء المخططات</span>
                          </Button>
                        </div>
                        <Reports embedded={true} />
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/40 bg-rose-50/20 text-center flex items-center justify-between">
                    <span className="text-xs text-rose-600 font-bold">قسم الطلبات وبرامج الخدمات مخفي حالياً من اللوحة</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreElement("section_requests", "قسم الطلبات وبرامج الخدمات")}
                      className="text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-7"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إظهار القسم
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. قسم المشاريع والعقود والمشتريات */}
            {/* ========================================================================= */}
            {(previewTab === "all" || previewTab === "procurement") && (
              <div className="space-y-6 pt-6 border-t-2 border-border/80">
                {isDetailedElementEnabled("section_procurement") ? (
                  <section id="section-procurement" className="space-y-6">
                    {/* هيدر قسم المشاريع والعقود مع زر إخفاء القسم */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                              المشاريع والعقود وشبكة الموردين
                            </h2>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                              المشاريع والعقود
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            مشاريع الدعم، الميزانيات المعتمدة، شبكة الموردين المؤهلين، ومجموع قيم العقود الرسمية
                          </p>
                        </div>
                      </div>

                      {/* زر إخفاء قسم المشاريع والعقود بالكامل */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveElement("section_procurement", "قسم المشاريع والعقود وشبكة الموردين")}
                        className="h-7 px-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer shrink-0"
                        title="إخفاء قسم المشاريع والعقود بالكامل مع تبويبه"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">إخفاء قسم المشاريع بالكامل</span>
                      </Button>
                    </div>

                    {/* كروت قسم المشاريع والعقود */}
                    {(visibleProcurementCards.length > 0 || visibleProjectCards.length > 0) && (
                      <div className="space-y-5">
                        {visibleProcurementCards.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-amber-600" />
                              <h4 className="text-xs sm:text-sm font-bold text-foreground">المشتريات وشبكة الموردين والعقود ({visibleProcurementCards.length}/4)</h4>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                              {visibleProcurementCards.map((stat) => renderCard(stat))}
                            </div>
                          </div>
                        )}

                        {visibleProjectCards.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-violet-600" />
                              <h4 className="text-xs sm:text-sm font-bold text-foreground">مشاريع الدعم والميزانيات ({visibleProjectCards.length}/4)</h4>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                              {visibleProjectCards.map((stat) => renderCard(stat))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* مخططات المشتريات والعقود */}
                    {isDetailedElementEnabled("procurement_charts") && (
                      <div className="relative group/chart space-y-2 pt-2">
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-xs font-bold text-muted-foreground">مخططات المشتريات والعقود والموردين</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveElement("procurement_charts", "مخططات المشتريات والعقود والموردين")}
                            className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>إخفاء المخططات</span>
                          </Button>
                        </div>
                        <BoardDashboard embedded={true} forceAnalytics={true} initialTab="procurement" hideTabs={true} hideCards={true} />
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/40 bg-rose-50/20 text-center flex items-center justify-between">
                    <span className="text-xs text-rose-600 font-bold">قسم المشاريع والعقود وشبكة الموردين مخفي حالياً من اللوحة</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreElement("section_procurement", "قسم المشاريع والعقود وشبكة الموردين")}
                      className="text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-7"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إظهار القسم
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. قسم المالية وأوامر الصرف والتدفقات */}
            {/* ========================================================================= */}
            {(previewTab === "all" || previewTab === "financial") && (
              <div className="space-y-6 pt-6 border-t-2 border-border/80">
                {isDetailedElementEnabled("section_financial") ? (
                  <section id="section-financial" className="space-y-6">
                    {/* هيدر قسم المالية مع زر إخفاء القسم */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                          <SaudiRiyal className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                              التقرير والتحليلات المالية والتدفقات النقدية
                            </h2>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shrink-0">
                              المالية والصرف
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            الرسوم البيانية للتدفقات النقدية، أوامر الصرف المنفذة، سندات القبض، ومشاريع الدعم والتغطية
                          </p>
                        </div>
                      </div>

                      {/* زر إخفاء قسم المالية بالكامل */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveElement("section_financial", "قسم المالية والصرف والتدفقات")}
                        className="h-7 px-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer shrink-0"
                        title="إخفاء قسم المالية بالكامل مع تبويبه"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">إخفاء قسم المالية بالكامل</span>
                      </Button>
                    </div>

                    {/* كروت قسم المالية */}
                    {visibleFinancialCards.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-teal-600" />
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">مؤشرات المصروفات وأوامر الصرف وسندات القبض ({visibleFinancialCards.length}/4)</h4>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                          {visibleFinancialCards.map((stat) => renderCard(stat))}
                        </div>
                      </div>
                    )}

                    {/* المخططات المالية الشاملة */}
                    {isDetailedElementEnabled("financial_charts") && (
                      <div className="relative group/chart space-y-2 pt-2">
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-xs font-bold text-muted-foreground">المخططات والتحليلات المالية الشاملة</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveElement("financial_charts", "المخططات والتحليلات المالية الشاملة")}
                            className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>إخفاء المخططات</span>
                          </Button>
                        </div>
                        <FinancialReport embedded={true} />
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/40 bg-rose-50/20 text-center flex items-center justify-between">
                    <span className="text-xs text-rose-600 font-bold">قسم المالية والصرف والتدفقات مخفي حالياً من اللوحة</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreElement("section_financial", "قسم المالية والصرف والتدفقات")}
                      className="text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-7"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إظهار القسم
                    </Button>
                  </div>
                )}
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
              onClick={() =>
                saveMutation.mutate({
                  targetType,
                  targetId: currentTargetId,
                  enabledElementIds: enabledIds,
                })
              }
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
        {/* صندوق استعادة العناصر المحذوفة (Sheet / Drawer) */}
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
                العناصر والبطاقات والمخططات التي تم إخفاؤها من اللوحة معروضة هنا. انقر على أي كرت أو اضغط على (+ إضافة) لإرجاعه فوراً لمكانه.
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
                    saveMutation.mutate({
                      targetType,
                      targetId: currentTargetId,
                      enabledElementIds: enabledIds,
                    });
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
                تأكيد استعادة الإعدادات
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {targetType === "global"
                ? `هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية العامة للوحة المعلومات؟ سيتم تفعيل وإظهار كافة البطاقات والمؤشرات والأقسام الـ ${totalCount}.`
                : targetType === "role"
                ? `هل أنت متأكد من حذف التخصيص المستقل لدور "${selectedRoleObj?.nameAr || ROLE_LABELS[selectedRoleId] || selectedRoleId}"؟ سيعود هذا الدور لوراثة الإعدادات الافتراضية العامة.`
                : `هل أنت متأكد من حذف التخصيص المستقل للمستخدم "${selectedUserObj?.name || selectedUserId}"؟ سيعود هذا المستخدم لوراثة تخصيص دوره أو الإعدادات العامة.`}
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
                onClick={() =>
                  resetMutation.mutate({
                    targetType,
                    targetId: currentTargetId,
                  })
                }
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
