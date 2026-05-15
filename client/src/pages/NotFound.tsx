import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-0">
      <Card className="w-full max-w-[95%] sm:max-w-lg shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transition-all duration-300">
        <CardContent className="pt-8 sm:pt-10 pb-8 sm:pb-10 px-5 sm:px-8 text-center">
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse scale-125 sm:scale-150" />
              <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-600 shadow-lg">
                <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">404</h1>

          <h2 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
            عذراً، الصفحة غير موجودة
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 leading-relaxed max-w-sm mx-auto">
            الصفحة التي تبحث عنها قد تم نقلها، حذفها، أو أنها غير موجودة حالياً.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="w-full sm:w-auto gradient-primary text-white h-11 sm:h-auto px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-bold border-0"
            >
              <Home className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
