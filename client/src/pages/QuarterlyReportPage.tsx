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
import { MOCK_PROJECTS, PROJECT_PHASES } from "@/components/project-reports/MockProjectData";
import { toast } from "sonner";
import { Building2, User, TrendingUp, TrendingDown, Minus, Calendar, Target, Award, ShieldAlert, BookOpen } from "lucide-react";

export default function QuarterlyReportPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(MOCK_PROJECTS[0].id);
  const [projectManager, setProjectManager] = useState<string>(MOCK_PROJECTS[0].manager);
  const [quarter, setQuarter] = useState<string>("Q3");
  const [year, setYear] = useState<string>("2026");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentPhase, setCurrentPhase] = useState<string>(MOCK_PROJECTS[0].currentPhase);

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

  const [cumulativeSpent, setCumulativeSpent] = useState<number>(MOCK_PROJECTS[0].cumulativeSpent || 2450000);
  const [cumulativeBudget, setCumulativeBudget] = useState<number>(MOCK_PROJECTS[0].cumulativeBudget || 3500000);

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
    const proj = MOCK_PROJECTS.find((p) => p.id === projId);
    if (proj) {
      setProjectManager(proj.manager);
      setCurrentPhase(proj.currentPhase);
      if (proj.plannedProgress !== undefined) setPlannedProgress(proj.plannedProgress);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
      if (proj.cumulativeBudget !== undefined) setCumulativeBudget(proj.cumulativeBudget);
      if (proj.cumulativeSpent !== undefined) setCumulativeSpent(proj.cumulativeSpent);
    }
  };

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
    setReportStatus("مسودة");
    toast.success("تم حفظ مسودة التقرير الربعي بنجاح");
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



  const selectedProjName = MOCK_PROJECTS.find((p) => p.id === selectedProjectId)?.name || "";

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <ReportHeaderTabs
          activeTab="quarterly"
          ragStatus={ragStatus === "أخضر" ? "green" : ragStatus === "أصفر" ? "yellow" : "red"}
          reportStatus={reportStatus}
          onSaveDraft={handleSaveDraft}
          onSubmitReport={handleSubmit}
          onPrintPreview={() => setShowPreviewModal(true)}
          isSubmitting={isSubmitting}
        />

        <div className="space-y-6">
          {/* بيانات التقرير */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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
                  <Label className="text-xs font-semibold">اسم المشروع / البرنامج</Label>
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر المشروع أو البرنامج ليتم تعبئة البيانات تلقائياً" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PROJECTS.map((p) => (
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
                    <span>الربع / السنة</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger className="h-10 border-border/80 bg-background w-1/2">
                        <SelectValue placeholder="الربع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q1" className="text-xs">الربع الأول (Q1)</SelectItem>
                        <SelectItem value="Q2" className="text-xs">الربع الثاني (Q2)</SelectItem>
                        <SelectItem value="Q3" className="text-xs">الربع الثالث (Q3)</SelectItem>
                        <SelectItem value="Q4" className="text-xs">الربع الرابع (Q4)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="h-10 border-border/80 bg-background w-1/2">
                        <SelectValue placeholder="السنة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025" className="text-xs">2025</SelectItem>
                        <SelectItem value="2026" className="text-xs">2026</SelectItem>
                        <SelectItem value="2027" className="text-xs">2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Label className="text-xs font-semibold">المرحلة الحالية من دورة الحياة</Label>
                  <Select value={currentPhase} onValueChange={setCurrentPhase}>
                    <SelectTrigger className="h-10 border-border/80 bg-background">
                      <SelectValue placeholder="اختر مرحلة المشروع الحالية" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase} className="text-xs">
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الأداء التراكمي */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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

              <div className="space-y-1.5 pt-3 border-t border-border/60">
                <Label className="text-xs font-bold">حالة التقرير</Label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger className="h-10 border-border/80 w-full md:w-64">
                    <SelectValue placeholder="اختر حالة التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تم الاطلاع" className="text-xs">تم الاطلاع (Reviewed)</SelectItem>
                    <SelectItem value="معتمد" className="text-xs">معتمد (Approved)</SelectItem>
                  </SelectContent>
                </Select>
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
