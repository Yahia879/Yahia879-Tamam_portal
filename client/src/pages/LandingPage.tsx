import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, Users, CheckCircle2, Building2, MapPin, ArrowLeft, Loader2 } from "lucide-react";
import { getUserHomeRoute } from "@/lib/routePermissions";
import { trpc } from "@/lib/trpc";

// إحصائيات البوابة
const stats = [
  { label: "مسجد مسجل", value: "1,250+", icon: Building2 },
  { label: "طلب منجز", value: "3,400+", icon: CheckCircle2 },
  { label: "مستفيد", value: "50,000+", icon: Users },
  { label: "مدينة", value: "45+", icon: MapPin },
];

// البرامج المتاحة
const programs = [
  { name: "بنيان", desc: "بناء مساجد جديدة", color: "from-blue-600 to-blue-700" },
  { name: "دعائم", desc: "استكمال المساجد المتعثرة", color: "from-violet-600 to-violet-700" },
  { name: "عناية", desc: "الصيانة والترميم", color: "from-teal-600 to-teal-700" },
  { name: "إمداد", desc: "تجهيزات المساجد", color: "from-orange-500 to-orange-600" },
  { name: "إثراء", desc: "سداد فواتير الخدمات", color: "from-rose-500 to-rose-600" },
  { name: "سدانة", desc: "خدمات التشغيل والنظافة", color: "from-cyan-600 to-cyan-700" },
  { name: "طاقة", desc: "الطاقة الشمسية", color: "from-amber-500 to-amber-600" },
  { name: "مياه", desc: "أنظمة المياه", color: "from-sky-600 to-sky-700" },
  { name: "سقيا", desc: "توفير ماء الشرب", color: "from-emerald-600 to-emerald-700" },
];

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
                src={
                  isScrolled 
                    ? (orgSettings?.logoUrl || "/logo.svg") 
                    : (orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg")
                } 
                alt="شعار بوابة تمام" 
                className="w-8 h-8 xs:w-10 xs:h-10 shrink-0 object-contain transition-all duration-300" 
              />
              <div className="min-w-0">
                <h1 className={`font-bold text-xs xs:text-sm sm:text-base leading-tight transition-colors duration-300 truncate max-w-[90px] min-[380px]:max-w-[130px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-none ${isScrolled ? "text-foreground" : "text-white"}`}>
                  {orgSettings?.organizationName || "بوابة تمام"}
                </h1>
                <p className={`text-[9px] xs:text-xs transition-colors duration-300 truncate max-w-[90px] min-[380px]:max-w-[130px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-none ${isScrolled ? "text-muted-foreground" : "text-white/80"}`}>
                  {orgSettings?.organizationNameShort || "للعناية بالمساجد"}
                </p>
              </div>
            </div>

            {/* أزرار الدخول */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`px-1.5 sm:px-4 text-[10px] xs:text-xs sm:text-sm transition-all duration-300 ${
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
                  className={`shadow-sm px-1.5 sm:px-4 text-[10px] xs:text-xs sm:text-sm border-0 transition-all duration-300 ${
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
                <img src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || "/logo-white.svg"} alt="شعار بوابة تمام" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight">
              {orgSettings?.organizationName || "بوابة تمام"}
              <span className="block text-white/80 text-xl sm:text-2xl md:text-3xl font-medium mt-1 md:mt-2">
                {orgSettings?.organizationNameShort || "للعناية بالمساجد"}
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/85 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
              منصة متكاملة لإدارة خدمات المساجد من خلال برامج متخصصة تغطي جميع احتياجات بيوت الله
            </p>

            {/* الأزرار الرئيسية */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white hover:bg-white/90 font-bold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                  style={{ color: primaryColor }}
                >
                  <FileText className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                  طلب خدمة جديدة
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/60 text-white hover:bg-white/15 font-semibold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base backdrop-blur transition-all w-full sm:w-auto"
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

      {/* ═══════════════ الإحصائيات ═══════════════ */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 md:p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ البرامج ═══════════════ */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">برامج الجمعية</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              تسعة برامج متخصصة تغطي جميع احتياجات المساجد من البناء حتى التشغيل
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {programs.map((program) => (
              <div
                key={program.name}
                className={`bg-gradient-to-br ${program.color} rounded-2xl p-4 md:p-5 text-white text-center
                           hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default`}
              >
                <div className="text-lg md:text-xl font-bold mb-1">{program.name}</div>
                <div className="text-white/80 text-[10px] md:text-xs leading-relaxed">{program.desc}</div>
              </div>
            ))}
          </div>
        </div>
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
                سجّل حساباً جديداً وقدّم طلب خدمة لمسجدك من خلال البرامج المتاحة. تابع حالة طلبك بشكل مباشر.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/register">
                  <Button className="w-full gradient-primary text-white font-semibold py-5">
                    تسجيل حساب جديد
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/5 font-medium">
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
                <Button className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-5">
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
              <img src={orgSettings?.logoUrl || "/logo.svg"} alt="شعار بوابة تمام" className="w-8 h-8 object-contain" />
              <div>
                <span className="font-bold text-foreground">{orgSettings?.organizationName || "بوابة تمام"}</span>
                <span className="text-muted-foreground text-sm mr-2">{orgSettings?.organizationNameShort || "للعناية بالمساجد"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
