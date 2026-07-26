import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Building2, Calendar, ShieldAlert, Plus, Trash2, Link2, Save, CheckCircle2, Eye, Printer, AlertCircle } from "lucide-react";

export default function SemiMonthlyReportPage({ showLayout = true }: { showLayout?: boolean }) {
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
        .map((p: any) => ({
          id: String(p.id),
          name: p.name || `مشروع رقم ${p.projectNumber}`,
          manager: p.managerName || "غير محدد",
          department: "إدارة المشاريع",
          plannedProgress: p.plannedProgress ?? 0,
          actualProgress: p.completionPercentage ?? 0,
        }));
    }
    return [];
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectManager, setProjectManager] = useState<string>("غير محدد");
  const [periodFrom, setPeriodFrom] = useState<string>("2026-07-01");
  const [periodTo, setPeriodTo] = useState<string>("2026-07-15");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [plannedProgress, setPlannedProgress] = useState<number>(0);
  const [actualProgress, setActualProgress] = useState<number>(0);

  useEffect(() => {
    if (existingReport) {
      if (existingReport.projectId) setSelectedProjectId(String(existingReport.projectId));
      if (existingReport.plannedProgress !== null && existingReport.plannedProgress !== undefined) {
        setPlannedProgress(existingReport.plannedProgress);
      }
      if (existingReport.actualProgress !== null && existingReport.actualProgress !== undefined) {
        setActualProgress(existingReport.actualProgress);
      }
      if (existingReport.challenges) setChallenges(existingReport.challenges);
      if (existingReport.recommendations) setRecommendations(existingReport.recommendations);
      if (existingReport.reportDate) setReportDate(String(existingReport.reportDate).split("T")[0]);
      if (existingReport.reportPeriodStart) setPeriodFrom(String(existingReport.reportPeriodStart).split("T")[0]);
      if (existingReport.reportPeriodEnd) setPeriodTo(String(existingReport.reportPeriodEnd).split("T")[0]);
    }
  }, [existingReport]);

  const gap = useMemo(() => actualProgress - plannedProgress, [actualProgress, plannedProgress]);
  const delay = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);

  const ragStatus = useMemo(() => {
    if (delay < 5) return "أخضر";
    if (delay < 25) return "أصفر";
    return "أحمر";
  }, [delay]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");

  const [recommendations, setRecommendations] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [requiredSupport, setRequiredSupport] = useState<string>("");
  const [externalLinks, setExternalLinks] = useState<{ title: string; url: string }[]>([]);

  const handleAddLink = () => {
    setExternalLinks([...externalLinks, { title: "", url: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: "title" | "url", value: string) => {
    const updated = [...externalLinks];
    updated[index][field] = value;
    setExternalLinks(updated);
  };
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
      if (proj.plannedProgress !== undefined) setPlannedProgress(proj.plannedProgress);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
    }
  };

  useEffect(() => {
    const hasRedIndicator =
      ragStatus === "أحمر" ||
      timeIndicator === "أحمر" ||
      costIndicator === "أحمر";
    if (hasRedIndicator) {
      setNeedEscalation(true);
    }
  }, [ragStatus, timeIndicator, costIndicator]);

  const handleSaveDraft = async (overrideStatus?: string) => {
    const finalStatus = overrideStatus || reportStatus || "مسودة";
    if (!selectedProjectId) {
      toast.error("يرجى اختيار المشروع أولاً من القائمة قبل حفظ التقرير");
      return;
    }

    // التحقق من صحة عناوين الروابط الخارجية
    for (const link of externalLinks) {
      if (link.url.trim() && !/^(https?:\/\/)/i.test(link.url.trim())) {
        toast.error(`الرابط "${link.title || link.url}" غير صحيح. يجب أن يبدأ بـ http:// أو https://`);
        return;
      }
    }

    if (ragStatus === "أحمر" && !recommendations.trim()) {
      toast.error("يرجى كتابة التوصيات نظراً لوجود مؤشر أحمر");
      return;
    }
    if (periodFrom && periodTo && new Date(periodTo) < new Date(periodFrom)) {
      toast.error("تاريخ (إلى) يجب أن يكون بعد أو ينسجم مع تاريخ (من)");
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
          title: `تقرير نصف شهري - ${selectedProjName}`,
          plannedProgress: plannedProgress,
          actualProgress: actualProgress,
          overallProgress: actualProgress,
          challenges: challenges,
          recommendations: recommendations,
          workSummary: `الدعم المطلوب: ${requiredSupport}\nمؤشر الوقت: ${timeIndicator}\nمؤشر التكلفة: ${costIndicator}\nتصعيد إداري: ${needEscalation ? "نعم" : "لا"}`,
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
        title: `تقرير نصف شهري - ${selectedProjName}`,
        reportDate: reportDate || new Date().toISOString().split("T")[0],
        reportPeriodStart: periodFrom || undefined,
        reportPeriodEnd: periodTo || undefined,
        plannedProgress: plannedProgress,
        actualProgress: actualProgress,
        overallProgress: actualProgress,
        challenges: challenges,
        recommendations: recommendations,
        workSummary: `الدعم المطلوب: ${requiredSupport}\nمؤشر الوقت: ${timeIndicator}\nمؤشر التكلفة: ${costIndicator}\nتصعيد إداري: ${needEscalation ? "نعم" : "لا"}`,
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

  const selectedProjName = projectOptions.find((p) => String(p.id) === String(selectedProjectId))?.name || "";

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
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {!selectedProjectId && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>يرجى اختيار المشروع أولاً لتفعيل تعبئة كافة حقول وخيارات التقرير.</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>تاريخ التقرير</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="date"
                    disabled={!selectedProjectId}
                    value={reportDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setReportDate(e.target.value)}
                    placeholder="تاريخ التقرير اليوم أو سابق"
                    className="h-10 border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>فترة التقرير (من)</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="date"
                    disabled={!selectedProjectId}
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    placeholder="بداية النصف شهري"
                    className="h-10 border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>فترة التقرير (إلى)</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="date"
                    disabled={!selectedProjectId}
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
            <CardHeader className="pb-3 border-b border-border/60">
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
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المؤشرات التشغيلية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RagIndicatorSelect
                  label="مؤشر الوقت"
                  disabled={!selectedProjectId}
                  value={timeIndicator}
                  onChange={setTimeIndicator}
                />
                <RagIndicatorSelect
                  label="مؤشر التكلفة"
                  disabled={!selectedProjectId}
                  value={costIndicator}
                  onChange={setCostIndicator}
                />
              </div>
            </CardContent>
          </Card>



          {/* التوصيات والتصعيد */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">التوصيات والتصعيد الإداري</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">التحديات والعقبات</Label>
                <Textarea
                  disabled={!selectedProjectId}
                  placeholder="أدخل التحديات والعقبات الميدانية التي تواجه تنفيذ المشروع..."
                  rows={3}
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الدعم المطلوب</Label>
                <Textarea
                  disabled={!selectedProjectId}
                  placeholder="حدد طبيعة الدعم الإداري أو الفني أو المالي المطلوب من الإدارة..."
                  rows={3}
                  value={requiredSupport}
                  onChange={(e) => setRequiredSupport(e.target.value)}
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">التوصيات الإدارية والتشغيلية</Label>
                <Textarea
                  disabled={!selectedProjectId}
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
                    disabled={!selectedProjectId}
                    checked={needEscalation}
                    onCheckedChange={setNeedEscalation}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات والوثائق</Label>
                <FileUpload
                  disabled={!selectedProjectId}
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="تحميل المرفقات والتقارير الميدانية"
                  description="اسحب الصور أو ملفات PDF الخاصة بتقرير النصف شهري هنا"
                />
              </div>

              {/* قسم الروابط الخارجية */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-primary" />
                    <span>الروابط الخارجية والمراجع</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedProjectId}
                    onClick={handleAddLink}
                    className="h-8 text-xs gap-1 text-teal-600 border-teal-500/30 hover:bg-teal-500/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة رابط جديد
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {externalLinks.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-muted/20 border border-dashed border-border/60">
                      <p className="text-xs text-muted-foreground">لا توجد روابط خارجية مضافة (قسم اختياري)</p>
                    </div>
                  ) : (
                    externalLinks.map((linkItem, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                          <Input
                            placeholder="اسم الرابط (مثال: مجلد الصور، تقرير الاستشاري)"
                            value={linkItem.title}
                            disabled={!selectedProjectId}
                            onChange={(e) => handleLinkChange(idx, "title", e.target.value)}
                            className="h-9 text-xs bg-background"
                          />
                          <Input
                            type="url"
                            placeholder="الرابط (https://...)"
                            disabled={!selectedProjectId}
                            value={linkItem.url}
                            onChange={(e) => handleLinkChange(idx, "url", e.target.value)}
                            className="h-9 text-xs bg-background dir-ltr text-right"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!selectedProjectId}
                          onClick={() => handleRemoveLink(idx)}
                          className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                          title="حذف الرابط"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
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
          reportType="semi-monthly"
          reportTitle="تقرير نصف شهري للمشروع"
          data={{
            projectName: selectedProjName,
            projectManager,
            periodFrom,
            periodTo,
            reportDate,
            plannedProgress,
            actualProgress,
            gap,
            ragStatus,
            recommendations,
            challenges,
            requiredSupport,
            externalLinks: externalLinks.filter((l) => l.title || l.url),
            needEscalation: needEscalation ? "نعم" : "لا",
            status: reportStatus,
          }}
        />
      </div>
    );

  return showLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}
