import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // حالات استعادة كلمة المرور
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // طفرات استعادة كلمة المرور
  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "تم إرسال رمز التحقق");
      setForgotStep(2);
      setResendCooldown(60);
    },
    onError: (error) => {
      toast.error(error.message || "فشل إرسال رمز التحقق");
    }
  });

  const verifyCodeMutation = trpc.auth.verifyResetCode.useMutation({
    onSuccess: () => {
      toast.success("رمز التحقق صحيح");
      setForgotStep(3);
    },
    onError: (error) => {
      toast.error(error.message || "رمز التحقق غير صحيح");
    }
  });

  const resetPasswordMutation = trpc.auth.resetPasswordWithCode.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "تم تغيير كلمة المرور بنجاح");
      setMode("login");
      setForgotStep(1);
      setForgotEmail("");
      setResetCode("");
      setCodeDigits(["", "", "", ""]);
      setNewPassword("");
      setConfirmNewPassword("");
      setResendCooldown(0);
    },
    onError: (error) => {
      toast.error(error.message || "فشل إعادة تعيين كلمة المرور");
    }
  });

  // مؤقت للعد التنازلي لإعادة إرسال الرمز
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);



  // إعادة توجيه المستخدم إذا كان مسجلاً للدخول بالفعل
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const path = user?.role === "service_requester" ? "/requester" : "/";
      setLocation(path, { replace: true });
    }
  }, [isAuthenticated, authLoading, user, setLocation]);

  // جلب إعدادات الجمعية لعرض الشعار والألوان
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success("تم تسجيل الدخول بنجاح");
      if (data?.user?.role === "quick_response") {
        localStorage.setItem("quick-response-lang", "en");
      }
      setLocation("/", { replace: true });
    },
    onError: (error) => {
      if (error.message?.includes("ROLE_SUSPENDED") || error.message?.includes("موقوف") || error.message?.includes("مراجعة الإدارة")) {
        setIsSuspended(true);
      } else {
        toast.error(error.message || "فشل تسجيل الدخول");
      }
    },
  });

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuspended(false);
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    loginMutation.mutate({
      email: trimmedEmail,
      password,
    });
  };

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    requestResetMutation.mutate({ email: trimmed });
  };

  const handleDigitChange = (value: string, index: number) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = cleanVal;
    setCodeDigits(newDigits);
    setResetCode(newDigits.join(""));

    // Focus next box
    if (cleanVal && index < 3) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = resetCode.trim();
    if (trimmedCode.length !== 4) {
      toast.error("يجب أن يتكون رمز التحقق من 4 أرقام");
      return;
    }
    verifyCodeMutation.mutate({ email: forgotEmail.trim(), code: trimmedCode });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }
    resetPasswordMutation.mutate({
      email: forgotEmail.trim(),
      code: resetCode.trim(),
      newPassword,
    });
  };

  // استخدام اللون الرئيسي من الهوية البصرية أو الافتراضي
  const primaryColor = orgSettings?.colorPrimary1 || "#09707e";
  const secondaryColor = orgSettings?.colorPrimary2 || "#0D9488";

  // الشعار: الشعار الثانوي (الأبيض/الأيقونة) للخلفيات الداكنة، ثم الرئيسي، ثم الافتراضي
  const logoSrc = orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo.svg";

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-6"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor}cc 100%)`
      }}
    >
      <Card className="w-full max-w-[95%] sm:max-w-md p-5 sm:p-8 bg-white/95 shadow-2xl rounded-2xl sm:rounded-3xl transition-all duration-300" dir="rtl">
        {/* الشعار */}
        <div className="text-center mb-6 sm:mb-8 text-right">
          <div 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center overflow-hidden shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <img 
              src={logoSrc}
              alt={`شعار ${orgSettings?.organizationName || "بوابة تمام"}`} 
              className="h-10 w-10 sm:h-14 sm:w-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.svg";
              }}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 text-center">
            {mode === "login" ? "دخول الموظفين" : "استعادة كلمة المرور"}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 text-center">
            {mode === "login" 
              ? "تسجيل دخول للموظفين والمسؤولين" 
              : forgotStep === 1 
                ? "أدخل بريدك الإلكتروني لإرسال رمز التحقق"
                : forgotStep === 2 
                  ? "أدخل رمز التحقق المكون من 4 أرقام"
                  : "قم بتعيين كلمة المرور الجديدة"
            }
          </p>
        </div>

        {isSuspended && mode === "login" && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>عذراً، لا يمكن تسجيل الدخول</AlertTitle>
            <AlertDescription>
              هذا الدور موقوف حالياً، يرجى مراجعة الإدارة
            </AlertDescription>
          </Alert>
        )}

        {mode === "login" ? (
          <form onSubmit={handleSubmit} className="space-y-6 text-right">
            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@tamam.sa"
                required
                className="text-right"
              />
            </div>

            {/* كلمة المرور */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  كلمة المرور
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setMode("forgot");
                    setForgotStep(1);
                  }}
                  className="text-xs hover:underline focus:outline-none"
                  style={{ color: primaryColor }}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="text-right pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* زر تسجيل الدخول */}
            <Button
              type="submit"
              className="w-full text-white font-semibold h-11 rounded-xl"
              style={{ backgroundColor: primaryColor }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        ) : (
          <div>
            {forgotStep === 1 && (
              <form onSubmit={handleRequestReset} className="space-y-6 text-right">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني المخصص للموظف
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@tamam.sa"
                    required
                    className="text-right"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full text-white font-semibold h-11 rounded-xl"
                  style={{ backgroundColor: primaryColor }}
                  disabled={requestResetMutation.isPending}
                >
                  {requestResetMutation.isPending ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}
                </Button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-sm hover:underline font-medium"
                    style={{ color: primaryColor }}
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-6 text-right">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 justify-center text-sm font-semibold">
                    <Lock className="w-4 h-4 text-primary" />
                    أدخل رمز التحقق المكون من 4 أرقام
                  </Label>
                  
                  <div className="flex justify-center gap-3 py-2" dir="ltr">
                    {codeDigits.map((digit, idx) => (
                      <Input
                        key={idx}
                        id={`digit-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(e.target.value, idx)}
                        onKeyDown={(e) => handleDigitKeyDown(e, idx)}
                        required
                        className="w-12 h-12 text-center text-xl font-bold border-2 border-slate-400 dark:border-slate-600 rounded-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-background text-foreground"
                      />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-1">
                    تم إرسال رمز التحقق إلى {forgotEmail}
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full text-white font-semibold h-11 rounded-xl"
                  style={{ backgroundColor: primaryColor }}
                  disabled={verifyCodeMutation.isPending}
                >
                  {verifyCodeMutation.isPending ? "جاري التحقق..." : "التحقق من الرمز"}
                </Button>
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (resendCooldown === 0) {
                        requestResetMutation.mutate({ email: forgotEmail });
                      }
                    }}
                    disabled={resendCooldown > 0 || requestResetMutation.isPending}
                    className="text-xs hover:underline disabled:opacity-55 font-semibold"
                    style={{ color: primaryColor }}
                  >
                    {resendCooldown > 0 
                      ? `إعادة إرسال الرمز خلال (${resendCooldown} ثانية)` 
                      : "إعادة إرسال الرمز"
                    }
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-6 text-right">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                      required
                      className="text-right pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    تأكيد كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور لتأكيدها"
                      required
                      className="text-right pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-semibold h-11 rounded-xl"
                  style={{ backgroundColor: primaryColor }}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* رابط العودة */}
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-sm hover:underline"
            style={{ color: primaryColor }}
          >
            ← العودة إلى الصفحة الرئيسية
          </a>
        </div>
      </Card>
    </div>
  );
}
