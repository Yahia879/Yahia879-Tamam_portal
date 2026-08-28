import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  UserCheck, 
  Volume2, 
  HeartHandshake, 
  HelpCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Upload, 
  FileText, 
  LandPlot, 
  Package, 
  CreditCard, 
  Sparkles,
  Info,
  ChevronLeft,
  User,
  Lock,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Send,
  Truck,
  Download
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

// أنواع علاقة المستخدم بالمسجد
type PrimaryRole = "imam" | "muezzin" | "donor" | "other" | "";

// أنواع التبرع
type DonorType = "land" | "in_kind" | "financial" | "other" | "";

function formatErrorMessage(message: string): string {
  try {
    if (message.startsWith('[') && message.endsWith(']')) {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((err: any) => err.message || "خطأ في المدخلات").join(" \n");
      }
    }
  } catch (e) {
    // ignore
  }
  return message;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { isAuthenticated, user, loading } = useAuth();

  // الخطوة الحالية
  const [selectedRole, setSelectedRole] = useState<PrimaryRole>("");
  const [donorType, setDonorType] = useState<DonorType>("");
  
  // حالات النموذج
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // إشعار التحويل البنكي الاختياري
  const [showTransferProofSection, setShowTransferProofSection] = useState(false);

  // جلب إعدادات الجمعية لعرض الشعار والألوان والبيانات البنكية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // جلب المدن
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const dynamicCities = allCategories
    .filter((cat: any) => cat.type === "city" && cat.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // بيانات النموذج الموحدة
  const [formData, setFormData] = useState({
    // أساسية مشتركة
    name: "",
    email: "",
    phone: "",
    city: "",
    
    // مسار الإمام والمؤذن
    nationalId: "",
    password: "",
    confirmPassword: "",
    proofFile: null as File | null,

    // مسار المتبرع بأرض
    landDetails: "",
    landArea: "",
    landDimensions: "",
    landLocation: "",
    landOwner: "",
    landProofFile: null as File | null,

    // مسار المتبرع العيني
    inKindItemType: "",
    inKindQuantity: "",
    inKindCondition: "",
    inKindLocation: "",
    inKindDetails: "",
    inKindDeliveryAvailable: false,
    inKindFile: null as File | null,

    // مسار المتبرع المالي (إشعار التحويل)
    financialAmount: "",
    financialBankName: "",
    transferReceiptFile: null as File | null,

    // مسار متبرع أخرى
    donorOtherDetails: "",

    // مسار أخرى (استفسار / جماعة المسجد / جهة)
    customRoleTitle: "",
    requestDetails: "",
    otherFile: null as File | null,
  });

  // قراءة المعاملات من الرابط إن وجدت (مثل ?role=imam أو ?role=donor)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roleParam = searchParams.get("role") as PrimaryRole;
    const donorTypeParam = searchParams.get("donorType") as DonorType;

    if (roleParam && ["imam", "muezzin", "donor", "other"].includes(roleParam)) {
      setSelectedRole(roleParam);
    }
    if (donorTypeParam && ["land", "in_kind", "financial", "other"].includes(donorTypeParam)) {
      setDonorType(donorTypeParam);
    }
  }, []);

  // إعادة توجيه المستخدم إذا كان مسجلاً للدخول بالفعل
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const path = user?.role === "service_requester" ? "/requester" : "/dashboard";
      setLocation(path, { replace: true });
    }
  }, [isAuthenticated, loading, user, setLocation]);

  // طفرة تسجيل الإمام أو المؤذن (إنشاء حساب مستخدم رسمي)
  const registerImamMuezzinMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("شكراً لكم، تم استلام بياناتكم بنجاح، وسيقوم فريق الجمعية بالتواصل معكم عند الحاجة لاستكمال المعلومات أو متابعة الطلب.");
      setIsSuccess(true);
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error.message) || "حدث خطأ في التسجيل");
    },
  });

  // طفرة إرسال طلب التبرع أو الاستفسار العام (دون حساب)
  const submitPublicRequestMutation = trpc.publicSubmissions.submit.useMutation({
    onSuccess: () => {
      toast.success("شكراً لكم، تم استلام بياناتكم بنجاح، وسيقوم فريق الجمعية بالتواصل معكم عند الحاجة لاستكمال المعلومات أو متابعة الطلب.");
      setIsSuccess(true);
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error.message) || "حدث خطأ في إرسال الطلب");
    },
  });

  const handleChange = (field: string, value: any) => {
    if (field === "nationalId" || field === "financialAmount") {
      const numericValue = typeof value === "string" ? value.replace(/[^0-9.]/g, "") : value;
      setFormData((prev) => ({ ...prev, [field]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleFileUpload = (field: string, file: File | null) => {
    if (file && file.size > 15 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى هو 15 ميجابايت.");
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`تم نسخ ${fieldName} بنجاح`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // معالجة إرسال الملف إلى الخادم
  const uploadFile = async (file: File): Promise<string | undefined> => {
    const formDataForUpload = new FormData();
    formDataForUpload.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formDataForUpload,
    });

    if (!response.ok) {
      throw new Error("فشل رفع الملف");
    }

    const data = await response.json();
    return data.url;
  };

  // معالجة الإرسال العام
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الاسم
    const trimmedName = formData.name.trim();
    if (trimmedName.length < 2) {
      toast.error("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    // التحقق من رقم الجوال
    if (!/^05[0-9]{8}$/.test(formData.phone.trim())) {
      toast.error("رقم الجوال يجب أن يكون بصيغة 05XXXXXXXX (10 أرقام)");
      return;
    }

    // 1. مسار الإمام أو المؤذن (إنشاء حساب مستخدم دائم)
    if (selectedRole === "imam" || selectedRole === "muezzin") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error("البريد الإلكتروني غير صالح");
        return;
      }
      if (formData.password.length < 8) {
        toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("كلمة المرور وتأكيد كلمة المرور غير متطابقين");
        return;
      }
      if (!formData.proofFile) {
        toast.error("يجب رفع مرفق يثبت الصفة الرسمية من وزارة الشؤون الإسلامية");
        return;
      }

      setIsSubmitting(true);
      try {
        // التحقق من توفر البريد والجوال أولاً
        const availability = await utils.client.auth.checkCredentialsAvailable.query({
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        });

        if (!availability.available) {
          if (availability.reason === "email") toast.error("البريد الإلكتروني مسجل مسبقاً");
          else if (availability.reason === "phone") toast.error("رقم الجوال مسجل مسبقاً");
          setIsSubmitting(false);
          return;
        }

        // رفع ملف الإثبات
        const proofUrl = await uploadFile(formData.proofFile);

        // إنشاء المستخدم
        await registerImamMuezzinMutation.mutateAsync({
          name: trimmedName,
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          nationalId: formData.nationalId || undefined,
          city: formData.city || undefined,
          requesterType: selectedRole,
          proofDocument: proofUrl,
        });
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء إنشاء الحساب");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. مسار المتبرع بأرض
    if (selectedRole === "donor" && donorType === "land") {
      if (!trimmedName || !formData.phone.trim() || !formData.email.trim() || !formData.customRoleTitle.trim() || !formData.landArea.trim() || !formData.landDimensions.trim() || !formData.landLocation.trim() || !formData.landOwner.trim() || !formData.landDetails.trim()) {
        toast.error("يرجى تعبئة كافة الحقول المطلوبة لبيانات التبرع بالأرض");
        return;
      }

      setIsSubmitting(true);
      try {
        const combinedDetails = [
          formData.customRoleTitle ? `الصفة أو العلاقة بالمسجد: ${formData.customRoleTitle}` : "",
          `مساحة الأرض: ${formData.landArea}`,
          `الأبعاد والأطوال: ${formData.landDimensions}`,
          `الموقع والحي: ${formData.landLocation}`,
          `المالك الحالي: ${formData.landOwner}`,
          `معلومات وملاحظات إضافية: ${formData.landDetails}`,
        ].filter(Boolean).join("\n");

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_land",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          customRoleTitle: formData.customRoleTitle.trim(),
          details: combinedDetails,
          landArea: formData.landArea,
          landLocation: formData.landLocation,
          landOwner: formData.landOwner,
        });
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء إرسال بيانات التبرع بالأرض");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 3. مسار المتبرع بتبرع عيني
    if (selectedRole === "donor" && donorType === "in_kind") {
      if (!trimmedName || !formData.phone.trim() || !formData.email.trim() || !formData.customRoleTitle.trim() || !formData.inKindItemType.trim() || !formData.inKindQuantity.trim() || !formData.inKindCondition.trim() || !formData.inKindLocation.trim()) {
        toast.error("يرجى تعبئة كافة الحقول المطلوبة لبيانات التبرع العيني");
        return;
      }

      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        if (formData.inKindFile) {
          attachmentUrl = await uploadFile(formData.inKindFile);
        }

        const combinedDetails = [
          formData.customRoleTitle ? `الصفة أو العلاقة بالمسجد: ${formData.customRoleTitle}` : "",
          formData.inKindItemType ? `نوع التبرع العيني: ${formData.inKindItemType}` : "",
          formData.inKindQuantity ? `الكميات المتاحة: ${formData.inKindQuantity}` : "",
          formData.inKindCondition ? `حالة المواد: ${formData.inKindCondition}` : "",
          formData.inKindLocation ? `موقع المواد / الاستلام: ${formData.inKindLocation}` : "",
          `إمكانية النقل والتسليم: ${formData.inKindDeliveryAvailable ? "نقل وتوصيل متاح من قبل المتبرع" : "يتطلب استلام من الموقع"}`,
          formData.inKindDetails ? `معلومات وملاحظات إضافية: ${formData.inKindDetails}` : "",
        ].filter(Boolean).join("\n");

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_inkind",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          customRoleTitle: formData.customRoleTitle.trim(),
          details: combinedDetails || formData.inKindDetails.trim() || "طلب تبرع عيني",
          inKindDeliveryAvailable: formData.inKindDeliveryAvailable,
          attachmentUrl,
        });
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء إرسال التبرع العيني");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 4. مسار المتبرع المالي (إشعار تحويل اختياري)
    if (selectedRole === "donor" && donorType === "financial") {
      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        if (formData.transferReceiptFile) {
          attachmentUrl = await uploadFile(formData.transferReceiptFile);
        }

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_financial",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          financialAmount: formData.financialAmount ? parseFloat(formData.financialAmount) : undefined,
          financialBankName: formData.financialBankName || undefined,
          details: "إشعار تحويل بنكي / رغبة في التبرع المالي",
          attachmentUrl,
        });
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء إرسال إشعار التحويل");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 5. مسار متبرع - أخرى
    if (selectedRole === "donor" && donorType === "other") {
      if (!formData.email.trim()) {
        toast.error("يرجى إدخال البريد الإلكتروني");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error("البريد الإلكتروني غير صالح");
        return;
      }
      if (!formData.customRoleTitle.trim()) {
        toast.error("يرجى تحديد صفتك أو علاقتك بالمسجد");
        return;
      }
      if (!formData.donorOtherDetails.trim()) {
        toast.error("يرجى كتابة تفاصيل التبرع");
        return;
      }

      setIsSubmitting(true);
      try {
        const combinedDetails = [
          formData.customRoleTitle ? `الصفة / العلاقة بالمسجد: ${formData.customRoleTitle}` : "",
          `تفاصيل التبرع والمقترح: ${formData.donorOtherDetails.trim()}`,
        ].filter(Boolean).join("\n");

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_other",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          customRoleTitle: formData.customRoleTitle.trim(),
          details: combinedDetails,
        });
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء إرسال البيانات");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 6. مسار أخرى (استفسار / جماعة المسجد / جهة)
    if (selectedRole === "other") {
      if (!formData.email.trim()) {
        toast.error("يرجى إدخال البريد الإلكتروني");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error("البريد الإلكتروني غير صالح");
        return;
      }
      if (!formData.customRoleTitle.trim()) {
        toast.error("يرجى تحديد صفتك (مثلاً: جار المسجد، استفسار...)");
        return;
      }
      if (!formData.requestDetails.trim()) {
        toast.error("يرجى كتابة طلبك أو استفسارك بالتفصيل");
        return;
      }

      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        if (formData.otherFile) {
          attachmentUrl = await uploadFile(formData.otherFile);
        }

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "general_inquiry",
          category: "other",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          customRoleTitle: formData.customRoleTitle.trim(),
          details: formData.requestDetails.trim(),
          attachmentUrl,
        });
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء إرسال طلبكم");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
  };

  const primaryColor = orgSettings?.colorPrimary1 || "#0d9488";
  const secondaryColor = orgSettings?.colorPrimary2 || "#0f766e";

  // الحساب الرسمي لجمعية عمارة المساجد منارة
  const rawIban = "SA0580000347608011245554";
  const bankAccountNumber = "347000010006081245554";
  const donationUrl = "https://manarahstore.sa";

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  // ==================== شاشة النجاح الختامية ====================
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-muted/30" dir="rtl">
        <Card className="w-full max-w-lg border-0 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
          <div className="h-3 bg-emerald-600 w-full" />
          <CardContent className="pt-8 pb-8 px-6 sm:px-10 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">تم الاستلام بنجاح!</h2>
            
            <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl mb-6 text-right">
              <p className="text-emerald-950 font-medium text-sm sm:text-base leading-relaxed">
                شكراً لكم، تم استلام بياناتكم بنجاح، وسيقوم فريق الجمعية بالتواصل معكم عند الحاجة لاستكمال المعلومات أو متابعة الطلب.
              </p>
            </div>

            {selectedRole === "imam" || selectedRole === "muezzin" ? (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-right text-xs sm:text-sm text-blue-900 space-y-1">
                <p className="font-semibold text-blue-950 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-700" />
                  ملاحظة بشأن تفعيل الحساب:
                </p>
                <p className="text-blue-800 leading-relaxed">
                  تم إنشاء حسابك وسيتم مراجعة إثبات الصفة من قبل إدارة الجمعية. يمكنك الدخول ومتابعة طلباتك فور الاعتماد.
                </p>
              </div>
            ) : null}

            <div className="space-y-3 pt-2">
              {(selectedRole === "imam" || selectedRole === "muezzin") && (
                <Link href="/login">
                  <Button 
                    className="w-full text-white font-semibold h-11 rounded-xl shadow-md cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    الذهاب لتسجيل الدخول
                  </Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline" className="w-full font-medium h-11 rounded-xl cursor-pointer">
                  العودة للصفحة الرئيسية
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => {
                  setIsSuccess(false);
                  setSelectedRole("");
                  setDonorType("");
                }}
              >
                تقديم طلب أو تبرع آخر
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70 p-3 sm:p-6 md:p-8" dir="rtl">
      <div className="w-full max-w-2xl transition-all duration-300">
        {/* الترويسة والشعار */}
        <Link href="/" className="flex flex-col items-center mb-6 sm:mb-8 text-center group cursor-pointer">
          <img
            src={orgSettings?.logoUrl || "/logo.svg"}
            alt={`شعار ${orgSettings?.organizationName || "بوابة منارة"}`}
            className="h-16 sm:h-20 mb-3 object-contain transition-transform group-hover:scale-105"
          />
          <h1 className="font-bold text-lg sm:text-2xl text-gray-900">
            {orgSettings?.organizationName || "بوابة منارة"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            نموذج التسجيل وتقديم الطلبات والتبرعات
          </p>
        </Link>

        <Card className="border border-slate-200/80 shadow-xl rounded-2xl sm:rounded-3xl bg-white overflow-hidden">
          {/* شريط الإجراء العلوي والرجوع */}
          {selectedRole && (
            <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {selectedRole === "donor" && !donorType
                    ? "الخطوة 2: تحديد نوع التبرع"
                    : selectedRole === "imam" || selectedRole === "muezzin"
                      ? `مسار ${selectedRole === "imam" ? "الإمام" : "المؤذن"} (تسجيل حساب رسمي)`
                      : selectedRole === "donor"
                        ? `مسار المتبرع (${donorType === "land" ? "تبرع بأرض" : donorType === "in_kind" ? "تبرع عيني" : donorType === "financial" ? "تبرع مالي" : "أخرى"})`
                        : "مسار أخرى (استفسارات وطلبات عامة)"
                  }
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (donorType) {
                    setDonorType("");
                  } else {
                    setSelectedRole("");
                  }
                }}
                className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl border-primary/30 bg-white hover:bg-primary/10 hover:border-primary text-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all shrink-0 group"
              >
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
                <span>تغيير الصفة</span>
              </Button>
            </div>
          )}

          <CardContent className="p-5 sm:p-8">
            {/* ============================================================
                المرحلة 1: السؤال الرئيسي (تحديد الصفة والعلاقة بالمسجد)
               ============================================================ */}
            {!selectedRole && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    الخطوة 1: تحديد الصفة والعلاقة بالمسجد
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    اذكر الصفة (علاقتك بالمسجد)
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    يرجى اختيار صفتك لتوجيهك للمسار المخصص وتقديم الخدمة المطلوبة بأفضل صورة
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {/* 1. إمام */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("imam")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-teal-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-teal-200/80">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-teal-900 text-base">إمام</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        إمام مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                      </p>
                    </div>
                  </button>

                  {/* 2. مؤذن */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("muezzin")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-amber-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-amber-200/80">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-amber-900 text-base">مؤذن</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        مؤذن مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                      </p>
                    </div>
                  </button>

                  {/* 3. متبرع */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("donor")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-200/80">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-900 text-base">متبرع</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        الرغبة في تقديم تبرع (أرض، تبرع عيني، تبرع مالي، أو غير ذلك)
                      </p>
                    </div>
                  </button>

                  {/* 4. أخرى */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("other")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-blue-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-200/80">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-900 text-base">أخرى</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        جار المسجد، أحد جماعة المسجد، ممثل جهة، أو صاحب استفسار عام
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                المرحلة 2: مسار المتبرع (تحديد نوع التبرع)
               ============================================================ */}
            {selectedRole === "donor" && !donorType && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/70">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    مسار المتبرع
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    حدد نوع التبرع
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    اختر نوع التبرع لتوجيه طلبك إلى القسم المختص بالجمعية مباشرة
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {/* متبرع بأرض */}
                  <button
                    type="button"
                    onClick={() => setDonorType("land")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-200/80">
                      <LandPlot className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-900 text-base">متبرع بأرض</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        تبرع بقطعة أرض لبناء أو توسعة مسجد
                      </p>
                    </div>
                  </button>

                  {/* متبرع بتبرع عيني */}
                  <button
                    type="button"
                    onClick={() => setDonorType("in_kind")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-teal-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-teal-200/80">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-teal-900 text-base">متبرع بتبرع عيني</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        مواد بناء، تجهيزات، مكيفات، فرش، أنظمة صوت أو مياه
                      </p>
                    </div>
                  </button>

                  {/* متبرع بتبرع مالي */}
                  <button
                    type="button"
                    onClick={() => setDonorType("financial")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-amber-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-amber-200/80">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-amber-900 text-base">متبرع بتبرع مالي</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        تحويل بنكي لحساب الجمعية أو عبر المتجر الإلكتروني
                      </p>
                    </div>
                  </button>

                  {/* أخرى */}
                  <button
                    type="button"
                    onClick={() => setDonorType("other")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-blue-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-200/80">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-900 text-base">أخرى</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        شراكة مجتمعية، وقفية، أو نوع تبرع مخصص
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}




            {/* ============================================================
                المرحلة 3: النماذج الفعلية بحسب المسار المختار
               ============================================================ */}

            {/* ---------- 1. مسار الإمام / المؤذن (حساب مستخدم رسمي) ---------- */}
            {(selectedRole === "imam" || selectedRole === "muezzin") && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* القسم الأول: البيانات الأساسية */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">البيانات الأساسية</h3>
                  </div>

                  {/* الاسم الكامل */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <span>الاسم الكامل</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="أدخل اسمك الكامل"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                    />
                  </div>

                  {/* الجوال ورقم الهوية */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>رقم الجوال</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-slate-500">صيغة: 05XXXXXXXX (10 أرقام)</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="nationalId" className="text-xs sm:text-sm font-semibold text-slate-700">
                        رقم الهوية الوطنية
                      </Label>
                      <Input
                        id="nationalId"
                        placeholder="1XXXXXXXXX"
                        value={formData.nationalId}
                        onChange={(e) => handleChange("nationalId", e.target.value)}
                        maxLength={10}
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* البريد الإلكتروني والمدينة */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>البريد الإلكتروني</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>المدينة</span>
                      </Label>
                      <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all">
                          <SelectValue placeholder="اختر المدينة" />
                        </SelectTrigger>
                        <SelectContent>
                          {dynamicCities.map((city: any) => (
                            <SelectItem key={city.name} value={city.nameAr || city.name}>
                              {city.nameAr || city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* القسم الثاني: إثبات الصفة الرسمية */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      إثبات الصفة الرسمية (تكليف وزارة الشؤون الإسلامية) <span className="text-destructive">*</span>
                    </h3>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-primary/5">
                    <input
                      id="proofFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,image/*"
                      onChange={(e) => handleFileUpload("proofFile", e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="proofFile" className="cursor-pointer block">
                      {formData.proofFile ? (
                        <div className="text-primary font-semibold flex items-center justify-center gap-2.5 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          <span className="truncate max-w-xs font-bold">{formData.proofFile.name}</span>
                          <span className="text-xs text-slate-500 font-normal">({(formData.proofFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      ) : (
                        <div className="space-y-2 text-slate-600">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800">
                              اضغط لرفع وثيقة التكليف أو اسحبها هنا
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              PDF، صورة واضحة، أو مستند (الحد الأقصى 15MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* القسم الثالث: كلمة المرور */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">كلمة المرور لتسجيل الدخول</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" title="8 أحرف على الأقل" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>كلمة المرور</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="8 أحرف على الأقل"
                          value={formData.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          required
                          minLength={8}
                          className="pl-10 h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" title="أعد إدخال كلمة المرور" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>تأكيد كلمة المرور</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="أعد إدخال كلمة المرور"
                          value={formData.confirmPassword}
                          onChange={(e) => handleChange("confirmPassword", e.target.value)}
                          required
                          className="pl-10 h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors p-1"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* زر الإرسال */}
                <Button
                  type="submit"
                  className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all mt-4 text-sm sm:text-base flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  disabled={isSubmitting || registerImamMuezzinMutation.isPending}
                >
                  {isSubmitting || registerImamMuezzinMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      إنشاء الحساب ومتابعة الطلبات
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ---------- 2. مسار المتبرع بأرض ---------- */}
            {selectedRole === "donor" && donorType === "land" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* القسم الأول: بيانات المتبرع والتواصل */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">بيانات المتبرع والتواصل</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الاسم الكامل</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكريم"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>رقم الجوال</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-slate-500">صيغة: 05XXXXXXXX (10 أرقام)</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>البريد الإلكتروني</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="landCustomRole" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الصفة أو العلاقة بالمسجد</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="landCustomRole"
                        placeholder="مثال: مالك الأرض، فاعل خير، وكيل المالك..."
                        value={formData.customRoleTitle}
                        onChange={(e) => handleChange("customRoleTitle", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* القسم الثاني: اذكر تفاصيل التبرع */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <LandPlot className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">اذكر تفاصيل التبرع</h3>
                  </div>

                  {/* مساحة الأرض والأبعاد */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="landArea" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>مساحة الأرض (م²)</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="landArea"
                        placeholder="مثال: 900 م²"
                        value={formData.landArea}
                        onChange={(e) => handleChange("landArea", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="landDimensions" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>أبعاد وأطوال الأرض</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="landDimensions"
                        placeholder="مثال: 30م × 30م، على شارعين"
                        value={formData.landDimensions}
                        onChange={(e) => handleChange("landDimensions", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* موقع الأرض والمالك الحالي */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="landLocation" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>موقع الأرض / الحي</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="landLocation"
                        placeholder="مثال: حي الروابي، بالقرب من..."
                        value={formData.landLocation}
                        onChange={(e) => handleChange("landLocation", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="landOwner" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>المالك الحالي للأرض</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="landOwner"
                        placeholder="اسم المالك أو صفة الواقف"
                        value={formData.landOwner}
                        onChange={(e) => handleChange("landOwner", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* معلومات وملاحظات إضافية */}
                  <div className="space-y-1.5">
                    <Label htmlFor="landDetails" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <span>معلومات وملاحظات إضافية تساعد الجمعية على دراسة التبرع</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="landDetails"
                      rows={3}
                      placeholder="اكتب هنا أي معلومات إضافية تساعد الجمعية على دراسة وتقييم التبرع..."
                      value={formData.landDetails}
                      onChange={(e) => handleChange("landDetails", e.target.value)}
                      required
                      className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-right leading-relaxed p-3.5"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all mt-4 text-sm sm:text-base flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting || submitPublicRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري إرسال بيانات التبرع...
                    </>
                  ) : (
                    <>
                      <LandPlot className="w-5 h-5" />
                      إرسال بيانات التبرع بالأرض
                    </>
                  )}
                </Button>
              </form>
            )}


            {/* ---------- 3. مسار المتبرع بتبرع عيني ---------- */}
            {selectedRole === "donor" && donorType === "in_kind" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* القسم الأول: بيانات المتبرع والتواصل */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">بيانات المتبرع والتواصل</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الاسم الكامل</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكريم"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>رقم الجوال</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-slate-500">صيغة: 05XXXXXXXX (10 أرقام)</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inKind-email" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>البريد الإلكتروني</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inKind-email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inKindCustomRole" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الصفة أو العلاقة بالمسجد</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inKindCustomRole"
                        placeholder="مثال: متبرع، مورد، فاعل خير، جار المسجد..."
                        value={formData.customRoleTitle}
                        onChange={(e) => handleChange("customRoleTitle", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* تفاصيل التبرع العيني */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <Package className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">اذكر تفاصيل التبرع</h3>
                  </div>

                  {/* نوع التبرع والكميات */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inKindItemType" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>نوع التبرع العيني</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inKindItemType"
                        placeholder="مثال: مكيفات، سجاد، إنارة، مواد بناء..."
                        value={formData.inKindItemType}
                        onChange={(e) => handleChange("inKindItemType", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inKindQuantity" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الكميات المتاحة</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inKindQuantity"
                        placeholder="مثال: 5 أجهزة، 200 م²..."
                        value={formData.inKindQuantity}
                        onChange={(e) => handleChange("inKindQuantity", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* حالة المواد والموقع */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inKindCondition" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>حالة المواد</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inKindCondition"
                        placeholder="مثال: جديدة، مستعملة بحالة ممتازة..."
                        value={formData.inKindCondition}
                        onChange={(e) => handleChange("inKindCondition", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inKindLocation" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>موقع المواد / الاستلام</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inKindLocation"
                        placeholder="مثال: مستودع في حي الروابي، أبها..."
                        value={formData.inKindLocation}
                        onChange={(e) => handleChange("inKindLocation", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* إمكانية النقل والتسليم */}
                  <div
                    onClick={() => handleChange("inKindDeliveryAvailable", !formData.inKindDeliveryAvailable)}
                    className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                      formData.inKindDeliveryAvailable
                        ? "bg-primary/5 border-primary shadow-xs"
                        : "bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        formData.inKindDeliveryAvailable
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-slate-200/80 text-slate-500"
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          هل يوجد إمكانية لنقل وتوصيل التبرع العيني ؟
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formData.inKindDeliveryAvailable
                            ? "نعم، تتوفر إمكانية النقل والتوصيل لموقع المسجد أو مستودع الجمعية"
                            : "اضغط هنا في حال توفرت لديكم إمكانية نقل وتوصيل المواد"}
                        </p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      formData.inKindDeliveryAvailable
                        ? "bg-primary border-primary text-white shadow-xs"
                        : "bg-white border-slate-300"
                    }`}>
                      {formData.inKindDeliveryAvailable && (
                        <Check className="w-4 h-4 stroke-[3]" />
                      )}
                    </div>
                  </div>

                  {/* معلومات وملاحظات إضافية */}
                  <div className="space-y-1.5">
                    <Label htmlFor="inKindDetails" className="text-xs sm:text-sm font-semibold text-slate-700">
                      معلومات وملاحظات إضافية عن التبرع العيني (اختياري)
                    </Label>
                    <Textarea
                      id="inKindDetails"
                      rows={3}
                      placeholder="اكتب هنا أي تفاصيل أو مواصفات إضافية عن المواد أو التجهيزات..."
                      value={formData.inKindDetails}
                      onChange={(e) => handleChange("inKindDetails", e.target.value)}
                      className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-right leading-relaxed p-3.5"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all mt-4 text-sm sm:text-base flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting || submitPublicRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري إرسال بيانات التبرع...
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5" />
                      إرسال بيانات التبرع العيني
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ---------- 4. مسار المتبرع المالي (الحسابات البنكية والمتجر) ---------- */}
            {selectedRole === "donor" && donorType === "financial" && (
              <div className="space-y-6">
                {/* رسالة توضيحية تمهيدية */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl text-slate-900 text-right space-y-1.5 shadow-xs">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
                    <HeartHandshake className="w-4 h-4" />
                    <span>خيارات التبرع المالي لدعم المساجد</span>
                  </div>
                  <p className="font-semibold text-sm sm:text-base leading-relaxed text-slate-800">
                    نشكر لكم رغبتكم الكريمة في دعم بيوت الله وعمارتها. يمكنكم التبرع من خلال التحويل المباشر إلى الحساب البنكي الرسمي المعتمد أو عبر متجر التبرعات الإلكتروني.
                  </p>
                </div>

                {/* الخيار الأول: الحساب البنكي الرسمي مع الـ QR */}
                <div className="rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm space-y-5">
                  {/* ترويسة الحساب البنكي */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">الخيار الأول: التحويل البنكي (مصرف الراجحي)</h4>
                        <p className="text-xs text-slate-500">الحساب البنكي الرسمي المعتمد للتبرعات</p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
                      معتمد رسمياً
                    </span>
                  </div>

                  {/* اسم المستفيد */}
                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-right">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">اسم المستفيد (الجمعية):</span>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {orgSettings?.bankAccountName || orgSettings?.organizationName || "جمعية عمارة المساجد منارة"}
                    </p>
                  </div>

                  {/* رمز الـ QR للتحويل السريع */}
                  <div className="text-center space-y-2.5 py-1">
                    <div className="w-48 h-48 sm:w-52 sm:h-52 mx-auto p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-center group hover:border-primary transition-all">
                      <img
                        src="/bank-qr-code.png"
                        alt="رمز QR للتحويل السريع - مصرف الراجحي"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      امسح الرمز عبر تطبيق الراجحي أو أي تطبيق بنكي للتحويل السريع
                    </p>
                  </div>

                  {/* حقول النسخ السريع: رقم الحساب والآيبان */}
                  <div className="space-y-3 pt-1">
                    {/* رقم الآيبان */}
                    <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between gap-2 border-2 border-slate-200/80 hover:border-primary/40 transition-colors">
                      <div className="text-right overflow-hidden">
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">رقم الآيبان (IBAN):</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 tracking-wider truncate block" dir="ltr">
                          {rawIban}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(rawIban, "رقم الآيبان")}
                        className="shrink-0 text-xs font-bold gap-1.5 h-9 px-3 cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 shadow-xs"
                      >
                        {copiedField === "رقم الآيبان" ? (
                          <>
                            <Check className="w-4 h-4 text-primary" />
                            <span className="text-primary font-bold">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-600" />
                            <span>نسخ الآيبان</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* رقم الحساب */}
                    <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between gap-2 border-2 border-slate-200/80 hover:border-primary/40 transition-colors">
                      <div className="text-right overflow-hidden">
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">رقم الحساب:</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 tracking-wider truncate block" dir="ltr">
                          {bankAccountNumber}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(bankAccountNumber, "رقم الحساب")}
                        className="shrink-0 text-xs font-bold gap-1.5 h-9 px-3 cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 shadow-xs"
                      >
                        {copiedField === "رقم الحساب" ? (
                          <>
                            <Check className="w-4 h-4 text-primary" />
                            <span className="text-primary font-bold">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-600" />
                            <span>نسخ الحساب</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* الخيار الثاني: التبرع عبر المتجر الإلكتروني */}
                <div className="rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-200/80">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">الخيار الثاني: متجر التبرعات الإلكتروني</h4>
                      <p className="text-xs text-slate-500">اختر فرص التبرع والمشاريع المتاحة وتبرع إلكترونياً</p>
                    </div>
                  </div>

                  <a
                    href={donationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-sm sm:text-base"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  >
                    <span>الانتقال إلى متجر منارة للتبرع الإلكتروني</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* تنبيه إرسال إيصال التبرع في نهاية الصفحة */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs text-right">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-amber-950">
                        إشعار الجمعية بالتحويل وإصدار سند القبض
                      </p>
                      <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                        نرجو التكرم بإرسال صورة إيصال التحويل عبر الواتساب إلى الرقم <span className="font-mono font-bold text-amber-950 inline-block px-1 bg-amber-200/60 rounded" dir="ltr">0535922238</span> لتوثيق تبرعكم.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://wa.me/966535922238"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer"
                  >
                    <span>إرسال الإيصال عبر واتساب</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </a>
                </div>
              </div>
            )}

            {/* ---------- 5. مسار متبرع - أخرى ---------- */}
            {selectedRole === "donor" && donorType === "other" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* القسم الأول: بيانات المتبرع والتواصل */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">بيانات المتبرع والتواصل</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الاسم الكامل</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكريم"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>رقم الجوال</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-slate-500">صيغة: 05XXXXXXXX (10 أرقام)</p>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="donor-email" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>البريد الإلكتروني</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="donor-email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* القسم الثاني: تفاصيل الصفة والتبرع */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">تفاصيل الصفة والتبرع</h3>
                  </div>

                  {/* الصفة أو العلاقة بالمسجد */}
                  <div className="space-y-2">
                    <Label htmlFor="donorRoleTitle" className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <span>الصفة أو العلاقة بالمسجد</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="donorRoleTitle"
                      placeholder="مثال: فاعل خير، رجل أعمال، ممثل جهة أو شركة، جار المسجد..."
                      value={formData.customRoleTitle}
                      onChange={(e) => handleChange("customRoleTitle", e.target.value)}
                      required
                      className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donorOtherDetails" className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <span>تفاصيل التبرع المقترح</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="donorOtherDetails"
                      rows={5}
                      placeholder="اكتب هنا تفاصيل نوع التبرع أو المبادرة أو الشراكة المقترحة للجمعية..."
                      value={formData.donorOtherDetails}
                      onChange={(e) => handleChange("donorOtherDetails", e.target.value)}
                      required
                      className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-right leading-relaxed p-3.5"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all mt-4 text-sm sm:text-base flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      إرسال بيانات التبرع
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ---------- 6. مسار أخرى (استفسارات وطلبات عامة) ---------- */}
            {selectedRole === "other" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* القسم الأول: بيانات مقدم الطلب */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">بيانات مقدم الطلب</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span>الاسم الكامل</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكريم"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>رقم الجوال</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-slate-500">صيغة: 05XXXXXXXX (10 أرقام)</p>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>البريد الإلكتروني</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* القسم الثاني: تحديد الصفة والطلب */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">تفاصيل الصفة والطلب</h3>
                  </div>

                  {/* حدد الصفة */}
                  <div className="space-y-2">
                    <Label htmlFor="customRoleTitle" className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <span>الصفة أو العلاقة بالمسجد</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customRoleTitle"
                      placeholder="مثال: جار المسجد، أحد جماعة المسجد، ممثل جهة، صاحب استفسار..."
                      value={formData.customRoleTitle}
                      onChange={(e) => handleChange("customRoleTitle", e.target.value)}
                      required
                      className="h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all"
                    />

                    {/* خيارات سريعة للنقر */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["جار المسجد", "أحد جماعة المسجد", "ممثل جهة أو شركة", "صاحب استفسار عام"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleChange("customRoleTitle", tag)}
                          className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                            formData.customRoleTitle === tag
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* تفاصيل الطلب */}
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="requestDetails" className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <span>تفاصيل الطلب أو الاستفسار</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    {/* صندوق توضيح إرشادي */}
                    <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-right flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-800 block">توضيح إرشادي:</span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          يرجى توضيح ما ترغبون من الجمعية، وذكر تفاصيل المسجد أو الموقع إن كان الطلب مرتبطاً بمسجد محدد.
                        </p>
                      </div>
                    </div>
                    <Textarea
                      id="requestDetails"
                      rows={5}
                      placeholder="اكتب هنا تفاصيل طلبك، الاستفسار، أو الخدمة المطلوبة للمسجد..."
                      value={formData.requestDetails}
                      onChange={(e) => handleChange("requestDetails", e.target.value)}
                      required
                      className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-right leading-relaxed p-3.5"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all mt-4 text-sm sm:text-base flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting || submitPublicRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      إرسال الطلب للجمعية
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* الروابط السفلية */}
            <div className="mt-8 pt-5 border-t border-slate-100 text-center space-y-2.5">
              <p className="text-xs sm:text-sm text-gray-600">
                لديك حساب إمام أو مؤذن معتمد بالفعل؟{" "}
                <Link href="/login" className="font-bold hover:underline" style={{ color: primaryColor }}>
                  تسجيل الدخول
                </Link>
              </p>
              <Link href="/" className="block text-xs text-gray-500 hover:text-gray-800 transition-colors">
                ← العودة إلى الصفحة الرئيسية
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
