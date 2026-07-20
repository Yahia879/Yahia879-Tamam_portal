import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar, Building2, User, ShieldAlert, Layers } from "lucide-react";

export default function MonthlyReportPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(MOCK_PROJECTS[0].id);
  const [projectManager, setProjectManager] = useState<string>(MOCK_PROJECTS[0].manager);
  const [monthYear, setMonthYear] = useState<string>("2026-07");
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

  const [milestones, setMilestones] = useState<Record<string, any>[]>([
    { title: "إنهاء أعمال الهيكل الخرساني", dueDate: "2026-06-15", status: "منجز" },
    { title: "تركيب تمديدات التكييف المركزي", dueDate: "2026-07-20", status: "جارٍ" },
  ]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");
  const [changeIndicator, setChangeIndicator] = useState<string>("أخضر");

  const [valueImpact, setValueImpact] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string>("");
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
    toast.success("تم حفظ مسودة التقرير الشهري بنجاح");
  };

  const handleSubmit = () => {
    if (ragStatus === "أحمر" && !recommendations.trim()) {
      toast.error("يرجى تدوين التوصيات نظراً لوجود مؤشر أحمر");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setReportStatus("تم الاطلاع");
      setIsSubmitting(false);
      toast.success("تم إرسال التقرير الشهري بنجاح إلى المكتب التنفيذي!");
    }, 800);
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



  const selectedProjName = MOCK_PROJECTS.find((p) => p.id === selectedProjectId)?.name || "";

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <ReportHeaderTabs
          activeTab="monthly"
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
                  <Label className="text-xs font-semibold">اسم المشروع</Label>
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر المشروع من القائمة ليتم تعبئة البيانات تلقائياً" />
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
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>المرحلة الحالية من دورة الحياة</span>
                  </Label>
                  <Select value={currentPhase} onValueChange={setCurrentPhase}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
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

          {/* حالة التقدم والمعالم */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
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



          {/* القيمة والمخرجات والقرارات */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">القيمة والمخرجات والقرارات</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">القيمة والأثر المتحقق أو المتوقع خلال الشهر</Label>
                <Textarea
                  placeholder="اصف الأثر الميداني المتحقق للمستفيدين أو القيمة المضافة المحققة خلال هذا الشهر..."
                  rows={3}
                  value={valueImpact}
                  onChange={(e) => setValueImpact(e.target.value)}
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">التوصيات والخطوات القادمة</Label>
                <Textarea
                  placeholder="أدخل التوصيات الإدارية والمقترحات للتحسين..."
                  rows={3}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <Label className="text-xs font-bold text-foreground">تصعيد التقرير</Label>
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
                  label="رفع وثائق ومرفقات التقرير الشهري"
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
            valueImpact,
            recommendations,
            needEscalation: needEscalation ? "نعم" : "لا",
            status: reportStatus,
          }}
        />
      </div>
    </DashboardLayout>
  );
}
