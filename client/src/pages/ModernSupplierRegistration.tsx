import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Truck,
  Info,
  ShieldCheck,
  Check,
  Building,
  User,
  Mail,
  RotateCcw
} from "lucide-react";

// مجالات العمل المتاحة - مطابقة تماماً للمخطط
export type WorkFieldType = "construction" | "engineering_consulting" | "electrical" | "plumbing" | "hvac" | 
  "finishing" | "carpentry" | "aluminum" | "painting" | "flooring" | "landscaping" | "cleaning" | 
  "maintenance" | "security_systems" | "sound_systems" | "solar_energy" | "water_systems" | 
  "furniture" | "carpets" | "supplies" | "other";

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

export default function ModernSupplierRegistration() {
  const [isSuccess, setIsSuccess] = useState(false);

  // جلب إعدادات الهوية والشعار
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const orgName = orgSettings?.organizationName || "بوابة منارة";

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
  const [otherWorkField, setOtherWorkField] = useState("");

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
      let errorMessage = error.message || "حدث خطأ في التسجيل";
      if (errorMessage.length > 200 || errorMessage.includes("data:") || /[A-Za-z0-9+/=]{100,}/.test(errorMessage)) {
        errorMessage = "حدث خطأ في التسجيل. يرجى التحقق من البيانات والمحاولة مرة أخرى";
      }
      toast.error(errorMessage);
      setIsSubmitting(false);
    },
  });

  // التحقق من صحة النموذج - نفس القواعد الدقيقة
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
    if (workFields.includes("other") && !otherWorkField.trim()) {
      toast.error("يرجى كتابة وتحديد مجال العمل الآخر");
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
    
    let totalPayloadSize = (commercialRegisterDoc.length + vatCertificateDoc.length + nationalAddressDoc.length + bankCertificateDoc.length);
    otherAttachments.forEach(attr => {
      totalPayloadSize += attr.fileData.length;
    });

    const totalPayloadMB = (totalPayloadSize * 3 / 4) / (1024 * 1024);
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
      otherWorkField: workFields.includes("other") ? otherWorkField.trim() : undefined,
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
        <Card className="w-full max-w-lg border border-slate-200/90 shadow-2xl rounded-3xl overflow-hidden bg-white">
          <div className="h-3 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 w-full" />
          <CardContent className="pt-8 pb-8 px-6 sm:px-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200/80 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 mb-3 px-3.5 py-1 text-xs font-semibold rounded-full">
              طلب قيد المراجعة
            </Badge>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              تم استلام طلب التسجيل بنجاح
            </h2>
            
            <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl mb-6 text-center space-y-1.5">
              <p className="text-emerald-950 font-semibold text-sm sm:text-base leading-relaxed">
                تم استلام بيانات منشأتكم ومرفقاتكم بنجاح.
              </p>
              <p className="text-emerald-900/90 text-xs sm:text-sm leading-relaxed">
                طلبكم حالياً قيد المراجعة والتدقيق من قِبل إدارة {orgName}.
              </p>
            </div>

            <div className="pt-2">
              <Link href="/">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md cursor-pointer">
                  العودة إلى الصفحة الرئيسية
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== الصفحة الرئيسية (نموذج مباشر بسيط وعصري) ====================
  return (
    <div className="min-h-screen bg-slate-50/70 py-6 sm:py-10" dir="rtl">
      <div className="container max-w-4xl mx-auto px-3 sm:px-6">
        
        {/* الترويسة والشعار العصرية */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="shrink-0 h-10 w-10 rounded-xl hover:bg-slate-100 border-slate-200 cursor-pointer text-slate-700"
                title="العودة للصفحة الرئيسية"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <img
              src={orgSettings?.logoUrl || "/logo.svg"}
              alt={`شعار ${orgName}`}
              className="h-11 sm:h-12 w-auto object-contain shrink-0"
            />
            <div className="text-right min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                  تسجيل مورد جديد
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                  بوابة الموردين
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                انضمام إلى قائمة الموردين والمقاولين المعتمدين لدى {orgName}
              </p>
            </div>
          </div>

          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer self-end sm:self-center">
              العودة للرئيسية ←
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          
          {/* ═══════════════ قسم 1: معلومات الكيان ═══════════════ */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-sm">
            {/* عنوان القسم */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-l from-emerald-50/40 to-white flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">معلومات الكيان</h2>
                <p className="text-xs text-slate-500">البيانات الأساسية للتعريف بالمنشأة المتقدمة ونشاطها</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="entityName" className="text-xs sm:text-sm font-semibold text-slate-800">
                    اسم الكيان *
                  </Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="اسم الشركة أو المؤسسة"
                    className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entityType" className="text-xs sm:text-sm font-semibold text-slate-800">
                    نوع الكيان *
                  </Label>
                  <Select
                    value={entityType}
                    onValueChange={(value: "company" | "establishment") => setEntityType(value)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-emerald-500">
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
                <div className="space-y-1.5">
                  <Label htmlFor="commercialRegister" className="text-xs sm:text-sm font-semibold text-slate-800">
                    رقم السجل التجاري *
                  </Label>
                  <Input
                    id="commercialRegister"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    placeholder="أدخل رقم السجل التجاري"
                    className="h-11 rounded-xl border-slate-200 text-sm font-mono text-left focus-visible:ring-emerald-500"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yearsOfExperience" className="text-xs sm:text-sm font-semibold text-slate-800">
                    عدد سنوات الخبرة في النشاط *
                  </Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || 0)}
                    className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="commercialActivity" className="text-xs sm:text-sm font-semibold text-slate-800">
                  النشاط حسب السجل التجاري *
                </Label>
                <Textarea
                  id="commercialActivity"
                  value={commercialActivity}
                  onChange={(e) => setCommercialActivity(e.target.value)}
                  placeholder="أدخل النشاط كما هو مسجل في السجل التجاري"
                  rows={2}
                  className="min-h-[80px] rounded-xl border-slate-200 text-sm focus-visible:ring-emerald-500 resize-y"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-semibold text-slate-800">
                    مجالات العمل التي ينفذها الكيان *
                  </Label>
                  {workFields.length > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      تم تحديد {workFields.length} مجال
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 sm:p-4 border border-slate-200/90 rounded-2xl bg-slate-50/50">
                  {WORK_FIELDS.map((field) => {
                    const isChecked = workFields.includes(field.key);
                    return (
                      <div
                        key={field.key}
                        onClick={() => toggleWorkField(field.key)}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleWorkField(field.key);
                          }
                        }}
                        className={`flex items-center space-x-2 space-x-reverse p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold shadow-2xs ring-1 ring-emerald-500/20"
                            : "bg-white hover:bg-slate-100/70 border-slate-200 text-slate-700"
                        }`}
                      >
                        <Checkbox
                          id={field.key}
                          checked={isChecked}
                          tabIndex={-1}
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded-md pointer-events-none"
                        />
                        <span
                          className="text-xs sm:text-sm leading-tight truncate pr-1 select-none flex-1"
                        >
                          {field.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* حقل تحديد مجال العمل الآخر عند اختيار 'أخرى' */}
                {workFields.includes("other") && (
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label htmlFor="otherWorkField" className="text-xs sm:text-sm font-semibold text-emerald-950">
                      تحديد مجال العمل الآخر *
                    </Label>
                    <Input
                      id="otherWorkField"
                      value={otherWorkField}
                      onChange={(e) => setOtherWorkField(e.target.value)}
                      placeholder="يرجى كتابة وتحديد مجال العمل أو النشاط الآخر..."
                      className="h-11 rounded-xl bg-white border-emerald-200 text-sm focus-visible:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════ قسم 2: معلومات التواصل ═══════════════ */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-sm">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-l from-blue-50/40 to-white flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">معلومات التواصل</h2>
                <p className="text-xs text-slate-500">بيانات الاتصال والموقع الجغرافي للكيان</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs sm:text-sm font-semibold text-slate-800">
                  عنوان الكيان *
                </Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان التفصيلي للمقر"
                  rows={2}
                  className="min-h-[80px] rounded-xl border-slate-200 text-sm focus-visible:ring-blue-500 resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    موقع الكيان على الخريطة *
                  </Label>
                  {googleMapsUrl && (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      ✓ تم تحديد الموقع
                    </span>
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-200">
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
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-slate-800">
                    البريد الإلكتروني *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="h-11 rounded-xl border-slate-200 text-sm text-left focus-visible:ring-blue-500"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-slate-800">
                    رقم التواصل *
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="h-11 rounded-xl border-slate-200 text-sm font-mono text-left focus-visible:ring-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneSecondary" className="text-xs sm:text-sm font-semibold text-slate-800">
                  رقم تواصل آخر
                </Label>
                <Input
                  id="phoneSecondary"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  placeholder="رقم هاتف إضافي (اختياري)"
                  className="h-11 rounded-xl border-slate-200 text-sm font-mono text-left focus-visible:ring-blue-500"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson" className="text-xs sm:text-sm font-semibold text-slate-800">
                    اسم مسؤول التواصل *
                  </Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="اسم الشخص المسؤول"
                    className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPersonTitle" className="text-xs sm:text-sm font-semibold text-slate-800">
                    وظيفته في الكيان *
                  </Label>
                  <Input
                    id="contactPersonTitle"
                    value={contactPersonTitle}
                    onChange={(e) => setContactPersonTitle(e.target.value)}
                    placeholder="المسمى الوظيفي"
                    className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ قسم 3: معلومات الحساب البنكي ═══════════════ */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-sm">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-l from-purple-50/40 to-white flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">معلومات الحساب البنكي</h2>
                <p className="text-xs text-slate-500">البيانات المالية الخاصة بالتحويلات وصرف المستحقات</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bankAccountName" className="text-xs sm:text-sm font-semibold text-slate-800">
                    اسم الحساب *
                  </Label>
                  <Input
                    id="bankAccountName"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="اسم صاحب الحساب (مطابق للرسمي)"
                    className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-xs sm:text-sm font-semibold text-slate-800">
                    اسم البنك *
                  </Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-purple-500">
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="iban" className="text-xs sm:text-sm font-semibold text-slate-800">
                      رقم الآيبان (IBAN) *
                    </Label>
                    {iban.match(/^SA\d{22}$/) && (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> صيغة صحيحة
                      </span>
                    )}
                  </div>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="SA0000000000000000000000"
                    className="h-11 rounded-xl border-slate-200 text-sm font-mono text-left tracking-wide focus-visible:ring-purple-500"
                    dir="ltr"
                    maxLength={24}
                  />
                  <p className="text-[11px] text-slate-500">يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taxNumber" className="text-xs sm:text-sm font-semibold text-slate-800">
                    الرقم الضريبي *
                  </Label>
                  <Input
                    id="taxNumber"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="أدخل الرقم الضريبي (15 رقماً)"
                    className="h-11 rounded-xl border-slate-200 text-sm font-mono text-left focus-visible:ring-purple-500"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ قسم 4: المرفقات الرسمية ═══════════════ */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-sm">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-l from-amber-50/40 to-white flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">المرفقات الرسمية</h2>
                <p className="text-xs text-slate-500">
                  المستندات الرسمية الداعمة لطلب التسجيل (سارية المفعول - الحد الأقصى لكل ملف 10 ميجابايت)
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* بطاقات الرفع الأربعة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border transition-all min-w-0 overflow-hidden ${commercialRegisterDoc ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200/90 bg-slate-50/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs sm:text-sm font-bold text-slate-800">السجل التجاري *</Label>
                    {commercialRegisterDoc && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">✓ مرفق</span>
                    )}
                  </div>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setCommercialRegisterDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="السجل التجاري"
                    description="ارفع صورة السجل التجاري (PDF أو صورة)"
                  />
                </div>

                <div className={`p-4 rounded-2xl border transition-all min-w-0 overflow-hidden ${vatCertificateDoc ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200/90 bg-slate-50/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs sm:text-sm font-bold text-slate-800">شهادة الضريبة *</Label>
                    {vatCertificateDoc && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">✓ مرفق</span>
                    )}
                  </div>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setVatCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="شهادة الضريبة"
                    description="ارفع شهادة ضريبة القيمة المضافة (PDF أو صورة)"
                  />
                </div>

                <div className={`p-4 rounded-2xl border transition-all min-w-0 overflow-hidden ${nationalAddressDoc ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200/90 bg-slate-50/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs sm:text-sm font-bold text-slate-800">العنوان الوطني *</Label>
                    {nationalAddressDoc && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">✓ مرفق</span>
                    )}
                  </div>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setNationalAddressDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="العنوان الوطني"
                    description="ارفع صورة العنوان الوطني (PDF أو صورة)"
                  />
                </div>

                <div className={`p-4 rounded-2xl border transition-all min-w-0 overflow-hidden ${bankCertificateDoc ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200/90 bg-slate-50/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs sm:text-sm font-bold text-slate-800">الشهادة البنكية *</Label>
                    {bankCertificateDoc && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">✓ مرفق</span>
                    )}
                  </div>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setBankCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="الشهادة البنكية"
                    description="ارفع صورة الشهادة البنكية (PDF أو صورة)"
                  />
                </div>
              </div>

              {/* المرفقات الإضافية */}
              <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <Label className="text-sm sm:text-base font-bold text-slate-900">مرفقات أخرى (اختياري)</Label>
                    <p className="text-xs text-slate-500 mt-0.5">يمكنك إضافة أي مستندات إضافية تدعم طلبك</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOtherAttachments([...otherAttachments, { name: "", fileData: "" }])}
                    className="self-start sm:self-center h-9 rounded-xl border-slate-200 text-xs font-semibold gap-1.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة مرفق آخر
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {otherAttachments.map((attr, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 items-start sm:items-center">
                      <div className="md:col-span-5 space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">اسم المرفق</Label>
                        <Input
                          value={attr.name}
                          onChange={(e) => {
                            const newAttrs = [...otherAttachments];
                            newAttrs[index].name = e.target.value;
                            setOtherAttachments(newAttrs);
                          }}
                          placeholder="مثال: شهادة تصنيف، سيرة ذاتية..."
                          className="h-10 rounded-xl border-slate-200 text-xs focus-visible:ring-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-6 space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">الملف</Label>
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
                        {attr.fileData && <p className="text-[10px] text-emerald-600 font-medium">✓ تم رفع الملف</p>}
                      </div>
                      <div className="md:col-span-1 flex justify-end sm:justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 rounded-xl"
                          onClick={() => setOtherAttachments(otherAttachments.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {otherAttachments.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                      <FileText className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-400">لا توجد مرفقات إضافية حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ زر الإرسال ═══════════════ */}
          <div className="flex justify-center pt-2 pb-8">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || registerMutation.isPending}
              className="w-full sm:w-auto min-w-[260px] px-10 py-6 text-base font-bold gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer transition-all hover:scale-[1.01]"
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
