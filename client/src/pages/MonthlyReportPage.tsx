import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { ReportHeaderTabs } from "@/components/project-reports/ReportHeaderTabs";
import { RagIndicatorSelect } from "@/components/project-reports/RagIndicatorSelect";
import { DynamicArrayTable, ColumnDef } from "@/components/project-reports/DynamicArrayTable";
import { ReportPrintPreviewModal } from "@/components/project-reports/ReportPrintPreviewModal";
import { STAGE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Calendar, Building2, User, Layers, Sparkles, Wand2, FileSpreadsheet, CheckCircle2, RefreshCw, Save, Eye, Printer, AlertCircle, ArrowRight } from "lucide-react";

const formatToInputDate = (val: any): string => {
  if (!val) return "";
  try {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      return val.trim();
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

const getArabicMonthName = (monthStr: string) => {
  const m = parseInt(monthStr, 10);
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  return months[m - 1] || "";
};

const formatDateToReadableArabic = (dateVal: any): string => {
  if (!dateVal) return "";
  try {
    if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      const [y, m, d] = dateVal.trim().split("-");
      const monthName = getArabicMonthName(m);
      return `${parseInt(d, 10)} ${monthName} ${y}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = d.getDate();
    const monthName = getArabicMonthName(String(d.getMonth() + 1));
    const year = d.getFullYear();
    return `${day} ${monthName} ${year}`;
  } catch {
    return String(dateVal);
  }
};

export default function MonthlyReportPage({ showLayout = true }: { showLayout?: boolean }) {
  const [, setLocation] = useLocation();
  const createMutation = trpc.progressReports.create.useMutation();
  const updateMutation = trpc.progressReports.update.useMutation();
  const updateStatusMutation = trpc.progressReports.updateStatus.useMutation();

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const editIdParam = searchParams.get("editId");
  const editId = editIdParam ? parseInt(editIdParam, 10) : undefined;

  const { data: existingReport } = trpc.progressReports.getById.useQuery(
    { id: editId || 0 },
    { enabled: !!editId }
  );

  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();
  const { data: dbReports } = trpc.progressReports.list.useQuery();

  const projectOptions = useMemo(() => {
    if (dbProjectsData && dbProjectsData.length > 0) {
      return dbProjectsData
        .filter((p: any) => {
          if (p.programType === "bunyan") return true;
          if (p.startDate && (p.expectedEndDate || p.endDate)) {
            const start = new Date(p.startDate).getTime();
            const end = new Date(p.expectedEndDate || p.endDate).getTime();
            if (!isNaN(start) && !isNaN(end)) {
              const days = (end - start) / (1000 * 60 * 60 * 24);
              if (days >= 365) return true;
            }
          }
          return false;
        })
        .map((p: any) => {
          const rawStage = p.requestStage || p.status || "execution";
          const arabicPhase = STAGE_LABELS[rawStage] || rawStage;
          let parsedMilestones: any[] = [];
          if (p.milestones) {
            try {
              parsedMilestones = typeof p.milestones === "string" ? JSON.parse(p.milestones) : p.milestones;
            } catch {}
          }
          return {
            id: String(p.id),
            name: p.name || `مشروع رقم ${p.projectNumber}`,
            manager: p.managerName || "غير محدد",
            department: "إدارة المشاريع",
            currentPhase: arabicPhase,
            plannedProgress: p.plannedProgress ?? 0,
            actualProgress: p.completionPercentage ?? 0,
            milestones: parsedMilestones,
            startDate: p.startDate ? new Date(p.startDate) : (p.createdAt ? new Date(p.createdAt) : null),
            endDate: p.expectedEndDate || p.endDate ? new Date(p.expectedEndDate || p.endDate) : null,
            durationMonths: p.durationMonths || p.durationInMonths || null,
          };
        });
    }
    return [];
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectManager, setProjectManager] = useState<string>("غير محدد");
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");
  const monthYear = periodFrom && periodTo ? `من ${periodFrom} إلى ${periodTo}` : "";
  const [reportDate, setReportDate] = useState<string>(formatToInputDate(new Date()));
  const [currentPhase, setCurrentPhase] = useState<string>("التنفيذ");
  const [challenges, setChallenges] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string>("");
  const [nextSteps, setNextSteps] = useState<string>("");

  const selectedProj = useMemo(() => {
    return projectOptions.find((p) => String(p.id) === String(selectedProjectId));
  }, [projectOptions, selectedProjectId]);

  const selectedProjName = selectedProj?.name || "المشروع";

  const existingProjectReportPeriods = useMemo(() => {
    if (!dbReports || !selectedProjectId) return new Set<string>();
    const pid = parseInt(selectedProjectId, 10);
    const set = new Set<string>();
    dbReports.forEach((r: any) => {
      if (r.projectId === pid && r.reportPeriodStart && r.reportPeriodEnd) {
        const fromStr = formatToInputDate(r.reportPeriodStart);
        const toStr = formatToInputDate(r.reportPeriodEnd);
        if (fromStr && toStr) {
          if (!editId || r.id !== editId) {
            set.add(`${fromStr}_${toStr}`);
          }
        }
      }
    });
    return set;
  }, [dbReports, selectedProjectId, editId]);

  const projectMonthlyPeriods = useMemo(() => {
    if (!selectedProj) return [];

    let start: Date;
    let end: Date;

    const startVal = selectedProj.startDate;
    const endVal = selectedProj.endDate;

    if (startVal) {
      const parsedStart = new Date(startVal);
      if (!isNaN(parsedStart.getTime())) {
        start = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), parsedStart.getDate());
      } else {
        start = new Date(new Date().getFullYear(), 0, 1);
      }
    } else {
      start = new Date(new Date().getFullYear(), 0, 1);
    }

    if (endVal) {
      const parsedEnd = new Date(endVal);
      if (!isNaN(parsedEnd.getTime()) && parsedEnd >= start) {
        end = new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), parsedEnd.getDate());
      } else {
        end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
      }
    } else {
      end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const periods: { label: string; from: string; to: string; periodNum: number; readableLabel: string }[] = [];
    let currStart = new Date(start);
    let periodNum = 1;

    while (periodNum <= 36) {
      const currEnd = new Date(currStart.getTime() + 29 * 24 * 60 * 60 * 1000);

      // عدم إضافة فترة جديدة إذا كانت لا تستوفي 30 يوماً كاملة ضمن زمن المشروع
      if (currEnd > end) {
        break;
      }

      const fromStr = formatToInputDate(currStart);
      const toStr = formatToInputDate(currEnd);
      const fromArabic = formatDateToReadableArabic(fromStr);
      const toArabic = formatDateToReadableArabic(toStr);

      periods.push({
        label: `الشهر ${periodNum} (من ${fromStr} إلى ${toStr})`,
        readableLabel: `الشهر ${periodNum} (من ${fromArabic} إلى ${toArabic})`,
        from: fromStr,
        to: toStr,
        periodNum,
      });

      currStart = new Date(currStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      periodNum++;
    }

    return periods;
  }, [selectedProj]);

  useEffect(() => {
    if (selectedProjectId && projectMonthlyPeriods.length > 0 && !existingReport) {
      const availablePeriod = projectMonthlyPeriods.find(
        (p) => !existingProjectReportPeriods.has(`${p.from}_${p.to}`)
      );
      if (availablePeriod) {
        setPeriodFrom(availablePeriod.from);
        setPeriodTo(availablePeriod.to);
        setReportDate(availablePeriod.to);
      } else {
        const first = projectMonthlyPeriods[0];
        setPeriodFrom(first.from);
        setPeriodTo(first.to);
        setReportDate(first.to);
      }
    }
  }, [selectedProjectId, projectMonthlyPeriods, existingReport, existingProjectReportPeriods]);

  useEffect(() => {
    if (existingReport) {
      if (existingReport.projectId) setSelectedProjectId(String(existingReport.projectId));
      if (existingReport.plannedProgress !== null && existingReport.plannedProgress !== undefined) {
        setPlannedProgress(existingReport.plannedProgress);
      }
      if (existingReport.actualProgress !== null && existingReport.actualProgress !== undefined) {
        setActualProgress(existingReport.actualProgress);
      }
      if (existingReport.reportPeriodStart) setPeriodFrom(formatToInputDate(existingReport.reportPeriodStart));
      if (existingReport.reportPeriodEnd) setPeriodTo(formatToInputDate(existingReport.reportPeriodEnd));
      if (existingReport.status) {
        setReportStatus(
          existingReport.status === "approved" ? "معتمد" : existingReport.status === "submitted" ? "تم الاطلاع" : "مسودة"
        );
      }
      if (existingReport.challenges) setChallenges(existingReport.challenges);
      if (existingReport.recommendations) setRecommendations(existingReport.recommendations);
      if (existingReport.nextSteps) setNextSteps(existingReport.nextSteps);
      if (existingReport.attachments) {
        try {
          const parsed = typeof existingReport.attachments === "string" ? JSON.parse(existingReport.attachments) : existingReport.attachments;
          if (Array.isArray(parsed)) setAttachments(parsed);
        } catch {}
      }
    }
  }, [existingReport]);

  const [entryMode, setEntryMode] = useState<"manual" | "aggregate">("manual");
  const [selectedSemiId, setSelectedSemiId] = useState<string>("");
  const [isAggregated, setIsAggregated] = useState<boolean>(false);

  const availableSemiReports = useMemo(() => {
    if (!dbReports) return [];
    return dbReports
      .filter((r) => {
        if (Number(r.projectId) !== Number(selectedProjectId)) return false;
        const titleLower = (r.title || "").toLowerCase();
        return titleLower.includes("نصف") || titleLower.includes("semi");
      })
      .map((r) => {
        const rawStart = r.reportPeriodStart || r.reportDate;
        const rawEnd = r.reportPeriodEnd || r.reportDate;
        const startIso = rawStart ? formatToInputDate(rawStart) : "";
        const endIso = rawEnd ? formatToInputDate(rawEnd) : "";
        const startStr = startIso ? formatDateToReadableArabic(startIso) : "";
        const endStr = endIso ? formatDateToReadableArabic(endIso) : "";

        return {
          id: String(r.id),
          title: r.title,
          projectId: String(r.projectId),
          actualProgress: r.actualProgress || 0,
          plannedProgress: r.plannedProgress || 0,
          reportPeriodStart: r.reportPeriodStart,
          reportPeriodEnd: r.reportPeriodEnd,
          reportDate: r.reportDate,
          startIso,
          endIso,
          period: startStr && endStr ? `من ${startStr} إلى ${endStr}` : "فترة غير محددة",
          startStr,
          endStr,
          milestones: [],
        };
      });
  }, [dbReports, selectedProjectId]);

  const [selectedBlockKey, setSelectedBlockKey] = useState<string>("");

  // تقسيم التقارير النصف شهرية إلى فترات شهرية تجميعية (كل 2 تقارير نصف شهرية تقع ضمن فترة الشهر للمشروع)
  const semiMonthlyBlocks = useMemo(() => {
    if (!projectMonthlyPeriods || projectMonthlyPeriods.length === 0) return [];

    return projectMonthlyPeriods.map((periodItem, idx) => {
      const pFromStr = periodItem.from;
      const pToStr = periodItem.to;

      const matchedReports = (availableSemiReports || []).filter((r) => {
        const rStartStr = r.startIso;
        const rEndStr = r.endIso || rStartStr;
        if (!rStartStr) return false;
        return (rStartStr >= pFromStr && rStartStr <= pToStr) || (rEndStr >= pFromStr && rEndStr <= pToStr);
      });

      const isComplete = matchedReports.length >= 2;
      const alreadyUsed = existingProjectReportPeriods.has(`${periodItem.from}_${periodItem.to}`);
      const isDisabled = !isComplete || alreadyUsed;

      let statusBadge = "";
      if (alreadyUsed) {
        statusBadge = "تم إنشاء تقرير شهري مسبقاً ❌";
      } else if (!isComplete) {
        statusBadge = `غير مكتمل (${matchedReports.length}/2 تقارير نصف شهرية)`;
      } else {
        statusBadge = "جاهز للتجميع (2/2) ✓";
      }

      return {
        key: `period_${idx}_${periodItem.from}_${periodItem.to}`,
        pairIndex: idx + 1,
        monthTitle: periodItem.readableLabel,
        from: periodItem.from,
        to: periodItem.to,
        reports: matchedReports,
        isComplete,
        alreadyUsed,
        isDisabled,
        statusBadge,
        label: `📅 ${periodItem.readableLabel} — ${statusBadge}`,
      };
    });
  }, [projectMonthlyPeriods, availableSemiReports, existingProjectReportPeriods]);

  const selectedBlock = useMemo(() => {
    return semiMonthlyBlocks.find((b) => b.key === selectedBlockKey);
  }, [semiMonthlyBlocks, selectedBlockKey]);

  const [plannedProgress, setPlannedProgress] = useState<number>(0);
  const [actualProgress, setActualProgress] = useState<number>(0);

  const gap = useMemo(() => actualProgress - plannedProgress, [actualProgress, plannedProgress]);
  const delay = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);

  const ragStatus = useMemo(() => {
    if (delay < 5) return "أخضر";
    if (delay < 25) return "أصفر";
    return "أحمر";
  }, [delay]);

  const [milestones, setMilestones] = useState<Record<string, any>[]>([]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");
  const [changeIndicator, setChangeIndicator] = useState<string>("أخضر");

  const handleAggregateSemiReports = async () => {
    if (!selectedBlock) {
      toast.error("يرجى اختيار بلوك التقريرين النصف شهريين المتتابعين للبدء بالتجميع");
      return;
    }

    if (selectedBlock.alreadyUsed) {
      toast.error(`لقد تم إنشاء تقرير شهري سابقاً لهذه الفترة (الفترة ${selectedBlock.pairIndex}). لا يمكن تكرار التجميع لنفس الفترة.`);
      return;
    }

    if (!selectedBlock.isComplete) {
      toast.error(
        `لا يمكن تجميع التقرير الشهري: يلزم توفر تقريرين نصف شهريين لهذه الفترة (متوفر ${selectedBlock.reports.length} فقط).`
      );
      return;
    }

    const matchedList = selectedBlock.reports;
    const sumActual = Math.min(100, matchedList.reduce((acc, r) => acc + (r.actualProgress || 0), 0));
    const sumPlanned = Math.min(100, matchedList.reduce((acc, r) => acc + (r.plannedProgress || 0), 0));
    const targetMonthYear = matchedList[0]?.monthYear || monthYear;

    if (selectedBlock.from) setPeriodFrom(selectedBlock.from);
    if (selectedBlock.to) {
      setPeriodTo(selectedBlock.to);
      setReportDate(selectedBlock.to);
    }

    setActualProgress(sumActual);
    setPlannedProgress(sumPlanned);

    const combinedMilestones: any[] = [];
    matchedList.forEach((r) => {
      if (r.milestones) combinedMilestones.push(...r.milestones);
    });
    if (combinedMilestones.length > 0) {
      setMilestones(combinedMilestones);
    }

    setIsAggregated(true);
    toast.success(`تم ربط وتجميع بيانات التقريرين النصف شهريين بنجاح للفترة (${selectedBlock.monthTitle})!`);
  };

  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [reportStatus, setReportStatus] = useState<string>("مسودة");

  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    setActualProgress(0);
    setPlannedProgress(0);
    const proj = projectOptions.find((p) => String(p.id) === String(projId));
    if (proj) {
      setProjectManager(proj.manager);
      setCurrentPhase(proj.currentPhase);
    }
  };

  useEffect(() => {
    const proj = projectOptions.find((p) => String(p.id) === String(selectedProjectId));
    if (proj) {
      if (proj.manager) setProjectManager(proj.manager);
      if (proj.currentPhase) setCurrentPhase(proj.currentPhase);
    }
  }, [projectOptions, selectedProjectId]);



  const handleSaveDraft = async (overrideStatus?: string) => {
    const finalStatus = overrideStatus || reportStatus || "مسودة";
    if (!selectedProjectId) {
      toast.error("يرجى اختيار المشروع أولاً من القائمة قبل حفظ التقرير");
      return;
    }

    if (periodFrom && periodTo && existingProjectReportPeriods.has(`${periodFrom}_${periodTo}`)) {
      toast.error(`لقد تم تسجيل تقرير شهري سابقاً لهذه الفترة (من ${formatDateToReadableArabic(periodFrom)} إلى ${formatDateToReadableArabic(periodTo)}). يرجى اختيار فترة أخرى.`);
      return;
    }

    try {
      setIsSubmitting(true);
      let statusEnum: "draft" | "submitted" | "reviewed" | "approved" = "draft";
      if (finalStatus === "تم الاطلاع") {
        statusEnum = "submitted";
      } else if (finalStatus === "معتمد") {
        statusEnum = "approved";
      }

      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          title: `التقرير الشهري - ${selectedProjName}`,
          reportDate: reportDate || undefined,
          reportPeriodStart: periodFrom || undefined,
          reportPeriodEnd: periodTo || undefined,
          plannedProgress: plannedProgress,
          actualProgress: actualProgress,
          overallProgress: actualProgress,
          challenges: `فترة التقرير الشهري: من ${periodFrom} إلى ${periodTo}\nالمشكلات والعقبات: (انظر تفاصيل المعالم)`,
          recommendations: `المرحلة الحالية: ${currentPhase}`,
          workSummary: `مؤشر الوقت: ${timeIndicator}\nمؤشر التكلفة: ${costIndicator}\nتصعيد إداري: ${needEscalation ? "نعم" : "لا"}\nتقرير شهري لفترة التنفيذ من ${periodFrom} إلى ${periodTo}`,
        });

        await updateStatusMutation.mutateAsync({
          id: editId,
          status: statusEnum,
        });

        toast.success(finalStatus === "مسودة" ? "تم تحديث مسودة التقرير بنجاح" : "تم إكمال واعتماد التقرير بنجاح");
        setLocation("/project-reports");
        return;
      }

      const res = await createMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: `التقرير الشهري - ${selectedProjName}`,
        reportDate: reportDate || (periodTo ? periodTo : new Date().toISOString().split("T")[0]),
        reportPeriodStart: periodFrom || undefined,
        reportPeriodEnd: periodTo || undefined,
        plannedProgress: plannedProgress,
        actualProgress: actualProgress,
        overallProgress: actualProgress,
        challenges: `فترة التقرير الشهري: من ${periodFrom} إلى ${periodTo}\nالمشكلات والعقبات: (انظر تفاصيل المعالم)`,
        recommendations: `المرحلة الحالية: ${currentPhase}`,
        workSummary: `مؤشر الوقت: ${timeIndicator}\nمؤشر التكلفة: ${costIndicator}\nتصعيد إداري: ${needEscalation ? "نعم" : "لا"}\nتقرير شهري لفترة التنفيذ من ${periodFrom} إلى ${periodTo}`,
      });

      await updateStatusMutation.mutateAsync({
        id: res.id,
        status: statusEnum,
      });

      toast.success(finalStatus === "مسودة" ? `تم حفظ التقرير كمسودة - رقم التقرير ${res.reportNumber}` : `تم اعتماد وحفظ التقرير بنجاح - رقم التقرير ${res.reportNumber}`);
      setLocation("/project-reports");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء حفظ التقرير");
    } finally {
      setIsSubmitting(false);
    }
  };

  const milestoneCols: ColumnDef[] = [
    { key: "title", label: "اسم المعلم الرئيسية", type: "text", placeholder: "عنوان المعلم بالمشروع" },
    { key: "dueDate", label: "التاريخ المستهدف", type: "date" },
    {
      key: "status",
      label: "الحالة",
      type: "select",
      options: [
        { value: "لم يبدأ", label: "لم يبدأ" },
        { value: "جارٍ", label: "جارٍ التنفيذ" },
        { value: "منجز", label: "منجز" },
        { value: "متأخر", label: "متأخر" },
      ],
    },
  ];



  const content = (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">

        <div className="space-y-6">
          {/* بيانات التقرير */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                    <CardTitle className="text-base font-bold text-foreground">بيانات التقرير والمشروع</CardTitle>
                  </div>
                </div>
                {reportStatus === "معتمد" && showLayout && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const targetId = selectedProjectId || "1";
                      setLocation(`/project-reports/${targetId}/pdf?type=monthly`);
                    }}
                    className="gap-2 text-xs font-bold border-teal-600/40 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 h-9 rounded-lg"
                  >
                    <Printer className="w-4 h-4 text-teal-600" />
                    <span>معاينة وطباعة التقرير (PDF)</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {!selectedProjectId && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                  <span>تنبيه: يرجى تحديد المشروع أولاً لتفعيل وإكمال تعبئة كافة بيانات وملاحظات التقرير.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. اختيار المشروع أولاً */}
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>اسم المشروع</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر المشروع من القائمة ليتم تعبئة البيانات تلقائياً" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs py-2">
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-semibold">{p.name}</span>
                            <span className="text-muted-foreground text-[11px]">({p.department})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. طريقة إعداد وتعبئة التقرير الشهري ثانياً (أسفل اختيار المشروع) */}
                <div className="space-y-1.5 md:col-span-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-bold text-foreground">طريقة إعداد وتعبئة التقرير الشهري</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">اختر الإدخال المباشر أو التجميع التلقائي من التقريرين النصف شهريين لنفس المشروع</p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border/80 shrink-0">
                      <Button
                        type="button"
                        variant={entryMode === "manual" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("manual")}
                        disabled={!selectedProjectId}
                        className={`h-7 text-xs gap-1 rounded-md px-3 ${entryMode === "manual" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <User className="w-3 h-3" />
                        إدخال يدوي
                      </Button>
                      <Button
                        type="button"
                        variant={entryMode === "aggregate" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("aggregate")}
                        disabled={!selectedProjectId}
                        className={`h-7 text-xs gap-1 rounded-md px-3 ${entryMode === "aggregate" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <Layers className="w-3 h-3" />
                        تجميع من تقارير نصف شهرية
                      </Button>
                    </div>
                  </div>

                  {entryMode === "aggregate" && (
                    <div className="p-4 rounded-xl bg-card border border-teal-600/30 space-y-4 my-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-foreground">اختر تقرير نصف شهري واحد وسيقوم النظام تلقائياً بالربط مع النصف الآخر لنفس الشهر والمشروع:</span>
                        </div>
                        {isAggregated && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم تجميع وتحديث البيانات
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold">اختر فترة الشهر التجميعية لهذا المشروع (محددة برقم الشهر والمرحلة)</Label>
                        <Select
                          value={selectedBlockKey}
                          onValueChange={(key) => {
                            setSelectedBlockKey(key);
                            const block = semiMonthlyBlocks.find((b) => b.key === key);
                            if (block && block.isComplete && !block.isDisabled) {
                              if (block.from) setPeriodFrom(block.from);
                              if (block.to) {
                                setPeriodTo(block.to);
                                setReportDate(block.to);
                              }
                              const matchedList = block.reports;
                              const sumActual = Math.min(100, matchedList.reduce((acc, r) => acc + (r.actualProgress || 0), 0));
                              const sumPlanned = Math.min(100, matchedList.reduce((acc, r) => acc + (r.plannedProgress || 0), 0));
                              setActualProgress(sumActual);
                              setPlannedProgress(sumPlanned);
                              setIsAggregated(true);
                              toast.success(`تم ربط وتجميع بيانات التقريرين النصف شهريين بنجاح!`);
                            }
                          }}
                          disabled={!selectedProjectId}
                        >
                          <SelectTrigger className="h-10 border-border/80 text-xs bg-background font-semibold">
                            <SelectValue placeholder={selectedProjectId ? "اختر فترة الشهر التجميعية لهذا المشروع (محددة برقم الشهر)..." : "يرجى اختيار المشروع أولاً..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {semiMonthlyBlocks.length === 0 ? (
                              <SelectItem value="none" disabled className="text-xs">
                                لا يوجد تقارير نصف شهرية مسجلة لهذا المشروع
                              </SelectItem>
                            ) : (
                              semiMonthlyBlocks.map((b) => (
                                <SelectItem key={b.key} value={b.key} disabled={b.isDisabled} className="text-xs py-2 font-semibold">
                                  {b.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* تفاصيل التقريرين النصف شهريين (مترتبين تحت بعض بصورة مبسطة ومباشرة) */}
                      {selectedBlock && (
                        <div className="p-3.5 rounded-xl bg-card border border-teal-600/30 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border/40 pb-2">
                            <span>{selectedBlock.monthTitle ? selectedBlock.monthTitle : `فترة التقرير الشهري ${selectedBlock.pairIndex}`}</span>
                            <Badge className={selectedBlock.alreadyUsed ? "bg-red-500/15 text-red-700" : selectedBlock.isComplete ? "bg-emerald-600 text-white" : "bg-amber-500/15 text-amber-700"}>
                              {selectedBlock.statusBadge}
                            </Badge>
                          </div>

                          {/* تقارير مكتملة ومصفوفة رأسيّاً (تحت بعض) مخصرة ومباشرة */}
                          <div className="flex flex-col gap-2">
                            {selectedBlock.reports.map((r, idx) => (
                              <div key={r.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs flex items-center justify-between">
                                <div className="flex flex-col gap-0.5 min-w-0 pr-1">
                                  <span className="font-bold text-foreground truncate">التقرير {idx + 1}: {r.title}</span>
                                  <span className="text-[11px] text-muted-foreground font-medium">الفترة: {r.period}</span>
                                </div>
                                <Badge variant="outline" className="text-[11px] text-teal-600 border-teal-600/40 font-bold shrink-0">
                                  إنجاز: {r.actualProgress}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>مدير المشروع</span>
                  </Label>
                  <Input value={projectManager} readOnly placeholder="مدير المشروع المرتبط" className="h-10 bg-muted/40 font-semibold border-border/60" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>اختر فترة التقرير الشهري (مقسمة إجبارياً على فترات 30 يوماً طبقاً لزمن المشروع)</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Select
                    value={periodFrom && periodTo ? `${periodFrom}_${periodTo}` : ""}
                    onValueChange={(val) => {
                      const [from, to] = val.split("_");
                      setPeriodFrom(from);
                      setPeriodTo(to);
                      setReportDate(to);
                    }}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="h-10 border-border/80 text-xs bg-background font-semibold text-right">
                      <SelectValue placeholder={selectedProjectId ? "اختر فترة التقرير الشهري لهذا المشروع..." : "يرجى اختيار المشروع أولاً..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 text-right">
                      {projectMonthlyPeriods.map((p) => {
                        const key = `${p.from}_${p.to}`;
                        const isSubmitted = existingProjectReportPeriods.has(key);
                        return (
                          <SelectItem key={key} value={key} disabled={isSubmitted} className="text-xs font-semibold py-2">
                            <div className="flex items-center justify-between gap-4 w-full">
                              <span>📅 {p.readableLabel}</span>
                              {isSubmitted && (
                                <span className="text-rose-500 font-bold text-[11px]">(مُسجّل مسبقاً ❌)</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>تاريخ التقرير</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="date"
                    disabled={!selectedProjectId}
                    value={formatToInputDate(reportDate)}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="h-10 border-border/80 font-medium"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>المرحلة الحالية من دورة الحياة (تُنعكس من الطلب تلقائياً)</span>
                  </Label>
                  <Input value={currentPhase} readOnly placeholder="مرحلة دورة الحياة الحالية" className="h-10 bg-muted/40 font-semibold border-border/60" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* حالة التقدم والمعالم */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">حالة التقدم والمعالم الرئيسية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center">
                      <span>نسبة الإنجاز المخطط %</span>
                      <span className="text-red-500 font-bold mr-1">*</span>
                    </span>
                    <span className="text-primary font-bold">{plannedProgress}%</span>
                  </Label>
                  <Input
                    type="number"
                    disabled={!selectedProjectId}
                    min={0}
                    max={100}
                    value={plannedProgress === 0 ? "" : plannedProgress}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPlannedProgress(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center">
                      <span>نسبة الإنجاز الفعلي %</span>
                      <span className="text-red-500 font-bold mr-1">*</span>
                    </span>
                    <span className="text-teal-600 font-bold">{actualProgress}%</span>
                  </Label>
                  <Input
                    type="number"
                    disabled={!selectedProjectId}
                    min={0}
                    max={100}
                    value={actualProgress === 0 ? "" : actualProgress}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setActualProgress(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>فجوة الإنجاز المحسوبة (الفعلي − المخطط)</span>
                    <span className={`font-bold ${delay >= 25 ? "text-rose-600 dark:text-rose-400" : delay >= 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {gap > 0 ? `+${gap}%` : `${gap}%`}
                    </span>
                  </Label>
                  <div className="h-10 rounded-lg border border-border/80 bg-muted/30 px-3 flex items-center justify-between font-bold">
                    <span className="text-xs text-muted-foreground">الحالة العامة (RAG):</span>
                    <Badge
                      className={
                        ragStatus === "أخضر"
                          ? "bg-emerald-500 text-white font-bold text-xs"
                          : ragStatus === "أصفر"
                          ? "bg-amber-500 text-white font-bold text-xs"
                          : "bg-rose-500 text-white font-bold text-xs"
                      }
                    >
                      {ragStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              <DynamicArrayTable
                title="التقدم مقابل المعالم"
                description="جدول متابعة المعالم الرئيسية (اسم المعلم، التاريخ، والحالة الحالية)"
                columns={milestoneCols}
                rows={milestones}
                onChange={setMilestones}
                disabled={!selectedProjectId}
                emptyLabel="اضغط إضافة صف جديد لإدراج معالم التقرير الشهري"
              />
            </CardContent>
          </Card>

          {/* المؤشرات الخمسة */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المؤشرات الخمسة الأساسية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <RagIndicatorSelect label="مؤشر الوقت" disabled={!selectedProjectId} value={timeIndicator} onChange={setTimeIndicator} />
                <RagIndicatorSelect label="مؤشر التكلفة" disabled={!selectedProjectId} value={costIndicator} onChange={setCostIndicator} />
                <RagIndicatorSelect label="مؤشر التغيير" disabled={!selectedProjectId} value={changeIndicator} onChange={setChangeIndicator} />
              </div>
            </CardContent>
          </Card>



          {/* المرفقات وحالة التقرير */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المرفقات وحالة التقرير</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات والوثائق</Label>
                <FileUpload
                  disabled={!selectedProjectId}
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="رفع وثائق ومرفقات التقرير الشهري"
                />
              </div>


            </CardContent>
          </Card>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-end gap-3 p-4 bg-card border border-border/80 rounded-xl shadow-xs">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedProjectId || isSubmitting}
              onClick={() => handleSaveDraft("مسودة")}
              className="gap-2 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              حفظ كمسودة
            </Button>
            <Button
              type="button"
              disabled={!selectedProjectId || isSubmitting}
              onClick={() => handleSaveDraft("معتمد")}
              className="gap-2 text-xs font-bold bg-[#1a5f4a] hover:bg-[#154d3c] text-white disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              حفظ واعتماد التقرير
            </Button>
          </div>
        </div>

        <ReportPrintPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          reportType="monthly"
          reportTitle="التقرير الشهري للمشروع"
          data={{
            projectName: selectedProjName,
            projectManager,
            monthYear,
            reportDate,
            plannedProgress,
            actualProgress,
            gap,
            ragStatus,
            status: reportStatus,
          }}
        />
      </div>
    );

  return showLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}
