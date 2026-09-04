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
  ChevronRight,
  Eye,
  ExternalLink,
  Wallet,
  Sparkles,
  ClipboardList,
  ClipboardCheck,
  XCircle,
  Search,
  Loader2,
  X,
  MapPin,
  Zap,
  Phone,
  CalendarDays,
  Languages,
  Star,
  Send,
  Palette,
  Handshake,
  MessageSquare,
  Mail,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths, 
  isToday as isDateToday, 
  parseISO 
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS, PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS, PROGRAM_COLORS } from "@shared/constants";
import { calculateBeneficiarySLA } from "@/lib/slaHelper";



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
    customRoleNameAr === "مدير عام" ||
    customRoleNameEn === "executive director" ||
    customRoleNameEn === "general manager";

  const isExecutiveAdmin = 
    ["super_admin", "system_admin", "general_manager", "executive_director"].includes(user?.role || "") ||
    customRoleNameAr === "مدير النظام" ||
    customRoleNameAr === "مدير عام" ||
    customRoleNameAr === "المدير التنفيذي" ||
    customRoleNameEn === "system admin" ||
    isExecDirector;

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

  // حالة اللغة الخاصة بدور الاستجابة السريعة (quick_response)
  const isQuickResponse = 
    user?.role === "quick_response" ||
    customRoleNameAr.includes("استجابة") ||
    customRoleNameEn.includes("quick_response");

  const [quickResponseLang, setQuickResponseLang] = useState<"ar" | "en">(() => {
    return (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  });

  const isEn = isQuickResponse && quickResponseLang === "en";

  const handleToggleQuickResponseLang = () => {
    const nextLang = quickResponseLang === "ar" ? "en" : "ar";
    setQuickResponseLang(nextLang);
    localStorage.setItem("quick-response-lang", nextLang);
    window.dispatchEvent(new Event("storage"));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("quick-response-lang") as "ar" | "en";
      if (stored && (stored === "ar" || stored === "en")) {
        setQuickResponseLang(stored);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // توجيه طالب الخدمة فقط إلى بوابته الخاصة
  useEffect(() => {
    if (!user) return;
    if (user.role === "service_requester") {
      navigate("/requester", { replace: true });
    }
  }, [user, navigate]);

  // جلب إعدادات مهلة المستفيدين (SLA)
  const { data: slaSettingsData } = trpc.escalation.getSettings.useQuery();
  const allowedDays = slaSettingsData?.beneficiarySLA?.durationDays ?? 3;

  // جلب الإحصائيات العامة
  const { data: requestStats } = trpc.requests.getStats.useQuery();
  const { data: mosqueStats } = trpc.mosques.getStats.useQuery();

  // جلب الإحصائيات المالية (للمسؤول المالي ومكتب المشاريع والإدارة العليا ومجلس الإدارة)
  const { data: disbursementStats } = trpc.disbursements.getStats.useQuery(undefined, {
    enabled: isFinancialRole || isProjectsRole || isExecutiveAdmin || isBoardRole,
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

  // حالة البحث الشامل لمكتب إدارة المشاريع (المشاريع، الطلبات، المساجد)
  const [projectsSearch, setProjectsSearch] = useState("");
  const [debouncedProjectsSearch, setDebouncedProjectsSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProjectsSearch(projectsSearch.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [projectsSearch]);

  const { data: recentProjectsData, isLoading: isLoadingProjects } = trpc.projects.getAll.useQuery(
    { 
      limit: debouncedProjectsSearch ? 50 : 5,
      search: debouncedProjectsSearch || undefined,
    }, 
    {
      enabled: isProjectsRole || isCorporateCommRole,
    }
  );

  const { data: recentRequestsDataProjects, isLoading: isLoadingRequestsProjects } = trpc.requests.search.useQuery(
    { 
      limit: debouncedProjectsSearch ? 50 : 5,
      search: debouncedProjectsSearch || undefined,
    }, 
    {
      enabled: isProjectsRole || isCorporateCommRole,
    }
  );

  const { data: recentMosquesDataProjects, isLoading: isLoadingMosquesProjects } = trpc.mosques.search.useQuery(
    { 
      limit: debouncedProjectsSearch ? 50 : 5,
      search: debouncedProjectsSearch || undefined,
    }, 
    {
      enabled: isProjectsRole || isCorporateCommRole,
    }
  );

  const filteredRecentProjects = Array.isArray(recentProjectsData) ? recentProjectsData : (recentProjectsData as any)?.projects || [];
  const filteredRecentRequestsProjects = recentRequestsDataProjects?.requests || [];
  const filteredRecentMosquesProjects = recentMosquesDataProjects?.mosques || [];

  // حالة البحث الشامل والبيانات المخصصة للفريق الميداني
  const [fieldSearch, setFieldSearch] = useState("");
  const [debouncedFieldSearch, setDebouncedFieldSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFieldSearch(fieldSearch.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [fieldSearch]);

  const currentMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const currentMonthEnd = useMemo(() => endOfMonth(new Date()), []);
  const startDateMonthStr = useMemo(() => format(currentMonthStart, "yyyy-MM-dd"), [currentMonthStart]);
  const endDateMonthStr = useMemo(() => format(currentMonthEnd, "yyyy-MM-dd"), [currentMonthEnd]);
  const todayDateStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // إحصائيات تقويم الميداني
  const { data: calendarStats } = trpc.calendar.getCalendarSummaryStats.useQuery(
    {
      startDate: startDateMonthStr,
      endDate: endDateMonthStr,
    },
    { enabled: isFieldRole }
  );

  // الزيارات والمواعيد الميدانية الموحدة
  const { data: rawFieldEvents = [], isLoading: isLoadingFieldEvents } = trpc.calendar.getUnifiedEvents.useQuery(
    {
      eventType: "all",
      search: debouncedFieldSearch || undefined,
    },
    { enabled: isFieldRole }
  );
  const fieldEvents: any[] = Array.isArray(rawFieldEvents) ? rawFieldEvents : [];

  // طلبات مرحلة المعاينة الميدانية
  const { data: pendingFieldRequestsData, isLoading: isLoadingPendingField } = trpc.requests.search.useQuery(
    {
      currentStage: "field_visit",
      search: debouncedFieldSearch || undefined,
      limit: 50,
    },
    { enabled: isFieldRole }
  );
  const pendingFieldRequests = pendingFieldRequestsData?.requests || [];

  // مواعيد اليوم والمهام العاجلة
  const todayFieldEvents = useMemo(() => {
    return fieldEvents.filter((evt: any) => evt.date === todayDateStr || evt.priority === "urgent");
  }, [fieldEvents, todayDateStr]);

  // إحصائيات لوحة التحكم الخاصة بعضو الفريق الميداني (مخصصة لحسابه الشخصي)
  const { data: fieldUserStats } = trpc.requests.getFieldTeamDashboardStats.useQuery(undefined, {
    enabled: isFieldRole,
  });

  // التقويم التشغيلي للفريق الميداني
  const [currentCalMonth, setCurrentCalMonth] = useState<Date>(() => new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [fieldViewMode, setFieldViewMode] = useState<"calendar" | "list">("calendar");

  // حساب أيام شبكة التقويم للشهر المختار (الأسبوع يبدأ بالأحد)
  const calGridDays = useMemo(() => {
    const monthStart = startOfMonth(currentCalMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentCalMonth]);

  // مواعيد اليوم المحدد في التقويم
  const selectedDayEvents = useMemo(() => {
    return fieldEvents.filter((evt: any) => evt.date === selectedCalDate);
  }, [fieldEvents, selectedCalDate]);

  // التاريخ المحدد بصيغة مقروءة (عربي أو إنجليزي)
  const selectedDateFormatted = useMemo(() => {
    try {
      const parsed = parseISO(selectedCalDate);
      return format(parsed, isEn ? "EEEE, d MMMM yyyy" : "EEEE، d MMMM yyyy", { locale: isEn ? enUS : ar });
    } catch {
      return selectedCalDate;
    }
  }, [selectedCalDate, isEn]);

  // المواعيد القادمة من اليوم فصاعداً
  const upcomingMonthEvents = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return fieldEvents
      .filter((evt: any) => evt.date && evt.date >= todayStr)
      .sort((a: any, b: any) => (a.date > b.date ? 1 : -1))
      .slice(0, 5);
  }, [fieldEvents]);

  // ترجمة اسم البرنامج إلى الإنجليزية عند الحاجة
  const translateProgramName = (type: string) => {
    if (isEn) {
      const enLabels: Record<string, string> = {
        bunyan: "Bunyan",
        daaem: "Daaem",
        enaya: "Enaya",
        emdad: "Emdad",
        ethraa: "Ethraa",
        sedana: "Sedana",
        taqa: "Taqa",
        miyah: "Miyah",
        suqya: "Suqya",
      };
      return enLabels[type] || type;
    }
    return PROGRAM_LABELS[type] || type;
  };

  // جلب إحصائيات المشاريع (لمكتب المشاريع والإدارة العليا ومجلس الإدارة ودور الاتصال المؤسسي)
  const { data: projectStats } = trpc.projects.getStats.useQuery(undefined, {
    enabled: isProjectsRole || isExecutiveAdmin || isBoardRole || isCorporateCommRole,
  });

  // جلب إحصائيات النمو والمستخدمين المعلقين للإدارة العليا
  const { data: pendingUsers } = trpc.auth.getPendingUsers.useQuery(undefined, {
    enabled: isExecutiveAdmin,
  });
  const { data: growthStats } = trpc.analytics.getMonthlyGrowth.useQuery(undefined, {
    enabled: isExecutiveAdmin,
  });

  // اسم الدور المعروض في الواجهة
  const roleLabel = isEn
    ? (customRoleNameEn || "Quick Response Team")
    : (customRoleNameAr || ROLE_LABELS[user?.role || ""] || user?.role);

  // العنوان الفرعي حسب الدور
  const getRoleSubtitle = () => {
    if (isFinancialRole) {
      return "لوحة مؤشرات الإدارة المالية: متابعة طلبات الصرف، أوامر الصرف، الموردين، والاعتمادات المالية";
    }
    if (isProjectsRole) {
      return "لوحة إدارة المشاريع: متابعة المشاريع، جداول الكميات، وتقارير الإنجاز الفنية";
    }
    if (isFieldRole) {
      if (isEn) {
        return "Quick Response & Field Dashboard: manage urgent requests, scheduled appointments, and action reports.";
      }
      return "لوحة المتابعة الميدانية: مواعيد الزيارات، استمارات المعاينة، وطلبات الاستجابة السريعة";
    }
    if (isCorporateCommRole) {
      return "لوحة الاتصال المؤسسي: متابعة المشاريع والمساجد، طلبات المساجد، وسجلات الإنجاز التشغيلية";
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

  // بطاقات الإحصائيات للفريق الميداني والاستجابة السريعة
  const fieldStatsCards = [
    {
      title: isEn ? "Total Assigned Requests" : "إجمالي الطلبات المسندة لك",
      value: (fieldUserStats?.assignedCount ?? 0).toLocaleString("en-US"),
      subtext: isEn ? "Requests assigned to your account" : "طلبات كلف بها حسابك للمتابعة",
      icon: FileText,
      gradient: "from-blue-600 to-indigo-600",
      bgLight: "bg-blue-50",
      link: isQuickResponse ? "/requests" : "/my-requests",
    },
    {
      title: isEn ? "Today's Tasks & Visits" : "طلبات اليوم",
      value: (fieldUserStats?.todayCount ?? 0).toLocaleString("en-US"),
      subtext: isEn ? "Scheduled for today" : "معاينات وزيارات مجدولة لليوم",
      icon: CalendarDays,
      gradient: "from-teal-600 to-emerald-600",
      bgLight: "bg-teal-50",
      link: "/field-visits/calendar",
    },
    {
      title: isEn ? "Total Completed Requests" : (
        isQuickResponse ? "إجمالي طلبات الاستجابة المكتملة" : "إجمالي الطلبات المنجزة"
      ),
      value: isQuickResponse
        ? (fieldUserStats?.quickResponseWithReportCount ?? 0).toLocaleString("en-US")
        : (fieldUserStats?.completedCount ?? 0).toLocaleString("en-US"),
      subtext: isEn ? "Approved and completed requests" : (
        isQuickResponse ? "طلبات استجابة سريعة تم رفع تقرير لها" : "طلبات وتقارير تم اعتماد إنجازها"
      ),
      icon: CheckCircle2,
      gradient: "from-emerald-600 to-teal-600",
      bgLight: "bg-emerald-50",
      link: "/requests?status=completed",
    },
    {
      title: isEn ? "Pending Reports" : (
        isQuickResponse ? "طلبات الاستجابة السريعة النشطة" : "إجمالي الطلبات بحاجة لرفع تقرير زيارة ميدانية"
      ),
      value: isQuickResponse
        ? (fieldUserStats?.quickResponseActiveCount ?? 0).toLocaleString("en-US")
        : (fieldUserStats?.pendingReportCount ?? 0).toLocaleString("en-US"),
      subtext: isEn ? "Requests awaiting report submission" : (
        isQuickResponse ? "طلبات قيد التنفيذ تتطلب متابعة" : "طلبات بمرحلة المعاينة الميدانية"
      ),
      icon: ClipboardCheck,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      link: isQuickResponse ? "/requests?stage=quick_response" : "/my-requests?stage=field_visit",
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

  // =========================================================================
  // لوحة تحكم الإدارة العليا (مدير عام، مدير النظام، المدير التنفيذي)
  // مستعادة تماماً كما كانت في commit: a0d479f35d57725a5a146db0b840f88a0294f4a0
  // =========================================================================
  if (isExecutiveAdmin) {
  const completionRate = requestStats?.total 
    ? Math.round(((requestStats?.byStatus?.completed || 0) / requestStats.total) * 100) 
    : 0;


  const mainStats = [
    {
      title: "إجمالي الطلبات",
      value: requestStats?.total || 0,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
      change: growthStats?.totalRequests.percentage,
      trend: (growthStats?.totalRequests.percentage ?? 0) >= 0 ? "up" : "down",
    },
    {
      title: "المساجد المسجلة",
      value: mosqueStats?.total || 0,
      icon: Building2,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
      change: growthStats?.registeredMosques.percentage,
      trend: (growthStats?.registeredMosques.percentage ?? 0) >= 0 ? "up" : "down",
    },
    {
      title: "قيد التنفيذ",
      value: requestStats?.byStatus?.in_progress || 0,
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-600",
      change: growthStats?.inProgressRequests.percentage,
      trend: (growthStats?.inProgressRequests.percentage ?? 0) >= 0 ? "up" : "down",
    },
    {
      title: "مكتملة",
      value: requestStats?.byStatus?.completed || 0,
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      bgLight: "bg-green-50",
      textColor: "text-green-600",
      change: growthStats?.completedRequests.percentage,
      trend: (growthStats?.completedRequests.percentage ?? 0) >= 0 ? "up" : "down",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Section - رسالة الترحيب */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-4 sm:px-6 py-4 sm:py-6 text-white shadow-lg">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-white/60 text-[10px] sm:text-xs">
                <Activity className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/30" />
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate" title={user?.name}>
                  مرحباً، {user?.name || "المستخدم"}
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
              <Link href="/support">
                <Button 
                  size="default" 
                  variant="ghost" 
                  className="group flex items-center gap-2.5 bg-[#fafaf9] hover:bg-[#f4f4f3] text-teal-950 rounded-xl px-5 h-10 border border-neutral-200/30 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
                  title="طلب الدعم الفني"
                >
                  {/* Soft emerald status dot with a slow, gentle ping */}
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

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {mainStats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2 min-w-0">
                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-xl sm:text-3xl font-bold text-foreground leading-none">{stat.value}</p>
                    {typeof stat.change === 'number' && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {stat.change >= 0 ? (
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                        ) : (
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 transform scale-y-[-1]" />
                        )}
                        <span className={`text-[10px] sm:text-sm font-medium ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.change >= 0 ? '+' : ''}{stat.change}%
                        </span>
                        <span className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">هذا الشهر</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md shrink-0 order-first sm:order-last`}>
                    <stat.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>
                {/* Decorative element */}
                <div className={`absolute -bottom-4 -left-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full ${stat.bgLight} opacity-50`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* الطلبات حسب البرنامج */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    الطلبات حسب البرنامج
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">توزيع الطلبات على البرامج التسعة</CardDescription>
                </div>
                <Link href="/requests">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9">
                    عرض الكل
                    <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Object.entries(requestStats?.byProgram || {}).map(([program, data]) => {
                  const color = PROGRAM_COLORS[program] || '#6B7280';
                  const stats = data as { count: number; name?: string };
                  return (
                    <Link key={program} href={`/requests?program=${program}`}>
                      <div 
                        className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer min-w-0"
                        style={{ backgroundColor: `${color}08` }}
                      >
                        <ProgramIcon program={program} size="md" className="sm:size-lg shrink-0" showBackground />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm lg:text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {stats.name || PROGRAM_LABELS[program] || program}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {stats.count} طلب
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

        </div>

        {/* الطلبات حسب المرحلة والحالة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* حسب المرحلة */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                الطلبات حسب المرحلة
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">توزيع الطلبات على المراحل الـ 11</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(requestStats?.byStage || {}).slice(0, 6).map(([stage, count]) => {
                  const percentage = Math.min(((count as number) / (requestStats?.total || 1)) * 100, 100);
                  return (
                    <div key={stage} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[80%]">{STAGE_LABELS[stage] || stage}</span>
                        <Badge variant="secondary" className="font-bold text-[10px] sm:text-xs h-5 px-1.5">
                          {count as number}
                        </Badge>
                      </div>
                      <Progress value={percentage} className="h-1.5 sm:h-2" />
                    </div>
                  );
                })}
                {Object.keys(requestStats?.byStage || {}).length > 6 && (
                  <Link href="/requests">
                    <Button variant="ghost" className="w-full text-primary text-xs sm:text-sm h-8 sm:h-10">
                      عرض جميع المراحل
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* حسب الحالة */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                الطلبات حسب الحالة
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">توزيع الطلبات حسب حالتها الحالية</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(requestStats?.byStatus || {}).map(([status, count]) => {
                  const percentage = Math.min(((count as number) / (requestStats?.total || 1)) * 100, 100);
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-500',
                    approved: 'bg-green-500',
                    in_progress: 'bg-blue-500',
                    completed: 'bg-emerald-500',
                    rejected: 'bg-red-500',
                  };
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[status] || 'bg-gray-400'}`} />
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{STATUS_LABELS[status] || status}</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px] sm:text-xs h-5 px-1.5">
                          {count as number}
                        </Badge>
                      </div>
                      <div className="w-full h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${statusColors[status] || 'bg-gray-400'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* المستخدمون قيد الانتظار (للمدراء فقط) */}
        {pendingUsers && pendingUsers.length > 0 && (
          <Card className="border-0 shadow-sm border-r-4 border-r-red-500">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/80 dark:border-red-800/80">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base sm:text-lg">مستخدمون بانتظار الاعتماد</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/80 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-600 dark:text-red-400 font-black">{pendingUsers.length}</span>
                        <span>مستخدم بانتظار المراجعة</span>
                      </span>
                    </div>
                  </div>
                </div>
                <Link href="/requester-approvals">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 hover:border-red-300 hover:text-red-600">
                    عرض الكل
                    <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[...pendingUsers]
                  .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
                  .slice(0, 6)
                  .map((pendingUser) => (
                    <div key={pendingUser.id} className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-xl min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0">
                        {pendingUser.name?.charAt(0) || 'م'}
                      </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{pendingUser.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{pendingUser.email}</p>
                          {(() => {
                            const slaInfo = calculateBeneficiarySLA(pendingUser.createdAt, allowedDays);
                            return (
                              <p className={`text-[10px] sm:text-[11px] font-semibold mt-1 flex items-center gap-1 ${slaInfo.isDelayed ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                <Clock className={`w-3.5 h-3.5 shrink-0 ${slaInfo.isDelayed ? "text-red-500" : "text-emerald-500"}`} />
                                <span>{slaInfo.isDelayed ? `متأخر ${slaInfo.delayText}` : `ضمن المهلة (${slaInfo.elapsedText})`}</span>
                              </p>
                            );
                          })()}
                        </div>
                      <Link href={`/requester-approvals/${pendingUser.id}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3">
                          مراجعة
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8" dir={isEn ? "ltr" : "rtl"}>
        {/* Hero Section - رسالة الترحيب المخصصة للدور */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-4 sm:px-6 py-5 sm:py-6 text-white shadow-lg">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Activity className="w-3.5 h-3.5" />
                <span>{isEn ? "Home" : "الرئيسية"}</span>
                <span className="text-white/40">•</span>
                <span className="font-semibold text-white">{roleLabel}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate" title={user?.name}>
                  {isEn ? `Welcome, ${user?.name || "User"}` : `مرحباً، ${user?.name || "المستخدم"}`}
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
                  <Link href="/service-request">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>طلب جديد</span>
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
                  {isQuickResponse ? (
                    <>
                      <Link href="/requests/quick-create">
                        <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs">
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isEn ? "Quick Request" : "طلب سريع"}</span>
                        </Button>
                      </Link>
                      <Link href="/requests">
                        <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 h-9 rounded-xl border border-white/20">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{isEn ? "Requests" : "الطلبات"}</span>
                        </Button>
                      </Link>
                    </>
                  ) : (
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
                  title={isEn ? "Technical Support" : "طلب الدعم الفني"}
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-teal-700" />
                  <span>{isEn ? "Technical Support" : "الدعم الفني"}</span>
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
                          <p className="text-xl sm:text-[22px] font-semibold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{stat.value}</p>
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
                          <p className="text-xl sm:text-[22px] font-semibold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{stat.value}</p>
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
        ) : isProjectsRole ? (
          /* ========================================================================= */
          /* كروت مكتب إدارة المشاريع (8 Cards في صفين منظمين ومضغوطين) */
          /* ========================================================================= */
          <div className="space-y-3 sm:space-y-3.5">
            {/* الصف الأول: 4 كروت أساسية للمشاريع والمساجد */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              {[
                {
                  title: "إجمالي المشاريع",
                  value: ((projectStats as any)?.total || 0).toLocaleString("en-US"),
                  subtext: `قيد التنفيذ: ${((projectStats as any)?.inProgress || 0).toLocaleString("en-US")} | مكتمل: ${((projectStats as any)?.completed || 0).toLocaleString("en-US")}`,
                  icon: FolderKanban,
                  gradient: "from-blue-600 to-indigo-600",
                  link: "/projects",
                },
                {
                  title: "المشاريع قيد التنفيذ",
                  value: ((projectStats as any)?.inProgress || 0).toLocaleString("en-US"),
                  subtext: "مشاريع إنشائية وميدانية تحت الإشراف",
                  icon: Activity,
                  gradient: "from-amber-500 to-orange-600",
                  link: "/projects?status=in_progress",
                },
                {
                  title: "المشاريع المكتملة",
                  value: ((projectStats as any)?.completed || 0).toLocaleString("en-US"),
                  subtext: "مشاريع تم إنجازها وتسليمها بالكامل",
                  icon: CheckCircle2,
                  gradient: "from-emerald-600 to-teal-600",
                  link: "/projects?status=completed",
                },
                {
                  title: "المساجد المسجلة",
                  value: ((mosqueStats as any)?.total || 0).toLocaleString("en-US"),
                  subtext: "مساجد معتمدة في النظام الجغرافي",
                  icon: Building2,
                  gradient: "from-teal-600 to-cyan-600",
                  link: "/mosques",
                },
              ].map((stat, idx) => (
                <Link key={idx} href={stat.link} className="block h-full transition-all duration-200 hover:-translate-y-1">
                  <Card className="h-full relative overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-slate-700 transition-all rounded-xl bg-card">
                    <CardContent className="p-3.5 sm:p-4 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate tracking-tight">{stat.title}</p>
                          <p className="text-xl sm:text-[22px] font-semibold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{stat.value}</p>
                          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {stat.subtext || <span className="invisible select-none">&nbsp;</span>}
                          </p>
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

            {/* الصف الثاني: 4 كروت للطلبات، جداول الكميات، العقود، والميزانيات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              {[
                {
                  title: "إجمالي طلبات المساجد",
                  value: ((requestStats as any)?.total || 0).toLocaleString("en-US"),
                  subtext: `قيد المعالجة: ${((requestStats as any)?.byStatus?.in_progress || 0).toLocaleString("en-US")} طلب`,
                  icon: FileText,
                  gradient: "from-purple-600 to-indigo-600",
                  link: "/requests",
                },
                {
                  title: "طلبات إعداد جداول الكميات (BOQ)",
                  value: ((requestStats as any)?.byStage?.technical_study || 0).toLocaleString("en-US"),
                  subtext: "بانتظار دراسة وحصر جداول الكميات",
                  icon: FileSpreadsheet,
                  gradient: "from-amber-600 to-yellow-600",
                  link: "/quotations",
                },
                {
                  title: "العقود المعتمدة",
                  value: ((disbursementStats as any)?.approvedContractsCount || 0).toLocaleString("en-US"),
                  subtext: `بقيمة: ${formatCurrencyEn((disbursementStats as any)?.approvedContractsAmount || 0)}`,
                  icon: Receipt,
                  gradient: "from-blue-600 to-cyan-600",
                  link: "/contracts",
                },
                {
                  title: "إجمالي الميزانيات التقديرية",
                  value: formatCurrencyEn((projectStats as any)?.totalBudget || 0),
                  icon: Wallet,
                  gradient: "from-emerald-600 to-green-600",
                  link: "/projects",
                },
              ].map((stat, idx) => (
                <Link key={idx} href={stat.link} className="block h-full transition-all duration-200 hover:-translate-y-1">
                  <Card className="h-full relative overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-slate-700 transition-all rounded-xl bg-card">
                    <CardContent className="p-3.5 sm:p-4 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate tracking-tight">{stat.title}</p>
                          <p className="text-xl sm:text-[22px] font-semibold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{stat.value}</p>
                          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {stat.subtext || <span className="invisible select-none">&nbsp;</span>}
                          </p>
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
        ) : isFieldRole ? (
          /* ========================================================================= */
          /* كروت الفريق الميداني (4 كروت معتمدة في صف واحد متناسق) */
          /* ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {fieldStatsCards.map((stat, idx) => (
              <Link key={idx} href={stat.link} className="block h-full transition-all duration-200 hover:-translate-y-1">
                <Card className="h-full relative overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-slate-700 transition-all rounded-xl bg-card">
                  <CardContent className="p-3.5 sm:p-4 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate tracking-tight" title={stat.title}>
                          {stat.title}
                        </p>
                        <p className="text-xl sm:text-[22px] font-semibold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                          {stat.value}
                        </p>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {stat.subtext || <span className="invisible select-none">&nbsp;</span>}
                        </p>
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
        ) : isCorporateCommRole ? (
          /* ========================================================================= */
          /* كروت دور الاتصال المؤسسي (نفس بطاقات مكتب المشاريع بعد استثناء البطاقات الأربعة) */
          /* ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {[
              {
                title: "إجمالي المشاريع",
                value: ((projectStats as any)?.total || 0).toLocaleString("en-US"),
                subtext: `قيد التنفيذ: ${((projectStats as any)?.inProgress || 0).toLocaleString("en-US")} | مكتمل: ${((projectStats as any)?.completed || 0).toLocaleString("en-US")}`,
                icon: FolderKanban,
                gradient: "from-blue-600 to-indigo-600",
                link: "/projects",
              },
              {
                title: "المساجد المسجلة",
                value: ((mosqueStats as any)?.total || 0).toLocaleString("en-US"),
                subtext: "مساجد معتمدة في النظام الجغرافي",
                icon: Building2,
                gradient: "from-teal-600 to-cyan-600",
                link: "/mosques",
              },
              {
                title: "إجمالي طلبات المساجد",
                value: ((requestStats as any)?.total || 0).toLocaleString("en-US"),
                subtext: `قيد المعالجة: ${((requestStats as any)?.byStatus?.in_progress || 0).toLocaleString("en-US")} طلب`,
                icon: FileText,
                gradient: "from-purple-600 to-indigo-600",
                link: "/requests",
              },
              {
                title: "إجمالي الميزانيات التقديرية",
                value: formatCurrencyEn((projectStats as any)?.totalBudget || 0),
                subtext: "القيمة التقديرية المعتمدة للمشاريع",
                icon: Wallet,
                gradient: "from-emerald-600 to-green-600",
                link: "/projects",
              },
            ].map((stat, idx) => (
              <Link key={idx} href={stat.link} className="block h-full transition-all duration-200 hover:-translate-y-1">
                <Card className="h-full relative overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-slate-700 transition-all rounded-xl bg-card">
                  <CardContent className="p-3.5 sm:p-4 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate tracking-tight">{stat.title}</p>
                        <p className="text-xl sm:text-[22px] font-semibold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{stat.value}</p>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {stat.subtext || <span className="invisible select-none">&nbsp;</span>}
                        </p>
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
        {/* قسم مكتب إدارة المشاريع المخصص (PMO) والاتصال المؤسسي */}
        {/* ========================================================================= */}
        {(isProjectsRole || isCorporateCommRole) && (
          <div className="space-y-6">
            {/* بطاقة السجلات التشغيلية للمشاريع مع البحث الشامل والتبويبات */}
            <Card className="border border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-4 sm:p-5 sm:py-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2.5">
                    <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    <span>أحدث السجلات التشغيلية للمشاريع والمساجد</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm font-medium mt-1 text-muted-foreground">
                    {debouncedProjectsSearch 
                      ? `نتائج البحث عن "${debouncedProjectsSearch}" في المشاريع والطلبات والمساجد المسجلة`
                      : "آخر المشاريع، طلبات المساجد، والمساجد المسجلة مع إمكانية البحث الفوري في كافة السجلات"}
                  </CardDescription>
                </div>

                {/* حقل بحث شامل وفوري للمشاريع والطلبات والمساجد */}
                <div className="relative w-full sm:w-80 md:w-[420px] shrink-0">
                  <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <Input
                    placeholder="بحث شامل برقم المشروع أو الطلب، اسم المسجد، أو المدينة..."
                    value={projectsSearch}
                    onChange={(e) => setProjectsSearch(e.target.value)}
                    className="h-11 sm:h-12 pr-11 pl-11 text-sm font-medium text-foreground bg-background border-2 border-slate-200 dark:border-slate-700 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl shadow-xs transition-all placeholder:text-muted-foreground/75"
                  />
                  {projectsSearch && (
                    <button
                      type="button"
                      onClick={() => setProjectsSearch("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                      title="مسح البحث"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {(isLoadingProjects || isLoadingRequestsProjects || isLoadingMosquesProjects) && debouncedProjectsSearch && (
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs defaultValue="projects" dir="rtl" className="w-full">
                  <div className="px-4 pt-3 border-b border-border/60 bg-muted/20">
                    <TabsList className="bg-muted/60 p-1">
                      <TabsTrigger value="projects" className="text-xs sm:text-sm gap-2 font-bold py-1.5 px-3">
                        <FolderKanban className="w-4 h-4" />
                        <span>المشاريع ({filteredRecentProjects.length})</span>
                      </TabsTrigger>
                      <TabsTrigger value="requests" className="text-xs sm:text-sm gap-2 font-bold py-1.5 px-3">
                        <FileText className="w-4 h-4" />
                        <span>طلبات المساجد ({filteredRecentRequestsProjects.length})</span>
                      </TabsTrigger>
                      <TabsTrigger value="mosques" className="text-xs sm:text-sm gap-2 font-bold py-1.5 px-3">
                        <Building2 className="w-4 h-4" />
                        <span>المساجد المسجلة ({filteredRecentMosquesProjects.length})</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* تبويب 1: المشاريع */}
                  <TabsContent value="projects" className="m-0">
                    {filteredRecentProjects.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        {debouncedProjectsSearch ? (
                          <div className="space-y-1.5">
                            <p className="text-sm sm:text-base font-bold text-foreground">لا توجد مشاريع مطابقة لـ "{debouncedProjectsSearch}"</p>
                            <p className="text-xs text-muted-foreground">جرب البحث برقم مشروع آخر أو اسم مسجد مختلف</p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-medium">لا توجد مشاريع مسجلة حالياً</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-right">
                          <TableHeader className="bg-slate-100/90 dark:bg-slate-850 border-b border-border/80">
                            <TableRow>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">رقم المشروع</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">اسم المشروع / المسجد</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">الميزانية التقديرية</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">نسبة الإنجاز</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">مدير المشروع</TableHead>
                              {!isCorporateCommRole && (
                                <TableHead className="text-center font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">إجراء</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {filteredRecentProjects.map((project: any) => {
                              const progressVal = Number(project.completionPercentage || 0);

                              return (
                                <TableRow key={project.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                                  {/* 1. رقم المشروع */}
                                  <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                    <Link href="/projects" className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors text-xs sm:text-sm font-extrabold font-mono shadow-2xs">
                                      <span>{project.projectNumber || `PRJ-${project.id}`}</span>
                                    </Link>
                                  </TableCell>

                                  {/* 2. اسم المشروع */}
                                  <TableCell className="max-w-[280px] px-3 sm:px-4 py-3 sm:py-3.5">
                                    <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug truncate" title={project.name}>
                                      {project.name}
                                    </span>
                                  </TableCell>

                                  {/* 3. الميزانية التقديرية */}
                                  <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                    {formatCurrencyEn(project.budget || 0)}
                                  </TableCell>

                                  {/* 4. نسبة الإنجاز */}
                                  <TableCell className="min-w-[140px] px-3 sm:px-4 py-3 sm:py-3.5">
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                                        <span>{progressVal}%</span>
                                      </div>
                                      <Progress value={progressVal} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                  </TableCell>

                                  {/* 5. مدير المشروع */}
                                  <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                      {project.managerName || "مكتب المشاريع"}
                                    </span>
                                  </TableCell>

                                  {/* 6. إجراء - يظهر لمكتب المشاريع ولا يظهر لدور الاتصال المؤسسي */}
                                  {!isCorporateCommRole && (
                                    <TableCell className="text-center whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                      <Link href="/projects">
                                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 border border-primary/30 rounded-lg gap-1.5 transition-all" title="معاينة تفاصيل المشروع">
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>عرض</span>
                                        </Button>
                                      </Link>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="p-3 border-t border-border/60 text-left bg-muted/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        {debouncedProjectsSearch
                          ? `تم العثور على ${filteredRecentProjects.length} مشروع مطابق للبحث`
                          : `عرض آخر ${filteredRecentProjects.length} مشاريع مسجلة`}
                      </span>
                      <Link href="/projects">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-bold hover:bg-background">
                          <span>عرض جميع المشاريع</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>

                  {/* تبويب 2: طلبات المساجد */}
                  <TabsContent value="requests" className="m-0">
                    {filteredRecentRequestsProjects.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        {debouncedProjectsSearch ? (
                          <div className="space-y-1.5">
                            <p className="text-sm sm:text-base font-bold text-foreground">لا توجد طلبات مساجد مطابقة لـ "{debouncedProjectsSearch}"</p>
                            <p className="text-xs text-muted-foreground">جرب البحث برقم طلب آخر أو اسم مسجد مختلف</p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-medium">لا توجد طلبات مساجد مسجلة</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-right">
                          <TableHeader className="bg-slate-100/90 dark:bg-slate-850 border-b border-border/80">
                            <TableRow>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">رقم الطلب</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">المسجد / البيان</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">البرنامج</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">المرحلة الحالية</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">الحالة</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">التاريخ</TableHead>
                              <TableHead className="text-center font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">إجراء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {filteredRecentRequestsProjects.map((req: any) => (
                              <TableRow key={req.id} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 transition-colors">
                                {/* 1. رقم الطلب */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href={`/requests/${req.id}`} className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors text-xs sm:text-sm font-extrabold font-mono shadow-2xs">
                                    <span>{req.requestNumber}</span>
                                  </Link>
                                </TableCell>

                                {/* 2. المسجد / البيان */}
                                <TableCell className="max-w-[280px] px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug truncate" title={req.mosqueName || req.customMosqueName || req.descriptiveName || "-"}>
                                    {req.mosqueName || req.customMosqueName || req.descriptiveName || "-"}
                                  </span>
                                  {req.city && (
                                    <span className="text-[11px] font-medium text-muted-foreground block truncate">
                                      {req.city}
                                    </span>
                                  )}
                                </TableCell>

                                {/* 3. البرنامج */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Badge variant="outline" className="text-xs font-bold py-0.5 px-2">
                                    {PROGRAM_LABELS[req.programType] || req.programType || "-"}
                                  </Badge>
                                </TableCell>

                                {/* 4. المرحلة الحالية */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {STAGE_LABELS[req.currentStage] || req.currentStage || "-"}
                                  </span>
                                </TableCell>

                                {/* 5. الحالة */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-extrabold py-1 px-3 rounded-lg ${
                                      req.status === 'completed' || req.status === 'approved'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                                        : req.status === 'rejected'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    }`}
                                  >
                                    {STATUS_LABELS[req.status] || req.status || 'قيد المتابعة'}
                                  </Badge>
                                </TableCell>

                                {/* 6. التاريخ */}
                                <TableCell className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  {formatDateArabic(req.createdAt)}
                                </TableCell>

                                {/* 7. إجراء */}
                                <TableCell className="text-center whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href={`/requests/${req.id}`}>
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
                        {debouncedProjectsSearch
                          ? `تم العثور على ${filteredRecentRequestsProjects.length} طلب مطابق للبحث`
                          : `عرض آخر ${filteredRecentRequestsProjects.length} طلبات مسجلة`}
                      </span>
                      <Link href="/requests">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-bold hover:bg-background">
                          <span>عرض جميع الطلبات</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>

                  {/* تبويب 3: المساجد المسجلة */}
                  <TabsContent value="mosques" className="m-0">
                    {filteredRecentMosquesProjects.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        {debouncedProjectsSearch ? (
                          <div className="space-y-1.5">
                            <p className="text-sm sm:text-base font-bold text-foreground">لا توجد مساجد مطابقة لـ "{debouncedProjectsSearch}"</p>
                            <p className="text-xs text-muted-foreground">جرب البحث باسم مسجد أو مدينة أخرى</p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-medium">لا توجد مساجد مسجلة حالياً</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="text-right">
                          <TableHeader className="bg-slate-100/90 dark:bg-slate-850 border-b border-border/80">
                            <TableRow>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">اسم المسجد</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">المدينة / الحي</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">نوع المسجد</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">السعة الاستيعابية</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">حالة الاعتماد</TableHead>
                              <TableHead className="text-right font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">تاريخ التسجيل</TableHead>
                              <TableHead className="text-center font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 py-3.5 px-3 sm:px-4">إجراء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {filteredRecentMosquesProjects.map((mosque: any) => (
                              <TableRow key={mosque.id} className="hover:bg-teal-50/40 dark:hover:bg-slate-800/60 transition-colors">
                                {/* 1. اسم المسجد */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href={`/mosques/${mosque.id}`} className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors text-xs sm:text-sm font-extrabold shadow-2xs">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>{mosque.name}</span>
                                  </Link>
                                </TableCell>

                                {/* 2. المدينة / الحي */}
                                <TableCell className="max-w-[280px] px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                    {mosque.city} {mosque.district ? `- ${mosque.district}` : mosque.governorate ? `- ${mosque.governorate}` : ''}
                                  </span>
                                </TableCell>

                                {/* 3. نوع المسجد */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {mosque.mosqueType === "jami" ? "جامع" : "مسجد"}
                                  </span>
                                </TableCell>

                                {/* 4. السعة الاستيعابية */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                  {(mosque.capacity || 0).toLocaleString("en-US")} مصلٍ
                                </TableCell>

                                {/* 5. حالة الاعتماد */}
                                <TableCell className="whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-extrabold py-1 px-3 rounded-lg ${
                                      mosque.approvalStatus === 'approved'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                        : mosque.approvalStatus === 'rejected'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    }`}
                                  >
                                    {mosque.approvalStatus === 'approved' ? 'معتمد' : mosque.approvalStatus === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                  </Badge>
                                </TableCell>

                                {/* 6. تاريخ التسجيل */}
                                <TableCell className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  {formatDateArabic(mosque.createdAt)}
                                </TableCell>

                                {/* 7. إجراء */}
                                <TableCell className="text-center whitespace-nowrap px-3 sm:px-4 py-3 sm:py-3.5">
                                  <Link href={`/mosques/${mosque.id}`}>
                                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 border border-primary/30 rounded-lg gap-1.5 transition-all" title="معاينة تفاصيل المسجد">
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
                        {debouncedProjectsSearch
                          ? `تم العثور على ${filteredRecentMosquesProjects.length} مسجد مطابق للبحث`
                          : `عرض آخر ${filteredRecentMosquesProjects.length} مساجد مسجلة`}
                      </span>
                      <Link href="/mosques">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-bold hover:bg-background">
                          <span>عرض دليل المساجد</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* بطاقات تحليلات ومعلومات موسعة عن البرامج والمراحل والمساجد */}
            <div className="space-y-6">
              {/* 1. توزيع الطلبات حسب البرنامج (بطاقة عريضة بتصميم حديث وأرقام واضحة) */}
              <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
                <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                      <Layers className="w-5 h-5 text-primary" />
                      <span>توزيع الطلبات حسب البرنامج</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      تصنيف الطلبات الهندسية والتنموية والتشغيلية على البرامج المعتمدة
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant="secondary" className="hidden sm:inline-flex font-mono text-xs px-2.5 py-1 font-semibold">
                      إجمالي {(requestStats?.total || 0).toLocaleString("en-US")} طلب
                    </Badge>
                    <Link href="/requests">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-bold">
                        <span>عرض الكل</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                    {Object.entries(requestStats?.byProgram || {}).map(([program, data]) => {
                      const color = PROGRAM_COLORS[program] || '#6B7280';
                      const stats = data as { count: number; name?: string };
                      const count = stats.count || 0;
                      const total = requestStats?.total || 1;
                      const percentage = ((count / total) * 100).toFixed(0);
                      return (
                        <Link key={program} href={`/requests?program=${program}`}>
                          <div 
                            className="group relative flex flex-col justify-between p-4 rounded-2xl border border-border/70 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden bg-card min-h-[140px]"
                            style={{
                              background: `linear-gradient(150deg, ${color}14 0%, transparent 70%)`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <ProgramIcon program={program} size="md" className="shrink-0 shadow-2xs" showBackground />
                              <Badge variant="secondary" className="font-mono text-[11px] font-bold px-1.5 py-0 h-5 bg-background/80 border border-border/40">
                                {percentage}%
                              </Badge>
                            </div>
                            
                            <div className="mt-3 space-y-1">
                              <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {stats.name || PROGRAM_LABELS[program] || program}
                              </p>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
                                  {count.toLocaleString("en-US")}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">طلب</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                              <span>استعراض</span>
                              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-[-2px] group-hover:translate-y-[-2px]" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* شبكة ثنائية موسعة: المراحل + المدن والمناطق */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2. المشاريع والطلبات حسب المرحلة */}
                <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
                  <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                        <Activity className="w-5 h-5 text-primary" />
                        <span>المشاريع والطلبات حسب المرحلة</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        المراحل الهندسية والفنية الحالية للمشاريع والطلبات
                      </CardDescription>
                    </div>
                    <Link href="/requests">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-bold">
                        <span>عرض الكل</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    {Object.entries(requestStats?.byStage || {})
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 8)
                      .map(([stage, count]) => {
                        const total = requestStats?.total || 1;
                        const percentage = Math.min(((count as number) / total) * 100, 100);
                        return (
                          <div key={stage} className="space-y-1.5 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                  {STAGE_LABELS[stage] || stage}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                                  {percentage.toFixed(1)}%
                                </span>
                                <Badge variant="secondary" className="font-bold font-mono text-xs px-2.5 h-6">
                                  {(count as number).toLocaleString("en-US")} طلب
                                </Badge>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2 rounded-full bg-muted" />
                          </div>
                        );
                      })}
                    {Object.keys(requestStats?.byStage || {}).length > 8 && (
                      <Link href="/requests">
                        <Button variant="ghost" className="w-full text-primary text-xs h-8.5 font-bold mt-1">
                          <span>عرض كافة المراحل ({Object.keys(requestStats?.byStage || {}).length})</span>
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>

                {/* 3. المساجد حسب المدن والمناطق */}
                <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
                  <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                        <Building2 className="w-5 h-5 text-primary" />
                        <span>المساجد حسب المدن والمناطق</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        المدن والمحافظات ذات الكثافة الأكبر في المساجد المسجلة
                      </CardDescription>
                    </div>
                    <Link href="/mosques">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-bold">
                        <span>عرض الكل</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    {Object.entries(mosqueStats?.byCity || {})
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 8)
                      .map(([city, count], idx) => {
                        const total = mosqueStats?.total || 1;
                        const percentage = Math.min(((count as number) / total) * 100, 100);
                        return (
                          <div key={city} className="space-y-1.5 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                                  {idx + 1}
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground truncate">
                                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{city}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                                  {percentage.toFixed(1)}%
                                </span>
                                <Badge variant="outline" className="font-bold font-mono text-xs px-2.5 h-6 border-primary/30 text-primary bg-primary/5">
                                  {(count as number).toLocaleString("en-US")} مسجد
                                </Badge>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2 rounded-full bg-muted" />
                          </div>
                        );
                      })}
                    {Object.keys(mosqueStats?.byCity || {}).length > 8 && (
                      <Link href="/mosques">
                        <Button variant="ghost" className="w-full text-primary text-xs h-8.5 font-bold mt-1">
                          <span>عرض كافة المدن ({Object.keys(mosqueStats?.byCity || {}).length})</span>
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

{/* ========================================================================= */}
        {/* قسم الفريق الميداني المخصص (Field Team Hub) */}
        {/* ========================================================================= */}
        {isFieldRole && (
          <div className="space-y-6">
            {/* تقويم الزيارات والمعاينات الميدانية التفاعلي */}
            <Card className="border border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
              {/* ترويسة التقويم */}
              <CardHeader className="p-4 sm:p-5 sm:py-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <span>{isEn ? "Operational Calendar & Tasks" : "التقويم التشغيلي للمعاينة والزيارات الميدانية"}</span>
                      <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
                        {fieldEvents.length} {isEn ? "Appointments" : "موعد مجدول"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      {isEn ? "Track scheduled inspections, rapid responses, assigned visits, and reports" : "متابعة مواعيد الكشف الميداني، معاينات المساجد المسندة، وإنجاز التقارير الفنية"}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* التبديل بين عرض التقويم وعرض القائمة */}
                  <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60">
                    <Button
                      variant={fieldViewMode === "calendar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFieldViewMode("calendar")}
                      className={`h-7.5 text-xs gap-1 px-2.5 rounded-md ${
                        fieldViewMode === "calendar"
                          ? "bg-background text-foreground shadow-2xs hover:bg-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isEn ? "Calendar" : "التقويم"}</span>
                    </Button>
                    <Button
                      variant={fieldViewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFieldViewMode("list")}
                      className={`h-7.5 text-xs gap-1 px-2.5 rounded-md ${
                        fieldViewMode === "list"
                          ? "bg-background text-foreground shadow-2xs hover:bg-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>{isEn ? `List (${fieldEvents.length})` : `القائمة (${fieldEvents.length})`}</span>
                    </Button>
                  </div>

                  {/* التنقل بين الأشهر في حال عرض التقويم */}
                  {fieldViewMode === "calendar" && (
                    <div className="flex items-center gap-1 bg-background border border-border/70 rounded-lg p-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentCalMonth(subMonths(currentCalMonth, 1))}
                        className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground"
                        title={isEn ? "Previous Month" : "الشهر السابق"}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <span className="text-xs sm:text-sm font-bold px-2 min-w-[105px] text-center font-sans">
                        {format(currentCalMonth, "MMMM yyyy", { locale: isEn ? enUS : ar })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentCalMonth(addMonths(currentCalMonth, 1))}
                        className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground"
                        title={isEn ? "Next Month" : "الشهر التالي"}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {fieldViewMode === "calendar" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        setCurrentCalMonth(now);
                        setSelectedCalDate(format(now, "yyyy-MM-dd"));
                      }}
                      className="h-8 text-xs font-semibold"
                    >
                      {isEn ? "Today" : "اليوم"}
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* محتوى التقويم أو القائمة */}
              {fieldViewMode === "calendar" ? (
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* عمود شبكة التقويم الشهري (7 أعمدة) */}
                    <div className="xl:col-span-7 space-y-3">
                      {/* ترويسة أيام الأسبوع */}
                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {(isEn ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]).map((dayName) => (
                          <div key={dayName} className="text-xs font-bold text-muted-foreground py-1.5 bg-muted/40 rounded-lg">
                            {dayName}
                          </div>
                        ))}
                      </div>

                      {/* شبكة الأيام */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {calGridDays.map((day, idx) => {
                          const inCurrentMonth = isSameMonth(day, currentCalMonth);
                          const isToday = isDateToday(day);
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isSelected = selectedCalDate === dateStr;
                          const dayEventsList = fieldEvents.filter((evt: any) => evt.date === dateStr);
                          const hasUrgent = dayEventsList.some((e: any) => e.priority === "urgent" || e.priority === "high");

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedCalDate(dateStr)}
                              className={`group min-h-[78px] sm:min-h-[92px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                                  : isToday
                                  ? "border-amber-400/80 bg-amber-500/5 hover:border-amber-500"
                                  : inCurrentMonth
                                  ? "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30"
                                  : "border-border/30 bg-muted/15 text-muted-foreground/50 opacity-40 hover:opacity-70"
                              }`}
                            >
                              {/* رقم اليوم والشارة */}
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs sm:text-sm font-mono font-bold leading-none ${
                                    isSelected
                                      ? "text-primary font-black"
                                      : isToday
                                      ? "text-amber-600 dark:text-amber-400 font-black"
                                      : inCurrentMonth
                                      ? "text-foreground"
                                      : "text-muted-foreground/60"
                                  }`}
                                >
                                  {format(day, "d")}
                                </span>
                                {isToday && (
                                  <span className="text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1 py-0.2 rounded">
                                    {isEn ? "Today" : "اليوم"}
                                  </span>
                                )}
                                {dayEventsList.length > 0 && !isToday && (
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      hasUrgent ? "bg-rose-500 animate-pulse" : "bg-primary"
                                    }`}
                                    title={`${dayEventsList.length} ${isEn ? "Appointments" : "مواعيد"}`}
                                  />
                                )}
                              </div>

                              {/* المواعيد في اليوم */}
                              <div className="space-y-1 mt-1">
                                {dayEventsList.slice(0, 2).map((evt: any, eIdx: number) => {
                                  const isUrgent = evt.priority === "urgent" || evt.priority === "high";
                                  return (
                                    <div
                                      key={eIdx}
                                      className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${
                                        isUrgent
                                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                          : "bg-primary/10 text-primary border border-primary/20"
                                      }`}
                                      title={`${evt.time || evt.startTime || ""} - ${evt.mosqueName || evt.title || ""}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUrgent ? "bg-rose-500" : "bg-primary"}`} />
                                      <span className="truncate">{evt.mosqueName || evt.title || (isEn ? "Inspection" : "معاينة")}</span>
                                    </div>
                                  );
                                })}
                                {dayEventsList.length > 2 && (
                                  <div className="text-[9px] text-muted-foreground font-mono text-center">
                                    +{dayEventsList.length - 2} {isEn ? "more" : "أخرى"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* توضيح دلالات الألوان */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                            <span>{isEn ? "Scheduled Visit" : "معاينة مجدولة"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span>{isEn ? "Urgent" : "عاجل جداً"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span>{isEn ? "Today's Date" : "تاريخ اليوم"}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px]">
                          {isEn ? `Total Appointments: ${fieldEvents.length}` : `إجمالي المواعيد: ${fieldEvents.length}`}
                        </span>
                      </div>
                    </div>

                    {/* عمود أجندة وتفاصيل اليوم المحدد (5 أعمدة) */}
                    <div className="xl:col-span-5 flex flex-col">
                      <div className="p-4 sm:p-5 rounded-xl border border-border/70 bg-muted/20 flex-1 flex flex-col">
                        {/* ترويسة تفاصيل اليوم */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground font-medium">{isEn ? "Daily Tasks & Agenda" : "أجندة المهام لليوم المحدد"}</p>
                            <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-primary shrink-0" />
                              <span>{selectedDateFormatted}</span>
                            </h3>
                          </div>
                          <Badge
                            variant={selectedDayEvents.length > 0 ? "default" : "outline"}
                            className="font-bold font-mono text-xs px-2.5 h-6 shrink-0"
                          >
                            {selectedDayEvents.length} {isEn ? (selectedDayEvents.length === 1 ? "Appointment" : "Appointments") : (selectedDayEvents.length === 1 ? "موعد" : "مواعيد")}
                          </Badge>
                        </div>

                        {/* محتوى مواعيد اليوم */}
                        <div className="mt-4 flex-1 space-y-3.5 overflow-y-auto max-h-[460px] pr-0.5">
                          {selectedDayEvents.length > 0 ? (
                            selectedDayEvents.map((evt: any, idx: number) => {
                              const isUrgent = evt.priority === "urgent" || evt.priority === "high";
                              const timeStr = evt.time || evt.startTime || "09:00";
                              const programLabel = translateProgramName(evt.programType);
                              const programColor = PROGRAM_COLORS[evt.programType] || "#059669";

                              return (
                                <div
                                  key={evt.id || idx}
                                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all shadow-2xs space-y-3"
                                >
                                  {/* شريط معلومات الموعد والمسجد */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] font-mono font-bold px-1.5 h-5 border-primary/30 text-primary bg-primary/5"
                                        >
                                          {evt.requestNumber || (isEn ? `Req #${evt.requestId}` : `طلب #${evt.requestId}`)}
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] font-semibold px-2 h-5"
                                          style={{ backgroundColor: `${programColor}15`, color: programColor }}
                                        >
                                          {programLabel}
                                        </Badge>
                                        {isUrgent && (
                                          <Badge variant="destructive" className="text-[10px] font-bold px-1.5 h-5 bg-rose-600">
                                            {isEn ? "Urgent" : "عاجل جداً"}
                                          </Badge>
                                        )}
                                      </div>

                                      <h4 className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1">
                                        <span>{evt.mosqueName || evt.title || (isEn ? "Field Inspection" : "معاينة ميدانية")}</span>
                                      </h4>
                                    </div>

                                    {/* الوقت المحدد */}
                                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg shrink-0">
                                      <Clock className="w-3.5 h-3.5 text-primary" />
                                      <span>{timeStr}</span>
                                    </div>
                                  </div>

                                  {/* الموقع والمدينة ومسؤول التواصل */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                                    {evt.mosqueCity && (
                                      <div className="flex items-center gap-1.5 truncate">
                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                                        <span className="truncate">{evt.mosqueCity}</span>
                                      </div>
                                    )}

                                    {evt.contactPhone && (
                                      <div className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <a
                                          href={`tel:${evt.contactPhone}`}
                                          className="text-primary hover:underline font-mono text-xs dir-ltr"
                                          title={isEn ? "Direct Call" : "اتصال مباشر"}
                                        >
                                          {evt.contactPhone}
                                        </a>
                                        {evt.contactName && (
                                          <span className="text-muted-foreground text-[11px] truncate">
                                            ({evt.contactName})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* أزرار الإجراءات السريعة للمعاينة */}
                                  <div className="flex items-center gap-2 pt-1">
                                    <Link href={`/requests/${evt.requestId}/field-inspection`} className="flex-1">
                                      <Button size="sm" className="w-full h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>{isEn ? "Inspection / Action Form" : "استمارة المعاينة الميدانية"}</span>
                                      </Button>
                                    </Link>
                                    <Link href={`/requests/${evt.requestId}`}>
                                      <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" title={isEn ? "View Details" : "تفاصيل الطلب"}>
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                                <CalendarDays className="w-6 h-6" />
                              </div>
                              <div className="space-y-1 max-w-xs">
                                <p className="font-bold text-sm text-foreground">{isEn ? "No appointments scheduled for this day" : "لا توجد مواعيد لهذا اليوم"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {isEn ? "Select another day with scheduled appointments or view upcoming visits below." : "اختر يوماً به مواعيد من التقويم أو استعرض أقرب الزيارات القادمة أدناه."}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* قسم أقرب المواعيد القادمة في حال عدم وجود مواعيد اليوم أو للاطلاع السريع */}
                          {upcomingMonthEvents.length > 0 && selectedDayEvents.length === 0 && (
                            <div className="pt-3 border-t border-border/60 space-y-2">
                              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <span>{isEn ? "Upcoming Tasks & Visits" : "أقرب الزيارات الميدانية القادمة"}</span>
                              </p>
                              <div className="space-y-2">
                                {upcomingMonthEvents.slice(0, 3).map((evt: any, uIdx: number) => (
                                  <div
                                    key={evt.id || uIdx}
                                    onClick={() => {
                                      if (evt.date) {
                                        setSelectedCalDate(evt.date);
                                        try {
                                          setCurrentCalMonth(parseISO(evt.date));
                                        } catch {}
                                      }
                                    }}
                                    className="p-2.5 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-foreground truncate">
                                        {evt.mosqueName || evt.title}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        <span className="font-mono">{evt.date}</span>
                                        {evt.mosqueCity && <span>• {evt.mosqueCity}</span>}
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary shrink-0 gap-1 px-2">
                                      <span>{isEn ? "View" : "عرض"}</span>
                                      <ArrowUpRight className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              ) : (
                /* عرض القائمة البديل */
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-right text-xs font-bold py-3.5 px-4">{isEn ? "Request #" : "رقم الطلب"}</TableHead>
                          <TableHead className="text-right text-xs font-bold py-3.5 px-4">{isEn ? "Mosque / City" : "المسجد / المدينة"}</TableHead>
                          <TableHead className="text-right text-xs font-bold py-3.5 px-4">{isEn ? "Program" : "البرنامج"}</TableHead>
                          <TableHead className="text-right text-xs font-bold py-3.5 px-4">{isEn ? "Scheduled Date" : "موعد الزيارة"}</TableHead>
                          <TableHead className="text-right text-xs font-bold py-3.5 px-4">{isEn ? "Priority" : "الأولوية"}</TableHead>
                          <TableHead className="text-right text-xs font-bold py-3.5 px-4">{isEn ? "Contact Info" : "بيانات التواصل"}</TableHead>
                          <TableHead className="text-center text-xs font-bold py-3.5 px-4">{isEn ? "Actions" : "الإجراءات"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fieldEvents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <ClipboardList className="w-8 h-8 text-muted-foreground/60" />
                                <p className="text-sm font-semibold">{isEn ? "No appointments or visits found" : "لا توجد مواعيد أو زيارات مطابقة للبحث"}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          fieldEvents.map((evt: any) => {
                            const isUrgent = evt.priority === "urgent" || evt.priority === "high";
                            const programLabel = translateProgramName(evt.programType);
                            const programColor = PROGRAM_COLORS[evt.programType] || "#059669";

                            return (
                              <TableRow key={evt.id} className="hover:bg-muted/25 transition-colors">
                                <TableCell className="py-3 px-4">
                                  <Link href={`/requests/${evt.requestId}`}>
                                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary hover:underline cursor-pointer border-primary/30 bg-primary/5">
                                      {evt.requestNumber || `REQ-${evt.requestId}`}
                                    </Badge>
                                  </Link>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <div className="font-semibold text-xs sm:text-sm text-foreground">
                                    {evt.mosqueName || evt.title}
                                  </div>
                                  {evt.mosqueCity && (
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />
                                      <span>{evt.mosqueCity}</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px] font-semibold"
                                    style={{ backgroundColor: `${programColor}15`, color: programColor }}
                                  >
                                    {programLabel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <div className="font-mono text-xs font-bold text-foreground">
                                    {evt.date || (isEn ? "Not set" : "غير محدد")}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-primary" />
                                    <span>{evt.time || evt.startTime || "09:00"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  {isUrgent ? (
                                    <Badge variant="destructive" className="text-[10px] font-bold px-1.5 h-5 bg-rose-600">
                                      {isEn ? "Urgent" : "عاجل جداً"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                                      {isEn ? "Normal" : "عادية"}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  {evt.contactPhone ? (
                                    <a
                                      href={`tel:${evt.contactPhone}`}
                                      className="text-xs text-primary hover:underline font-mono flex items-center gap-1 dir-ltr"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{evt.contactPhone}</span>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Link href={`/requests/${evt.requestId}/field-inspection`}>
                                      <Button size="sm" className="h-7.5 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                                        <FileText className="w-3 h-3" />
                                        <span>{isEn ? "Inspection Form" : "استمارة المعاينة"}</span>
                                      </Button>
                                    </Link>
                                    <Link href={`/requests/${evt.requestId}`}>
                                      <Button variant="outline" size="sm" className="h-7.5 text-xs px-2" title={isEn ? "View Details" : "تفاصيل الطلب"}>
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* قسم الإدارة العامة الأخرى */}
        {/* ========================================================================= */}
        {!isFinancialRole && !isProjectsRole && !isFieldRole && !isCorporateCommRole && (
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
                          {(() => {
                            const slaInfo = calculateBeneficiarySLA(pendingUser.createdAt, allowedDays);
                            return (
                              <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${slaInfo.isDelayed ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                <Clock className={`w-3 h-3 shrink-0 ${slaInfo.isDelayed ? "text-red-500" : "text-emerald-500"}`} />
                                <span>{slaInfo.isDelayed ? `متأخر ${slaInfo.delayText}` : `ضمن المهلة (${slaInfo.elapsedText})`}</span>
                              </p>
                            );
                          })()}
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

        {/* الروابط السريعة المخصصة للدور - تظهر لجميع الأدوار ما عدا المسؤول المالي ومكتب المشاريع والفريق الميداني والاتصال المؤسسي */}
        {!isFinancialRole && !isProjectsRole && !isFieldRole && !isCorporateCommRole && (
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
