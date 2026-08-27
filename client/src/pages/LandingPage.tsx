import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  FileText, 
  Users, 
  ArrowLeft, 
  Loader2, 
  UserCheck, 
  Volume2, 
  HeartHandshake, 
  HelpCircle,
  X
} from "lucide-react";
import { getUserHomeRoute } from "@/lib/routePermissions";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function LandingPage() {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // جلب إعدادات الهوية البصرية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const primaryColor = orgSettings?.colorPrimary1 || "#0d9488";
  const secondaryColor = orgSettings?.colorPrimary2 || "#0f766e";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // إعادة توجيه المستخدم إذا كان مسجلاً للدخول بالفعل عند فتح الموقع
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      setLocation(getUserHomeRoute(user), { replace: true });
    }
  }, [isAuthenticated, loading, user, setLocation]);

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelectRole = (role: "imam" | "muezzin" | "donor" | "other") => {
    setIsBeneficiaryModalOpen(false);
    setLocation(`/register?role=${role}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">

      {/* ═══════════════ الهيدر ═══════════════ */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-background/95 backdrop-blur border-b border-border shadow-sm py-2" 
            : "bg-transparent border-transparent py-4"
        }`}
      >
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* الشعار */}
            <div className="flex items-center gap-1.5 xs:gap-3 min-w-0">
              <img 
                src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || (isScrolled ? "/logo.svg" : "/logo-white.svg")} 
                alt="شعار بوابة منارة" 
                className="w-12 h-12 xs:w-14 xs:h-14 shrink-0 object-contain transition-all duration-300" 
              />
              <div className="min-w-0">
                <h1 className={`font-bold text-xs xs:text-sm sm:text-base leading-tight transition-colors duration-300 truncate max-w-[90px] min-[380px]:max-w-[130px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-none ${isScrolled ? "text-foreground" : "text-white"}`}>
                  {orgSettings?.organizationName || "بوابة منارة"}
                </h1>
                <p className={`text-[9px] xs:text-xs transition-colors duration-300 truncate max-w-[90px] min-[380px]:max-w-[130px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-none ${isScrolled ? "text-muted-foreground" : "text-white/80"}`}>
                  {orgSettings?.organizationNameShort || "لإدارة طلبات المساجد"}
                </p>
              </div>
            </div>

            {/* أزرار الدخول */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsBeneficiaryModalOpen(true)}
                className={`px-1.5 sm:px-4 text-[10px] xs:text-xs sm:text-sm transition-all duration-300 cursor-pointer ${
                  isScrolled 
                    ? "text-muted-foreground hover:text-foreground" 
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                دخول المستفيدين
              </Button>
              <Link href="/admin/login">
                <Button 
                  size="sm" 
                  className={`shadow-sm px-1.5 sm:px-4 text-[10px] xs:text-xs sm:text-sm border-0 transition-all duration-300 cursor-pointer ${
                    isScrolled ? "text-white" : ""
                  }`}
                  style={
                    isScrolled 
                      ? { background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }
                      : { backgroundColor: "#ffffff", color: primaryColor }
                  }
                  onMouseEnter={(e) => {
                    if (isScrolled) {
                      e.currentTarget.style.filter = "brightness(1.1)";
                    } else {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isScrolled) {
                      e.currentTarget.style.filter = "none";
                    } else {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                    }
                  }}
                >
                  دخول الموظفين
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════ قسم الهيرو ═══════════════ */}
      <section
        className="relative overflow-hidden islamic-pattern"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 40%, #1e40af 100%)' }}
      >
        <div className="container mx-auto px-4 xs:px-6 pt-24 pb-12 md:pt-36 md:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            {/* الشعار الكبير */}
            <div className="flex justify-center mb-6 md:mb-8">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl border border-white/30">
                <img src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg"} alt="شعار بوابة منارة" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight">
              {orgSettings?.organizationName || "بوابة منارة"}
              <span className="block text-white/80 text-xl sm:text-2xl md:text-3xl font-medium mt-1 md:mt-2">
                {orgSettings?.organizationNameShort || "لإدارة طلبات المساجد"}
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/85 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
              يمكنكم من خلال هذه البوابة رفع طلبات الخدمات المتعلقة بمساجدكم، وسنعمل جاهدين بإذن الله على دراستها والعمل على تلبيتها قدر المستطاع، بما يخدم بيوت الله ويحقق الأثر المأمول.
            </p>

            {/* الأزرار الرئيسية */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => setIsBeneficiaryModalOpen(true)}
                className="bg-white hover:bg-white/90 font-bold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base shadow-lg hover:shadow-xl transition-all w-full sm:w-auto cursor-pointer"
                style={{ color: primaryColor }}
              >
                <FileText className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                طلب خدمة جديدة
              </Button>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/60 text-white hover:bg-white/15 font-semibold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base backdrop-blur transition-all w-full sm:w-auto cursor-pointer"
                >
                  لديك حساب؟ سجّل دخولك
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* موجة فاصلة */}
        <div className="absolute bottom-0 left-0 right-0 h-8 md:h-12 bg-background" style={{
          clipPath: "ellipse(55% 100% at 50% 100%)"
        }} />
      </section>

      {/* ═══════════════ دعوة للعمل ═══════════════ */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* بطاقة المستفيد */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">طلب خدمة لمسجدك</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                سجّل حساباً جديداً أو قدّم تبرعك واستفسارك لمسجدك من خلال البرامج المتاحة. تابع حالة طلبك بشكل مباشر.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => setIsBeneficiaryModalOpen(true)}
                  className="w-full gradient-primary text-white font-semibold py-5 cursor-pointer"
                >
                  تسجيل حساب / تقديم طلب
                </Button>
                <Link href="/login">
                  <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/5 font-medium cursor-pointer">
                    لديك حساب؟ سجّل دخولك
                  </Button>
                </Link>
              </div>
            </div>

            {/* بطاقة الموظف */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">بوابة الموظفين</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                للموظفين والمسؤولين لإدارة الطلبات والمشاريع ومتابعة سير العمل عبر جميع المراحل.
              </p>
              <Link href="/admin/login">
                <Button className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-5 cursor-pointer">
                  دخول الموظفين
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ الفوتر ═══════════════ */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg"} alt="شعار بوابة منارة" className="w-8 h-8 object-contain" />
              <div>
                <span className="font-bold text-foreground">{orgSettings?.organizationName || "بوابة منارة"}</span>
                <span className="text-muted-foreground text-sm mr-2">{orgSettings?.organizationNameShort || "لإدارة طلبات المساجد"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </footer>

      {/* ═══════════════ مودال نموذج التسجيل وتحديد الصفة ═══════════════ */}
      <Dialog open={isBeneficiaryModalOpen} onOpenChange={setIsBeneficiaryModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 rounded-2xl sm:rounded-3xl bg-white shadow-2xl" dir="rtl">
          {/* ترويسة المودال */}
          <div className="bg-slate-50 border-b border-slate-100 p-5 sm:p-6 text-center relative">
            <img
              src={orgSettings?.logoUrl || "/logo.svg"}
              alt="شعار الجمعية"
              className="h-12 sm:h-14 mx-auto mb-2.5 object-contain"
            />
            <h3 className="font-bold text-base sm:text-xl text-gray-900">
              {orgSettings?.organizationName || "بوابة منارة لإدارة طلبات المساجد"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              نموذج التسجيل وتقديم الطلبات والتبرعات
            </p>
          </div>

          <div className="p-5 sm:p-7 space-y-5">
            {/* مؤشر الخطوة */}
            <div className="flex items-center justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                الخطوة 1: تحديد الصفة والعلاقة بالمسجد
              </span>
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base sm:text-lg font-bold text-gray-900">
                اذكر الصفة (علاقتك بالمسجد)
              </h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                يرجى اختيار صفتك لتوجيهك للمسار المخصص وتقديم الخدمة المطلوبة بأفضل صورة
              </p>
            </div>

            {/* الخيارات الأربعة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* إمام */}
              <button
                type="button"
                onClick={() => handleSelectRole("imam")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-right transition-all flex items-start gap-3 group cursor-pointer shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-bold text-gray-900 group-hover:text-teal-900 text-sm sm:text-base">إمام</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    إمام مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                  </p>
                </div>
              </button>

              {/* مؤذن */}
              <button
                type="button"
                onClick={() => handleSelectRole("muezzin")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-right transition-all flex items-start gap-3 group cursor-pointer shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-bold text-gray-900 group-hover:text-teal-900 text-sm sm:text-base">مؤذن</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    مؤذن مسجد رسمي معتمد لتقديم ومتابعة طلبات المسجد
                  </p>
                </div>
              </button>

              {/* متبرع */}
              <button
                type="button"
                onClick={() => handleSelectRole("donor")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-right transition-all flex items-start gap-3 group cursor-pointer shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-bold text-gray-900 group-hover:text-emerald-900 text-sm sm:text-base">متبرع</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    الرغبة في تقديم تبرع (أرض، عيني، مالي، أو غير ذلك)
                  </p>
                </div>
              </button>

              {/* أخرى */}
              <button
                type="button"
                onClick={() => handleSelectRole("other")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 text-right transition-all flex items-start gap-3 group cursor-pointer shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-bold text-gray-900 group-hover:text-indigo-900 text-sm sm:text-base">أخرى</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    جار المسجد، أحد جماعة المسجد، ممثل جهة، استفسار عام
                  </p>
                </div>
              </button>
            </div>

            {/* الروابط السفلية */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs sm:text-sm text-gray-600">
                لديك حساب إمام أو مؤذن معتمد بالفعل؟{" "}
                <Link 
                  href="/login" 
                  onClick={() => setIsBeneficiaryModalOpen(false)}
                  className="font-bold hover:underline" 
                  style={{ color: primaryColor }}
                >
                  تسجيل الدخول
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setIsBeneficiaryModalOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                ← العودة إلى الصفحة الرئيسية
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
