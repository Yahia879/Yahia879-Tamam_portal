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

// مدن ومحافظات ومراكز منطقة عسير فقط
const cities = [
  "أبها", "خميس مشيط", "بيشة", "محايل عسير", "النماص",
  "تثليث", "ظهران الجنوب", "سراة عبيدة", "رجال ألمع", "بلقرن",
  "أحد رفيدة", "تنومة", "بارق", "المجاردة", "طريب",
  "البرك", "الحرجة", "الأمواه", "السودة", "بللحمر",
  "بللسمر", "طبب", "مربة", "القحمة", "وادي بن هشبل",
  "تمنية", "ثلوث المنظر", "بحر أبو سكينة", "خاط", "ثربان",
  "البشائر", "خثعم", "باشوت", "الجوة", "الفرشة",
  "وادي الحيا", "المضة", "الصبيخة", "العرين", "الخنقة",
  "ذهبان", "العمائر", "علب", "منصبة", "الحمضة",
  "جاش", "الزرق",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ في التسجيل");
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
    setFormData((prev) => ({ ...prev, proofFile: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    // رفع الملف إلى S3 إذا كان موجوداً
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
      } catch (error) {
        toast.error("حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.");
        return;
      }
    }

    registerMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      nationalId: formData.nationalId || undefined,
      city: formData.city || undefined,
      requesterType: formData.requesterType === "other" ? formData.otherType : formData.requesterType || undefined,
      proofDocument: proofFileUrl,
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">تم التسجيل بنجاح!</h2>
            <p className="text-muted-foreground mb-6">
              تم إنشاء حسابك بنجاح. يرجى انتظار اعتماد حسابك من قبل الإدارة.
              سيتم إشعارك عبر البريد الإلكتروني عند تفعيل حسابك.
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full gradient-primary text-white">
                  الذهاب لتسجيل الدخول
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      {/* النموذج في الوسط */}
      <div className="w-full max-w-lg p-8">
        <div className="w-full">
          {/* الشعار */}
          <Link href="/" className="flex flex-col items-center mb-8">
            <img
              src="/logo.svg"
              alt="شعار بوابة تمام"
              className="h-20 mb-3"
            />
            <div className="text-center">
              <h1 className="font-bold text-xl text-foreground">بوابة تمام</h1>
              <p className="text-sm text-muted-foreground">للعناية بالمساجد</p>
            </div>
          </Link>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
              <CardDescription>
                سجل كطالب خدمة للاستفادة من خدمات البوابة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* الاسم الكامل */}
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="أدخل اسمك الكامل"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                {/* البريد الإلكتروني */}
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="text-left"
                    dir="ltr"
                  />
                </div>

                {/* رقم الجوال ورقم الهوية */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال <span className="text-destructive">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      pattern="05[0-9]{8}"
                      maxLength={10}
                      className="text-left"
                      dir="ltr"
                    />
                    {formData.phone && !/^05[0-9]{8}$/.test(formData.phone) && (
                      <p className="text-xs text-destructive">يجب أن يكون الرقم بصيغة 05XXXXXXXX (10 أرقام)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationalId">رقم الهوية</Label>
                    <Input
                      id="nationalId"
                      placeholder="رقم الهوية الوطنية"
                      value={formData.nationalId}
                      onChange={(e) => handleChange("nationalId", e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* المدينة وصفة طالب الخدمة */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">المدينة</Label>
                    <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requesterType">صفة طالب الخدمة <span className="text-destructive">*</span></Label>
                    <Select value={formData.requesterType} onValueChange={(value) => handleChange("requesterType", value)}>
                      <SelectTrigger>
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
                    <Label htmlFor="otherType">حدد صفتك <span className="text-destructive">*</span></Label>
                    <Input
                      id="otherType"
                      placeholder="أدخل صفتك"
                      value={formData.otherType}
                      onChange={(e) => handleChange("otherType", e.target.value)}
                    />
                  </div>
                )}

                {/* حقل رفع المرفق للإمام والمؤذن */}
                {["imam", "muezzin"].includes(formData.requesterType) && (
                  <div className="space-y-2">
                    <Label htmlFor="proofFile">رفع مرفق يثبت الصفة <span className="text-destructive">*</span></Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
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
                            <div className="text-green-600 font-medium">
                              ✓ {formData.proofFile.name}
                            </div>
                          ) : (
                            <>
                              <p className="mb-1">اضغط لاختيار ملف أو اسحبه هنا</p>
                              <p className="text-xs">PDF، صور، أو مستندات</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* كلمة المرور */}
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="8 أحرف على الأقل"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      minLength={8}
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* تأكيد كلمة المرور */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="أعد إدخال كلمة المرور"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      required
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
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
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    تسجيل الدخول
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
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
