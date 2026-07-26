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
import { MOCK_PROJECTS, MOCK_SEMI_MONTHLY_REPORTS, PROJECT_PHASES } from "@/components/project-reports/MockProjectData";
import { STAGE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Calendar, Building2, User, Layers, Sparkles, Wand2, FileSpreadsheet, CheckCircle2, RefreshCw } from "lucide-react";

export default function MonthlyReportPage() {
  const [, setLocation] = useLocation();
  const createMutation = trpc.progressReports.create.useMutation();
  const updateStatusMutation = trpc.progressReports.updateStatus.useMutation();

  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();
  const { data: dbReports } = trpc.progressReports.list.useQuery();

  const projectOptions = useMemo(() => {
    if (dbProjectsData && dbProjectsData.length > 0) {
      const filtered = dbProjectsData.filter((p: any) => {
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
        const isMoreThanYear = start && end && (end.getTime() - start.getTime()) > (365 * 24 * 60 * 60 * 1000);
        return p.programType === "bunyan" || isMoreThanYear;
      });

      return filtered.map((p: any) => {
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
        };
      });
    }
    return MOCK_PROJECTS;
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    if (projectOptions.length > 0) {
      const exists = projectOptions.some((p) => String(p.id) === String(selectedProjectId));
      if (!exists) {
        setSelectedProjectId(projectOptions[0].id);
      }
    }
  }, [projectOptions, selectedProjectId]);
  const [projectManager, setProjectManager] = useState<string>(projectOptions[0]?.manager || MOCK_PROJECTS[0].manager);
  const [monthYear, setMonthYear] = useState<string>("2026-07");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentPhase, setCurrentPhase] = useState<string>(projectOptions[0]?.currentPhase || MOCK_PROJECTS[0].currentPhase);

  const [entryMode, setEntryMode] = useState<"manual" | "aggregate">("manual");
  const [selectedSemiId, setSelectedSemiId] = useState<string>("");
  const [isAggregated, setIsAggregated] = useState<boolean>(false);

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
        return {
          id: String(r.id),
          title: r.title,
          projectId: String(r.projectId),
          actualProgress: r.actualProgress || 0,
          plannedProgress: r.plannedProgress || 0,
          monthYear: r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 7) : (r.reportDate ? String(r.reportDate).substring(0, 7) : ""),
          period: startStr && endStr ? `${startStr} إلى ${endStr}` : "فترة غير محددة",
          milestones: [],
        };
      });
  }, [dbReports, selectedProjectId]);

  const selectedSemi = useMemo(() => {
    return availableSemiReports.find((r) => r.id === selectedSemiId);
  }, [availableSemiReports, selectedSemiId]);

  const autoMatchedSemi = useMemo(() => {
    if (!selectedSemi) return null;
    return availableSemiReports.find(
      (r) => r.id !== selectedSemi.id && r.monthYear === selectedSemi.monthYear
    ) || null;
  }, [availableSemiReports, selectedSemi]);

  const [plannedProgress, setPlannedProgress] = useState<number>(75);
  const [actualProgress, setActualProgress] = useState<number>(70);

  const gap = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);
  const ragStatus = useMemo(() => {
    if (gap <= 5) return "أخضر";
    if (gap <= 25) return "أصفر";
    return "أحمر";
  }, [gap]);

  const [milestones, setMilestones] = useState<Record<string, any>[]>([
    { title: "إنهاء أعمال الهيكل الخرساني", dueDate: "2026-06-15", status: "منجز" },
    { title: "تركيب تمديدات التكييف المركزي", dueDate: "2026-07-20", status: "جارٍ" },
  ]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");
  const [changeIndicator, setChangeIndicator] = useState<string>("أخضر");

  const handleAggregateSemiReports = () => {
    if (!selectedSemi) {
      toast.error("يرجى اختيار تقرير نصف شهري واحد للبدء بالتجميع");
      return;
    }

    const matchedList = [selectedSemi, autoMatchedSemi].filter(Boolean) as typeof availableSemiReports;
    const avgActual = Math.round(matchedList.reduce((acc, r) => acc + r.actualProgress, 0) / matchedList.length);
    const avgPlanned = Math.round(matchedList.reduce((acc, r) => acc + r.plannedProgress, 0) / matchedList.length);

    setActualProgress(avgActual);
    setPlannedProgress(avgPlanned);
    if (selectedSemi.monthYear) {
      setMonthYear(selectedSemi.monthYear);
    }

    const combinedMilestones: any[] = [];
    matchedList.forEach((r) => {
      if (r.milestones) combinedMilestones.push(...r.milestones);
    });
    if (combinedMilestones.length > 0) {
      setMilestones(combinedMilestones);
    }

    setIsAggregated(true);
    if (autoMatchedSemi) {
      toast.success(`تم العثور على التقرير المكمل ودمج بيانات نصفي الشهر بنجاح! (الإنجاز الفعلي: ${avgActual}%)`);
    } else {
      toast.info(`تم التجميع بناءً على التقرير الوحيد المتاح للمشروع بنجاح (الإنجاز: ${avgActual}%)`);
    }
  };

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
    }
  };



  const handleSaveDraft = async () => {
    if (!selectedProjectId) {
      toast.error("يرجى اختيار مشروع أولاً");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: `التقرير الشهري - ${selectedProjName}`,
        reportDate: reportDate || new Date().toISOString().split("T")[0],
        plannedProgress: plannedProgress,
        actualProgress: actualProgress,
        overallProgress: actualProgress,
        challenges: `شهر/سنة: ${monthYear}\nالمشكلات والعقبات: (انظر تفاصيل المعالم)`,
        recommendations: `المرحلة الحالية: ${currentPhase}`,
        workSummary: `تم استيراد البيانات من التقارير السابقة المدمجة`,
      });

      if (reportStatus !== "مسودة") {
        let statusEnum: "draft" | "submitted" | "reviewed" | "approved" = "draft";
        if (reportStatus === "تم الاطلاع") {
          statusEnum = "submitted";
        } else if (reportStatus === "معتمد") {
          statusEnum = "approved";
        }
        await updateStatusMutation.mutateAsync({
          id: res.id,
          status: statusEnum,
        });
      }

      toast.success(`تم حفظ التقرير بنجاح - رقم التقرير ${res.reportNumber}`);
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



  const selectedProjName = projectOptions.find((p) => String(p.id) === String(selectedProjectId))?.name || "";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
        <ReportHeaderTabs
          activeTab="monthly"
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
                        <Label className="text-[11px] font-semibold">اختر التقرير النصف شهري</Label>
                        <Select value={selectedSemiId} onValueChange={setSelectedSemiId}>
                          <SelectTrigger className="h-10 border-border/80 text-xs bg-background">
                            <SelectValue placeholder="اختر تقرير نصف شهري من التقارير المتاحة لهذا المشروع..." />
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

                      {/* حالة الربط التلقائي */}
                      {selectedSemi && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              📌 التقرير المحدد: <span className="text-teal-600 font-bold">{selectedSemi.title}</span> ({selectedSemi.period})
                            </span>
                            <Badge variant="outline" className="text-[10px]">إنجاز: {selectedSemi.actualProgress}%</Badge>
                          </div>

                          {autoMatchedSemi ? (
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <span className="flex items-center gap-1.5">
                                🔗 تم العثور آلياً على التقرير المكمل: <span className="font-bold">{autoMatchedSemi.title}</span> ({autoMatchedSemi.period})
                              </span>
                              <Badge className="bg-emerald-600 text-white text-[10px]">إنجاز: {autoMatchedSemi.actualProgress}%</Badge>
                            </div>
                          ) : (
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                              <span>⚠️ تنبيه: يتوفر تقرير نصف شهري واحد فقط متاح لهذا المشروع من النصف المطلوب. سيتم الاعتماد عليه وتأطير البيانات بناءً عليه.</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAggregateSemiReports}
                          disabled={!selectedSemi}
                          className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {autoMatchedSemi ? "دمج وتجميع بيانات النصفين تلقائياً" : "تجميع البيانات من التقرير المتاح"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Label className="text-xs font-semibold">اسم المشروع</Label>
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
                    <span>الشهر / السنة</span>
                  </Label>
                  <Input
                    type="month"
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    placeholder="اختر الشهر والشهر المشمول"
                    className="h-10 border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">تاريخ التقرير</Label>
                  <Input
                    type="date"
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
                    <span>نسبة الإنجاز المخطط %</span>
                    <span className="text-primary font-bold">{plannedProgress}%</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={plannedProgress}
                    onChange={(e) => setPlannedProgress(Number(e.target.value))}
                    placeholder="أدخل نسبة الإنجاز المخطط (0-100)"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>نسبة الإنجاز الفعلي %</span>
                    <span className="text-teal-600 font-bold">{actualProgress}%</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={actualProgress}
                    onChange={(e) => setActualProgress(Number(e.target.value))}
                    placeholder="أدخل نسبة الإنجاز الفعلي (0-100)"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>الفجوة (المخطط − الفعلي)</span>
                    <span className={`font-bold ${gap > 5 ? "text-destructive" : "text-emerald-600"}`}>
                      {gap}%
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
                <RagIndicatorSelect label="مؤشر الوقت" value={timeIndicator} onChange={setTimeIndicator} />
                <RagIndicatorSelect label="مؤشر التكلفة" value={costIndicator} onChange={setCostIndicator} />
                <RagIndicatorSelect label="مؤشر التغيير" value={changeIndicator} onChange={setChangeIndicator} />
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
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="رفع وثائق ومرفقات التقرير الشهري"
                />
              </div>


            </CardContent>
          </Card>
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
    </DashboardLayout>
  );
}
