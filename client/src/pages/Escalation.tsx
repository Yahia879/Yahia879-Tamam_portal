import { useState, useMemo } from "react";
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
  RefreshCw,
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

export default function EscalationPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("delayed-requests");

  // الفلاتر
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "warning" | "medium" | "critical">("all");
  const [sortBy, setSortBy] = useState<"delay_desc" | "delay_asc" | "created_desc">("delay_desc");

  // نوافذ الحوار
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState<{ type: "request" | "beneficiary"; id: number; title: string } | null>(null);
  const [alertCustomMessage, setAlertCustomMessage] = useState("");

  // استعلامات البيانات من الخادم
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    refetch: refetchStats 
  } = trpc.escalation.getStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { 
    data: delayedRequests, 
    isLoading: isLoadingRequests, 
    refetch: refetchRequests 
  } = trpc.escalation.getDelayedRequests.useQuery({
    stageCode: stageFilter !== "all" ? stageFilter : undefined,
    programType: programFilter !== "all" ? programFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    search: search.trim() || undefined,
  });

  const { 
    data: delayedBeneficiaries, 
    isLoading: isLoadingBeneficiaries, 
    refetch: refetchBeneficiaries 
  } = trpc.escalation.getDelayedBeneficiaries.useQuery({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    search: search.trim() || undefined,
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

  // إعادة تحميل البيانات
  const handleRefreshAll = () => {
    refetchStats();
    refetchRequests();
    refetchBeneficiaries();
    refetchSettings();
    toast.info("تم تحديث بيانات التصعيد الإداري");
  };

  // مسح الفلاتر
  const handleResetFilters = () => {
    setSearch("");
    setStageFilter("all");
    setProgramFilter("all");
    setSeverityFilter("all");
    setSortBy("delay_desc");
  };

  const hasActiveFilters = Boolean(
    search.trim() || 
    stageFilter !== "all" || 
    programFilter !== "all" || 
    severityFilter !== "all" || 
    sortBy !== "delay_desc"
  );

  // فرز قائمة الطلبات المتأخرة
  const sortedRequests = useMemo(() => {
    if (!delayedRequests) return [];
    const list = [...delayedRequests];
    if (sortBy === "delay_desc") {
      return list.sort((a, b) => b.delayDays - a.delayDays);
    }
    if (sortBy === "delay_asc") {
      return list.sort((a, b) => a.delayDays - b.delayDays);
    }
    if (sortBy === "created_desc") {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [delayedRequests, sortBy]);

  // فرز قائمة المستفيدين
  const sortedBeneficiaries = useMemo(() => {
    if (!delayedBeneficiaries) return [];
    const list = [...delayedBeneficiaries];
    if (sortBy === "delay_desc") {
      return list.sort((a, b) => b.delayDays - a.delayDays);
    }
    if (sortBy === "delay_asc") {
      return list.sort((a, b) => a.delayDays - b.delayDays);
    }
    return list;
  }, [delayedBeneficiaries, sortBy]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden text-right" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
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

          <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="h-10 px-3.5 gap-2 shadow-2xs font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRequests || isLoadingBeneficiaries ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>

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
                    <p className="text-xl md:text-2xl font-bold text-foreground truncate mt-0.5">
                      {isLoadingStats ? <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" /> : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* التبويبات الرئيسية - محاذاة لليمين بالكامل في RTL */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir="rtl">
          <div className="flex justify-start border-b border-border pb-2" dir="rtl">
            <TabsList className="bg-muted p-1 rounded-xl inline-flex w-auto justify-start gap-1 h-auto" dir="rtl">
              <TabsTrigger 
                value="delayed-requests" 
                className="gap-2 px-4 py-2 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-lg font-medium"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>الطلبات المتأخرة</span>
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 font-bold">
                  {delayedRequests?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="delayed-beneficiaries" 
                className="gap-2 px-4 py-2 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-lg font-medium"
              >
                <Users className="w-4 h-4 text-teal-500" />
                <span>المستفيدون المعلقون</span>
                <Badge variant="secondary" className="bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs px-2 py-0.5 font-bold">
                  {delayedBeneficiaries?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="sla-overview" 
                className="gap-2 px-4 py-2 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-lg font-medium"
              >
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>خريطة المراحل</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* شريط الفلاتر والبحث - RTL منسق ومتقن */}
          <Card className="border-0 shadow-xs">
            <CardContent className="p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* 1. حقل البحث (5 أعمدة) */}
                <div className="lg:col-span-4 relative">
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 text-right">
                    <Search className="w-3.5 h-3.5" />
                    <span>البحث</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={activeTab === "delayed-beneficiaries" ? "البحث بالاسم، الجوال، الهوية..." : "رقم الطلب أو المسجد أو طالب الخدمة..."}
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
                    {/* 2. البرنامج (3 أعمدة) */}
                    <div className="lg:col-span-3">
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

                    {/* 4. مستوى التأخير (2 أعمدة) */}
                    <div className="lg:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">مستوى التأخير</label>
                      <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
                          <SelectValue placeholder="كل المستويات" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">كل المستويات</SelectItem>
                          <SelectItem value="warning">تأخير خفيف (1-3 أيام)</SelectItem>
                          <SelectItem value="medium">تأخير متوسط (4-7 أيام)</SelectItem>
                          <SelectItem value="critical">تأخير حرج (&gt; 7 أيام)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* فلاتر المستفيدين */}
                    <div className="lg:col-span-4">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block text-right">مستوى التأخير</label>
                      <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)} dir="rtl">
                        <SelectTrigger className="w-full h-10 text-xs md:text-sm text-right">
                          <SelectValue placeholder="كل المستويات" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" align="end" className="text-right">
                          <SelectItem value="all">كل المستويات</SelectItem>
                          <SelectItem value="warning">تأخير خفيف (1-3 أيام)</SelectItem>
                          <SelectItem value="medium">تأخير متوسط (4-7 أيام)</SelectItem>
                          <SelectItem value="critical">تأخير حرج (&gt; 7 أيام)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="lg:col-span-4">
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
                    يتم عرض النتائج حسب الفلاتر المحددة
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
                  <div className="hidden md:grid grid-cols-[auto_1.4fr_1.1fr_1.1fr_1.2fr_1fr_auto] gap-4 px-5 py-3.5 bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    <div className="w-8"></div>
                    <div className="text-right">الطلب</div>
                    <div className="text-right">المسجد</div>
                    <div className="text-right">المرحلة والمسؤول</div>
                    <div className="text-right">المدة المنقضية</div>
                    <div className="text-right">مستوى التأخير</div>
                    <div className="w-24 text-left pl-2">الإجراءات</div>
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
                          className="grid grid-cols-1 md:grid-cols-[auto_1.4fr_1.1fr_1.1fr_1.2fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-colors items-center cursor-pointer text-right"
                          onClick={() => navigate(`/requests/${req.id}`)}
                        >
                          {/* Desktop: Program Icon */}
                          <div className="hidden md:flex w-8 justify-center shrink-0">
                            <ProgramIcon program={req.programType} size="md" />
                          </div>

                          {/* Request Info */}
                          <div className="flex items-start justify-between md:block gap-3 min-w-0">
                            <div className="flex items-center gap-3 md:block min-w-0">
                              <div className="md:hidden shrink-0">
                                <ProgramIcon program={req.programType} size="md" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-foreground text-sm truncate">
                                    {req.mosque?.name 
                                      ? (req.mosque.name.startsWith("مسجد") ? `طلب ${req.mosque.name}` : `طلب مسجد ${req.mosque.name}`)
                                      : (req.descriptiveName || `طلب ${req.requester?.name || req.requestNumber}`)}
                                  </p>
                                  {req.descriptiveName && req.mosque?.name && (
                                    <span className="text-2xs px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded border border-purple-200/60 font-medium">
                                      {req.descriptiveName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {progName} <span className="font-mono">({req.requestNumber})</span>
                                </p>
                              </div>
                            </div>
                            <div className="md:hidden shrink-0 text-left">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${severity.bg} ${severity.color}`}>
                                {severity.icon}
                                <span>متأخر {req.delayDays} يوم</span>
                              </span>
                            </div>
                          </div>

                          {/* Mosque (Desktop) */}
                          <div className="hidden md:flex items-center gap-2 min-w-0 text-right">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate" title={req.mosque?.name || "—"}>
                                {req.mosque?.name || "—"}
                              </p>
                              {req.mosque?.city && (
                                <p className="text-2xs text-muted-foreground truncate">{req.mosque.city}</p>
                              )}
                            </div>
                          </div>

                          {/* Stage & Responsible (Desktop) */}
                          <div className="hidden md:block min-w-0 text-right">
                            <Badge variant="outline" className="text-xs font-medium py-0.5">
                              {stageLabel}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {req.responsibleText}
                            </p>
                          </div>

                          {/* Duration vs Elapsed */}
                          <div className="hidden md:block min-w-0 text-right">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>المنقضي: <strong className="text-foreground">{req.elapsedDays}</strong> يوم</span>
                              <span>(الحد: {req.allowedDays} د)</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1.5">
                              <div 
                                className={`h-full ${req.severity === 'critical' ? 'bg-rose-500' : req.severity === 'medium' ? 'bg-orange-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, Math.round((req.elapsedDays / (req.allowedDays || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>

                          {/* Delay Status Badge (Desktop) */}
                          <div className="hidden md:block shrink-0 text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${severity.bg} ${severity.color}`}>
                              {severity.icon}
                              <span>متأخر {req.delayDays} يوماً</span>
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div 
                            className="flex items-center justify-end gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setAlertTarget({
                                        type: "request",
                                        id: req.id,
                                        title: `الطلب ${req.requestNumber}`,
                                      });
                                      setAlertCustomMessage(`تنبيه بخصوص تأخر الطلب ${req.requestNumber} بمقدار ${req.delayDays} يوم في مرحلة (${stageLabel}). يرجى اتخاذ الإجراء اللازم.`);
                                      setAlertModalOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg"
                                  >
                                    <Bell className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>إرسال تنبيه للمسؤول</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequestId(req.id);
                                      setDetailsModalOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted rounded-lg"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>معاينة سريعة</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <Link href={`/requests/${req.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs text-primary border-primary/20 hover:bg-primary/10 gap-1 rounded-lg"
                              >
                                <span>فتح</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
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
                              <span>المنقضي في المرحلة: <strong className="text-rose-600">{req.elapsedDays} يوم</strong></span>
                              <span>المسموح: {req.allowedDays} يوم</span>
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
                    جميع الطلبات النشطة تسير وفق المدد الزمنية المحددة.
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
                  <div className="hidden md:grid grid-cols-[auto_1.5fr_1.1fr_1.1fr_1.2fr_1fr_auto] gap-4 px-5 py-3.5 bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    <div className="w-8"></div>
                    <div className="text-right">طالب الخدمة</div>
                    <div className="text-right">الصفة والمدينة</div>
                    <div className="text-right">الهوية والجوال</div>
                    <div className="text-right">تاريخ التسجيل والمنقضي</div>
                    <div className="text-right">مستوى التأخير</div>
                    <div className="w-24 text-left pl-2">الإجراءات</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border">
                    {sortedBeneficiaries.map((ben) => {
                      const severity = SEVERITY_CONFIG[ben.severity];

                      return (
                        <div
                          key={ben.id}
                          className="grid grid-cols-1 md:grid-cols-[auto_1.5fr_1.1fr_1.1fr_1.2fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-colors items-center text-right"
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
                            <p className="font-mono text-foreground" dir="ltr">{ben.phone || "—"}</p>
                            <p className="font-mono text-muted-foreground mt-0.5">{ben.nationalId || "—"}</p>
                          </div>

                          {/* Registration Date & Elapsed */}
                          <div className="hidden md:block min-w-0 text-xs text-right">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>منذ: <strong className="text-foreground">{ben.elapsedDays}</strong> يوم</span>
                              <span>(المهلة: {ben.allowedDays} د)</span>
                            </div>
                            <p className="text-2xs text-muted-foreground mt-1">
                              سُجل في: {new Date(ben.createdAt).toLocaleDateString("ar-SA")}
                            </p>
                          </div>

                          {/* Delay Status Badge */}
                          <div className="hidden md:block shrink-0 text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${severity.bg} ${severity.color}`}>
                              {severity.icon}
                              <span>متأخر {ben.delayDays} يوماً</span>
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {ben.proofDocument && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={ben.proofDocument}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>عرض إثبات الصفة</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setAlertTarget({
                                        type: "beneficiary",
                                        id: ben.id,
                                        title: `المستفيد ${ben.name}`,
                                      });
                                      setAlertCustomMessage(`تنبيه بخصوص تأخر اعتماد تسجيل المستفيد ${ben.name} المسجل منذ ${ben.elapsedDays} يوماً.`);
                                      setAlertModalOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 rounded-lg"
                                  >
                                    <Bell className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>إرسال تذكير إداري</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <Link href="/requester-approvals">
                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs gradient-primary text-white gap-1 rounded-lg"
                              >
                                <span>مراجعة</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>

                          {/* Mobile View details */}
                          <div className="md:hidden flex flex-col gap-1.5 pt-2 border-t border-border/50 text-xs text-right">
                            <div className="flex items-center justify-between">
                              <span>الصفة: {REQUESTER_TYPE_LABELS[ben.requesterType || ""] || "طالب خدمة"}</span>
                              <span className="font-mono text-muted-foreground" dir="ltr">{ben.phone}</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>المنقضي منذ التسجيل: <strong className="text-rose-600">{ben.elapsedDays} يوم</strong></span>
                              <span>المهلة المحددة: {ben.allowedDays} يوم</span>
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
