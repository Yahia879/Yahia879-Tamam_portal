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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
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

function formatDateEn(dateStr: any): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
  const { data: recentRequestsData } = trpc.disbursements.listRequests.useQuery({ limit: 5 }, {
    enabled: isFinancialRole,
  });
  const { data: recentOrdersData } = trpc.disbursements.listOrders.useQuery({ limit: 5 }, {
    enabled: isFinancialRole,
  });

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
      subtext: `معتمد: ${(disbursementStats?.approvedRequests || 0).toLocaleString("en-US")} | بانتظار الاعتماد: ${(disbursementStats?.pendingRequests || 0).toLocaleString("en-US")}`,
      icon: Receipt,
      gradient: "from-blue-600 to-indigo-700",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      link: "/disbursements",
      badgeText: "طلبات الصرف",
    },
    {
      title: "إجمالي أوامر الصرف",
      value: (disbursementStats?.totalOrders || 0).toLocaleString("en-US"),
      subtext: `منفذ: ${(disbursementStats?.executedOrders || 0).toLocaleString("en-US")} | قيد الإجراء: ${(disbursementStats?.pendingOrders || 0).toLocaleString("en-US")}`,
      icon: FileCheck2,
      gradient: "from-emerald-600 to-teal-700",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      link: "/disbursement-orders",
      badgeText: "أوامر الصرف",
    },
    {
      title: "إجمالي الموردين",
      value: (supplierStats?.total || 0).toLocaleString("en-US"),
      subtext: `معتمد: ${(supplierStats?.approved || 0).toLocaleString("en-US")} | قيد المراجعة: ${(supplierStats?.pending || 0).toLocaleString("en-US")}`,
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

        {/* بطاقات الإحصائيات الأربع المخصصة */}
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

        {/* ========================================================================= */}
        {/* قسم المسؤول المالي المخصص (طلبات الصرف، أوامر الصرف، الموردين، التدفق المالي) */}
        {/* ========================================================================= */}
        {isFinancialRole && (
          <div className="space-y-6">
            {/* أحدث طلبات الصرف وأوامر الصرف (تبويبات) */}

            {/* أحدث طلبات الصرف وأوامر الصرف (تبويبات) */}
            <Card className="border border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="w-4.5 h-4.5 text-primary" />
                    <span>أحدث السجلات المالية</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    آخر طلبات وأوامر الصرف المسجلة في النظام
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="disbursements" dir="rtl" className="w-full">
                  <div className="px-4 pt-3 border-b border-border/60 bg-muted/20">
                    <TabsList className="bg-muted/60 p-1">
                      <TabsTrigger value="disbursements" className="text-xs gap-1.5 font-bold">
                        <Receipt className="w-3.5 h-3.5" />
                        <span>أحدث طلبات الصرف ({recentRequestsData?.requests?.length || 0})</span>
                      </TabsTrigger>
                      <TabsTrigger value="orders" className="text-xs gap-1.5 font-bold">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>أحدث أوامر الصرف ({recentOrdersData?.orders?.length || 0})</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* تبويب طلبات الصرف */}
                  <TabsContent value="disbursements" className="m-0">
                    {!recentRequestsData?.requests || recentRequestsData.requests.length === 0 ? (
                      <div className="p-10 text-center text-muted-foreground text-xs">
                        لا توجد طلبات صرف حديثة
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-xs text-right">
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="text-right">رقم الطلب</TableHead>
                              <TableHead className="text-right">البيان / العنوان</TableHead>
                              <TableHead className="text-right">المبلغ</TableHead>
                              <TableHead className="text-right">طالب الصرف</TableHead>
                              <TableHead className="text-right">الحالة</TableHead>
                              <TableHead className="text-right">التاريخ</TableHead>
                              <TableHead className="text-center">إجراء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {recentRequestsData.requests.map((req: any) => (
                              <TableRow key={req.id} className="hover:bg-muted/30">
                                <TableCell className="font-mono font-bold text-primary">
                                  {req.requestNumber}
                                </TableCell>
                                <TableCell className="max-w-[240px] truncate font-medium">
                                  {req.title}
                                </TableCell>
                                <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrencyEn(req.amount)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {req.requestedByName || "مكتب المشاريع"}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] font-bold py-0.5 px-2 ${
                                      req.status === 'approved' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : req.status === 'paid' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {req.status === 'approved' ? 'معتمد' : req.status === 'paid' ? 'مصروف' : 'قيد المراجعة'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                  {formatDateEn(req.requestedAt)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Link href="/disbursements">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                      <Eye className="w-3.5 h-3.5 text-primary" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="p-3 border-t border-border/60 text-left bg-muted/10">
                      <Link href="/disbursements">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                          <span>عرض جميع طلبات الصرف</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>

                  {/* تبويب أوامر الصرف */}
                  <TabsContent value="orders" className="m-0">
                    {!recentOrdersData?.orders || recentOrdersData.orders.length === 0 ? (
                      <div className="p-10 text-center text-muted-foreground text-xs">
                        لا توجد أوامر صرف حديثة
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-xs text-right">
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="text-right">رقم الأمر</TableHead>
                              <TableHead className="text-right">المستفيد / الجهة</TableHead>
                              <TableHead className="text-right">المبلغ</TableHead>
                              <TableHead className="text-right">طريقة الصرف</TableHead>
                              <TableHead className="text-right">الحالة</TableHead>
                              <TableHead className="text-right">التاريخ</TableHead>
                              <TableHead className="text-center">إجراء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {recentOrdersData.orders.map((order: any) => (
                              <TableRow key={order.id} className="hover:bg-muted/30">
                                <TableCell className="font-mono font-bold text-primary">
                                  {order.orderNumber}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate font-medium">
                                  {order.beneficiaryName || "-"}
                                </TableCell>
                                <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrencyEn(order.amount)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {order.paymentMethod === 'sadad' ? 'فاتورة سداد' : 'تحويل بنكي'}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] font-bold py-0.5 px-2 ${
                                      order.status === 'executed' || order.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {order.status === 'executed' || order.status === 'paid' ? 'منفذ ومسدد' : 'قيد الإجراء'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                  {formatDateEn(order.createdAt)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Link href="/disbursement-orders">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                      <Eye className="w-3.5 h-3.5 text-primary" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="p-3 border-t border-border/60 text-left bg-muted/10">
                      <Link href="/disbursement-orders">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
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
