import { useState, useMemo, useEffect } from "react";
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
import { MOCK_PROJECTS, MOCK_MONTHLY_REPORTS, MOCK_SEMI_MONTHLY_REPORTS, PROJECT_PHASES } from "@/components/project-reports/MockProjectData";
import { STAGE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Building2, User, TrendingUp, TrendingDown, Minus, Calendar, Target, Award, ShieldAlert, BookOpen, Wand2, Layers, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";

export default function QuarterlyReportPage() {
  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();

  const projectOptions = useMemo(() => {
    if (dbProjectsData && dbProjectsData.length > 0) {
      return dbProjectsData.map((p: any) => {
        const rawStage = p.requestStage || p.status || "execution";
        const arabicPhase = STAGE_LABELS[rawStage] || rawStage;
        return {
          id: String(p.id),
          name: p.name || `مشروع رقم ${p.projectNumber}`,
          manager: p.managerName || "غير محدد",
          department: "إدارة المشاريع",
          currentPhase: arabicPhase,
          plannedProgress: 80,
          actualProgress: p.completionPercentage || 0,
          cumulativeBudget: Number(p.budget) || 3500000,
          cumulativeSpent: Number(p.actualCost) || 2450000,
        };
      });
    }
    return MOCK_PROJECTS;
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectOptions[0]?.id || "proj-101");
  const [projectManager, setProjectManager] = useState<string>(projectOptions[0]?.manager || MOCK_PROJECTS[0].manager);
  const [quarter, setQuarter] = useState<string>("Q3");
  const [year, setYear] = useState<string>("2026");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentPhase, setCurrentPhase] = useState<string>(projectOptions[0]?.currentPhase || MOCK_PROJECTS[0].currentPhase);

  const [entryMode, setEntryMode] = useState<"manual" | "from_monthly" | "from_semi">("manual");
  const [selectedMonthlyId, setSelectedMonthlyId] = useState<string>("");
  const [selectedSemiId, setSelectedSemiId] = useState<string>("");
  const [isAggregated, setIsAggregated] = useState<boolean>(false);

  const availableMonthlyReports = useMemo(() => {
    return MOCK_MONTHLY_REPORTS.filter((r) => r.projectId === selectedProjectId);
  }, [selectedProjectId]);

  const availableSemiReports = useMemo(() => {
    return MOCK_SEMI_MONTHLY_REPORTS.filter((r) => r.projectId === selectedProjectId);
  }, [selectedProjectId]);

  // Selected Monthly Report & Auto-matched Monthly Reports for the Quarter
  const selectedMonthly = useMemo(() => {
    return availableMonthlyReports.find((r) => r.id === selectedMonthlyId);
  }, [availableMonthlyReports, selectedMonthlyId]);

  const autoMatchedMonthlies = useMemo(() => {
    if (!selectedMonthly) return [];
    return availableMonthlyReports.filter((r) => r.projectId === selectedProjectId);
  }, [availableMonthlyReports, selectedMonthly, selectedProjectId]);

  // Selected Semi Report & Auto-matched Semi Reports for the Quarter
  const selectedSemi = useMemo(() => {
    return availableSemiReports.find((r) => r.id === selectedSemiId);
  }, [availableSemiReports, selectedSemiId]);

  const autoMatchedSemis = useMemo(() => {
    if (!selectedSemi) return [];
    return availableSemiReports.filter((r) => r.projectId === selectedProjectId);
  }, [availableSemiReports, selectedSemi, selectedProjectId]);

  const [plannedProgress, setPlannedProgress] = useState<number>(75);
  const [actualProgress, setActualProgress] = useState<number>(70);

  const gap = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);
  const ragStatus = useMemo(() => {
    if (gap <= 5) return "أخضر";
    if (gap <= 25) return "أصفر";
    return "أحمر";
  }, [gap]);

  const [quarterMilestones, setQuarterMilestones] = useState<Record<string, any>[]>([
    { title: "اعتماد دراسات الجدوى الإنشائية", date: "2026-04-10", status: "منجز" },
    { title: "تركيب المنظومة الرئيسية", date: "2026-06-30", status: "منجز" },
  ]);

  const [cumulativeSpent, setCumulativeSpent] = useState<number>(projectOptions[0]?.cumulativeSpent || 2450000);
  const [cumulativeBudget, setCumulativeBudget] = useState<number>(projectOptions[0]?.cumulativeBudget || 3500000);

  const handleAggregateFromMonthly = () => {
    if (!selectedMonthly || autoMatchedMonthlies.length === 0) {
      toast.error("يرجى اختيار تقرير شهري واحد للبدء بالتجميع");
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
    toast.success(`تم العثور آلياً على ${autoMatchedMonthlies.length} تقارير شهرية متوفرة لهذا الربع وتوليد التقرير الربعي بنجاح!`);
  };

  const handleAggregateFromSemi = () => {
    if (!selectedSemi || autoMatchedSemis.length === 0) {
      toast.error("يرجى اختيار تقرير نصف شهري واحد للبدء بالتجميع");
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
    toast.success(`تم العثور آلياً على ${autoMatchedSemis.length} تقارير نصف شهرية للمشروع وتجميع التقرير الربعي بنجاح!`);
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
    }
  };

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

  const handleSaveDraft = () => {
    toast.success("تم حفظ التقرير بنجاح");
  };

  const handleSubmit = () => {
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

    setIsSubmitting(true);
    setTimeout(() => {
      setReportStatus("تم الاطلاع");
      setIsSubmitting(false);
      toast.success("تم رفع التقرير الربعي الاستراتيجي بنجاح إلى مجلس الإدارة!");
    }, 800);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
        <ReportHeaderTabs
          activeTab="quarterly"
          ragStatus={ragStatus === "أخضر" ? "green" : ragStatus === "أصفر" ? "yellow" : "red"}
          reportStatus={reportStatus}
          onSaveDraft={handleSaveDraft}
          onPrintPreview={() => setShowPreviewModal(true)}
          isSubmitting={isSubmitting}
          onStatusChange={setReportStatus}
        />

        <div className="space-y-6">
          {/* بيانات التقرير */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">بيانات التقرير والمشروع</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                ℹ️ تذكير: متوفر {autoMatchedMonthlies.length} تقارير شهرية فقط لهذا المشروع في هذا الربع، وسيتم تجميع الإنجاز بناءً على المتاح.
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
                            <Label className="text-[11px] font-semibold text-muted-foreground">التقارير النصف شهرية المربوطة تلقائياً لهذا المشروع ({autoMatchedSemis.length} متوفرة):</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {autoMatchedSemis.map((r) => (
                                <div key={r.id} className="p-2 rounded-md bg-background border border-teal-600/30 text-xs flex items-center justify-between">
                                  <span className="font-semibold text-foreground truncate">{r.title}</span>
                                  <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-600/40">{r.actualProgress}%</Badge>
                                </div>
                              ))}
                            </div>
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

                  <Label className="text-xs font-semibold">اسم المشروع</Label>
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر المشروع ليتم تعبئة البيانات تلقائياً" />
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
                  </Label>
                  <Select value={quarter} onValueChange={setQuarter}>
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
                  </Label>
                  <Select value={year} onValueChange={setYear}>
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
                  <Label className="text-xs font-semibold">تاريخ التقرير</Label>
                  <Input
                    type="date"
                    value={reportDate}
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
                  <Label className="text-xs font-semibold">نسبة الإنجاز المخطط التراكمية %</Label>
                  <Input
                    type="number"
                    value={plannedProgress}
                    onChange={(e) => setPlannedProgress(Number(e.target.value))}
                    placeholder="نسبة التخطيط التراكمي"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">نسبة الإنجاز الفعلي التراكمية %</Label>
                  <Input
                    type="number"
                    value={actualProgress}
                    onChange={(e) => setActualProgress(Number(e.target.value))}
                    placeholder="نسبة الإنجاز التراكمي الفعلي"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">الحالة العامة (RAG)</Label>
                  <div className="h-10 rounded-lg border border-border/80 bg-muted/30 px-3 flex items-center justify-between font-bold">
                    <span className="text-xs text-muted-foreground">الفجوة: {gap}%</span>
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
                      placeholder="المصروف الفعلي"
                      value={cumulativeSpent}
                      onChange={(e) => setCumulativeSpent(Number(e.target.value))}
                      className="h-10 border-border/80 text-xs font-bold w-1/2"
                    />
                    <span className="text-xs text-muted-foreground">من</span>
                    <Input
                      type="number"
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
                <RagIndicatorSelect label="مؤشر الوقت" value={timeIndicator} onChange={setTimeIndicator} />
                <RagIndicatorSelect label="مؤشر التكلفة" value={costIndicator} onChange={setCostIndicator} />
                <RagIndicatorSelect label="مؤشر التغيير" value={changeIndicator} onChange={setChangeIndicator} />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground block">الاتجاه العام للربع (مقارنة بالربع السابق)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
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
                  <Switch checked={needEscalation} onCheckedChange={setNeedEscalation} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات والوثائق</Label>
                <FileUpload
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="تحميل المرفقات الاستراتيجية والتقارير المالية"
                />
              </div>


            </CardContent>
          </Card>
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
    </DashboardLayout>
  );
}
