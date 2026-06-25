import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Phone, Lock, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    // التحقق من وجود رسالة إيقاف في الرابط
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "suspended") {
      setIsSuspended(true);
    }
  }, []);

  // إعادة توجيه المستخدم إذا كان مسجلاً للدخول بالفعل
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const path = user?.role === "service_requester" ? "/requester" : "/dashboard";
      setLocation(path, { replace: true });
    }
  }, [isAuthenticated, loading, user, setLocation]);

  // جلب إعدادات الجمعية لعرض الشعار والألوان
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success("تم تسجيل الدخول بنجاح");
      if (data.user?.role === "quick_response") {
        localStorage.setItem("quick-response-lang", "en");
      }
      // توجيه المستفيد لصفحته الخاصة، والموظفين للوحة التحكم مع استبدال السجل لمنع الرجوع
      if (data.user?.role === "service_requester") {
        setLocation("/requester", { replace: true });
      } else {
        setLocation("/dashboard", { replace: true });
      }
    },
    onError: (error) => {
      if (error.message?.includes("ROLE_SUSPENDED") || error.message?.includes("موقوف") || error.message?.includes("مراجعة الإدارة")) {
        setIsSuspended(true);
        toast.error("هذا الدور موقوف حالياً، يرجى مراجعة الإدارة");
      } else {
        toast.error(error.message || "فشل تسجيل الدخول");
      }
    },
  });

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuspended(false);
    
    if (!phone || !password) {
      toast.error("يرجى إدخال رقم الجوال وكلمة المرور");
      return;
    }

    // التحقق من صيغة رقم الجوال
    if (!/^05\d{8}$/.test(phone)) {
      toast.error("يرجى إدخال رقم جوال صحيح (05XXXXXXXX)");
      return;
    }

    loginMutation.mutate({
      phone,
      password,
    });
  };

  const primaryColor = orgSettings?.colorPrimary1 || "#0d9488";
  const secondaryColor = orgSettings?.colorPrimary2 || "#0f766e";

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor}cc 100%)`
      }}
    >
      <Card className="w-full max-w-md p-6 sm:p-8 bg-white/95 shadow-xl">
        {/* الشعار */}
        <div className="text-center mb-6 sm:mb-8">
          <img 
            src={orgSettings?.logoUrl || "/logo.svg"} 
            alt="شعار بوابة تمام" 
            className="h-16 sm:h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            تسجيل دخول المستفيدين
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            سجل دخولك للوصول إلى حسابك وطلباتك
          </p>
        </div>

        {isSuspended && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>عذراً، لا يمكن تسجيل الدخول</AlertTitle>
            <AlertDescription>
              هذا الدور موقوف حالياً، يرجى مراجعة الإدارة
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* رقم الجوال */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              رقم الجوال
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              required
              maxLength={10}
              className="text-right"
            />
            <p className="text-xs text-gray-500">
              أدخل رقم الجوال بصيغة 05XXXXXXXX (10 أرقام)
            </p>
          </div>

          {/* كلمة المرور */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              كلمة المرور
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-right pr-10"
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
            className="w-full text-white"
            style={{ backgroundColor: primaryColor }}
            disabled={loginMutation.isPending}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = secondaryColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = primaryColor;
            }}
          >
            {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        {/* روابط إضافية */}
        <div className="mt-6 space-y-3 text-center">
          <p className="text-gray-600 text-sm">
            ليس لديك حساب؟{" "}
            <a href="/register" className="font-medium hover:underline" style={{ color: primaryColor }}>
              سجل الآن
            </a>
          </p>
          <a href="/" className="block text-gray-500 hover:text-gray-700 text-sm">
            ← العودة إلى الصفحة الرئيسية
          </a>
        </div>
      </Card>
    </div>
  );
}
