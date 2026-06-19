import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Save,
  Check,
  Download,
  Eye
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

export default function EditSupplier() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const supplierId = params.id ? Number(params.id) : NaN;

  // جلب بيانات المورد بالتفصيل
  const { data: supplier, isLoading, isError, refetch } = trpc.suppliers.getById.useQuery(
    { id: supplierId },
    { enabled: !isNaN(supplierId) }
  );

  // جلب البنوك ديناميكياً من قاعدة البيانات
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const banks = allCategories
    .filter((cat: any) => cat.type === "bank")
    .map((cat: any) => cat.nameAr || cat.name);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ data: string; title: string } | null>(null);

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

  // مساعدات الفك والتحليل لمجالات العمل
  const getWorkFieldsArray = (wFields: any): string[] => {
    if (!wFields) return [];
    if (Array.isArray(wFields)) return wFields;
    if (typeof wFields === "string") {
      try {
        if (wFields.startsWith("[") && wFields.endsWith("]")) {
          return JSON.parse(wFields);
        }
        if (wFields.includes(",")) {
          return wFields.split(",").map(s => s.trim());
        }
        return [wFields];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // مساعد لفك وتحليل المرفقات الإضافية بشكل آمن
  const getOtherAttachmentsArray = (attachments: any): { name: string; fileData: string }[] => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === "string") {
      try {
        const parsed = JSON.parse(attachments);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // تعبئة البيانات بعد جلبها بنجاح
  useEffect(() => {
    if (supplier && !hasInitialized) {
      setEntityName(supplier.name || "");
      setEntityType((supplier.entityType as any) || "establishment");
      setCommercialRegister(supplier.commercialRegister || "");
      setCommercialActivity(supplier.commercialActivity || "");
      setYearsOfExperience(Number(supplier.yearsOfExperience) || 0);
      setWorkFields(getWorkFieldsArray(supplier.workFields) as WorkFieldType[]);

      setAddress(supplier.address || "");
      setGoogleMapsUrl(supplier.googleMapsUrl || "");
      setEmail(supplier.email || "");
      setPhone(supplier.phone || "");
      setPhoneSecondary(supplier.phoneSecondary || "");
      setContactPerson(supplier.contactPerson || "");
      setContactPersonTitle(supplier.contactPersonTitle || "");

      setBankAccountName(supplier.bankAccountName || "");
      setBankName(supplier.bankName || "");
      setIban(supplier.iban || "");
      setTaxNumber(supplier.taxNumber || "");

      setCommercialRegisterDoc(supplier.commercialRegisterDoc || "");
      setVatCertificateDoc(supplier.vatCertificateDoc || "");
      setNationalAddressDoc(supplier.nationalAddressDoc || "");
      setBankCertificateDoc(supplier.bankCertificateDoc || "");
      setOtherAttachments(
        getOtherAttachmentsArray(supplier.otherAttachments)
      );
      setHasInitialized(true);
    }
  }, [supplier, hasInitialized]);

  // Mutation لتعديل المورد
  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المورد بنجاح");
      navigate("/suppliers");
    },
    onError: (error) => {
      let errorMessage = error.message || "حدث خطأ أثناء التحديث";
      if (errorMessage.length > 200 || errorMessage.includes("data:") || /[A-Za-z0-9+/=]{100,}/.test(errorMessage)) {
        errorMessage = "حدث خطأ في تحديث البيانات. يرجى التحقق من حجم المرفقات.";
      }
      toast.error(errorMessage);
      setIsSubmitting(false);
    },
  });

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    if (!entityName || !commercialRegister || !commercialActivity) {
      toast.error("يرجى ملء جميع حقول معلومات الكيان المطلوبة");
      return false;
    }
    if (workFields.length === 0) {
      toast.error("يرجى اختيار مجال عمل واحد على الأقل");
      return false;
    }
    if (!address || !email || !phone || !contactPerson || !contactPersonTitle) {
      toast.error("يرجى ملء جميع حقول معلومات التواصل المطلوبة");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("البريد الإلكتروني غير صحيح");
      return false;
    }
    if (!bankAccountName || !bankName || !iban || !taxNumber) {
      toast.error("يرجى ملء جميع حقول معلومات الحساب البنكي المطلوبة");
      return false;
    }
    if (!iban.match(/^SA\d{22}$/)) {
      toast.error("رقم الآيبان غير صحيح (يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم)");
      return false;
    }
    return true;
  };

  // إرسال النموذج للتحديث
  const handleSubmit = async () => {
    if (!validateForm()) return;

    let totalPayloadSize = (commercialRegisterDoc?.length || 0) + (vatCertificateDoc?.length || 0) + (nationalAddressDoc?.length || 0) + (bankCertificateDoc?.length || 0);
    otherAttachments.forEach(attr => {
      totalPayloadSize += attr.fileData?.length || 0;
    });

    const totalPayloadMB = (totalPayloadSize * 3 / 4) / (1024 * 1024);
    if (totalPayloadMB > 45) {
      toast.error(`حجم المرفقات الإجمالي كبير جداً (${totalPayloadMB.toFixed(1)} ميجابايت). يرجى تقليل أحجام الملفات.`);
      return;
    }

    setIsSubmitting(true);
    updateMutation.mutate({
      id: supplierId,
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
      phoneSecondary: phoneSecondary || undefined,
      contactPerson,
      contactPersonTitle,
      bankAccountName,
      bankName,
      iban,
      taxNumber,
      commercialRegisterDoc: commercialRegisterDoc || undefined,
      vatCertificateDoc: vatCertificateDoc || undefined,
      nationalAddressDoc: nationalAddressDoc || undefined,
      bankCertificateDoc: bankCertificateDoc || undefined,
      otherAttachments: otherAttachments,
    });
  };

  // تفعيل/إلغاء تفعيل مجال عمل
  const toggleWorkField = (field: WorkFieldType) => {
    setWorkFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  // كشف عن نوع الملف للمعاينة
  const getMimeTypeFromBase64 = (base64: string): string => {
    if (base64.startsWith("JVBERi")) return "application/pdf";
    if (base64.startsWith("iVBORw")) return "image/png";
    if (base64.startsWith("/9j/") || base64.startsWith("/9j/4")) return "image/jpeg";
    if (base64.startsWith("UklGR")) return "image/webp";
    if (base64.startsWith("R0lG")) return "image/gif";
    return "";
  };

  const handleViewAttachment = (base64Data: string, title: string) => {
    if (!base64Data) return;
    if (base64Data.startsWith("http://") || base64Data.startsWith("https://") || base64Data.startsWith("/")) {
      window.open(base64Data, "_blank");
      return;
    }

    let fullData = base64Data;
    if (!base64Data.startsWith("data:")) {
      const mimeType = getMimeTypeFromBase64(base64Data);
      if (mimeType) {
        fullData = `data:${mimeType};base64,${base64Data}`;
      } else {
        fullData = `data:image/webp;base64,${base64Data}`;
      }
    }
    setPreviewDoc({ data: fullData, title });
  };

  const handleDownloadPreview = () => {
    if (!previewDoc) return;
    try {
      const parts = previewDoc.data.split(";base64,");
      const contentType = parts[0].split(":")[1] || "application/octet-stream";
      const mimeSubtype = contentType.split("/")[1] || "bin";
      const ext = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype;
      
      const link = document.createElement("a");
      link.href = previewDoc.data;
      link.download = `${previewDoc.title}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("تم تحميل الملف بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل الملف");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">جاري تحميل بيانات المورد...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !supplier) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
          <Trash2 className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold mb-1">المورد غير موجود أو حدث خطأ أثناء التحميل</h2>
          <Button onClick={() => navigate("/suppliers")} className="gap-2 mt-4" variant="outline">
            <ArrowRight className="h-4 w-4" />
            العودة لقائمة الموردين
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 text-right" dir="rtl">
        {/* شريط المسار والرجوع */}
        <div className="flex items-center gap-4 border-b pb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")} className="shrink-0">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              تعديل بيانات المورد: {supplier.name}
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5">تحديث معلومات المنشأة وتفاصيل الاتصال والبيانات المالية والمرفقات</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* قسم معلومات الكيان */}
          <Card className="border shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-teal-600 to-teal-700 text-white p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-5 w-5" />
                معلومات الكيان
              </CardTitle>
              <CardDescription className="text-teal-100 text-xs">
                البيانات الأساسية للمورد ومجال العمل المعتمد
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entityName" className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم الكيان *</Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="اسم الشركة أو المؤسسة"
                    className="h-10 text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityType" className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع الكيان *</Label>
                  <Select
                    value={entityType}
                    onValueChange={(value: "company" | "establishment") => setEntityType(value)}
                  >
                    <SelectTrigger className="h-10 text-right">
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
                  <Label htmlFor="commercialRegister" className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم السجل التجاري *</Label>
                  <Input
                    id="commercialRegister"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    placeholder="أدخل رقم السجل التجاري"
                    className="h-10 text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience" className="text-xs font-bold text-slate-700 dark:text-slate-300">عدد سنوات الخبرة في النشاط *</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || 0)}
                    className="h-10 text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercialActivity" className="text-xs font-bold text-slate-700 dark:text-slate-300">النشاط حسب السجل التجاري *</Label>
                <Textarea
                  id="commercialActivity"
                  value={commercialActivity}
                  onChange={(e) => setCommercialActivity(e.target.value)}
                  placeholder="أدخل النشاط كما هو مسجل في السجل التجاري"
                  rows={2}
                  className="min-h-[80px] text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">مجالات العمل التي ينفذها الكيان *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 border rounded-lg bg-gray-50/50">
                  {WORK_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`field-${field.key}`}
                        checked={workFields.includes(field.key)}
                        onCheckedChange={() => toggleWorkField(field.key)}
                      />
                      <Label htmlFor={`field-${field.key}`} className="text-xs cursor-pointer leading-tight font-medium">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم معلومات التواصل */}
          <Card className="border shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Phone className="h-5 w-5" />
                معلومات التواصل ومسؤول الاتصال
              </CardTitle>
              <CardDescription className="text-blue-100 text-xs">
                وسائل التواصل الجغرافية والإلكترونية مع المنشأة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-slate-300">عنوان الكيان *</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان التفصيلي"
                  rows={2}
                  className="min-h-[80px] text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">موقع الكيان على الخريطة</Label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="h-10 text-left font-mono"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم الجوال *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="h-10 text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneSecondary" className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم تواصل آخر (اختياري)</Label>
                <Input
                  id="phoneSecondary"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  placeholder="أدخل رقم هاتف إضافي إن وجد"
                  className="h-10 text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم مسؤول التواصل *</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="اسم الشخص المسؤول"
                    className="h-10 text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPersonTitle" className="text-xs font-bold text-slate-700 dark:text-slate-300">وظيفته في الكيان *</Label>
                  <Input
                    id="contactPersonTitle"
                    value={contactPersonTitle}
                    onChange={(e) => setContactPersonTitle(e.target.value)}
                    placeholder="المسمى الوظيفي"
                    className="h-10 text-right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم معلومات الحساب البنكي */}
          <Card className="border shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-purple-600 to-purple-700 text-white p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-5 w-5" />
                معلومات الحساب البنكي والضرائب
              </CardTitle>
              <CardDescription className="text-purple-100 text-xs">
                البيانات المالية والتحويلات للجهة الموردة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName" className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم الحساب البنكي المعتمد *</Label>
                  <Input
                    id="bankAccountName"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="اسم صاحب الحساب كما بالشهادة البنكية"
                    className="h-10 text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-xs font-bold text-slate-700 dark:text-slate-300">البنك المعتمد *</Label>
                  <Select value={bankName || undefined} onValueChange={setBankName}>
                    <SelectTrigger className="h-10 text-right">
                      <SelectValue placeholder="اختر البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks?.map((bank: string) => (
                        <SelectItem key={bank} value={bank} className="text-right">
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban" className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم الآيبان (IBAN) *</Label>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="SA0000000000000000000000"
                    className="h-10 text-left font-mono"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-muted-foreground">يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber" className="text-xs font-bold text-slate-700 dark:text-slate-300">الرقم الضريبي (VAT) *</Label>
                  <Input
                    id="taxNumber"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="أدخل الرقم الضريبي المعتمد"
                    className="h-10 text-right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قسم المرفقات */}
          <Card className="border shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-orange-600 to-orange-700 text-white p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-5 w-5" />
                المستندات والمرفقات الرسمية
              </CardTitle>
              <CardDescription className="text-orange-100 text-xs">
                المستندات الداعمة والتراخيص الرسمية للمنشأة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* السجل التجاري */}
                <div className="space-y-2 p-3 border rounded-xl bg-slate-50/50">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">إرفاق السجل التجاري</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setCommercialRegisterDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="السجل التجاري"
                    description="ارفع صورة جديدة للسجل التجاري لتحديثه"
                  />
                  {commercialRegisterDoc && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        السجل التجاري مرفوع
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary gap-1"
                        onClick={() => handleViewAttachment(commercialRegisterDoc, "السجل التجاري")}
                      >
                        <Eye className="h-3 w-3" />
                        معاينة الحالي
                      </Button>
                    </div>
                  )}
                </div>

                {/* شهادة الضريبة */}
                <div className="space-y-2 p-3 border rounded-xl bg-slate-50/50">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">إرفاق شهادة الضريبة</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setVatCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="شهادة الضريبة"
                    description="ارفع صورة شهادة ضريبة القيمة المضافة"
                  />
                  {vatCertificateDoc && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        شهادة الضريبة مرفوعة
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary gap-1"
                        onClick={() => handleViewAttachment(vatCertificateDoc, "شهادة الضريبة")}
                      >
                        <Eye className="h-3 w-3" />
                        معاينة الحالي
                      </Button>
                    </div>
                  )}
                </div>

                {/* العنوان الوطني */}
                <div className="space-y-2 p-3 border rounded-xl bg-slate-50/50">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">العنوان الوطني</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setNationalAddressDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="العنوان الوطني"
                    description="ارفع صورة إثبات العنوان الوطني للمقر"
                  />
                  {nationalAddressDoc && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        العنوان الوطني مرفوع
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary gap-1"
                        onClick={() => handleViewAttachment(nationalAddressDoc, "العنوان الوطني")}
                      >
                        <Eye className="h-3 w-3" />
                        معاينة الحالي
                      </Button>
                    </div>
                  )}
                </div>

                {/* الشهادة البنكية */}
                <div className="space-y-2 p-3 border rounded-xl bg-slate-50/50">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">الشهادة البنكية</Label>
                  <FileUpload
                    onFilesSelected={(files) => {
                      if (files.length > 0) {
                        setBankCertificateDoc(files[0].fileData);
                      }
                    }}
                    maxFiles={1}
                    label="الشهادة البنكية"
                    description="ارفع صورة الشهادة البنكية أو خطاب الآيبان"
                  />
                  {bankCertificateDoc && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        الشهادة البنكية مرفوعة
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary gap-1"
                        onClick={() => handleViewAttachment(bankCertificateDoc, "الشهادة البنكية")}
                      >
                        <Eye className="h-3 w-3" />
                        معاينة الحالي
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* المرفقات الإضافية */}
              <div className="pt-5 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">مرفقات إضافية أخرى (اختياري)</Label>
                    <p className="text-xs text-muted-foreground">تعديل أو حذف أو إضافة مستندات أخرى مساندة</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOtherAttachments([...otherAttachments, { name: "", fileData: "" }])}
                    className="h-8 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة ملف إضافي
                  </Button>
                </div>

                <div className="space-y-3">
                  {otherAttachments.map((attr, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-xl bg-slate-50/30 items-center">
                      <div className="md:col-span-5 space-y-1 text-right">
                        <Label className="text-[11px] font-bold text-slate-500">اسم المستند</Label>
                        <Input
                          value={attr.name}
                          onChange={(e) => {
                            const newAttrs = [...otherAttachments];
                            newAttrs[index].name = e.target.value;
                            setOtherAttachments(newAttrs);
                          }}
                          placeholder="مثال: شهادة تصنيف، رخصة بلدية..."
                          className="h-9 text-right"
                        />
                      </div>
                      <div className="md:col-span-6 space-y-1 text-right">
                        <Label className="text-[11px] font-bold text-slate-500">الملف</Label>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
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
                          </div>
                          {attr.fileData && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => handleViewAttachment(attr.fileData, attr.name || `مرفق إضافي ${index + 1}`)}
                              title="معاينة الملف"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                          onClick={() => setOtherAttachments(otherAttachments.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {otherAttachments.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl bg-slate-50/30">
                      <FileText className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-muted-foreground">لا توجد مرفقات إضافية حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* أزرار التحكم في الحفظ */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/suppliers")}
              disabled={isSubmitting}
              className="h-10 px-6 font-medium"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || updateMutation.isPending}
              className="gradient-primary text-white font-bold h-10 px-8 gap-2 shadow-md"
            >
              {isSubmitting || updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* نافذة معاينة المستند */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-4 rounded-xl" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2 shrink-0">
            <div>
              <DialogTitle className="text-right font-bold text-slate-800 dark:text-slate-200">
                معاينة: {previewDoc?.title}
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPreview}
              className="gap-1.5 h-8 text-xs font-semibold self-center"
            >
              <Download className="h-3.5 w-3.5" />
              تحميل الملف
            </Button>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center p-2 mt-2 border">
            {previewDoc && (
              previewDoc.data.includes("application/pdf") ? (
                <iframe
                  src={previewDoc.data}
                  title={previewDoc.title}
                  className="w-full h-full rounded border-0"
                />
              ) : (
                <img
                  src={previewDoc.data}
                  alt={previewDoc.title}
                  className="max-w-full max-h-full object-contain rounded"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
