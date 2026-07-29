import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { ReportHeaderTabs } from "@/components/project-reports/ReportHeaderTabs";
import { RagIndicatorSelect } from "@/components/project-reports/RagIndicatorSelect";
import { DynamicArrayTable, ColumnDef } from "@/components/project-reports/DynamicArrayTable";
import { ReportPrintPreviewModal } from "@/components/project-reports/ReportPrintPreviewModal";
import { STAGE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Building2, User, TrendingUp, TrendingDown, Minus, Calendar, Target, Award, ShieldAlert, BookOpen, Wand2, Layers, Sparkles, CheckCircle2, RefreshCw, Save, Eye, Printer, AlertCircle } from "lucide-react";

export default function QuarterlyReportPage({ showLayout = true }: { showLayout?: boolean }) {
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
            cumulativeBudget: Number(p.budget) || 3500000,
            cumulativeSpent: Number(p.actualCost) || 2450000,
            milestones: parsedMilestones,
          };
        });
    }
    return [];
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectManager, setProjectManager] = useState<string>("غير محدد");
  const [quarter, setQuarter] = useState<string>("Q3");
  const [year, setYear] = useState<string>("2026");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentPhase, setCurrentPhase] = useState<string>("التنفيذ");

  useEffect(() => {
    if (existingReport) {
      if (existingReport.projectId) setSelectedProjectId(String(existingReport.projectId));
      if (existingReport.plannedProgress !== null && existingReport.plannedProgress !== undefined) {
        setPlannedProgress(existingReport.plannedProgress);
      }
      if (existingReport.actualProgress !== null && existingReport.actualProgress !== undefined) {
        setActualProgress(existingReport.actualProgress);
      }
      if (existingReport.recommendations) setContinuationDecisions(existingReport.recommendations);
      if (existingReport.reportDate) setReportDate(String(existingReport.reportDate).split("T")[0]);
    }
  }, [existingReport]);

  const [entryMode, setEntryMode] = useState<"manual" | "from_monthly" | "from_semi">("manual");
  const [selectedMonthlyId, setSelectedMonthlyId] = useState<string>("");
  const [selectedSemiId, setSelectedSemiId] = useState<string>("");
  const [isAggregated, setIsAggregated] = useState<boolean>(false);

  const availableMonthlyReports = useMemo(() => {
    if (!dbReports) return [];
    return dbReports
      .filter((r) => {
        if (Number(r.projectId) !== Number(selectedProjectId)) return false;
        const titleLower = r.title.toLowerCase();
        const isMonthly = (titleLower.includes("شهري") || titleLower.includes("monthly"));
        const isSemi = (titleLower.includes("نصف") || titleLower.includes("semi"));
        return isMonthly && !isSemi;
      })
      .map((r) => {
        const startStr = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 10) : "";
        const endStr = r.reportPeriodEnd ? String(r.reportPeriodEnd).substring(0, 10) : "";
        const monthYear = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 7) : (r.reportDate ? String(r.reportDate).substring(0, 7) : "");
        
        let qVal = "";
        let yVal = "";
        if (monthYear && monthYear.includes("-")) {
          const parts = monthYear.split("-");
          yVal = parts[0];
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 3) qVal = "Q1";
          else if (m >= 4 && m <= 6) qVal = "Q2";
          else if (m >= 7 && m <= 9) qVal = "Q3";
          else if (m >= 10 && m <= 12) qVal = "Q4";
        }

        return {
          id: String(r.id),
          title: r.title,
          projectId: String(r.projectId),
          actualProgress: r.actualProgress || 0,
          plannedProgress: r.plannedProgress || 0,
          cumulativeBudget: Number(r.budgetSpent) || 0,
          cumulativeSpent: Number(r.budgetSpent) || 0,
          milestones: [],
          monthYear,
          quarter: qVal,
          year: yVal,
          period: startStr && endStr ? `${startStr} إلى ${endStr}` : "فترة غير محددة",
        };
      });
  }, [dbReports, selectedProjectId]);

  const availableSemiReports = useMemo(() => {
    if (!dbReports) return [];
    return dbReports
      .filter((r) => {
        if (Number(r.projectId) !== Number(selectedProjectId)) return false;
        const titleLower = r.title.toLowerCase();
        return (titleLower.includes("نصف") || titleLower.includes("semi")) && (titleLower.includes("شهري") || titleLower.includes("monthly"));
      })
      .map((r) => {
        const startStr = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 10) : "";
        const endStr = r.reportPeriodEnd ? String(r.reportPeriodEnd).substring(0, 10) : "";
        const monthYear = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 7) : (r.reportDate ? String(r.reportDate).substring(0, 7) : "");
        
        let qVal = "";
        let yVal = "";
        if (monthYear && monthYear.includes("-")) {
          const parts = monthYear.split("-");
          yVal = parts[0];
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 3) qVal = "Q1";
          else if (m >= 4 && m <= 6) qVal = "Q2";
          else if (m >= 7 && m <= 9) qVal = "Q3";
          else if (m >= 10 && m <= 12) qVal = "Q4";
        }

        return {
          id: String(r.id),
          title: r.title,
          projectId: String(r.projectId),
          actualProgress: r.actualProgress || 0,
          plannedProgress: r.plannedProgress || 0,
          cumulativeBudget: Number(r.budgetSpent) || 0,
          cumulativeSpent: Number(r.budgetSpent) || 0,
          milestones: [],
          monthYear,
          quarter: qVal,
          year: yVal,
          period: startStr && endStr ? `${startStr} إلى ${endStr}` : "فترة غير محددة",
        };
      });
  }, [dbReports, selectedProjectId]);

  // Selected Monthly Report & Auto-matched Monthly Reports for the Quarter
  const selectedMonthly = useMemo(() => {
    return availableMonthlyReports.find((r) => r.id === selectedMonthlyId);
  }, [availableMonthlyReports, selectedMonthlyId]);

  const autoMatchedMonthlies = useMemo(() => {
    if (!selectedMonthly) return [];
    return availableMonthlyReports.filter(
      (r) => r.quarter === selectedMonthly.quarter && r.year === selectedMonthly.year
    );
  }, [availableMonthlyReports, selectedMonthly]);

  // Selected Semi Report & Auto-matched Semi Reports for the Quarter
  const selectedSemi = useMemo(() => {
    return availableSemiReports.find((r) => r.id === selectedSemiId);
  }, [availableSemiReports, selectedSemiId]);

  const autoMatchedSemis = useMemo(() => {
    if (!selectedSemi) return [];
    return availableSemiReports.filter(
      (r) => r.quarter === selectedSemi.quarter && r.year === selectedSemi.year
    );
  }, [availableSemiReports, selectedSemi]);

  const [plannedProgress, setPlannedProgress] = useState<number>(projectOptions[0]?.plannedProgress || 0);
  const [actualProgress, setActualProgress] = useState<number>(projectOptions[0]?.actualProgress || 0);

  const gap = useMemo(() => actualProgress - plannedProgress, [actualProgress, plannedProgress]);
  const delay = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);

  const ragStatus = useMemo(() => {
    if (delay < 5) return "أخضر";
    if (delay < 25) return "أصفر";
    return "أحمر";
  }, [delay]);

  const [quarterMilestones, setQuarterMilestones] = useState<Record<string, any>[]>(projectOptions[0]?.milestones || []);

  const [cumulativeSpent, setCumulativeSpent] = useState<number>(projectOptions[0]?.cumulativeSpent || 2450000);
  const [cumulativeBudget, setCumulativeBudget] = useState<number>(projectOptions[0]?.cumulativeBudget || 3500000);

  const handleAggregateFromMonthly = () => {
    if (!selectedMonthly || autoMatchedMonthlies.length === 0) {
      toast.error("يرجى اختيار تقرير شهري واحد للبدء بالتجميع");
      return;
    }

    if (autoMatchedMonthlies.length < 3) {
      toast.error(
        `لا يمكن تجميع التقرير الربعي: يتطلب التقرير الربعي توفر 3 تقارير شهرية مكتملة لهذا الربع والمشروع. المتوفر حالياً: ${autoMatchedMonthlies.length} من أصل 3. يرجى إضافة التقارير الشهرية المتبقية أولاً.`
      );
      return;
    }

    const avgActual = Math.round(autoMatchedMonthlies.reduce((acc, r) => acc + r.actualProgress, 0) / autoMatchedMonthlies.length);
    const avgPlanned = Math.round(autoMatchedMonthlies.reduce((acc, r) => acc + r.plannedProgress, 0) / autoMatchedMonthlies.length);

    setActualProgress(avgActual);
    setPlannedProgress(avgPlanned);

    const latestBudget = autoMatchedMonthlies[autoMatchedMonthlies.length - 1]?.cumulativeBudget || cumulativeBudget;
    const latestSpent = autoMatchedMonthlies[autoMatchedMonthlies.length - 1]?.cumulativeSpent || cumulativeSpent;
    setCumulativeBudget(latestBudget);
    setCumulativeSpent(latestSpent);

    const combinedMilestones: any[] = [];
    autoMatchedMonthlies.forEach((r) => {
      if (r.milestones) combinedMilestones.push(...r.milestones);
    });
    if (combinedMilestones.length > 0) {
      setQuarterMilestones(combinedMilestones);
    }

    setIsAggregated(true);
    toast.success(`تم العثور على 3 تقارير شهرية وتوليد التقرير الربعي بنجاح! (الإنجاز الفعلي: ${avgActual}%)`);
  };

  const handleAggregateFromSemi = () => {
    if (!selectedSemi || autoMatchedSemis.length === 0) {
      toast.error("يرجى اختيار تقرير نصف شهري واحد للبدء بالتجميع");
      return;
    }

    if (autoMatchedSemis.length < 6) {
      toast.error(
        `لا يمكن تجميع التقرير الربعي: يتطلب التقرير الربعي توفر 6 تقارير نصف شهرية مكتملة لهذا الربع والمشروع. المتوفر حالياً: ${autoMatchedSemis.length} من أصل 6. يرجى إضافة التقارير النصف شهرية المتبقية أولاً.`
      );
      return;
    }

    const avgActual = Math.round(autoMatchedSemis.reduce((acc, r) => acc + r.actualProgress, 0) / autoMatchedSemis.length);
    const avgPlanned = Math.round(autoMatchedSemis.reduce((acc, r) => acc + r.plannedProgress, 0) / autoMatchedSemis.length);

    setActualProgress(avgActual);
    setPlannedProgress(avgPlanned);

    const combinedMilestones: any[] = [];
    autoMatchedSemis.forEach((r) => {
      if (r.milestones) combinedMilestones.push(...r.milestones);
    });
    if (combinedMilestones.length > 0) {
      setQuarterMilestones(combinedMilestones);
    }

    setIsAggregated(true);
    toast.success(`تم العثور على 6 تقارير نصف شهرية وتجميع التقرير الربعي بنجاح! (الإنجاز الفعلي: ${avgActual}%)`);
  };

  const financialCommitmentPct = useMemo(() => {
    if (!cumulativeBudget || cumulativeBudget === 0) return 0;
    return Math.round((cumulativeSpent / cumulativeBudget) * 100);
  }, [cumulativeSpent, cumulativeBudget]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");
  const [changeIndicator, setChangeIndicator] = useState<string>("أخضر");

  const [overallTrend, setOverallTrend] = useState<"متحسّن" | "ثابت" | "متراجع">("متحسّن");

  const [strategicAlignment, setStrategicAlignment] = useState<string>(
    "يتوافق المشروع بشكل مباشر مع المبادرة الاستراتيجية لعناية ورعاية مساجد المنطقة وحوكمة الصيانة."
  );

  const [realizedImpact, setRealizedImpact] = useState<string>(
    "تحسين تجربة المصلين ورفع كفاءة استهلاك الطاقة والمياه بنسبة 35% خلال الربع."
  );

  const [lessonsLearned, setLessonsLearned] = useState<string>("");

  const [continuationDecisions, setContinuationDecisions] = useState<string>(
    "التوصية بالاستمرار في تنفيذ المرحلة التالية مع ضخ الدفعة المالية المستحقة وتعديل جدول الضمان."
  );

  const [needEscalation, setNeedEscalation] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [reportStatus, setReportStatus] = useState<string>("مسودة");

  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projectOptions.find((p) => String(p.id) === String(projId));
    if (proj) {
      setProjectManager(proj.manager);
      setCurrentPhase(proj.currentPhase);
      if (proj.plannedProgress !== undefined) setPlannedProgress(proj.plannedProgress);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
      if (proj.cumulativeBudget !== undefined) setCumulativeBudget(proj.cumulativeBudget);
      if (proj.cumulativeSpent !== undefined) setCumulativeSpent(proj.cumulativeSpent);
      if (proj.milestones && Array.isArray(proj.milestones)) {
        setQuarterMilestones(proj.milestones);
      }
    }
  };

  useEffect(() => {
    const proj = projectOptions.find((p) => String(p.id) === String(selectedProjectId));
    if (proj) {
      if (proj.manager) setProjectManager(proj.manager);
      if (proj.currentPhase) setCurrentPhase(proj.currentPhase);
      if (proj.plannedProgress !== undefined) setPlannedProgress(proj.plannedProgress);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
      if (proj.cumulativeBudget !== undefined) setCumulativeBudget(proj.cumulativeBudget);
      if (proj.cumulativeSpent !== undefined) setCumulativeSpent(proj.cumulativeSpent);
      if (proj.milestones && Array.isArray(proj.milestones)) {
        setQuarterMilestones(proj.milestones);
      }
    }
  }, [projectOptions, selectedProjectId]);

  const selectedProjName = projectOptions.find((p) => String(p.id) === String(selectedProjectId))?.name || "";

  useEffect(() => {
    const hasRed =
      ragStatus === "أحمر" ||
      timeIndicator === "أحمر" ||
      costIndicator === "أحمر" ||
      changeIndicator === "أحمر";
    if (hasRed) {
      setNeedEscalation(true);
    }
  }, [ragStatus, timeIndicator, costIndicator, changeIndicator]);

  const handleSaveDraft = async (overrideStatus?: string) => {
    const finalStatus = overrideStatus || reportStatus || "مسودة";
    if (!selectedProjectId) {
      toast.error("يرجى اختيار المشروع أولاً من القائمة قبل حفظ التقرير");
      return;
    }
    if (!strategicAlignment.trim()) {
      toast.error("يرجى توضيح مدى المواءمة مع الأهداف الاستراتيجية");
      return;
    }
    if (!realizedImpact.trim()) {
      toast.error("يرجى توضيح القيمة والأثر المتحقق");
      return;
    }
    if (!continuationDecisions.trim()) {
      toast.error("يرجى تدوين التوصيات وقرارات الاستمرار/التعديل");
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
          title: `التقرير الربعي - ${selectedProjName}`,
          plannedProgress: plannedProgress,
          actualProgress: actualProgress,
          overallProgress: actualProgress,
          challenges: `الربع: ${quarter}\nالسنة: ${year}\nالمواءمة الاستراتيجية: ${strategicAlignment}`,
          recommendations: continuationDecisions,
          workSummary: `الأثر المتحقق: ${realizedImpact}\nالدروس المستفادة: ${lessonsLearned}\nالاتجاه العام: ${overallTrend}\nمرحلة دورة الحياة الحالية: ${currentPhase}`,
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
        title: `التقرير الربعي - ${selectedProjName}`,
        reportDate: reportDate || new Date().toISOString().split("T")[0],
        plannedProgress: plannedProgress,
        actualProgress: actualProgress,
        overallProgress: actualProgress,
        challenges: `الربع: ${quarter}\nالسنة: ${year}\nالمواءمة الاستراتيجية: ${strategicAlignment}`,
        recommendations: continuationDecisions,
        workSummary: `الأثر المتحقق: ${realizedImpact}\nالدروس المستفادة: ${lessonsLearned}\nالاتجاه العام: ${overallTrend}\nمرحلة دورة الحياة الحالية: ${currentPhase}`,
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
    { key: "title", label: "اسم المعلم المنجز خلال الربع", type: "text", placeholder: "وصف المعلم الاستراتيجي" },
    { key: "date", label: "تاريخ الإنجاز", type: "date" },
    {
      key: "status",
      label: "الحالة",
      type: "select",
      options: [
        { value: "منجز", label: "منجز بالكامل" },
        { value: "جارٍ", label: "جارٍ المتابعة" },
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">بيانات التقرير والمشروع</CardTitle>
                </div>
                {reportStatus === "معتمد" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const targetId = selectedProjectId || "1";
                      setLocation(`/project-reports/${targetId}/print`);
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

                {/* 2. طريقة إعداد وتعبئة التقرير الربعي ثانياً (أسفل اختيار المشروع) */}
                <div className="space-y-1.5 md:col-span-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-bold text-foreground">طريقة إعداد وتعبئة التقرير الربعي الاستراتيجي</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">اختر الإدخال المباشر أو التجميع التلقائي من 3 تقارير شهرية أو 6 تقارير نصف شهرية لنفس المشروع</p>
                    </div>

                    <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/80 shrink-0">
                      <Button
                        type="button"
                        variant={entryMode === "manual" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("manual")}
                        className={`h-7 text-xs gap-1 rounded-md px-2.5 ${entryMode === "manual" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <User className="w-3 h-3" />
                        إدخال يدوي
                      </Button>
                      <Button
                        type="button"
                        variant={entryMode === "from_monthly" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("from_monthly")}
                        className={`h-7 text-xs gap-1 rounded-md px-2.5 ${entryMode === "from_monthly" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <Calendar className="w-3 h-3" />
                        تجميع من 3 شهرية
                      </Button>
                      <Button
                        type="button"
                        variant={entryMode === "from_semi" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("from_semi")}
                        className={`h-7 text-xs gap-1 rounded-md px-2.5 ${entryMode === "from_semi" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <Layers className="w-3 h-3" />
                        تجميع من 6 نصف شهرية
                      </Button>
                    </div>
                  </div>

                  {entryMode === "from_monthly" && (
                    <div className="p-4 rounded-xl bg-card border border-teal-600/30 space-y-4 my-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-foreground">اختر تقرير شهري واحد وسيقوم النظام تلقائياً بربط باقي التقارير الشهرية المتاحة لهذا الربع والمشروع:</span>
                        </div>
                        {isAggregated && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم تجميع وتوليد التقرير الربعي
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold">اختر التقرير الشهري للبدء</Label>
                        <Select value={selectedMonthlyId} onValueChange={setSelectedMonthlyId}>
                          <SelectTrigger className="h-10 border-border/80 text-xs bg-background">
                            <SelectValue placeholder="اختر تقرير شهري..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMonthlyReports.length === 0 ? (
                              <SelectItem value="none" disabled className="text-xs">
                                لا يوجد تقارير شهرية مسجلة لهذا المشروع
                              </SelectItem>
                            ) : (
                              availableMonthlyReports.map((r) => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">
                                  {r.title} - إنجاز: {r.actualProgress}%
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedMonthly && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span>📌 التقرير المباشر المحدد: {selectedMonthly.title} ({selectedMonthly.actualProgress}%)</span>
                            <Badge className="bg-teal-600 text-white text-[10px]">المشروع: {selectedProjName}</Badge>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <Label className="text-[11px] font-semibold text-muted-foreground">التقارير الشهرية المربوطة تلقائياً للربع ({autoMatchedMonthlies.length} من أصل 3 متوفرة):</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {autoMatchedMonthlies.map((r) => (
                                <div key={r.id} className="p-2 rounded-md bg-background border border-teal-600/30 text-xs flex items-center justify-between">
                                  <span className="font-semibold text-foreground truncate">{r.title}</span>
                                  <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-600/40">{r.actualProgress}%</Badge>
                                </div>
                              ))}
                            </div>
                            {autoMatchedMonthlies.length < 3 && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold flex items-center gap-1">
                                ⚠️ متوفر {autoMatchedMonthlies.length} تقارير شهرية فقط (يلزم توفر 3 تقارير شهرية مكتملة لتجميع التقرير الربعي).
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAggregateFromMonthly}
                          disabled={!selectedMonthly}
                          className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تجميع التقارير الشهرية المربوطة آلياً
                        </Button>
                      </div>
                    </div>
                  )}

                  {entryMode === "from_semi" && (
                    <div className="p-4 rounded-xl bg-card border border-teal-600/30 space-y-4 my-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-foreground">اختر تقرير نصف شهري واحد وسيقوم النظام تلقائياً بربط باقي الأنصاف الشهريّة المتاحة لهذا الربع والمشروع:</span>
                        </div>
                        {isAggregated && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم تجميع وتوليد التقرير الربعي
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold">اختر تقرير نصف شهري للبدء</Label>
                        <Select value={selectedSemiId} onValueChange={setSelectedSemiId}>
                          <SelectTrigger className="h-10 border-border/80 text-xs bg-background">
                            <SelectValue placeholder="اختر تقرير نصف شهري..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSemiReports.length === 0 ? (
                              <SelectItem value="none" disabled className="text-xs">
                                لا يوجد تقارير نصف شهرية مسجلة لهذا المشروع
                              </SelectItem>
                            ) : (
                              availableSemiReports.map((r) => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">
                                  {r.title} ({r.period}) - إنجاز: {r.actualProgress}%
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedSemi && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span>📌 التقرير المحدد: {selectedSemi.title} ({selectedSemi.period})</span>
                            <Badge className="bg-teal-600 text-white text-[10px]">إنجاز: {selectedSemi.actualProgress}%</Badge>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <Label className="text-[11px] font-semibold text-muted-foreground">التقارير النصف شهرية المربوطة تلقائياً لهذا المشروع ({autoMatchedSemis.length} من أصل 6 متوفرة):</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {autoMatchedSemis.map((r) => (
                                <div key={r.id} className="p-2 rounded-md bg-background border border-teal-600/30 text-xs flex items-center justify-between">
                                  <span className="font-semibold text-foreground truncate">{r.title}</span>
                                  <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-600/40">{r.actualProgress}%</Badge>
                                </div>
                              ))}
                            </div>
                            {autoMatchedSemis.length < 6 && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold flex items-center gap-1">
                                ⚠️ متوفر {autoMatchedSemis.length} تقارير نصف شهرية فقط (يلزم توفر 6 تقارير نصف شهرية مكتملة لتجميع التقرير الربعي).
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAggregateFromSemi}
                          disabled={!selectedSemi}
                          className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تجميع الأنصاف الشهرية المربوطة آلياً
                        </Button>
                      </div>
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>الربع</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Select disabled={!selectedProjectId} value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger className="h-10 border-border/80 bg-background w-full">
                      <SelectValue placeholder="اختر الربع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1" className="text-xs">الربع الأول (Q1)</SelectItem>
                      <SelectItem value="Q2" className="text-xs">الربع الثاني (Q2)</SelectItem>
                      <SelectItem value="Q3" className="text-xs">الربع الثالث (Q3)</SelectItem>
                      <SelectItem value="Q4" className="text-xs">الربع الرابع (Q4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>السنة</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Select disabled={!selectedProjectId} value={year} onValueChange={setYear}>
                    <SelectTrigger className="h-10 border-border/80 bg-background w-full">
                      <SelectValue placeholder="اختر السنة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025" className="text-xs">2025</SelectItem>
                      <SelectItem value="2026" className="text-xs">2026</SelectItem>
                      <SelectItem value="2027" className="text-xs">2027</SelectItem>
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
                    value={reportDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setReportDate(e.target.value)}
                    placeholder="تاريخ التقرير اليوم"
                    className="h-10 border-border/80"
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

          {/* الأداء التراكمي */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">الأداء التراكمي حتى نهاية الربع</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>نسبة الإنجاز المخطط التراكمية %</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    disabled={!selectedProjectId}
                    value={plannedProgress === 0 ? "" : plannedProgress}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPlannedProgress(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">نسبة الإنجاز الفعلي التراكمية %</Label>
                  <Input
                    type="number"
                    value={actualProgress === 0 ? "" : actualProgress}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setActualProgress(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">الحالة العامة (RAG)</Label>
                  <div className="h-10 rounded-lg border border-border/80 bg-muted/30 px-3 flex items-center justify-between font-bold">
                    <span className="text-xs text-muted-foreground">الفجوة (الفعلي − المخطط): <strong className={delay >= 25 ? "text-rose-600 dark:text-rose-400" : delay >= 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>{gap > 0 ? `+${gap}%` : `${gap}%`}</strong></span>
                    <Badge
                      className={
                        ragStatus === "أخضر"
                          ? "bg-emerald-500 text-white font-bold"
                          : ragStatus === "أصفر"
                          ? "bg-amber-500 text-white font-bold"
                          : "bg-rose-500 text-white font-bold"
                      }
                    >
                      {ragStatus}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>الالتزام المالي التراكمي</span>
                    <span className="text-primary font-bold">{financialCommitmentPct}%</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      disabled={!selectedProjectId}
                      placeholder="المصروف الفعلي"
                      value={cumulativeSpent}
                      onChange={(e) => setCumulativeSpent(Number(e.target.value))}
                      className="h-10 border-border/80 text-xs font-bold w-1/2"
                    />
                    <span className="text-xs text-muted-foreground">من</span>
                    <Input
                      type="number"
                      disabled={!selectedProjectId}
                      placeholder="المعتمد"
                      value={cumulativeBudget}
                      onChange={(e) => setCumulativeBudget(Number(e.target.value))}
                      className="h-10 border-border/80 text-xs font-bold w-1/2"
                    />
                  </div>
                </div>
              </div>

              <DynamicArrayTable
                title="المعالم المنجزة خلال الربع"
                description="مصفوفة المعالم الاستراتيجية المحققة خلال الربع الزمني"
                columns={milestoneCols}
                rows={quarterMilestones}
                onChange={setQuarterMilestones}
                disabled={!selectedProjectId}
                emptyLabel="اضغط إضافة صف جديد لإدراج معالم الربع المنجزة"
              />
            </CardContent>
          </Card>

          {/* المؤشرات والاتجاه */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المؤشرات والاتجاه العام</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <RagIndicatorSelect label="مؤشر الوقت" disabled={!selectedProjectId} value={timeIndicator} onChange={setTimeIndicator} />
                <RagIndicatorSelect label="مؤشر التكلفة" disabled={!selectedProjectId} value={costIndicator} onChange={setCostIndicator} />
                <RagIndicatorSelect label="مؤشر التغيير" disabled={!selectedProjectId} value={changeIndicator} onChange={setChangeIndicator} />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground block">الاتجاه العام للربع (مقارنة بالربع السابق)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={!selectedProjectId}
                    variant={overallTrend === "متحسّن" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOverallTrend("متحسّن")}
                    className={overallTrend === "متحسّن" ? "bg-emerald-600 text-white font-bold gap-1 text-xs" : "text-xs gap-1"}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    متحسّن (صاعد)
                  </Button>

                  <Button
                    type="button"
                    disabled={!selectedProjectId}
                    variant={overallTrend === "ثابت" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOverallTrend("ثابت")}
                    className={overallTrend === "ثابت" ? "bg-amber-600 text-white font-bold gap-1 text-xs" : "text-xs gap-1"}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    ثابت
                  </Button>

                  <Button
                    type="button"
                    disabled={!selectedProjectId}
                    variant={overallTrend === "متراجع" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOverallTrend("متراجع")}
                    className={overallTrend === "متراجع" ? "bg-rose-600 text-white font-bold gap-1 text-xs" : "text-xs gap-1"}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    متراجع (هابط)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* القيمة والأثر الاستراتيجي */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">القيمة والأثر الاستراتيجي</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span>مدى المواءمة مع الأهداف الاستراتيجية</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={strategicAlignment}
                  onChange={(e) => setStrategicAlignment(e.target.value)}
                  placeholder="اصف مدى ارتباط مخرجات المشروع بالأهداف الاستراتيجية للقطاع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-teal-600" />
                  <span>القيمة والأثر المتحقق على المستفيد</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={realizedImpact}
                  onChange={(e) => setRealizedImpact(e.target.value)}
                  placeholder="ما هو الأثر التراكمي الملموس على المستفيدين النهائيين والقطاع خلال الربع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>


            </CardContent>
          </Card>

          {/* المخرجات والدروس والقرارات */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المخرجات والدروس والقرارات الاستراتيجية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>الدروس المستفادة خلال الربع</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  placeholder="أهم الدروس المستفادة التي تدعم التطوير والتحسين المستمر..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <span>التوصيات وقرارات الاستمرار / التعديل / إعادة التوجيه</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={continuationDecisions}
                  onChange={(e) => setContinuationDecisions(e.target.value)}
                  placeholder="اكتب التوصيات الاستراتيجية والتوجيهات بشأن استمرار أو تعديل خطة المشروع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <Label className="text-xs font-bold text-foreground">تصعيد التقرير لمجلس الإدارة</Label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold">{needEscalation ? "نعم" : "لا"}</span>
                  <Switch disabled={!selectedProjectId} checked={needEscalation} onCheckedChange={setNeedEscalation} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات والوثائق</Label>
                <FileUpload
                  disabled={!selectedProjectId}
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="تحميل المرفقات الاستراتيجية والتقارير المالية"
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
          reportType="quarterly"
          reportTitle="التقرير الربعي الاستراتيجي للمشروع"
          data={{
            projectName: selectedProjName,
            projectManager,
            quarter,
            year,
            reportDate,
            plannedProgress,
            actualProgress,
            gap,
            ragStatus,
            valueImpact: realizedImpact,
            recommendations: continuationDecisions,
            needEscalation: needEscalation ? "نعم" : "لا",
            status: reportStatus,
          }}
        />
      </div>
    );

  return showLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}
