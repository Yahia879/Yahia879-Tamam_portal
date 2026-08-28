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
  AlertTriangle, 
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
  Layers
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

// تصنيفات المواعيد وألوانها
const TRACK_CONFIG = {
  all: {
    label: "الكل",
    color: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
    border: "border-slate-300 dark:border-slate-700",
    dot: "bg-slate-500",
  },
  field_visit: {
    label: "زيارة ميدانية",
    shortLabel: "زيارة",
    icon: MapPin,
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300",
    border: "border-purple-300 dark:border-purple-800",
    dot: "bg-purple-600 dark:bg-purple-400",
    cardBg: "bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
  },
  quick_response: {
    label: "استجابة سريعة",
    shortLabel: "استجابة",
    icon: Zap,
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800",
    dot: "bg-amber-500 dark:bg-amber-400",
    cardBg: "bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
  },
  final_report: {
    label: "تقرير ختامي",
    shortLabel: "ختامي",
    icon: FileText,
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-600 dark:bg-emerald-400",
    cardBg: "bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30",
  },
  custom: {
    label: "حدث مخصص",
    shortLabel: "مخصص",
    icon: Sparkles,
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-800",
    dot: "bg-blue-600 dark:bg-blue-400",
    cardBg: "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30",
  },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  medium: { label: "متوسطة", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  high: { label: "عالية", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  urgent: { label: "عاجلة جداً", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

function FieldVisitsCalendarContent() {
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
    assignedTo: "",
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
  const { data: staffUsers = [] } = trpc.users.getStaffUsers.useQuery();

  // جلب المواعيد الموحدة
  const { 
    data: events = [], 
    isLoading: isLoadingEvents,
    refetch: refetchEvents
  } = trpc.calendar.getUnifiedEvents.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
    eventType: selectedTrack,
    assignedTo: selectedStaffId !== "all" ? Number(selectedStaffId) : undefined,
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
      assignedTo: "",
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
        assignedTo: eventFormData.assignedTo ? Number(eventFormData.assignedTo) : undefined,
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
        assignedTo: eventFormData.assignedTo ? Number(eventFormData.assignedTo) : undefined,
        location: eventFormData.location || undefined,
        priority: eventFormData.priority,
      });
    }
  };

  // تجميع المواعيد حسب التاريخ
  const eventsByDate = useMemo(() => {
    return events.reduce((acc: Record<string, typeof events>, ev: any) => {
      if (ev.date) {
        if (!acc[ev.date]) acc[ev.date] = [];
        acc[ev.date].push(ev);
      }
      return acc;
    }, {});
  }, [events]);

  // فحص التعارضات
  const conflicts = useMemo(() => {
    return events.filter((ev: any, index: number) => {
      if (!ev.date || !ev.startTime || !ev.assignedToId) return false;
      return events.some((other: any, otherIndex: number) => {
        if (index >= otherIndex) return false;
        if (!other.date || !other.startTime || !other.assignedToId) return false;
        return (
          ev.type === other.type &&
          ev.date === other.date &&
          ev.startTime === other.startTime &&
          ev.assignedToId === other.assignedToId
        );
      });
    });
  }, [events]);

  // المواعيد لليوم المحدد
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDateEvents = eventsByDate[selectedDateKey] || [];

  // التنقل بين الشهور
  const nextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1));
  const prevMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonthDate(today);
    setSelectedDate(today);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-6 rounded-3xl border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">تقويم المواعيد والزيارات الموحد</h1>
              <p className="text-sm text-muted-foreground mt-1">
                لوحة مركزية لجدولة ومتابعة الزيارات الميدانية، الاستجابة السريعة، التقارير الختامية، والأحداث المخصصة
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={goToToday}
            variant="outline"
            className="rounded-xl font-bold border-border hover:bg-muted"
          >
            اليوم
          </Button>

          {/* View Switcher */}
          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "month" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "timeline" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              جدول زمني
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "agenda" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              قائمة
            </button>
          </div>

          <Button
            onClick={handleOpenNewEventModal}
            className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            إضافة حدث مخصص
          </Button>
        </div>
      </div>

      {/* 2. Top Stats KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Field Visits */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "field_visit" ? "all" : "field_visit")}
          className={`cursor-pointer transition-all border rounded-2xl hover:shadow-md ${
            selectedTrack === "field_visit" ? "ring-2 ring-purple-500 bg-purple-50/40 dark:bg-purple-950/30" : "bg-card"
          }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الزيارات الميدانية</p>
              <h3 className="text-xl font-black text-purple-700 dark:text-purple-300">{stats?.fieldVisits ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Quick Response */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "quick_response" ? "all" : "quick_response")}
          className={`cursor-pointer transition-all border rounded-2xl hover:shadow-md ${
            selectedTrack === "quick_response" ? "ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30" : "bg-card"
          }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الاستجابة السريعة</p>
              <h3 className="text-xl font-black text-amber-700 dark:text-amber-300">{stats?.quickResponse ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Final Reports */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "final_report" ? "all" : "final_report")}
          className={`cursor-pointer transition-all border rounded-2xl hover:shadow-md ${
            selectedTrack === "final_report" ? "ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30" : "bg-card"
          }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">التقرير الختامي</p>
              <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300">{stats?.finalReports ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Custom Events */}
        <Card 
          onClick={() => setSelectedTrack(selectedTrack === "custom" ? "all" : "custom")}
          className={`cursor-pointer transition-all border rounded-2xl hover:shadow-md ${
            selectedTrack === "custom" ? "ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30" : "bg-card"
          }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الأحداث المخصصة</p>
              <h3 className="text-xl font-black text-blue-700 dark:text-blue-300">{stats?.customEvents ?? 0}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Today's Events */}
        <Card 
          onClick={goToToday}
          className="cursor-pointer transition-all border rounded-2xl hover:shadow-md bg-gradient-to-br from-primary/5 via-card to-card border-primary/20 col-span-2 sm:col-span-1"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">مواعيد اليوم</p>
              <h3 className="text-xl font-black text-primary">{stats?.todayCount ?? 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filters Toolbar */}
      <Card className="rounded-2xl border shadow-sm">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border"
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
              {/* Staff Select */}
              <div className="w-full sm:w-56">
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="rounded-xl h-9 text-xs">
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

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم الطلب، المسجد..."
                  className="pr-9 h-9 text-xs rounded-xl"
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

      {/* 4. Conflict Notification (if any) */}
      {conflicts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/80 dark:bg-rose-950/30 dark:border-rose-900/50 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">تنبيه: تم رصد تعارض في المواعيد!</h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                يوجد {conflicts.length} موعد متداخل لنفس الموظف في نفس التوقيت. يرجى مراجعة المواعيد المحددة أدناه لتعديلها.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Main Calendar & Details Grid */}
      {viewMode === "month" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 cols) */}
          <Card className="lg:col-span-8 rounded-3xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-black font-mono">
                  {format(currentMonthDate, "MMMM yyyy", { locale: ar })}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-xl"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-xl"
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
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                            : isToday
                            ? "border-primary/50 bg-primary/[0.03] hover:border-primary"
                            : hasEvents
                            ? "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40"
                            : "border-border/40 bg-card/50 hover:bg-muted/30 text-muted-foreground"
                        }
                      `}
                    >
                      {/* Day Number + Today Badge */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : isSelected
                              ? "bg-primary/20 text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {hasEvents && (
                          <span className="text-[10px] font-bold font-mono text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
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
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 border ${conf.badgeBg} ${conf.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
                              <span className="truncate">{ev.startTime} {ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] text-muted-foreground font-bold text-center">
                            +{dayEvents.length - 2} المزيد
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details Panel (4 cols) */}
          <Card className="lg:col-span-4 rounded-3xl border shadow-sm flex flex-col">
            <CardHeader className="p-5 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    {format(selectedDate, "EEEE، dd MMMM yyyy", { locale: ar })}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {selectedDateEvents.length} موعد مجدول في هذا اليوم
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenNewEventModal}
                  className="rounded-xl h-8 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  حدث
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-3">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="p-3 rounded-2xl bg-muted w-fit mx-auto text-muted-foreground">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">لا توجد مواعيد مجدولة في هذا اليوم</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenNewEventModal}
                    className="rounded-xl text-xs"
                  >
                    + جدولة موعد أو حدث مخصص
                  </Button>
                </div>
              ) : (
                selectedDateEvents.map((ev: any) => {
                  const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                  const Icon = conf.icon;
                  const isCustom = ev.type === "custom";

                  return (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-2xl border transition-all ${conf.cardBg} ${conf.border}`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg ${conf.badgeBg}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-bold">{ev.typeLabel}</span>
                        </div>
                        {ev.requestNumber && (
                          <span className="font-mono text-[10px] bg-card px-2 py-0.5 rounded-md border font-bold">
                            {ev.requestNumber}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold mt-2 text-foreground">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                      )}

                      {/* Meta information */}
                      <div className="space-y-1.5 mt-3 pt-2.5 border-t border-border/60 text-xs">
                        {/* Time */}
                        <div className="flex items-center gap-2 text-muted-foreground font-mono">
                          <Clock className="h-3.5 w-3.5 text-foreground shrink-0" />
                          <span>
                            {ev.startTime} {ev.endTime ? ` - ${ev.endTime}` : ""}
                          </span>
                        </div>

                        {/* Location / Mosque */}
                        {(ev.mosqueName || ev.location) && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-foreground shrink-0" />
                            <span className="truncate">{ev.location || ev.mosqueName}</span>
                          </div>
                        )}

                        {/* Assigned Staff */}
                        {ev.assignedToName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5 text-foreground shrink-0" />
                            <span className="truncate">المسؤول: {ev.assignedToName}</span>
                          </div>
                        )}

                        {/* Contact Person */}
                        {ev.contactPhone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-foreground shrink-0" />
                            <a href={`tel:${ev.contactPhone}`} className="hover:underline text-primary font-mono truncate">
                              {ev.contactName ? `${ev.contactName} (${ev.contactPhone})` : ev.contactPhone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border/60">
                        {ev.linkUrl && (
                          <Link href={ev.linkUrl}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg gap-1">
                              <span>فتح الطلب</span>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}

                        {isCustom && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditEventModal(ev)}
                              className="h-7 text-xs rounded-lg gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-3 w-3" />
                              <span>تعديل</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف هذا الحدث؟")) {
                                  deleteEventMutation.mutate({ id: ev.rawId });
                                }
                              }}
                              className="h-7 text-xs rounded-lg gap-1 text-rose-600 hover:text-rose-700"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>حذف</span>
                            </Button>
                          </>
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

      {/* 6. Timeline View */}
      {viewMode === "timeline" && (
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="p-6 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black">
                  الجدول الزمني ليوم {format(selectedDate, "EEEE، dd MMMM yyyy", { locale: ar })}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  توزيع المواعيد والزيارات على مدار ساعات العمل
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(subMonths(selectedDate, 0))}
                  className="rounded-xl text-xs"
                >
                  تغيير اليوم من التقويم
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[
                "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
                "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
              ].map((hour) => {
                const hourEvents = selectedDateEvents.filter(
                  (e: any) => e.startTime?.startsWith(hour.split(":")[0])
                );

                return (
                  <div key={hour} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0">
                    <div className="w-16 pt-1 text-xs font-mono font-bold text-muted-foreground text-left">
                      {hour}
                    </div>
                    <div className="flex-1 space-y-2">
                      {hourEvents.length === 0 ? (
                        <div className="p-2 rounded-xl bg-muted/20 border border-dashed text-xs text-muted-foreground/60">
                          لا توجد مواعيد مجدولة
                        </div>
                      ) : (
                        hourEvents.map((ev: any) => {
                          const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                          return (
                            <div
                              key={ev.id}
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${conf.cardBg} ${conf.border}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`p-2 rounded-lg ${conf.badgeBg}`}>
                                  {<conf.icon className="h-4 w-4" />}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold">{ev.title}</span>
                                    {ev.requestNumber && (
                                      <span className="text-[10px] font-mono bg-card px-1.5 py-0.5 rounded border">
                                        {ev.requestNumber}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    المسؤول: {ev.assignedToName} {ev.location ? `• ${ev.location}` : ""}
                                  </p>
                                </div>
                              </div>
                              {ev.linkUrl && (
                                <Link href={ev.linkUrl}>
                                  <Button size="sm" variant="outline" className="rounded-lg text-xs h-8">
                                    عرض التفاصيل
                                  </Button>
                                </Link>
                              )}
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

      {/* 7. Agenda / List View */}
      {viewMode === "agenda" && (
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="p-6 border-b">
            <CardTitle className="text-xl font-black">
              كافة مواعيد الشهر ({events.length})
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              عرض مجدول لجميع المهام والزيارات لشهر {format(currentMonthDate, "MMMM yyyy", { locale: ar })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm font-medium">لا توجد مواعيد تطابق الفلاتر المحددة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev: any) => {
                  const conf = TRACK_CONFIG[ev.type as keyof typeof TRACK_CONFIG] || TRACK_CONFIG.custom;
                  const Icon = conf.icon;
                  return (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${conf.cardBg} ${conf.border}`}
                    >
                      <div className="flex items-start md:items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${conf.badgeBg} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`rounded-lg text-[10px] ${conf.badgeBg}`}>
                              {ev.typeLabel}
                            </Badge>
                            {ev.requestNumber && (
                              <span className="font-mono text-xs bg-card px-2 py-0.5 rounded border font-bold">
                                {ev.requestNumber}
                              </span>
                            )}
                            <span className="text-sm font-bold">{ev.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ev.location || ev.mosqueName} • المسؤول: {ev.assignedToName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0">
                        <div className="text-left font-mono text-xs font-bold text-muted-foreground">
                          <div>{ev.date}</div>
                          <div>{ev.startTime}</div>
                        </div>
                        {ev.linkUrl && (
                          <Link href={ev.linkUrl}>
                            <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                              التفاصيل
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

      {/* 8. Add / Edit Custom Event Modal Dialog */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingEventId ? "تعديل الحدث المخصص" : "إضافة حدث / مهمة مخصصة"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              جدولة حدث أو اجتماع أو معاينة خاصة مع إسنادها للموظف المسؤول
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEventFormSubmit} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">عنوان الحدث / المهمة *</Label>
              <Input
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                placeholder="مثال: اجتماع فريق المعاينة، زيارة تفقدية خاصة..."
                className="rounded-xl"
              />
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">نوع الحدث</Label>
                <Select
                  value={eventFormData.eventType}
                  onValueChange={(val) => setEventFormData({ ...eventFormData, eventType: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">اجتماع عمل</SelectItem>
                    <SelectItem value="inspection">معاينة خاصة</SelectItem>
                    <SelectItem value="follow_up">متابعة دورية</SelectItem>
                    <SelectItem value="task">مهمة ميدانية</SelectItem>
                    <SelectItem value="custom">حدث مخصص</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الأولوية</Label>
                <Select
                  value={eventFormData.priority}
                  onValueChange={(val: any) => setEventFormData({ ...eventFormData, priority: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة جداً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">التاريخ *</Label>
                <Input
                  type="date"
                  value={eventFormData.eventDate}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">وقت البداية</Label>
                <Input
                  type="time"
                  value={eventFormData.startTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, startTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">وقت الانتهاء</Label>
                <Input
                  type="time"
                  value={eventFormData.endTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, endTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Assigned Staff */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الموظف المسؤول</Label>
              <Select
                value={eventFormData.assignedTo}
                onValueChange={(val) => setEventFormData({ ...eventFormData, assignedTo: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الموظف المسند إليه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون إسناد</SelectItem>
                  {staffUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الموقع أو المسجد</Label>
              <Input
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                placeholder="مثال: قاعة الاجتماعات، مسجد الهدى..."
                className="rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تفاصيل وملاحظات</Label>
              <Textarea
                rows={3}
                value={eventFormData.description}
                onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                placeholder="أي تفاصيل أو متطلبات خاصة بالحدث..."
                className="rounded-xl resize-none"
              />
            </div>

            <DialogFooter className="gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEventModalOpen(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                className="rounded-xl bg-primary text-primary-foreground font-bold"
              >
                {createEventMutation.isPending || updateEventMutation.isPending ? "جاري الحفظ..." : "حفظ الحدث"}
              </Button>
            </DialogFooter>
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
