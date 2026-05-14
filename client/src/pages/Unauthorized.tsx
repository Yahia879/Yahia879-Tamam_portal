import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldOff, ArrowRight, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * صفحة 403 - غير مصرح بالوصول
 * تظهر عندما يحاول المستخدم الوصول لصفحة لا يملك صلاحية عليها
 */
export default function Unauthorized() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user?.role === "service_requester") {
      setLocation("/requester");
    } else {
      setLocation("/dashboard");
    }
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-lg mx-4 shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-pulse scale-150" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-red-500 shadow-lg">
                <ShieldOff className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-2">403</h1>

          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
            غير مصرح بالوصول
          </h2>

          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-sm mx-auto">
            ليس لديك صلاحية للوصول إلى هذه الصفحة.
            <br />
            يرجى التواصل مع مدير النظام في حال كنت تعتقد أن هذا خطأ.
          </p>

          <div
            id="unauthorized-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoBack}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="px-6 py-2.5 rounded-lg transition-all duration-200"
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
