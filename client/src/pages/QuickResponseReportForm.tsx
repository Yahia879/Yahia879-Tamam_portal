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
import { 
  ArrowRight,
  Save,
  MapPin,
  Building2,
  ClipboardList,
  Camera,
  FileText,
  AlertCircle,
  User,
  CheckCircle,
  XCircle
} from "lucide-react";

// تقييمات الأعمال
const EVALUATION_OPTIONS = [
  { value: "excellent", label: "ممتاز" },
  { value: "good", label: "جيد" },
  { value: "acceptable", label: "مقبول" },
  { value: "needs_improvement", label: "يحتاج تحسين" },
  { value: "poor", label: "ضعيف" },
];

export default function QuickResponseReportForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ requestId: string }>();
  const requestId = parseInt(params.requestId || "0");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
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

  // mutation لرفع المرفقات
  const uploadAttachments = trpc.storage.uploadMultipleAttachments.useMutation();

  // mutation لإنشاء تقرير الاستجابة السريعة
  const createReport = trpc.requests.addQuickResponseReport.useMutation({
    onSuccess: async () => {
      await utils.requests.getById.invalidate({ id: requestId });
      toast.success("تم حفظ تقرير الاستجابة السريعة بنجاح");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ التقرير");
      setIsSubmitting(false);
    },
  });

  // التحقق من تسجيل الدخول والصلاحيات
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("يجب تسجيل الدخول للوصول لهذه الصفحة");
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

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

  const handleSubmit = async () => {
    // التحقق من الحقول المطلوبة
    if (!formData.technicianName) {
      toast.error("يرجى إدخال اسم الفني المختص");
      return;
    }
    if (!formData.technicalEvaluation) {
      toast.error("يرجى إدخال التقييم الفني");
      return;
    }
    if (!formData.status) {
      toast.error("يرجى اختيار حالة الطلب");
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
          toast.warning("تم حفظ التقرير ولكن فشل رفع بعض الصور");
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
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">الطلب غير موجود</h2>
            <p className="text-gray-600 mb-4">لم يتم العثور على الطلب المطلوب</p>
            <Button onClick={() => navigate("/quick-response")}>
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 md:py-8" dir="rtl">
      <div className="container max-w-4xl mx-auto px-4 overflow-x-hidden">
        {/* العنوان */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">تقرير الاستجابة السريعة</h1>
          <p className="text-sm md:text-base text-gray-600">التقييم الفني والتوثيق بالصور بعد إنهاء أعمال الصيانة الطارئة</p>
        </div>

        {/* البيانات الأساسية */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <FileText className="w-5 h-5 text-primary" />
              البيانات الأساسية
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">معلومات الطلب والمسجد (مستوردة تلقائياً)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Alert className="bg-blue-50 border-blue-200 mb-6 p-3">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-[11px] md:text-sm text-blue-800">
                البيانات التالية مستوردة من بيانات الطلب ولا يمكن تعديلها
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">رقم الطلب</p>
                  <p className="font-bold text-sm md:text-base truncate">{requestData.requestNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">اسم المسجد</p>
                  <p className="font-bold text-sm md:text-base truncate">{requestData.mosque?.name || "غير محدد"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 md:p-4 bg-gray-50 rounded-lg md:col-span-2">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">موقع المسجد</p>
                  <p className="font-bold text-sm md:text-base break-words">{requestData.mosque?.address || requestData.mosque?.city || "غير محدد"}</p>
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
              التقييم الفني
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">التقييم العام للأعمال من الناحية الفنية</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">التقييم الفني <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.technicalEvaluation}
                onChange={(e) => handleInputChange("technicalEvaluation", e.target.value)}
                placeholder="وصف التقييم الفني للأعمال المنفذة..."
                className="min-h-[100px] text-sm md:text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">التقييم النهائي</Label>
              <Select
                value={formData.finalEvaluation}
                onValueChange={(value) => handleInputChange("finalEvaluation", value)}
              >
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue placeholder="اختر التقييم النهائي" />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
              الأعمال غير المنفذة
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">توثيق التعثر أو عدم التنفيذ</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">الأعمال غير المنفذة / أسباب عدم التنفيذ</Label>
              <Textarea
                value={formData.unexecutedWorks}
                onChange={(e) => handleInputChange("unexecutedWorks", e.target.value)}
                placeholder="في حال وجود أعمال لم تُنفذ، يرجى ذكرها مع أسباب عدم التنفيذ..."
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
              المرفقات (التوثيق بالصور)
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">توثيق الحالة ميدانياً قبل/أثناء/بعد التنفيذ (حتى 10 صور)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <FileUpload
              onFilesSelected={setAttachments}
              maxFiles={10}
              acceptedTypes={["image/jpeg", "image/png", "image/webp"]}
              maxSizeMB={10}
              maxTotalSizeMB={10}
              label="رفع الصور"
              description="اسحب الصور هنا أو انقر للاختيار"
              category="site_photo"
            />
            {attachments.length > 0 && (
              <p className="text-xs md:text-sm text-primary font-bold mt-3 bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
                تم إرفاق {attachments.length} صورة توثيقية
              </p>
            )}
          </CardContent>
        </Card>

        {/* بيانات الفريق الفني */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <User className="w-5 h-5 text-primary" />
              بيانات الفريق الفني
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">الفني المختص <span className="text-red-500">*</span></Label>
              <Input
                value={formData.technicianName}
                onChange={(e) => handleInputChange("technicianName", e.target.value)}
                placeholder="اسم الفني المسؤول عن التنفيذ أو التقييم"
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
              حالة الطلب <span className="text-red-500">*</span>
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
                <span className="text-sm md:text-base font-medium group-hover:text-primary transition-colors">تم حل المشكلة جزئياً</span>
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
                <span className="text-sm md:text-base font-medium group-hover:text-primary transition-colors">تم حل المشكلة بالكامل</span>
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
                <span className="text-sm md:text-base font-medium group-hover:text-primary transition-colors">لم يتم حل المشكلة</span>
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
            <ArrowRight className="w-4 h-4 ml-2" />
            إلغاء وإغلاق
          </Button>
          
          <Button
            className="w-full sm:w-auto h-11 gradient-primary text-white font-bold shadow-lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                حفظ واعتماد التقرير
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
