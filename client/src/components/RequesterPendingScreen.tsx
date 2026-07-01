import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export default function RequesterPendingScreen() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/5 text-right relative overflow-hidden" dir="rtl">
      {/* Background Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-md border border-slate-200/60 dark:border-slate-800/80 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-500 hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
        <CardContent className="p-8 sm:p-10 flex flex-col items-center">
          
          {/* Status Badge */}
          <div className="mb-6 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            تحت التدقيق والمراجعة
          </div>

          {/* Pulsing Radar Alert Icon */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute w-24 h-24 bg-primary/10 dark:bg-primary/15 rounded-full animate-ping duration-[3000ms]"></div>
            <div className="absolute w-20 h-20 bg-primary/20 dark:bg-primary/20 rounded-full animate-pulse duration-[2000ms]"></div>
            <div className="relative w-16 h-16 bg-gradient-to-tr from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 dark:shadow-none transform rotate-3 hover:rotate-0 transition-transform duration-350">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Heading and Content */}
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              حسابك قيد المراجعة حالياً
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              طلب تسجيلك قيد التدقيق والمراجعة من قبل إدارة الجمعية. سنقوم بإشعارك عبر البريد الإلكتروني فور اعتماد الحساب وتفعيله.
            </p>
          </div>

          {/* Action Button */}
          <div className="w-full mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <Button
              onClick={logout}
              variant="ghost"
              className="w-full h-12 rounded-2xl font-bold text-red-500 hover:text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all gap-2"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج من الحساب
            </Button>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}
