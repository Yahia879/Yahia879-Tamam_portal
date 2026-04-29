import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface Task {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progress: number;
  status: "pending" | "in_progress" | "completed" | "delayed";
  dependencies?: number[];
  description?: string;
}

interface GanttChartProps {
  tasks: Task[];
  projectStartDate: Date;
  projectEndDate: Date;
  title?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
};

// دالة حساب التأخير بالأيام
function calculateDelay(task: Task): number {
  const today = new Date();
  const plannedEnd = new Date(task.endDate);
  
  if (task.status === "completed" && task.actualEndDate) {
    const actualEnd = new Date(task.actualEndDate);
    if (actualEnd > plannedEnd) {
      return Math.ceil((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }
  
  if (task.status === "in_progress" && today > plannedEnd) {
    return Math.ceil((today.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  return 0;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  delayed: "متأخر",
};

export function GanttChart({
  tasks,
  projectStartDate,
  projectEndDate,
  title = "مخطط جانت",
}: GanttChartProps) {
  const [viewOffset, setViewOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = أسابيع، 2 = أيام، 0.5 = أشهر

  // حساب عدد الأيام الإجمالية
  const totalDays = useMemo(() => {
    const start = new Date(projectStartDate);
    const end = new Date(projectEndDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [projectStartDate, projectEndDate]);

  // إنشاء قائمة التواريخ للعرض
  const dateColumns = useMemo(() => {
    const columns: { date: Date; label: string }[] = [];
    const start = new Date(projectStartDate);
    start.setDate(start.getDate() + viewOffset);

    const daysToShow = Math.ceil(28 / zoomLevel);
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      columns.push({
        date,
        label: date.toLocaleDateString("ar-SA", {
          day: "numeric",
          month: zoomLevel >= 1 ? "short" : undefined,
        }),
      });
    }
    return columns;
  }, [projectStartDate, viewOffset, zoomLevel]);

  // حساب موقع وعرض شريط المهمة
  const getTaskPosition = (task: Task) => {
    const start = new Date(projectStartDate);
    start.setDate(start.getDate() + viewOffset);
    const viewStart = start.getTime();
    const viewEnd = new Date(start);
    viewEnd.setDate(viewEnd.getDate() + Math.ceil(28 / zoomLevel));
    const viewEndTime = viewEnd.getTime();

    const taskStart = new Date(task.startDate).getTime();
    const taskEnd = new Date(task.endDate).getTime();

    // إذا كانت المهمة خارج نطاق العرض
    if (taskEnd < viewStart || taskStart > viewEndTime) {
      return { visible: false, left: 0, width: 0 };
    }

    const visibleStart = Math.max(taskStart, viewStart);
    const visibleEnd = Math.min(taskEnd, viewEndTime);

    const viewDuration = viewEndTime - viewStart;
    const left = ((visibleStart - viewStart) / viewDuration) * 100;
    const width = ((visibleEnd - visibleStart) / viewDuration) * 100;

    return { visible: true, left, width };
  };

  const handlePrev = () => {
    setViewOffset((prev) => Math.max(0, prev - 7));
  };

  const handleNext = () => {
    setViewOffset((prev) => Math.min(totalDays - 28, prev + 7));
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2, prev * 1.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, prev / 1.5));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* مفتاح الألوان */}
        <div className="flex gap-4 mb-4 text-sm">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${STATUS_COLORS[key]}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* رأس التواريخ */}
            <div className="flex border-b">
              <div className="w-48 flex-shrink-0 p-2 font-medium border-l bg-muted">
                المهمة
              </div>
              <div className="flex-1 flex">
                {dateColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className="flex-1 p-1 text-center text-xs border-l bg-muted"
                    style={{ minWidth: `${100 / dateColumns.length}%` }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* صفوف المهام */}
            {tasks.map((task) => {
              const position = getTaskPosition(task);
              return (
                <div key={task.id} className="flex border-b hover:bg-muted/50">
                  <div className="w-48 flex-shrink-0 p-2 border-l flex items-center gap-2">
                    <span className="truncate text-sm">{task.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        task.status === "completed"
                          ? "border-green-500 text-green-600"
                          : task.status === "delayed"
                          ? "border-red-500 text-red-600"
                          : ""
                      }`}
                    >
                      {task.progress}%
                    </Badge>
                  </div>
                  <div className="flex-1 relative h-10">
                    {/* خطوط الشبكة */}
                    <div className="absolute inset-0 flex">
                      {dateColumns.map((_, idx) => (
                        <div
                          key={idx}
                          className="flex-1 border-l border-dashed border-gray-200"
                        />
                      ))}
                    </div>

                    {/* شريط المهمة */}
                    {position.visible && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-2 h-6 rounded ${STATUS_COLORS[task.status]} cursor-pointer transition-all hover:opacity-80`}
                            style={{
                              left: `${position.left}%`,
                              width: `${Math.max(position.width, 2)}%`,
                            }}
                          >
                            {/* شريط التقدم */}
                            <div
                              className="h-full bg-white/30 rounded-r"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm space-y-1">
                            <p className="font-medium">{task.name}</p>
                            <div className="border-t pt-1 mt-1">
                              <p className="text-muted-foreground">التواريخ المخططة:</p>
                              <p>
                                من:{" "}
                                {new Date(task.startDate).toLocaleDateString(
                                  "ar-SA"
                                )}
                              </p>
                              <p>
                                إلى:{" "}
                                {new Date(task.endDate).toLocaleDateString(
                                  "ar-SA"
                                )}
                              </p>
                            </div>
                            {(task.actualStartDate || task.actualEndDate) && (
                              <div className="border-t pt-1 mt-1">
                                <p className="text-muted-foreground">التواريخ الفعلية:</p>
                                {task.actualStartDate && (
                                  <p>
                                    بدأ:{" "}
                                    {new Date(task.actualStartDate).toLocaleDateString(
                                      "ar-SA"
                                    )}
                                  </p>
                                )}
                                {task.actualEndDate && (
                                  <p>
                                    انتهى:{" "}
                                    {new Date(task.actualEndDate).toLocaleDateString(
                                      "ar-SA"
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="border-t pt-1 mt-1">
                              <p>الإنجاز: {task.progress}%</p>
                              <p>الحالة: {STATUS_LABELS[task.status]}</p>
                              {calculateDelay(task) > 0 && (
                                <p className="text-red-500 font-medium">
                                  تأخير: {calculateDelay(task)} يوم
                                </p>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-muted-foreground text-xs border-t pt-1 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}

            {/* إذا لم توجد مهام */}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد مهام لعرضها في مخطط جانت
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GanttChart;
