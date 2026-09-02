import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
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
  SlidersHorizontal,
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

export default function EscalationPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("delayed-requests");

  // الفلاتر
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "warning" | "medium" | "critical">("all");
  const [requesterTypeFilter, setRequesterTypeFilter] = useState<string>("all");
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

  // استعلامات البيانات من الخادم (مربوطة بالكامل مع فلاتر الـ Backend)
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    refetch: refetchStats 
  } = trpc.escalation.getStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { 
    data: delayedRequests = [], 
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests,
    refetch: refetchRequests 
  } = trpc.escalation.getDelayedRequests.useQuery({
    stageCode: stageFilter !== "all" ? stageFilter : undefined,
    programType: programFilter !== "all" ? programFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy,
  });

  const { 
    data: delayedBeneficiaries = [], 
    isLoading: isLoadingBeneficiaries,
    isFetching: isFetchingBeneficiaries,
    refetch: refetchBeneficiaries 
  } = trpc.escalation.getDelayedBeneficiaries.useQuery({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    requesterType: requesterTypeFilter !== "all" ? requesterTypeFilter : undefined,
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy,
  });

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
    setRequesterTypeFilter("all");
    setSortBy("delay_desc");
  };

  const hasActiveFilters = Boolean(
    search.trim() || 
    stageFilter !== "all" || 
    programFilter !== "all" || 
    severityFilter !== "all" || 
    requesterTypeFilter !== "all" ||
    sortBy !== "delay_desc"
  );

  // الاعتماد مباشرة على البيانات المفلترة والمرتبة من الـ Backend
  const sortedRequests = delayedRequests;
  const sortedBeneficiaries = delayedBeneficiaries;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden text-right" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground pb-1 leading-normal">
                التصعيد الإداري
              </h1>
              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs px-2.5 py-0.5 font-medium">
                متابعة التأخير
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">
              عرض ومتابعة الطلبات المتأخرة حسب المراحل وطلبات المستفيدين المعلقة
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <Link href="/forms-customization/escalation">
              <Button
                className="gradient-primary text-white gap-2 h-10 px-4 shadow-xs font-semibold"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>تخصيص مدة التصعيد</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row - كروت إحصائيات تفاعلية تبدأ بالطلبات المتأخرة أولاً على اليمين */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" dir="rtl">
          {[
            {
              id: "requests",
              label: "الطلبات المتأخرة",
              value: stats?.totalDelayedRequests || 0,
              icon: <Clock className="w-5 h-5" />,
              iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
              onClick: () => {
                setActiveTab("delayed-requests");
              },
            },
            {
              id: "beneficiaries",
              label: "مستفيدون معلقون",
              value: stats?.totalDelayedBeneficiaries || 0,
              icon: <Users className="w-5 h-5" />,
              iconBg: "bg-teal-100 dark:bg-teal-950/40 text-teal-600",
              onClick: () => {
                setActiveTab("delayed-beneficiaries");
              },
            },
            {
              id: "critical",
              label: "تأخير حرج (> 7 أيام)",
              value: stats?.criticalEscalations || 0,
              icon: <Flame className="w-5 h-5" />,
              iconBg: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
              onClick: () => {
                setSeverityFilter("critical");
              },
            },
            {
              id: "all",
              label: "إجمالي المتأخرات",
              value: stats?.totalDelayedItems || 0,
              icon: <FileText className="w-5 h-5" />,
              iconBg: "bg-primary/10 text-primary",
              onClick: () => {
                setActiveTab("delayed-requests");
                setSeverityFilter("all");
              },
            },
          ].map((stat) => (
            <Card 
              key={stat.label} 
              onClick={stat.onClick}
              className="border-0 shadow-xs overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-right"
              dir="rtl"
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs text-muted-foreground truncate font-medium">{stat.label}</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground truncate mt-0.5 font-mono tabular-nums">
                      {isLoadingStats ? <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" /> : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* التبويبات الرئيسية - تصميم مطور وتجربة مستخدم عصرية */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir="rtl">
          <div className="flex items-center justify-start pb-1" dir="rtl">
            <TabsList className="bg-muted/70 dark:bg-muted/30 p-1.5 rounded-2xl inline-flex w-full sm:w-auto justify-start gap-1.5 h-auto border border-border/70 shadow-2xs backdrop-blur-xs" dir="rtl">
              {/* تبويب 1: الطلبات المتأخرة */}
              <TabsTrigger 
                value="delayed-requests" 
                className="flex-1 sm:flex-initial gap-2.5 px-4 py-2.5 text-xs md:text-sm rounded-xl font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100/80 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="whitespace-nowrap font-bold">الطلبات المتأخرة</span>
                <span className="inline-flex items-center justify-center min-w-6 h-5 px-2 rounded-full text-xs font-bold font-mono tabular-nums bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60 shadow-2xs">
                  {delayedRequests?.length || 0}
                </span>
              </TabsTrigger>

              {/* تبويب 2: المستفيدون المعلقون */}
              <TabsTrigger 
                value="delayed-beneficiaries" 
                className="flex-1 sm:flex-initial gap-2.5 px-4 py-2.5 text-xs md:text-sm rounded-xl font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-teal-100/80 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="whitespace-nowrap font-bold">المستفيدون المعلقون</span>
                <span className="inline-flex items-center justify-center min-w-6 h-5 px-2 rounded-full text-xs font-bold font-mono tabular-nums bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-300/70 dark:border-teal-700/60 shadow-2xs">
                  {delayedBeneficiaries?.length || 0}
                </span>
              </TabsTrigger>

              {/* تبويب 3: خريطة المراحل */}
              <TabsTrigger 
                value="sla-overview" 
                className="flex-1 sm:flex-initial gap-2.5 px-4 py-2.5 text-xs md:text-sm rounded-xl font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <span className="whitespace-nowrap font-bold">خريطة المراحل</span>
                <span className="inline-flex items-center justify-center px-2 h-5 rounded-full text-3xs font-semibold bg-muted text-muted-foreground border border-border/80 font-mono">
                  SLA
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* شريط الفلاتر والبحث - RTL منسق ومتقن */}
          <Card className="border-0 shadow-xs">
            <CardContent className="p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* 1. حقل البحث المشترك */}
                <div className={activeTab === "delayed-requests" ? "lg:col-span-3 relative" : "lg:col-span-4 relative"}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between text-right">
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      <span>البحث</span>
                    </span>
                    {(isFetchingRequests || isFetchingBeneficiaries) && (
                      <span className="text-3xs text-primary flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>جاري البحث...</span>
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={activeTab === "delayed-beneficiaries" ? "الاسم، الجوال، الهوية، المدينة..." : "رقم الطلب، المسجد، المدينة، طالب الخدمة..."}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 w-full pr-10 pl-8 text-xs md:text-sm text-right"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {activeTab === "delayed-requests" ? (
                  <>
                    {/* 2. البرنامج (2 أعمدة) */}
                    <div className="lg:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">البرنامج</label>
                      <Select value={programFilter} onValueChange={setProgramFilter} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
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
                    <div className="lg:col-span-3">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">المرحلة</label>
                      <Select value={stageFilter} onValueChange={setStageFilter} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
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
                    <div className="lg:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">التأخير</label>
                      <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
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
                    <div className="lg:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">الترتيب</label>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
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
                    {/* فلاتر المستفيدين */}
                    {/* صفة طالب الخدمة */}
                    <div className="lg:col-span-3">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">صفة طالب الخدمة</label>
                      <Select value={requesterTypeFilter} onValueChange={setRequesterTypeFilter} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
                          <SelectValue placeholder="جميع الصفات" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">جميع الصفات</SelectItem>
                          {Object.entries(REQUESTER_TYPE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* التأخير */}
                    <div className="lg:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">التأخير</label>
                      <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
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

                    {/* الترتيب */}
                    <div className="lg:col-span-3">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">الترتيب</label>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
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
                <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    نتائج البحث والفلترة من الخادم:{" "}
                    <strong className="text-foreground font-mono tabular-nums">
                      {activeTab === "delayed-requests" ? delayedRequests.length : delayedBeneficiaries.length}
                    </strong>{" "}
                    عنصر متطابق
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-7 px-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط الفلاتر</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* تبويب 1: قائمة الطلبات المتأخرة */}
          <TabsContent value="delayed-requests" className="space-y-4">
            <Card className="border-0 shadow-xs overflow-hidden">
              {isLoadingRequests ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-4 text-sm font-medium">جاري جلب الطلبات المتأخرة...</p>
                </div>
              ) : sortedRequests.length > 0 ? (
                <div>
                  {/* Table Header (Desktop Only) */}
                  <div className="hidden md:grid grid-cols-[auto_1.6fr_1.3fr_1.1fr_1.2fr_auto] gap-4 px-5 py-3.5 bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    <div className="w-8"></div>
                    <div className="text-right">الطلب</div>
                    <div className="text-right">المسجد</div>
                    <div className="text-right">المرحلة</div>
                    <div className="text-right">التأخير</div>
                    <div className="w-20 text-center">عرض</div>
                  </div>

                  {/* صفوف الطلبات */}
                  <div className="divide-y divide-border">
                    {sortedRequests.map((req) => {
                      const severity = SEVERITY_CONFIG[req.severity];
                      const stageLabel = STAGE_LABELS[req.currentStage] || req.currentStage;
                      const progName = req.programType ? PROGRAM_LABELS[req.programType] || req.programType : "";

                      return (
                        <div
                          key={req.id}
                          className="grid grid-cols-1 md:grid-cols-[auto_1.6fr_1.3fr_1.1fr_1.2fr_auto] gap-3 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-colors items-center cursor-pointer text-right"
                          onClick={() => navigate(`/requests/${req.id}`)}
                        >
                          {/* Desktop: Program Icon */}
                          <div className="hidden md:flex w-8 justify-center shrink-0">
                            {req.isMultiMosque ? (
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs" title="مشروع مباشر لعدة مساجد">
                                <MultiMosquesIcon className="w-4.5 h-4.5" />
                              </div>
                            ) : (
                              <ProgramIcon program={req.programType} size="md" />
                            )}
                          </div>

                          {/* Request Info */}
                          <div className="flex items-start justify-between md:block gap-3 min-w-0">
                            <div className="flex items-center gap-3 md:block min-w-0">
                              <div className="md:hidden shrink-0">
                                {req.isMultiMosque ? (
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
                                    <MultiMosquesIcon className="w-4.5 h-4.5" />
                                  </div>
                                ) : (
                                  <ProgramIcon program={req.programType} size="md" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-foreground text-sm truncate">
                                    {req.isMultiMosque
                                      ? (req.projectName || req.descriptiveName || "مشروع لعدة مساجد")
                                      : req.programType === "bunyan" 
                                        ? `طلب ${req.requester?.name || ""}`
                                        : (req.mosque?.name && req.mosque.name !== "غير محدد"
                                            ? (req.mosque.name.trim().startsWith("مسجد") ? `طلب ${req.mosque.name}` : `طلب مسجد ${req.mosque.name}`)
                                            : (req.descriptiveName || `طلب ${req.requester?.name || req.requestNumber}`))}
                                  </p>
                                  {req.descriptiveName && (!req.isMultiMosque || req.descriptiveName !== req.projectName) && (
                                    <span className="text-2xs px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded border border-purple-200/60 font-medium truncate max-w-[150px]" title={req.descriptiveName}>
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
                            </div>
                            <div className="md:hidden shrink-0 text-left">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${severity.bg} ${severity.color}`}>
                                {severity.icon}
                                <span>متأخر <strong className="font-mono tabular-nums">{req.delayDays}</strong> يوم</span>
                              </span>
                            </div>
                          </div>

                          {/* Mosque (Desktop) */}
                          <div className="hidden md:flex items-center gap-2 min-w-0 text-right">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate" title={req.multiMosqueNames || req.mosque?.name || "—"}>
                                {req.multiMosqueNames || req.mosque?.name || "—"}
                              </p>
                              {req.mosque?.city && (
                                <p className="text-2xs text-muted-foreground truncate">{req.mosque.city}</p>
                              )}
                            </div>
                          </div>

                          {/* Stage (Desktop) */}
                          <div className="hidden md:block min-w-0 text-right">
                            <Badge variant="outline" className="text-xs font-medium py-0.5">
                              {stageLabel}
                            </Badge>
                          </div>

                          {/* Delay Status Badge (Desktop) */}
                          <div className="hidden md:block shrink-0 text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${severity.bg} ${severity.color}`}>
                              {severity.icon}
                              <span>متأخر <strong className="font-mono tabular-nums">{req.delayDays}</strong> {req.delayDays === 1 ? "يوماً" : "أيام"}</span>
                            </span>
                          </div>

                          {/* Action Button */}
                          <div className="hidden md:flex justify-center w-20" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/requests/${req.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>

                          {/* Mobile Detailed View */}
                          <div className="md:hidden flex flex-col gap-2 pt-2 border-t border-border/50 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>المرحلة: <strong className="text-foreground">{stageLabel}</strong></span>
                              <span>المسؤول: {req.responsibleText}</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>المنقضي في المرحلة: <strong className="text-rose-600 font-mono tabular-nums">{req.elapsedDays}</strong> يوم</span>
                              <span>المسموح: <strong className="font-mono tabular-nums text-foreground">{req.allowedDays}</strong> يوم</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">لا توجد طلبات متأخرة حالياً</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    جميع الطلبات النشطة تسير وفق المدة الزمنية المحددة.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* تبويب 2: المستفيدون المعلقون */}
          <TabsContent value="delayed-beneficiaries" className="space-y-4">
            <Card className="border-0 shadow-xs overflow-hidden">
              {isLoadingBeneficiaries ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-4 text-sm font-medium">جاري جلب المستفيدين المعلقين...</p>
                </div>
              ) : sortedBeneficiaries.length > 0 ? (
                <div>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-[auto_1.4fr_1fr_1.1fr_1.6fr_1fr_auto] gap-4 px-5 py-3.5 bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    <div className="w-8"></div>
                    <div className="text-right">طالب الخدمة</div>
                    <div className="text-right">الصفة والمدينة</div>
                    <div className="text-right">الهوية والجوال</div>
                    <div className="text-right">تاريخ التسجيل والمنقضي</div>
                    <div className="text-right">التأخير</div>
                    <div className="w-20 text-center">عرض</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border">
                    {sortedBeneficiaries.map((ben) => {
                      const severity = SEVERITY_CONFIG[ben.severity];

                      return (
                        <div
                          key={ben.id}
                          className="grid grid-cols-1 md:grid-cols-[auto_1.4fr_1fr_1.1fr_1.6fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-colors items-center text-right"
                        >
                          {/* User Avatar */}
                          <div className="hidden md:flex w-8 justify-center shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
                              <User className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Beneficiary Name */}
                          <div className="min-w-0 text-right">
                            <p className="font-bold text-foreground text-sm truncate">{ben.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{ben.email || "بدون بريد"}</p>
                          </div>

                          {/* Role & City */}
                          <div className="hidden md:block min-w-0 text-right">
                            <Badge variant="outline" className="text-xs bg-teal-50/50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200">
                              {REQUESTER_TYPE_LABELS[ben.requesterType || ""] || ben.requesterType || "طالب خدمة"}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{ben.city || "—"}</p>
                          </div>

                          {/* Contacts */}
                          <div className="hidden md:block min-w-0 text-xs text-right">
                            <p className="font-mono text-foreground tabular-nums" dir="ltr">{ben.phone || "—"}</p>
                            <p className="font-mono text-muted-foreground mt-0.5 tabular-nums">{ben.nationalId || "—"}</p>
                          </div>

                          {/* Registration Date & Elapsed */}
                          {(() => {
                            const { date, time } = formatRegisteredDateTime(ben.createdAt);
                            const { days, hours } = formatElapsedDetailed(ben.createdAt);

                            return (
                              <div className="hidden md:flex flex-col gap-1 min-w-0 text-xs text-right">
                                {/* الوقت المنقضي بالأيام والساعات مع أرقام إنجليزية */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-muted-foreground text-2xs font-medium">المنقضي:</span>
                                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-800/60 shadow-2xs">
                                    <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                    <span className="font-mono tabular-nums text-xs">
                                      {days > 0 ? (
                                        <>
                                          <span>{days}</span> يوم {hours > 0 && <>و <span>{hours}</span> س</>}
                                        </>
                                      ) : (
                                        <>
                                          <span>{hours}</span> ساعة
                                        </>
                                      )}
                                    </span>
                                  </span>
                                </div>

                                {/* تاريخ ووقت التسجيل بالإنجليزية */}
                                <div className="flex items-center gap-1.5 text-2xs text-muted-foreground mt-0.5" title="تاريخ ووقت التسجيل">
                                  <Calendar className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                  <span className="font-mono tabular-nums font-medium" dir="ltr">{date}</span>
                                  <span className="text-muted-foreground/40">•</span>
                                  <span className="font-mono tabular-nums" dir="ltr">{time}</span>
                                </div>

                                {/* المهلة المحددة */}
                                <div className="text-3xs text-muted-foreground/80 flex items-center gap-1">
                                  <span>المهلة المحددة:</span>
                                  <span className="font-mono tabular-nums font-bold text-foreground">{ben.allowedDays}</span>
                                  <span>{ben.allowedDays === 1 ? "يوم" : "أيام"}</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Delay Status Badge */}
                          <div className="hidden md:block shrink-0 text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${severity.bg} ${severity.color}`}>
                              {severity.icon}
                              <span>متأخر <strong className="font-mono tabular-nums">{ben.delayDays}</strong> {ben.delayDays === 1 ? "يوماً" : "أيام"}</span>
                            </span>
                          </div>

                          {/* Action Button */}
                          <div className="hidden md:flex justify-center w-20" onClick={(e) => e.stopPropagation()}>
                            <Link href="/requester-approvals">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>

                          {/* Mobile View details */}
                          {(() => {
                            const { date, time } = formatRegisteredDateTime(ben.createdAt);
                            const { days, hours } = formatElapsedDetailed(ben.createdAt);

                            return (
                              <div className="md:hidden flex flex-col gap-2 pt-2.5 border-t border-border/50 text-xs text-right">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">الصفة: <strong className="text-foreground">{REQUESTER_TYPE_LABELS[ben.requesterType || ""] || "طالب خدمة"}</strong></span>
                                  <span className="font-mono text-muted-foreground tabular-nums" dir="ltr">{ben.phone}</span>
                                </div>
                                <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/60">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="text-muted-foreground">المنقضي:</span>
                                    <strong className="text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                                      {days > 0 ? `${days} يوم و ${hours} ساعة` : `${hours} ساعة`}
                                    </strong>
                                  </div>
                                  <div className="text-muted-foreground text-2xs">
                                    <span>المهلة: <strong className="font-mono tabular-nums text-foreground">{ben.allowedDays}</strong> يوم</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-2xs text-muted-foreground">
                                  <span>تاريخ التسجيل:</span>
                                  <span className="font-mono tabular-nums" dir="ltr">{date} - {time}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">لا يوجد مستفيدون معلقون متأخرون</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    جميع طلبات تسجيل المستفيدين تمت مراجعتها ضمن المهلة المحددة ({slaSettingsData?.beneficiarySLA?.durationDays || 3} أيام).
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* تبويب 3: خريطة المراحل */}
          <TabsContent value="sla-overview" className="space-y-4">
            <Card className="border-0 shadow-xs">
              <CardContent className="p-5 md:p-6 space-y-4 text-right">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span>متابعة تأخير المراحل</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    عدد الطلبات المتأخرة في كل مرحلة مقارنة بالمدة الزمنية المعتمدة
                  </p>
                </div>

                <div className="space-y-3">
                  {slaSettingsData?.stages.map((stg) => {
                    const delayedCount = stats?.stageCounts?.[stg.stageCode] || 0;
                    const maxCount = Math.max(...Object.values(stats?.stageCounts || { a: 1 }), 1);
                    const percentage = Math.round((delayedCount / maxCount) * 100);

                    return (
                      <div key={stg.stageCode} className="p-3.5 bg-muted/40 rounded-xl border border-border/50 space-y-2 text-right">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-2xs">
                              {stg.stageOrder}
                            </span>
                            <span className="font-bold text-foreground">{stg.stageName}</span>
                            <span className="text-muted-foreground">({stg.durationDays} أيام)</span>
                          </div>
                          <div>
                            {delayedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                {delayedCount} طلب متأخر
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                ضمن المهلة
                              </span>
                            )}
                          </div>
                        </div>

                        {/* شريط التقدم */}
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${delayedCount > 5 ? 'bg-rose-500' : delayedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(delayedCount > 0 ? 8 : 0, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>



        {/* نافذة إرسال تنبيه تصعيدي */}
        <Dialog open={alertModalOpen} onOpenChange={setAlertModalOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Bell className="w-5 h-5 text-amber-600" />
                <span>إرسال تنبيه تصعيد إداري</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-right">
              <p className="text-xs font-bold text-foreground">{alertTarget?.title}</p>
              <textarea
                value={alertCustomMessage}
                onChange={(e) => setAlertCustomMessage(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary text-right"
                placeholder="أدخل رسالة التنبيه المخصصة..."
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAlertModalOpen(false)}
                className="text-xs"
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
                className="gradient-primary text-white text-xs px-4 gap-1.5"
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
    </DashboardLayout>
  );
}
