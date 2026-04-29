import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileUpload } from "@/components/FileUpload";
import { 
  Building2, 
  Phone, 
  CreditCard, 
  FileText, 
  Loader2,
  MapPin,
  Send
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

// البنوك السعودية
const SAUDI_BANKS = [
  "البنك الأهلي السعودي",
  "مصرف الراجحي",
  "بنك الرياض",
  "البنك السعودي الفرنسي",
  "البنك السعودي البريطاني (ساب)",
  "بنك البلاد",
  "بنك الجزيرة",
  "البنك العربي الوطني",
  "بنك الإنماء",
  "مصرف الإنماء",
  "بنك الخليج الدولي",
  "بنك الاستثمار السعودي",
];

export default function SupplierRegistration() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
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

  // Mutation لتسجيل المورد
  const registerMutation = trpc.suppliers.register.useMutation({
    onSuccess: () => {
      toast.success("تم التسجيل بنجاح - سيتم مراجعة طلبك من قبل الإدارة");
      navigate("/supplier/dashboard");
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
    if (!googleMapsUrl || !email || !phone || !contactPerson || !contactPersonTitle) {
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
    if (!commercialRegisterDoc || !vatCertificateDoc || !nationalAddressDoc) {
      toast.error("يرجى رفع جميع المرفقات المطلوبة");
      return false;
    }

    return true;
  };

  // إرسال النموذج
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
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

  // التحقق من تسجيل الدخول
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>تسجيل الدخول مطلوب</CardTitle>
            <CardDescription>يرجى تسجيل الدخول أولاً للتسجيل كمورد</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/")}>
              العودة للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">تسجيل مورد جديد</h1>
          <p className="text-gray-600 mt-2">قم بتعبئة البيانات المطلوبة للتسجيل كمورد معتمد</p>
        </div>

        <div className="space-y-6">
          {/* قسم معلومات الكيان */}
          <Card>
            <CardHeader className="bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                معلومات الكيان
              </CardTitle>
              <CardDescription className="text-teal-100">
                البيانات الأساسية للتعريف بالمنشأة المتقدمة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entityName">اسم الكيان *</Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="اسم الشركة أو المؤسسة"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityType">نوع الكيان *</Label>
                  <Select
                    value={entityType}
                    onValueChange={(value: "company" | "establishment") => setEntityType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">شركة</SelectItem>
                      <SelectItem value="establishment">مؤسسة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commercialRegister">رقم السجل التجاري *</Label>
                  <Input
                    id="commercialRegister"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    placeholder="أدخل رقم السجل التجاري"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">عدد سنوات الخبرة في النشاط *</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercialActivity">النشاط حسب السجل التجاري *</Label>
                <Textarea
                  id="commercialActivity"
                  value={commercialActivity}
                  onChange={(e) => setCommercialActivity(e.target.value)}
                  placeholder="أدخل النشاط كما هو مسجل في السجل التجاري"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>مجالات العمل التي ينفذها الكيان *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border rounded-lg bg-gray-50">
                  {WORK_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={field.key}
                        checked={workFields.includes(field.key)}
                        onCheckedChange={() => toggleWorkField(field.key)}
                      />
                      <Label htmlFor={field.key} className="text-sm cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم معلومات التواصل */}
          <Card>
            <CardHeader className="bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                معلومات التواصل
              </CardTitle>
              <CardDescription className="text-blue-100">
                بيانات الاتصال والموقع الجغرافي للكيان
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">عنوان الكيان</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان التفصيلي"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleMapsUrl">موقع الكيان على خرائط Google *</Label>
                <div className="flex gap-2">
                  <Input
                    id="googleMapsUrl"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" type="button">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم التواصل *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneSecondary">رقم تواصل آخر</Label>
                <Input
                  id="phoneSecondary"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  placeholder="رقم هاتف إضافي (اختياري)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">اسم مسؤول التواصل *</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="اسم الشخص المسؤول"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPersonTitle">وظيفته في الكيان *</Label>
                  <Input
                    id="contactPersonTitle"
                    value={contactPersonTitle}
                    onChange={(e) => setContactPersonTitle(e.target.value)}
                    placeholder="المسمى الوظيفي"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم معلومات الحساب البنكي */}
          <Card>
            <CardHeader className="bg-gradient-to-l from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                معلومات الحساب البنكي
              </CardTitle>
              <CardDescription className="text-purple-100">
                البيانات المالية الخاصة بالتحويلات
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">اسم الحساب *</Label>
                  <Input
                    id="bankAccountName"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="اسم صاحب الحساب"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">اسم البنك *</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAUDI_BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban">رقم الآيبان (IBAN) *</Label>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="SA0000000000000000000000"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500">يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">الرقم الضريبي *</Label>
                  <Input
                    id="taxNumber"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="أدخل الرقم الضريبي"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم المرفقات */}
          <Card>
            <CardHeader className="bg-gradient-to-l from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                المرفقات
              </CardTitle>
              <CardDescription className="text-orange-100">
                المستندات الرسمية الداعمة لطلب التسجيل (سارية المفعول)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>إرفاق السجل التجاري *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setCommercialRegisterDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="السجل التجاري"
                    description="ارفع صورة السجل التجاري"
                  />
                  {commercialRegisterDoc && <p className="text-xs text-green-600">✓ تم رفع الملف</p>}
                </div>
                <div className="space-y-2">
                  <Label>إرفاق شهادة ضريبة القيمة المضافة *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setVatCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="شهادة الضريبة"
                    description="ارفع شهادة ضريبة القيمة المضافة"
                  />
                  {vatCertificateDoc && <p className="text-xs text-green-600">✓ تم رفع الملف</p>}
                </div>
                <div className="space-y-2">
                  <Label>العنوان الوطني *</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setNationalAddressDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="العنوان الوطني"
                    description="ارفع صورة العنوان الوطني"
                  />
                  {nationalAddressDoc && <p className="text-xs text-green-600">✓ تم رفع الملف</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* زر الإرسال */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || registerMutation.isPending}
              className="px-12 py-6 text-lg gap-2"
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
