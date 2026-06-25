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
  Languages,
  Save,
  Building2,
  ClipboardList,
  Zap,
  Camera,
  User
} from "lucide-react";

// تقييمات الأعمال
const EVALUATION_OPTIONS = [
  { value: "excellent", labelAr: "ممتاز", labelEn: "Excellent" },
  { value: "good", labelAr: "جيد", labelEn: "Good" },
  { value: "acceptable", labelAr: "مقبول", labelEn: "Acceptable" },
  { value: "needs_improvement", labelAr: "يحتاج تحسين", labelEn: "Needs Improvement" },
  { value: "poor", labelAr: "ضعيف", labelEn: "Poor" },
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

  const toggleLang = () => {
    const nextLang = lang === "ar" ? "en" : "ar";
    setLang(nextLang);
    localStorage.setItem("quick-response-lang", nextLang);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header Container */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/requests")}
              className="text-gray-500 hover:text-gray-900"
            >
              {lang === "ar" ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {t.title}
              </h1>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-xs font-medium"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "ar" ? "English" : "العربية"}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Section 1: Mosque and Request details */}
            <div className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                    <Building2 className="w-5 h-5" />
                    {t.mosqueAndRequest}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t.mosqueAndRequestDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="mosqueNameInput" className="text-sm font-bold">{t.selectMosque} <span className="text-red-500">*</span></Label>
                    <Input
                      id="mosqueNameInput"
                      value={formData.mosqueName}
                      onChange={(e) => setFormData(prev => ({ ...prev, mosqueName: e.target.value }))}
                      placeholder={t.selectMosquePlaceholder}
                      className="h-10 md:h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="programSelect" className="text-sm font-bold">{t.programType} <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.programType}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, programType: val }))}
                      dir={formData.programType === "taqah" ? "rtl" : undefined}
                    >
                      <SelectTrigger 
                        id="programSelect" 
                        className={cn(
                          "w-full h-10 md:h-11",
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
                    <Label htmlFor="descriptionInput" className="text-sm font-bold">{t.description}</Label>
                    <Textarea
                      id="descriptionInput"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t.descriptionPlaceholder}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* بيانات الفريق الفني */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                    <User className="w-5 h-5" />
                    {t.technicalTeam}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="technicianInput" className="text-sm font-bold">{t.technicianName} <span className="text-red-500">*</span></Label>
                    <Input
                      id="technicianInput"
                      value={formData.technicianName}
                      onChange={(e) => setFormData(prev => ({ ...prev, technicianName: e.target.value }))}
                      placeholder={t.technicianPlaceholder}
                      className="h-10 md:h-11"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Report and closure */}
            <div className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                    <ClipboardList className="w-5 h-5" />
                    {t.reportAndClose}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t.reportAndCloseDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="technicalEval" className="text-sm font-bold">{t.technicalEvaluationLabel} <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="technicalEval"
                      rows={4}
                      value={formData.technicalEvaluation}
                      onChange={(e) => setFormData(prev => ({ ...prev, technicalEvaluation: e.target.value }))}
                      placeholder={t.technicalEvaluationPlaceholder}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="finalEval" className="text-sm font-bold">{t.finalEvaluation}</Label>
                    <Select
                      value={formData.finalEvaluation}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, finalEvaluation: val }))}
                      dir="rtl"
                    >
                      <SelectTrigger 
                        id="finalEval" 
                        className="w-full h-10 md:h-11 text-right justify-end"
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
                            className="text-right justify-end"
                          >
                            {lang === "ar" ? option.labelAr : option.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="unexecutedWorks" className="text-sm font-bold">{t.unexecutedWorks}</Label>
                    <Textarea
                      id="unexecutedWorks"
                      rows={3}
                      value={formData.unexecutedWorks}
                      onChange={(e) => setFormData(prev => ({ ...prev, unexecutedWorks: e.target.value }))}
                      placeholder={t.unexecutedWorksDesc}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* المرفقات */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                    <Camera className="w-5 h-5" />
                    {t.attachments}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t.attachmentsDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
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
          <div className="flex items-center justify-end gap-3 sticky bottom-4 z-20 bg-white/85 backdrop-blur-md border p-4 rounded-xl shadow-md max-w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/requests")}
              disabled={isSubmitting}
              className="h-11 px-6 text-sm"
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 h-11 px-8 text-sm shadow-md shadow-amber-600/10 font-bold"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
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
