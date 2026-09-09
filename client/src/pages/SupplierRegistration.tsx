import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { FileUpload } from "@/components/FileUpload";
import { LocationPicker } from "@/components/LocationPicker";
import { 
  Building2, 
  Phone, 
  CreditCard, 
  FileText, 
  Loader2,
  MapPin,
  Send,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Globe,
  Truck,
  Info
} from "lucide-react";

// مجالات العمل المتاحة
type WorkFieldType = "construction" | "engineering_consulting" | "electrical" | "plumbing" | "hvac" | 
  "finishing" | "carpentry" | "aluminum" | "painting" | "flooring" | "landscaping" | "cleaning" | 
  "maintenance" | "security_systems" | "sound_systems" | "solar_energy" | "water_systems" | 
  "furniture" | "carpets" | "supplies" | "other";

// مجالات العمل
const WORK_FIELDS: { key: WorkFieldType; label: string }[] = [
  { key: "construction", label: "بناء وتشييد" },
  { key: "engineering_consulting", label: "استشارات هندسية" },
  { key: "electrical", label: "أعمال كهربائية" },
  { key: "plumbing", label: "أعمال سباكة" },
  { key: "hvac", label: "تكييف وتبريد" },
  { key: "finishing", label: "تشطيبات" },
  { key: "carpentry", label: "نجارة" },
  { key: "aluminum", label: "ألمنيوم" },
  { key: "painting", label: "دهانات" },
  { key: "flooring", label: "أرضيات" },
  { key: "landscaping", label: "تنسيق حدائق" },
  { key: "cleaning", label: "نظافة" },
  { key: "maintenance", label: "صيانة" },
  { key: "security_systems", label: "أنظمة أمنية" },
  { key: "sound_systems", label: "أنظمة صوتية" },
  { key: "solar_energy", label: "طاقة شمسية" },
  { key: "water_systems", label: "أنظمة مياه" },
  { key: "furniture", label: "أثاث" },
  { key: "carpets", label: "سجاد" },
  { key: "supplies", label: "توريدات" },
  { key: "other", label: "أخرى" },
];

export default function SupplierRegistration() {
  const [, navigate] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);

  // جلب إعدادات الهوية والشعار
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // جلب البنوك ديناميكياً من قاعدة البيانات
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const banks = allCategories
    .filter((cat: any) => cat.type === "bank")
    .map((cat: any) => cat.nameAr || cat.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // بيانات النموذج - معلومات الكيان
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState<"company" | "establishment">("establishment");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [commercialActivity, setCommercialActivity] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(0);
  const [workFields, setWorkFields] = useState<WorkFieldType[]>([]);

  // بيانات النموذج - معلومات التواصل
  const [address, setAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPersonTitle, setContactPersonTitle] = useState("");

  // بيانات النموذج - معلومات البنك
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  // بيانات النموذج - المرفقات
  const [commercialRegisterDoc, setCommercialRegisterDoc] = useState("");
  const [vatCertificateDoc, setVatCertificateDoc] = useState("");
  const [nationalAddressDoc, setNationalAddressDoc] = useState("");
  const [bankCertificateDoc, setBankCertificateDoc] = useState("");
  const [otherAttachments, setOtherAttachments] = useState<{ name: string; fileData: string }[]>([]);

  // Mutation لتسجيل المورد
  const registerMutation = trpc.suppliers.register.useMutation({
    onSuccess: () => {
      toast.success("تم استلام طلب التسجيل بنجاح - سيتم مراجعة طلبكم من قبل إدارة الجمعية");
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => {
      // تنظيف رسالة الخطأ من بيانات Base64
      let errorMessage = error.message || "حدث خطأ في التسجيل";
      // إذا كانت الرسالة طويلة جداً أو تحتوي على بيانات Base64
      if (errorMessage.length > 200 || errorMessage.includes("data:") || /[A-Za-z0-9+/=]{100,}/.test(errorMessage)) {
        errorMessage = "حدث خطأ في التسجيل. يرجى التحقق من البيانات والمحاولة مرة أخرى";
      }
      toast.error(errorMessage);
      setIsSubmitting(false);
    },
  });

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    // التحقق من معلومات الكيان
    if (!entityName || !commercialRegister || !commercialActivity) {
      toast.error("يرجى ملء جميع حقول معلومات الكيان المطلوبة");
      return false;
    }
    if (workFields.length === 0) {
      toast.error("يرجى اختيار مجال عمل واحد على الأقل");
      return false;
    }

    // التحقق من معلومات التواصل
    if (!address || !googleMapsUrl || !email || !phone || !contactPerson || !contactPersonTitle) {
      toast.error("يرجى ملء جميع حقول معلومات التواصل المطلوبة");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("البريد الإلكتروني غير صحيح");
      return false;
    }

    // التحقق من معلومات البنك
    if (!bankAccountName || !bankName || !iban || !taxNumber) {
      toast.error("يرجى ملء جميع حقول معلومات الحساب البنكي المطلوبة");
      return false;
    }
    if (!iban.match(/^SA\d{22}$/)) {
      toast.error("رقم الآيبان غير صحيح (يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم)");
      return false;
    }

    // التحقق من المرفقات
    if (!commercialRegisterDoc || !vatCertificateDoc || !nationalAddressDoc || !bankCertificateDoc) {
      toast.error("يرجى رفع جميع المرفقات المطلوبة (بما في ذلك الشهادة البنكية)");
      return false;
    }

    // التحقق من المرفقات الإضافية
    for (const attr of otherAttachments) {
      if (attr.fileData && !attr.name) {
        toast.error("يرجى إدخال اسم المرفق لكل ملف مرفوع في المرفقات الإضافية");
        return false;
      }
    }

    return true;
  };

  // إرسال النموذج
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // التحقق من حجم البيانات الإجمالي قبل الإرسال
    let totalPayloadSize = (commercialRegisterDoc.length + vatCertificateDoc.length + nationalAddressDoc.length + bankCertificateDoc.length);
    
    // إضافة حجم المرفقات الإضافية
    otherAttachments.forEach(attr => {
      totalPayloadSize += attr.fileData.length;
    });

    const totalPayloadMB = (totalPayloadSize * 3 / 4) / (1024 * 1024); // تحويل Base64 إلى ميجابايت تقريبي
    
    if (totalPayloadMB > 45) {
      toast.error(`حجم المرفقات الإجمالي كبير جداً (${totalPayloadMB.toFixed(1)} ميجابايت). يرجى استخدام ملفات أصغر حجماً أو صور مضغوطة.`);
      return;
    }

    setIsSubmitting(true);
    
    registerMutation.mutate({
      name: entityName,
      entityType,
      commercialRegister,
      commercialActivity,
      yearsOfExperience,
      workFields,
      address,
      googleMapsUrl,
      email,
      phone,
      phoneSecondary,
      contactPerson,
      contactPersonTitle,
      bankAccountName,
      bankName,
      iban,
      taxNumber,
      commercialRegisterDoc,
      vatCertificateDoc,
      nationalAddressDoc,
      bankCertificateDoc,
      otherAttachments,
    });
  };

  // تحديث مجالات العمل
  const toggleWorkField = (field: WorkFieldType) => {
    setWorkFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  // ==================== شاشة النجاح عند إتمام التسجيل ====================
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-50/80" dir="rtl">
        <Card className="w-full max-w-lg border-0 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
          <div className="h-3 bg-emerald-600 w-full" />
          <CardContent className="pt-8 pb-8 px-6 sm:px-10 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">تم استلام طلبكم بنجاح!</h2>
            
            <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl mb-6 text-right space-y-2">
              <p className="text-emerald-950 font-medium text-sm sm:text-base leading-relaxed">
                شكراً لاهتمامكم بالانضمام إلى قائمة الموردين والمقاولين المعتمدين لدى جمعية عمارة المساجد (منارة).
              </p>
              <p className="text-emerald-900/90 text-xs sm:text-sm leading-relaxed">
                تم استلام بيانات منشأتكم ومرفقاتكم بنجاح، وسيقوم فريق المشتريات والعقود بمراجعة الطلب والمستندات والتواصل معكم عند الاعتماد.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-md cursor-pointer">
                  العودة إلى الصفحة الرئيسية
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => {
                  setIsSuccess(false);
                  setEntityName("");
                  setCommercialRegister("");
                  setCommercialActivity("");
                  setYearsOfExperience(0);
                  setWorkFields([]);
                  setAddress("");
                  setGoogleMapsUrl("");
                  setEmail("");
                  setPhone("");
                  setPhoneSecondary("");
                  setContactPerson("");
                  setContactPersonTitle("");
                  setBankAccountName("");
                  setBankName("");
                  setIban("");
                  setTaxNumber("");
                  setCommercialRegisterDoc("");
                  setVatCertificateDoc("");
                  setNationalAddressDoc("");
                  setBankCertificateDoc("");
                  setOtherAttachments([]);
                }}
              >
                تقديم طلب تسجيل منشأة أخرى
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8" dir="rtl">
      <div className="container max-w-4xl mx-auto px-2 sm:px-4">
        {/* الترويسة والشعار */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3.5">
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="shrink-0 h-10 w-10 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <ArrowRight className="w-5 h-5 text-gray-700" />
              </Button>
            </Link>
            <img
              src={orgSettings?.logoUrl || "/logo.svg"}
              alt={`شعار ${orgSettings?.organizationName || "بوابة منارة"}`}
              className="h-12 object-contain"
            />
            <div className="text-right">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>تسجيل مورد جديد</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  بوابة الموردين
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">انضمام إلى قائمة الموردين والمقاولين المعتمدين</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-gray-600 hover:text-gray-900">
              العودة للصفحة الرئيسية ←
            </Button>
          </Link>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* قسم معلومات الكيان */}
          <Card className="border-0 sm:border shadow-md">
            <CardHeader className="bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-t-lg p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Building2 className="h-5 w-5" />
                معلومات الكيان
              </CardTitle>
              <CardDescription className="text-teal-100 text-xs sm:text-sm">
                البيانات الأساسية للتعريف بالمنشأة المتقدمة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entityName" className="text-sm sm:text-base">اسم الكيان *</Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="اسم الشركة أو المؤسسة"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityType" className="text-sm sm:text-base">نوع الكيان *</Label>
                  <Select
                    value={entityType}
                    onValueChange={(value: "company" | "establishment") => setEntityType(value)}
                  >
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="اختر نوع الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">شركة</SelectItem>
                      <SelectItem value="establishment">مؤسسة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commercialRegister" className="text-sm sm:text-base">رقم السجل التجاري *</Label>
                  <Input
                    id="commercialRegister"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    placeholder="أدخل رقم السجل التجاري"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience" className="text-sm sm:text-base">عدد سنوات الخبرة في النشاط *</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || 0)}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercialActivity" className="text-sm sm:text-base">النشاط حسب السجل التجاري *</Label>
                <Textarea
                  id="commercialActivity"
                  value={commercialActivity}
                  onChange={(e) => setCommercialActivity(e.target.value)}
                  placeholder="أدخل النشاط كما هو مسجل في السجل التجاري"
                  rows={2}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base">مجالات العمل التي ينفذها الكيان *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 sm:p-4 border rounded-lg bg-gray-50">
                  {WORK_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={field.key}
                        checked={workFields.includes(field.key)}
                        onCheckedChange={() => toggleWorkField(field.key)}
                      />
                      <Label htmlFor={field.key} className="text-xs sm:text-sm cursor-pointer leading-tight">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم معلومات التواصل */}
          <Card className="border-0 sm:border shadow-md">
            <CardHeader className="bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-t-lg p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Phone className="h-5 w-5" />
                معلومات التواصل
              </CardTitle>
              <CardDescription className="text-blue-100 text-xs sm:text-sm">
                بيانات الاتصال والموقع الجغرافي للكيان
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm sm:text-base">عنوان الكيان *</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان التفصيلي"
                  rows={2}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base font-bold">موقع الكيان على الخريطة *</Label>
                <LocationPicker
                  value={(() => {
                    if (!googleMapsUrl) return undefined;
                    const match = googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (match) {
                      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
                    }
                    return undefined;
                  })()}
                  onChange={(loc) => {
                    setGoogleMapsUrl(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`);
                    if (loc.address) {
                      setAddress(loc.address);
                    }
                  }}
                  className="w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="h-10 sm:h-11 text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">رقم التواصل *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="h-10 sm:h-11 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneSecondary" className="text-sm sm:text-base">رقم تواصل آخر</Label>
                <Input
                  id="phoneSecondary"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  placeholder="رقم هاتف إضافي (اختياري)"
                  className="h-10 sm:h-11 text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="text-sm sm:text-base">اسم مسؤول التواصل *</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="اسم الشخص المسؤول"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPersonTitle" className="text-sm sm:text-base">وظيفته في الكيان *</Label>
                  <Input
                    id="contactPersonTitle"
                    value={contactPersonTitle}
                    onChange={(e) => setContactPersonTitle(e.target.value)}
                    placeholder="المسمى الوظيفي"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم معلومات الحساب البنكي */}
          <Card className="border-0 sm:border shadow-md">
            <CardHeader className="bg-gradient-to-l from-purple-500 to-purple-600 text-white rounded-t-lg p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-5 w-5" />
                معلومات الحساب البنكي
              </CardTitle>
              <CardDescription className="text-purple-100 text-xs sm:text-sm">
                البيانات المالية الخاصة بالتحويلات
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName" className="text-sm sm:text-base">اسم الحساب *</Label>
                  <Input
                    id="bankAccountName"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="اسم صاحب الحساب"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-sm sm:text-base">اسم البنك *</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="اختر البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank: string) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban" className="text-sm sm:text-base">رقم الآيبان (IBAN) *</Label>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="SA0000000000000000000000"
                    className="h-10 sm:h-11 text-left"
                    dir="ltr"
                  />
                  <p className="text-[10px] sm:text-xs text-gray-500">يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber" className="text-sm sm:text-base">الرقم الضريبي *</Label>
                  <Input
                    id="taxNumber"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="أدخل الرقم الضريبي"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم المرفقات */}
          <Card className="border-0 sm:border shadow-md">
            <CardHeader className="bg-gradient-to-l from-orange-500 to-orange-600 text-white rounded-t-lg p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileText className="h-5 w-5" />
                المرفقات الرسمية
              </CardTitle>
              <CardDescription className="text-orange-100 text-xs sm:text-sm">
                المستندات الرسمية الداعمة لطلب التسجيل (سارية المفعول - الحد الأقصى لكل ملف 10 ميجابايت)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
              {/* تنبيه إرشادي بالحد الأقصى للملفات */}
              <div className="p-3 sm:p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-right flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-900 block">تعليمات رفع المستندات:</span>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    الحد الأقصى المسموح به لحجم كل ملف هو <strong>10 ميجابايت</strong> بصيغ (PDF أو صور JPG / PNG). يرجى التأكد من سريان مفعول المستندات ووضوح الأختام والبيانات.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">إرفاق السجل التجاري *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setCommercialRegisterDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="السجل التجاري"
                    description="ارفع صورة السجل التجاري (حتى 10MB)"
                  />
                  {commercialRegisterDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ تم رفع الملف</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">إرفاق شهادة الضريبة *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setVatCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="شهادة الضريبة"
                    description="ارفع شهادة ضريبة القيمة المضافة (حتى 10MB)"
                  />
                  {vatCertificateDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ تم رفع الملف</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">العنوان الوطني *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setNationalAddressDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="العنوان الوطني"
                    description="ارفع صورة العنوان الوطني (حتى 10MB)"
                  />
                  {nationalAddressDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ تم رفع الملف</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">الشهادة البنكية *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setBankCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="الشهادة البنكية"
                    description="ارفع صورة الشهادة البنكية (حتى 10MB)"
                  />
                  {bankCertificateDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ تم رفع الملف</p>}
                </div>
              </div>

              {/* المرفقات الإضافية */}
              <div className="pt-4 sm:pt-6 border-t mt-4 sm:mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <Label className="text-base sm:text-lg font-semibold">مرفقات أخرى (اختياري)</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">يمكنك إضافة أي مستندات إضافية تدعم طلبك</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOtherAttachments([...otherAttachments, { name: "", fileData: "" }])}
                    className="self-start sm:self-center h-9"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مرفق آخر
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {otherAttachments.map((attr, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl bg-gray-50 items-start sm:items-center shadow-sm">
                      <div className="md:col-span-5 space-y-2">
                        <Label className="text-xs sm:text-sm font-medium">اسم المرفق</Label>
                        <Input
                          value={attr.name}
                          onChange={(e) => {
                            const newAttrs = [...otherAttachments];
                            newAttrs[index].name = e.target.value;
                            setOtherAttachments(newAttrs);
                          }}
                          placeholder="مثال: شهادة تصنيف، سيرة ذاتية..."
                          className="h-9 sm:h-10"
                        />
                      </div>
                      <div className="md:col-span-6 space-y-2">
                        <Label className="text-xs sm:text-sm font-medium">الملف</Label>
                        <FileUpload
                          onFilesSelected={(files) => {
                            if (files.length > 0) {
                              const newAttrs = [...otherAttachments];
                              newAttrs[index].fileData = files[0].fileData;
                              setOtherAttachments(newAttrs);
                            }
                          }}
                          maxFiles={1}
                          label="اختر ملفاً"
                        />
                        {attr.fileData && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ تم رفع الملف</p>}
                      </div>
                      <div className="md:col-span-1 flex justify-end sm:justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 sm:h-10 sm:w-10"
                          onClick={() => setOtherAttachments(otherAttachments.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {otherAttachments.length === 0 && (
                    <div className="text-center py-6 sm:py-8 border-2 border-dashed rounded-xl bg-gray-50/50">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-500">لا توجد مرفقات إضافية حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* زر الإرسال */}
          <div className="flex justify-center pt-4 sm:pt-6 pb-4 sm:pb-8">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || registerMutation.isPending}
              className="w-full sm:w-auto px-12 py-5 sm:py-6 text-base sm:text-lg gap-2 rounded-xl shadow-lg"
            >
              {isSubmitting || registerMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  إرسال طلب التسجيل
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
