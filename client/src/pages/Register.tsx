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
  MapPin
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
    landLocation: "",
    landOwner: "",
    landProofFile: null as File | null,

    // مسار المتبرع العيني
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
      setIsSuccess(true);
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error.message) || "حدث خطأ في التسجيل");
    },
  });

  // طفرة إرسال طلب التبرع أو الاستفسار العام (دون حساب)
  const submitPublicRequestMutation = trpc.publicSubmissions.submit.useMutation({
    onSuccess: () => {
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
      if (!formData.landDetails.trim() && !formData.landLocation.trim()) {
        toast.error("يرجى ذكر تفاصيل الأرض وموقعها");
        return;
      }

      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        if (formData.landProofFile) {
          attachmentUrl = await uploadFile(formData.landProofFile);
        }

        const combinedDetails = [
          formData.landDetails ? `التفاصيل: ${formData.landDetails}` : "",
          formData.landArea ? `المساحة التقريبية: ${formData.landArea} م²` : "",
          formData.landLocation ? `الموقع/الحي: ${formData.landLocation}` : "",
          formData.landOwner ? `المالك الحالي: ${formData.landOwner}` : "",
        ].filter(Boolean).join("\n");

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_land",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          city: formData.city || undefined,
          details: combinedDetails || formData.landDetails.trim(),
          landArea: formData.landArea || undefined,
          landLocation: formData.landLocation || undefined,
          landOwner: formData.landOwner || undefined,
          attachmentUrl,
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
      if (!formData.inKindDetails.trim()) {
        toast.error("يرجى ذكر تفاصيل التبرع العيني والكميات المتاحة");
        return;
      }

      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        if (formData.inKindFile) {
          attachmentUrl = await uploadFile(formData.inKindFile);
        }

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_inkind",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          city: formData.city || undefined,
          details: formData.inKindDetails.trim(),
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
          city: formData.city || undefined,
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
      if (!formData.donorOtherDetails.trim()) {
        toast.error("يرجى كتابة تفاصيل التبرع");
        return;
      }

      setIsSubmitting(true);
      try {
        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_other",
          category: "donor",
          name: trimmedName,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          city: formData.city || undefined,
          details: formData.donorOtherDetails.trim(),
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
          email: formData.email.trim() || undefined,
          city: formData.city || undefined,
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

  // استخراج رقم الحساب التقريبي من الآيبان إن وجد
  const rawIban = orgSettings?.iban || "SA0580000347608011245554";
  const bankAccountNumber = rawIban.length > 10 ? rawIban.slice(6) : "347608011245554";
  const donationUrl = (orgSettings as any)?.donationStoreUrl || (orgSettings?.website ? (orgSettings.website.startsWith("http") ? orgSettings.website : `https://${orgSettings.website}`) : "https://manarah.org.sa");

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
                className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl border-teal-300 bg-white hover:bg-teal-50 hover:border-teal-500 text-teal-900 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all shrink-0 group"
              >
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700 group-hover:-translate-x-0.5 transition-transform" />
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
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
                  {/* إمام */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("imam")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow bg-white"
                  >
                    <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-teal-900 text-base">إمام</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        إمام مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                      </p>
                    </div>
                  </button>

                  {/* مؤذن */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("muezzin")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow bg-white"
                  >
                    <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Volume2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-teal-900 text-base">مؤذن</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        مؤذن مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                      </p>
                    </div>
                  </button>

                  {/* متبرع */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("donor")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow bg-white"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 text-base">متبرع</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        الرغبة في تقديم تبرع (أرض، تبرع عيني، تبرع مالي، أو غير ذلك)
                      </p>
                    </div>
                  </button>

                  {/* أخرى */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("other")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow bg-white"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-900 text-base">أخرى</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
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
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <LandPlot className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 text-base">متبرع بأرض</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        تبرع بقطعة أرض لبناء أو توسعة مسجد
                      </p>
                    </div>
                  </button>

                  {/* متبرع بتبرع عيني */}
                  <button
                    type="button"
                    onClick={() => setDonorType("in_kind")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 text-base">متبرع بتبرع عيني</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        مواد بناء، تجهيزات، مكيفات، فرش، أنظمة صوت أو مياه
                      </p>
                    </div>
                  </button>

                  {/* متبرع بتبرع مالي */}
                  <button
                    type="button"
                    onClick={() => setDonorType("financial")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 text-base">متبرع بتبرع مالي</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        تحويل بنكي لحساب الجمعية أو عبر المتجر الإلكتروني
                      </p>
                    </div>
                  </button>

                  {/* أخرى */}
                  <button
                    type="button"
                    onClick={() => setDonorType("other")}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-right transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 text-base">أخرى</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
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
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100/80">
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
                      className="h-11 rounded-xl text-right border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all"
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
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
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
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
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
                        className="h-11 rounded-xl text-left border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>المدينة</span>
                      </Label>
                      <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all">
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
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100/80">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      إثبات الصفة الرسمية (تكليف وزارة الشؤون الإسلامية) <span className="text-destructive">*</span>
                    </h3>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-teal-50/20">
                    <input
                      id="proofFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,image/*"
                      onChange={(e) => handleFileUpload("proofFile", e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="proofFile" className="cursor-pointer block">
                      {formData.proofFile ? (
                        <div className="text-emerald-700 font-semibold flex items-center justify-center gap-2.5 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-xs font-bold">{formData.proofFile.name}</span>
                          <span className="text-xs text-slate-500 font-normal">({(formData.proofFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      ) : (
                        <div className="space-y-2 text-slate-600">
                          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
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
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100/80">
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
                          className="pl-10 h-11 rounded-xl text-right border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all"
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
                          className="pl-10 h-11 rounded-xl text-right border-slate-200 focus:border-teal-600 focus:ring-teal-600/20 bg-slate-50/40 focus:bg-white transition-all"
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
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs sm:text-sm">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <LandPlot className="w-4 h-4 text-emerald-700" />
                    مسار التبرع بأرض لبناء مسجد
                  </p>
                  <p className="text-emerald-800 leading-relaxed text-xs">
                    يرجى توضيح مساحة الأرض، أبعادها، أطوالها، موقعها، ومالكها الحالي، وأي معلومات إضافية تساعد الجمعية على دراسة التبرع.
                  </p>
                </div>

                {/* البيانات الأساسية */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2">بيانات المتبرع والتواصل</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold">
                        الاسم الكامل <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكريم"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-10 sm:h-11 text-right"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold">
                        رقم الجوال <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-10 sm:h-11 text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs sm:text-sm font-semibold">البريد الإلكتروني (اختياري)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="h-10 sm:h-11 text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs sm:text-sm font-semibold">المدينة / المنطقة</Label>
                      <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                        <SelectTrigger className="h-10 sm:h-11">
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

                {/* تفاصيل التبرع بالأرض */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2">اذكر تفاصيل التبرع</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="landArea" className="text-xs font-semibold">المساحة التقريبية (م²)</Label>
                      <Input
                        id="landArea"
                        placeholder="مثال: 900 م²"
                        value={formData.landArea}
                        onChange={(e) => handleChange("landArea", e.target.value)}
                        className="h-10 text-right"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="landLocation" className="text-xs font-semibold">موقع الأرض / الحي</Label>
                      <Input
                        id="landLocation"
                        placeholder="مثال: حي الروابي"
                        value={formData.landLocation}
                        onChange={(e) => handleChange("landLocation", e.target.value)}
                        className="h-10 text-right"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="landOwner" className="text-xs font-semibold">المالك الحالي للأرض</Label>
                      <Input
                        id="landOwner"
                        placeholder="اسم المالك"
                        value={formData.landOwner}
                        onChange={(e) => handleChange("landOwner", e.target.value)}
                        className="h-10 text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="landDetails" className="text-xs sm:text-sm font-semibold">
                      تفاصيل إضافية عن الأرض وأبعادها <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="landDetails"
                      rows={4}
                      placeholder="يرجى توضيح مساحة الأرض، أبعادها، أطوالها، موقعها، ومالكها الحالي، وأي معلومات إضافية تساعد الجمعية على دراسة التبرع..."
                      value={formData.landDetails}
                      onChange={(e) => handleChange("landDetails", e.target.value)}
                      required
                      className="text-right leading-relaxed"
                    />
                  </div>

                  {/* رفع مستند أو صك اختياري */}
                  <div className="space-y-1.5">
                    <Label htmlFor="landProofFile" className="text-xs font-semibold flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      إرفاق صورة الصك، كروكي، أو صور الموقع (اختياري)
                    </Label>
                    <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50/50">
                      <input
                        id="landProofFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,image/*"
                        onChange={(e) => handleFileUpload("landProofFile", e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="landProofFile" className="cursor-pointer block text-xs text-slate-600">
                        {formData.landProofFile ? (
                          <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> {formData.landProofFile.name}
                          </span>
                        ) : (
                          "اضغط لاختيار ملف أو صورة (PDF أو صور)"
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-11 sm:h-12 rounded-xl shadow-md cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting || submitPublicRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري إرسال بيانات التبرع...
                    </>
                  ) : (
                    "إرسال بيانات التبرع بالأرض"
                  )}
                </Button>
              </form>
            )}

            {/* ---------- 3. مسار المتبرع بتبرع عيني ---------- */}
            {selectedRole === "donor" && donorType === "in_kind" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs sm:text-sm">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-700" />
                    مسار التبرع العيني للمساجد
                  </p>
                  <p className="text-emerald-800 leading-relaxed text-xs">
                    يرجى توضيح نوع التبرع العيني، الكميات المتاحة، حالتها، موقعها، وإمكانية نقلها أو تسليمها.
                  </p>
                </div>

                {/* البيانات الأساسية */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2">بيانات المتبرع والتواصل</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold">
                        الاسم الكامل <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكريم"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-10 sm:h-11 text-right"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold">
                        رقم الجوال <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-10 sm:h-11 text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs sm:text-sm font-semibold">البريد الإلكتروني (اختياري)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="h-10 sm:h-11 text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs sm:text-sm font-semibold">المدينة / الموقع</Label>
                      <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                        <SelectTrigger className="h-10 sm:h-11">
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

                {/* تفاصيل التبرع العيني */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2">اذكر تفاصيل التبرع</h3>

                  <div className="space-y-1.5">
                    <Label htmlFor="inKindDetails" className="text-xs sm:text-sm font-semibold">
                      تفاصيل التبرع العيني والكميات والحالة <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="inKindDetails"
                      rows={4}
                      placeholder="يرجى توضيح نوع التبرع العيني (مكيفات، سجاد، إنارة، أجهزة صوتية، دهانات...)، الكميات المتاحة، حالتها (جديدة/مستعملة)، وموقع استلامها..."
                      value={formData.inKindDetails}
                      onChange={(e) => handleChange("inKindDetails", e.target.value)}
                      required
                      className="text-right leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="inKindDelivery"
                      type="checkbox"
                      checked={formData.inKindDeliveryAvailable}
                      onChange={(e) => handleChange("inKindDeliveryAvailable", e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <Label htmlFor="inKindDelivery" className="text-xs sm:text-sm text-slate-700 cursor-pointer">
                      إمكانية نقل وتوصيل التبرع العيني إلى موقع المسجد أو مستودعات الجمعية متاحة
                    </Label>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="inKindFile" className="text-xs font-semibold flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      إرفاق صور للمواد أو جدول الكميات (اختياري)
                    </Label>
                    <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50/50">
                      <input
                        id="inKindFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,image/*"
                        onChange={(e) => handleFileUpload("inKindFile", e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="inKindFile" className="cursor-pointer block text-xs text-slate-600">
                        {formData.inKindFile ? (
                          <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> {formData.inKindFile.name}
                          </span>
                        ) : (
                          "اضغط لاختيار صورة أو ملف للمواد العينية"
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-11 sm:h-12 rounded-xl shadow-md cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting || submitPublicRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري إرسال بيانات التبرع...
                    </>
                  ) : (
                    "إرسال بيانات التبرع العيني"
                  )}
                </Button>
              </form>
            )}

            {/* ---------- 4. مسار المتبرع المالي (الحسابات البنكية والمتجر) ---------- */}
            {selectedRole === "donor" && donorType === "financial" && (
              <div className="space-y-6">
                {/* رسالة الشكر والإرشاد المعتمدة */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200 rounded-2xl text-emerald-950 text-right space-y-2 shadow-sm">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-bold">
                    <HeartHandshake className="w-4 h-4" />
                    رسالة شكر وتقدير
                  </div>
                  <p className="font-semibold text-sm sm:text-base leading-relaxed text-emerald-900">
                    نشكر لكم رغبتكم في دعم الجمعية، ويمكنكم التبرع من خلال التحويل إلى حساب الجمعية الموضح أدناه، أو من خلال اختيار إحدى فرص التبرع المتاحة على موقع التبرعات الإلكتروني.
                  </p>
                </div>

                {/* بطاقة الحساب البنكي الرسمي */}
                <div className="rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-b from-white to-slate-50 p-5 sm:p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">
                          {orgSettings?.bankName || "مصرف الراجحي"}
                        </h4>
                        <p className="text-xs text-gray-500">الحساب البنكي الرسمي المعتمد</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                      معتمد رسمياً
                    </span>
                  </div>

                  {/* اسم المستفيد */}
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 block">اسم المستفيد (الجمعية):</span>
                    <p className="text-sm sm:text-base font-bold text-gray-900">
                      {orgSettings?.bankAccountName || orgSettings?.organizationName || "جمعية عمارة المساجد منارة"}
                    </p>
                  </div>

                  {/* رقم الحساب والآيبان مع النسخ السريع */}
                  <div className="space-y-3 pt-1">
                    {/* رقم الآيبان */}
                    <div className="p-3 bg-slate-100/90 rounded-xl flex items-center justify-between gap-2 border border-slate-200">
                      <div className="text-right overflow-hidden">
                        <span className="text-[11px] text-gray-500 block">رقم الآيبان (IBAN):</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 tracking-wider truncate block" dir="ltr">
                          {rawIban}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(rawIban, "رقم الآيبان")}
                        className="shrink-0 text-xs font-semibold gap-1.5 h-8 cursor-pointer bg-white hover:bg-slate-200"
                      >
                        {copiedField === "رقم الآيبان" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الآيبان</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* رقم الحساب */}
                    <div className="p-3 bg-slate-100/90 rounded-xl flex items-center justify-between gap-2 border border-slate-200">
                      <div className="text-right overflow-hidden">
                        <span className="text-[11px] text-gray-500 block">رقم الحساب:</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 tracking-wider truncate block" dir="ltr">
                          {bankAccountNumber}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(bankAccountNumber, "رقم الحساب")}
                        className="shrink-0 text-xs font-semibold gap-1.5 h-8 cursor-pointer bg-white hover:bg-slate-200"
                      >
                        {copiedField === "رقم الحساب" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الحساب</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* زر الانتقال لموقع التبرعات الإلكتروني */}
                <div className="text-center space-y-3">
                  <a
                    href={donationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full text-white font-bold h-12 rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer text-sm sm:text-base"
                  >
                    <span>الانتقال إلى موقع التبرعات الإلكتروني</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* قسم إشعار التحويل البنكي الاختياري */}
                <div className="border-t pt-4">
                  {!showTransferProofSection ? (
                    <button
                      type="button"
                      onClick={() => setShowTransferProofSection(true)}
                      className="text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center justify-center w-full gap-1 cursor-pointer py-1"
                    >
                      <span>هل قمت بالتحويل وترغب في إشعار الجمعية لتزويدك بسند قبض؟ (اضغط هنا)</span>
                    </button>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900">إشعار بالتحويل البنكي (اختياري)</h4>
                        <button
                          type="button"
                          onClick={() => setShowTransferProofSection(false)}
                          className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="financial-name" className="text-xs font-semibold">اسم المحول <span className="text-destructive">*</span></Label>
                          <Input
                            id="financial-name"
                            placeholder="الاسم الكريم"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            required
                            className="h-10 text-right"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="financial-phone" className="text-xs font-semibold">رقم الجوال <span className="text-destructive">*</span></Label>
                          <Input
                            id="financial-phone"
                            placeholder="05XXXXXXXX"
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            required
                            className="h-10 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="financial-amount" className="text-xs font-semibold">المبلغ المحول (ر.س)</Label>
                          <Input
                            id="financial-amount"
                            placeholder="مثال: 5000"
                            value={formData.financialAmount}
                            onChange={(e) => handleChange("financialAmount", e.target.value)}
                            className="h-10 text-left"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="financial-bank" className="text-xs font-semibold">البنك المحول منه</Label>
                          <Input
                            id="financial-bank"
                            placeholder="مثال: الراجحي، الأهلي..."
                            value={formData.financialBankName}
                            onChange={(e) => handleChange("financialBankName", e.target.value)}
                            className="h-10 text-right"
                          />
                        </div>
                      </div>

                      {/* رفع إيصال التحويل */}
                      <div className="space-y-1">
                        <Label htmlFor="transferReceipt" className="text-xs font-semibold">إرفاق إيصال التحويل (صورة أو PDF)</Label>
                        <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-500 bg-white">
                          <input
                            id="transferReceipt"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,image/*"
                            onChange={(e) => handleFileUpload("transferReceiptFile", e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <label htmlFor="transferReceipt" className="cursor-pointer block text-xs text-slate-600">
                            {formData.transferReceiptFile ? (
                              <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> {formData.transferReceiptFile.name}
                              </span>
                            ) : (
                              "اضغط لاختيار صورة الإيصال البنكي"
                            )}
                          </label>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full text-white font-bold h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                        disabled={isSubmitting || submitPublicRequestMutation.isPending}
                      >
                        {isSubmitting ? "جاري الإرسال..." : "إرسال إشعار التحويل للجمعية"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ---------- 5. مسار متبرع - أخرى ---------- */}
            {selectedRole === "donor" && donorType === "other" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs sm:text-sm">
                  <p className="font-bold mb-1">مسار التبرعات الأخرى والشراكات</p>
                  <p className="text-emerald-800 leading-relaxed text-xs">
                    يرجى تزويدنا بتفاصيل نوع التبرع أو المبادرة التي ترغبون في تقديمها للجمعية.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-semibold">
                      الاسم الكامل <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="أدخل اسمك الكريم"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      className="h-10 sm:h-11 text-right"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold">
                      رقم الجوال <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      maxLength={10}
                      className="h-10 sm:h-11 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="donorOtherDetails" className="text-xs sm:text-sm font-semibold">
                    تفاصيل التبرع المقترح <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="donorOtherDetails"
                    rows={4}
                    placeholder="اكتب تفاصيل التبرع أو المبادرة المقترحة..."
                    value={formData.donorOtherDetails}
                    onChange={(e) => handleChange("donorOtherDetails", e.target.value)}
                    required
                    className="text-right leading-relaxed"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-11 sm:h-12 rounded-xl shadow-md cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting ? "جاري الإرسال..." : "إرسال البيانات"}
                </Button>
              </form>
            )}

            {/* ---------- 6. مسار أخرى (استفسارات وطلبات عامة) ---------- */}
            {selectedRole === "other" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-xs sm:text-sm">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-700" />
                    مسار الطلبات والاستفسارات العامة
                  </p>
                  <p className="text-indigo-800 leading-relaxed text-xs">
                    يرجى توضيح ما ترغبون من الجمعية، وذكر تفاصيل المسجد أو الموقع إن كان الطلب مرتبطاً بمسجد محدد.
                  </p>
                </div>

                {/* البيانات الأساسية */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2">بيانات مقدم الطلب</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs sm:text-sm font-semibold">
                        الاسم الكامل <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكامل"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        className="h-10 sm:h-11 text-right"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold">
                        رقم الجوال <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={10}
                        className="h-10 sm:h-11 text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs sm:text-sm font-semibold">البريد الإلكتروني (اختياري)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="h-10 sm:h-11 text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs sm:text-sm font-semibold">المدينة</Label>
                      <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                        <SelectTrigger className="h-10 sm:h-11">
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

                {/* تحديد الصفة والطلب */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2">تفاصيل الصفة والطلب</h3>

                  {/* حدد الصفة */}
                  <div className="space-y-2">
                    <Label htmlFor="customRoleTitle" className="text-xs sm:text-sm font-semibold">
                      حدد الصفة <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customRoleTitle"
                      placeholder="مثال: جار المسجد، أحد جماعة المسجد، ممثل جهة، صاحب استفسار..."
                      value={formData.customRoleTitle}
                      onChange={(e) => handleChange("customRoleTitle", e.target.value)}
                      required
                      className="h-10 sm:h-11 text-right"
                    />

                    {/* خيارات سريعة للنقر */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["جار المسجد", "أحد جماعة المسجد", "ممثل جهة أو شركة", "صاحب استفسار عام"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleChange("customRoleTitle", tag)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            formData.customRoleTitle === tag
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* اكتب طلبك */}
                  <div className="space-y-1.5">
                    <Label htmlFor="requestDetails" className="text-xs sm:text-sm font-semibold">
                      اكتب طلبك <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="requestDetails"
                      rows={4}
                      placeholder="يرجى توضيح ما ترغبون من الجمعية، وذكر تفاصيل المسجد أو الموقع إن كان الطلب مرتبطاً بمسجد محدد..."
                      value={formData.requestDetails}
                      onChange={(e) => handleChange("requestDetails", e.target.value)}
                      required
                      className="text-right leading-relaxed"
                    />
                  </div>

                  {/* مرفق اختياري */}
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="otherFile" className="text-xs font-semibold flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      إرفاق مستند أو صورة توضيحية (اختياري)
                    </Label>
                    <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50/50">
                      <input
                        id="otherFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,image/*"
                        onChange={(e) => handleFileUpload("otherFile", e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="otherFile" className="cursor-pointer block text-xs text-slate-600">
                        {formData.otherFile ? (
                          <span className="text-indigo-700 font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> {formData.otherFile.name}
                          </span>
                        ) : (
                          "اضغط لاختيار ملف توضيحي"
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-bold h-11 sm:h-12 rounded-xl shadow-md cursor-pointer transition-all bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSubmitting || submitPublicRequestMutation.isPending}
                >
                  {isSubmitting || submitPublicRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    "إرسال الطلب / الاستفسار"
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
