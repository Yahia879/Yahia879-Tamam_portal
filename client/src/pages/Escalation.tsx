import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RequestDetailsModal } from "@/components/RequestDetailsModal";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Clock,
  Settings,
  CheckCircle2,
  Filter,
  Search,
  FileText,
  Users,
  Building2,
  MapPin,
  User,
  Phone,
  Calendar,
  RefreshCw,
  ExternalLink,
  Bell,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  List,
  Eye,
  Layers,
  Send,
  Loader2,
  FileCheck,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Info,
  Flame,
  Award,
  Zap,
} from "lucide-react";
import { STAGE_LABELS, PROGRAM_LABELS, PROGRAM_COLORS } from "@shared/constants";

// تسميات صفة طالب الخدمة
const REQUESTER_TYPE_LABELS: Record<string, string> = {
  imam: "إمام مسجد",
  muezzin: "مؤذن",
  donor: "متبرع",
  waqf_supervisor: "ناظر وقف",
  board_member: "عضو مجلس إدارة",
  other: "أخرى",
};

// ألوان شارات الخطورة
const SEVERITY_CONFIG = {
  warning: {
    label: "تأخير خفيف (1-3 أيام)",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  medium: {
    label: "تأخير متوسط (4-7 أيام)",
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
    pill: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border-orange-200",
    dot: "bg-orange-500",
    icon: AlertTriangle,
  },
  critical: {
    label: "تأخير حرج (> 7 أيام)",
    badge: "bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse",
    pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200",
    dot: "bg-rose-500",
    icon: Flame,
  },
};

export default function EscalationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("delayed-requests");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // الفلاتر
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | "warning" | "medium" | "critical">("all");
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
    stageCode: selectedStage !== "all" ? selectedStage : undefined,
    programType: selectedProgram !== "all" ? selectedProgram : undefined,
    severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
    search: searchQuery.trim() || undefined,
  });

  const { 
    data: delayedBeneficiaries, 
    isLoading: isLoadingBeneficiaries, 
    refetch: refetchBeneficiaries 
  } = trpc.escalation.getDelayedBeneficiaries.useQuery({
    severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
    search: searchQuery.trim() || undefined,
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
      <div className="space-y-6 pb-12" dir="rtl">
        {/* الهيدر والعنوان الرئيسي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-l from-slate-900 via-slate-800 to-teal-950 text-white p-6 rounded-2xl shadow-xl border border-slate-700/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-300">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">التصعيد الإداري</h1>
                  <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/40 text-xs px-2.5 py-0.5">
                    متابعة الـ SLA
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  رصد ومتابعة الطلبات المتأخرة حسب المراحل الزمنية واعتماد المستفيدين المعلقين
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRequests || isLoadingBeneficiaries ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenSettings}
              className="bg-teal-600 hover:bg-teal-500 text-white gap-2 shadow-md border border-teal-400/30 font-semibold"
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات مدد التصعيد (SLA)</span>
            </Button>
          </div>
        </div>

        {/* كروت المؤشرات السريعة (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* إجمالي المتأخرات */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي العناصر المصعدة</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.totalDelayedItems || 0)}
                  </h3>
                  <p className="text-2xs text-slate-500 mt-1">طلبات ومستفيدون تجاوزوا المهلة</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                  <AlertOctagon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الطلبات المتأخرة */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الطلبات المتأخرة</p>
                  <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.totalDelayedRequests || 0)}
                  </h3>
                  <p className="text-2xs text-slate-500 mt-1">موزعة على مراحل العمل</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المستفيدون المعلقون */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">مستفيدون معلقون</p>
                  <h3 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
                    {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.totalDelayedBeneficiaries || 0)}
                  </h3>
                  <p className="text-2xs text-slate-500 mt-1">
                    تجاوزوا مهلة {slaSettingsData?.beneficiarySLA?.durationDays || 3} أيام للقبول
                  </p>
                </div>
                <div className="p-3 bg-teal-100 dark:bg-teal-950/60 rounded-xl text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-900/50">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الحالات الحرجة */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">تأخير حرج (&gt; 7 أيام)</p>
                  <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.criticalEscalations || 0)}
                  </h3>
                  <p className="text-2xs text-rose-600 dark:text-rose-400 mt-1 font-medium">يتطلب تدخلاً إدارياً عاجلاً</p>
                </div>
                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                  <Flame className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات الرئيسية */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <TabsTrigger 
                value="delayed-requests" 
                className="gap-2 px-4 py-2 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs rounded-lg font-medium"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>الطلبات المتأخرة</span>
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.2">
                  {delayedRequests?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="delayed-beneficiaries" 
                className="gap-2 px-4 py-2 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs rounded-lg font-medium"
              >
                <Users className="w-4 h-4 text-teal-500" />
                <span>المستفيدون المعلقون</span>
                <Badge variant="secondary" className="bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs px-2 py-0.2">
                  {delayedBeneficiaries?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="sla-overview" 
                className="gap-2 px-4 py-2 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs rounded-lg font-medium"
              >
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span>خريطة المراحل والاختناقات</span>
              </TabsTrigger>
            </TabsList>

            {/* طريقة العرض (شبكة / جدول) عند عرض الطلبات */}
            {activeTab === "delayed-requests" && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-500"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`h-8 w-8 p-0 ${viewMode === "table" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-500"}`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* شريط البحث والفلترة المشترك */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* حقل البحث */}
                <div className="md:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder={activeTab === "delayed-beneficiaries" ? "بحث بالاسم، الجوال، الهوية، المدينة..." : "بحث برقم الطلب، اسم المسجد، طالب الخدمة..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 text-sm"
                  />
                </div>

                {/* فلتر المرحلة (للطلبات فقط) */}
                {activeTab === "delayed-requests" && (
                  <div className="md:col-span-3">
                    <Select value={selectedStage} onValueChange={setSelectedStage}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="جميع المراحل" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع المراحل ({delayedRequests?.length || 0})</SelectItem>
                        {slaSettingsData?.stages.map((stg) => {
                          const count = stats?.stageCounts?.[stg.stageCode] || 0;
                          return (
                            <SelectItem key={stg.stageCode} value={stg.stageCode}>
                              {stg.stageName} {count > 0 ? `(${count})` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* فلتر البرنامج (للطلبات فقط) */}
                {activeTab === "delayed-requests" && (
                  <div className="md:col-span-2">
                    <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="جميع البرامج" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع البرامج</SelectItem>
                        {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* فلتر مستوى الخطورة */}
                <div className={activeTab === "delayed-requests" ? "md:col-span-2" : "md:col-span-4"}>
                  <Select value={selectedSeverity} onValueChange={(val: any) => setSelectedSeverity(val)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="مستوى التأخير" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كل مستويات التأخير</SelectItem>
                      <SelectItem value="warning">تأخير خفيف (1-3 أيام)</SelectItem>
                      <SelectItem value="medium">تأخير متوسط (4-7 أيام)</SelectItem>
                      <SelectItem value="critical">تأخير حرج (&gt; 7 أيام)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* الترتيب */}
                <div className={activeTab === "delayed-requests" ? "md:col-span-1" : "md:col-span-4"}>
                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="الترتيب" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="delay_desc">الأكثر تأخيراً</SelectItem>
                      <SelectItem value="delay_asc">الأقل تأخيراً</SelectItem>
                      <SelectItem value="created_desc">الأحدث تقديماً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* أشرطة المراحل السريعة (Pills) */}
              {activeTab === "delayed-requests" && slaSettingsData && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 font-medium ml-1">المراحل:</span>
                  <button
                    onClick={() => setSelectedStage("all")}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedStage === "all"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    الكل ({delayedRequests?.length || 0})
                  </button>
                  {slaSettingsData.stages.map((stg) => {
                    const count = stats?.stageCounts?.[stg.stageCode] || 0;
                    if (count === 0 && selectedStage !== stg.stageCode) return null;
                    return (
                      <button
                        key={stg.stageCode}
                        onClick={() => setSelectedStage(stg.stageCode)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                          selectedStage === stg.stageCode
                            ? "bg-teal-700 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span>{stg.stageName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-2xs ${selectedStage === stg.stageCode ? "bg-teal-900 text-teal-100" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* تبويب 1: الطلبات المتأخرة */}
          <TabsContent value="delayed-requests" className="space-y-4">
            {isLoadingRequests ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                <p className="text-sm text-slate-500 font-medium">جاري فحص مدد الطلبات وحساب التأخيرات...</p>
              </div>
            ) : sortedRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد طلبات متأخرة حالياً</h3>
                <p className="text-sm text-slate-500 max-w-md mt-1">
                  جميع الطلبات النشطة ضمن المدد المحددة في معايير مستوى الخدمة (SLA). يمكنك تعديل مدد المراحل من زر الإعدادات أعلاه.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              /* عرض البطاقات (Grid View) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedRequests.map((req) => {
                  const severityConfig = SEVERITY_CONFIG[req.severity];
                  const progColor = req.programType && PROGRAM_COLORS[req.programType] ? PROGRAM_COLORS[req.programType] : "#0891b2";
                  const stageLabel = STAGE_LABELS[req.currentStage] || req.currentStage;

                  return (
                    <Card 
                      key={req.id} 
                      className="border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {/* الهيدر العلوي للبطاقة */}
                        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white hover:text-teal-600 cursor-pointer" onClick={() => { setSelectedRequestId(req.id); setDetailsModalOpen(true); }}>
                                {req.requestNumber}
                              </span>
                              {req.programType && (
                                <Badge 
                                  variant="outline" 
                                  className="text-2xs font-semibold px-2 py-0.5 border"
                                  style={{ color: progColor, borderColor: `${progColor}40`, backgroundColor: `${progColor}10` }}
                                >
                                  {PROGRAM_LABELS[req.programType] || req.programType}
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
                              {req.mosque?.name || req.descriptiveName || "مسجد بدون اسم"}
                            </h4>
                          </div>

                          {/* شارة التأخير */}
                          <Badge className={`${severityConfig.badge} text-xs font-bold shrink-0 flex items-center gap-1`}>
                            <severityConfig.icon className="w-3.5 h-3.5" />
                            <span>متأخر {req.delayDays} يوم</span>
                          </Badge>
                        </div>

                        {/* محتوى البطاقة */}
                        <div className="p-4 space-y-3">
                          {/* المرحلة الحالية */}
                          <div className="flex items-center justify-between text-xs bg-slate-100/70 dark:bg-slate-800/70 p-2 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400">المرحلة الحالية:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{stageLabel}</span>
                          </div>

                          {/* معلومات المدة والـ SLA */}
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                              <span>المدة المحددة للمرحلة (SLA):</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{req.allowedDays} أيام</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                              <span>المدة المنقضية في المرحلة:</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">{req.elapsedDays} يوماً</span>
                            </div>
                            {/* شريط تقدم المدة */}
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${req.severity === 'critical' ? 'bg-rose-500' : req.severity === 'medium' ? 'bg-orange-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, Math.round((req.elapsedDays / (req.allowedDays || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>

                          {/* المسؤول وطالب الخدمة */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{req.mosque?.city ? `${req.mosque.city} - ${req.mosque.district || ''}` : 'المدينة غير محددة'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">المسؤول: <strong className="text-slate-800 dark:text-slate-200">{req.responsibleText}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* أزرار الإجراءات السريعة */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAlertTarget({
                              type: "request",
                              id: req.id,
                              title: `الطلب ${req.requestNumber} - مرحلة ${stageLabel}`,
                            });
                            setAlertCustomMessage(`تنبيه بخصوص تأخر الطلب ${req.requestNumber} بمقدار ${req.delayDays} يوم في مرحلة (${stageLabel}). يرجى المتابعة والإنجاز.`);
                            setAlertModalOpen(true);
                          }}
                          className="text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 gap-1.5 h-8 px-2.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>تنبيه المسؤول</span>
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequestId(req.id);
                              setDetailsModalOpen(true);
                            }}
                            className="text-xs h-8 px-2.5 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة</span>
                          </Button>

                          <Link href={`/requests/${req.id}`}>
                            <Button
                              size="sm"
                              className="text-xs h-8 px-3 bg-teal-700 hover:bg-teal-600 text-white gap-1"
                            >
                              <span>فتح الطلب</span>
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* عرض الجدول (Table View) */
              <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50">
                      <TableHead className="text-right font-bold text-xs">رقم الطلب</TableHead>
                      <TableHead className="text-right font-bold text-xs">المسجد والمدينة</TableHead>
                      <TableHead className="text-right font-bold text-xs">البرنامج</TableHead>
                      <TableHead className="text-right font-bold text-xs">المرحلة الحالية</TableHead>
                      <TableHead className="text-right font-bold text-xs">المسؤول الحالي</TableHead>
                      <TableHead className="text-right font-bold text-xs">مدة المرحلة / المنقضي</TableHead>
                      <TableHead className="text-right font-bold text-xs">مقدار التأخير</TableHead>
                      <TableHead className="text-center font-bold text-xs">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRequests.map((req) => {
                      const severityConfig = SEVERITY_CONFIG[req.severity];
                      const progColor = req.programType && PROGRAM_COLORS[req.programType] ? PROGRAM_COLORS[req.programType] : "#0891b2";
                      const stageLabel = STAGE_LABELS[req.currentStage] || req.currentStage;

                      return (
                        <TableRow key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <TableCell className="font-mono font-bold text-xs">
                            <span 
                              className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                              onClick={() => { setSelectedRequestId(req.id); setDetailsModalOpen(true); }}
                            >
                              {req.requestNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{req.mosque?.name || req.descriptiveName || "—"}</p>
                              <p className="text-2xs text-slate-400">{req.mosque?.city || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {req.programType && (
                              <Badge 
                                variant="outline" 
                                className="text-2xs px-2 py-0.5"
                                style={{ color: progColor, borderColor: `${progColor}40`, backgroundColor: `${progColor}10` }}
                              >
                                {PROGRAM_LABELS[req.programType] || req.programType}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {stageLabel}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {req.responsibleText}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-slate-900 dark:text-white">{req.elapsedDays}</span>
                            <span className="text-slate-400"> / {req.allowedDays} يوم</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${severityConfig.badge} text-xs font-bold`}>
                              متأخر {req.delayDays} يوم
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
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
                                        setAlertCustomMessage(`تنبيه بخصوص تأخر الطلب ${req.requestNumber} في مرحلة (${stageLabel}).`);
                                        setAlertModalOpen(true);
                                      }}
                                      className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
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
                                      className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
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
                                  className="h-8 px-2.5 text-xs text-teal-700 border-teal-300 hover:bg-teal-50"
                                >
                                  <span>فتح</span>
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* تبويب 2: المستفيدون المعلقون */}
          <TabsContent value="delayed-beneficiaries" className="space-y-4">
            {isLoadingBeneficiaries ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                <p className="text-sm text-slate-500 font-medium">جاري فحص طلبات تسجيل المستفيدين...</p>
              </div>
            ) : sortedBeneficiaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا يوجد مستفيدون معلقون متأخرون</h3>
                <p className="text-sm text-slate-500 max-w-md mt-1">
                  جميع طلبات تسجيل طالبي الخدمة الجدد تمت مراجعتها ضمن المهلة المحددة ({slaSettingsData?.beneficiarySLA?.durationDays || 3} أيام).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedBeneficiaries.map((ben) => {
                  const severityConfig = SEVERITY_CONFIG[ben.severity];

                  return (
                    <Card key={ben.id} className="border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        {/* الهيدر */}
                        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-4 h-4 text-teal-600" />
                              <span>{ben.name}</span>
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-2xs bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300">
                                {REQUESTER_TYPE_LABELS[ben.requesterType || ''] || ben.requesterType || 'طالب خدمة'}
                              </Badge>
                              {ben.city && (
                                <span className="text-2xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {ben.city}
                                </span>
                              )}
                            </div>
                          </div>

                          <Badge className={`${severityConfig.badge} text-xs font-bold shrink-0`}>
                            متأخر {ben.delayDays} يوم
                          </Badge>
                        </div>

                        {/* المحتوى */}
                        <div className="p-4 space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                            <div>
                              <span className="text-2xs text-slate-400 block">رقم الجوال:</span>
                              <span className="font-mono font-medium text-slate-900 dark:text-slate-200" dir="ltr">{ben.phone || '—'}</span>
                            </div>
                            <div>
                              <span className="text-2xs text-slate-400 block">رقم الهوية:</span>
                              <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{ben.nationalId || '—'}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                              <span>تاريخ التسجيل:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(ben.createdAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                              <span>المهلة المحددة للقبول:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{ben.allowedDays} أيام</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                              <span>المنقضي منذ التسجيل:</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">{ben.elapsedDays} يوماً</span>
                            </div>
                          </div>

                          {/* إثبات الصفة */}
                          {ben.proofDocument && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-slate-500">مستند إثبات الصفة:</span>
                              <a
                                href={ben.proofDocument}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>عرض المستند</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* أزرار الإجراء */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAlertTarget({
                              type: "beneficiary",
                              id: ben.id,
                              title: `المستفيد ${ben.name}`,
                            });
                            setAlertCustomMessage(`تنبيه بخصوص تأخر مراجعة واعتماد المستفيد ${ben.name} المسجل منذ ${ben.elapsedDays} يوماً.`);
                            setAlertModalOpen(true);
                          }}
                          className="text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 h-8 px-2.5 gap-1.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>تنبيه الإدارة</span>
                        </Button>

                        <Link href="/requester-approvals">
                          <Button size="sm" className="text-xs h-8 px-3 bg-teal-700 hover:bg-teal-600 text-white gap-1">
                            <span>مراجعة واعتماد</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* تبويب 3: خريطة المراحل والاختناقات */}
          <TabsContent value="sla-overview" className="space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  <span>توزيع التأخيرات ونقاط الاختناق عبر مراحل العمل (SLA Bottlenecks)</span>
                </CardTitle>
                <CardDescription>
                  رصد المراحل التي تشهد أعلى معدلات تأخير مقارنة بالمدد الزمنية المعتمدة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {slaSettingsData?.stages.map((stg) => {
                    const delayedCount = stats?.stageCounts?.[stg.stageCode] || 0;
                    const maxCount = Math.max(...Object.values(stats?.stageCounts || { a: 1 }));
                    const percentage = maxCount > 0 ? Math.round((delayedCount / maxCount) * 100) : 0;

                    return (
                      <div key={stg.stageCode} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-2xs">
                              {stg.stageOrder}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{stg.stageName}</span>
                            <span className="text-slate-400">({stg.durationDays} أيام مسموحة)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {delayedCount > 0 ? (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold">
                                {delayedCount} طلب متأخر
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium">
                                لا يوجد تأخير
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* شريط بياني */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${delayedCount > 5 ? 'bg-rose-500' : delayedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(delayedCount > 0 ? 8 : 0, percentage)}%` }}
                          />
                        </div>

                        <p className="text-2xs text-slate-500">{stg.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* نافذة ضبط مدد التصعيد (SLA Settings Modal) */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Settings className="w-5 h-5 text-teal-600" />
                <span>إعدادات مدد المراحل والتصعيد الإداري (SLA Configuration)</span>
              </DialogTitle>
              <DialogDescription>
                حدد عدد الأيام المسموحة لكل مرحلة قبل أن يُعتبر الطلب متأخراً ويظهر في قائمة التصعيد الإداري، بالإضافة لمهلة قبول المستفيدين.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* قسم 1: مهلة قبول المستفيدين */}
              <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                    <div>
                      <h4 className="text-sm font-bold text-teal-900 dark:text-teal-200">مهلة قبول تسجيل المستفيدين الجدد</h4>
                      <p className="text-xs text-teal-700 dark:text-teal-400">
                        المدة المسموحة لمراجعة واعتماد طلب تسجيل المستفيد قبل تصعيده
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={draftBeneficiaryDays}
                      onChange={(e) => setDraftBeneficiaryDays(parseInt(e.target.value) || 1)}
                      className="w-20 text-center font-bold bg-white dark:bg-slate-900"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">أيام</span>
                  </div>
                </div>
              </div>

              {/* قسم 2: مدد مراحل الطلبات */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>مدد مراحل الطلبات (عدد الأيام لكل مرحلة):</span>
                  </h4>
                  <span className="text-xs text-slate-500">10 مراحل رئيسية</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {draftStages.map((stg, index) => (
                    <div key={stg.stageCode} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{stg.stageName}</h5>
                          <p className="text-2xs text-slate-500 line-clamp-1">{stg.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={180}
                          value={stg.durationDays}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setDraftStages(prev => prev.map((item, idx) => idx === index ? { ...item, durationDays: val } : item));
                          }}
                          className="w-18 text-center font-bold text-sm h-8"
                        />
                        <span className="text-xs text-slate-500 w-8">يوم</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("هل أنت متأكد من استعادة مدد المراحل الافتراضية؟")) {
                    resetSettingsMutation.mutate();
                  }
                }}
                disabled={resetSettingsMutation.isPending}
                className="text-xs text-slate-600 dark:text-slate-400 gap-1.5"
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
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات</span>
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
                className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
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
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 gap-1.5"
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
