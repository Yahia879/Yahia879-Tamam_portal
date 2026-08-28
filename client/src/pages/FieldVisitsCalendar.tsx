import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  FileText, 
  CalendarDays, 
  ListOrdered, 
  Phone, 
  Trash2, 
  Edit, 
  X,
  ExternalLink,
  Layers,
  CalendarPlus,
  Building2,
  Tag,
  AlertCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PROGRAM_LABELS } from "../../../shared/constants";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday as isDateToday,
  parseISO
} from "date-fns";
import { ar } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

// تصنيفات المواعيد وألوانها المتناسقة مع هوية المنصة (Teal / Primary)
const TRACK_CONFIG = {
  all: {
    label: "الكل",
    shortLabel: "الكل",
    icon: CalendarIcon,
    badgeBg: "bg-primary/10 text-primary",
    color: "bg-primary text-primary-foreground",
    border: "border-primary/30",
    dot: "bg-primary",
    cardBg: "bg-muted/40",
  },
  field_visit: {
    label: "زيارة ميدانية",
    shortLabel: "زيارة",
    icon: MapPin,
    badgeBg: "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800/80",
    dot: "bg-teal-600 dark:bg-teal-400",
    cardBg: "bg-teal-50/40 hover:bg-teal-50/70 dark:bg-teal-950/20 dark:hover:bg-teal-950/30",
  },
  quick_response: {
    label: "استجابة سريعة",
    shortLabel: "استجابة",
    icon: Zap,
    badgeBg: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/80",
    dot: "bg-amber-500 dark:bg-amber-400",
    cardBg: "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
  },
  final_report: {
    label: "تقرير ختامي",
    shortLabel: "ختامي",
    icon: FileText,
    badgeBg: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/80",
    dot: "bg-emerald-600 dark:bg-emerald-400",
    cardBg: "bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30",
  },
  custom: {
    label: "حدث مخصص",
    shortLabel: "مخصص",
    icon: Sparkles,
    badgeBg: "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800/80",
    dot: "bg-sky-600 dark:bg-sky-400",
    cardBg: "bg-sky-50/40 hover:bg-sky-50/70 dark:bg-sky-950/20 dark:hover:bg-sky-950/30",
  },
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "منخفضة", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  { value: "medium", label: "متوسطة", color: "text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" },
  { value: "high", label: "عالية", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  { value: "urgent", label: "عاجلة جداً", color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
];

function FieldVisitsCalendarContent() {
  const { user } = useAuth();
  const hasViewAll = usePermission("appointments.view_all");
  const isOwnOnly = !hasViewAll;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "timeline" | "agenda">("month");
  
  // الفلاتر
  const [selectedTrack, setSelectedTrack] = useState<"all" | "field_visit" | "quick_response" | "final_report" | "custom">("all");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // نافذة إضافة / تعديل حدث مخصص
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    eventType: "custom",
    eventDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    assignedTo: isOwnOnly && user?.id ? String(user.id) : "",
    location: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  });

  const currentMonthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);
  const daysInMonth = eachDayOfInterval({ start: currentMonthStart, end: monthEnd });

  const startDateStr = format(currentMonthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  const utils = trpc.useUtils();

  // جلب موظفي المنصة لاختيار المسؤول
  const { data: staffUsers = [] } = trpc.users.getStaffUsers.useQuery(undefined, {
    enabled: !isOwnOnly
  });

  // جلب المواعيد الموحدة
  const { 
    data: events = [], 
    isLoading: isLoadingEvents,
    refetch: refetchEvents
  } = trpc.calendar.getUnifiedEvents.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
    eventType: selectedTrack,
    assignedTo: !isOwnOnly && selectedStaffId !== "all" ? Number(selectedStaffId) : undefined,
    search: searchQuery || undefined,
  });

  // جلب إحصائيات الشهر
  const { data: stats } = trpc.calendar.getCalendarSummaryStats.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  // طفرات إضافة وتعديل وحذف الحدث المخصص
  const createEventMutation = trpc.calendar.createCustomEvent.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحدث المخصص بنجاح");
      setIsEventModalOpen(false);
      resetEventForm();
      utils.calendar.getUnifiedEvents.invalidate();
      utils.calendar.getCalendarSummaryStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إضافة الحدث");
    },
  });

  const updateEventMutation = trpc.calendar.updateCustomEvent.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل الحدث بنجاح");
      setIsEventModalOpen(false);
      resetEventForm();
      utils.calendar.getUnifiedEvents.invalidate();
      utils.calendar.getCalendarSummaryStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تعديل الحدث");
    },
  });

  const deleteEventMutation = trpc.calendar.deleteCustomEvent.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحدث بنجاح");
      utils.calendar.getUnifiedEvents.invalidate();
      utils.calendar.getCalendarSummaryStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف الحدث");
    },
  });

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventFormData({
      title: "",
      description: "",
      eventType: "custom",
      eventDate: format(selectedDate, "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      assignedTo: isOwnOnly && user?.id ? String(user.id) : "",
      location: "",
      priority: "medium",
    });
  };

  const handleOpenNewEventModal = () => {
    resetEventForm();
    setEventFormData((prev) => ({
      ...prev,
      eventDate: format(selectedDate, "yyyy-MM-dd"),
    }));
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventModal = (event: any) => {
    setEditingEventId(event.rawId);
    setEventFormData({
      title: event.title || "",
      description: event.description || "",
      eventType: event.customCategory || "custom",
      eventDate: event.date || format(new Date(), "yyyy-MM-dd"),
      startTime: event.startTime || "09:00",
      endTime: event.endTime || "10:00",
      assignedTo: event.assignedToId ? String(event.assignedToId) : "",
      location: event.location || "",
      priority: event.priority || "medium",
    });
    setIsEventModalOpen(true);
  };

  const handleEventFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title.trim()) {
      toast.error("يرجى إدخال عنوان الحدث");
      return;
    }
    if (!eventFormData.eventDate) {
      toast.error("يرجى تحديد التاريخ");
      return;
    }

    if (editingEventId) {
      updateEventMutation.mutate({
        id: editingEventId,
        title: eventFormData.title,
        description: eventFormData.description || undefined,
        eventType: eventFormData.eventType,
        eventDate: eventFormData.eventDate,
        startTime: eventFormData.startTime || undefined,
        endTime: eventFormData.endTime || undefined,
        assignedTo: eventFormData.assignedTo && eventFormData.assignedTo !== "none" ? Number(eventFormData.assignedTo) : undefined,
        location: eventFormData.location || undefined,
        priority: eventFormData.priority,
      });
    } else {
      createEventMutation.mutate({
        title: eventFormData.title,
        description: eventFormData.description || undefined,
        eventType: eventFormData.eventType,
        eventDate: eventFormData.eventDate,
        startTime: eventFormData.startTime || undefined,
        endTime: eventFormData.endTime || undefined,
        assignedTo: eventFormData.assignedTo && eventFormData.assignedTo !== "none" ? Number(eventFormData.assignedTo) : undefined,
        location: eventFormData.location || undefined,
        priority: eventFormData.priority,
      });
    }
  };

  // تجميع المواعيد حسب التاريخ
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      if (!ev.date) continue;
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  // المواعيد لليوم المحدد حالياً
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDayEvents = useMemo(() => {
    return (eventsByDate[selectedDateStr] || []).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [eventsByDate, selectedDateStr]);

  const prevMonth = () => setCurrentMonthDate((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonthDate((prev) => addMonths(prev, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedDate(now);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                التقويم الموحد للمواعيد والزيارات
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                متابعة وإدارة الزيارات الميدانية، الاستجابة السريعة، التقارير الختامية، والأحداث الخاصة
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="rounded-xl h-9 text-xs font-bold border-border/80 hover:border-primary hover:text-primary transition-all"
          >
            اليوم
          </Button>

          <div className="bg-muted/70 p-1 rounded-2xl flex items-center gap-1 border border-border/60">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "month" 
                  ? "bg-card shadow-xs text-primary font-black" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "timeline" 
                  ? "bg-card shadow-xs text-primary font-black" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              جدول زمني
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "agenda" 
                  ? "bg-card shadow-xs text-primary font-black" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              قائمة
            </button>
          </div>

          {hasViewAll && (
            <Button
              onClick={handleOpenNewEventModal}
              className="gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm shadow-primary/20 h-9 px-4 text-xs"
            >
              <Plus className="h-4 w-4" />
              إضافة حدث مخصص
            </Button>
          )}
        </div>
      </div>

      {/* 2. Top Stats KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Field Visits */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "field_visit" ? "all" : "field_visit")}
          className={`cursor-pointer transition-all border rounded-3xl hover:shadow-sm ${
            selectedTrack === "field_visit" 
              ? "ring-2 ring-teal-500 bg-teal-50/40 dark:bg-teal-950/30 border-teal-300" 
              : "bg-card border-border/70 hover:border-teal-300"
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الزيارات الميدانية</p>
              <h3 className="text-xl font-black text-teal-700 dark:text-teal-300 mt-0.5">{stats?.fieldVisits ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Quick Response */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "quick_response" ? "all" : "quick_response")}
          className={`cursor-pointer transition-all border rounded-3xl hover:shadow-sm ${
            selectedTrack === "quick_response" 
              ? "ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30 border-amber-300" 
              : "bg-card border-border/70 hover:border-amber-300"
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الاستجابة السريعة</p>
              <h3 className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats?.quickResponse ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Final Reports */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "final_report" ? "all" : "final_report")}
          className={`cursor-pointer transition-all border rounded-3xl hover:shadow-sm ${
            selectedTrack === "final_report" 
              ? "ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300" 
              : "bg-card border-border/70 hover:border-emerald-300"
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">التقرير الختامي</p>
              <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats?.finalReports ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Custom Events */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "custom" ? "all" : "custom")}
          className={`cursor-pointer transition-all border rounded-3xl hover:shadow-sm ${
            selectedTrack === "custom" 
              ? "ring-2 ring-sky-500 bg-sky-50/40 dark:bg-sky-950/30 border-sky-300" 
              : "bg-card border-border/70 hover:border-sky-300"
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الأحداث المخصصة</p>
              <h3 className="text-xl font-black text-sky-700 dark:text-sky-300 mt-0.5">{stats?.customEvents ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Today's Events */}
        <Card 
          onClick={goToToday}
          className="cursor-pointer transition-all border rounded-3xl hover:shadow-sm bg-primary/5 hover:bg-primary/10 border-primary/20 col-span-2 sm:col-span-1"
        >
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">مواعيد اليوم</p>
              <h3 className="text-xl font-black text-primary mt-0.5">{stats?.todayCount ?? 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filters Toolbar */}
      <Card className="rounded-3xl border border-border/70 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "field_visit", "quick_response", "final_report", "custom"] as const).map((key) => {
                const conf = TRACK_CONFIG[key];
                const isSelected = selectedTrack === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTrack(key)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card hover:bg-muted/60 text-foreground border-border/70"
                    }`}
                  >
                    {key !== "all" && <span className={`w-2 h-2 rounded-full ${conf.dot}`} />}
                    {conf.label}
                  </button>
                );
              })}
            </div>

            {/* Staff & Search Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Staff Select / Indicator */}
              {isOwnOnly ? (
                <div className="h-9 px-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>زياراتي ومهامي فقط</span>
                </div>
              ) : (
                <div className="w-full sm:w-60">
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="rounded-2xl h-9 text-xs border-border/70">
                      <SelectValue placeholder="تصفية حسب المسؤول" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كافة الموظفين والمسؤولين</SelectItem>
                      {staffUsers.map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم الطلب، المسجد..."
                  className="pr-9 h-9 text-xs rounded-2xl border-border/70"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Main Calendar & Details Grid */}
      {viewMode === "month" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 cols) */}
          <Card className="lg:col-span-8 rounded-3xl border border-border/70 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-black font-mono text-foreground">
                  {format(currentMonthDate, "MMMM yyyy", { locale: ar })}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-xl border-border/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-xl border-border/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-muted-foreground">
                {["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((d) => (
                  <div key={d} className="p-1">
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d.charAt(0)}</span>
                  </div>
                ))}
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isDateToday(day);
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative p-1.5 sm:p-2 rounded-2xl border text-right transition-all flex flex-col justify-between min-h-[75px] sm:min-h-[95px] max-h-[110px] overflow-hidden
                        ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs"
                            : isToday
                            ? "border-primary/50 bg-primary/[0.03] hover:border-primary"
                            : hasEvents
                            ? "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30"
                            : "border-border/40 bg-card/40 hover:bg-muted/20 text-muted-foreground"
                        }
                      `}
                    >
                      {/* Day Number + Today Badge */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? "bg-primary text-primary-foreground font-black"
                              : isSelected
                              ? "bg-primary/20 text-primary font-black"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {hasEvents && (
                          <span className="text-[10px] font-bold font-mono text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event preview pills */}
                      <div className="flex flex-col gap-1 w-full mt-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev: any) => {
                          const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                          return (
                            <div
                              key={ev.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold truncate flex items-center gap-1 border ${conf.badgeBg} ${conf.border}`}
                              title={`${ev.title} (${ev.startTime || ""})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
                              <span className="truncate">{ev.startTime || ""} {ev.mosqueName || ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] font-mono text-muted-foreground text-center font-bold">
                            +{dayEvents.length - 2} مواعيد أخرى
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Drawer / Sidebar (4 cols) */}
          <Card className="lg:col-span-4 rounded-3xl border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-foreground">
                  مواعيد: {format(selectedDate, "EEEE d MMMM", { locale: ar })}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {selectedDayEvents.length} مهمة مجدولة لهذا اليوم
                </CardDescription>
              </div>
              {hasViewAll && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenNewEventModal}
                  className="h-8 rounded-xl text-xs gap-1 border-border/70 hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة حدث
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-3">
              {selectedDayEvents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto opacity-30 mb-2" />
                  <p className="text-xs font-medium">لا توجد مواعيد مجدولة لهذا اليوم</p>
                  {hasViewAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenNewEventModal}
                      className="mt-2 text-xs text-primary hover:text-primary/80 font-bold"
                    >
                      + جدولة حدث أو زيارة الآن
                    </Button>
                  )}
                </div>
              ) : (
                selectedDayEvents.map((ev: any) => {
                  const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                  const Icon = conf.icon;
                  const priorityObj = PRIORITY_OPTIONS.find(p => p.value === ev.priority) || PRIORITY_OPTIONS[1];

                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-2xl border transition-all ${conf.cardBg} ${conf.border}`}
                    >
                      {/* Header Badge & Time */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 gap-1 ${conf.badgeBg} ${conf.border}`}>
                          <Icon className="h-3 w-3" />
                          {ev.typeLabel || conf.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{ev.startTime || "09:00"}</span>
                          {ev.endTime && <span className="text-muted-foreground">- {ev.endTime}</span>}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      {/* Location & Contact */}
                      <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
                        {ev.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{ev.assignedToName || "غير محدد"}</span>
                          </div>
                          {ev.priority && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityObj.color}`}>
                              {priorityObj.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        {ev.linkUrl ? (
                          <Link href={ev.linkUrl}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary/90 p-0 font-bold">
                              فتح الطلب <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        ) : (
                          <div />
                        )}

                        {hasViewAll && ev.type === "custom" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEditEventModal(ev)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من رغبتك في حذف هذا الحدث؟")) {
                                  deleteEventMutation.mutate({ id: ev.rawId });
                                }
                              }}
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Timeline View Mode */}
      {viewMode === "timeline" && (
        <Card className="rounded-3xl border border-border/70 shadow-xs">
          <CardHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-black text-foreground">
                الجدول الزمني لليوم: {format(selectedDate, "EEEE d MMMM yyyy", { locale: ar })}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                توزيع المواعيد على مدار ساعات اليوم (من 08:00 صباحاً حتى 09:00 مساءً)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) {
                    const d = parseISO(e.target.value);
                    setSelectedDate(d);
                    setCurrentMonthDate(d);
                  }
                }}
                className="w-40 h-8 text-xs rounded-xl border-border/70"
              />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 14 }).map((_, idx) => {
                const hourNum = 8 + idx; // 08:00 to 21:00
                const hourStr = `${hourNum.toString().padStart(2, "0")}:00`;
                const hourEvents = selectedDayEvents.filter((ev) => {
                  const evHour = parseInt((ev.startTime || "09:00").split(":")[0], 10);
                  return evHour === hourNum;
                });

                return (
                  <div key={hourStr} className="grid grid-cols-12 gap-4 items-start border-b border-border/40 pb-4">
                    <div className="col-span-2 sm:col-span-1 text-xs font-mono font-bold text-muted-foreground pt-1">
                      {hourStr}
                    </div>
                    <div className="col-span-10 sm:col-span-11 space-y-2">
                      {hourEvents.length === 0 ? (
                        hasViewAll ? (
                          <div 
                            className="h-8 rounded-xl border border-dashed border-border/40 flex items-center px-3 text-xs text-muted-foreground/50 hover:bg-muted/20 transition-all cursor-pointer"
                            onClick={() => {
                              setEventFormData((prev) => ({
                                ...prev,
                                eventDate: format(selectedDate, "yyyy-MM-dd"),
                                startTime: hourStr,
                              }));
                              setIsEventModalOpen(true);
                            }}
                          >
                            + متاح للجدولة
                          </div>
                        ) : (
                          <div className="h-8 rounded-xl border border-dashed border-border/20 flex items-center px-3 text-xs text-muted-foreground/30">
                            لا توجد زيارات مجدولة
                          </div>
                        )
                      ) : (
                        hourEvents.map((ev) => {
                          const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                          const Icon = conf.icon;
                          return (
                            <div
                              key={ev.id}
                              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${conf.cardBg} ${conf.border}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${conf.badgeBg} ${conf.border}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">{ev.title}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {ev.location || "بدون موقع"} • المسند إليه: {ev.assignedToName || "غير محدد"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-xs font-mono font-bold ${conf.badgeBg} ${conf.border}`}>
                                  {ev.startTime} {ev.endTime ? `- ${ev.endTime}` : ""}
                                </Badge>
                                {ev.linkUrl && (
                                  <Link href={ev.linkUrl}>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
                                      فتح <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Agenda View Mode */}
      {viewMode === "agenda" && (
        <Card className="rounded-3xl border border-border/70 shadow-xs">
          <CardHeader className="p-5 border-b border-border/60">
            <CardTitle className="text-base font-black text-foreground">
              جدول أعمال ومواعيد الشهر الكامل ({format(currentMonthDate, "MMMM yyyy", { locale: ar })})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              عرض تفصيلي لكافة المواعيد المجدولة مرتبة حسب التاريخ والوقت
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p className="text-sm font-medium">لا توجد أي مواعيد مجدولة في هذا الشهر</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {events.map((ev: any) => {
                  const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                  const Icon = conf.icon;
                  const priorityObj = PRIORITY_OPTIONS.find(p => p.value === ev.priority) || PRIORITY_OPTIONS[1];

                  return (
                    <div key={ev.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-all">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className={`p-2.5 rounded-2xl shrink-0 border ${conf.badgeBg} ${conf.border}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-foreground">{ev.title}</h4>
                            <Badge variant="outline" className={`text-[10px] font-bold ${conf.badgeBg} ${conf.border}`}>
                              {ev.typeLabel || conf.label}
                            </Badge>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityObj.color}`}>
                              {priorityObj.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ev.location || "بدون موقع"} • المسؤول: <strong className="text-foreground">{ev.assignedToName || "غير محدد"}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-left font-mono">
                          <p className="text-xs font-bold text-foreground">{ev.date}</p>
                          <p className="text-[11px] text-muted-foreground">{ev.startTime || "09:00"}</p>
                        </div>
                        {ev.linkUrl && (
                          <Link href={ev.linkUrl}>
                            <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs gap-1 text-primary border-border/70 hover:border-primary">
                              عرض <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Add / Edit Custom Event Modal Dialog (Enhanced & Expanded UI) */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-xl w-full rounded-3xl p-6 sm:p-7 border border-border/80 shadow-2xl bg-card dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center gap-3.5 text-right w-full pb-4 border-b border-border/60">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <CalendarPlus className="h-6 w-6" />
            </div>
            <div className="text-right flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-black text-foreground text-right m-0">
                {editingEventId ? "تعديل الحدث المخصص" : "إضافة حدث / مهمة مخصصة"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 text-right leading-relaxed">
                جدولة موعد أو مهمة خاصة وتحديد التوقيت والموقع
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleEventFormSubmit} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                <Tag className="h-3.5 w-3.5 text-primary" />
                عنوان الحدث أو المهمة <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                placeholder="مثال: اجتماع فريق المعاينة الفنية، جولة ميدانية لمسجد الهدى..."
                className="rounded-2xl h-11 text-sm bg-muted/20 dark:bg-muted/10 border-border/70 focus:border-primary focus:bg-background transition-all text-right"
                required
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                <AlertCircle className="h-3.5 w-3.5 text-primary" />
                مستوى الأولوية
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITY_OPTIONS.map((p) => {
                  const isSelected = eventFormData.priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setEventFormData({ ...eventFormData, priority: p.value as any })}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                        isSelected
                          ? `${p.color} ring-2 ring-primary/40 font-black shadow-xs`
                          : "bg-muted/20 dark:bg-muted/10 text-muted-foreground border-border/60 hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        p.value === 'low' ? 'bg-emerald-500' :
                        p.value === 'medium' ? 'bg-sky-500' :
                        p.value === 'high' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time in 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  التاريخ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={eventFormData.eventDate}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                  className="rounded-2xl h-11 text-xs bg-muted/20 dark:bg-muted/10 border-border/70 text-right"
                  required
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  وقت البدء
                </Label>
                <Input
                  type="time"
                  value={eventFormData.startTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, startTime: e.target.value })}
                  className="rounded-2xl h-11 text-xs bg-muted/20 dark:bg-muted/10 border-border/70 text-right"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  وقت الانتهاء
                </Label>
                <Input
                  type="time"
                  value={eventFormData.endTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, endTime: e.target.value })}
                  className="rounded-2xl h-11 text-xs bg-muted/20 dark:bg-muted/10 border-border/70 text-right"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                الموقع
              </Label>
              <Input
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                placeholder="مثال: قاعة الاجتماعات الرئيسية، مقر الجمعية، أبها..."
                className="rounded-2xl h-11 text-xs bg-muted/20 dark:bg-muted/10 border-border/70 focus:border-primary focus:bg-background transition-all text-right"
              />
            </div>

            {/* Description & Notes */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-foreground flex items-center justify-start gap-1.5 text-right">
                <FileText className="h-3.5 w-3.5 text-primary" />
                تفاصيل وملاحظات إضافية
              </Label>
              <textarea
                rows={4}
                value={eventFormData.description}
                onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                placeholder="أضف أي تفاصيل أو أهداف أو متطلبات خاصة بهذا الموعد..."
                className="w-full min-h-[110px] rounded-2xl text-xs bg-muted/20 dark:bg-muted/10 border border-border/70 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none leading-relaxed text-right p-3.5 resize-y"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEventModalOpen(false)}
                className="rounded-2xl h-11 px-6 text-xs font-bold border-border/70 hover:bg-muted/60"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                className="rounded-2xl h-11 px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm shadow-primary/25 transition-all"
              >
                {createEventMutation.isPending || updateEventMutation.isPending 
                  ? "جاري الحفظ..." 
                  : (editingEventId ? "تحديث الحدث" : "حفظ الحدث")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FieldVisitsCalendar() {
  return (
    <DashboardLayout>
      <FieldVisitsCalendarContent />
    </DashboardLayout>
  );
}
