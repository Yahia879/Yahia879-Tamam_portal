import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { LeafletMap } from "@/components/LeafletMap";
import { cn } from "@/lib/utils";
import { 
  ArrowRight,
  ArrowLeft,
  Languages,
  Save,
  MapPin,
  Building2,
  ClipboardList,
  Camera,
  FileText,
  AlertCircle,
  User,
  CheckCircle,
  XCircle,
  X
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
    title: "تقرير الاستجابة السريعة",
    subtitle: "التقييم الفني والتوثيق بالصور بعد إنهاء أعمال الصيانة الطارئة",
    basicInfo: "البيانات الأساسية",
    basicInfoDesc: "معلومات الطلب والمسجد (مستوردة تلقائياً)",
    importedNotice: "البيانات التالية مستوردة من بيانات الطلب ولا يمكن تعديلها",
    requestNumber: "رقم الطلب",
    mosqueName: "اسم المسجد",
    mosqueLocation: "موقع المسجد",
    notSpecified: "غير محدد",
    technicalEvaluation: "التقييم الفني",
    technicalEvaluationDesc: "التقييم العام للأعمال من الناحية الفنية",
    technicalEvaluationLabel: "التقييم الفني",
    technicalEvaluationPlaceholder: "وصف التقييم الفني للأعمال المنفذة...",
    finalEvaluation: "التقييم النهائي",
    finalEvaluationPlaceholder: "اختر التقييم النهائي",
    unexecutedWorks: "الأعمال غير المنفذة",
    unexecutedWorksDesc: "توثيق التعثر أو عدم التنفيذ",
    unexecutedWorksLabel: "الأعمال غير المنفذة / أسباب عدم التنفيذ",
    unexecutedWorksPlaceholder: "في حال وجود أعمال لم تُنفذ، يرجى ذكرها مع أسباب عدم التنفيذ...",
    attachments: "المرفقات (التوثيق بالصور)",
    attachmentsDesc: "توثيق الحالة ميدانياً قبل/أثناء/بعد التنفيذ (حتى 10 صور)",
    uploadImages: "رفع الصور",
    uploadPlaceholder: "اسحب الصور هنا أو انقر للاختيار",
    attachedPhotos: (count: number) => `تم إرفاق ${count} صورة توثيقية`,
    technicalTeam: "بيانات الفريق الفني",
    technicianName: "الفني المختص",
    technicianPlaceholder: "اسم الفني المسؤول عن التنفيذ أو التقييم",
    requestStatus: "حالة الطلب",
    partiallySolved: "تم حل المشكلة جزئياً",
    fullySolved: "تم حل المشكلة بالكامل",
    notSolved: "لم يتم حل المشكلة",
    cancelAndClose: "إلغاء وإغلاق",
    saveAndSubmit: "حفظ واعتماد التقرير",
    saving: "جاري الحفظ...",
    requestNotFound: "الطلب غير موجود",
    requestNotFoundDesc: "لم يتم العثور على الطلب المطلوب",
    backToDashboard: "العودة للوحة التحكم",
    requiredTechnician: "يرجى إدخال اسم الفني المختص",
    requiredEvaluation: "يرجى إدخال التقييم الفني",
    requiredStatus: "يرجى اختيار حالة الطلب",
    reportSavedSuccess: "تم حفظ تقرير الاستجابة السريعة بنجاح",
    reportSavedError: "حدث خطأ أثناء حفظ التقرير",
    loginRequired: "يجب تسجيل الدخول للوصول لهذه الصفحة",
    uploadWarning: "تم حفظ التقرير ولكن فشل رفع بعض الصور",
    uploadLimit: (maxFiles: number, maxSizeMB: number) => `الحد الأقصى: ${maxFiles} ملفات، ${maxSizeMB} ميجابايت لكل ملف`,
    uploadLimitReached: (maxFiles: number) => `تم الوصول للحد الأقصى من الملفات (${maxFiles})`,
  },
  en: {
    title: "Quick Response Report",
    subtitle: "Technical evaluation and photo documentation after emergency maintenance works",
    basicInfo: "Basic Information",
    basicInfoDesc: "Request and Mosque Details (imported automatically)",
    importedNotice: "The following data is imported from the request details and cannot be modified",
    requestNumber: "Request Number",
    mosqueName: "Mosque Name",
    mosqueLocation: "Mosque Location",
    notSpecified: "Not specified",
    technicalEvaluation: "Technical Evaluation",
    technicalEvaluationDesc: "General technical evaluation of the works",
    technicalEvaluationLabel: "Technical Evaluation",
    technicalEvaluationPlaceholder: "Description of technical evaluation for executed works...",
    finalEvaluation: "Final Evaluation",
    finalEvaluationPlaceholder: "Select final evaluation",
    unexecutedWorks: "Unexecuted Works",
    unexecutedWorksDesc: "Documentation of delay or non-execution",
    unexecutedWorksLabel: "Unexecuted Works / Reasons for Non-Execution",
    unexecutedWorksPlaceholder: "If there are any unexecuted works, please state them with reasons...",
    attachments: "Attachments (Photo Documentation)",
    attachmentsDesc: "Field documentation of state before/during/after implementation (up to 10 photos)",
    uploadImages: "Upload Images",
    uploadPlaceholder: "Drag images here or click to select",
    attachedPhotos: (count: number) => `${count} documentation photo(s) attached`,
    technicalTeam: "Technical Team Details",
    technicianName: "Specialist Technician",
    technicianPlaceholder: "Technician name responsible for execution or evaluation",
    requestStatus: "Request Status",
    partiallySolved: "Problem partially solved",
    fullySolved: "Problem fully solved",
    notSolved: "Problem not solved",
    cancelAndClose: "Cancel and Close",
    saveAndSubmit: "Save and Submit Report",
    saving: "Saving...",
    requestNotFound: "Request Not Found",
    requestNotFoundDesc: "The requested request could not be found",
    backToDashboard: "Return to Dashboard",
    requiredTechnician: "Please enter the specialist technician's name",
    requiredEvaluation: "Please enter the technical evaluation",
    requiredStatus: "Please select the request status",
    reportSavedSuccess: "Quick response report saved successfully",
    reportSavedError: "An error occurred while saving the report",
    loginRequired: "You must login to access this page",
    uploadWarning: "Report saved, but some images failed to upload",
    uploadLimit: (maxFiles: number, maxSizeMB: number) => `Maximum: ${maxFiles} files, ${maxSizeMB} MB per file`,
    uploadLimitReached: (maxFiles: number) => `Maximum number of files reached (${maxFiles})`,
  }
};

export default function QuickResponseReportForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ requestId: string }>();
  const requestId = parseInt(params.requestId || "0");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [lang, setLang] = useState<"ar" | "en">(() => {
    return (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  });

  const t = translations[lang];

  // بيانات النموذج
  const [formData, setFormData] = useState({
    // التقييم الفني
    technicalEvaluation: "",
    finalEvaluation: "",
    
    // الأعمال غير المنفذة
    unexecutedWorks: "",
    
    // الفني المختص
    technicianName: "",
    
    // الحقول القديمة للتوافق
    issueDescription: "",
    actionsTaken: "",
    resolved: false,
    requiresProject: false,
    status: "",
  });

  // جلب بيانات الطلب
  const { data: requestData, isLoading: requestLoading } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: requestId > 0 }
  );

  // إحداثيات المسجد
  const lat = requestData?.mosque?.latitude ? parseFloat(requestData.mosque.latitude) : NaN;
  const lng = requestData?.mosque?.longitude ? parseFloat(requestData.mosque.longitude) : NaN;
  const hasCoordinates = !isNaN(lat) && !isNaN(lng);

  const mapCenter = hasCoordinates ? { lat, lng } : { lat: 24.7136, lng: 46.6753 };
  const markers = hasCoordinates ? [
    {
      id: requestData?.mosque?.id || 'mosque',
      position: { lat, lng },
      title: requestData?.mosque?.name || 'موقع المسجد',
      status: 'approved'
    }
  ] : [];

  // mutation لرفع المرفقات
  const uploadAttachments = trpc.storage.uploadMultipleAttachments.useMutation();

  // mutation لإنشاء تقرير الاستجابة السريعة
  const createReport = trpc.requests.addQuickResponseReport.useMutation({
    onSuccess: async () => {
      await utils.requests.getById.invalidate({ id: requestId });
      toast.success(t.reportSavedSuccess);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t.reportSavedError);
      setIsSubmitting(false);
    },
  });

  // التحقق من تسجيل الدخول والصلاحيات
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error(t.loginRequired);
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate, t.loginRequired]);

  // ملء اسم الفني المختص تلقائياً من بيانات الطلب
  useEffect(() => {
    if (requestData && !requestLoading && !formData.technicianName) {
      // 1. اسم الشخص المسؤول عن الاستجابة السريعة (المسند إليه الطلب حالياً - ذو دور quick_response)
      const quickResponseName = (requestData as any).assignedToUser?.name;
      // 2. اسم المسؤول المعين للزيارة الميدانية من جدول الطلبات (كاحتياطي)
      const assignedName = (requestData as any).fieldVisitAssignedToUser?.name;
      // 3. اسم عضو الفريق الأول من تقرير المعاينة الميدانية (كاحتياطي ثانٍ)
      const fieldReportTeamMember = requestData.fieldReports?.[0]?.teamMember1;
      
      const technician = quickResponseName || assignedName || fieldReportTeamMember || "";
      
      if (technician) {
        setFormData(prev => ({
          ...prev,
          technicianName: prev.technicianName || technician
        }));
      }
    }
  }, [requestData, requestLoading, formData.technicianName]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLangToggle = () => {
    const nextLang = lang === "ar" ? "en" : "ar";
    setLang(nextLang);
    localStorage.setItem("quick-response-lang", nextLang);
  };

  const handleSubmit = async () => {
    // التحقق من الحقول المطلوبة
    if (!formData.technicianName) {
      toast.error(t.requiredTechnician);
      return;
    }
    if (!formData.technicalEvaluation) {
      toast.error(t.requiredEvaluation);
      return;
    }
    if (!formData.status) {
      toast.error(t.requiredStatus);
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport.mutateAsync({
        requestId,
        responseDate: new Date().toISOString(),
        technicalEvaluation: formData.technicalEvaluation,
        finalEvaluation: formData.finalEvaluation,
        unexecutedWorks: formData.unexecutedWorks,
        technicianName: formData.technicianName,
        issueDescription: formData.issueDescription || formData.technicalEvaluation,
        actionsTaken: formData.actionsTaken || formData.finalEvaluation,
        resolved: formData.resolved,
        requiresProject: formData.requiresProject,
        status: formData.status as any,
      });

      // رفع المرفقات إذا وجدت
      if (attachments.length > 0) {
        try {
          await uploadAttachments.mutateAsync({
            requestId,
            files: attachments.map(file => ({
              fileName: file.fileName,
              fileData: file.fileData,
              mimeType: file.mimeType,
              category: "site_photo",
            })),
          });
        } catch (uploadError) {
          console.error("خطأ في رفع المرفقات:", uploadError);
          toast.warning(t.uploadWarning);
        }
      }
      navigate(`/requests/${requestId}`);
    } catch {
      // Error handled in onError
    }
  };

  if (authLoading || requestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t.requestNotFound}</h2>
            <p className="text-gray-600 mb-4">{t.requestNotFoundDesc}</p>
            <Button onClick={() => navigate("/quick-response")}>
              {t.backToDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 md:py-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="container max-w-4xl mx-auto px-4 overflow-x-hidden">
        {/* زر تبديل اللغة */}
        <div className={`flex ${lang === "ar" ? "justify-end" : "justify-start"} mb-4`}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLangToggle}
            className="flex items-center gap-2 font-semibold border border-gray-200 shadow-sm hover:shadow transition-all"
          >
            <Languages className="w-4 h-4 text-primary" />
            <span>{lang === "ar" ? "English" : "العربية"}</span>
          </Button>
        </div>

        {/* العنوان */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-sm md:text-base text-gray-600">{t.subtitle}</p>
        </div>

        {/* البيانات الأساسية */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <FileText className="w-5 h-5 text-primary" />
              {t.basicInfo}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t.basicInfoDesc}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Alert className="bg-blue-50 border-blue-200 mb-6 p-3">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-[11px] md:text-sm text-blue-800">
                {t.importedNotice}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">{t.requestNumber}</p>
                  <p className="font-bold text-sm md:text-base truncate">{requestData.requestNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">{t.mosqueName}</p>
                  <p className="font-bold text-sm md:text-base truncate">{requestData.mosque?.name || t.notSpecified}</p>
                </div>
              </div>

              <div 
                className={cn(
                  "flex items-start gap-3 p-3 md:p-4 bg-gray-50 rounded-lg md:col-span-2",
                  hasCoordinates && "cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-primary/20"
                )}
                onClick={() => {
                  if (hasCoordinates) {
                    setShowMapDialog(true);
                  } else {
                    toast.error(lang === "ar" ? "موقع المسجد غير محدد إحداثياً في النظام" : "Mosque coordinates are not specified in the system");
                  }
                }}
              >
                <MapPin className={cn("w-4 h-4 md:w-5 md:h-5 shrink-0 mt-1", hasCoordinates ? "text-primary animate-pulse" : "text-gray-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] md:text-sm text-gray-500">{t.mosqueLocation}</p>
                    {hasCoordinates && (
                      <span className="text-[10px] md:text-xs text-primary font-bold">{lang === "ar" ? "عرض على الخريطة" : "View on map"}</span>
                    )}
                  </div>
                  <p className="font-bold text-sm md:text-base break-words">{requestData.mosque?.address || requestData.mosque?.city || t.notSpecified}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التقييم الفني */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <ClipboardList className="w-5 h-5 text-primary" />
              {t.technicalEvaluation}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t.technicalEvaluationDesc}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t.technicalEvaluationLabel} <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.technicalEvaluation}
                onChange={(e) => handleInputChange("technicalEvaluation", e.target.value)}
                placeholder={t.technicalEvaluationPlaceholder}
                className="min-h-[100px] text-sm md:text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t.finalEvaluation}</Label>
              <Select
                value={formData.finalEvaluation}
                onValueChange={(value) => handleInputChange("finalEvaluation", value)}
              >
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue placeholder={t.finalEvaluationPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {lang === "ar" ? option.labelAr : option.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* الأعمال غير المنفذة */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <XCircle className="w-5 h-5 text-primary" />
              {t.unexecutedWorks}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t.unexecutedWorksDesc}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t.unexecutedWorksLabel}</Label>
              <Textarea
                value={formData.unexecutedWorks}
                onChange={(e) => handleInputChange("unexecutedWorks", e.target.value)}
                placeholder={t.unexecutedWorksPlaceholder}
                className="min-h-[100px] text-sm md:text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* المرفقات */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <Camera className="w-5 h-5 text-primary" />
              {t.attachments}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t.attachmentsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <FileUpload
              onFilesSelected={setAttachments}
              maxFiles={10}
              acceptedTypes={["image/jpeg", "image/png", "image/webp"]}
              maxSizeMB={10}
              maxTotalSizeMB={10}
              label={t.uploadImages}
              description={t.uploadPlaceholder}
              limitLabel={t.uploadLimit(10, 10)}
              maxFilesReachedLabel={t.uploadLimitReached(10)}
              category="site_photo"
            />
            {attachments.length > 0 && (
              <p className="text-xs md:text-sm text-primary font-bold mt-3 bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
                {t.attachedPhotos(attachments.length)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* بيانات الفريق الفني */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <User className="w-5 h-5 text-primary" />
              {t.technicalTeam}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t.technicianName} <span className="text-red-500">*</span></Label>
              <Input
                value={formData.technicianName}
                onChange={(e) => handleInputChange("technicianName", e.target.value)}
                placeholder={t.technicianPlaceholder}
                className="h-10 md:h-11"
              />
            </div>
          </CardContent>
        </Card>

        {/* حالة الطلب */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <CheckCircle className="w-5 h-5 text-primary" />
              {t.requestStatus} <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.status === "partially_solved"}
                    onChange={() => {
                      setFormData(prev => ({
                        ...prev,
                        status: "partially_solved",
                        resolved: false,
                        requiresProject: true
                      }));
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-sm md:text-base font-medium group-hover:text-primary transition-colors">{t.partiallySolved}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.status === "fully_solved"}
                    onChange={() => {
                      setFormData(prev => ({
                        ...prev,
                        status: "fully_solved",
                        resolved: true,
                        requiresProject: false
                      }));
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-sm md:text-base font-medium group-hover:text-primary transition-colors">{t.fullySolved}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.status === "not_solved"}
                    onChange={() => {
                      setFormData(prev => ({
                        ...prev,
                        status: "not_solved",
                        resolved: false,
                        requiresProject: true
                      }));
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-sm md:text-base font-medium group-hover:text-primary transition-colors">{t.notSolved}</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* أزرار التحكم */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8 pb-10">
          <Button
            variant="outline"
            className="w-full sm:w-auto h-11 border-2 font-bold"
            onClick={() => navigate(`/requests/${requestId}`)}
          >
            {lang === "ar" ? (
              <>
                <ArrowRight className="w-4 h-4 ml-2" />
                {t.cancelAndClose}
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.cancelAndClose}
              </>
            )}
          </Button>
          
          <Button
            className="w-full sm:w-auto h-11 gradient-primary text-white font-bold shadow-lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className={lang === "ar" ? "animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" : "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"}></div>
                {t.saving}
              </>
            ) : (
              <>
                <Save className={lang === "ar" ? "w-4 h-4 ml-2" : "w-4 h-4 mr-2"} />
                {t.saveAndSubmit}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* نافذة خريطة موقع المسجد */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent 
          showCloseButton={false} 
          className="w-[95vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] h-[85vh] max-h-[92vh] flex flex-col p-4 md:p-6" 
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader className="flex flex-row items-center justify-between pb-2 shrink-0" dir={lang === "ar" ? "rtl" : "ltr"}>
            <DialogTitle className="text-lg font-bold">
              {lang === "ar" ? `موقع مسجد: ${requestData.mosque?.name || ""}` : `Mosque Location: ${requestData.mosque?.name || ""}`}
            </DialogTitle>
            <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative mt-2">
            {showMapDialog && hasCoordinates && (
              <LeafletMap 
                initialCenter={mapCenter}
                markers={markers}
                initialZoom={16}
                fitBounds={false}
                markerIconSize={54}
                className="w-full h-full absolute inset-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
