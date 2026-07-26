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
import { MOCK_PROJECTS } from "@/components/project-reports/MockProjectData";
import { toast } from "sonner";
import { User, Building2, Calendar, ShieldAlert, Plus, Trash2, Link2 } from "lucide-react";

export default function SemiMonthlyReportPage() {
  const [, setLocation] = useLocation();
  const createMutation = trpc.progressReports.create.useMutation();
  const updateStatusMutation = trpc.progressReports.updateStatus.useMutation();

  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();

  const projectOptions = useMemo(() => {
    if (dbProjectsData && dbProjectsData.length > 0) {
      const filtered = dbProjectsData.filter((p: any) => {
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
        const isMoreThanYear = start && end && (end.getTime() - start.getTime()) > (365 * 24 * 60 * 60 * 1000);
        return p.programType === "bunyan" || isMoreThanYear;
      });

      return filtered.map((p: any) => ({
        id: String(p.id),
        name: p.name || `مشروع رقم ${p.projectNumber}`,
        manager: p.managerName || "غير محدد",
        department: "إدارة المشاريع",
        plannedProgress: 80,
        actualProgress: p.completionPercentage || 0,
      }));
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

  const [recommendations, setRecommendations] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [requiredSupport, setRequiredSupport] = useState<string>("");
  const [externalLinks, setExternalLinks] = useState<{ title: string; url: string }[]>([
    { title: "", url: "" }
  ]);

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
    }
  };

  useEffect(() => {
    const proj = projectOptions.find((p) => String(p.id) === String(selectedProjectId));
    if (proj && proj.manager) {
      setProjectManager(proj.manager);
    }
  }, [projectOptions, selectedProjectId]);

  useEffect(() => {
    const hasRedIndicator =
      ragStatus === "أحمر" ||
      timeIndicator === "أحمر" ||
      costIndicator === "أحمر";
    if (hasRedIndicator) {
      setNeedEscalation(true);
    }
  }, [ragStatus, timeIndicator, costIndicator]);

  const handleSaveDraft = async () => {
    if (!selectedProjectId) {
      toast.error("يرجى اختيار مشروع أولاً");
      return;
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
        <ReportHeaderTabs
          activeTab="semi-monthly"
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
                  value={timeIndicator}
                  onChange={setTimeIndicator}
                />
                <RagIndicatorSelect
                  label="مؤشر التكلفة"
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
                    onClick={handleAddLink}
                    className="h-8 text-xs gap-1 text-teal-600 border-teal-500/30 hover:bg-teal-500/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة رابط جديد
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {externalLinks.map((linkItem, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                        <Input
                          placeholder="اسم الرابط (مثال: مجلد الصور، تقرير الاستشاري)"
                          value={linkItem.title}
                          onChange={(e) => handleLinkChange(idx, "title", e.target.value)}
                          className="h-9 text-xs bg-background"
                        />
                        <Input
                          type="url"
                          placeholder="الرابط (https://...)"
                          value={linkItem.url}
                          onChange={(e) => handleLinkChange(idx, "url", e.target.value)}
                          className="h-9 text-xs bg-background dir-ltr text-right"
                        />
                      </div>
                      {externalLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLink(idx)}
                          className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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
    </DashboardLayout>
  );
}
