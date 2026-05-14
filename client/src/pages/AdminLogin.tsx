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

  useEffect(() => {
    // التحقق من وجود رسالة إيقاف في الرابط
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "suspended") {
      setIsSuspended(true);
    }
  }, []);

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
    onSuccess: () => {
      toast.success("تم تسجيل الدخول بنجاح");
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
    
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    loginMutation.mutate({
      email,
      password,
    });
  };

  // استخدام اللون الرئيسي من الهوية البصرية أو الافتراضي
  const primaryColor = orgSettings?.colorPrimary1 || "#09707e";
  const secondaryColor = orgSettings?.colorPrimary2 || "#0D9488";

  // الشعار: الشعار الثانوي (الأبيض/الأيقونة) للخلفيات الداكنة، ثم الرئيسي، ثم الافتراضي
  const logoSrc = orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo.svg";

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor}cc 100%)`
      }}
    >
      <Card className="w-full max-w-md p-8 bg-white/95 shadow-2xl">
        {/* الشعار */}
        <div className="text-center mb-8">
          <div 
            className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            <img 
              src={logoSrc}
              alt="شعار بوابة تمام" 
              className="h-14 w-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.svg";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            دخول الموظفين
          </h1>
          <p className="text-gray-600">
            تسجيل دخول للموظفين والمسؤولين
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
            className="w-full text-white font-semibold"
            style={{ backgroundColor: primaryColor }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

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
