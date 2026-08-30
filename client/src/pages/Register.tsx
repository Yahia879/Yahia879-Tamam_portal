import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
  Download,
  Ruler,
  Coins,
  Paperclip
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

  // معرّف النموذج المخصص للمسار النشط
  const activeRegistrationFormId = useMemo(() => {
    if (selectedRole === "donor") {
      if (donorType === "land") return "donor_land";
      if (donorType === "in_kind") return "donor_inkind";
      if (donorType === "financial") return "donor_financial";
      if (donorType === "other") return "donor_other";
    }
    if (selectedRole === "other") return "other";
    return null;
  }, [selectedRole, donorType]);

  const { data: registrationFormConfig } = trpc.forms.getRegistrationFormConfig.useQuery(
    { formId: activeRegistrationFormId || "" },
    { enabled: !!activeRegistrationFormId }
  );

  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  const handleDynamicChange = (fieldId: string, val: any) => {
    setDynamicValues((prev) => ({ ...prev, [fieldId]: val }));
    if (fieldId === "customRoleTitle" || fieldId === "landCustomRole" || fieldId === "inKindCustomRole" || fieldId === "donorRoleTitle") {
      setFormData((prev) => ({ ...prev, customRoleTitle: val }));
    } else if (fieldId in formData) {
      setFormData((prev) => ({ ...prev, [fieldId]: val }));
    }
  };

  const getFieldValue = (fieldId: string) => {
    if (dynamicValues[fieldId] !== undefined) return dynamicValues[fieldId];
    if (fieldId === "customRoleTitle" || fieldId === "landCustomRole" || fieldId === "inKindCustomRole" || fieldId === "donorRoleTitle") {
      return formData.customRoleTitle;
    }
    return (formData as any)[fieldId] ?? "";
  };

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

    const activeFields = registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false) || [];

    // دالة مساعدة للتحقق من كافة الحقول المطلوبة النشطة
    const validateRequiredFields = () => {
      if (activeFields.length > 0) {
        for (const f of activeFields) {
          if (f.required) {
            const val = getFieldValue(f.id);
            if (val === undefined || val === null || (typeof val === "string" && !val.trim()) || (f.type === "file" && !val)) {
              toast.error(`يرجى تعبئة الحقل المطلوب: "${f.label}"`);
              return false;
            }
          }
        }
      }
      return true;
    };

    // دالة مساعدة لتجميع كافة قيم الحقول الديناميكية
    const getDynamicDetailsText = (excludeKeys: string[] = ["name", "phone", "email"]) => {
      if (!activeFields.length) return "";
      return activeFields
        .filter((f: any) => !excludeKeys.includes(f.id))
        .map((f: any) => {
          const val = getFieldValue(f.id);
          if (val === undefined || val === null || val === "" || val === false) return null;
          if (typeof val === "boolean") return `${f.label}: نعم`;
          return `${f.label}: ${val}`;
        })
        .filter(Boolean)
        .join("\n");
    };

    // 2. مسار المتبرع بأرض
    if (selectedRole === "donor" && donorType === "land") {
      if (!validateRequiredFields()) return;

      setIsSubmitting(true);
      try {
        const dynamicDetails = getDynamicDetailsText(["name", "phone", "email"]);
        const fallbackDetails = [
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
          name: trimmedName || (getFieldValue("name") as string) || "متبرع بأرض",
          phone: (formData.phone || getFieldValue("phone") || "").trim(),
          email: (formData.email || getFieldValue("email") || "").trim(),
          customRoleTitle: (formData.customRoleTitle || getFieldValue("customRoleTitle") || "").trim(),
          details: dynamicDetails || fallbackDetails,
          landArea: formData.landArea || getFieldValue("landArea"),
          landLocation: formData.landLocation || getFieldValue("landLocation"),
          landOwner: formData.landOwner || getFieldValue("landOwner"),
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
      if (!validateRequiredFields()) return;

      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        const fileVal = getFieldValue("inKindFile") || formData.inKindFile;
        if (fileVal instanceof File) {
          attachmentUrl = await uploadFile(fileVal);
        }

        const dynamicDetails = getDynamicDetailsText(["name", "phone", "email"]);
        const fallbackDetails = [
          formData.customRoleTitle ? `الصفة أو العلاقة بالمسجد: ${formData.customRoleTitle}` : "",
          formData.inKindItemType ? `نوع التبرع العيني: ${formData.inKindItemType}` : "",
          formData.inKindQuantity ? `الكميات المتاحة: ${formData.inKindQuantity}` : "",
          formData.inKindCondition ? `حالة المواد: ${formData.inKindCondition}` : "",
          formData.inKindLocation ? `موقع المواد / الاستلام: ${formData.inKindLocation}` : "",
          `إمكانية النقل والتسليم: ${getFieldValue("inKindDeliveryAvailable") ? "نقل وتوصيل متاح من قبل المتبرع" : "يتطلب استلام من الموقع"}`,
          formData.inKindDetails ? `معلومات وملاحظات إضافية: ${formData.inKindDetails}` : "",
        ].filter(Boolean).join("\n");

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_inkind",
          category: "donor",
          name: trimmedName || (getFieldValue("name") as string) || "متبرع بتبرع عيني",
          phone: (formData.phone || getFieldValue("phone") || "").trim(),
          email: (formData.email || getFieldValue("email") || "").trim(),
          customRoleTitle: (formData.customRoleTitle || getFieldValue("customRoleTitle") || "").trim(),
          details: dynamicDetails || fallbackDetails || "طلب تبرع عيني",
          inKindDeliveryAvailable: !!getFieldValue("inKindDeliveryAvailable"),
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
          name: trimmedName || (getFieldValue("name") as string) || "متبرع مالي",
          phone: (formData.phone || getFieldValue("phone") || "").trim(),
          email: (formData.email || getFieldValue("email") || "").trim() || undefined,
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
      if (!validateRequiredFields()) return;

      setIsSubmitting(true);
      try {
        const dynamicDetails = getDynamicDetailsText(["name", "phone", "email"]);
        const fallbackDetails = [
          formData.customRoleTitle ? `الصفة / العلاقة بالمسجد: ${formData.customRoleTitle}` : "",
          `تفاصيل التبرع والمقترح: ${formData.donorOtherDetails.trim()}`,
        ].filter(Boolean).join("\n");

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "donor_other",
          category: "donor",
          name: trimmedName || (getFieldValue("name") as string) || "متبرع",
          phone: (formData.phone || getFieldValue("phone") || "").trim(),
          email: (formData.email || getFieldValue("email") || "").trim(),
          customRoleTitle: (formData.customRoleTitle || getFieldValue("customRoleTitle") || "").trim(),
          details: dynamicDetails || fallbackDetails,
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
      if (!validateRequiredFields()) return;

      setIsSubmitting(true);
      try {
        let attachmentUrl: string | undefined = undefined;
        const fileVal = getFieldValue("otherFile") || formData.otherFile;
        if (fileVal instanceof File) {
          attachmentUrl = await uploadFile(fileVal);
        }

        const dynamicDetails = getDynamicDetailsText(["name", "phone", "email"]);

        await submitPublicRequestMutation.mutateAsync({
          submissionType: "general_inquiry",
          category: "other",
          name: trimmedName || (getFieldValue("name") as string) || "مقدم طلب / استفسار",
          phone: (formData.phone || getFieldValue("phone") || "").trim(),
          email: (formData.email || getFieldValue("email") || "").trim(),
          customRoleTitle: (formData.customRoleTitle || getFieldValue("customRoleTitle") || "").trim(),
          details: dynamicDetails || formData.requestDetails.trim(),
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

  const getDynamicUnitSuffix = (fieldId: string) => {
    switch (fieldId) {
      case "landArea":
        return "م²";
      case "financialAmount":
        return "ريال";
      default:
        return null;
    }
  };

  const renderDynamicField = (field: any) => {
    const value = getFieldValue(field.id);
    const unitSuffix = getDynamicUnitSuffix(field.id);

    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-1 sm:space-y-1.5 sm:col-span-2">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          {field.id === "requestDetails" && (
            <div className="p-2.5 sm:p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-right flex items-start gap-2 sm:gap-2.5 mb-1.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-800 block">توضيح إرشادي:</span>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  يرجى توضيح ما ترغبون من الجمعية، وذكر تفاصيل المسجد أو الموقع إن كان الطلب مرتبطاً بمسجد محدد.
                </p>
              </div>
            </div>
          )}
          <Textarea
            id={field.id}
            rows={field.id === "donorOtherDetails" ? 4 : 3}
            placeholder={field.placeholder || "اكتب التفاصيل هنا..."}
            value={value || ""}
            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
            required={field.required}
            className="min-h-[85px] sm:min-h-[110px] rounded-xl border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-right leading-relaxed p-3 sm:p-3.5 text-xs sm:text-sm"
          />
          {field.helpText && (
            <p className="text-[10.5px] sm:text-[11px] text-slate-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "phone") {
      return (
        <div key={field.id} className="space-y-1 sm:space-y-1.5">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Input
            id={field.id}
            type="tel"
            dir="ltr"
            maxLength={10}
            placeholder={field.placeholder || "05XXXXXXXX"}
            value={value || ""}
            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
            required={field.required}
            className="h-10 sm:h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono text-xs sm:text-sm px-3 sm:px-3.5"
          />
          <p className="text-[10.5px] sm:text-[11px] text-slate-500">{field.helpText || "صيغة: 05XXXXXXXX (10 أرقام)"}</p>
        </div>
      );
    }

    if (field.type === "email") {
      const isFullWidth = selectedRole === "other" || (selectedRole === "donor" && donorType === "other");
      return (
        <div key={field.id} className={`space-y-1 sm:space-y-1.5 ${isFullWidth ? "sm:col-span-2" : ""}`}>
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Input
            id={field.id}
            type="email"
            dir="ltr"
            placeholder={field.placeholder || "name@example.com"}
            value={value || ""}
            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
            required={field.required}
            className="h-10 sm:h-11 rounded-xl text-left border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all font-mono text-xs sm:text-sm px-3 sm:px-3.5"
          />
          {field.helpText && (
            <p className="text-[10.5px] sm:text-[11px] text-slate-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.id} className="space-y-1 sm:space-y-1.5">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Select
            value={value || ""}
            onValueChange={(val) => handleDynamicChange(field.id, val)}
          >
            <SelectTrigger className="h-10 sm:h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-xs sm:text-sm px-3 sm:px-3.5">
              <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {field.options?.map((opt: any, idx: number) => (
                <SelectItem key={idx} value={opt.value} className="text-xs sm:text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && (
            <p className="text-[10.5px] sm:text-[11px] text-slate-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "radio") {
      return (
        <div key={field.id} className="space-y-1 sm:space-y-1.5 sm:col-span-2">
          <Label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => handleDynamicChange(field.id, val)}
            className="grid grid-cols-2 gap-2 sm:gap-3 pt-1"
            dir="rtl"
          >
            {field.options?.map((opt: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/40 cursor-pointer active:scale-98 transition-all">
                <RadioGroupItem value={opt.value} id={`${field.id}_${idx}`} />
                <Label htmlFor={`${field.id}_${idx}`} className="text-xs sm:text-sm cursor-pointer select-none">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {field.helpText && (
            <p className="text-[10.5px] sm:text-[11px] text-slate-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div key={field.id} className="sm:col-span-2">
          <div
            onClick={() => handleDynamicChange(field.id, !value)}
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 sm:gap-3 active:scale-[0.99] ${
              value
                ? "bg-primary/5 border-primary shadow-xs"
                : "bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/50"
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {field.id === "inKindDeliveryAvailable" && (
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  value ? "bg-primary text-primary-foreground shadow-xs" : "bg-slate-200/80 text-slate-500"
                }`}>
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                  {field.label}
                </p>
                {field.helpText && (
                  <p className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5">{field.helpText}</p>
                )}
              </div>
            </div>
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
              value ? "bg-primary border-primary text-white shadow-xs" : "bg-white border-slate-300"
            }`}>
              {value && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
            </div>
          </div>
        </div>
      );
    }

    if (field.type === "file") {
      return (
        <div key={field.id} className="space-y-1 sm:space-y-1.5 sm:col-span-2">
          <Label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Paperclip className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <input
            type="file"
            id={field.id}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              handleDynamicChange(field.id, file);
            }}
          />
          <label
            htmlFor={field.id}
            className="block p-3.5 sm:p-5 border-2 border-dashed border-slate-200 rounded-xl sm:rounded-2xl text-center cursor-pointer hover:border-primary hover:bg-slate-50 active:scale-[0.99] transition-all"
          >
            <Paperclip className="w-5 h-5 mx-auto mb-1 text-slate-400" />
            <span className="text-xs sm:text-sm font-semibold text-slate-700 block truncate">
              {value instanceof File ? value.name : (field.placeholder || "اضغط لاختيار ملف أو صورة")}
            </span>
            {field.helpText && (
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block">{field.helpText}</span>
            )}
          </label>
        </div>
      );
    }

    const isFullWidthDefault = (field.id === "customRoleTitle" || field.id === "landCustomRole" || field.id === "inKindCustomRole") && (selectedRole === "other" || (selectedRole === "donor" && donorType === "other"));

    return (
      <div key={field.id} className={`space-y-1 sm:space-y-1.5 ${isFullWidthDefault ? "sm:col-span-2" : ""}`}>
        <Label htmlFor={field.id} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
          <span>{field.label}</span>
          {field.required && <span className="text-destructive font-bold">*</span>}
        </Label>
        <div className="relative flex items-center">
          <Input
            id={field.id}
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            placeholder={field.placeholder || ""}
            value={value || ""}
            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
            required={field.required}
            className={`h-10 sm:h-11 rounded-xl text-right border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/40 focus:bg-white transition-all text-xs sm:text-sm px-3 sm:px-3.5 ${unitSuffix ? "pl-11" : ""}`}
          />
          {unitSuffix && (
            <span className="absolute left-2.5 text-[11px] sm:text-xs px-2 py-0.5 font-semibold text-slate-500 bg-slate-200/60 rounded-md select-none pointer-events-none">
              {unitSuffix}
            </span>
          )}
        </div>
        {field.id === "customRoleTitle" && selectedRole === "other" && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["جار المسجد", "أحد جماعة المسجد", "ممثل جهة أو شركة", "صاحب استفسار عام"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleDynamicChange("customRoleTitle", tag)}
                className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                  getFieldValue("customRoleTitle") === tag
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        {field.helpText && (
          <p className="text-[10.5px] sm:text-[11px] text-slate-500">{field.helpText}</p>
        )}
      </div>
    );
  };

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70 p-2.5 sm:p-6 md:p-8" dir="rtl">
      <div className="w-full max-w-2xl transition-all duration-300">
        {/* الترويسة والشعار */}
        <Link href="/" className="flex flex-col items-center mb-4 sm:mb-8 text-center group cursor-pointer">
          <img
            src={orgSettings?.logoUrl || "/logo.svg"}
            alt={`شعار ${orgSettings?.organizationName || "بوابة منارة"}`}
            className="h-14 sm:h-20 mb-2 sm:mb-3 object-contain transition-transform group-hover:scale-105"
          />
          <h1 className="font-bold text-base sm:text-2xl text-gray-900">
            {orgSettings?.organizationName || "بوابة منارة"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            نموذج التسجيل وتقديم الطلبات والتبرعات
          </p>
        </Link>

        <Card className="border border-slate-200/80 shadow-lg sm:shadow-xl rounded-2xl sm:rounded-3xl bg-white overflow-hidden py-0 gap-0 p-0">
          {/* شريط الإجراء العلوي والرجوع */}
          {selectedRole && (
            <div className="bg-slate-100/90 border-b border-slate-200 px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {selectedRole === "donor" && !donorType
                    ? "الخطوة 2: تحديد نوع التبرع"
                    : selectedRole === "imam" || selectedRole === "muezzin"
                      ? `مسار ${selectedRole === "imam" ? "الإمام" : "المؤذن"} (تسجيل حساب رسمي)`
                      : selectedRole === "donor"
                        ? `مسار المتبرع (${donorType === "land" ? "تبرع بأرض" : donorType === "in_kind" ? "تبرع عيني" : donorType === "financial" ? "تبرع مالي" : "تبرع آخر"})`
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
                className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl border-primary/30 bg-white hover:bg-primary/10 hover:border-primary text-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all shrink-0 group active:scale-95"
              >
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
                <span>{donorType ? "عودة" : "تغيير الصفة"}</span>
              </Button>
            </div>
          )}

          <CardContent className="p-4 sm:p-7 md:p-8">
            {/* ============================================================
                المرحلة 1: السؤال الرئيسي (تحديد الصفة والعلاقة بالمسجد)
               ============================================================ */}
            {!selectedRole && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center space-y-1.5 sm:space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    الخطوة 1: تحديد الصفة والعلاقة بالمسجد
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900">
                    اذكر الصفة (علاقتك بالمسجد)
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                    يرجى اختيار صفتك لتوجيهك للمسار المخصص وتقديم الخدمة المطلوبة بأفضل صورة
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 pt-1 sm:pt-2">
                  {/* 1. إمام */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("imam")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-teal-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-teal-200/80">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-teal-900 text-sm sm:text-base">إمام</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        إمام مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                      </p>
                    </div>
                  </button>

                  {/* 2. مؤذن */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("muezzin")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-amber-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-amber-200/80">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-amber-900 text-sm sm:text-base">مؤذن</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        مؤذن مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                      </p>
                    </div>
                  </button>

                  {/* 3. متبرع */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("donor")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-200/80">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-900 text-sm sm:text-base">متبرع</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        الرغبة في تقديم تبرع (أرض، تبرع عيني، تبرع مالي، أو غير ذلك)
                      </p>
                    </div>
                  </button>

                  {/* 4. أخرى */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("other")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-blue-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-200/80">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-900 text-sm sm:text-base">أخرى</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
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
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center space-y-1.5 sm:space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/70">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    مسار المتبرع
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900">
                    حدد نوع التبرع
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                    اختر نوع التبرع لتوجيه طلبك إلى القسم المختص بالجمعية مباشرة
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 pt-1 sm:pt-2">
                  {/* متبرع بأرض */}
                  <button
                    type="button"
                    onClick={() => setDonorType("land")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-200/80">
                      <LandPlot className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-900 text-sm sm:text-base">متبرع بأرض</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        تبرع بقطعة أرض لبناء أو توسعة مسجد
                      </p>
                    </div>
                  </button>

                  {/* متبرع بتبرع عيني */}
                  <button
                    type="button"
                    onClick={() => setDonorType("in_kind")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-teal-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-teal-200/80">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-teal-900 text-sm sm:text-base">متبرع بتبرع عيني</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        مواد بناء، تجهيزات، مكيفات، فرش، أنظمة صوت أو مياه
                      </p>
                    </div>
                  </button>

                  {/* متبرع بتبرع مالي */}
                  <button
                    type="button"
                    onClick={() => setDonorType("financial")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-amber-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-amber-200/80">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-amber-900 text-sm sm:text-base">متبرع بتبرع مالي</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        تحويل بنكي لحساب الجمعية أو عبر موقع التبرعات الإلكتروني
                      </p>
                    </div>
                  </button>

                  {/* أخرى */}
                  <button
                    type="button"
                    onClick={() => setDonorType("other")}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200/90 hover:border-blue-500 bg-white hover:bg-slate-50/60 text-right transition-all flex items-start gap-3 sm:gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-200/80">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-900 text-sm sm:text-base">تبرع آخر</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
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
                      إثبات الصفة الرسمية <span className="text-destructive">*</span>
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
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && ["name", "phone", "email", "customRoleTitle", "landCustomRole"].includes(f.id)) || [
                      { id: "name", label: "الاسم الكامل", type: "text", required: true, placeholder: "أدخل اسمك الكريم" },
                      { id: "phone", label: "رقم الجوال", type: "phone", required: true, placeholder: "05XXXXXXXX", helpText: "صيغة: 05XXXXXXXX (10 أرقام)" },
                      { id: "email", label: "البريد الإلكتروني", type: "email", required: true, placeholder: "name@example.com" },
                      { id: "customRoleTitle", label: "الصفة أو العلاقة بالمسجد", type: "text", required: true, placeholder: "مثال: مالك الأرض، فاعل خير، وكيل المالك..." },
                    ]).map(renderDynamicField)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && !["name", "phone", "email", "customRoleTitle", "landCustomRole"].includes(f.id)) || [
                      { id: "landArea", label: "مساحة الأرض (م²)", type: "text", required: true, placeholder: "مثال: 900 م²" },
                      { id: "landDimensions", label: "أبعاد وأطوال الأرض", type: "text", required: true, placeholder: "مثال: 30م × 30م، على شارعين" },
                      { id: "landLocation", label: "موقع الأرض / الحي", type: "text", required: true, placeholder: "مثال: حي الروابي، بالقرب من..." },
                      { id: "landOwner", label: "المالك الحالي للأرض", type: "text", required: true, placeholder: "اسم المالك أو صفة الواقف" },
                      { id: "landDetails", label: "معلومات وملاحظات إضافية تساعد الجمعية على دراسة التبرع", type: "textarea", required: true, placeholder: "اكتب هنا أي معلومات إضافية تساعد الجمعية على دراسة وتقييم التبرع..." },
                    ]).map(renderDynamicField)}
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
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && ["name", "phone", "email", "customRoleTitle", "inKindCustomRole"].includes(f.id)) || [
                      { id: "name", label: "الاسم الكامل", type: "text", required: true, placeholder: "أدخل اسمك الكريم" },
                      { id: "phone", label: "رقم الجوال", type: "phone", required: true, placeholder: "05XXXXXXXX", helpText: "صيغة: 05XXXXXXXX (10 أرقام)" },
                      { id: "email", label: "البريد الإلكتروني", type: "email", required: true, placeholder: "name@example.com" },
                      { id: "customRoleTitle", label: "الصفة أو العلاقة بالمسجد", type: "text", required: true, placeholder: "مثال: متبرع، مورد، فاعل خير، جار المسجد..." },
                    ]).map(renderDynamicField)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && !["name", "phone", "email", "customRoleTitle", "inKindCustomRole"].includes(f.id)) || [
                      { id: "inKindItemType", label: "نوع التبرع العيني", type: "text", required: true, placeholder: "مثال: مكيفات، سجاد، إنارة، مواد بناء..." },
                      { id: "inKindQuantity", label: "الكميات المتاحة", type: "text", required: true, placeholder: "مثال: 5 أجهزة، 200 م²..." },
                      { id: "inKindCondition", label: "حالة المواد", type: "text", required: true, placeholder: "مثال: جديدة، مستعملة بحالة ممتازة..." },
                      { id: "inKindLocation", label: "موقع المواد / الاستلام", type: "text", required: true, placeholder: "مثال: مستودع في حي الروابي، أبها..." },
                      { id: "inKindDeliveryAvailable", label: "هل يوجد إمكانية لنقل وتوصيل التبرع العيني ؟", type: "checkbox", helpText: "تتوفر إمكانية النقل والتوصيل لموقع المسجد أو مستودع الجمعية" },
                      { id: "inKindDetails", label: "معلومات وملاحظات إضافية عن التبرع العيني (اختياري)", type: "textarea", placeholder: "اكتب هنا أي تفاصيل أو مواصفات إضافية عن المواد أو التجهيزات..." },
                    ]).map(renderDynamicField)}
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
                    نشكر لكم رغبتكم الكريمة في دعم بيوت الله وعمارتها. يمكنكم التبرع من خلال التحويل المباشر إلى الحساب البنكي الرسمي المعتمد أو عبر موقع التبرعات الإلكتروني.
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

                {/* الخيار الثاني: التبرع عبر موقع التبرعات الإلكتروني */}
                <div className="rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-200/80">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">الخيار الثاني: موقع التبرعات الإلكتروني</h4>
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
                    <span>الانتقال إلى موقع التبرعات الإلكتروني</span>
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
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && ["name", "phone", "email"].includes(f.id)) || [
                      { id: "name", label: "الاسم الكامل", type: "text", required: true, placeholder: "أدخل اسمك الكريم" },
                      { id: "phone", label: "رقم الجوال", type: "phone", required: true, placeholder: "05XXXXXXXX", helpText: "صيغة: 05XXXXXXXX (10 أرقام)" },
                      { id: "donor-email", label: "البريد الإلكتروني", type: "email", required: true, placeholder: "name@example.com" },
                    ]).map(renderDynamicField)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && !["name", "phone", "email"].includes(f.id)) || [
                      { id: "customRoleTitle", label: "الصفة أو العلاقة بالمسجد", type: "text", required: true, placeholder: "مثال: فاعل خير، رجل أعمال، ممثل جهة أو شركة، جار المسجد..." },
                      { id: "donorOtherDetails", label: "تفاصيل التبرع المقترح", type: "textarea", required: true, placeholder: "اكتب هنا تفاصيل نوع التبرع أو المبادرة أو الشراكة المقترحة للجمعية..." },
                    ]).map(renderDynamicField)}
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
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && ["name", "phone", "email"].includes(f.id)) || [
                      { id: "name", label: "الاسم الكامل", type: "text", required: true, placeholder: "أدخل اسمك الكريم" },
                      { id: "phone", label: "رقم الجوال", type: "phone", required: true, placeholder: "05XXXXXXXX", helpText: "صيغة: 05XXXXXXXX (10 أرقام)" },
                      { id: "email", label: "البريد الإلكتروني", type: "email", required: true, placeholder: "name@example.com" },
                    ]).map(renderDynamicField)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(registrationFormConfig?.fields?.filter((f: any) => f.isActive !== false && !["name", "phone", "email"].includes(f.id)) || [
                      { id: "customRoleTitle", label: "الصفة أو العلاقة بالمسجد", type: "text", required: true, placeholder: "مثال: جار المسجد، أحد جماعة المسجد، ممثل جهة، صاحب استفسار..." },
                      { id: "requestDetails", label: "تفاصيل الطلب أو الاستفسار", type: "textarea", required: true, placeholder: "اكتب هنا تفاصيل طلبك، الاستفسار، أو الخدمة المطلوبة للمسجد..." },
                    ]).map(renderDynamicField)}
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
