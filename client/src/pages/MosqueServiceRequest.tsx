import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Building2, 
  Hammer, 
  Wrench, 
  Package, 
  Receipt, 
  Sparkles, 
  Sun, 
  Droplets, 
  GlassWater,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  Upload,
  FileText
} from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { PROGRAMS } from "@shared/constants";

// تعريف خدمات المساجد
const SERVICES = [
  { id: "bunyan", name: "بنيان", description: "بناء مسجد جديد", icon: Building2, color: "bg-emerald-500", requiresMosque: false },
  { id: "daaem", name: "دعائم", description: "استكمال المساجد المتعثرة", icon: Hammer, color: "bg-blue-500", requiresMosque: true },
  { id: "enaya", name: "عناية", description: "الصيانة والترميم", icon: Wrench, color: "bg-orange-500", requiresMosque: true },
  { id: "emdad", name: "إمداد", description: "توفير تجهيزات المساجد", icon: Package, color: "bg-purple-500", requiresMosque: true },
  { id: "ethraa", name: "إثراء", description: "سداد فواتير الخدمات", icon: Receipt, color: "bg-pink-500", requiresMosque: true },
  { id: "sedana", name: "سدانة", description: "خدمات التشغيل والنظافة", icon: Sparkles, color: "bg-cyan-500", requiresMosque: true },
  { id: "taqa", name: "طاقة", description: "الطاقة الشمسية", icon: Sun, color: "bg-yellow-500", requiresMosque: true },
  { id: "miyah", name: "مياه", description: "أنظمة المياه", icon: Droplets, color: "bg-sky-500", requiresMosque: true },
  { id: "suqya", name: "سقيا", description: "توفير ماء الشرب", icon: GlassWater, color: "bg-teal-500", requiresMosque: true },
];

// خطوات النموذج
const STEPS = [
  { id: 1, title: "اختيار الخدمة", description: "حدد نوع الخدمة المطلوبة" },
  { id: 2, title: "الشروط والأحكام", description: "الموافقة على الشروط" },
  { id: 3, title: "بيانات مقدم الطلب", description: "مراجعة البيانات الشخصية" },
  { id: 4, title: "تفاصيل الطلب", description: "إدخال تفاصيل الخدمة" },
  { id: 5, title: "المراجعة والإرسال", description: "مراجعة وتأكيد الطلب" },
];

export default function MosqueServiceRequest() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // حالة النموذج
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // المرفقات
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    // حقول برنامج بنيان
    hasLand: "",
    landOwnership: "",
    landArea: "",
    hasDonor: "",
    donationAmount: "",
    fundingProposal: "",
    landProposal: "",
    nearestMosque: "",
    distanceToMosque: "",
    willingToVolunteer: "",
    neighborhoodName: "",
    
    // حقول البرامج 2-8
    workDescription: "",
    mosqueArea: "",
    actualWorshippers: "",
    hasDonorForMaintenance: "",
    
    // حقول برنامج سقيا
    cartonsNeeded: "",
    monthlyCartonNeed: "",
    hasWaterFridge: "",
  });

  // جلب المساجد المسجلة بواسطة المستخدم الحالي
  const { data: myMosques } = trpc.mosques.getMyMosques.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  
  // تحويل البيانات للتوافق مع الكود الحالي
  const userMosques = { mosques: myMosques || [] };

  // استرجاع بيانات المسجد تلقائياً عند اختياره
  useEffect(() => {
    if (selectedMosque && myMosques) {
      const mosque = myMosques.find(m => m.id === selectedMosque);
      if (mosque) {
        if (mosque.area) handleInputChange("mosqueArea", mosque.area.toString());
        if (mosque.capacity) handleInputChange("actualWorshippers", mosque.capacity.toString());
      }
    }
  }, [selectedMosque, myMosques]);

  // mutation لرفع المرفقات
  const uploadAttachments = trpc.storage.uploadMultipleAttachments.useMutation();

  // mutation لإنشاء الطلب
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تقديم طلبك بنجاح! رقم الطلب: ${data.requestNumber}`);
      navigate(`/requests/${data.requestId}`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تقديم الطلب");
      setIsSubmitting(false);
    },
  });

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("يجب تسجيل الدخول لتقديم طلب");
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const selectedServiceData = SERVICES.find(s => s.id === selectedService);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedService !== null;
      case 2:
        return agreedToTerms;
      case 3:
        return true; // بيانات المستخدم تلقائية
      case 4:
        if (selectedService === "bunyan") {
          return formData.hasLand && formData.neighborhoodName;
        } else if (selectedService === "suqya") {
          return selectedMosque && formData.cartonsNeeded;
        } else {
          return selectedMosque && formData.workDescription;
        }
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // تحويل نوع الخدمة إلى programType المطلوب
    const programTypeMap: Record<string, string> = {
      bunyan: "bunyan",
      daaem: "daaem",
      enaya: "enaya",
      emdad: "emdad",
      ethraa: "ethraa",
      sedana: "sedana",
      taqa: "taqa",
      miyah: "miyah",
      suqya: "suqya",
    };

    const programData: Record<string, unknown> = {};
    
    if (selectedService === "bunyan") {
      programData.hasLand = formData.hasLand === "yes";
      programData.landOwnership = formData.landOwnership;
      programData.landArea = formData.landArea ? parseFloat(formData.landArea) : undefined;
      programData.hasDonor = formData.hasDonor;
      programData.donationAmount = formData.donationAmount ? parseFloat(formData.donationAmount) : undefined;
      programData.fundingProposal = formData.fundingProposal;
      programData.landProposal = formData.landProposal;
      programData.nearestMosque = formData.nearestMosque;
      programData.distanceToMosque = formData.distanceToMosque;
      programData.willingToVolunteer = formData.willingToVolunteer === "yes";
      programData.neighborhoodName = formData.neighborhoodName;
    } else if (selectedService === "suqya") {
      programData.cartonsNeeded = formData.cartonsNeeded ? parseInt(formData.cartonsNeeded) : undefined;
      programData.monthlyCartonNeed = formData.monthlyCartonNeed ? parseInt(formData.monthlyCartonNeed) : undefined;
      programData.hasWaterFridge = formData.hasWaterFridge === "yes";
      programData.mosqueArea = formData.mosqueArea ? parseFloat(formData.mosqueArea) : undefined;
      programData.actualWorshippers = formData.actualWorshippers ? parseInt(formData.actualWorshippers) : undefined;
      programData.hasDonorForMaintenance = formData.hasDonorForMaintenance === "yes";
      programData.willingToVolunteer = formData.willingToVolunteer === "yes";
    } else {
      programData.workDescription = formData.workDescription;
      programData.mosqueArea = formData.mosqueArea ? parseFloat(formData.mosqueArea) : undefined;
      programData.actualWorshippers = formData.actualWorshippers ? parseInt(formData.actualWorshippers) : undefined;
      programData.hasDonorForMaintenance = formData.hasDonorForMaintenance === "yes";
      programData.willingToVolunteer = formData.willingToVolunteer === "yes";
    }

    try {
      const result = await createRequest.mutateAsync({
        mosqueId: selectedService === "bunyan" ? null : selectedMosque,
        programType: programTypeMap[selectedService!] as "bunyan" | "daaem" | "enaya" | "emdad" | "ethraa" | "sedana" | "taqa" | "miyah" | "suqya",
        programData,
      });

      // رفع المرفقات إذا وجدت
      if (attachments.length > 0 && result.requestId) {
        try {
          await uploadAttachments.mutateAsync({
            requestId: result.requestId,
            files: attachments.map(file => ({
              fileName: file.fileName,
              fileData: file.fileData,
              mimeType: file.mimeType,
              category: selectedService === "bunyan" ? "land_deed" : "site_photo",
            })),
          });
        } catch (uploadError) {
          console.error("خطأ في رفع المرفقات:", uploadError);
          toast.warning("تم تقديم الطلب ولكن فشل رفع بعض المرفقات");
        }
      }
    } catch {
      // Error handled in onError
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 sm:py-8" dir="rtl">
      <div className="container max-w-4xl mx-auto px-4">
        {/* زر العودة والعنوان */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/requester")}
              className="hover:bg-muted p-2 h-auto"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground">العودة للرئيسية</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">طلبات خدمات المساجد</h1>
            <p className="text-sm sm:text-base text-gray-600">قدم طلبك للاستفادة من خدمات جمعية عمارة المساجد</p>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          <div className="min-w-[360px] sm:min-w-0">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`flex shrink-0 items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-colors ${
                    currentStep >= step.id 
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                      : "border-gray-300 text-gray-400 bg-white"
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 sm:mx-2 ${
                      currentStep > step.id ? "bg-primary" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((step) => (
                <div key={step.id} className="text-center w-14 sm:w-20">
                  <p className={`text-[10px] sm:text-xs leading-tight ${currentStep >= step.id ? "text-primary font-medium" : "text-gray-400"}`}>
                    {step.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* محتوى الخطوة */}
        <Card className="shadow-lg border-0 sm:border rounded-2xl sm:rounded-xl">
          <CardHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-6 pb-6">
            {/* الخطوة 1: اختيار الخدمة */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                        selectedService === service.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start sm:items-center sm:block gap-3 sm:gap-0">
                        <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${service.color} flex items-center justify-center sm:mb-3`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg mb-0.5 sm:mb-1">{service.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-none">{service.description}</p>
                          {!service.requiresMosque && (
                            <span className="inline-block mt-1 sm:mt-2 text-[10px] sm:text-xs bg-amber-100 text-amber-700 px-2 py-0.5 sm:py-1 rounded">
                              لا يتطلب مسجد مسجل
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* الخطوة 2: الشروط والأحكام */}
            {currentStep === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <Alert className="bg-amber-50 border-amber-200 p-3 sm:p-4">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs sm:text-sm mt-1 sm:mt-0 leading-relaxed">
                    نأمل تعبئة البيانات بكل دقة علماً بأن النموذج لن يتم اعتماده إلا بعد تقييم مكتب المشاريع بالجمعية والتأكد من المطلوب
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 border rounded-xl p-4 sm:p-6 max-h-60 overflow-y-auto">
                  <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">الشروط والأحكام</h3>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700 leading-relaxed">
                    <p>1. يجب أن تكون جميع البيانات المقدمة صحيحة ودقيقة.</p>
                    <p>2. تحتفظ الجمعية بحق رفض أي طلب لا يستوفي الشروط المطلوبة.</p>
                    <p>3. سيتم التواصل معكم خلال 7 أيام عمل من تاريخ تقديم الطلب.</p>
                    <p>4. يجب توفير جميع المستندات المطلوبة عند الطلب.</p>
                    <p>5. الموافقة على الطلب لا تعني بالضرورة التنفيذ الفوري.</p>
                    <p>6. تخضع جميع الطلبات للتقييم الفني والمالي من قبل الجهات المختصة.</p>
                    <p>7. يحق للجمعية طلب زيارة ميدانية للتحقق من البيانات المقدمة.</p>
                  </div>
                </div>

                <div className="flex items-start sm:items-center gap-3 p-3 sm:p-4 bg-white border rounded-xl shadow-sm">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-1 sm:mt-0"
                  />
                  <Label htmlFor="terms" className="cursor-pointer text-sm sm:text-base leading-snug font-medium text-foreground">
                    أقر بأنني قرأت الشروط والأحكام وأوافق عليها
                  </Label>
                </div>
              </div>
            )}

            {/* الخطوة 3: بيانات مقدم الطلب */}
            {currentStep === 3 && user && (
              <div className="space-y-4 sm:space-y-6">
                <Alert className="bg-blue-50 border-blue-200 p-3 sm:p-4">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs sm:text-sm">
                    البيانات التالية مأخوذة من حسابك ولا يمكن تعديلها من هنا
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 border rounded-xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">اسم مقدم الطلب</p>
                      <p className="text-sm sm:text-base font-medium">{user.name || "غير محدد"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 border rounded-xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">البريد الإلكتروني</p>
                      <p className="text-sm sm:text-base font-medium truncate">{user.email || "غير محدد"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 border rounded-xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">رقم الجوال</p>
                      <p className="text-sm sm:text-base font-medium" dir="ltr">{"phone" in user ? (user as { phone?: string }).phone || "غير محدد" : "غير محدد"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 border rounded-xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Home className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">صفة مقدم الطلب</p>
                      <p className="text-sm sm:text-base font-medium">{"requesterType" in user ? (user as { requesterType?: string }).requesterType || "طالب خدمة" : "طالب خدمة"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* الخطوة 4: تفاصيل الطلب */}
            {currentStep === 4 && (
              <div className="space-y-5 sm:space-y-6">
                {/* حقول برنامج بنيان */}
                {selectedService === "bunyan" && (
                  <div className="space-y-5 sm:space-y-6">
                    <div>
                      <Label className="text-sm font-medium">اسم الحي <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.neighborhoodName}
                        onChange={(e) => handleInputChange("neighborhoodName", e.target.value)}
                        placeholder="أدخل اسم الحي"
                        className="mt-1.5 h-10 sm:h-11"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 sm:p-5 border rounded-xl">
                      <Label className="text-sm font-medium">هل هناك أرض مخصصة لبناء مسجد؟ <span className="text-red-500">*</span></Label>
                      <RadioGroup
                        value={formData.hasLand}
                        onValueChange={(value) => handleInputChange("hasLand", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="hasLand-yes" />
                          <Label htmlFor="hasLand-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="hasLand-no" />
                          <Label htmlFor="hasLand-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.hasLand === "yes" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">ملكية الأرض</Label>
                          <Select
                            value={formData.landOwnership}
                            onValueChange={(value) => handleInputChange("landOwnership", value)}
                          >
                            <SelectTrigger className="mt-1.5 h-10 sm:h-11 text-xs sm:text-sm">
                              <SelectValue placeholder="اختر نوع الملكية" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="islamic_affairs">الأرض ملك لوزارة الشؤون الإسلامية</SelectItem>
                              <SelectItem value="government">الأرض مملوكة لجهة حكومية</SelectItem>
                              <SelectItem value="private">الأرض خاصة</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">مساحة الأرض بالمتر المربع</Label>
                          <Input
                            type="number"
                            value={formData.landArea}
                            onChange={(e) => handleInputChange("landArea", e.target.value)}
                            placeholder="مثال: 500"
                            className="mt-1.5 h-10 sm:h-11"
                          />
                        </div>
                      </div>
                    )}

                    {formData.hasLand === "no" && (
                      <div>
                        <Label className="text-sm font-medium">مقترحاتكم لإيجاد أرض للبناء</Label>
                        <Textarea
                          value={formData.landProposal}
                          onChange={(e) => handleInputChange("landProposal", e.target.value)}
                          placeholder="اكتب مقترحاتكم..."
                          className="mt-1.5"
                          rows={3}
                        />
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div className="bg-gray-50 p-4 sm:p-5 border rounded-xl">
                      <Label className="text-sm font-medium">هل هناك متبرع لبناء المسجد؟</Label>
                      <RadioGroup
                        value={formData.hasDonor}
                        onValueChange={(value) => handleInputChange("hasDonor", value)}
                        className="mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="full" id="donor-full" />
                          <Label htmlFor="donor-full" className="cursor-pointer text-xs sm:text-sm">نعم يوجد متبرع لبناء المسجد بكامل مرافقه</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="partial" id="donor-partial" />
                          <Label htmlFor="donor-partial" className="cursor-pointer text-xs sm:text-sm">نعم يوجد متبرع للتبرع بجزء من المبلغ</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="donor-no" />
                          <Label htmlFor="donor-no" className="cursor-pointer text-xs sm:text-sm">لا يوجد متبرع</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {(formData.hasDonor === "full" || formData.hasDonor === "partial") && (
                      <div>
                        <Label className="text-sm font-medium">كم مبلغ التبرع المتاح (ريال)</Label>
                        <Input
                          type="number"
                          value={formData.donationAmount}
                          onChange={(e) => handleInputChange("donationAmount", e.target.value)}
                          placeholder="مثال: 100000"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                    )}

                    {formData.hasDonor === "no" && (
                      <div>
                        <Label className="text-sm font-medium">مقترحاتكم لتوفير تكاليف بناء المسجد</Label>
                        <Textarea
                          value={formData.fundingProposal}
                          onChange={(e) => handleInputChange("fundingProposal", e.target.value)}
                          placeholder="اكتب مقترحاتكم..."
                          className="mt-1.5"
                          rows={3}
                        />
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">أقرب مسجد لكم</Label>
                        <Input
                          value={formData.nearestMosque}
                          onChange={(e) => handleInputChange("nearestMosque", e.target.value)}
                          placeholder="اسم المسجد"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">كم يبعد عنكم (بالمتر أو الكيلومتر)</Label>
                        <Input
                          value={formData.distanceToMosque}
                          onChange={(e) => handleInputChange("distanceToMosque", e.target.value)}
                          placeholder="مثال: 500 متر"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    <div className="bg-primary/5 p-4 sm:p-5 border border-primary/20 rounded-xl">
                      <Label className="text-sm font-medium text-primary">هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟</Label>
                      <RadioGroup
                        value={formData.willingToVolunteer}
                        onValueChange={(value) => handleInputChange("willingToVolunteer", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="volunteer-yes" />
                          <Label htmlFor="volunteer-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="volunteer-no" />
                          <Label htmlFor="volunteer-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator className="my-2" />

                    {/* رفع المرفقات */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                        <Upload className="w-4 h-4 text-primary" />
                        المرفقات (اختياري)
                      </Label>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
                        يمكنك رفع صك الأرض أو صور الموقع أو أي مستندات داعمة
                      </p>
                      <FileUpload
                        onFilesSelected={setAttachments}
                        maxFiles={5}
                        maxSizeMB={10}
                        label="رفع المستندات"
                        description="صك الأرض، صور الموقع، المخططات"
                        existingFiles={attachments}
                      />
                    </div>
                  </div>
                )}

                {/* حقول برنامج سقيا */}
                {selectedService === "suqya" && (
                  <div className="space-y-5 sm:space-y-6">
                    <div>
                      <Label className="text-sm font-medium">اختر المسجد <span className="text-red-500">*</span></Label>
                      <Select
                        value={selectedMosque?.toString() || ""}
                        onValueChange={(value) => setSelectedMosque(parseInt(value))}
                      >
                        <SelectTrigger className="mt-1.5 h-10 sm:h-11 text-xs sm:text-sm">
                          <SelectValue placeholder="اختر المسجد" />
                        </SelectTrigger>
                        <SelectContent>
                          {userMosques?.mosques?.map((mosque) => (
                            <SelectItem key={mosque.id} value={mosque.id.toString()}>
                              {mosque.name} - {mosque.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!userMosques?.mosques || userMosques.mosques.length === 0) && (
                        <p className="text-xs sm:text-sm text-amber-600 mt-2">
                          لا توجد مساجد مسجلة. يرجى تسجيل مسجد أولاً.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">عدد الكراتين المطلوبة <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={formData.cartonsNeeded}
                          onChange={(e) => handleInputChange("cartonsNeeded", e.target.value)}
                          placeholder="مثال: 50"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">احتياج المسجد الشهري بالكرتون</Label>
                        <Input
                          type="number"
                          value={formData.monthlyCartonNeed}
                          onChange={(e) => handleInputChange("monthlyCartonNeed", e.target.value)}
                          placeholder="مثال: 20"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">مساحة المسجد بالمتر المربع</Label>
                        <Input
                          type="number"
                          value={formData.mosqueArea}
                          onChange={(e) => handleInputChange("mosqueArea", e.target.value)}
                          placeholder="مثال: 300"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">عدد المصلين الفعلي</Label>
                        <Input
                          type="number"
                          value={formData.actualWorshippers}
                          onChange={(e) => handleInputChange("actualWorshippers", e.target.value)}
                          placeholder="مثال: 200"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 border rounded-xl">
                      <Label className="text-sm font-medium">هل لديكم ثلاجة مخصصة للماء بالمسجد؟</Label>
                      <RadioGroup
                        value={formData.hasWaterFridge}
                        onValueChange={(value) => handleInputChange("hasWaterFridge", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="fridge-yes" />
                          <Label htmlFor="fridge-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="fridge-no" />
                          <Label htmlFor="fridge-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="bg-gray-50 p-4 border rounded-xl">
                      <Label className="text-sm font-medium">هل يوجد لديكم متبرع للقيام بتكاليف الصيانة المطلوبة؟</Label>
                      <RadioGroup
                        value={formData.hasDonorForMaintenance}
                        onValueChange={(value) => handleInputChange("hasDonorForMaintenance", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="maintenance-yes" />
                          <Label htmlFor="maintenance-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="maintenance-no" />
                          <Label htmlFor="maintenance-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="bg-primary/5 p-4 border border-primary/20 rounded-xl">
                      <Label className="text-sm font-medium text-primary">هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟</Label>
                      <RadioGroup
                        value={formData.willingToVolunteer}
                        onValueChange={(value) => handleInputChange("willingToVolunteer", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="volunteer-yes" />
                          <Label htmlFor="volunteer-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="volunteer-no" />
                          <Label htmlFor="volunteer-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* حقول البرامج 2-8 */}
                {selectedService && !["bunyan", "suqya"].includes(selectedService) && (
                  <div className="space-y-5 sm:space-y-6">
                    <div>
                      <Label className="text-sm font-medium">اختر المسجد <span className="text-red-500">*</span></Label>
                      <Select
                        value={selectedMosque?.toString() || ""}
                        onValueChange={(value) => setSelectedMosque(parseInt(value))}
                      >
                        <SelectTrigger className="mt-1.5 h-10 sm:h-11 text-xs sm:text-sm">
                          <SelectValue placeholder="اختر المسجد" />
                        </SelectTrigger>
                        <SelectContent>
                          {userMosques?.mosques?.map((mosque) => (
                            <SelectItem key={mosque.id} value={mosque.id.toString()}>
                              {mosque.name} - {mosque.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!userMosques?.mosques || userMosques.mosques.length === 0) && (
                        <p className="text-xs sm:text-sm text-amber-600 mt-2">
                          لا توجد مساجد مسجلة. يرجى تسجيل مسجد أولاً.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">وصف الأعمال المطلوبة <span className="text-red-500">*</span></Label>
                      <Textarea
                        value={formData.workDescription}
                        onChange={(e) => handleInputChange("workDescription", e.target.value)}
                        placeholder="اكتب وصفاً تفصيلياً للأعمال المطلوبة..."
                        className="mt-1.5"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">مساحة المسجد بالمتر المربع</Label>
                        <Input
                          type="number"
                          value={formData.mosqueArea}
                          onChange={(e) => handleInputChange("mosqueArea", e.target.value)}
                          placeholder="مثال: 300"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">عدد المصلين الفعلي</Label>
                        <Input
                          type="number"
                          value={formData.actualWorshippers}
                          onChange={(e) => handleInputChange("actualWorshippers", e.target.value)}
                          placeholder="مثال: 200"
                          className="mt-1.5 h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 border rounded-xl">
                      <Label className="text-sm font-medium">هل يوجد لديكم متبرع للقيام بتكاليف الصيانة المطلوبة؟</Label>
                      <RadioGroup
                        value={formData.hasDonorForMaintenance}
                        onValueChange={(value) => handleInputChange("hasDonorForMaintenance", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="maintenance-yes" />
                          <Label htmlFor="maintenance-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="maintenance-no" />
                          <Label htmlFor="maintenance-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="bg-primary/5 p-4 border border-primary/20 rounded-xl">
                      <Label className="text-sm font-medium text-primary">هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟</Label>
                      <RadioGroup
                        value={formData.willingToVolunteer}
                        onValueChange={(value) => handleInputChange("willingToVolunteer", value)}
                        className="mt-3 flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="volunteer-yes" />
                          <Label htmlFor="volunteer-yes" className="cursor-pointer">نعم</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="volunteer-no" />
                          <Label htmlFor="volunteer-no" className="cursor-pointer">لا</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator className="my-2" />

                    {/* رفع المرفقات */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                        <Upload className="w-4 h-4 text-primary" />
                        المرفقات (اختياري)
                      </Label>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
                        يمكنك رفع صور المسجد أو المشكلة أو أي مستندات داعمة
                      </p>
                      <FileUpload
                        onFilesSelected={setAttachments}
                        maxFiles={5}
                        maxSizeMB={10}
                        label="رفع الصور والمستندات"
                        description="صور المسجد، صور المشكلة، الفواتير"
                        existingFiles={attachments}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* الخطوة 5: المراجعة والإرسال */}
            {currentStep === 5 && (
              <div className="space-y-4 sm:space-y-6">
                <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-xs sm:text-sm font-medium mt-1 sm:mt-0">
                    يرجى مراجعة البيانات قبل إرسال الطلب
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 border rounded-xl p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    {selectedServiceData && (
                      <>
                        <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${selectedServiceData.color} flex items-center justify-center`}>
                          <selectedServiceData.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">نوع الخدمة</p>
                          <p className="text-sm sm:text-base font-bold">{selectedServiceData.name} <span className="font-normal text-muted-foreground hidden sm:inline">- {selectedServiceData.description}</span></p>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-2">بيانات مقدم الطلب</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <p><span className="text-gray-500 ml-1">الاسم:</span> <span className="font-medium">{user?.name}</span></p>
                      <p className="truncate"><span className="text-gray-500 ml-1">البريد:</span> <span className="font-medium">{user?.email}</span></p>
                    </div>
                  </div>

                  {selectedMosque && userMosques?.mosques && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-2">المسجد المختار</p>
                        <p className="text-sm sm:text-base font-medium">
                          {userMosques.mosques.find(m => m.id === selectedMosque)?.name}
                        </p>
                      </div>
                    </>
                  )}

                  {attachments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-2">المرفقات ({attachments.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white border shadow-sm rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm max-w-full">
                              {file.mimeType.startsWith("image/") ? (
                                <img src={file.preview} alt={file.fileName} className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded" />
                              ) : (
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" />
                              )}
                              <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.fileName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          {/* أزرار التنقل */}
          <div className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-gray-50/50 border-t rounded-b-2xl sm:rounded-b-xl">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-1 sm:gap-2 h-9 sm:h-11 px-3 sm:px-5"
            >
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">السابق</span>
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
                className="gap-1 sm:gap-2 h-9 sm:h-11 px-6 sm:px-8 bg-primary hover:bg-primary/90 text-white"
              >
                <span className="text-xs sm:text-sm font-bold">التالي</span>
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1 sm:gap-2 h-9 sm:h-11 px-5 sm:px-8 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    <span className="text-xs sm:text-sm font-bold">جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-bold">إرسال الطلب</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
