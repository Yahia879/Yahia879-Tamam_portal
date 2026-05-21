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
import { getAllFieldsForProgram, getVisibleFieldsForProgram } from "@/lib/programFields";
import {   ArrowRight,
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
  AlertCircle,
  Star
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

  // تقييم صحة معلومات المستفيد
  const [accuracyRating, setAccuracyRating] = useState<number>(0);
  const [accuracyHoverRating, setAccuracyHoverRating] = useState<number>(0);
  const [accuracyNotes, setAccuracyNotes] = useState<string>("");
  
  // حالة الخطوات
  const [currentStep, setCurrentStep] = useState(1);

  // مواصفات الطلب الميدانية
  const [localProgramData, setLocalProgramData] = useState<Record<string, any>>({});

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

  // ملء بيانات مواصفات الطلب عند تحميل بيانات الطلب
  useEffect(() => {
    if (requestData) {
      let parsedData: Record<string, any> = {};
      if (requestData.programData) {
        try {
          if (typeof requestData.programData === 'string') {
            parsedData = JSON.parse(requestData.programData);
          } else {
            parsedData = (requestData.programData as Record<string, any>) || {};
          }
        } catch (e) {
          console.error("Error parsing programData:", e);
          parsedData = {};
        }
      }

      // التحقق من وجود مصلى نساء في المسجد ودمجه في مواصفات الطلب
      if (requestData.mosque?.hasPrayerHall) {
        parsedData.hasPrayerHall = true;
        
        let womenArea = "";
        let womenCapacity = "";
        
        if (requestData.mosque.notes && requestData.mosque.notes.includes("[معلومات مصلى النساء]")) {
          const parts = requestData.mosque.notes.split("[معلومات مصلى النساء]:");
          if (parts.length > 1) {
            const details = parts[1];
            
            // Extract capacity
            const capMatch = details.match(/- السعة:\s*([0-9]+)/);
            if (capMatch) {
              womenCapacity = capMatch[1];
            }
            
            // Extract area
            const areaMatch = details.match(/- المساحة:\s*([0-9.]+)/);
            if (areaMatch) {
              womenArea = areaMatch[1];
            }
          }
        }
        
        if (parsedData.womenPrayerArea === undefined || parsedData.womenPrayerArea === "") {
          parsedData.womenPrayerArea = womenArea ? parseFloat(womenArea) : "";
        }
        if (parsedData.womenPrayerCapacity === undefined || parsedData.womenPrayerCapacity === "") {
          parsedData.womenPrayerCapacity = womenCapacity ? parseInt(womenCapacity) : "";
        }
      }

      setLocalProgramData(parsedData);
    }
  }, [requestData]);

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
    if (!authLoading) {
      if (!isAuthenticated) {
        toast.error("يجب تسجيل الدخول للوصول لهذه الصفحة");
        navigate("/login");
      } else if (user?.role !== 'field_team') {
        toast.error("ليس لديك صلاحية لرفع تقرير الزيارة الميدانية");
        navigate(`/requests/${requestId}`);
      }
    }
  }, [authLoading, isAuthenticated, user, navigate, requestId]);

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
        beneficiaryInfoAccuracyRating: accuracyRating > 0 ? accuracyRating : undefined,
        beneficiaryInfoAccuracyNotes: accuracyNotes || undefined,
        programData: localProgramData,
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 md:py-8" dir="rtl">
      <div className="container max-w-4xl mx-auto px-4 overflow-x-hidden">
        {/* العنوان */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">نموذج المعاينة الميدانية</h1>
          <p className="text-sm md:text-base text-gray-600">توثيق حالة المسجد فنياً وتحديد الاحتياجات</p>
        </div>

        {/* شريط التقدم */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
            <div className="absolute right-0 top-1/2 h-1 bg-primary -z-10 transform -translate-y-1/2 transition-all duration-300" style={{ width: `${((currentStep - 1) / 2) * 100}%` }}></div>
            
            {[
              { step: 1, title: "البيانات والمواصفات" },
              { step: 2, title: "التقييم والاحتياج" },
              { step: 3, title: "الفريق والمستفيد" }
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-colors duration-300 ${currentStep >= item.step ? 'bg-primary text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}>
                  {item.step}
                </div>
                <span className={`text-[10px] md:text-xs font-bold mt-2 ${currentStep >= item.step ? 'text-primary' : 'text-gray-500'}`}>{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* البيانات الأساسية */}
            <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <FileText className="w-5 h-5 text-primary" />
              البيانات الأساسية
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">معلومات الطلب وصاحب الطلب والمسجد (مستوردة تلقائياً)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Alert className="bg-blue-50 border-blue-200 mb-6 p-3">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-[11px] md:text-sm text-blue-800">
                البيانات التالية مستوردة من نموذج الطلب المقدم ولا يمكن تعديلها
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
                <User className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">اسم مقدم الطلب</p>
                  <p className="font-bold text-sm md:text-base truncate">{requestData.requester?.name || "غير محدد"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">رقم التواصل</p>
                  <p className="font-bold text-sm md:text-base truncate">{requestData.requester?.phone || "غير محدد"}</p>
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
                  <p className="font-bold text-sm md:text-base break-words">{requestData.mosque?.address || "غير محدد"}</p>
                  {requestData.mosque?.latitude && requestData.mosque?.longitude && (
                    <a 
                      href={`https://maps.google.com/?q=${requestData.mosque.latitude},${requestData.mosque.longitude}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-primary hover:underline mt-2 inline-block font-medium"
                    >
                      عرض على خرائط Google
                    </a>
                  )}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* تدقيق وتعديل مواصفات الطلب الميدانية */}
        <Card className="mb-6 border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-t-4 border-t-primary">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl text-slate-800 dark:text-slate-100">
              <ClipboardList className="w-5 h-5 text-primary" />
              مواصفات الطلب وتفاصيل الاحتياج الميداني
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-slate-500">
              مراجعة وتعديل مواصفات الطلب المقدمة من المستفيد ومطابقتها ميدانياً
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const fields = getVisibleFieldsForProgram(requestData.programType, localProgramData)
                  .filter(f => f.name !== 'mosqueId');
                
                if (fields.length === 0) {
                  return (
                    <p className="text-slate-500 text-sm col-span-2 text-center py-4">
                      لا توجد مواصفات إضافية لهذا البرنامج.
                    </p>
                  );
                }

                return fields.map((field) => {
                  const value = localProgramData[field.name] !== undefined ? localProgramData[field.name] : (field.defaultValue || "");
                  
                  const handleFieldChange = (val: any) => {
                    setLocalProgramData(prev => ({
                      ...prev,
                      [field.name]: val
                    }));
                  };

                  return (
                    <div key={field.name} className={`space-y-1.5 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                      <Label className="text-sm font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      
                      {field.type === 'textarea' && (
                        <Textarea
                          value={value}
                          onChange={(e) => handleFieldChange(e.target.value)}
                          placeholder={field.placeholder || `أدخل ${field.label}...`}
                          className="min-h-[100px] text-sm md:text-base leading-relaxed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        />
                      )}

                      {field.type === 'select' && (
                        <Select
                          value={value}
                          onValueChange={(val) => handleFieldChange(val)}
                        >
                          <SelectTrigger className="h-10 md:h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder={field.placeholder || `اختر ${field.label}...`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === 'radio' && (
                        <div className="flex flex-wrap gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          {field.options?.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                              <input
                                type="radio"
                                name={field.name}
                                value={opt.value}
                                checked={value === opt.value}
                                onChange={() => handleFieldChange(opt.value)}
                                className="h-4 w-4 text-primary focus:ring-primary border-slate-300"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'checkbox' && (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <Checkbox
                            id={field.name}
                            checked={value === true || value === 'yes'}
                            onCheckedChange={(checked) => handleFieldChange(checked === true)}
                            className="h-5 w-5"
                          />
                          <Label htmlFor={field.name} className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
                            {field.label}
                          </Label>
                        </div>
                      )}

                      {field.type === 'number' && (
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleFieldChange(isNaN(parsed) ? "" : parsed);
                          }}
                          placeholder={field.placeholder || "0"}
                          className="h-10 md:h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        />
                      )}

                      {field.type !== 'textarea' && field.type !== 'select' && field.type !== 'radio' && field.type !== 'checkbox' && field.type !== 'number' && (
                        <Input
                          type={field.type}
                          value={value}
                          onChange={(e) => handleFieldChange(e.target.value)}
                          placeholder={field.placeholder || `أدخل ${field.label}...`}
                          className="h-10 md:h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        />
                      )}
                      
                      {field.help && (
                        <p className="text-[11px] text-slate-400 font-medium mt-1">{field.help}</p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* التقييم الفني */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <ClipboardList className="w-5 h-5 text-primary" />
              التقييم الفني
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">توصيف حالة المسجد والمساحات الداخلية</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">حالة المسجد <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.conditionRating}
                  onValueChange={(value) => handleInputChange("conditionRating", value)}
                >
                  <SelectTrigger className="h-10 md:h-11">
                    <SelectValue placeholder="اختر حالة المسجد" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOSQUE_CONDITIONS.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        <span className={`${condition.color} font-medium`}>{condition.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-bold">توصيف الحالة</Label>
                <Input
                  value={formData.mosqueCondition}
                  onChange={(e) => handleInputChange("mosqueCondition", e.target.value)}
                  placeholder="وصف مختصر لحالة المسجد"
                  className="h-10 md:h-11"
                />
              </div>
            </div>


          </CardContent>
        </Card>

        {/* الاحتياج والتوصيف */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <ClipboardList className="w-5 h-5 text-primary" />
              الاحتياج والتوصيف
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">الاحتياج المطلوب</Label>
              <Textarea
                value={formData.requiredNeeds}
                onChange={(e) => handleInputChange("requiredNeeds", e.target.value)}
                placeholder="وصف الاحتياجات المطلوبة للمسجد..."
                className="min-h-[100px] text-sm md:text-base leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">الوصف العام للحالة</Label>
              <Textarea
                value={formData.generalDescription}
                onChange={(e) => handleInputChange("generalDescription", e.target.value)}
                placeholder="وصف عام لحالة المسجد والملاحظات..."
                className="min-h-[100px] text-sm md:text-base leading-relaxed"
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
            <CardDescription className="text-xs md:text-sm">إرفاق صور توثيقية لحالة المسجد</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
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
              <p className="text-xs md:text-sm text-primary font-bold mt-3 bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
                تم إرفاق {attachments.length} صورة توثيقية
              </p>
            )}
          </CardContent>
        </Card>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* فريق المعاينة */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <Users className="w-5 h-5 text-primary" />
              فريق المعاينة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عضو الفريق الأول <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.teamMember1}
                  onChange={(e) => handleInputChange("teamMember1", e.target.value)}
                  placeholder="الاسم الثلاثي"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عضو الفريق الثاني</Label>
                <Input
                  value={formData.teamMember2}
                  onChange={(e) => handleInputChange("teamMember2", e.target.value)}
                  placeholder="الاسم الثلاثي"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عضو الفريق الثالث</Label>
                <Input
                  value={formData.teamMember3}
                  onChange={(e) => handleInputChange("teamMember3", e.target.value)}
                  placeholder="الاسم الثلاثي"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عضو الفريق الرابع</Label>
                <Input
                  value={formData.teamMember4}
                  onChange={(e) => handleInputChange("teamMember4", e.target.value)}
                  placeholder="الاسم الثلاثي"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عضو الفريق الخامس</Label>
                <Input
                  value={formData.teamMember5}
                  onChange={(e) => handleInputChange("teamMember5", e.target.value)}
                  placeholder="الاسم الثلاثي"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* تقييم صحة معلومات المستفيد */}
        <Card className="mb-6 border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-r-4 border-r-amber-500">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl text-slate-800 dark:text-slate-100">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
              تقييم صحة معلومات المستفيد
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-slate-500">
              يرجى تقييم مدى مطابقة وصحة المعلومات والبيانات المقدمة من قبل المستفيد على أرض الواقع
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <Label className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
                مدى صحة المعلومات ومطابقتها للواقع
              </Label>
              
              <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isGold = starValue <= (accuracyHoverRating || accuracyRating);
                  return (
                    <button
                      key={starValue}
                      type="button"
                      className="transition-all duration-200 transform hover:scale-125 focus:outline-none cursor-pointer"
                      onMouseEnter={() => setAccuracyHoverRating(starValue)}
                      onMouseLeave={() => setAccuracyHoverRating(0)}
                      onClick={() => setAccuracyRating(starValue)}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          isGold
                            ? "text-amber-500 fill-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* النص التعبيري للتقييم */}
              <div className="mt-3 min-h-[24px]">
                {(() => {
                  const currentVal = accuracyHoverRating || accuracyRating;
                  const labels: Record<number, { text: string; color: string }> = {
                    1: { text: "غير صحيحة تماماً (البيانات مخالفة للواقع كلياً)", color: "text-red-500 font-bold" },
                    2: { text: "غير صحيحة غالباً (هناك اختلافات جوهرية كثيرة)", color: "text-orange-500 font-semibold" },
                    3: { text: "مقبولة / صحيحة جزئياً (تتطابق في بعض الجوانب دون أخرى)", color: "text-yellow-600 dark:text-yellow-400 font-semibold" },
                    4: { text: "صحيحة ودقيقة غالباً (تطابق شبه كامل مع اختلافات طفيفة جداً)", color: "text-teal-600 dark:text-teal-400 font-bold" },
                    5: { text: "صحيحة ودقيقة بالكامل (مطابقة تامة وموثوقة 100%)", color: "text-emerald-600 dark:text-emerald-400 font-extrabold" },
                  };
                  const selected = labels[currentVal];
                  return selected ? (
                    <span className={`text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-150 ${selected.color}`}>
                      {selected.text}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-slate-400">انقر لتحديد التقييم بالنجوم</span>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>ملاحظات المعاين على صحة المعلومات</span>
                <span className="text-xs font-normal text-slate-400">(اختياري)</span>
              </Label>
              <Textarea
                value={accuracyNotes}
                onChange={(e) => setAccuracyNotes(e.target.value)}
                placeholder="اكتب أي ملاحظات أو تباينات تم رصدها بين البيانات المقدمة في الطلب والواقع الميداني..."
                className="min-h-[100px] text-sm md:text-base leading-relaxed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-amber-500 focus:ring-amber-500 rounded-lg shadow-sm"
              />
            </div>
          </CardContent>
        </Card>
          </div>
        )}

        {/* أزرار التحكم */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8 pb-10">
          {currentStep === 1 ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11 border-2 font-bold"
              onClick={() => navigate(`/requests/${requestId}`)}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              إلغاء وإغلاق
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11 border-2 font-bold"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setCurrentStep(prev => prev - 1);
              }}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              السابق
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button
              className="w-full sm:w-auto h-11 gradient-primary text-white font-bold shadow-lg"
              onClick={() => {
                // Validate step 1 fields if necessary, skipping for brevity to match "minimal steps" requirement
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setCurrentStep(prev => prev + 1);
              }}
            >
              التالي
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto h-11 gradient-primary text-white font-bold shadow-lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  اعتماد وحفظ تقرير المعاينة
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
