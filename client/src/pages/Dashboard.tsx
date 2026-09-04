import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPermissions } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgramIcon } from "@/components/ProgramIcon";
import { 
  Building2, 
  FileText, 
  Users, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Plus,
  Activity,
  Target,
  Layers,
  BarChart3,
  Settings,
  FolderKanban,
  LifeBuoy,
  CreditCard,
  Banknote,
  Store,
  FileCheck2,
  FileSpreadsheet,
  Receipt,
  HeartHandshake,
  ShieldCheck,
  ChevronLeft,
  Eye,
  ExternalLink,
  Wallet,
  Sparkles,
  ClipboardList,
  XCircle,
  Search,
  Loader2,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS, PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS, PROGRAM_COLORS } from "@shared/constants";

function getArabicTimeAgo(createdAt: string | Date | null | undefined): string {
  if (!createdAt) return "تاريخ غير متاح";
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "تاريخ غير متاح";

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const createdMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffInMs = todayMidnight.getTime() - createdMidnight.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays <= 0) return "مسجل اليوم";
  if (diffInDays === 1) return "متأخر يوم واحد";
  if (diffInDays === 2) return "متأخر يومين";
  if (diffInDays >= 3 && diffInDays <= 10) return `متأخر ${diffInDays} أيام`;
  return `متأخر ${diffInDays} يوماً`;
}

function formatCurrencyEn(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatDateArabic(dateStr: any): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const monthName = ARABIC_MONTHS[d.getMonth()] || "";
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // تحديد تصنيف الدور الوظيفي للمستخدم
  const customRoleNameAr = (user as any)?.customRole?.nameAr || "";
  const customRoleNameEn = ((user as any)?.customRole?.nameEn || "").toLowerCase();

  const isExecDirector = 
    ["general_manager", "executive_director"].includes(user?.role || "") ||
    customRoleNameAr === "المدير التنفيذي" ||
    customRoleNameEn === "executive director";

  const isExecutiveAdmin = 
    ["super_admin", "system_admin", "general_manager", "executive_director"].includes(user?.role || "") || isExecDirector;

  const isFinancialRole = 
    ["financial", "financial_manager"].includes(user?.role || "") ||
    customRoleNameAr.includes("مالي") ||
    customRoleNameEn.includes("financ");

  const isProjectsRole = 
    ["projects_office", "project_manager"].includes(user?.role || "") ||
    customRoleNameAr.includes("مشاريع") ||
    customRoleNameEn.includes("project");

  const isFieldRole = 
    ["field_team", "quick_response"].includes(user?.role || "") ||
    customRoleNameAr.includes("ميدان") ||
    customRoleNameAr.includes("استجابة");

  const isCorporateCommRole = 
    user?.role === "corporate_comm" ||
    customRoleNameAr.includes("اتصال") ||
    customRoleNameEn.includes("comm");

  const isBoardRole = ["board_chairman", "board_member"].includes(user?.role || "");

  // توجيه طالب الخدمة فقط إلى بوابته الخاصة
  useEffect(() => {
    if (!user) return;
    if (user.role === "service_requester") {
      navigate("/requester", { replace: true });
    }
  }, [user, navigate]);

  // جلب الإحصائيات العامة
  const { data: requestStats } = trpc.requests.getStats.useQuery();
  const { data: mosqueStats } = trpc.mosques.getStats.useQuery();

  // جلب الإحصائيات المالية (للمسؤول المالي والإدارة العليا ومجلس الإدارة)
  const { data: disbursementStats } = trpc.disbursements.getStats.useQuery(undefined, {
    enabled: isFinancialRole || isExecutiveAdmin || isBoardRole,
  });
  const { data: supplierStats } = trpc.suppliers.getStats.useQuery(undefined, {
    enabled: isFinancialRole || isExecutiveAdmin || isProjectsRole,
  });
  const { data: financialSummary } = trpc.disbursements.getFinancialSummary.useQuery(undefined, {
    enabled: isFinancialRole || isExecutiveAdmin,
  });
  // حالة البحث الشامل في السجلات المالية (كافة طلبات وأوامر الصرف)
  const [recordsSearch, setRecordsSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(recordsSearch.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [recordsSearch]);

  const { data: recentRequestsData, isLoading: isLoadingRequests } = trpc.disbursements.listRequests.useQuery(
    { 
      limit: debouncedSearch ? 50 : 5,
      search: debouncedSearch || undefined,
    }, 
    {
      enabled: isFinancialRole,
    }
  );

  const { data: recentOrdersData, isLoading: isLoadingOrders } = trpc.disbursements.listOrders.useQuery(
    { 
      limit: debouncedSearch ? 50 : 5,
      search: debouncedSearch || undefined,
    }, 
    {
      enabled: isFinancialRole,
    }
  );

  const filteredRecentRequests = recentRequestsData?.requests || [];
  const filteredRecentOrders = recentOrdersData?.orders || [];

  // جلب إحصائيات المشاريع (لمكتب المشاريع والإدارة العليا ومجلس الإدارة)
  const { data: projectStats } = trpc.projects.getStats.useQuery(undefined, {
    enabled: isProjectsRole || isExecutiveAdmin || isBoardRole,
  });

  // جلب إحصائيات النمو والمستخدمين المعلقين للإدارة العليا
  const { data: pendingUsers } = trpc.auth.getPendingUsers.useQuery(undefined, {
    enabled: isExecutiveAdmin,
  });
  const { data: growthStats } = trpc.analytics.getMonthlyGrowth.useQuery(undefined, {
    enabled: isExecutiveAdmin,
  });

  // اسم الدور المعروض في الواجهة
  const roleLabel = customRoleNameAr || ROLE_LABELS[user?.role || ""] || user?.role;

  // العنوان الفرعي حسب الدور
  const getRoleSubtitle = () => {
    if (isFinancialRole) {
      return "لوحة مؤشرات الإدارة المالية: متابعة طلبات الصرف، أوامر الصرف، الموردين، والاعتمادات المالية";
    }
    if (isProjectsRole) {
      return "لوحة إدارة المشاريع: متابعة المشاريع الإنشائية، جداول الكميات، وتقارير الإنجاز الفنية";
    }
    if (isFieldRole) {
      return "لوحة المتابعة الميدانية: مواعيد الزيارات، استمارات المعاينة، وطلبات الاستجابة السريعة";
    }
    if (isCorporateCommRole) {
      return "لوحة الاتصال المؤسسي: مؤشرات رضا المستفيدين، تقارير الشركاء، واستبيانات الرأي";
    }
    return "نظام إدارة وعمارة المساجد ومتابعة الطلبات والمشاريع والتحليلات";
  };

  // بطاقات الإحصائيات الرئيسية للإدارة العامة
  const executiveStats = [
    {
      title: "إجمالي الطلبات",
      value: (requestStats?.total || 0).toLocaleString("en-US"),
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      change: growthStats?.totalRequests.percentage,
    },
    {
      title: "المساجد المسجلة",
      value: (mosqueStats?.total || 0).toLocaleString("en-US"),
      icon: Building2,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      change: growthStats?.registeredMosques.percentage,
    },
    {
      title: "قيد التنفيذ",
      value: (requestStats?.byStatus?.in_progress || 0).toLocaleString("en-US"),
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
      change: growthStats?.inProgressRequests.percentage,
    },
    {
      title: "مكتملة",
      value: (requestStats?.byStatus?.completed || 0).toLocaleString("en-US"),
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      bgLight: "bg-green-50",
      change: growthStats?.completedRequests.percentage,
    },
  ];

  // بطاقات الإحصائيات للمسؤول المالي
  const financialStatsCards = [
    {
      title: "إجمالي طلبات الصرف",
      value: (disbursementStats?.totalRequests || 0).toLocaleString("en-US"),
      subtext: `معتمد: ${(disbursementStats?.approvedRequests || 0).toLocaleString("en-US")} | مرفوض: ${(disbursementStats?.rejectedRequests || 0).toLocaleString("en-US")}`,
      icon: Receipt,
      gradient: "from-blue-600 to-indigo-700",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      link: "/disbursements",
      badgeText: "طلبات الصرف",
    },
    {
      title: "إجمالي أوامر الصرف",
      value: (disbursementStats?.totalOrders || 0).toLocaleString("en-US"),
      subtext: `منفذ: ${(disbursementStats?.executedOrders || 0).toLocaleString("en-US")} | مرفوض: ${(disbursementStats?.rejectedOrders || 0).toLocaleString("en-US")}`,
      icon: FileCheck2,
      gradient: "from-emerald-600 to-teal-700",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      link: "/disbursement-orders",
      badgeText: "أوامر الصرف",
    },
    {
      title: "إجمالي الموردين",
      value: (supplierStats?.total || 0).toLocaleString("en-US"),
      subtext: `معتمد: ${(supplierStats?.approved || 0).toLocaleString("en-US")} | مرفوض: ${(supplierStats?.rejected || 0).toLocaleString("en-US")}`,
      icon: Store,
      gradient: "from-purple-600 to-violet-700",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
      link: "/suppliers",
      badgeText: "دليل الموردين",
    },
    {
      title: "إجمالي المصروف",
      value: formatCurrencyEn(disbursementStats?.totalPaid || 0),
      subtext: `من واقع ${(disbursementStats?.executedOrders || 0).toLocaleString("en-US")} أمر صرف منفذ بالكامل`,
      icon: Wallet,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
      link: "/disbursement-orders",
      badgeText: "أوامر منفذة",
    },
  ];

  // بطاقات الإحصائيات لمكتب المشاريع
  const projectsStatsCards = [
    {
      title: "المشاريع النشطة",
      value: ((projectStats as any)?.active || 0).toLocaleString("en-US"),
      subtext: "مشاريع إنشائية قيد التنفيذ",
      icon: FolderKanban,
      gradient: "from-indigo-600 to-blue-700",
      bgLight: "bg-indigo-50",
      link: "/projects",
    },
    {
      title: "المشاريع المكتملة",
      value: ((projectStats as any)?.completed || 0).toLocaleString("en-US"),
      subtext: "مشاريع تم إنجازها وتسليمها",
      icon: CheckCircle2,
      gradient: "from-emerald-600 to-teal-700",
      bgLight: "bg-emerald-50",
      link: "/projects",
    },
    {
      title: "طلبات التقييم والـ BOQ",
      value: (requestStats?.byStage?.technical_study || 0).toLocaleString("en-US"),
      subtext: "طلبات بمرحلة إعداد جداول الكميات",
      icon: FileSpreadsheet,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      link: "/quotations",
    },
    {
      title: "المساجد المسجلة",
      value: (mosqueStats?.total || 0).toLocaleString("en-US"),
      subtext: "مساجد معتمدة في النظام",
      icon: Building2,
      gradient: "from-teal-600 to-cyan-700",
      bgLight: "bg-teal-50",
      link: "/mosques",
    },
  ];

  // بطاقات الإحصائيات للفريق الميداني
  const fieldStatsCards = [
    {
      title: "طلبات المعاينة الميدانية",
      value: (requestStats?.byStage?.field_visit || 0).toLocaleString("en-US"),
      subtext: "زيارات ميدانية مجدولة وقيد المعاينة",
      icon: Calendar,
      gradient: "from-orange-500 to-amber-600",
      bgLight: "bg-orange-50",
      link: "/field-visits",
    },
    {
      title: "طلبات الاستجابة السريعة",
      value: (requestStats?.byStage?.quick_response || 0).toLocaleString("en-US"),
      subtext: "طلبات عاجلة تتطلب تدخلاً فورياً",
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-600",
      bgLight: "bg-red-50",
      link: "/requests?stage=quick_response",
    },
    {
      title: "طلبات قيد المتابعة",
      value: (requestStats?.byStatus?.in_progress || 0).toLocaleString("en-US"),
      subtext: "طلبات جارية بمختلف المراحل",
      icon: Clock,
      gradient: "from-blue-600 to-indigo-700",
      bgLight: "bg-blue-50",
      link: "/my-requests",
    },
    {
      title: "طلبات مكتملة",
      value: (requestStats?.byStatus?.completed || 0).toLocaleString("en-US"),
      subtext: "طلبات تم إنجازها بنجاح",
      icon: CheckCircle2,
      gradient: "from-emerald-600 to-green-700",
      bgLight: "bg-emerald-50",
      link: "/requests?status=completed",
    },
  ];

  // بطاقات الإحصائيات للاتصال المؤسسي
  const corporateCommStatsCards = [
    {
      title: "رضا المستفيدين",
      value: "96%",
      subtext: "مؤشر الرضا العام لطالبي الخدمة",
      icon: HeartHandshake,
      gradient: "from-teal-600 to-emerald-700",
      bgLight: "bg-teal-50",
      link: "/beneficiary-satisfaction",
    },
    {
      title: "الطلبات المكتملة",
      value: (requestStats?.byStatus?.completed || 0).toLocaleString("en-US"),
      subtext: "طلبات تم إغلاقها وخدمة أصحابها",
      icon: CheckCircle2,
      gradient: "from-blue-600 to-indigo-700",
      bgLight: "bg-blue-50",
      link: "/requests?status=completed",
    },
    {
      title: "المساجد المستفيدة",
      value: (mosqueStats?.total || 0).toLocaleString("en-US"),
      subtext: "مساجد مسجلة ومخدومة بالبوابة",
      icon: Building2,
      gradient: "from-purple-600 to-violet-700",
      bgLight: "bg-purple-50",
      link: "/mosques",
    },
    {
      title: "الشركاء والداعمين",
      value: "14",
      subtext: "جهات مانحة وشركاء نجاح",
      icon: Users,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      link: "/partners",
    },
  ];

  // روابط سريعة حسب الدور
  const getQuickLinks = () => {
    if (isFinancialRole) {
      return [
        { title: "طلبات الصرف", href: "/disbursements", icon: Receipt, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "أوامر الصرف", href: "/disbursement-orders", icon: FileCheck2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "دليل الموردين", href: "/suppliers", icon: Store, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "عروض الأسعار والـ BOQ", href: "/quotations", icon: FileSpreadsheet, color: "text-indigo-600", bg: "bg-indigo-50" },
        { title: "الاعتمادات المالية", href: "/financial-approval", icon: ShieldCheck, color: "text-teal-600", bg: "bg-teal-50" },
        { title: "العقود والاتفاقيات", href: "/contracts", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
        { title: "التقارير والتحليلات المالية", href: "/analytics-hub?tab=financial-report", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
      ];
    }

    if (isProjectsRole) {
      return [
        { title: "إدارة المشاريع", href: "/projects", icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-50" },
        { title: "تقارير المشاريع", href: "/project-reports", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "المساجد", href: "/mosques", icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "خريطة المساجد", href: "/mosques/map", icon: Target, color: "text-teal-600", bg: "bg-teal-50" },
        { title: "جداول الكميات والأسعار", href: "/quotations", icon: FileSpreadsheet, color: "text-amber-600", bg: "bg-amber-50" },
      ];
    }

    if (isFieldRole) {
      return [
        { title: "تقويم المواعيد", href: "/field-visits/calendar", icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "الزيارات الميدانية", href: "/field-visits", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "طلباتي المسندة", href: "/my-requests", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "إنشاء استجابة سريعة", href: "/requests/quick-create", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
      ];
    }

    if (isCorporateCommRole) {
      return [
        { title: "رضا المستفيدين", href: "/beneficiary-satisfaction", icon: HeartHandshake, color: "text-teal-600", bg: "bg-teal-50" },
        { title: "الشركاء والداعمين", href: "/partners", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "التقارير العامة", href: "/reports", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "الهوية والسمة", href: "/branding", icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50" },
      ];
    }

    // Default / Executive Admin
    return [
      { title: "جميع الطلبات", href: "/requests", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
      { title: "المساجد", href: "/mosques", icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
      { title: "المشاريع", href: "/projects", icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-50" },
      { title: "مركز التحليلات", href: "/analytics-hub", icon: BarChart3, color: "text-teal-600", bg: "bg-teal-50" },
      { title: "إدارة المستخدمين", href: "/users", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
      { title: "إعدادات النظام", href: "/settings", icon: Settings, color: "text-gray-600", bg: "bg-gray-50" },
    ];
  };

  const currentStatsCards = isFinancialRole 
    ? financialStatsCards 
    : isProjectsRole 
    ? projectsStatsCards 
    : isFieldRole 
    ? fieldStatsCards 
    : isCorporateCommRole 
    ? corporateCommStatsCards 
    : executiveStats;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8" dir="rtl">
        {/* Hero Section - رسالة الترحيب المخصصة للدور */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-4 sm:px-6 py-5 sm:py-6 text-white shadow-lg">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Activity className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
                <span className="text-white/40">•</span>
                <span className="font-semibold text-white">{roleLabel}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate" title={user?.name}>
                  مرحباً، {user?.name || "المستخدم"}
                </h1>
                <span className="text-white text-xs font-semibold bg-white/20 rounded-full px-3 py-0.5 whitespace-nowrap shadow-xs border border-white/20">
                  {roleLabel}
                </span>
              </div>
              <p className="text-white/80 text-xs sm:text-sm max-w-2xl">
                {getRoleSubtitle()}
              </p>
            </div>

            {/* الأزرار والإجراءات السريعة في الهيدر */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
              {isFinancialRole && (
                <>
                  <Link href="/disbursements/new">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>طلب صرف جديد</span>
                    </Button>
                  </Link>
                  <Link href="/disbursement-orders">
                    <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 h-9 rounded-xl border border-white/20">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>أوامر الصرف</span>
                    </Button>
                  </Link>
                </>
              )}

              {isProjectsRole && (
                <>
                  <Link href="/projects/new">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>مشروع جديد</span>
                    </Button>
                  </Link>
                  <Link href="/project-reports">
                    <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 h-9 rounded-xl border border-white/20">
                      <FileText className="w-3.5 h-3.5" />
                      <span>تقارير المشاريع</span>
                    </Button>
                  </Link>
                </>
              )}

              {isFieldRole && (
                <>
                  <Link href="/field-visits/calendar">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تقويم المواعيد</span>
                    </Button>
                  </Link>
                  <Link href="/my-requests">
                    <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 h-9 rounded-xl border border-white/20">
                      <FileText className="w-3.5 h-3.5" />
                      <span>طلباتي</span>
                    </Button>
                  </Link>
                </>
              )}

              {isCorporateCommRole && (
                <>
                  <Link href="/beneficiary-satisfaction">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>رضا المستفيدين</span>
                    </Button>
                  </Link>
                  <Link href="/partners">
                    <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 h-9 rounded-xl border border-white/20">
                      <Users className="w-3.5 h-3.5" />
                      <span>الشركاء</span>
                    </Button>
                  </Link>
                </>
              )}

              {isExecutiveAdmin && (
                <>
                  <Link href="/analytics-hub">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>مركز التحليلات</span>
                    </Button>
                  </Link>
                  <Link href="/requests">
                    <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 h-9 rounded-xl border border-white/20">
                      <FileText className="w-3.5 h-3.5" />
                      <span>جميع الطلبات</span>
                    </Button>
                  </Link>
                </>
              )}

              <Link href="/support">
                <Button 
                  variant="ghost" 
                  className="group flex items-center gap-2 bg-[#fafaf9] hover:bg-[#f4f4f3] text-teal-950 rounded-xl px-4 h-9 border border-neutral-200/30 text-xs font-semibold shadow-xs"
                  title="طلب الدعم الفني"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-teal-700" />
                  <span>الدعم الفني</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* بطاقات الإحصائيات المخصصة */}
        {isFinancialRole ? (
          /* ========================================================================= */
          /* كروت الإدارة المالية السبعة (7 Cards مطابقة تماماً لشكل بطاقات النظام في الصورة المرفقة) */
          /* ========================================================================= */
          <div className="space-y-3 sm:space-y-3.5">
            {/* الصف الأول: 4 كروت أساسية (طلبات الصرف، أوامر الصرف، الموردين، إجمالي المصروف) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              {[
                {
                  title: "إجمالي طلبات الصرف",
                  value: ((disbursementStats as any)?.totalRequests || 0).toLocaleString("en-US"),
                  subtext: `معتمد: ${((disbursementStats as any)?.approvedRequests || 0).toLocaleString("en-US")}`,
                  icon: Receipt,
                  gradient: "from-blue-600 to-indigo-600",
                  link: "/disbursements",
                },
                {
                  title: "إجمالي أوامر الصرف",
                  value: ((disbursementStats as any)?.totalOrders || 0).toLocaleString("en-US"),
                  subtext: `منفذ ومسدد: ${((disbursementStats as any)?.executedOrders || 0).toLocaleString("en-US")}`,
                  icon: FileCheck2,
                  gradient: "from-emerald-600 to-teal-600",
                  link: "/disbursement-orders",
                },
                {
                  title: "إجمالي الموردين",
                  value: ((supplierStats as any)?.total || 0).toLocaleString("en-US"),
                  subtext: `معتمد: ${((supplierStats as any)?.approved || 0).toLocaleString("en-US")}`,
                  icon: Store,
                  gradient: "from-purple-600 to-indigo-600",
                  link: "/suppliers",
                },
                {
                  title: "إجمالي المصروف",
                  value: formatCurrencyEn(disbursementStats?.totalPaid || 0),
                  subtext: `من واقع ${((disbursementStats as any)?.executedOrders || 0).toLocaleString("en-US")} أمر صرف منفذ`,
                  icon: Wallet,
                  gradient: "from-amber-500 to-orange-600",
                  link: "/disbursement-orders?status=executed",
                },
              ].map((stat, idx) => (
                <Link key={idx} href={stat.link} className="block transition-all duration-200 hover:-translate-y-1">
                  <Card className="relative overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-slate-700 transition-all rounded-xl bg-card">
                    <CardContent className="p-3.5 sm:p-4">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate tracking-tight">{stat.title}</p>
                          <p className="text-xl sm:text-[22px] font-extrabold font-mono text-slate-900 dark:text-white tracking-tight leading-tight">{stat.value}</p>
                          {stat.subtext && (
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{stat.subtext}</p>
                          )}
                        </div>
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-xs shrink-0 ring-3 ring-slate-100 dark:ring-slate-800/80`}>
                          <stat.icon className="w-5 h-5 text-white drop-shadow-xs" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* الصف الثاني: 4 كروت (العقود المعتمدة، قيم العقود المعتمدة، سندات الصرف المعتمدة، طلبات عروض الأسعار) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              {[
                {
                  title: "العقود المعتمدة",
                  value: ((disbursementStats as any)?.approvedContractsCount || 0).toLocaleString("en-US"),
                  subtext: "عقود موثقة وسارية بالنظام",
                  icon: FileSpreadsheet,
                  gradient: "from-blue-600 to-cyan-600",
                  link: "/contracts",
                },
                {
                  title: "إجمالي قيم العقود المعتمدة",
                  value: formatCurrencyEn((disbursementStats as any)?.approvedContractsAmount || 0),
                  subtext: `من واقع ${((disbursementStats as any)?.approvedContractsCount || 0).toLocaleString("en-US")} عقد معتمد`,
                  icon: Banknote,
                  gradient: "from-emerald-600 to-teal-600",
                  link: "/contracts",
                },
                {
                  title: "إجمالي سندات القبض المعتمدة",
                  value: formatCurrencyEn((disbursementStats as any)?.approvedReceiptVouchersAmount || 0),
                  subtext: `العدد: ${((disbursementStats as any)?.approvedReceiptVouchersCount || 0).toLocaleString("en-US")} سند قبض معتمد`,
                  icon: Receipt,
                  gradient: "from-teal-600 to-emerald-600",
                  link: "/receipt-vouchers",
                },
                {
                  title: "طلبات بمرحلة عروض الأسعار",
                  value: ((disbursementStats as any)?.quotationsRequestsCount || (requestStats as any)?.byStage?.financial_eval_and_approval || 0).toLocaleString("en-US"),
                  subtext: "بانتظار التقييم المالي والترسية",
                  icon: ClipboardList,
                  gradient: "from-violet-600 to-purple-600",
                  link: "/quotations",
                },
              ].map((stat, idx) => (
                <Link key={idx} href={stat.link} className="block transition-all duration-200 hover:-translate-y-1">
                  <Card className="relative overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-slate-700 transition-all rounded-xl bg-card">
                    <CardContent className="p-3.5 sm:p-4">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate tracking-tight">{stat.title}</p>
                          <p className="text-xl sm:text-[22px] font-extrabold font-mono text-slate-900 dark:text-white tracking-tight leading-tight">{stat.value}</p>
                          {stat.subtext && (
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{stat.subtext}</p>
                          )}
                        </div>
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-xs shrink-0 ring-3 ring-slate-100 dark:ring-slate-800/80`}>
                          <stat.icon className="w-5 h-5 text-white drop-shadow-xs" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentStatsCards.map((stat: any, index) => {
              const Content = (
                <Card className="relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                        <p className="text-xl sm:text-2xl font-bold font-mono text-foreground leading-none">{stat.value}</p>
                        {stat.subtext && (
                          <p className="text-[11px] text-muted-foreground truncate">{stat.subtext}</p>
                        )}
                        {stat.badgeText && (
                          <div className="pt-1">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                              {stat.badgeText}
                            </span>
                          </div>
                        )}
                        {typeof stat.change === 'number' && (
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            {stat.change >= 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className={`text-xs font-bold font-mono ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stat.change >= 0 ? '+' : ''}{stat.change}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">هذا الشهر</span>
                          </div>
                        )}
                      </div>
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-xs shrink-0`}>
                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );

              return stat.link ? (
                <Link key={index} href={stat.link} className="block transition-transform hover:-translate-y-0.5">
                  {Content}
                </Link>
              ) : (
                <div key={index}>{Content}</div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* قسم المسؤول المالي المخصص (الجداول وسجلات التدفق المالي) */}
        {/* ========================================================================= */}
        {isFinancialRole && (
          <div className="space-y-6">

            {/* أحدث طلبات الصرف وأوامر الصرف (تبويبات) مع تحسين التجربة والبحث الشامل */}
            <Card className="border border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-4 sm:p-5 sm:py-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2.5">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    <span>أحدث السجلات المالية</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm font-medium mt-1 text-muted-foreground">
                    {debouncedSearch 
                      ? `نتائج البحث عن "${debouncedSearch}" في كافة طلبات وأوامر الصرف المسجلة في النظام`
                      : "آخر طلبات وأوامر الصرف المسجلة مع إمكانية البحث الفوري في كافة السجلات"}
                  </CardDescription>
                </div>

                {/* حقل بحث شامل وأكبر وأوضح لجميع طلبات وأوامر الصرف */}
                <div className="relative w-full sm:w-80 md:w-[420px] shrink-0">
                  <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <Input
                    placeholder="بحث شامل برقم الطلب أو الأمر، البيان، أو المستفيد..."
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    className="h-11 sm:h-12 pr-11 pl-11 text-sm font-medium text-foreground bg-background border-2 border-slate-200 dark:border-slate-700 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl shadow-xs transition-all placeholder:text-muted-foreground/75"
                  />
                  {recordsSearch && (
                    <button
                      type="button"
                      onClick={() => setRecordsSearch("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                      title="مسح البحث"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {(isLoadingRequests || isLoadingOrders) && debouncedSearch && (
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs defaultValue="disbursements" dir="rtl" className="w-full">
                  <div className="px-4 pt-3 border-b border-border/60 bg-muted/20">
                    <TabsList className="bg-muted/60 p-1">
                      <TabsTrigger value="disbursements" className="text-xs sm:text-sm gap-2 font-bold py-1.5 px-3">
                        <Receipt className="w-4 h-4" />
                        <span>طلبات الصرف ({filteredRecentRequests.length})</span>
                      </TabsTrigger>
                      <TabsTrigger value="orders" className="text-xs sm:text-sm gap-2 font-bold py-1.5 px-3">
                        <FileCheck2 className="w-4 h-4" />
                        <span>أوامر الصرف ({filteredRecentOrders.length})</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* تبويب طلبات الصرف - محافظ تماماً على الخانات السبع مع تحسين تجربة القراءة والتفاعل */}
                  <TabsContent value="disbursements" className="m-0">
                    {filteredRecentRequests.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        {debouncedSearch ? (
                          <div className="space-y-1.5">
                            <p className="text-sm sm:text-base font-bold text-foreground">لا توجد طلبات صرف مطابقة لـ "{debouncedSearch}"</p>
                            <p className="text-xs text-muted-foreground">جرب البحث برقم طلب آخر أو اسم بيان أو مشروع مختلف</p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-medium">لا توجد طلبات صرف مسجلة</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-right">
                          <TableHeader className="bg-slate-100/90 dark:bg-slate-850 border-b border-border/80">
                            <TableRow>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">رقم الطلب</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">البيان / العنوان</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">المبلغ</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">طالب الصرف</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">الحالة</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">التاريخ</TableHead>
                              <TableHead className="text-center font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">إجراء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {filteredRecentRequests.map((req: any) => (
                              <TableRow key={req.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors">
                                {/* 1. رقم الطلب */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href="/disbursements" className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors text-xs sm:text-sm font-extrabold font-mono shadow-2xs">
                                    <span>{req.requestNumber}</span>
                                  </Link>
                                </TableCell>
                                
                                {/* 2. البيان / العنوان */}
                                <TableCell className="max-w-[320px] px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug truncate" title={req.title}>
                                    {req.title}
                                  </span>
                                </TableCell>

                                {/* 3. المبلغ */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                  {formatCurrencyEn(req.amount)}
                                </TableCell>

                                {/* 4. طالب الصرف */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                                    <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>{req.requestedByName || "مكتب المشاريع"}</span>
                                  </span>
                                </TableCell>

                                {/* 5. الحالة */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-extrabold py-1 px-3 rounded-lg ${
                                      req.status === 'approved' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                                        : req.status === 'paid' 
                                        ? 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800' 
                                        : req.status === 'rejected'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    }`}
                                  >
                                    {req.status === 'approved' ? 'معتمد' : req.status === 'paid' ? 'مصروف' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                  </Badge>
                                </TableCell>

                                {/* 6. التاريخ */}
                                <TableCell className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  {formatDateArabic(req.requestedAt)}
                                </TableCell>

                                {/* 7. إجراء */}
                                <TableCell className="text-center whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href="/disbursements">
                                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 border border-primary/30 rounded-lg gap-1.5 transition-all" title="معاينة تفاصيل الطلب">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>عرض</span>
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="p-3 border-t border-border/60 text-left bg-muted/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        {debouncedSearch
                          ? `تم العثور على ${filteredRecentRequests.length} طلب صرف مطابق للبحث`
                          : `عرض آخر ${filteredRecentRequests.length} طلبات مسجلة`}
                      </span>
                      <Link href="/disbursements">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-bold hover:bg-background">
                          <span>عرض جميع طلبات الصرف</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>

                  {/* تبويب أوامر الصرف - نفس الخانات مع تحسين التجربة والتفاعل */}
                  <TabsContent value="orders" className="m-0">
                    {filteredRecentOrders.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        {debouncedSearch ? (
                          <div className="space-y-1.5">
                            <p className="text-sm sm:text-base font-bold text-foreground">لا توجد أوامر صرف مطابقة لـ "{debouncedSearch}"</p>
                            <p className="text-xs text-muted-foreground">جرب البحث برقم أمر آخر أو اسم مستفيد مختلف</p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-medium">لا توجد أوامر صرف مسجلة</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-right">
                          <TableHeader className="bg-slate-100/90 dark:bg-slate-850 border-b border-border/80">
                            <TableRow>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">رقم الأمر</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">المستفيد / الجهة</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">المبلغ</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">طريقة الصرف</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">الحالة</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">التاريخ</TableHead>
                              <TableHead className="text-center font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">إجراء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {filteredRecentOrders.map((order: any) => (
                              <TableRow key={order.id} className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 transition-colors">
                                {/* 1. رقم الأمر */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href="/disbursement-orders" className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors text-xs sm:text-sm font-extrabold font-mono shadow-2xs">
                                    <span>{order.orderNumber}</span>
                                  </Link>
                                </TableCell>

                                {/* 2. المستفيد / الجهة */}
                                <TableCell className="max-w-[280px] px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug truncate" title={order.beneficiaryName || "-"}>
                                    {order.beneficiaryName || "-"}
                                  </span>
                                </TableCell>

                                {/* 3. المبلغ */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                  {formatCurrencyEn(order.amount)}
                                </TableCell>

                                {/* 4. طريقة الصرف */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                                    <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>{order.paymentMethod === 'sadad' ? 'فاتورة سداد' : 'تحويل بنكي'}</span>
                                  </span>
                                </TableCell>

                                {/* 5. الحالة */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-extrabold py-1 px-3 rounded-lg ${
                                      order.status === 'executed' || order.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                        : order.status === 'rejected'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    }`}
                                  >
                                    {order.status === 'executed' || order.status === 'paid' ? 'منفذ ومسدد' : order.status === 'rejected' ? 'مرفوض' : 'قيد الإجراء'}
                                  </Badge>
                                </TableCell>

                                {/* 6. التاريخ */}
                                <TableCell className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  {formatDateArabic(order.createdAt)}
                                </TableCell>

                                {/* 7. إجراء */}
                                <TableCell className="text-center whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href="/disbursement-orders">
                                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 border border-primary/30 rounded-lg gap-1.5 transition-all" title="معاينة تفاصيل أمر الصرف">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>عرض</span>
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="p-3 border-t border-border/60 text-left bg-muted/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        {debouncedSearch
                          ? `تم العثور على ${filteredRecentOrders.length} أمر صرف مطابق للبحث`
                          : `عرض آخر ${filteredRecentOrders.length} أوامر مسجلة`}
                      </span>
                      <Link href="/disbursement-orders">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-semibold hover:bg-background">
                          <span>عرض جميع أوامر الصرف</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* قسم المشاريع أو الفريق الميداني أو الاتصال المؤسسي أو الإدارة العليا */}
        {/* ========================================================================= */}
        {!isFinancialRole && (
          <div className="space-y-6">
            {/* توزيع الطلبات حسب البرنامج */}
            <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
              <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="w-4.5 h-4.5 text-primary" />
                    <span>الطلبات حسب البرنامج</span>
                  </CardTitle>
                  <CardDescription className="text-xs">توزيع الطلبات على البرامج التشغيلية والتنموية</CardDescription>
                </div>
                <Link href="/requests">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <span>عرض الكل</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(requestStats?.byProgram || {}).map(([program, data]) => {
                    const color = PROGRAM_COLORS[program] || '#6B7280';
                    const stats = data as { count: number; name?: string };
                    return (
                      <Link key={program} href={`/requests?program=${program}`}>
                        <div 
                          className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer min-w-0"
                          style={{ backgroundColor: `${color}08` }}
                        >
                          <ProgramIcon program={program} size="md" className="shrink-0" showBackground />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                              {stats.name || PROGRAM_LABELS[program] || program}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {(stats.count || 0).toLocaleString("en-US")} طلب
                            </p>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* الطلبات حسب المرحلة والحالة */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* حسب المرحلة */}
              <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>الطلبات حسب المرحلة</span>
                  </CardTitle>
                  <CardDescription className="text-xs">توزيع الطلبات على المراحل التشغيلية</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {Object.entries(requestStats?.byStage || {}).slice(0, 6).map(([stage, count]) => {
                    const percentage = Math.min(((count as number) / (requestStats?.total || 1)) * 100, 100);
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate max-w-[80%]">{STAGE_LABELS[stage] || stage}</span>
                          <Badge variant="secondary" className="font-bold font-mono text-[10px] h-5 px-1.5">
                            {(count as number).toLocaleString("en-US")}
                          </Badge>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    );
                  })}
                  {Object.keys(requestStats?.byStage || {}).length > 6 && (
                    <Link href="/requests">
                      <Button variant="ghost" className="w-full text-primary text-xs h-8">
                        <span>عرض جميع المراحل</span>
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* حسب الحالة */}
              <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>الطلبات حسب الحالة</span>
                  </CardTitle>
                  <CardDescription className="text-xs">توزيع الطلبات حسب حالتها الراهنة</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {Object.entries(requestStats?.byStatus || {}).map(([status, count]) => {
                    const percentage = Math.min(((count as number) / (requestStats?.total || 1)) * 100, 100);
                    const statusColors: Record<string, string> = {
                      new: 'bg-blue-500',
                      in_progress: 'bg-amber-500',
                      completed: 'bg-emerald-500',
                      rejected: 'bg-red-500',
                    };
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${statusColors[status] || 'bg-gray-400'}`} />
                            <span className="text-xs font-medium text-foreground truncate">{STATUS_LABELS[status] || status}</span>
                          </div>
                          <Badge variant="outline" className="font-bold font-mono text-[10px] h-5 px-1.5">
                            {(count as number).toLocaleString("en-US")}
                          </Badge>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* المستخدمون قيد الانتظار (للإدارة العامة فقط) */}
        {isExecutiveAdmin && pendingUsers && pendingUsers.length > 0 && (
          <Card className="border-0 shadow-xs border-r-4 border-r-red-500 rounded-2xl bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/80 dark:border-red-800/80">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">مستخدمون بانتظار الاعتماد</CardTitle>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>{pendingUsers.length} مستخدم بانتظار المراجعة</span>
                  </span>
                </div>
              </div>
              <Link href="/requester-approvals">
                <Button variant="outline" size="sm" className="h-8 text-xs hover:border-red-300 hover:text-red-600">
                  <span>عرض الكل</span>
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...pendingUsers]
                  .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
                  .slice(0, 6)
                  .map((pendingUser) => (
                    <div key={pendingUser.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {pendingUser.name?.charAt(0) || 'م'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">{pendingUser.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">{pendingUser.email}</p>
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0 text-red-500" />
                          <span>{getArabicTimeAgo(pendingUser.createdAt)}</span>
                        </p>
                      </div>
                      <Link href={`/requester-approvals/${pendingUser.id}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2">
                          مراجعة
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* الروابط السريعة المخصصة للدور - تظهر لجميع الأدوار ما عدا المسؤول المالي */}
        {!isFinancialRole && (
          <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <span>الوصول السريع لمهام {roleLabel}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                روابط مباشرة لأهم الصفحات والوظائف الخاصة بدورك
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {getQuickLinks().map((link, idx) => {
                  const IconComponent = link.icon;
                  return (
                    <Link key={idx} href={link.href} className="group block">
                      <div className="p-3.5 rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-xs transition-all text-center flex flex-col items-center gap-2 bg-muted/20 hover:bg-muted/40">
                        <div className={`w-10 h-10 rounded-xl ${link.bg} flex items-center justify-center ${link.color} transition-transform group-hover:scale-110 shadow-2xs`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate w-full">
                          {link.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
