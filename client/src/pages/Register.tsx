import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const requesterTypes = [
  // ... (rest of constants)
  { value: "imam", label: "إمام" },
  { value: "muezzin", label: "مؤذن" },
  { value: "donor", label: "متبرع" },
  { value: "other", label: "أخرى" },
];



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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // إعادة توجيه المستخدم إذا كان مسجلاً للدخول بالفعل
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const path = user?.role === "service_requester" ? "/requester" : "/dashboard";
      setLocation(path, { replace: true });
    }
  }, [isAuthenticated, loading, user, setLocation]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nationalId: "",
    city: "",
    requesterType: "",
    otherType: "",
    proofFile: null as File | null,
    password: "",
    confirmPassword: "",
  });

  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const dynamicCities = allCategories
    .filter((cat: any) => cat.type === "city" && cat.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error.message) || "حدث خطأ في التسجيل");
    },
  });

  const handleChange = (field: string, value: string) => {
    if (field === "nationalId") {
      // السماح بالأرقام فقط
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData((prev) => ({ ...prev, [field]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.");
      e.target.value = "";
      return;
    }
    setFormData((prev) => ({ ...prev, proofFile: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الاسم
    const trimmedName = formData.name.trim();
    if (trimmedName.length < 2) {
      toast.error("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }
    if (trimmedName.length > 60) {
      toast.error("الاسم يجب ألا يتجاوز 60 حرف");
      return;
    }

    // التحقق من البريد الإلكتروني
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("البريد الإلكتروني غير صالح");
      return;
    }

    // التحقق من طول كلمة المرور
    if (formData.password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    // التحقق من تطابق كلمة المرور
    if (formData.password !== formData.confirmPassword) {
      toast.error("كلمة المرور وتأكيد كلمة المرور غير متطابقين");
      return;
    }

    // التحقق من صحة رقم الجوال
    if (!/^05[0-9]{8}$/.test(formData.phone)) {
      toast.error("رقم الجوال يجب أن يكون بصيغة 05XXXXXXXX (10 أرقام)");
      return;
    }

    // التحقق من المرفق عند اختيار إمام أو مؤذن
    if (["imam", "muezzin"].includes(formData.requesterType) && !formData.proofFile) {
      toast.error("يجب رفع مرفق يثبت الصفة");
      return;
    }

    // التحقق من الصفة الأخرى
    if (formData.requesterType === "other" && !formData.otherType.trim()) {
      toast.error("يجب إدخال الصفة");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. التحقق من توفر البريد الإلكتروني ورقم الجوال في قاعدة البيانات قبل رفع المرفق
      const availability = await utils.client.auth.checkCredentialsAvailable.query({
        email: formData.email,
        phone: formData.phone,
      });

      if (!availability.available) {
        if (availability.reason === "email") {
          toast.error("البريد الإلكتروني مسجل مسبقاً");
        } else if (availability.reason === "phone") {
          toast.error("رقم الجوال مسجل مسبقاً");
        }
        setIsSubmitting(false);
        return;
      }

      // 2. رفع الملف بعد الاطمئنان لعدم وجود أخطاء في المدخلات أو تكرار بالبيانات
      let proofFileUrl: string | undefined = undefined;
      if (formData.proofFile) {
        try {
          const formDataForUpload = new FormData();
          formDataForUpload.append('file', formData.proofFile);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formDataForUpload,
          });

          if (!response.ok) {
            throw new Error('فشل رفع الملف');
          }

          const data = await response.json();
          proofFileUrl = data.url;
        } catch (uploadErr) {
          toast.error("حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.");
          setIsSubmitting(false);
          return;
        }
      }

      // 3. إتمام عملية التسجيل في قاعدة البيانات
      await registerMutation.mutateAsync({
        name: trimmedName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        nationalId: formData.nationalId || undefined,
        city: formData.city || undefined,
        requesterType: formData.requesterType === "other" ? formData.otherType : formData.requesterType || undefined,
        proofDocument: proofFileUrl,
      });
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-muted/30">
        <Card className="w-full max-w-[95%] sm:max-w-md border-0 shadow-lg rounded-2xl sm:rounded-3xl transition-all duration-300">
          <CardContent className="pt-8 pb-8 px-5 sm:px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">تم التسجيل بنجاح!</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              تم إنشاء حسابك بنجاح. يرجى انتظار اعتماد حسابك من قبل الإدارة.
              سيتم إشعارك عبر البريد الإلكتروني عند تفعيل حسابك.
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full gradient-primary text-white font-semibold">
                  الذهاب لتسجيل الدخول
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full font-medium">
                  العودة للصفحة الرئيسية
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-2 sm:p-4 md:p-8">
      {/* النموذج في الوسط */}
      <div className="w-full max-w-lg">
        <div className="w-full">
          {/* الشعار */}
          <Link href="/" className="flex flex-col items-center mb-6 sm:mb-8">
            <img
              src="/logo.svg"
              alt="شعار بوابة تمام"
              className="h-16 sm:h-20 mb-3 object-contain"
            />
            <div className="text-center">
              <h1 className="font-bold text-lg sm:text-xl text-foreground">بوابة تمام</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">للعناية بالمساجد</p>
            </div>
          </Link>

          <Card className="border-0 shadow-xl rounded-2xl sm:rounded-3xl transition-all duration-300">
            <CardHeader className="space-y-1 pb-4 px-5 sm:px-8 pt-6 sm:pt-8">
              <CardTitle className="text-xl sm:text-2xl font-bold">إنشاء حساب جديد</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                سجل كطالب خدمة للاستفادة من خدمات البوابة
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* الاسم الكامل */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">الاسم الكامل <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="أدخل اسمك الكامل"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    className="h-10 sm:h-11"
                  />
                  {formData.name.trim().length > 60 && (
                    <p className="text-[10px] sm:text-xs text-destructive">الاسم يجب ألا يتجاوز 60 حرف</p>
                  )}
                </div>

                {/* البريد الإلكتروني */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="text-left h-10 sm:h-11"
                    dir="ltr"
                  />
                </div>

                {/* رقم الجوال ورقم الهوية */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">رقم الجوال <span className="text-destructive">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      pattern="05[0-9]{8}"
                      maxLength={10}
                      className="text-left h-10 sm:h-11"
                      dir="ltr"
                    />
                    {formData.phone && !/^05[0-9]{8}$/.test(formData.phone) && (
                      <p className="text-[10px] sm:text-xs text-destructive">يجب أن يكون الرقم بصيغة 05XXXXXXXX (10 أرقام)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationalId" className="text-sm font-medium">رقم الهوية</Label>
                    <Input
                      id="nationalId"
                      placeholder="رقم الهوية الوطنية"
                      value={formData.nationalId}
                      onChange={(e) => handleChange("nationalId", e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="text-left h-10 sm:h-11"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* المدينة وصفة طالب الخدمة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">المدينة</Label>
                    <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="اختر المدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicCities.map((city: any) => (
                          <SelectItem key={city.name} value={city.nameAr || city.name}>{city.nameAr || city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requesterType" className="text-sm font-medium">صفة طالب الخدمة <span className="text-destructive">*</span></Label>
                    <Select value={formData.requesterType} onValueChange={(value) => handleChange("requesterType", value)}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="اختر الصفة" />
                      </SelectTrigger>
                      <SelectContent>
                        {requesterTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* حقل الصفة الأخرى */}
                {formData.requesterType === "other" && (
                  <div className="space-y-2">
                    <Label htmlFor="otherType" className="text-sm font-medium">حدد صفتك <span className="text-destructive">*</span></Label>
                    <Input
                      id="otherType"
                      placeholder="أدخل صفتك"
                      value={formData.otherType}
                      onChange={(e) => handleChange("otherType", e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                )}

                {/* حقل رفع المرفق للإمام والمؤذن */}
                {["imam", "muezzin"].includes(formData.requesterType) && (
                  <div className="space-y-2">
                    <Label htmlFor="proofFile" className="text-sm font-medium">رفع مرفق يثبت الصفة <span className="text-destructive">*</span></Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/10">
                      <input
                        id="proofFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="proofFile" className="cursor-pointer block">
                        <div className="text-sm text-muted-foreground">
                          {formData.proofFile ? (
                            <div className="text-green-600 font-medium flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="truncate max-w-[200px]">{formData.proofFile.name}</span>
                            </div>
                          ) : (
                            <>
                              <p className="mb-1 font-medium">اضغط لاختيار ملف أو اسحبه هنا</p>
                              <p className="text-[10px] sm:text-xs">PDF، صور، أو مستندات</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* كلمة المرور */}
                <div className="space-y-2">
                  <Label htmlFor="password" title="8 أحرف على الأقل" className="text-sm font-medium">كلمة المرور <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="8 أحرف على الأقل"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      minLength={8}
                      className="pl-10 h-10 sm:h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* تأكيد كلمة المرور */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" title="أعد إدخال كلمة المرور" className="text-sm font-medium">تأكيد كلمة المرور <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="أعد إدخال كلمة المرور"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      required
                      className="pl-10 h-10 sm:h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white h-10 sm:h-11 font-bold shadow-md hover:shadow-lg transition-all"
                  disabled={isSubmitting || registerMutation.isPending}
                >
                  {isSubmitting || registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    "إنشاء الحساب"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{" "}
                  <Link href="/login" className="text-primary hover:underline font-bold">
                    تسجيل الدخول
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-[10px] sm:text-xs text-muted-foreground px-4">
            بإنشاء حساب، أنت توافق على{" "}
            <a href="#" className="text-primary hover:underline">شروط الاستخدام</a>
            {" "}و{" "}
            <a href="#" className="text-primary hover:underline">سياسة الخصوصية</a>
          </p>
        </div>
      </div>
    </div>
  );
}
