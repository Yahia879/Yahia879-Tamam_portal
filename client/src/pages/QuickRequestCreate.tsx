import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { cn } from "@/lib/utils";
import { 
  ArrowRight,
  ArrowLeft,
  Save,
  Building2,
  ClipboardList,
  Zap,
  Camera,
  User
} from "lucide-react";

// تقييمات الأعمال
const EVALUATION_OPTIONS = [
  { value: "excellent", labelAr: "ممتاز", labelEn: "Excellent", dotColor: "bg-emerald-500" },
  { value: "good", labelAr: "جيد", labelEn: "Good", dotColor: "bg-teal-500" },
  { value: "acceptable", labelAr: "مقبول", labelEn: "Acceptable", dotColor: "bg-blue-500" },
  { value: "needs_improvement", labelAr: "يحتاج تحسين", labelEn: "Needs Improvement", dotColor: "bg-amber-500" },
  { value: "poor", labelAr: "ضعيف", labelEn: "Poor", dotColor: "bg-rose-500" },
];

const translations = {
  ar: {
    title: "إنشاء طلب سريع وإغلاقه",
    subtitle: "تسجيل بلاغ استجابة سريعة جديد، وتوثيق الأعمال المنفذة وإغلاق الطلب مباشرة",
    mosqueAndRequest: "بيانات المسجد والطلب",
    mosqueAndRequestDesc: "أدخل اسم المسجد وحدد نوع الخدمة المطلوبة",
    selectMosque: "اسم المسجد",
    selectMosquePlaceholder: "أدخل اسم المسجد",
    programType: "الخدمة",
    description: "وصف البلاغ والمشكلة",
    descriptionPlaceholder: "صف بالتفصيل البلاغ أو العطل الطارئ...",
    technicianName: "الفني المختص / المنفذ",
    technicianPlaceholder: "اسم الفني المسؤول عن التنفيذ أو التقييم",
    reportAndClose: "تقرير الاستجابة السريعة والإغلاق",
    reportAndCloseDesc: "توثيق الإصلاحات والحالة الفنية لإغلاق البلاغ",
    technicalEvaluation: "التقييم الفني",
    technicalEvaluationDesc: "التقييم العام للأعمال من الناحية الفنية",
    technicalEvaluationLabel: "التقييم الفني والأسباب",
    technicalEvaluationPlaceholder: "وصف التقييم الفني للأعمال المنفذة...",
    finalEvaluation: "التقييم النهائي للأعمال",
    finalEvaluationPlaceholder: "اختر التقييم النهائي للأعمال المنفذة...",
    unexecutedWorks: "الأعمال غير المنفذة / أسباب عدم التنفيذ",
    unexecutedWorksDesc: "في حال وجود أعمال لم تُنفذ، يرجى ذكرها مع أسباب عدم التنفيذ...",
    attachments: "الصور التوثيقية (اختياري)",
    attachmentsDesc: "توثيق الحالة ميدانياً قبل/أثناء/بعد التنفيذ (حتى 5 صور)",
    cancel: "إلغاء",
    save: "حفظ وإغلاق الطلب",
    saving: "جاري الحفظ...",
    requiredFields: "يرجى تعبئة الحقول المطلوبة بنجمة (*)",
    successSave: "تم إنشاء طلب الاستجابة السريعة وإغلاقه بنجاح",
    errorSave: "حدث خطأ أثناء تسجيل الطلب",
    warningAttachments: "تم تسجيل الطلب بنجاح ولكن فشل رفع المرفقات",
    loginRequired: "يجب تسجيل الدخول للوصول لهذه الصفحة",
    technicalTeam: "بيانات الفريق الفني",
  },
  en: {
    title: "Create & Close Quick Request",
    subtitle: "Register a new quick response request, document executed works, and close it immediately",
    mosqueAndRequest: "Mosque and Request Details",
    mosqueAndRequestDesc: "Enter mosque name and specify the service type",
    selectMosque: "Mosque Name",
    selectMosquePlaceholder: "Enter mosque name",
    programType: "Service",
    description: "Issue / Request Description",
    descriptionPlaceholder: "Describe the issue or emergency breakdown in detail...",
    technicianName: "Specialist Technician / Executor",
    technicianPlaceholder: "Technician name responsible for execution or evaluation",
    reportAndClose: "Quick Response Report & Closure",
    reportAndCloseDesc: "Document repairs and technical status to close the issue",
    technicalEvaluation: "Technical Evaluation",
    technicalEvaluationDesc: "General technical evaluation of the works",
    technicalEvaluationLabel: "Technical Evaluation & Causes",
    technicalEvaluationPlaceholder: "Description of technical evaluation for executed works...",
    finalEvaluation: "Final Evaluation",
    finalEvaluationPlaceholder: "Select final evaluation for executed works...",
    unexecutedWorks: "Unexecuted Works / Reasons for Non-Execution",
    unexecutedWorksDesc: "If there are any unexecuted works, please state them with reasons...",
    attachments: "Photo Documentation (Optional)",
    attachmentsDesc: "Field documentation of state before/during/after implementation (up to 5 photos)",
    cancel: "Cancel",
    save: "Save & Close Request",
    saving: "Saving...",
    requiredFields: "Please fill in the required fields marked with (*)",
    successSave: "Quick response request created and closed successfully",
    errorSave: "An error occurred while registering the request",
    warningAttachments: "Request registered successfully, but attachments failed to upload",
    loginRequired: "You must login to access this page",
    technicalTeam: "Technical Team Details",
  }
};

export default function QuickRequestCreate() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [lang, setLang] = useState<"ar" | "en">(() => {
    return (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  });

  const t = translations[lang];

  const [formData, setFormData] = useState({
    // Mosque & Request
    mosqueName: "",
    programType: "",
    description: "",

    // Report
    technicalEvaluation: "",
    finalEvaluation: "",
    unexecutedWorks: "",
    technicianName: "",
  });

  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: activePrograms } = trpc.programs.getActive.useQuery();

  // Filter out "bunyan" program
  const filteredPrograms = activePrograms?.filter(p => p.id !== "bunyan") || [];

  // Prefill technician name with user name
  useEffect(() => {
    if (user && !formData.technicianName) {
      setFormData(prev => ({ ...prev, technicianName: user.name || "" }));
    }
  }, [user]);

  // Set default program type when filteredPrograms list is fetched
  useEffect(() => {
    if (filteredPrograms.length > 0 && !formData.programType) {
      setFormData(prev => ({ ...prev, programType: filteredPrograms[0].id }));
    }
  }, [activePrograms]);

  // Check login & permissions
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error(t.loginRequired);
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate, t.loginRequired]);

  const uploadAttachments = trpc.storage.uploadMultipleAttachments.useMutation();

  const createQuickRequest = trpc.requests.createQuickRequest.useMutation({
    onSuccess: async (data) => {
      if (attachments.length > 0) {
        try {
          await uploadAttachments.mutateAsync({
            requestId: data.requestId,
            files: attachments.map(file => ({
              fileName: file.fileName,
              fileData: file.fileData,
              mimeType: file.mimeType,
              category: "site_photo",
            })),
          });
        } catch (uploadError) {
          console.error("Failed to upload attachments:", uploadError);
          toast.warning(t.warningAttachments);
        }
      }
      toast.success(t.successSave);
      try {
        sessionStorage.setItem('requests_table_page', '1');
      } catch {}
      utils.requests.search.invalidate();
      navigate("/requests");
    },
    onError: (err) => {
      toast.error(err.message || t.errorSave);
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mosqueName.trim()) {
      toast.error(lang === "ar" ? "يرجى إدخال اسم المسجد" : "Please enter mosque name");
      return;
    }

    if (!formData.programType) {
      toast.error(lang === "ar" ? "يرجى اختيار الخدمة" : "Please select a service");
      return;
    }

    if (!formData.technicalEvaluation.trim()) {
      toast.error(lang === "ar" ? "يرجى إدخال التقييم الفني للأعمال" : "Please enter technical evaluation");
      return;
    }

    if (!formData.technicianName.trim()) {
      toast.error(lang === "ar" ? "يرجى إدخال اسم الفني المختص" : "Please enter technician name");
      return;
    }

    setIsSubmitting(true);

    createQuickRequest.mutate({
      mosqueId: null,
      newMosqueName: formData.mosqueName,
      newMosqueCity: "غير محدد",
      newMosqueAddress: null,
      programType: formData.programType,
      priority: "normal", // default priority
      description: formData.description || formData.technicalEvaluation,
      technicianName: formData.technicianName,
      technicalEvaluation: formData.technicalEvaluation,
      finalEvaluation: formData.finalEvaluation || null,
      unexecutedWorks: formData.unexecutedWorks || null,
      actionsTaken: formData.finalEvaluation || formData.technicalEvaluation, // Fallback as in QuickResponseReportForm.tsx
      status: "fully_solved", // Default status is fully solved and closed
      resolved: true,
      requiresProject: false,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background pb-10 sm:pb-16 overflow-x-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header Container */}
      <div className="bg-white/90 dark:bg-card/90 backdrop-blur-md border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-14 sm:min-h-16 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => navigate("/requests")}
              aria-label={lang === "ar" ? "العودة للطلبات" : "Back to requests"}
              className="size-11 lg:size-9 pointer-coarse:size-11 shrink-0 text-gray-500 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              {lang === "ar" ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 dark:text-foreground flex items-center gap-2 min-w-0 leading-snug">
                <Zap className="w-5 h-5 text-teal-600 shrink-0" />
                <span className="truncate">{t.title}</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 shrink-0">
                {lang === "ar" ? "معالجة فورية" : "Direct Closure"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Section 1: Mosque and Request details */}
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <Card className="border border-slate-100 dark:border-border hover:shadow-md transition-shadow duration-300 rounded-xl shadow-xs overflow-hidden py-0 gap-0">
                <CardHeader className="border-b pt-4 pb-3.5 px-4 sm:px-6 bg-slate-50/40 dark:bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                    <Building2 className="w-5 h-5 text-teal-600 shrink-0" />
                    {t.mosqueAndRequest}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    {t.mosqueAndRequestDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="mosqueNameInput" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.selectMosque} <span className="text-red-500">*</span></Label>
                    <Input
                      id="mosqueNameInput"
                      value={formData.mosqueName}
                      onChange={(e) => setFormData(prev => ({ ...prev, mosqueName: e.target.value }))}
                      placeholder={t.selectMosquePlaceholder}
                      className="h-11 max-md:text-base focus-visible:ring-teal-500 border-slate-200 dark:border-border focus:border-teal-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="programSelect" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.programType} <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.programType}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, programType: val }))}
                      dir={formData.programType === "taqah" ? "rtl" : undefined}
                    >
                      <SelectTrigger 
                        id="programSelect" 
                        className={cn(
                          "w-full min-w-0 h-11 max-md:text-base border-slate-200 dark:border-border focus-visible:ring-teal-500 focus:border-teal-300 cursor-pointer",
                          formData.programType === "taqah" && "text-right justify-end"
                        )}
                        dir={formData.programType === "taqah" ? "rtl" : undefined}
                      >
                        <SelectValue placeholder={lang === "ar" ? "اختر الخدمة" : "Select Service"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map(p => (
                          <SelectItem 
                            key={p.id} 
                            value={p.id}
                            dir={p.id === "taqah" || p.name.includes("طاقة") || p.name.toLowerCase().includes("taqah") ? "rtl" : undefined}
                            className={cn(
                              "cursor-pointer min-h-10",
                              (p.id === "taqah" || p.name.includes("طاقة") || p.name.toLowerCase().includes("taqah")) && "text-right justify-end"
                            )}
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="descriptionInput" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.description}</Label>
                    <Textarea
                      id="descriptionInput"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t.descriptionPlaceholder}
                      className="focus-visible:ring-teal-500 border-slate-200 dark:border-border focus:border-teal-300 resize-none min-h-[100px] max-md:text-base"
                    />
                  </div>

                </CardContent>
              </Card>

              {/* بيانات الفريق الفني */}
              <Card className="border border-slate-100 dark:border-border hover:shadow-md transition-shadow duration-300 rounded-xl shadow-xs overflow-hidden py-0 gap-0">
                <CardHeader className="border-b pt-4 pb-3.5 px-4 sm:px-6 bg-slate-50/40 dark:bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                    <User className="w-5 h-5 text-teal-600 shrink-0" />
                    {t.technicalTeam}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="technicianInput" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.technicianName} <span className="text-red-500">*</span></Label>
                    <Input
                      id="technicianInput"
                      value={formData.technicianName}
                      onChange={(e) => setFormData(prev => ({ ...prev, technicianName: e.target.value }))}
                      placeholder={t.technicianPlaceholder}
                      className="h-11 max-md:text-base focus-visible:ring-teal-500 border-slate-200 dark:border-border focus:border-teal-300"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Report and closure */}
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <Card className="border border-slate-100 dark:border-border hover:shadow-md transition-shadow duration-300 rounded-xl shadow-xs overflow-hidden py-0 gap-0">
                <CardHeader className="border-b pt-4 pb-3.5 px-4 sm:px-6 bg-slate-50/40 dark:bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                    <ClipboardList className="w-5 h-5 text-teal-600 shrink-0" />
                    {t.reportAndClose}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    {t.reportAndCloseDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="technicalEval" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.technicalEvaluationLabel} <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="technicalEval"
                      value={formData.technicalEvaluation}
                      onChange={(e) => setFormData(prev => ({ ...prev, technicalEvaluation: e.target.value }))}
                      placeholder={t.technicalEvaluationPlaceholder}
                      className="focus-visible:ring-teal-500 border-slate-200 dark:border-border focus:border-teal-300 min-h-[100px] text-sm md:text-base max-md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="finalEval" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.finalEvaluation}</Label>
                    <Select
                      value={formData.finalEvaluation}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, finalEvaluation: val }))}
                      dir="rtl"
                    >
                      <SelectTrigger 
                        id="finalEval" 
                        className="w-full min-w-0 h-11 max-md:text-base text-right justify-end border-slate-200 dark:border-border focus-visible:ring-teal-500 focus:border-teal-300 cursor-pointer"
                        dir="rtl"
                      >
                        <SelectValue placeholder={t.finalEvaluationPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {EVALUATION_OPTIONS.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            dir="rtl"
                            className="text-right justify-end cursor-pointer min-h-10"
                          >
                            <span className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full shrink-0", option.dotColor)} />
                              <span>{lang === "ar" ? option.labelAr : option.labelEn}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="unexecutedWorks" className="text-sm font-bold text-slate-700 dark:text-foreground">{t.unexecutedWorks}</Label>
                    <Textarea
                      id="unexecutedWorks"
                      value={formData.unexecutedWorks}
                      onChange={(e) => setFormData(prev => ({ ...prev, unexecutedWorks: e.target.value }))}
                      placeholder={t.unexecutedWorksDesc}
                      className="focus-visible:ring-teal-500 border-slate-200 dark:border-border focus:border-teal-300 min-h-[100px] text-sm md:text-base max-md:text-base"
                    />
                  </div>

                </CardContent>
              </Card>

              {/* المرفقات */}
              <Card className="border border-slate-100 dark:border-border hover:shadow-md transition-shadow duration-300 rounded-xl shadow-xs overflow-hidden py-0 gap-0">
                <CardHeader className="border-b pt-4 pb-3.5 px-4 sm:px-6 bg-slate-50/40 dark:bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                    <Camera className="w-5 h-5 text-teal-600 shrink-0" />
                    {t.attachments}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    {t.attachmentsDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <FileUpload
                    onFilesSelected={(files) => setAttachments(files)}
                    maxFiles={5}
                    category="site_photo"
                    label={lang === "ar" ? "رفع الصور" : "Upload Images"}
                    description={lang === "ar" ? "اسحب الصور هنا أو انقر للاختيار" : "Drag images here or click to select"}
                  />
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Action Row */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-5 sm:pt-6 mt-6 sm:mt-8 border-t border-slate-200 dark:border-border">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate("/requests")}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 min-h-12 font-bold transition-all active:scale-[0.98] cursor-pointer justify-center"
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full sm:w-auto gradient-primary text-white gap-2 px-8 min-h-12 shadow-sm font-bold active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  {t.save}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
