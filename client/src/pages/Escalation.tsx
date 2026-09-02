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
  DialogDescription,
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
  AlertCircle,
  Clock,
  Settings,
  CheckCircle,
  Filter,
  Search,
  FileText,
  Users,
  Building2,
  User,
  Phone,
  Calendar,
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
  ChevronRight,
  TrendingUp,
  BarChart3,
  Flame,
  Plus,
  Minus,
  Sparkles,
  Zap,
  MapPin,
  Tag,
  StickyNote,
} from "lucide-react";
import { STAGE_LABELS, PROGRAM_LABELS, PROGRAM_COLORS, getStageLabel } from "@shared/constants";

// تسميات صفة طالب الخدمة
const REQUESTER_TYPE_LABELS: Record<string, string> = {
  imam: "إمام مسجد",
  muezzin: "مؤذن",
  donor: "متبرع",
  waqf_supervisor: "ناظر وقف",
  board_member: "عضو مجلس إدارة",
  other: "أخرى",
};

// ألوان شارات الخطورة المتوافقة تماماً مع ثيم الموقع
const SEVERITY_CONFIG = {
  warning: {
    label: "تأخير خفيف (1-3 أيام)",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    color: "text-amber-700 dark:text-amber-400",
    icon: <Clock className="w-3 h-3" />,
  },
  medium: {
    label: "تأخير متوسط (4-7 أيام)",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    color: "text-orange-700 dark:text-orange-400",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  critical: {
    label: "تأخير حرج (> 7 أيام)",
    bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    color: "text-rose-700 dark:text-rose-400",
    icon: <Flame className="w-3 h-3 text-rose-600 animate-pulse" />,
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
    isLoading: isLoadingSettings, 
    refetch: refetchSettings 
  } = trpc.escalation.getSettings.useQuery();

  // تعديل الإعدادات محلياً قبل الحفظ
  const [draftStages, setDraftStages] = useState<Array<{ stageCode: string; stageName: string; durationDays: number; warningDays?: number; description?: string }>>([]);
  const [draftBeneficiaryDays, setDraftBeneficiaryDays] = useState<number>(3);

  // تحديث الإعدادات
  const updateSettingsMutation = trpc.escalation.updateSettings.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ الإعدادات بنجاح");
      setSettingsOpen(false);
      refetchSettings();
      refetchStats();
      refetchRequests();
      refetchBeneficiaries();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  // استعادة الافتراضي
  const resetSettingsMutation = trpc.escalation.resetSettings.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تمت استعادة الإعدادات الافتراضية");
      setSettingsOpen(false);
      refetchSettings();
      refetchStats();
      refetchRequests();
      refetchBeneficiaries();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الاستعادة");
    },
  });

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

  // فتح نافذة الإعدادات
  const handleOpenSettings = () => {
    if (slaSettingsData) {
      setDraftStages(slaSettingsData.stages.map(s => ({
        stageCode: s.stageCode,
        stageName: s.stageName,
        durationDays: s.durationDays,
        warningDays: s.warningDays,
        description: s.description,
      })));
      setDraftBeneficiaryDays(slaSettingsData.beneficiarySLA.durationDays);
    }
    setSettingsOpen(true);
  };

  // حفظ الإعدادات
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      stages: draftStages,
      beneficiaryDays: draftBeneficiaryDays,
    });
  };

  // إعادة تحميل جميع البيانات
  const handleRefreshAll = () => {
    refetchStats();
    refetchRequests();
    refetchBeneficiaries();
    refetchSettings();
    toast.info("تم تحديث بيانات التصعيد الإداري");
  };

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
      <div className="space-y-6 max-w-full overflow-x-hidden" dir="rtl">
        {/* Header - متطابق تماماً مع هيدر صفحة الطلبات Requests.tsx */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                التصعيد الإداري
              </h1>
              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs px-2.5 py-0.5">
                متابعة الـ SLA
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">
              عرض ومتابعة الطلبات المتأخرة حسب المراحل الزمنية واعتماد المستفيدين المعلقين
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="h-10 gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRequests || isLoadingBeneficiaries ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>

            <Button
              onClick={handleOpenSettings}
              className="gradient-primary text-white gap-2 h-10 shadow-xs font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>تخصيص مدد التصعيد (SLA)</span>
            </Button>
          </div>
        </div>

        {/* Stats Row - متطابق مع بطاقات الإحصائيات في Requests.tsx */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              label: "إجمالي العناصر المصعدة",
              value: stats?.totalDelayedItems || 0,
              icon: <FileText className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-primary/10 text-primary",
              subtitle: "طلبات ومستفيدون",
            },
            {
              label: "الطلبات المتأخرة",
              value: stats?.totalDelayedRequests || 0,
              icon: <Clock className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
              subtitle: "حسب المراحل",
            },
            {
              label: "مستفيدون معلقون",
              value: stats?.totalDelayedBeneficiaries || 0,
              icon: <Users className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-teal-100 dark:bg-teal-950/40 text-teal-600",
              subtitle: `مهلة ${slaSettingsData?.beneficiarySLA?.durationDays || 3} أيام`,
            },
            {
              label: "تأخير حرج (> 7 أيام)",
              value: stats?.criticalEscalations || 0,
              icon: <Flame className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
              subtitle: "يتطلب تدخلاً عاجلاً",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-xs overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg md:text-xl font-bold text-foreground truncate">
                      {isLoadingStats ? <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" /> : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* التبويبات الرئيسية */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="border-b border-border pb-2">
            <TabsList className="bg-muted p-1 rounded-xl">
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
                <span>خريطة المراحل والاختناقات</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* شريط الفلاتر والبحث - متطابق مع Requests.tsx */}
          <Card className="border-0 shadow-xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                {/* البحث */}
                <div className="sm:col-span-2 relative">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    <span>البحث</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={activeTab === "delayed-beneficiaries" ? "البحث بالاسم، الجوال، الهوية، المدينة..." : "رقم الطلب أو اسم المسجد أو طالب الخدمة..."}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 w-full pr-10 text-xs md:text-sm"
                    />
                  </div>
                </div>

                {/* الفلاتر المنسدلة */}
                <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                  {activeTab === "delayed-requests" ? (
                    <>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">البرنامج</label>
                        <Select value={programFilter} onValueChange={setProgramFilter}>
                          <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                            <SelectValue placeholder="البرنامج" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all">جميع البرامج</SelectItem>
                            {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">المرحلة</label>
                        <Select value={stageFilter} onValueChange={setStageFilter}>
                          <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                            <SelectValue placeholder="المرحلة" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all">جميع المراحل</SelectItem>
                            {slaSettingsData?.stages.map((stg) => (
                              <SelectItem key={stg.stageCode} value={stg.stageCode}>
                                {stg.stageName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">مستوى التأخير</label>
                        <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)}>
                          <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                            <SelectValue placeholder="مستوى التأخير" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all">كل المستويات</SelectItem>
                            <SelectItem value="warning">تأخير خفيف (1-3 أيام)</SelectItem>
                            <SelectItem value="medium">تأخير متوسط (4-7 أيام)</SelectItem>
                            <SelectItem value="critical">تأخير حرج (&gt; 7 أيام)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* أشرطة المراحل السريعة (Pills) */}
              {activeTab === "delayed-requests" && slaSettingsData && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground font-medium ml-1">تصفية المراحل:</span>
                  <button
                    onClick={() => setStageFilter("all")}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      stageFilter === "all"
                        ? "bg-foreground text-background shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    الكل ({delayedRequests?.length || 0})
                  </button>
                  {slaSettingsData.stages.map((stg) => {
                    const count = stats?.stageCounts?.[stg.stageCode] || 0;
                    if (count === 0 && stageFilter !== stg.stageCode) return null;
                    return (
                      <button
                        key={stg.stageCode}
                        onClick={() => setStageFilter(stg.stageCode)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                          stageFilter === stg.stageCode
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        <span>{stg.stageName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-2xs ${stageFilter === stg.stageCode ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* تبويب 1: قائمة الطلبات المتأخرة - مطابقة لتصميم جدول/صفوف /requests */}
          <TabsContent value="delayed-requests" className="space-y-4">
            <Card className="border-0 shadow-xs overflow-hidden">
              {isLoadingRequests ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-4 text-sm">جاري جلب الطلبات المتأخرة وحساب مدد الـ SLA...</p>
                </div>
              ) : sortedRequests.length > 0 ? (
                <div>
                  {/* Table Header (Desktop Only) - نفس تقسيم وأبعاد /requests */}
                  <div className="hidden md:grid grid-cols-[auto_1.4fr_1.1fr_1.1fr_1.2fr_1.1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="w-8"></div>
                    <div>الطلب</div>
                    <div>المسجد</div>
                    <div>المرحلة والمسؤول</div>
                    <div>مدة المرحلة / المنقضي</div>
                    <div>مستوى التأخير</div>
                    <div className="w-24 text-center">الإجراءات</div>
                  </div>

                  {/* صفوف الطلبات - نفس التصميم التفاعلي في /requests */}
                  <div className="divide-y divide-border">
                    {sortedRequests.map((req) => {
                      const severity = SEVERITY_CONFIG[req.severity];
                      const stageLabel = STAGE_LABELS[req.currentStage] || req.currentStage;
                      const progName = req.programType ? PROGRAM_LABELS[req.programType] || req.programType : "";

                      return (
                        <div
                          key={req.id}
                          className="grid grid-cols-1 md:grid-cols-[auto_1.4fr_1.1fr_1.1fr_1.2fr_1.1fr_auto] gap-3 md:gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center cursor-pointer"
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
                                <p className="font-bold text-foreground text-sm truncate">
                                  {req.mosque?.name 
                                    ? (req.mosque.name.startsWith("مسجد") ? `طلب ${req.mosque.name}` : `طلب مسجد ${req.mosque.name}`)
                                    : (req.descriptiveName || `طلب ${req.requester?.name || req.requestNumber}`)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {progName} <span className="font-mono">({req.requestNumber})</span>
                                </p>
                              </div>
                            </div>
                            <div className="md:hidden shrink-0 text-left">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${severity.bg} ${severity.color}`}>
                                {severity.icon}
                                <span>متأخر {req.delayDays} يوم</span>
                              </span>
                            </div>
                          </div>

                          {/* Mosque (Desktop) */}
                          <div className="hidden md:flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate" title={req.mosque?.name || "—"}>
                              {req.mosque?.name || "—"}
                            </span>
                          </div>

                          {/* Stage & Responsible (Desktop) */}
                          <div className="hidden md:block min-w-0">
                            <Badge variant="outline" className="text-[10px] md:text-xs font-medium py-0 h-auto">
                              {stageLabel}
                            </Badge>
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">
                              {req.responsibleText}
                            </p>
                          </div>

                          {/* Duration vs Elapsed */}
                          <div className="hidden md:block min-w-0">
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
                          <div className="hidden md:block shrink-0">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full border ${severity.bg} ${severity.color}`}>
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
                                    className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50"
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
                                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
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
                                className="h-8 px-2.5 text-xs text-primary border-primary/20 hover:bg-primary/10 gap-1"
                              >
                                <span>فتح</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>

                          {/* Mobile Detailed View */}
                          <div className="md:hidden flex flex-col gap-2 pt-1 border-t border-border/50 text-xs">
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
                    جميع الطلبات النشطة تسير وفق المدد الزمنية المحددة في معايير مستوى الخدمة (SLA).
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
                  <p className="text-muted-foreground mt-4 text-sm">جاري مراجعة طالبي الخدمة الجدد...</p>
                </div>
              ) : sortedBeneficiaries.length > 0 ? (
                <div>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-[auto_1.5fr_1.1fr_1.1fr_1.2fr_1.1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="w-8"></div>
                    <div>طالب الخدمة</div>
                    <div>الصفة والمدينة</div>
                    <div>الهوية والجوال</div>
                    <div>تاريخ التسجيل والمنقضي</div>
                    <div>مستوى التأخير</div>
                    <div className="w-24 text-center">الإجراءات</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border">
                    {sortedBeneficiaries.map((ben) => {
                      const severity = SEVERITY_CONFIG[ben.severity];

                      return (
                        <div
                          key={ben.id}
                          className="grid grid-cols-1 md:grid-cols-[auto_1.5fr_1.1fr_1.1fr_1.2fr_1.1fr_auto] gap-3 md:gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center"
                        >
                          {/* User Avatar */}
                          <div className="hidden md:flex w-8 justify-center shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
                              <User className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Beneficiary Name */}
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{ben.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{ben.email || "بدون بريد"}</p>
                          </div>

                          {/* Role & City */}
                          <div className="hidden md:block min-w-0">
                            <Badge variant="outline" className="text-2xs bg-teal-50/50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200">
                              {REQUESTER_TYPE_LABELS[ben.requesterType || ""] || ben.requesterType || "طالب خدمة"}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{ben.city || "—"}</p>
                          </div>

                          {/* Contacts */}
                          <div className="hidden md:block min-w-0 text-xs">
                            <p className="font-mono text-foreground" dir="ltr">{ben.phone || "—"}</p>
                            <p className="font-mono text-muted-foreground mt-0.5">{ben.nationalId || "—"}</p>
                          </div>

                          {/* Registration Date & Elapsed */}
                          <div className="hidden md:block min-w-0 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>منذ: <strong className="text-foreground">{ben.elapsedDays}</strong> يوم</span>
                              <span>(المهلة: {ben.allowedDays} د)</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              سُجل في: {new Date(ben.createdAt).toLocaleDateString("ar-SA")}
                            </p>
                          </div>

                          {/* Delay Status Badge */}
                          <div className="hidden md:block shrink-0">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full border ${severity.bg} ${severity.color}`}>
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
                                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
                                    className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
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
                                className="h-8 px-3 text-xs gradient-primary text-white gap-1"
                              >
                                <span>مراجعة</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>

                          {/* Mobile View details */}
                          <div className="md:hidden flex flex-col gap-1.5 pt-1 border-t border-border/50 text-xs">
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
                    جميع طلبات تسجيل المستفيدين الجدد تمت مراجعتها ضمن المهلة المحددة ({slaSettingsData?.beneficiarySLA?.durationDays || 3} أيام).
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* تبويب 3: خريطة المراحل والاختناقات */}
          <TabsContent value="sla-overview" className="space-y-4">
            <Card className="border-0 shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span>تحليل نقاط الاختناق في مراحل الطلبات (SLA Bottlenecks)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    يوضح المخطط أدناه عدد الطلبات المتأخرة في كل مرحلة مقارنة بالمدة الزمنية المعتمدة
                  </p>
                </div>

                <div className="space-y-3">
                  {slaSettingsData?.stages.map((stg) => {
                    const delayedCount = stats?.stageCounts?.[stg.stageCode] || 0;
                    const maxCount = Math.max(...Object.values(stats?.stageCounts || { a: 1 }), 1);
                    const percentage = Math.round((delayedCount / maxCount) * 100);

                    return (
                      <div key={stg.stageCode} className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-2xs">
                              {stg.stageOrder}
                            </span>
                            <span className="font-bold text-foreground">{stg.stageName}</span>
                            <span className="text-muted-foreground">({stg.durationDays} أيام كحد أقصى)</span>
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

                        <p className="text-2xs text-muted-foreground">{stg.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========================================================================= */}
        {/* نافذة تخصيص الوقت الكبيرة والواضحة (Large & Polished SLA Settings Dialog) */}
        {/* ========================================================================= */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    تخصيص مدد التصعيد الإداري ومستويات الخدمة (SLA)
                  </DialogTitle>
                  <DialogDescription className="text-xs md:text-sm text-muted-foreground mt-1">
                    حدد عدد الأيام المسموحة لكل مرحلة قبل أن يُعتبر الطلب متأخراً، بالإضافة إلى مهلة قبول تسجيل المستفيدين الجدد.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* قسم 1: مهلة قبول المستفيدين الجدد (بطاقة بارزة وواضحة) */}
              <div className="p-5 bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl mt-0.5">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-bold text-teal-950 dark:text-teal-100">
                        مهلة مراجعة واعتماد طلبات تسجيل المستفيدين
                      </h4>
                      <p className="text-xs text-teal-700 dark:text-teal-300 mt-1 max-w-xl leading-relaxed">
                        يظهر المستفيد تلقائياً في قائمة المتأخرين إذا تجاوزت مدة تسجيله هذه المهلة دون اتخاذ قرار بقبوله من قبل إدارة المستفيدين.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-background p-1.5 rounded-xl border border-teal-300/60 dark:border-teal-700 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftBeneficiaryDays(prev => Math.max(1, prev - 1))}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={draftBeneficiaryDays}
                      onChange={(e) => setDraftBeneficiaryDays(parseInt(e.target.value) || 1)}
                      className="w-16 text-center font-bold text-base h-8 border-0 shadow-none focus-visible:ring-0 p-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftBeneficiaryDays(prev => Math.min(60, prev + 1))}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200 px-2">أيام</span>
                  </div>
                </div>
              </div>

              {/* قسم 2: مدد مراحل الطلبات العشر (Grid بتصميم أنيق ومنسق) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>المدد الزمنية المسموحة لمراحل الطلبات (SLA):</span>
                  </h4>
                  <span className="text-xs text-muted-foreground font-medium">10 مراحل عمل معتمدة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {draftStages.map((stg, index) => (
                    <div 
                      key={stg.stageCode} 
                      className="p-4 bg-muted/30 hover:bg-muted/60 transition-colors rounded-xl border border-border flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs md:text-sm font-bold text-foreground truncate">{stg.stageName}</h5>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{stg.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 bg-background p-1 rounded-lg border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDraftStages(prev => prev.map((item, idx) => 
                              idx === index ? { ...item, durationDays: Math.max(0, item.durationDays - 1) } : item
                            ));
                          }}
                          className="h-7 w-7 p-0 rounded hover:bg-muted"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>

                        <Input
                          type="number"
                          min={0}
                          max={180}
                          value={stg.durationDays}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setDraftStages(prev => prev.map((item, idx) => idx === index ? { ...item, durationDays: val } : item));
                          }}
                          className="w-12 text-center font-bold text-xs h-7 border-0 shadow-none focus-visible:ring-0 p-0"
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDraftStages(prev => prev.map((item, idx) => 
                              idx === index ? { ...item, durationDays: Math.min(180, item.durationDays + 1) } : item
                            ));
                          }}
                          className="h-7 w-7 p-0 rounded hover:bg-muted"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>

                        <span className="text-xs text-muted-foreground px-1">يوم</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("هل أنت متأكد من استعادة مدد المراحل الافتراضية؟")) {
                    resetSettingsMutation.mutate();
                  }
                }}
                disabled={resetSettingsMutation.isPending}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen(false)}
                  className="text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="gradient-primary text-white font-semibold text-xs px-5 h-9"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ وتطبيق التغييرات</span>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة إرسال تنبيه تصعيدي (Alert Modal) */}
        <Dialog open={alertModalOpen} onOpenChange={setAlertModalOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Bell className="w-5 h-5 text-amber-600" />
                <span>إرسال تنبيه تصعيد إداري</span>
              </DialogTitle>
              <DialogDescription>
                {alertTarget?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <Label className="text-xs font-semibold">نص التنبيه:</Label>
              <textarea
                value={alertCustomMessage}
                onChange={(e) => setAlertCustomMessage(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
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
                <span>إرسال التنبيه الآن</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة تفاصيل الطلب السريعة (RequestDetailsModal) */}
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
