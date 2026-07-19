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
import { MOCK_PROJECTS } from "@/components/project-reports/MockProjectData";
import { toast } from "sonner";
import { User, Building2, Calendar, ShieldAlert } from "lucide-react";

export default function SemiMonthlyReportPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(MOCK_PROJECTS[0].id);
  const [projectManager, setProjectManager] = useState<string>(MOCK_PROJECTS[0].manager);
  const [ownerDepartment, setOwnerDepartment] = useState<string>(MOCK_PROJECTS[0].department);
  const [periodFrom, setPeriodFrom] = useState<string>("2026-07-01");
  const [periodTo, setPeriodTo] = useState<string>("2026-07-15");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [plannedProgress, setPlannedProgress] = useState<number>(75);
  const [actualProgress, setActualProgress] = useState<number>(70);

  const gap = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);

  const ragStatus = useMemo(() => {
    if (gap <= 5) return "أخضر";
    if (gap <= 25) return "أصفر";
    return "أحمر";
  }, [gap]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");
  const [qualityIndicator, setQualityIndicator] = useState<string>("أخضر");
  const [riskIndicator, setRiskIndicator] = useState<string>("أخضر");

  const [deviations, setDeviations] = useState<Record<string, any>[]>([]);
  const [risks, setRisks] = useState<Record<string, any>[]>([]);
  const [issues, setIssues] = useState<Record<string, any>[]>([]);

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
      setOwnerDepartment(proj.department);
      if (proj.plannedProgress !== undefined) setPlannedProgress(proj.plannedProgress);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
    }
  };

  useEffect(() => {
    const hasRedIndicator =
      ragStatus === "أحمر" ||
      timeIndicator === "أحمر" ||
      costIndicator === "أحمر" ||
      qualityIndicator === "أحمر" ||
      riskIndicator === "أحمر";
    if (hasRedIndicator) {
      setNeedEscalation(true);
    }
  }, [ragStatus, timeIndicator, costIndicator, qualityIndicator, riskIndicator]);

  const handleSaveDraft = () => {
    setReportStatus("مسودة");
    toast.success("تم حفظ مسودة التقرير بنجاح");
  };

  const handleSubmit = () => {
    if (ragStatus !== "أخضر" && deviations.length === 0) {
      toast.error("يرجى إضافة الانحرافات نظراً لتجاوز الفجوة المستهدفة");
      return;
    }
    if (ragStatus === "أحمر" && !recommendations.trim()) {
      toast.error("يرجى كتابة التوصيات نظراً لوجود مؤشر أحمر");
      return;
    }
    if (new Date(periodTo) < new Date(periodFrom)) {
      toast.error("تاريخ (إلى) يجب أن يكون بعد أو ينسجم مع تاريخ (من)");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setReportStatus("مُرسل");
      setIsSubmitting(false);
      toast.success("تم إرسال التقرير نصف الشهري بنجاح إلى الإدارة المعنية!");
    }, 800);
  };

  const deviationCols: ColumnDef[] = [
    { key: "description", label: "وصف الانحراف", type: "text", placeholder: "أدخل وصف الانحراف المرصود" },
    { key: "cause", label: "سبب الانحراف", type: "text", placeholder: "أسباب حدوث الانحراف" },
    { key: "impact", label: "الأثر المترتب", type: "text", placeholder: "أثره على الوقت أو التكلفة" },
  ];

  const riskCols: ColumnDef[] = [
    { key: "description", label: "وصف الخطر", type: "text", placeholder: "وصف الخطر المحتمل" },
    { key: "plan", label: "خطة التعامل والحد", type: "text", placeholder: "إجراءات التخفيف" },
    { key: "assignee", label: "المسؤول عن المتابعة", type: "text", placeholder: "الاسم أو الجهة" },
  ];

  const issueCols: ColumnDef[] = [
    { key: "issue", label: "القضية المرصودة", type: "text", placeholder: "وصف القضية" },
    { key: "action", label: "الإجراء التصحيحي", type: "text", placeholder: "الخطوات المتخذة" },
    { key: "assignee", label: "المسؤول", type: "text", placeholder: "الشخص المسؤول" },
    {
      key: "status",
      label: "الحالة",
      type: "select",
      options: [
        { value: "مفتوح", label: "مفتوح" },
        { value: "مغلق", label: "مغلق" },
      ],
    },
  ];

  const selectedProjName = MOCK_PROJECTS.find((p) => p.id === selectedProjectId)?.name || "";

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <ReportHeaderTabs
          activeTab="semi-monthly"
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
                  <Input
                    value={projectManager}
                    readOnly
                    placeholder="مدير المشروع المرتبط"
                    className="h-10 bg-muted/40 font-semibold text-foreground border-border/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>الإدارة المالكة</span>
                  </Label>
                  <Input
                    value={ownerDepartment}
                    readOnly
                    placeholder="الإدارة المالكة للمشروع"
                    className="h-10 bg-muted/40 font-semibold text-foreground border-border/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>تاريخ التقرير</span>
                  </Label>
                  <Input
                    type="date"
                    value={reportDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setReportDate(e.target.value)}
                    placeholder="تاريخ التقرير اليوم أو سابق"
                    className="h-10 border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">فترة التقرير (من)</Label>
                  <Input
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    placeholder="بداية النصف شهري"
                    className="h-10 border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">فترة التقرير (إلى)</Label>
                  <Input
                    type="date"
                    value={periodTo}
                    min={periodFrom}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    placeholder="نهاية النصف شهري (تاريخ أكبر من أو يساوي تاريخ من)"
                    className="h-10 border-border/80"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* حالة التقدم */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">حالة التقدم ونسبة الإنجاز</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
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
                    <span>فجوة الإنجاز المحسوبة</span>
                    <span className={`font-bold ${gap > 5 ? "text-destructive" : "text-emerald-600"}`}>
                      {gap}%
                    </span>
                  </Label>
                  <div className="h-10 rounded-lg border border-border/80 bg-muted/30 px-3 flex items-center justify-between font-bold">
                    <span className="text-xs text-muted-foreground">الحالة العامة:</span>
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
            </CardContent>
          </Card>

          {/* المؤشرات التشغيلية */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المؤشرات التشغيلية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <RagIndicatorSelect
                  label="مؤشر الوقت"
                  value={timeIndicator}
                  onChange={setTimeIndicator}
                />
                <RagIndicatorSelect
                  label="مؤشر التكلفة"
                  value={costIndicator}
                  onChange={setCostIndicator}
                />
                <RagIndicatorSelect
                  label="مؤشر الجودة"
                  value={qualityIndicator}
                  onChange={setQualityIndicator}
                />
                <RagIndicatorSelect
                  label="مؤشر المخاطر"
                  value={riskIndicator}
                  onChange={setRiskIndicator}
                />
              </div>
            </CardContent>
          </Card>

          {/* الانحرافات والقضايا */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">الانحرافات والقضايا الميدانية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <DynamicArrayTable
                title="الانحرافات"
                columns={deviationCols}
                rows={deviations}
                onChange={setDeviations}
                emptyLabel="اضغط إضافة صف جديد لتسجيل الانحرافات"
              />

              <DynamicArrayTable
                title="المخاطر التشغيلية"
                columns={riskCols}
                rows={risks}
                onChange={setRisks}
                emptyLabel="اضغط إضافة صف جديد لتسجيل المخاطر"
              />

              <DynamicArrayTable
                title="القضايا والإجراءات التصحيحية"
                columns={issueCols}
                rows={issues}
                onChange={setIssues}
                emptyLabel="اضغط إضافة صف جديد لتسجيل القضايا"
              />
            </CardContent>
          </Card>

          {/* التوصيات والتصعيد */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">التوصيات والتصعيد الإداري</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">التوصيات الإدارية والتشغيلية</Label>
                <Textarea
                  placeholder="أدخل التوصيات والخطوات القادمة المطلوبة لحل التحديات والنهوض بالمشروع..."
                  rows={4}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <Label className="text-xs font-bold text-foreground">تصعيد إداري للإدارة العليا</Label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold">{needEscalation ? "نعم" : "لا"}</span>
                  <Switch
                    checked={needEscalation}
                    onCheckedChange={setNeedEscalation}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات والوثائق</Label>
                <FileUpload
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="تحميل المرفقات والتقارير الميدانية"
                  description="اسحب الصور أو ملفات PDF الخاصة بتقرير النصف شهري هنا"
                />
              </div>

              <div className="space-y-1.5 pt-3 border-t border-border/60">
                <Label className="text-xs font-bold">حالة التقرير</Label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger className="h-10 border-border/80 w-full md:w-64">
                    <SelectValue placeholder="اختر حالة التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مسودة" className="text-xs">مسودة (Draft)</SelectItem>
                    <SelectItem value="مُرسل" className="text-xs">مُرسل (Submitted)</SelectItem>
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
          reportType="semi-monthly"
          reportTitle="تقرير نصف شهري للمشروع"
          data={{
            projectName: selectedProjName,
            projectManager,
            ownerDepartment,
            periodFrom,
            periodTo,
            reportDate,
            plannedProgress,
            actualProgress,
            gap,
            ragStatus,
            recommendations,
            needEscalation: needEscalation ? "نعم" : "لا",
            status: reportStatus,
          }}
        />
      </div>
    </DashboardLayout>
  );
}
