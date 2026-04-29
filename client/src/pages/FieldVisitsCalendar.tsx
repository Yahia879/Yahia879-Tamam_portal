import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Calendar as CalendarIcon, AlertTriangle, Clock, MapPin, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROGRAM_LABELS } from "../../../shared/constants";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

const PROGRAM_COLORS: Record<string, string> = {
  bunyan: "bg-blue-600",
  daaem: "bg-emerald-500",
  enaya: "bg-violet-500",
  emdad: "bg-orange-500",
  ethraa: "bg-rose-500",
  sedana: "bg-teal-500",
  taqa: "bg-amber-400",
  miyah: "bg-sky-500",
  suqya: "bg-indigo-500",
};

// ألوان خلفية البطاقات للبرامج (أفتح)
const PROGRAM_BG_COLORS: Record<string, string> = {
  bunyan: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  daaem: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  enaya: "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  emdad: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  ethraa: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800",
  sedana: "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800",
  taqa: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  miyah: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
  suqya: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800",
};

// ألوان النص للبرامج
const PROGRAM_TEXT_COLORS: Record<string, string> = {
  bunyan: "text-blue-700 dark:text-blue-300",
  daaem: "text-emerald-700 dark:text-emerald-300",
  enaya: "text-violet-700 dark:text-violet-300",
  emdad: "text-orange-700 dark:text-orange-300",
  ethraa: "text-rose-700 dark:text-rose-300",
  sedana: "text-teal-700 dark:text-teal-300",
  taqa: "text-amber-700 dark:text-amber-300",
  miyah: "text-sky-700 dark:text-sky-300",
  suqya: "text-indigo-700 dark:text-indigo-300",
};

function FieldVisitsCalendarContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentMonth = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: currentMonth, end: monthEnd });

  // Fetch field visits
  const { data: visits = [], isLoading } = trpc.requests.getScheduledVisits.useQuery({});

  // Group visits by date
  const visitsByDate = visits.reduce((acc: Record<string, typeof visits>, visit: any) => {
    if (visit.scheduledDate) {
      const dateKey = format(new Date(visit.scheduledDate), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(visit);
    }
    return acc;
  }, {});

  // Detect conflicts (multiple visits at the same time)
  const conflicts = visits.filter((visit: any, index: number) => {
    if (!visit.scheduledDate || !visit.scheduledTime) return false;
    return visits.some((other: any, otherIndex: number) => {
      if (index >= otherIndex) return false;
      if (!other.scheduledDate || !other.scheduledTime) return false;
      return (
        format(new Date(visit.scheduledDate), 'yyyy-MM-dd') === format(new Date(other.scheduledDate), 'yyyy-MM-dd') &&
        visit.scheduledTime === other.scheduledTime &&
        visit.assignedToId === other.assignedToId
      );
    });
  });

  const hasConflicts = conflicts.length > 0;

  // Get visits for selected date
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateVisits = visitsByDate[selectedDateKey] || [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">جدول الزيارات الميدانية</h1>
          <p className="text-muted-foreground">عرض تقويمي للزيارات المجدولة مع كشف التعارضات</p>
        </div>
      </div>

      {/* Conflicts Alert */}
      {hasConflicts && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">تنبيه: تعارض في المواعيد</h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  يوجد {conflicts.length} زيارة متداخلة في نفس الوقت. يرجى مراجعة الجدول وتعديل المواعيد.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate, 'MMMM yyyy', { locale: ar })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {daysInMonth.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayVisits = visitsByDate[dateKey] || [];
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const hasVisits = dayVisits.length > 0;
                const visitCount = dayVisits.length;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative p-2 rounded-xl border-2 transition-all duration-200 min-h-[60px] flex flex-col items-center justify-start gap-1
                      ${isSelected 
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                        : isToday
                          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                          : hasVisits 
                            ? 'border-teal-200 bg-gradient-to-b from-teal-50 to-white dark:from-teal-950/30 dark:to-transparent hover:border-teal-400 hover:shadow-sm'
                            : 'border-transparent hover:bg-accent hover:border-border'
                      }
                    `}
                  >
                    <div className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                      ${isSelected ? 'text-primary-foreground' : isToday ? 'bg-primary text-primary-foreground' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>
                    {hasVisits && (
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <div className="flex justify-center gap-0.5 flex-wrap">
                          {dayVisits.slice(0, 4).map((visit: any, i: number) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${PROGRAM_COLORS[visit.programType] || 'bg-gray-400'} ${isSelected ? 'opacity-80' : ''}`}
                            />
                          ))}
                        </div>
                        {visitCount > 0 && (
                          <span className={`text-[9px] font-bold leading-none
                            ${isSelected ? 'text-primary-foreground/80' : 'text-teal-600 dark:text-teal-400'}
                          `}>
                            {visitCount > 4 ? `+${visitCount}` : visitCount === 1 ? '1 زيارة' : `${visitCount}`}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              زيارات {format(selectedDate, 'dd MMMM', { locale: ar })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateVisits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد زيارات مجدولة في هذا اليوم</p>
            ) : (
              <div className="space-y-3">
                {selectedDateVisits.map((visit: any) => (
                  <Link key={visit.id} href={`/requests/${visit.id}`}>
                    <Card className={`hover:shadow-md transition-all cursor-pointer border-2 ${PROGRAM_BG_COLORS[visit.programType] || 'border-border'}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${PROGRAM_COLORS[visit.programType] || 'bg-gray-400'}`} />
                            <span className={`text-sm font-semibold ${PROGRAM_TEXT_COLORS[visit.programType] || 'text-foreground'}`}>
                              {PROGRAM_LABELS[visit.programType as keyof typeof PROGRAM_LABELS]}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">{visit.requestNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className={`h-4 w-4 ${PROGRAM_TEXT_COLORS[visit.programType] || 'text-muted-foreground'}`} />
                          <span>{visit.scheduledTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{visit.mosqueName} - {visit.mosqueCity}</span>
                        </div>
                        {visit.assignedToName && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{visit.assignedToName}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Visits List */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الزيارات المجدولة ({visits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد زيارات مجدولة</p>
          ) : (
            <div className="space-y-2">
              {visits.map((visit: any) => {
                const isConflict = conflicts.some((c: any) => c.id === visit.id);
                const bgColor = isConflict 
                  ? 'border-red-300 bg-red-50 dark:bg-red-950/10' 
                  : (PROGRAM_BG_COLORS[visit.programType] || 'border-border');
                return (
                  <Link key={visit.id} href={`/requests/${visit.id}`}>
                    <Card className={`hover:shadow-md transition-all cursor-pointer border-2 ${bgColor}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isConflict && <AlertTriangle className="h-5 w-5 text-red-600" />}
                            <div className={`w-3 h-3 rounded-full shrink-0 ${PROGRAM_COLORS[visit.programType] || 'bg-gray-400'}`} />
                            <span className={`text-sm font-semibold ${PROGRAM_TEXT_COLORS[visit.programType] || 'text-foreground'}`}>
                              {PROGRAM_LABELS[visit.programType as keyof typeof PROGRAM_LABELS]}
                            </span>
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{visit.requestNumber}</span>
                            <span className="text-sm font-medium">{visit.mosqueName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {visit.scheduledDate && format(new Date(visit.scheduledDate), 'dd/MM/yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {visit.scheduledTime}
                            </div>
                            {visit.assignedToName && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {visit.assignedToName}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
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
