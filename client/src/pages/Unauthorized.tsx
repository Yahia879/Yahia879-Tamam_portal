import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldOff, ArrowRight, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getUserHomeRoute } from "@/lib/routePermissions";

/**
 * صفحة 403 - غير مصرح بالوصول
 * تظهر عندما يحاول المستخدم الوصول لصفحة لا يملك صلاحية عليها
 */
export default function Unauthorized() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    // استخدام window.location.href لضمان تنظيف الكاش وإعادة بناء الصفحة بالصلاحيات الجديدة
    window.location.href = getUserHomeRoute(user);
  };

  const handleGoHome = () => {
    if (!user) {
      window.location.href = "/";
      return;
    }
    window.location.href = getUserHomeRoute(user);
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-0">
      <Card className="w-full max-w-[95%] sm:max-w-lg shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transition-all duration-300">
        <CardContent className="pt-8 sm:pt-10 pb-8 sm:pb-10 px-5 sm:px-8 text-center">
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-pulse scale-125 sm:scale-150" />
              <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-red-500 shadow-lg">
                <ShieldOff className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">403</h1>

          <h2 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
            غير مصرح بالوصول
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 leading-relaxed max-w-sm mx-auto">
            ليس لديك صلاحية للوصول إلى هذه الصفحة.
            <br className="hidden sm:block" />
            يرجى التواصل مع مدير النظام في حال كنت تعتقد أن هذا خطأ.
          </p>

          <div
            id="unauthorized-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoBack}
              className="w-full sm:w-auto gradient-primary text-white h-11 sm:h-auto px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-bold border-0"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="w-full sm:w-auto h-11 sm:h-auto px-6 py-2.5 rounded-xl transition-all duration-200 font-medium"
            >
              <Home className="w-4 h-4 ml-2" />
              الصفحة الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
