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
    onSuccess: () => {
      toast.success("تم حفظ تقرير الاستجابة السريعة بنجاح");
      navigate(`/requests/${requestId}`);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8" dir="rtl">
      <div className="container max-w-4xl mx-auto px-4">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">تقرير الاستجابة السريعة</h1>
          <p className="text-gray-600">التقييم الفني والتوثيق بالصور بعد إنهاء أعمال الصيانة الطارئة</p>
        </div>

        {/* البيانات الأساسية */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              البيانات الأساسية
            </CardTitle>
            <CardDescription>معلومات الطلب والمسجد (مستوردة تلقائياً)</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 mb-6">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                البيانات التالية مستوردة من بيانات الطلب ولا يمكن تعديلها
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">رقم الطلب</p>
                  <p className="font-medium">{requestData.requestNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">اسم المسجد</p>
                  <p className="font-medium">{requestData.mosque?.name || "غير محدد"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg md:col-span-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">موقع المسجد</p>
                  <p className="font-medium">{requestData.mosque?.address || requestData.mosque?.city || "غير محدد"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التقييم الفني */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              التقييم الفني
            </CardTitle>
            <CardDescription>التقييم العام للأعمال من الناحية الفنية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>التقييم الفني <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.technicalEvaluation}
                onChange={(e) => handleInputChange("technicalEvaluation", e.target.value)}
                placeholder="وصف التقييم الفني للأعمال المنفذة..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label>التقييم النهائي</Label>
              <Select
                value={formData.finalEvaluation}
                onValueChange={(value) => handleInputChange("finalEvaluation", value)}
              >
                <SelectTrigger className="mt-1">
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              الأعمال غير المنفذة
            </CardTitle>
            <CardDescription>توثيق التعثر أو عدم التنفيذ</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>الأعمال غير المنفذة / أسباب عدم التنفيذ</Label>
              <Textarea
                value={formData.unexecutedWorks}
                onChange={(e) => handleInputChange("unexecutedWorks", e.target.value)}
                placeholder="في حال وجود أعمال لم تُنفذ، يرجى ذكرها مع أسباب عدم التنفيذ..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* المرفقات */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              المرفقات (التوثيق بالصور)
            </CardTitle>
            <CardDescription>توثيق الحالة ميدانياً قبل/أثناء/بعد التنفيذ (حتى 10 صور)</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesSelected={setAttachments}
              maxFiles={10}
              acceptedTypes={["image/jpeg", "image/png", "image/webp"]}
              maxSizeMB={5}
              label="رفع الصور"
              description="اسحب الصور هنا أو انقر للاختيار"
              category="site_photo"
            />
            {attachments.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                تم إرفاق {attachments.length} صورة
              </p>
            )}
          </CardContent>
        </Card>

        {/* بيانات الفريق الفني */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              بيانات الفريق الفني
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>الفني المختص <span className="text-red-500">*</span></Label>
              <Input
                value={formData.technicianName}
                onChange={(e) => handleInputChange("technicianName", e.target.value)}
                placeholder="اسم الفني المسؤول عن التنفيذ أو التقييم"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* حالة الطلب */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              حالة الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.resolved}
                  onChange={(e) => handleInputChange("resolved", e.target.checked)}
                  className="w-4 h-4"
                />
                <span>تم حل المشكلة بالكامل</span>
              </label>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresProject}
                  onChange={(e) => handleInputChange("requiresProject", e.target.checked)}
                  className="w-4 h-4"
                />
                <span>يحتاج إلى مشروع متكامل</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* أزرار التحكم */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(`/requests/${requestId}`)}
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            إلغاء
          </Button>
          
          <Button
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
                حفظ التقرير
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
