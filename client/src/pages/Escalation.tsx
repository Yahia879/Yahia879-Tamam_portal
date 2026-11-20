import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RequestDetailsModal } from "@/components/RequestDetailsModal";
import { ProgramIcon } from "@/components/ProgramIcon";
import { MultiMosquesIcon } from "@/components/MultiMosquesIcon";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  FileText,
  Users,
  Building2,
  User,
  ExternalLink,
  Bell,
  RotateCcw,
  Eye,
  Layers,
  Send,
  Loader2,
  ChevronLeft,
  Flame,
  Plus,
  Minus,
  BarChart3,
  X,
  Filter,
  ArrowUpDown,
  Tag,
  Phone,
  Mail,
  Calendar,
  CreditCard,
} from "lucide-react";
import { STAGE_LABELS, PROGRAM_LABELS } from "@shared/constants";

// تسميات صفة طالب الخدمة
const REQUESTER_TYPE_LABELS: Record<string, string> = {
  imam: "إمام مسجد",
  muezzin: "مؤذن",
  donor: "متبرع",
  waqf_supervisor: "ناظر وقف",
  board_member: "عضو مجلس إدارة",
  other: "أخرى",
};

// إعدادات مستويات التأخير المتوافقة مع ألوان النظام
const SEVERITY_CONFIG = {
  warning: {
    label: "تأخير خفيف (1-3 أيام)",
    badgeText: "تأخير خفيف",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    color: "text-amber-700 dark:text-amber-400",
    icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
  },
  medium: {
    label: "تأخير متوسط (4-7 أيام)",
    badgeText: "تأخير متوسط",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    color: "text-orange-700 dark:text-orange-400",
    icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
  },
  critical: {
    label: "تأخير حرج (> 7 أيام)",
    badgeText: "تأخير حرج",
    bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    color: "text-rose-700 dark:text-rose-400",
    icon: <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />,
  },
};

// دالة لتنسيق تاريخ ووقت التسجيل بأرقام إنجليزية وبشكل واضح
function formatRegisteredDateTime(dateInput: string | Date | null | undefined) {
  if (!dateInput) return { date: "—", time: "" };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { date: "—", time: "" };
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  
  return {
    date: `${yyyy}/${mm}/${dd}`,
    time: `${h}:${m} ${ampm}`,
  };
}

// دالة لحساب وعرض الوقت المنقضي بالأيام والساعات بأرقام إنجليزية
function formatElapsedDetailed(dateInput: string | Date | null | undefined) {
  if (!dateInput) return { text: "—", days: 0, hours: 0 };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { text: "—", days: 0, hours: 0 };
  
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  let text = "";
  if (days > 0 && hours > 0) {
    text = `${days} يوم و ${hours} ساعة`;
  } else if (days > 0) {
    text = `${days} يوم`;
  } else {
    text = `${hours} ساعة`;
  }

  return { text, days, hours, totalHours };
}

function formatDelayText(delayDaysOnly?: number, delayHoursOnly?: number, delayDays?: number) {
  const days = delayDaysOnly ?? 0;
  const hours = delayHoursOnly ?? 0;
  if (days > 0 && hours > 0) {
    return `${days} يوم و ${hours} س`;
  }
  if (days > 0) {
    return `${days} يوم`;
  }
  if (hours > 0) {
    return `${hours} ساعة`;
  }
  if (delayDays && delayDays > 0) {
    return `${delayDays} يوم`;
  }
  return `ساعة واحدة`;
}

export default function EscalationPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const canViewDelayedRequests = usePermission("escalation.delayed_requests");
  const canViewDelayedBeneficiaries = usePermission("escalation.delayed_beneficiaries");

  const [activeTab, setActiveTab] = useState<string>(() =>
    !canViewDelayedRequests && canViewDelayedBeneficiaries ? "delayed-beneficiaries" : "delayed-requests"
  );

  useEffect(() => {
    if (!canViewDelayedRequests && canViewDelayedBeneficiaries) {
      setActiveTab("delayed-beneficiaries");
    } else if (canViewDelayedRequests && !canViewDelayedBeneficiaries) {
      setActiveTab("delayed-requests");
    }
  }, [canViewDelayedRequests, canViewDelayedBeneficiaries]);

  // الفلاتر
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "warning" | "medium" | "critical">("all");
  const [sortBy, setSortBy] = useState<"delay_desc" | "delay_asc" | "created_desc">("delay_desc");

  // تأخير إرسال استعلام البحث للخادم لمنع إرهاق الشبكة مع كل حرف مكتوب
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // نوافذ الحوار
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState<{ type: "request" | "beneficiary"; id: number; title: string } | null>(null);
  const [alertCustomMessage, setAlertCustomMessage] = useState("");

  const [requestsPage, setRequestsPage, resetRequestsPage] = usePersistedPage("escalation_requests_page");
  const [beneficiariesPage, setBeneficiariesPage, resetBeneficiariesPage] = usePersistedPage("escalation_beneficiaries_page");
  const limit = 10;

  // إعادة الصفحة إلى 1 عند تغيير أي فلتر
  const isFilterFirstMount = useRef(true);
  useEffect(() => {
    if (isFilterFirstMount.current) {
      isFilterFirstMount.current = false;
      return;
    }
    resetRequestsPage();
    resetBeneficiariesPage();
  }, [debouncedSearch, stageFilter, programFilter, severityFilter, sortBy, resetRequestsPage, resetBeneficiariesPage]);

  // استعلامات البيانات من الخادم (مربوطة بالكامل مع فلاتر الـ Backend و Pagination)
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    refetch: refetchStats 
  } = trpc.escalation.getStats.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: canViewDelayedRequests || canViewDelayedBeneficiaries,
  });

  const { 
    data: requestsResult, 
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests,
    refetch: refetchRequests 
  } = trpc.escalation.getDelayedRequests.useQuery({
    stageCode: stageFilter !== "all" ? stageFilter : undefined,
    programType: programFilter !== "all" ? programFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy,
    page: requestsPage,
    limit,
  }, {
    enabled: canViewDelayedRequests,
  });

  const { 
    data: beneficiariesResult, 
    isLoading: isLoadingBeneficiaries,
    isFetching: isFetchingBeneficiaries,
    refetch: refetchBeneficiaries 
  } = trpc.escalation.getDelayedBeneficiaries.useQuery({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy,
    page: beneficiariesPage,
    limit,
  }, {
    enabled: canViewDelayedBeneficiaries,
  });

  const delayedRequests = requestsResult?.requests || [];
  const requestsTotal = requestsResult?.total || 0;
  const requestsTotalPages = requestsResult?.totalPages || 0;

  const delayedBeneficiaries = beneficiariesResult?.beneficiaries || [];
  const beneficiariesTotal = beneficiariesResult?.total || 0;
  const beneficiariesTotalPages = beneficiariesResult?.totalPages || 0;

  const { 
    data: slaSettingsData, 
    refetch: refetchSettings 
  } = trpc.escalation.getSettings.useQuery();

  // إرسال تنبيه تصعيدي
  const sendAlertMutation = trpc.escalation.sendEscalationAlert.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم إرسال التنبيه بنجاح");
      setAlertModalOpen(false);
      setAlertCustomMessage("");
      setAlertTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "فشل إرسال التنبيه");
    },
  });

  // مسح الفلاتر
  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStageFilter("all");
    setProgramFilter("all");
    setSeverityFilter("all");
    setSortBy("delay_desc");
    resetRequestsPage();
    resetBeneficiariesPage();
  };

  const hasActiveFilters = Boolean(
    search.trim() || 
    stageFilter !== "all" || 
    programFilter !== "all" || 
    severityFilter !== "all" || 
    sortBy !== "delay_desc"
  );

  const handleRequestsPageChange = (newPage: number) => {
    setRequestsPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBeneficiariesPageChange = (newPage: number) => {
    setBeneficiariesPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // الاعتماد مباشرة على البيانات المفلترة والمرتبة من الـ Backend
  const sortedRequests = delayedRequests;
  const sortedBeneficiaries = delayedBeneficiaries;

  return (
    <DashboardLayout tabletNavigation>
      <PermissionGuard anyPermission={["escalation.delayed_requests", "escalation.delayed_beneficiaries"]}>
        <div className="min-w-0 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden text-right" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground pb-0.5 leading-snug">
                التصعيد الإداري
              </h1>
              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] sm:text-xs px-2 py-0.5 font-medium">
                متابعة التأخير
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 break-words leading-relaxed">
              عرض ومتابعة الطلبات المتأخرة حسب المراحل وطلبات المستفيدين المعلقة
            </p>
          </div>
        </div>

        {/* Stats Row - كروت إحصائية رئيسية مطابقة للمطلوب والصلاحيات */}
        {(canViewDelayedRequests || canViewDelayedBeneficiaries) && (
          <div className={`grid ${canViewDelayedRequests && canViewDelayedBeneficiaries ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 max-w-sm'} gap-2.5 sm:gap-3.5`} dir="rtl">
            {[
              ...(canViewDelayedRequests ? [{
                id: "requests",
                label: "الطلبات المتأخرة",
                hint: "طلبات تجاوزت مهلة المرحلة",
                value: stats?.totalDelayedRequests || 0,
                icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5" />,
                iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
                borderHover: "hover:border-amber-300 dark:hover:border-amber-800",
                onClick: () => {
                  setActiveTab("delayed-requests");
                },
              }] : []),
              ...(canViewDelayedBeneficiaries ? [{
                id: "beneficiaries",
                label: "المستفيدون المتأخرون بالاعتماد",
                hint: "بانتظار قبول طلب التسجيل",
                value: stats?.totalDelayedBeneficiaries || 0,
                icon: <Users className="w-4 h-4 sm:w-5 sm:h-5" />,
                iconBg: "bg-teal-100 dark:bg-teal-950/40 text-teal-600",
                borderHover: "hover:border-teal-300 dark:hover:border-teal-800",
                onClick: () => {
                  setActiveTab("delayed-beneficiaries");
                },
              }] : []),
              ...(canViewDelayedRequests && canViewDelayedBeneficiaries ? [{
                id: "all",
                label: "إجمالي التأخير",
                hint: "مجموع الطلبات والمستفيدين",
                value: stats?.totalDelayedItems || 0,
                icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" />,
                iconBg: "bg-primary/10 text-primary",
                borderHover: "hover:border-primary/40",
                onClick: () => {
                  setActiveTab("delayed-requests");
                  setSeverityFilter("all");
                },
              }] : []),
            ].map((stat, idx, arr) => (
              <Card 
                key={stat.id} 
                onClick={stat.onClick}
                className={`border border-border/60 shadow-xs overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-right py-0 ${stat.borderHover} ${
                  arr.length === 3 && idx === 2 ? "max-sm:col-span-2" : ""
                }`}
                dir="rtl"
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-right">
                      <p className="text-xs sm:text-[13px] text-muted-foreground font-medium leading-snug line-clamp-1">{stat.label}</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground truncate mt-0.5 font-mono tabular-nums">
                        {isLoadingStats ? <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" /> : stat.value}
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">{stat.hint}</p>
                    </div>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${stat.iconBg}`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* التبويبات الرئيسية */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3.5 sm:space-y-4" dir="rtl">
          <div className="flex items-center justify-start pb-0.5" dir="rtl">
            <TabsList className="bg-muted/70 dark:bg-muted/30 p-1 rounded-xl flex w-full sm:w-auto justify-start gap-1 h-auto border border-border/70 shadow-2xs backdrop-blur-xs" dir="rtl">
              {/* تبويب 1: الطلبات المتأخرة */}
              {canViewDelayedRequests && (
                <TabsTrigger 
                  value="delayed-requests" 
                  className="flex-1 sm:flex-initial min-h-10 max-lg:min-h-11 pointer-coarse:min-h-11 gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground group cursor-pointer min-w-0"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-100/80 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    <FileText className="w-3 h-3" />
                  </div>
                  <span className="truncate font-semibold">الطلبات المتأخرة</span>
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold font-mono tabular-nums bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60 shadow-2xs shrink-0">
                    {requestsResult ? requestsResult.total : (stats?.totalDelayedRequests || 0)}
                  </span>
                </TabsTrigger>
              )}

              {/* تبويب 2: المستفيدون المعلقون */}
              {canViewDelayedBeneficiaries && (
                <TabsTrigger 
                  value="delayed-beneficiaries" 
                  className="flex-1 sm:flex-initial min-h-10 max-lg:min-h-11 pointer-coarse:min-h-11 gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground group cursor-pointer min-w-0"
                >
                  <div className="w-5 h-5 rounded-md bg-teal-100/80 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="truncate font-semibold">المستفيدون المعلقون</span>
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold font-mono tabular-nums bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-300/70 dark:border-teal-700/60 shadow-2xs shrink-0">
                    {beneficiariesResult ? beneficiariesResult.total : (stats?.totalDelayedBeneficiaries || 0)}
                  </span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* شريط الفلاتر والبحث - RTL منسق ومتقن */}
          <Card className="border-0 shadow-xs py-0">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-end">
                {/* 1. حقل البحث المشترك */}
                <div className={activeTab === "delayed-requests" ? "sm:col-span-2 lg:col-span-3 relative min-w-0" : "sm:col-span-2 lg:col-span-6 relative min-w-0"}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between text-right">
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      <span>البحث</span>
                    </span>
                    {(isFetchingRequests || isFetchingBeneficiaries) && (
                      <span className="text-[11px] text-primary flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>جاري البحث...</span>
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={activeTab === "delayed-beneficiaries" ? "الاسم، الجوال، الهوية، المدينة..." : "رقم الطلب، المسجد، المدينة، طالب الخدمة..."}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 max-lg:min-h-11 pointer-coarse:min-h-11 w-full pr-9 pl-8 text-xs sm:text-sm max-md:text-base text-right"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        aria-label="مسح البحث"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {activeTab === "delayed-requests" ? (
                  <>
                    {/* 2. البرنامج (2 أعمدة) */}
                    <div className="lg:col-span-2 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">البرنامج</label>
                      <Select value={programFilter} onValueChange={setProgramFilter} dir="rtl">
                        <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm text-right">
                          <SelectValue placeholder="جميع البرامج" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">جميع البرامج</SelectItem>
                          {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 3. المرحلة (3 أعمدة) */}
                    <div className="lg:col-span-3 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">المرحلة</label>
                      <Select value={stageFilter} onValueChange={setStageFilter} dir="rtl">
                        <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm text-right">
                          <SelectValue placeholder="جميع المراحل" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">جميع المراحل</SelectItem>
                          {slaSettingsData?.stages.map((stg) => (
                            <SelectItem key={stg.stageCode} value={stg.stageCode}>
                              {stg.stageName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 4. التأخير (2 أعمدة) */}
                    <div className="lg:col-span-2 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">التأخير</label>
                      <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)} dir="rtl">
                        <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm text-right">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="warning">تأخير خفيف (1-3 أيام)</SelectItem>
                          <SelectItem value="medium">تأخير متوسط (4-7 أيام)</SelectItem>
                          <SelectItem value="critical">تأخير حرج (&gt; 7 أيام)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 5. الترتيب (2 أعمدة) */}
                    <div className="lg:col-span-2 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">الترتيب</label>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)} dir="rtl">
                        <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm text-right">
                          <SelectValue placeholder="الأكثر تأخيراً" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="delay_desc">الأكثر تأخيراً أولاً</SelectItem>
                          <SelectItem value="delay_asc">الأقل تأخيراً أولاً</SelectItem>
                          <SelectItem value="created_desc">الأحدث أولاً</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* فلاتر المستفيدين: التأخير والترتيب */}
                    {/* التأخير (3 أعمدة) */}
                    <div className="lg:col-span-3 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">التأخير</label>
                      <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)} dir="rtl">
                        <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm text-right">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="warning">تأخير خفيف (1-3 أيام)</SelectItem>
                          <SelectItem value="medium">تأخير متوسط (4-7 أيام)</SelectItem>
                          <SelectItem value="critical">تأخير حرج (&gt; 7 أيام)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* الترتيب (3 أعمدة) */}
                    <div className="lg:col-span-3 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">الترتيب</label>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)} dir="rtl">
                        <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm text-right">
                          <SelectValue placeholder="الأكثر تأخيراً" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="delay_desc">الأكثر تأخيراً أولاً</SelectItem>
                          <SelectItem value="delay_asc">الأقل تأخيراً أولاً</SelectItem>
                          <SelectItem value="created_desc">الأحدث تسجيلاً أولاً</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {hasActiveFilters && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3.5 pt-3 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    نتائج البحث والفلترة من الخادم:{" "}
                    <strong className="text-foreground font-mono tabular-nums">
                      {activeTab === "delayed-requests" ? requestsTotal : beneficiariesTotal}
                    </strong>{" "}
                    عنصر متطابق
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 max-lg:min-h-10 pointer-coarse:min-h-10 px-3 text-xs sm:text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة ضبط الفلاتر</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* تبويب 1: قائمة الطلبات المتأخرة */}
          {canViewDelayedRequests && (
            <TabsContent value="delayed-requests" className="space-y-4">
            <Card className="border-0 shadow-xs overflow-hidden py-0">
              {isLoadingRequests ? (
                <div className="p-10 sm:p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-4 text-xs sm:text-sm font-medium">جاري جلب الطلبات المتأخرة...</p>
                </div>
              ) : sortedRequests.length > 0 ? (
                <div>
                  {/* Desktop Table (>= lg) */}
                  <div className="hidden lg:block">
                    {/* Table Header */}
                    <div className="grid grid-cols-[auto_1.6fr_1.3fr_1.1fr_1.2fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      <div className="w-8"></div>
                      <div className="text-right">الطلب</div>
                      <div className="text-right">المسجد</div>
                      <div className="text-right">المرحلة</div>
                      <div className="text-right">التأخير</div>
                      <div className="w-16 text-center">عرض</div>
                    </div>

                    {/* صفوف الطلبات */}
                    <div className="divide-y divide-border">
                      {sortedRequests.map((req) => {
                        const severity = SEVERITY_CONFIG[req.severity];
                        const stageLabel = STAGE_LABELS[req.currentStage] || req.currentStage;
                        const progName = req.programType ? PROGRAM_LABELS[req.programType] || req.programType : "";
                        const titleText = req.isMultiMosque
                          ? (req.projectName || req.descriptiveName || "مشروع لعدة مساجد")
                          : req.programType === "bunyan" 
                            ? `طلب ${req.requester?.name || ""}`
                            : (req.mosque?.name && req.mosque.name !== "غير محدد"
                                ? (req.mosque.name.trim().startsWith("مسجد") ? `طلب ${req.mosque.name}` : `طلب مسجد ${req.mosque.name}`)
                                : (req.descriptiveName || `طلب ${req.requester?.name || req.requestNumber}`));

                        return (
                          <div
                            key={req.id}
                            className="grid grid-cols-[auto_1.6fr_1.3fr_1.1fr_1.2fr_auto] gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors items-center cursor-pointer text-right"
                            onClick={() => navigate(`/requests/${req.id}`)}
                          >
                            {/* Program Icon */}
                            <div className="flex w-8 justify-center shrink-0">
                              {req.isMultiMosque ? (
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs" title="مشروع مباشر لعدة مساجد">
                                  <MultiMosquesIcon className="w-4 h-4" />
                                </div>
                              ) : (
                                <ProgramIcon program={req.programType} size="md" />
                              )}
                            </div>

                            {/* Request Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-foreground text-sm truncate" title={titleText}>
                                  {titleText}
                                </p>
                                {req.descriptiveName && (!req.isMultiMosque || req.descriptiveName !== req.projectName) && (
                                  <span className="text-[11px] px-1.5 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded border border-purple-200/60 font-medium truncate max-w-[160px]" title={req.descriptiveName}>
                                    {req.descriptiveName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {req.isMultiMosque
                                  ? `مشروع مباشر لعدة مساجد (${req.requestNumber})`
                                  : `${req.programName || progName} (${req.requestNumber})`}
                              </p>
                            </div>

                            {/* Mosque */}
                            <div className="flex items-center gap-2 min-w-0 text-right">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate" title={req.multiMosqueNames || req.mosque?.name || "—"}>
                                  {req.multiMosqueNames || req.mosque?.name || "—"}
                                </p>
                                {req.mosque?.city && (
                                  <p className="text-xs text-muted-foreground truncate">{req.mosque.city}</p>
                                )}
                              </div>
                            </div>

                            {/* Stage */}
                            <div className="flex flex-col gap-1 min-w-0 text-right">
                              <Badge variant="outline" className="text-xs font-medium py-0.5 px-2 w-fit max-w-full truncate">
                                {stageLabel}
                              </Badge>
                            </div>

                            {/* Delay Status Badge */}
                            <div className="shrink-0 text-right">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${severity.bg} ${severity.color} shadow-2xs`}>
                                {severity.icon}
                                <span>متأخر <strong className="font-mono tabular-nums font-bold">{formatDelayText(req.delayDaysOnly, req.delayHoursOnly, req.delayDays)}</strong></span>
                              </span>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-center w-16" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/requests/${req.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 pointer-coarse:size-10 p-0 text-muted-foreground hover:text-primary">
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile & iPad Card Grid (< lg) */}
                  <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 bg-muted/15">
                    {sortedRequests.map((req) => {
                      const severity = SEVERITY_CONFIG[req.severity];
                      const stageLabel = STAGE_LABELS[req.currentStage] || req.currentStage;
                      const progName = req.programType ? PROGRAM_LABELS[req.programType] || req.programType : "";
                      const titleText = req.isMultiMosque
                        ? (req.projectName || req.descriptiveName || "مشروع لعدة مساجد")
                        : req.programType === "bunyan" 
                          ? `طلب ${req.requester?.name || ""}`
                          : (req.mosque?.name && req.mosque.name !== "غير محدد"
                              ? (req.mosque.name.trim().startsWith("مسجد") ? `طلب ${req.mosque.name}` : `طلب مسجد ${req.mosque.name}`)
                              : (req.descriptiveName || `طلب ${req.requester?.name || req.requestNumber}`));

                      return (
                        <div
                          key={req.id}
                          onClick={() => navigate(`/requests/${req.id}`)}
                          className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-primary/40 hover:shadow-xs transition-all text-right"
                        >
                          <div className="space-y-2.5 min-w-0">
                            <div className="flex items-start justify-between gap-2.5 min-w-0">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="shrink-0 mt-0.5">
                                  {req.isMultiMosque ? (
                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
                                      <MultiMosquesIcon className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <ProgramIcon program={req.programType} size="md" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug line-clamp-2 break-words">
                                    {titleText}
                                  </p>
                                  <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 truncate">
                                    {req.isMultiMosque
                                      ? `مشروع مباشر لعدة مساجد (${req.requestNumber})`
                                      : `${req.programName || progName} (${req.requestNumber})`}
                                  </p>
                                </div>
                              </div>
                              <ChevronLeft className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border ${severity.bg} ${severity.color} shadow-2xs`}>
                                {severity.icon}
                                <span>متأخر <strong className="font-mono tabular-nums font-bold">{formatDelayText(req.delayDaysOnly, req.delayHoursOnly, req.delayDays)}</strong></span>
                              </span>
                              <Badge variant="outline" className="text-[11px] sm:text-xs font-medium py-0.5 px-2">
                                {stageLabel}
                              </Badge>
                              {req.descriptiveName && (!req.isMultiMosque || req.descriptiveName !== req.projectName) && (
                                <span className="text-[11px] sm:text-xs px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-md border border-purple-200/60 font-medium truncate max-w-full">
                                  {req.descriptiveName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2.5 border-t border-border/60 text-xs sm:text-[13px]">
                            {(req.multiMosqueNames || req.mosque?.name) && (
                              <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate font-medium text-foreground">
                                  {req.multiMosqueNames || req.mosque?.name}
                                  {req.mosque?.city ? ` (${req.mosque.city})` : ""}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 flex-wrap text-muted-foreground">
                              <span className="truncate">المسؤول: <strong className="text-foreground">{req.responsibleText || "—"}</strong></span>
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/50 text-[11px] sm:text-xs">
                              <span className="text-muted-foreground">
                                المنقضي:{" "}
                                <strong className="text-rose-600 dark:text-rose-400 font-mono tabular-nums font-bold">
                                  {req.elapsedDaysOnly ? `${req.elapsedDaysOnly} يوم و ${req.elapsedHoursOnly || 0} س` : `${req.elapsedDays} يوم`}
                                </strong>
                              </span>
                              <span className="text-muted-foreground">
                                المسموح: <strong className="font-mono tabular-nums font-bold text-foreground">{req.allowedDays}</strong> يوم
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer with Pagination */}
                  <EnhancedPagination
                    page={requestsPage}
                    totalPages={requestsTotalPages}
                    onPageChange={handleRequestsPageChange}
                    totalItems={requestsTotal}
                    itemsPerPage={limit}
                    itemName="طلب متأخر"
                    itemNamePlural="طلبات متأخرة"
                    className="bg-muted/20 border-t max-sm:px-2 max-sm:[&_button]:px-2 pointer-coarse:[&_button]:min-h-11"
                  />
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">لا توجد طلبات متأخرة حالياً</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    جميع الطلبات النشطة تسير وفق المدة الزمنية المحددة.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
          )}

          {/* تبويب 2: المستفيدون المعلقون */}
          {canViewDelayedBeneficiaries && (
            <TabsContent value="delayed-beneficiaries" className="space-y-4">
            <Card className="border-0 shadow-xs overflow-hidden py-0">
              {isLoadingBeneficiaries ? (
                <div className="p-10 sm:p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-4 text-xs sm:text-sm font-medium">جاري جلب المستفيدين المعلقين...</p>
                </div>
              ) : sortedBeneficiaries.length > 0 ? (
                <div>
                  {/* Desktop Table (>= lg) */}
                  <div className="hidden lg:block">
                    {/* Table Header */}
                    <div className="grid grid-cols-[auto_1.6fr_1.3fr_1.3fr_1.2fr_auto] gap-4 px-5 py-3.5 bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                      <div className="w-8"></div>
                      <div className="text-right">طالب الخدمة</div>
                      <div className="text-right">الصفة والمدينة</div>
                      <div className="text-right">الهوية والجوال</div>
                      <div className="text-right">التأخير</div>
                      <div className="w-16 text-center">عرض</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border">
                      {sortedBeneficiaries.map((ben) => {
                        const severity = SEVERITY_CONFIG[ben.severity];

                        return (
                          <div
                            key={ben.id}
                            className="grid grid-cols-[auto_1.6fr_1.3fr_1.3fr_1.2fr_auto] gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors items-center cursor-pointer text-right"
                            onClick={() => navigate(`/requester-approvals/${ben.id}`)}
                          >
                            {/* User Avatar */}
                            <div className="flex w-8 justify-center shrink-0">
                              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
                                <User className="w-4 h-4" />
                              </div>
                            </div>

                            {/* Beneficiary Name */}
                            <div className="min-w-0 text-right">
                              <p className="font-semibold text-foreground text-sm truncate">{ben.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{ben.email || "بدون بريد"}</p>
                            </div>

                            {/* Role & City */}
                            <div className="min-w-0 text-right">
                              <Badge variant="outline" className="text-xs bg-teal-50/50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200">
                                {REQUESTER_TYPE_LABELS[ben.requesterType || ""] || ben.requesterType || "طالب خدمة"}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{ben.city || "—"}</p>
                            </div>

                            {/* Contacts */}
                            <div className="flex flex-col gap-1 min-w-0 text-xs text-right">
                              <div className="flex items-center gap-1.5" title="رقم الجوال">
                                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span className="font-mono font-medium text-foreground text-xs tabular-nums tracking-wide" dir="ltr">
                                  {ben.phone || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5" title="رقم الهوية الوطنية">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="font-mono font-medium text-foreground text-xs tabular-nums bg-muted/80 dark:bg-muted/50 px-1.5 py-0.5 rounded border border-border/80 tracking-wider shadow-2xs" dir="ltr">
                                  {ben.nationalId || "—"}
                                </span>
                              </div>
                            </div>

                            {/* Delay Status Badge */}
                            <div className="shrink-0 text-right">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${severity.bg} ${severity.color} shadow-2xs`}>
                                {severity.icon}
                                <span>متأخر <strong className="font-mono tabular-nums font-bold">{formatDelayText(ben.delayDaysOnly, ben.delayHoursOnly, ben.delayDays)}</strong></span>
                              </span>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-center w-16">
                              <Link href={`/requester-approvals/${ben.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 pointer-coarse:size-10 p-0 text-muted-foreground hover:text-primary">
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile & iPad Card Grid (< lg) */}
                  <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 bg-muted/15">
                    {sortedBeneficiaries.map((ben) => {
                      const severity = SEVERITY_CONFIG[ben.severity];
                      const { date, time } = formatRegisteredDateTime(ben.createdAt);
                      const { days, hours } = formatElapsedDetailed(ben.createdAt);

                      return (
                        <div
                          key={ben.id}
                          onClick={() => navigate(`/requester-approvals/${ben.id}`)}
                          className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-primary/40 hover:shadow-xs transition-all text-right"
                        >
                          <div className="space-y-2.5 min-w-0">
                            <div className="flex items-start justify-between gap-2.5 min-w-0">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60 shrink-0 mt-0.5">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug truncate">{ben.name}</p>
                                  <p className="text-xs sm:text-[13px] text-muted-foreground truncate mt-0.5">{ben.email || "بدون بريد"}</p>
                                </div>
                              </div>
                              <ChevronLeft className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border ${severity.bg} ${severity.color} shadow-2xs`}>
                                {severity.icon}
                                <span>متأخر <strong className="font-mono tabular-nums font-bold">{formatDelayText(ben.delayDaysOnly, ben.delayHoursOnly, ben.delayDays)}</strong></span>
                              </span>
                              <Badge variant="outline" className="text-[11px] sm:text-xs bg-teal-50/50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200">
                                {REQUESTER_TYPE_LABELS[ben.requesterType || ""] || ben.requesterType || "طالب خدمة"}
                              </Badge>
                              {ben.city && (
                                <span className="text-[11px] sm:text-xs text-muted-foreground">{ben.city}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2.5 border-t border-border/60 text-xs sm:text-[13px] text-right">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>الجوال:</span>
                              </span>
                              <span className="font-mono font-bold text-foreground tabular-nums" dir="ltr">{ben.phone || "—"}</span>
                            </div>
                            {ben.nationalId && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                  <span>الهوية الوطنية:</span>
                                </span>
                                <span className="font-mono font-bold text-foreground tabular-nums bg-muted/80 px-2 py-0.5 rounded border border-border/70 text-[11px] sm:text-xs" dir="ltr">{ben.nationalId}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/40 p-2 rounded-lg border border-border/60 text-[11px] sm:text-xs">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="text-muted-foreground font-medium">المنقضي:</span>
                                <strong className="text-rose-600 dark:text-rose-400 font-mono font-extrabold tabular-nums">
                                  {days > 0 ? `${days} يوم و ${hours} ساعة` : `${hours} ساعة`}
                                </strong>
                              </div>
                              <div className="text-muted-foreground">
                                <span>المهلة: <strong className="font-mono tabular-nums font-bold text-foreground">{ben.allowedDays}</strong> يوم</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground">
                              <span>تاريخ التسجيل:</span>
                              <span className="font-mono tabular-nums font-bold text-foreground" dir="ltr">{date} - {time}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer with Pagination */}
                  <EnhancedPagination
                    page={beneficiariesPage}
                    totalPages={beneficiariesTotalPages}
                    onPageChange={handleBeneficiariesPageChange}
                    totalItems={beneficiariesTotal}
                    itemsPerPage={limit}
                    itemName="مستفيد متأخر"
                    itemNamePlural="مستفيدون متأخرون"
                    className="bg-muted/20 border-t max-sm:px-2 max-sm:[&_button]:px-2 pointer-coarse:[&_button]:min-h-11"
                  />
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">لا يوجد مستفيدون معلقون متأخرون</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    جميع طلبات تسجيل المستفيدين تمت مراجعتها ضمن المهلة المحددة ({slaSettingsData?.beneficiarySLA?.durationDays || 3} أيام).
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
          )}
        </Tabs>

        {/* نافذة إرسال تنبيه تصعيدي */}
        <Dialog open={alertModalOpen} onOpenChange={setAlertModalOpen}>
          <DialogContent className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto max-sm:p-4 pointer-coarse:[&_button]:min-h-11" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <Bell className="w-5 h-5 text-amber-600 shrink-0" />
                <span>إرسال تنبيه تصعيد إداري</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-right">
              <p className="text-xs sm:text-sm font-bold text-foreground break-words">{alertTarget?.title}</p>
              <textarea
                value={alertCustomMessage}
                onChange={(e) => setAlertCustomMessage(e.target.value)}
                rows={4}
                className="w-full text-sm max-md:text-base p-3 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary text-right"
                placeholder="أدخل رسالة التنبيه المخصصة..."
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAlertModalOpen(false)}
                className="w-full sm:w-auto max-lg:min-h-11 text-xs sm:text-sm"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (alertTarget) {
                    sendAlertMutation.mutate({
                      targetType: alertTarget.type,
                      targetId: alertTarget.id,
                      customMessage: alertCustomMessage,
                    });
                  }
                }}
                disabled={sendAlertMutation.isPending}
                className="w-full sm:w-auto max-lg:min-h-11 gradient-primary text-white text-xs sm:text-sm px-4 gap-1.5"
              >
                {sendAlertMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>إرسال التنبيه</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة تفاصيل الطلب السريعة */}
        {selectedRequestId && (
          <RequestDetailsModal
            requestId={selectedRequestId}
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
          />
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
