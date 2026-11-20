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
} from "lucide-react";
import { getUserHomeRoute } from "@/lib/routePermissions";
import { trpc } from "@/lib/trpc";

export default function LandingPage() {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // جلب إعدادات الهوية البصرية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const primaryColor = orgSettings?.colorPrimary1 || "#0d9488";
  const secondaryColor = orgSettings?.colorPrimary2 || "#0f766e";

  const [isScrolled, setIsScrolled] = useState(false);

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background overflow-x-hidden" dir="rtl">

      {/* ═══════════════ الهيدر ═══════════════ */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-background/95 backdrop-blur border-b border-border shadow-sm py-2" 
            : "bg-transparent border-transparent py-3 sm:py-4"
        }`}
      >
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* الشعار */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src={
                  isScrolled
                    ? (orgSettings?.logoUrl || orgSettings?.secondaryLogoUrl || "/logo.svg")
                    : (orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg")
                } 
                alt="شعار بوابة منارة" 
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0 object-contain transition-all duration-300" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = isScrolled ? "/logo.svg" : "/logo-white.svg";
                }}
              />
              <div className="min-w-0">
                <h1 className={`font-bold text-xs sm:text-sm md:text-base leading-tight transition-colors duration-300 truncate max-w-[110px] min-[380px]:max-w-[140px] sm:max-w-[240px] md:max-w-none ${isScrolled ? "text-foreground" : "text-white"}`}>
                  {orgSettings?.organizationName || "بوابة منارة"}
                </h1>
                <p className={`text-[10px] sm:text-xs transition-colors duration-300 truncate max-w-[110px] min-[380px]:max-w-[140px] sm:max-w-[240px] md:max-w-none ${isScrolled ? "text-muted-foreground" : "text-white/80"}`}>
                  {orgSettings?.organizationNameShort || "لإدارة طلبات المساجد"}
                </p>
              </div>
            </div>

            {/* أزرار الدخول */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <Link href="/register">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-sm transition-all duration-300 cursor-pointer ${
                    isScrolled 
                      ? "text-muted-foreground hover:text-foreground" 
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  دخول المستفيدين
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button 
                  size="sm" 
                  className={`h-8 sm:h-9 shadow-sm px-2.5 sm:px-4 text-[11px] sm:text-sm border-0 transition-all duration-300 cursor-pointer ${
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
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 40%, #1e40af 100%)' }}
      >
        {/* صورة المسجد المدمجة بالخلفية مع قناع شعاعي لإخفاء العمود/المئذنة من الوسط وتوفير مساحة تنفس كاملة للنصوص */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 pointer-events-none"
          style={{ 
            backgroundImage: 'url("/hero-mosque.jpg")',
            maskImage: 'radial-gradient(ellipse 60% 75% at 50% 50%, rgba(0, 0, 0, 0.15) 20%, rgba(0, 0, 0, 0.55) 52%, black 82%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 75% at 50% 50%, rgba(0, 0, 0, 0.15) 20%, rgba(0, 0, 0, 0.55) 52%, black 82%)',
          }}
        />
        {/* طبقة تدرج لوني لحماية التباين ووضوح النصوص */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(13, 148, 136, 0.22) 0%, rgba(15, 118, 110, 0.25) 55%, rgba(30, 64, 175, 0.35) 100%)'
          }}
        />
        <div className="absolute inset-0 opacity-5 pointer-events-none islamic-pattern" />

        <div className="container relative z-10 mx-auto px-4 xs:px-6 pt-24 pb-14 sm:pt-28 sm:pb-20 md:pt-36 md:pb-28">
          <div className="max-w-3xl mx-auto text-center px-2 sm:px-4 py-2">
            {/* الشعار الكبير */}
            <div className="flex justify-center mb-5 sm:mb-6 md:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl border border-white/30">
                <img 
                  src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg"} 
                  alt="شعار بوابة منارة" 
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo-white.svg";
                  }}
                />
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight drop-shadow-md">
              {orgSettings?.organizationName || "بوابة منارة"}
              <span className="block text-white/80 text-lg sm:text-2xl md:text-3xl font-medium mt-1 md:mt-2">
                {orgSettings?.organizationNameShort || "لإدارة طلبات المساجد"}
              </span>
            </h1>

            <p className="text-sm sm:text-lg md:text-xl text-white/90 mb-7 sm:mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto drop-shadow-sm">
              يمكنكم من خلال هذه البوابة رفع طلبات الخدمات المتعلقة بمساجدكم، وسنعمل جاهدين بإذن الله على دراستها والعمل على تلبيتها قدر المستطاع، بما يخدم بيوت الله ويحقق الأثر المأمول.
            </p>

            {/* الأزرار الرئيسية */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="bg-white hover:bg-white/90 font-bold px-6 md:px-8 h-12 sm:h-14 text-sm md:text-base shadow-lg hover:shadow-xl transition-all w-full sm:w-auto cursor-pointer"
                  style={{ color: primaryColor }}
                >
                  <FileText className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                  طلب خدمة جديدة
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/60 text-white hover:bg-white/15 font-semibold px-6 md:px-8 h-12 sm:h-14 text-sm md:text-base backdrop-blur transition-all w-full sm:w-auto cursor-pointer"
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
      <section className="py-10 sm:py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-4xl mx-auto">
            {/* بطاقة المستفيد */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl gradient-primary flex items-center justify-center mb-4 sm:mb-6">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">طلب خدمة لمسجدك</h3>
                <p className="text-muted-foreground mb-5 sm:mb-6 leading-relaxed text-xs sm:text-sm">
                  سجّل حساباً جديداً أو قدّم تبرعك واستفسارك لمسجدك من خلال البرامج المتاحة. تابع حالة طلبك بشكل مباشر.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 mt-auto">
                <Link href="/register">
                  <Button className="w-full gradient-primary text-white font-semibold h-11 cursor-pointer">
                    تسجيل حساب / تقديم طلب
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/5 font-medium h-11 cursor-pointer">
                    لديك حساب؟ سجّل دخولك
                  </Button>
                </Link>
              </div>
            </div>


            {/* بطاقة الموظف */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">بوابة الموظفين</h3>
                <p className="text-muted-foreground mb-5 sm:mb-6 leading-relaxed text-xs sm:text-sm">
                  للموظفين والمسؤولين لإدارة الطلبات والمشاريع ومتابعة سير العمل واعتماد عروض الأسعار والموردين.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 mt-auto">
                <Link href="/admin/login">
                  <Button className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold h-11 cursor-pointer">
                    دخول الموظفين
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ الفوتر ═══════════════ */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-right">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg"} alt="شعار بوابة منارة" className="w-8 h-8 object-contain" />
              <div>
                <span className="font-bold text-sm sm:text-base text-foreground">{orgSettings?.organizationName || "بوابة منارة"}</span>
                <span className="text-muted-foreground text-xs sm:text-sm mr-2">{orgSettings?.organizationNameShort || "لإدارة طلبات المساجد"}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
