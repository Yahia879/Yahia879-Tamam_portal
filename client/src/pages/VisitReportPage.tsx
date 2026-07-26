import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { ReportHeaderTabs } from "@/components/project-reports/ReportHeaderTabs";
import { ReportPrintPreviewModal } from "@/components/project-reports/ReportPrintPreviewModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Building2, User, Calendar, FileText, CheckCircle2, Eye, Target, Save, Printer } from "lucide-react";

export default function VisitReportPage({ showLayout = true }: { showLayout?: boolean }) {
  const [, setLocation] = useLocation();
  const createMutation = trpc.progressReports.create.useMutation();
  const updateStatusMutation = trpc.progressReports.updateStatus.useMutation();

  const { user } = useAuth();
  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();

  const projectOptions = useMemo(() => {
    if (dbProjectsData && dbProjectsData.length > 0) {
      return dbProjectsData.map((p: any) => ({
        id: String(p.id),
        name: p.name || `مشروع رقم ${p.projectNumber}`,
      }));
    }
    return [];
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [visitorName, setVisitorName] = useState<string>(
    user?.name || "مفتش ميداني"
  );
  const [notes, setNotes] = useState<string>("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const [purpose, setPurpose] = useState<"للاطلاع" | "لاتخاذ قرار">("للاطلاع");
  const [submittedTo, setSubmittedTo] = useState<string>("إدارة المشاريع الإنشائية والهندسية");
  const [reportStatus, setReportStatus] = useState<string>("تم الاطلاع");

  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSaveDraft = async (overrideStatus?: string) => {
    const finalStatus = overrideStatus || reportStatus || "مسودة";
    if (!selectedProjectId) {
      toast.error("يرجى اختيار المشروع أولاً من القائمة قبل حفظ التقرير");
      return;
    }
    if (!notes.trim()) {
      toast.error("يرجى إدخال الملاحظات المرصودة أثناء الزيارة");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (visitDate > todayStr) {
      toast.error("لا يمكن إدخال تاريخ زيارة في المستقبل");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: `تقرير زيارة - ${selectedProjName}`,
        reportDate: visitDate || new Date().toISOString().split("T")[0],
        plannedProgress: 0,
        actualProgress: 0,
        overallProgress: 0,
        challenges: `الملاحظات: ${notes}`,
        recommendations: `الغرض: ${purpose}\nالمرسل إليه: ${submittedTo}\nاسم الزائر: ${visitorName}`,
        workSummary: `الزيارة الميدانية التفقدية`,
      });

      let statusEnum: "draft" | "submitted" | "reviewed" | "approved" = "draft";
      if (finalStatus === "تم الاطلاع") {
        statusEnum = "submitted";
      } else if (finalStatus === "معتمد") {
        statusEnum = "approved";
      }
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

  const selectedProjName = projectOptions.find((p) => String(p.id) === String(selectedProjectId))?.name || "";

  const content = (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">

        <div className="space-y-6">
          {/* بيانات الزيارة الميدانية */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">بيانات الزيارة الميدانية</CardTitle>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const targetId = selectedProjectId || "1";
                    window.open(`/project-reports/${targetId}/print`, '_blank');
                  }}
                  className="gap-2 text-xs font-bold border-teal-600/40 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 h-9 rounded-lg"
                >
                  <Printer className="w-4 h-4 text-teal-600" />
                  <span>معاينة وطباعة التقرير (PDF)</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>اسم المشروع</span>
                  </Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر المشروع المزار" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs py-2">
                          <span className="font-semibold">{p.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>تاريخ الزيارة</span>
                  </Label>
                  <Input
                    type="date"
                    value={visitDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setVisitDate(e.target.value)}
                    placeholder="تاريخ الزيارة اليوم أو سابق"
                    className="h-10 border-border/80"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>القائم بالزيارة</span>
                  </Label>
                  <Input
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="اسم المفتش أو الزائر (المستخدم الحالي)"
                    className="h-10 border-border/80 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>الملاحظات المرصودة أثناء الزيارة</span>
                  </Label>
                </div>
                <Textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب الملاحظات التفصيلية والمرئيات المرصودة ميدانياً في موقع المشروع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات وصور الموقع</Label>
                <FileUpload
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="تحميل صور الموقع والزيارة"
                  description="اسحب الصور الملتقطة أثناء الزيارة هنا"
                />
              </div>
            </CardContent>
          </Card>

          {/* الغرض والرفع والإحالة */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">الغرض والرفع والإحالة</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span>غرض الرفع</span>
                  </Label>
                  <Select value={purpose} onValueChange={(v: any) => setPurpose(v)}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر غرض الرفع (للاطلاع / اتخاذ قرار)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="للاطلاع" className="text-xs">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>للاطلاع والعلم</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="لاتخاذ قرار" className="text-xs">
                        <div className="flex items-center gap-2 font-bold text-teal-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>لاتخاذ قرار إداري / توجيه</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>يُرفع إلى (الإدارة المستقبِلة)</span>
                  </Label>
                  <Select value={submittedTo} onValueChange={setSubmittedTo}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر الجهة أو الإدارة المستقبِلة للتقرير" />
                    </SelectTrigger>
                    <SelectContent>
                      {["إدارة المشاريع الإنشائية والهندسية", "إدارة التشغيل والصيانة الفنية", "إدارة الاستدامة والطاقة النظيفة", "إدارة الخدمات المساندة والعناية بالمساجد", "الإدارة العامة للتخطيط والتطوير", "إدارة الشؤون المالية والاستثمار", "إدارة الجودة والسلامة المهنية"].map((dept: string) => (
                        <SelectItem key={dept} value={dept} className="text-xs">
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


              </div>
            </CardContent>
          </Card>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-end gap-3 p-4 bg-card border border-border/80 rounded-xl shadow-xs">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleSaveDraft("مسودة")}
              className="gap-2 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Save className="w-4 h-4" />
              حفظ كمسودة
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveDraft("معتمد")}
              className="gap-2 text-xs font-bold bg-[#1a5f4a] hover:bg-[#154d3c] text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              حفظ واعتتماد التقرير
            </Button>
          </div>
        </div>

        <ReportPrintPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          reportType="visit"
          reportTitle="تقرير الزيارة الميدانية"
          data={{
            projectName: selectedProjName,
            projectManager: visitorName,
            ownerDepartment: submittedTo,
            visitDate,
            notes,
            purpose,
            submittedTo,
            status: reportStatus,
          }}
        />
      </div>
    );

  return showLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}
