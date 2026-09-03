import { useState, useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  HeartHandshake, 
  Star, 
  Search, 
  Calendar, 
  Building2, 
  MessageSquare, 
  Eye, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  X,
  FileText,
  Send,
  Mail,
  Phone,
  Clock,
  TrendingUp,
  User,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PROGRAM_LABELS } from "@shared/constants";

export default function BeneficiarySatisfaction({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("evaluations");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedEval, setSelectedEval] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // حالات بحث وفلترة سجلات الاستبيانات
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState<"all" | "pending" | "evaluated">("all");
  const [logProgramFilter, setLogProgramFilter] = useState<string>("all");
  const [logPage, setLogPage] = useState(1);
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);

  // استعلام سجلات إرسال الاستبيانات
  const { data: logsData, isLoading: isLoadingLogs, refetch: refetchLogs } = trpc.requests.getBeneficiarySurveyLogs.useQuery({
    search: logSearchQuery.trim() ? logSearchQuery.trim() : undefined,
    statusFilter: logStatusFilter,
    programType: logProgramFilter !== "all" ? logProgramFilter : undefined,
    page: logPage,
    limit: 15,
  });

  // طفرة إرسال البريد التذكيري للمستفيد
  const sendReminderMutation = trpc.requests.sendBeneficiarySurveyReminder.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم إرسال البريد التذكيري بنجاح");
      setSendingReminderId(null);
      refetchLogs();
    },
    onError: (err: any) => {
      toast.error(err.message || "فشل إرسال البريد التذكيري");
      setSendingReminderId(null);
    },
  });

  const handleSendReminder = (requestId: number) => {
    setSendingReminderId(requestId);
    sendReminderMutation.mutate({ requestId });
  };

  // تنسيق التاريخ بأرقام إنجليزية (0-9) دائماً YYYY-MM-DD
  const formatDateEn = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-CA"); // بصيغة 2026-09-03 بأرقام إنجليزية 0-9
  };

  // حالات العرض الفرعي في تبويب السجلات (استبيانات الطلبات المغلقة أو دليل المستفيدين والمتبرعين)
  const [logsSubView, setLogsSubView] = useState<"requests" | "contacts">("requests");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactCategoryFilter, setContactCategoryFilter] = useState<"all" | "approved_beneficiary" | "donor" | "inquiry">("all");
  const [contactPage, setContactPage] = useState(1);
  const [sendingSurveyKey, setSendingSurveyKey] = useState<string | null>(null);

  // حوار إرسال استبيان مخصص أو إدخال بريد
  const [isCustomSurveyOpen, setIsCustomSurveyOpen] = useState(false);
  const [customSurveyData, setCustomSurveyData] = useState<{
    name: string;
    email: string;
    phone: string;
    category: "approved_beneficiary" | "donor" | "inquiry" | "custom";
    userId?: number;
    customMessage: string;
  }>({
    name: "",
    email: "",
    phone: "",
    category: "approved_beneficiary",
    customMessage: "",
  });

  // استعلام جهات الاتصال (مستفيدون معتمدون، متبرعون، أصحاب استفسارات)
  const { data: contactsData, isLoading: isLoadingContacts, refetch: refetchContacts } = trpc.requests.getApprovedBeneficiariesAndContacts.useQuery({
    search: contactSearchQuery.trim() ? contactSearchQuery.trim() : undefined,
    category: contactCategoryFilter,
    page: contactPage,
    limit: 15,
  });

  // طفرة إرسال استبيان رضا عام
  const sendGeneralSurveyMutation = trpc.requests.sendGeneralSatisfactionSurvey.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم إرسال الاستبيان بنجاح");
      setSendingSurveyKey(null);
      setIsCustomSurveyOpen(false);
      refetchContacts();
    },
    onError: (err: any) => {
      toast.error(err.message || "فشل إرسال الاستبيان");
      setSendingSurveyKey(null);
    },
  });

  const handleSendGeneralSurvey = (contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    category: "approved_beneficiary" | "donor" | "inquiry";
    userId?: number | null;
  }) => {
    if (!contact.email) {
      setCustomSurveyData({
        name: contact.name,
        email: "",
        phone: contact.phone || "",
        category: contact.category,
        userId: contact.userId || undefined,
        customMessage: "",
      });
      setIsCustomSurveyOpen(true);
      return;
    }

    setSendingSurveyKey(contact.id);
    sendGeneralSurveyMutation.mutate({
      recipientEmail: contact.email,
      recipientName: contact.name,
      recipientPhone: contact.phone || undefined,
      category: contact.category,
      userId: contact.userId || undefined,
    });
  };

  // استرجاع كافة التقييمات المسجلة والبرامج وتخصيص الاستمارة ديناميكياً مع ربط البحث والفلترة من الباك إند
  const ratingFilterVal = selectedRating !== "all" ? parseInt(selectedRating, 10) : undefined;
  const programFilterVal = selectedProgram !== "all" ? selectedProgram : undefined;

  const { data, isLoading } = trpc.requests.getAllBeneficiaryEvaluations.useQuery({
    search: searchQuery.trim() ? searchQuery.trim() : undefined,
    ratingFilter: ratingFilterVal,
    programType: programFilterVal,
  });
  const { data: evalFormConfig } = trpc.forms.getEvaluationFormConfig.useQuery();
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const { data: allPrograms = [] } = trpc.programs.getAll.useQuery();

  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';

  // خريطة البرامج لجلب أسماء الخدمات ديناميكياً
  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    allPrograms.forEach((p: any) => {
      map.set(p.code || String(p.id), p.nameAr || p.name);
      if (p.code) map.set(p.code.toLowerCase(), p.nameAr || p.name);
    });
    return map;
  }, [allPrograms]);

  const getArabicLabel = (type?: string | null) => {
    if (!type) return "طلب خدمة";
    const str = String(type).trim();
    const lower = str.toLowerCase();
    if (programMap.has(type)) return programMap.get(type)!;
    if (programMap.has(lower)) return programMap.get(lower)!;
    if (PROGRAM_LABELS[lower]) return PROGRAM_LABELS[lower];
    if (PROGRAM_LABELS[type]) return PROGRAM_LABELS[type];
    const hardcoded: Record<string, string> = {
      bunyan: "بنيان",
      daaem: "دعائم",
      enaya: "عناية",
      emdad: "إمداد",
      ethraa: "إثراء",
      sedana: "سدانة",
      taqa: "طاقة",
      miyah: "مياه",
      suqya: "سقيا",
      kasswa: "كسوة",
      tathir: "تطهير",
      sakina: "سكينة",
      fursh: "فرش",
    };
    if (hardcoded[lower]) return hardcoded[lower];
    return str;
  };

  const filteredItems = data?.items || [];
  const stats = data?.stats || {
    totalEvaluations: 0,
    avgRating: 0,
    positivePercent: 0,
    withCommentsCount: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const handleOpenDetails = (evalItem: any) => {
    setSelectedEval(evalItem);
    setIsDetailModalOpen(true);
  };

  const activeFields = useMemo(() => {
    if (!evalFormConfig?.fields) return [];
    return [...evalFormConfig.fields]
      .filter((f) => f.isActive)
      .sort((a, b) => a.order - b.order);
  }, [evalFormConfig]);

  const content = (
    <div className="space-y-6 pb-12" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                رضا المستفيدين
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                متابعة استبيانات قياس رضا المستفيدين، تقييمات الخدمات، والآراء والمقترحات الواردة
              </p>
            </div>
          </div>


        </div>

        {/* Tabs Control */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 mb-2">
            <TabsList dir="rtl" className="w-full sm:w-auto p-1 h-12 bg-muted/80 rounded-2xl border border-border/70 shadow-xs flex items-center justify-start gap-1">
              <TabsTrigger value="evaluations" className="gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl data-[state=active]:shadow-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                التقييمات والنتائج
                <Badge variant="secondary" className="mr-1 text-[11px] px-1.5 py-0 h-5 font-bold">
                  {stats.totalEvaluations}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl data-[state=active]:shadow-sm">
                <Send className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                السجلات (الاستبيانات المرسلة)
                <Badge variant="secondary" className="mr-1 text-[11px] px-1.5 py-0 h-5 font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                  {logsData?.stats.totalDispatched || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* تبويب 1: نتائج وتقييمات المستفيدين */}
          <TabsContent value="evaluations" className="space-y-6 mt-2" dir="rtl">
            {/* KPI Cards - ديناميكية بالكامل بناءً على بيانات الاستبيانات الحقيقية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* إجمالي التقييمات */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between text-right">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-semibold text-muted-foreground block text-right">إجمالي التقييمات</span>
                    <span className="text-2xl sm:text-3xl font-black text-foreground block text-right">
                      {stats.totalEvaluations}
                    </span>
                    <span className="text-[11px] text-muted-foreground block text-right">
                      استبيان مكتمل من المستفيدين
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* متوسط الرضا العام */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between text-right">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-semibold text-muted-foreground block text-right">متوسط الرضا العام</span>
                    <div className="flex items-baseline gap-1.5 justify-start">
                      <span className="text-2xl sm:text-3xl font-black text-amber-500">
                        {stats.avgRating > 0 ? stats.avgRating : "0.0"}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5 justify-start" dir="rtl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            stats.avgRating > 0 && s <= Math.round(stats.avgRating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground/20 fill-none"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              {/* نسبة الرضا الإيجابي */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between text-right">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-semibold text-muted-foreground block text-right">نسبة الرضا الإيجابي</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block text-right font-mono">
                      {stats.totalEvaluations > 0 ? stats.positivePercent : 0}%
                    </span>
                    <span className="text-[11px] text-muted-foreground block text-right">
                      تقييمات 4 و 5 نجوم
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* الآراء والمقترحات */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between text-right">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-semibold text-muted-foreground block text-right">الملاحظات والمقترحات</span>
                    <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 block text-right">
                      {stats.withCommentsCount}
                    </span>
                    <span className="text-[11px] text-muted-foreground block text-right">
                      مستفيد قدّم ملاحظات تفصيلية
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card" dir="rtl">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  {/* بحث نصي */}
                  <div className="relative w-full md:flex-1" dir="rtl">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="ابحث برقم الطلب، اسم المستفيد، الجوال، المسجد، أو الملاحظات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9 pl-9 h-10 rounded-xl text-xs text-right"
                      dir="rtl"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* فلتر النجوم */}
                  <div className="w-full sm:w-48">
                    <Select value={selectedRating} onValueChange={setSelectedRating} dir="rtl">
                      <SelectTrigger className="h-10 rounded-xl text-xs font-bold text-right" dir="rtl">
                        <SelectValue placeholder="تصفية حسب النجوم" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all" className="text-right">كل التقييمات</SelectItem>
                        <SelectItem value="5" className="text-right">5 نجوم ★★★★★</SelectItem>
                        <SelectItem value="4" className="text-right">4 نجوم ★★★★</SelectItem>
                        <SelectItem value="3" className="text-right">3 نجوم ★★★</SelectItem>
                        <SelectItem value="2" className="text-right">نجمتان ★★</SelectItem>
                        <SelectItem value="1" className="text-right">نجمة واحدة ★</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* فلتر البرنامج - ديناميكي 100% من قاعدة البيانات */}
                  <div className="w-full sm:w-48">
                    <Select value={selectedProgram} onValueChange={setSelectedProgram} dir="rtl">
                      <SelectTrigger className="h-10 rounded-xl text-xs font-bold text-right" dir="rtl">
                        <SelectValue placeholder="تصفية حسب البرنامج" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all" className="text-right">كل البرامج والخدمات</SelectItem>
                        {allPrograms.map((prog: any) => (
                          <SelectItem key={prog.code || String(prog.id)} value={prog.code || String(prog.id)} className="text-right">
                            {prog.nameAr || prog.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluations List Table */}
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    سجل استبيانات التقييم
                  </CardTitle>
                  <CardDescription className="text-xs">
                    عرض {filteredItems.length} من أصل {stats.totalEvaluations} تقييم
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground text-xs">
                    جاري تحميل تقييمات رضا المستفيدين...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <HeartHandshake className="w-12 h-12 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-bold text-foreground">لا توجد تقييمات مطابقة</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalEvaluations === 0 
                        ? "لم يتم تسجيل أي استبيان تقييم بعد. ستظهر التقييمات هنا فور قيام المستفيدين بإرسال استبياناتهم." 
                        : "لم يتم العثور على أي استبيان تقييم وفق معايير البحث والفلترة المحددة."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" dir="rtl">
                    <table className="w-full text-right text-xs" dir="rtl">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                          <th className="p-3.5 px-4 text-right">رقم الطلب</th>
                          <th className="p-3.5 px-4 text-right">المستفيد</th>
                          <th className="p-3.5 px-4 text-right">الخدمة / البرنامج</th>
                          <th className="p-3.5 px-4 text-center">التقييم</th>
                          <th className="p-3.5 px-4 text-right">الآراء والملاحظات</th>
                          <th className="p-3.5 px-4 text-right">تاريخ التقييم</th>
                          <th className="p-3.5 px-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredItems.map((item) => {
                          const ratingVal = typeof item.rating === "number" && item.rating > 0 ? item.rating : 5;
                          return (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              {/* رقم الطلب */}
                              <td className="p-3.5 px-4 font-mono font-bold text-foreground text-right">
                                <span>{item.requestNumber}</span>
                                <span className="text-[10px] text-muted-foreground font-normal block font-sans">
                                  {getArabicLabel(item.programType)}
                                </span>
                              </td>

                              {/* المستفيد */}
                              <td className="p-3.5 px-4 text-right">
                                <div className="space-y-0.5 text-right">
                                  <span className="font-bold text-foreground block truncate max-w-[150px] text-right">
                                    {item.requesterName}
                                  </span>
                                  {item.requesterPhone && (
                                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 justify-start text-right">
                                      <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                                      <span dir="ltr" className="inline-block">{item.requesterPhone}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* الخدمة / البرنامج */}
                              <td className="p-3.5 px-4">
                                <span className="font-medium text-foreground block truncate max-w-[180px]">
                                  {getArabicLabel(item.serviceName)}
                                </span>
                              </td>

                              {/* التقييم */}
                              <td className="p-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  <span>{ratingVal} / 5</span>
                                </div>
                              </td>

                              {/* الآراء والملاحظات */}
                              <td className="p-3.5 px-4 max-w-xs">
                                {item.comments ? (
                                  <p className="text-muted-foreground italic truncate text-xs">
                                    "{item.comments}"
                                  </p>
                                ) : (
                                  <span className="text-muted-foreground/50 text-[11px]">لا توجد ملاحظات</span>
                                )}
                              </td>

                              {/* التاريخ */}
                              <td className="p-3.5 px-4 text-muted-foreground text-[11px] whitespace-nowrap text-right font-mono">
                                {formatDateEn(item.evaluatedAt)}
                              </td>

                              {/* الإجراءات */}
                              <td className="p-3.5 px-4 text-center whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenDetails(item)}
                                  className="h-8 px-3 text-xs font-bold gap-1.5 rounded-lg hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-500/30"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>عرض الاستبيان</span>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب 2: سجلات إرسال الاستبيانات للعملاء */}
          <TabsContent value="logs" className="space-y-6 mt-2">
            {/* KPI Cards لسجل إرسال الاستبيانات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* إجمالي الاستبيانات المرسلة */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block">إجمالي الاستبيانات المرسلة</span>
                    <span className="text-2xl sm:text-3xl font-black text-foreground block">
                      {logsData?.stats.totalDispatched || 0}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      تم إرسالها للعملاء عند إغلاق الطلبات
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                    <Send className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* استبيانات تم التقييم بنجاح */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block">تم التقييم بنجاح</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block">
                      {logsData?.stats.totalEvaluated || 0}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      عميل أكمل الاستبيان وسجل تقييمه
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* بانتظار رد العميل */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block">بانتظار رد العميل</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-500 block">
                      {logsData?.stats.totalPending || 0}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      لم يتم التقييم بعد (يمكن إرسال تذكير)
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              {/* معدل التجاوب العام */}
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between text-right">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-semibold text-muted-foreground block text-right">معدل التجاوب</span>
                    <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 block text-right font-mono">
                      {logsData?.stats.responseRate || 0}%
                    </span>
                    <span className="text-[11px] text-muted-foreground block text-right">
                      نسبة إكمال الاستبيانات المرسلة
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* أزرار التبديل بين استبيانات الطلبات المغلقة وقسم المستفيدين المعتمدين والمتبرعين والاستفسارات */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border/80 shadow-xs">
              <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setLogsSubView("requests")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    logsSubView === "requests"
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>استبيانات الطلبات المغلقة</span>
                  <Badge variant="secondary" className="mr-1 text-[10px] h-5 px-1.5 font-mono">
                    {logsData?.total || 0}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setLogsSubView("contacts")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    logsSubView === "contacts"
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>المستفيدين المعتمدين والمتبرعين والاستفسارات</span>
                  <Badge variant="secondary" className="mr-1 text-[10px] h-5 px-1.5 font-mono bg-teal-500/15 text-teal-700 dark:text-teal-300">
                    {contactsData?.total || 0}
                  </Badge>
                </button>
              </div>

              {logsSubView === "contacts" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCustomSurveyData({
                      name: "",
                      email: "",
                      phone: "",
                      category: "approved_beneficiary",
                      customMessage: "",
                    });
                    setIsCustomSurveyOpen(true);
                  }}
                  className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال استبيان مخصص</span>
                </Button>
              )}
            </div>

            {/* عند اختيار استبيانات الطلبات المغلقة */}
            {logsSubView === "requests" && (
              <div className="space-y-4">
                {/* Filter and Search Bar للسجلات */}
                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card" dir="rtl">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                      {/* بحث نصي */}
                      <div className="relative w-full md:flex-1" dir="rtl">
                        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="ابحث برقم الطلب، اسم العميل، الجوال، البريد، أو المسجد..."
                          value={logSearchQuery}
                          onChange={(e) => {
                            setLogSearchQuery(e.target.value);
                            setLogPage(1);
                          }}
                          className="pr-9 pl-9 h-10 rounded-xl text-xs text-right"
                          dir="rtl"
                        />
                        {logSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogSearchQuery("");
                              setLogPage(1);
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* فلتر حالة الاستبيان والتجاوب */}
                      <div className="w-full sm:w-52">
                        <Select 
                          value={logStatusFilter} 
                          onValueChange={(val: any) => {
                            setLogStatusFilter(val);
                            setLogPage(1);
                          }}
                          dir="rtl"
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-bold text-right" dir="rtl">
                            <SelectValue placeholder="حالة الاستبيان" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all" className="text-right">كل الحالات</SelectItem>
                            <SelectItem value="pending" className="text-right">بانتظار رد العميل ⏳</SelectItem>
                            <SelectItem value="evaluated" className="text-right">تم التقييم بنجاح ✅</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* فلتر البرنامج */}
                      <div className="w-full sm:w-48">
                        <Select 
                          value={logProgramFilter} 
                          onValueChange={(val) => {
                            setLogProgramFilter(val);
                            setLogPage(1);
                          }}
                          dir="rtl"
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-bold text-right" dir="rtl">
                            <SelectValue placeholder="تصفية حسب البرنامج" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all" className="text-right">كل البرامج والخدمات</SelectItem>
                            {allPrograms.map((prog: any) => (
                              <SelectItem key={prog.code || String(prog.id)} value={prog.code || String(prog.id)} className="text-right">
                                {prog.nameAr || prog.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* جدول سجلات إرسال الاستبيانات */}
                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden" dir="rtl">
                  <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between flex-wrap gap-2 text-right">
                    <div className="text-right">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 text-right">
                        <Send className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                        <span>سجل استبيانات رضا المستفيدين المرسلة</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-right mt-1">
                        عرض <span className="font-mono font-bold">{logsData?.items.length || 0}</span> من أصل <span className="font-mono font-bold">{logsData?.total || 0}</span> استبيان تم إرساله تلقائياً لطالبي الخدمة (service_requester) عند إغلاق طلباتهم
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {isLoadingLogs ? (
                      <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        <span>جاري تحميل سجلات الاستبيانات...</span>
                      </div>
                    ) : !logsData?.items || logsData.items.length === 0 ? (
                      <div className="p-12 text-center space-y-2">
                        <Send className="w-12 h-12 mx-auto text-muted-foreground/40" />
                        <p className="text-sm font-bold text-foreground">لا توجد سجلات مطابقة</p>
                        <p className="text-xs text-muted-foreground">
                          {logsData?.stats.totalDispatched === 0
                            ? "لا توجد حالياً طلبات مغلقة لطالبي الخدمة (service_requester). يتم إرسال الاستبيان آلياً للعميل فور إغلاق طلبه."
                            : "لم يتم العثور على أي سجلات استبيان وفق معايير البحث والفلترة المحددة."}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" dir="rtl">
                        <table className="w-full text-right text-xs" dir="rtl">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                              <th className="p-3.5 px-4 text-right">رقم الطلب والمسجد</th>
                              <th className="p-3.5 px-4 text-right">معلومات العميل (المستفيد)</th>
                              <th className="p-3.5 px-4 text-right">حالة الإرسال</th>
                              <th className="p-3.5 px-4 text-right">حالة التقييم</th>
                              <th className="p-3.5 px-4 text-center">إجراءات وتذكير</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {logsData.items.map((item) => {
                              const isEvaluated = item.survey.isEvaluated;
                              const hasEmail = Boolean(item.beneficiary.email);
                              const isSendingThis = sendingReminderId === item.requestId;

                              return (
                                <tr key={item.requestId} className="hover:bg-muted/30 transition-colors">
                                  {/* رقم الطلب والمسجد */}
                                  <td className="p-3.5 px-4 text-right">
                                    <div className="space-y-1 text-right">
                                      <Link 
                                        href={`/requests/${item.requestId}`}
                                        className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-1 text-xs"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>{item.requestNumber}</span>
                                      </Link>
                                      <div className="flex items-center gap-1.5 flex-wrap justify-start">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold">
                                          {getArabicLabel(item.programType)}
                                        </Badge>
                                        {item.mosqueName && (
                                          <span className="text-[11px] text-muted-foreground truncate max-w-[160px] inline-flex items-center gap-1">
                                            <Building2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                            {item.mosqueName} {item.mosqueCity ? `(${item.mosqueCity})` : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* معلومات العميل */}
                                  <td className="p-3.5 px-4 text-right">
                                    <div className="space-y-1 text-right">
                                      <div className="font-bold text-foreground flex items-center gap-1.5 justify-start text-right">
                                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate max-w-[170px]">{item.beneficiary.name}</span>
                                      </div>
                                      {hasEmail ? (
                                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 justify-start text-right">
                                          <Mail className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                                          <span dir="ltr" className="truncate max-w-[170px] inline-block">{item.beneficiary.email}</span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block text-right">
                                          ⚠️ لا يوجد بريد إلكتروني مسجل
                                        </span>
                                      )}
                                      {item.beneficiary.phone && (
                                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 justify-start text-right">
                                          <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                                          <span dir="ltr" className="inline-block">{item.beneficiary.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* حالة الإرسال */}
                                  <td className="p-3.5 px-4 text-right">
                                    <div className="space-y-1.5 text-right">
                                      <div className="flex items-center justify-start">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50 text-[11px] gap-1 py-0.5 px-2 inline-flex items-center">
                                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                          <span>تم إرسال الاستبيان للعميل</span>
                                        </Badge>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-start text-right font-mono">
                                        <Calendar className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                        <span className="font-sans">
                                          {item.survey.dispatchedAt 
                                            ? `تاريخ الإرسال: ${formatDateEn(item.survey.dispatchedAt)}` 
                                            : "عند إغلاق الطلب"}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 justify-start text-right">
                                        <Mail className="w-2.5 h-2.5 shrink-0" />
                                        <span>عبر البريد الإلكتروني والإشعارات</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* حالة التقييم */}
                                  <td className="p-3.5 px-4 text-right">
                                    {isEvaluated ? (
                                      <div className="space-y-1 text-right">
                                        <div className="flex items-center justify-start">
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 text-[11px] gap-1 py-0.5 px-2 inline-flex items-center">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>تم التقييم بنجاح</span>
                                          </Badge>
                                        </div>
                                        {item.survey.rating && (
                                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 justify-start font-mono" dir="rtl">
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            <span>{item.survey.rating} / 5</span>
                                          </div>
                                        )}
                                        {item.survey.evaluatedAt && (
                                          <span className="text-[10px] text-muted-foreground block text-right font-mono">
                                            {formatDateEn(item.survey.evaluatedAt)}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1 text-right">
                                        <div className="flex items-center justify-start">
                                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50 text-[11px] gap-1 py-0.5 px-2 inline-flex items-center">
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            <span>بانتظار رد العميل</span>
                                          </Badge>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground block text-right">
                                          لم يقم بتعبئة التقييم بعد
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  {/* إجراءات وتذكير */}
                                  <td className="p-3.5 px-4 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                      {/* زر إرسال إيميل تذكيري */}
                                      <Button
                                        size="sm"
                                        variant={isEvaluated ? "outline" : "default"}
                                        disabled={!hasEmail || isSendingThis}
                                        onClick={() => handleSendReminder(item.requestId)}
                                        title={hasEmail ? "إرسال إيميل تذكيري للعميل" : "لا يوجد بريد إلكتروني مسجل"}
                                        className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg ${
                                          !isEvaluated 
                                            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs" 
                                            : "text-muted-foreground hover:text-foreground"
                                        }`}
                                      >
                                        {isSendingThis ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Send className="w-3.5 h-3.5" />
                                        )}
                                        <span>{isEvaluated ? "إعادة تذكير" : "إرسال تذكير"}</span>
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {logsData && logsData.totalPages > 1 && (
                      <div className="p-4 border-t border-border/80 flex items-center justify-between flex-wrap gap-2 text-xs font-mono" dir="rtl">
                        <span className="text-muted-foreground font-sans">
                          الصفحة <span className="font-mono font-bold text-foreground">{logsData.page}</span> من <span className="font-mono font-bold text-foreground">{logsData.totalPages}</span> (إجمالي <span className="font-mono font-bold text-foreground">{logsData.total}</span> سجل)
                        </span>
                        <div className="flex items-center gap-1 font-sans">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={logsData.page <= 1}
                            onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                            className="h-8 px-2.5 text-xs gap-1"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span>السابق</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={logsData.page >= logsData.totalPages}
                            onClick={() => setLogPage((p) => Math.min(logsData.totalPages, p + 1))}
                            className="h-8 px-2.5 text-xs gap-1"
                          >
                            <span>التالي</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* عند اختيار قسم المستفيدين المعتمدين والمتبرعين والاستفسارات */}
            {logsSubView === "contacts" && (
              <div className="space-y-4">
                {/* Filter and Search Bar لجهات الاتصال */}
                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card" dir="rtl">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                      {/* بحث نصي */}
                      <div className="relative w-full md:flex-1" dir="rtl">
                        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="ابحث بالاسم، رقم الجوال، البريد، أو التفاصيل..."
                          value={contactSearchQuery}
                          onChange={(e) => {
                            setContactSearchQuery(e.target.value);
                            setContactPage(1);
                          }}
                          className="pr-9 pl-9 h-10 rounded-xl text-xs text-right"
                          dir="rtl"
                        />
                        {contactSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setContactSearchQuery("");
                              setContactPage(1);
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* تصنيف الفئة */}
                      <div className="w-full sm:w-60">
                        <Select 
                          value={contactCategoryFilter} 
                          onValueChange={(val: any) => {
                            setContactCategoryFilter(val);
                            setContactPage(1);
                          }}
                          dir="rtl"
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-bold text-right" dir="rtl">
                            <SelectValue placeholder="تصفية الفئة" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all" className="text-right font-mono">
                              <span className="font-sans">كل الفئات</span> ({contactsData?.stats.totalAll || 0})
                            </SelectItem>
                            <SelectItem value="approved_beneficiary" className="text-right font-mono">
                              <span className="font-sans">المستفيدون المعتمدون</span> ({contactsData?.stats.totalApprovedBeneficiaries || 0})
                            </SelectItem>
                            <SelectItem value="donor" className="text-right font-mono">
                              <span className="font-sans">المتبرعون والداعمون</span> ({contactsData?.stats.totalDonors || 0})
                            </SelectItem>
                            <SelectItem value="inquiry" className="text-right font-mono">
                              <span className="font-sans">أصحاب الاستفسارات</span> ({contactsData?.stats.totalInquirers || 0})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* جدول المستفيدين المعتمدين والمتبرعين والاستفسارات */}
                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden" dir="rtl">
                  <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between flex-wrap gap-2 text-right">
                    <div className="text-right">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 text-right">
                        <Users className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                        <span>دليل المستفيدين المعتمدين، المتبرعين، وأصحاب الاستفسارات</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-right mt-1">
                        عرض <span className="font-mono font-bold">{contactsData?.items.length || 0}</span> من أصل <span className="font-mono font-bold">{contactsData?.total || 0}</span> جهة مؤهلة لاستلام استبيان قياس الرضا
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {isLoadingContacts ? (
                      <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        <span>جاري تحميل قائمة المستفيدين والمتبرعين...</span>
                      </div>
                    ) : !contactsData?.items || contactsData.items.length === 0 ? (
                      <div className="p-12 text-center space-y-2">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
                        <p className="text-sm font-bold text-foreground">لا توجد جهات مطابقة</p>
                        <p className="text-xs text-muted-foreground">
                          لم يتم العثور على أي جهات اتصال وفق معايير البحث والفلترة المحددة.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" dir="rtl">
                        <table className="w-full text-right text-xs" dir="rtl">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                              <th className="p-3.5 px-4 text-right">الاسم والتصنيف</th>
                              <th className="p-3.5 px-4 text-right">رقم الجوال</th>
                              <th className="p-3.5 px-4 text-right">البريد الإلكتروني</th>
                              <th className="p-3.5 px-4 text-right">تاريخ التسجيل / المعاملة</th>
                              <th className="p-3.5 px-4 text-right">حالة التقييم</th>
                              <th className="p-3.5 px-4 text-center">الإجراء</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {contactsData.items.map((contact) => {
                              const isSendingThis = sendingSurveyKey === contact.id;
                              const hasEmail = Boolean(contact.email);

                              return (
                                <tr key={contact.id} className="hover:bg-muted/30 transition-colors">
                                  {/* الاسم والتصنيف */}
                                  <td className="p-3.5 px-4 text-right">
                                    <div className="space-y-1 text-right">
                                      <div className="font-bold text-foreground flex items-center gap-1.5 justify-start text-right">
                                        <span className="truncate max-w-[180px]">{contact.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap justify-start">
                                        {contact.category === "approved_beneficiary" && (
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] gap-1 py-0 px-2 font-bold inline-flex items-center">
                                            <UserCheck className="w-3 h-3 text-emerald-600" />
                                            <span>مستفيد معتمد</span>
                                          </Badge>
                                        )}
                                        {contact.category === "donor" && (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50 text-[10px] gap-1 py-0 px-2 font-bold inline-flex items-center">
                                            <HeartHandshake className="w-3 h-3 text-purple-600" />
                                            <span>متبرع / داعم</span>
                                          </Badge>
                                        )}
                                        {contact.category === "inquiry" && (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50 text-[10px] gap-1 py-0 px-2 font-bold inline-flex items-center">
                                            <MessageSquare className="w-3 h-3 text-blue-600" />
                                            <span>صاحب استفسار</span>
                                          </Badge>
                                        )}
                                        <span className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                                          {contact.subText}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* رقم الجوال */}
                                  <td className="p-3.5 px-4 text-right">
                                    {contact.phone ? (
                                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 justify-start text-right">
                                        <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                                        <span dir="ltr" className="inline-block">{contact.phone}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground/60">—</span>
                                    )}
                                  </td>

                                  {/* البريد الإلكتروني */}
                                  <td className="p-3.5 px-4 text-right">
                                    {hasEmail ? (
                                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 justify-start text-right">
                                        <Mail className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                                        <span dir="ltr" className="truncate max-w-[170px] inline-block">{contact.email}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block text-right">
                                        ⚠️ لا يوجد بريد مسجل
                                      </span>
                                    )}
                                  </td>

                                  {/* تاريخ التسجيل / المعاملة */}
                                  <td className="p-3.5 px-4 text-right">
                                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 justify-start text-right">
                                      <Calendar className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                      <span>{formatDateEn(contact.date)}</span>
                                    </div>
                                  </td>

                                  {/* حالة التقييم */}
                                  <td className="p-3.5 px-4 text-right">
                                    {contact.isEvaluated ? (
                                      <div className="space-y-1 text-right">
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] gap-1 py-0.5 px-2 inline-flex items-center font-bold">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>تم التقييم</span>
                                        </Badge>
                                        {contact.rating && (
                                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono justify-start">
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            <span>{contact.rating} / 5</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] gap-1 py-0.5 px-2 inline-flex items-center">
                                        <Clock className="w-3 h-3" />
                                        <span>لم يقم بالتقييم بعد</span>
                                      </Badge>
                                    )}
                                  </td>

                                  {/* الإجراء */}
                                  <td className="p-3.5 px-4 text-center whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      disabled={isSendingThis}
                                      onClick={() => handleSendGeneralSurvey(contact)}
                                      title={hasEmail ? "إرسال رابط الاستبيان عبر البريد" : "إدخال البريد الإلكتروني وإرسال الاستبيان"}
                                      className="h-8 px-3 text-xs font-bold gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                                    >
                                      {isSendingThis ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Send className="w-3.5 h-3.5" />
                                      )}
                                      <span>إرسال استبيان</span>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination لجهات الاتصال */}
                    {contactsData && contactsData.totalPages > 1 && (
                      <div className="p-4 border-t border-border/80 flex items-center justify-between flex-wrap gap-2 text-xs font-mono" dir="rtl">
                        <span className="text-muted-foreground font-sans">
                          الصفحة <span className="font-mono font-bold text-foreground">{contactsData.page}</span> من <span className="font-mono font-bold text-foreground">{contactsData.totalPages}</span> (إجمالي <span className="font-mono font-bold text-foreground">{contactsData.total}</span> جهة)
                        </span>
                        <div className="flex items-center gap-1 font-sans">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={contactsData.page <= 1}
                            onClick={() => setContactPage((p) => Math.max(1, p - 1))}
                            className="h-8 px-2.5 text-xs gap-1"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span>السابق</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={contactsData.page >= contactsData.totalPages}
                            onClick={() => setContactPage((p) => Math.min(contactsData.totalPages, p + 1))}
                            className="h-8 px-2.5 text-xs gap-1"
                          >
                            <span>التالي</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal: Full Survey Details Styled Exactly Like RequestEvaluation */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl sm:max-w-4xl w-[95vw] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl" dir="rtl">
            {selectedEval && (
              <div className="font-sans">
                {/* 1. Header Banner مع الشعار مثل صفحة التقييم */}
                <div
                  className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner"
                  style={{ backgroundColor: evalFormConfig?.headerBgColor || "#14707a" }}
                >
                  <img 
                    src={mainLogoSrc} 
                    alt="شعار الجمعية" 
                    className="h-16 sm:h-20 w-auto object-contain brightness-0 invert"
                  />
                  <div className="absolute left-4 sm:left-6 top-4 sm:top-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
                      <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>{selectedEval.rating} من 5 نجوم</span>
                    </span>
                  </div>
                </div>

                {/* 2. العنوان والتفاصيل */}
                <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {evalFormConfig?.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                      {evalFormConfig?.description || "نرحب بكم في استبيان قياس رضا المستفيدين لجمعية عمارة المساجد (منارة). نسعى من خلال هذا الاستبيان إلى فهم آرائكم واقتراحاتكم، حيث إن مشاركتكم تساعدنا في تحسين وتطوير خدماتنا لتلبية تطلعاتكم بشكل أفضل. نؤكد لكم أن إكمال الاستبيان لن يستغرق أكثر من دقيقتين من وقتكم. شكرًا لكم على وقتكم وتعاونكم"}
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted border border-border font-mono font-bold text-foreground text-xs">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {selectedEval.requestNumber}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        {getArabicLabel(selectedEval.serviceName)}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {formatDateEn(selectedEval.evaluatedAt)}
                      </span>
                    </div>
                  </div>

                  <hr className="border-t border-dotted border-border" />

                  {/* 3. عرض جميع الحقول المخصصة والنشطة كما في صفحة الاستبيان */}
                  <div className="space-y-4">
                    {activeFields.map((field) => {
                      // استخراج الإجابة
                      let value = selectedEval.answers?.[field.id];
                      if (value === undefined) {
                        if (field.id === "beneficiaryName") value = selectedEval.requesterName;
                        else if (field.id === "beneficiaryPhone") value = selectedEval.requesterPhone;
                        else if (field.id === "beneficiaryEmail") value = selectedEval.requesterEmail;
                        else if (field.id === "serviceName") value = selectedEval.serviceName;
                        else if (field.id === "servicesRating") value = selectedEval.servicesRating;
                        else if (field.id === "speedRating") value = selectedEval.speedRating;
                        else if (field.id === "communicationRating") value = selectedEval.communicationRating;
                        else if (field.id === "overallSatisfaction") value = selectedEval.overallSatisfaction || selectedEval.rating;
                        else if (field.id === "comments") value = selectedEval.comments;
                      }

                      if (value === undefined || value === null || value === "") return null;

                      return (
                        <div key={field.id} className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-2 text-right">
                          <span className="text-xs sm:text-sm font-bold text-foreground block">
                            {field.label}
                          </span>

                          {/* تقييم بالنجوم */}
                          {field.type === "rating" && (
                            <div className="flex items-center gap-1.5 py-1 justify-start" dir="rtl">
                              {Array.from({ length: field.maxRating || 5 }).map((_, sIdx) => {
                                const starVal = sIdx + 1;
                                const active = Number(value) >= starVal;
                                return (
                                  <Star
                                    key={starVal}
                                    className={`w-7 h-7 ${
                                      active
                                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.5)]"
                                        : "text-muted-foreground/20 fill-none"
                                    }`}
                                  />
                                );
                              })}
                              <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 ml-2">
                                {value} من {field.maxRating || 5}
                              </span>
                            </div>
                          )}

                          {/* خيارات أو قوائم */}
                          {["select", "radio"].includes(field.type) && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-card p-3 rounded-xl border border-border/60 text-right" dir="rtl">
                              {field.options?.find((o: any) => o.value === value)?.label || getArabicLabel(String(value))}
                            </div>
                          )}

                          {/* نصوص / هاتف / بريد / رقم */}
                          {["text", "phone", "email", "number"].includes(field.type) && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-card p-3 rounded-xl border border-border/60 text-right" dir="rtl">
                              {field.type === "phone" || field.type === "email" ? (
                                <span dir="ltr" className="inline-block font-mono">{String(value)}</span>
                              ) : (
                                field.id === "serviceName" || field.id === "programType" ? getArabicLabel(String(value)) : String(value)
                              )}
                            </div>
                          )}

                          {/* نص طويل / ملاحظات */}
                          {field.type === "textarea" && (
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm italic text-foreground leading-relaxed">
                              "{String(value)}"
                            </div>
                          )}

                          {/* مربع اختيار */}
                          {field.type === "checkbox" && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-card p-3 rounded-xl border border-border/60">
                              {value ? "نعم / أوافق" : "لا"}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* في حال وجود تعليقات إضافية غير مدرجة بالحقول */}
                    {selectedEval.comments && !activeFields.some((f) => f.id === "comments") && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-right">
                        <span className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4" />
                          <span>آراء ومقترحات المستفيد:</span>
                        </span>
                        <p className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                          "{selectedEval.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="p-4 bg-muted/20 border-t border-border flex justify-end items-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-xs font-bold rounded-xl px-6"
                  >
                    إغلاق
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* حوار إرسال استبيان مخصص أو إدخال البريد الإلكتروني */}
        <Dialog open={isCustomSurveyOpen} onOpenChange={setIsCustomSurveyOpen}>
          <DialogContent className="max-w-md w-[95vw] p-6 rounded-2xl border border-border shadow-2xl" dir="rtl">
            <DialogHeader className="text-right space-y-1">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2 text-right">
                <Send className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                <span>إرسال استبيان قياس رضا المستفيدين</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-right">
                إرسال دعوة استبيان الرضا مباشرة عبر البريد الإلكتروني للمستفيدين أو المتبرعين أو أصحاب الاستفسارات.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customSurveyData.email.trim()) {
                  toast.error("يرجى إدخال البريد الإلكتروني للمستلم");
                  return;
                }
                if (!customSurveyData.name.trim()) {
                  toast.error("يرجى إدخال اسم المستلم");
                  return;
                }
                sendGeneralSurveyMutation.mutate({
                  recipientEmail: customSurveyData.email.trim(),
                  recipientName: customSurveyData.name.trim(),
                  recipientPhone: customSurveyData.phone.trim() || undefined,
                  category: customSurveyData.category,
                  userId: customSurveyData.userId,
                  customMessage: customSurveyData.customMessage.trim() || undefined,
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground text-right block">اسم المستلم *</Label>
                <Input
                  value={customSurveyData.name}
                  onChange={(e) => setCustomSurveyData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم الشخص أو الجهة..."
                  required
                  className="h-10 text-xs text-right"
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground text-right block">البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  value={customSurveyData.email}
                  onChange={(e) => setCustomSurveyData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@mail.com"
                  required
                  className="h-10 text-xs text-right font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground text-right block">رقم الجوال (اختياري)</Label>
                <Input
                  value={customSurveyData.phone}
                  onChange={(e) => setCustomSurveyData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="05xxxxxxxx"
                  className="h-10 text-xs text-right font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground text-right block">الفئة / نوع المستفيد</Label>
                <Select
                  value={customSurveyData.category}
                  onValueChange={(val: any) => setCustomSurveyData(prev => ({ ...prev, category: val }))}
                  dir="rtl"
                >
                  <SelectTrigger className="h-10 text-xs font-bold text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="approved_beneficiary" className="text-right">مستفيد معتمد</SelectItem>
                    <SelectItem value="donor" className="text-right">متبرع / داعم</SelectItem>
                    <SelectItem value="inquiry" className="text-right">صاحب استفسار</SelectItem>
                    <SelectItem value="custom" className="text-right">أخرى / استبيان عام</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground text-right block">ملاحظة أو رسالة خاصة (اختياري)</Label>
                <Textarea
                  value={customSurveyData.customMessage}
                  onChange={(e) => setCustomSurveyData(prev => ({ ...prev, customMessage: e.target.value }))}
                  placeholder="رسالة إضافية تظهر في البريد الإلكتروني المرسل للمستفيد..."
                  rows={3}
                  className="text-xs text-right resize-none"
                  dir="rtl"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCustomSurveyOpen(false)}
                  className="text-xs h-9"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={sendGeneralSurveyMutation.isPending}
                  className="text-xs h-9 font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                >
                  {sendGeneralSurveyMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>إرسال الاستبيان الآن</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );

  if (embedded) {
    return content;
  }

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  );
}
