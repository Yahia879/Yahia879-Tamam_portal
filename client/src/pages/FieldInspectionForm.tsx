import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { 
  ArrowRight,
  ArrowLeft,
  Save,
  MapPin,
  User,
  Phone,
  Building2,
  Ruler,
  ClipboardList,
  Users,
  Camera,
  FileText,
  AlertCircle
} from "lucide-react";

// حالات المسجد
const MOSQUE_CONDITIONS = [
  { value: "excellent", label: "ممتاز", color: "text-green-600" },
  { value: "good", label: "جيد", color: "text-blue-600" },
  { value: "fair", label: "متوسط", color: "text-yellow-600" },
  { value: "poor", label: "ضعيف", color: "text-orange-600" },
  { value: "critical", label: "حرج", color: "text-red-600" },
];

export default function FieldInspectionForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ requestId: string }>();
  const requestId = parseInt(params.requestId || "0");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [womenPrayerExists, setWomenPrayerExists] = useState(false);
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    // التقييم الفني
    mosqueCondition: "",
    conditionRating: "",
    
    // مساحة مصلى الرجال
    menPrayerLength: "",
    menPrayerWidth: "",
    menPrayerHeight: "",
    
    // مساحة مصلى النساء
    womenPrayerLength: "",
    womenPrayerWidth: "",
    womenPrayerHeight: "",
    
    // الاحتياج والتوصيف
    requiredNeeds: "",
    generalDescription: "",
    
    // فريق المعاينة
    teamMember1: "",
    teamMember2: "",
    teamMember3: "",
    teamMember4: "",
    teamMember5: "",
  });

  // جلب بيانات الطلب
  const { data: requestData, isLoading: requestLoading } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: requestId > 0 }
  );

  // جلب بيانات الزيارة المجدولة للحصول على اسم المسؤول
  const { data: fieldVisitData } = trpc.fieldVisits.getVisit.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  // ملء اسم المسؤول تلقائياً عند تحميل بيانات الزيارة
  useEffect(() => {
    if (fieldVisitData && !formData.teamMember1) {
      // استخدام اسم المسؤول المعين من قاعدة البيانات
      const assignedName = (fieldVisitData as any).assignedUserName;
      if (assignedName) {
        setFormData(prev => ({ ...prev, teamMember1: assignedName }));
      } else if (fieldVisitData.assignedTo === user?.id && user?.name) {
        // إذا كان المستخدم الحالي هو المسؤول
        setFormData(prev => ({ ...prev, teamMember1: user.name || '' }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldVisitData, user?.id]);

  // mutation لرفع المرفقات
  const uploadAttachments = trpc.storage.uploadMultipleAttachments.useMutation();

  // mutation لإنشاء تقرير المعاينة
  const createReport = trpc.requests.addFieldVisitReport.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ تقرير المعاينة الميدانية بنجاح");
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // التحقق من الحقول المطلوبة
    if (!formData.conditionRating) {
      toast.error("يرجى تحديد حالة المسجد");
      return;
    }
    if (!formData.teamMember1) {
      toast.error("يرجى إدخال اسم عضو الفريق الأول على الأقل");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport.mutateAsync({
        requestId,
        visitDate: new Date().toISOString(),
        mosqueCondition: formData.mosqueCondition,
        conditionRating: formData.conditionRating as "excellent" | "good" | "fair" | "poor" | "critical",
        menPrayerLength: formData.menPrayerLength ? parseFloat(formData.menPrayerLength) : undefined,
        menPrayerWidth: formData.menPrayerWidth ? parseFloat(formData.menPrayerWidth) : undefined,
        menPrayerHeight: formData.menPrayerHeight ? parseFloat(formData.menPrayerHeight) : undefined,
        womenPrayerExists,
        womenPrayerLength: womenPrayerExists && formData.womenPrayerLength ? parseFloat(formData.womenPrayerLength) : undefined,
        womenPrayerWidth: womenPrayerExists && formData.womenPrayerWidth ? parseFloat(formData.womenPrayerWidth) : undefined,
        womenPrayerHeight: womenPrayerExists && formData.womenPrayerHeight ? parseFloat(formData.womenPrayerHeight) : undefined,
        requiredNeeds: formData.requiredNeeds,
        generalDescription: formData.generalDescription,
        teamMember1: formData.teamMember1,
        teamMember2: formData.teamMember2 || undefined,
        teamMember3: formData.teamMember3 || undefined,
        teamMember4: formData.teamMember4 || undefined,
        teamMember5: formData.teamMember5 || undefined,
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
            <Button onClick={() => navigate("/field-team")}>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">نموذج المعاينة الميدانية</h1>
          <p className="text-gray-600">توثيق حالة المسجد فنياً وتحديد الاحتياجات</p>
        </div>

        {/* البيانات الأساسية */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              البيانات الأساسية
            </CardTitle>
            <CardDescription>معلومات الطلب وصاحب الطلب والمسجد (مستوردة تلقائياً)</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 mb-6">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                البيانات التالية مستوردة من نموذج الطلب المقدم ولا يمكن تعديلها
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
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">اسم مقدم الطلب</p>
                  <p className="font-medium">{requestData.requester?.name || "غير محدد"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">رقم التواصل</p>
                  <p className="font-medium">{requestData.requester?.phone || "غير محدد"}</p>
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
                  <p className="font-medium">{requestData.mosque?.address || "غير محدد"}</p>
                  {requestData.mosque?.latitude && requestData.mosque?.longitude && (
                    <a 
                      href={requestData.mosque?.latitude && requestData.mosque?.longitude ? `https://maps.google.com/?q=${requestData.mosque.latitude},${requestData.mosque.longitude}` : "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      عرض على خرائط Google
                    </a>
                  )}
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
            <CardDescription>توصيف حالة المسجد والمساحات الداخلية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>حالة المسجد <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.conditionRating}
                  onValueChange={(value) => handleInputChange("conditionRating", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر حالة المسجد" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOSQUE_CONDITIONS.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        <span className={condition.color}>{condition.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>توصيف الحالة</Label>
                <Input
                  value={formData.mosqueCondition}
                  onChange={(e) => handleInputChange("mosqueCondition", e.target.value)}
                  placeholder="وصف مختصر لحالة المسجد"
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* مساحة مصلى الرجال */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                مساحة مصلى الرجال
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>الطول (متر)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.menPrayerLength}
                    onChange={(e) => handleInputChange("menPrayerLength", e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>العرض (متر)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.menPrayerWidth}
                    onChange={(e) => handleInputChange("menPrayerWidth", e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>الارتفاع (متر)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.menPrayerHeight}
                    onChange={(e) => handleInputChange("menPrayerHeight", e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
              {formData.menPrayerLength && formData.menPrayerWidth && (
                <p className="text-sm text-gray-500 mt-2">
                  المساحة: {(parseFloat(formData.menPrayerLength) * parseFloat(formData.menPrayerWidth)).toFixed(2)} م²
                </p>
              )}
            </div>

            <Separator />

            {/* مساحة مصلى النساء */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  id="womenPrayerExists"
                  checked={womenPrayerExists}
                  onCheckedChange={(checked) => setWomenPrayerExists(checked === true)}
                />
                <Label htmlFor="womenPrayerExists" className="cursor-pointer font-medium flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  يوجد مصلى للنساء
                </Label>
              </div>
              
              {womenPrayerExists && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>الطول (متر)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.womenPrayerLength}
                      onChange={(e) => handleInputChange("womenPrayerLength", e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>العرض (متر)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.womenPrayerWidth}
                      onChange={(e) => handleInputChange("womenPrayerWidth", e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>الارتفاع (متر)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.womenPrayerHeight}
                      onChange={(e) => handleInputChange("womenPrayerHeight", e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              {womenPrayerExists && formData.womenPrayerLength && formData.womenPrayerWidth && (
                <p className="text-sm text-gray-500 mt-2">
                  المساحة: {(parseFloat(formData.womenPrayerLength) * parseFloat(formData.womenPrayerWidth)).toFixed(2)} م²
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* الاحتياج والتوصيف */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              الاحتياج والتوصيف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>الاحتياج المطلوب</Label>
              <Textarea
                value={formData.requiredNeeds}
                onChange={(e) => handleInputChange("requiredNeeds", e.target.value)}
                placeholder="وصف الاحتياجات المطلوبة للمسجد..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label>الوصف العام للحالة</Label>
              <Textarea
                value={formData.generalDescription}
                onChange={(e) => handleInputChange("generalDescription", e.target.value)}
                placeholder="وصف عام لحالة المسجد والملاحظات..."
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
            <CardDescription>إرفاق صور توثيقية لحالة المسجد</CardDescription>
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

        {/* فريق المعاينة */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              فريق المعاينة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>عضو 1 <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.teamMember1}
                  onChange={(e) => handleInputChange("teamMember1", e.target.value)}
                  placeholder="اسم العضو الأول"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>عضو 2</Label>
                <Input
                  value={formData.teamMember2}
                  onChange={(e) => handleInputChange("teamMember2", e.target.value)}
                  placeholder="اسم العضو الثاني"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>عضو 3</Label>
                <Input
                  value={formData.teamMember3}
                  onChange={(e) => handleInputChange("teamMember3", e.target.value)}
                  placeholder="اسم العضو الثالث"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>عضو 4</Label>
                <Input
                  value={formData.teamMember4}
                  onChange={(e) => handleInputChange("teamMember4", e.target.value)}
                  placeholder="اسم العضو الرابع"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>عضو 5</Label>
                <Input
                  value={formData.teamMember5}
                  onChange={(e) => handleInputChange("teamMember5", e.target.value)}
                  placeholder="اسم العضو الخامس"
                  className="mt-1"
                />
              </div>
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
