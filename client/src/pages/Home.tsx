import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Hammer, 
  Wrench, 
  Package, 
  Receipt, 
  Sparkles, 
  Sun, 
  Droplets, 
  GlassWater,
  ArrowLeft,
  Users,
  FileText,
  MapPin,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

// خدمات المساجد
const services = [
  { key: "bunyan", name: "بنيان", description: "بناء مسجد جديد", icon: Building2, color: "bg-emerald-500" },
  { key: "daaem", name: "دعائم", description: "استكمال المساجد المتعثرة", icon: Hammer, color: "bg-blue-500" },
  { key: "enaya", name: "عناية", description: "الصيانة والترميم", icon: Wrench, color: "bg-orange-500" },
  { key: "emdad", name: "إمداد", description: "توفير تجهيزات المساجد", icon: Package, color: "bg-purple-500" },
  { key: "ethraa", name: "إثراء", description: "سداد فواتير الخدمات", icon: Receipt, color: "bg-pink-500" },
  { key: "sedana", name: "سدانة", description: "خدمات التشغيل والنظافة", icon: Sparkles, color: "bg-cyan-500" },
  { key: "taqa", name: "طاقة", description: "الطاقة الشمسية", icon: Sun, color: "bg-yellow-500" },
  { key: "miyah", name: "مياه", description: "أنظمة المياه", icon: Droplets, color: "bg-sky-500" },
  { key: "suqya", name: "سقيا", description: "توفير ماء الشرب", icon: GlassWater, color: "bg-teal-500" },
];

// الإحصائيات
const stats = [
  { label: "مسجد مسجل", value: "1,250+", icon: Building2 },
  { label: "طلب منجز", value: "3,400+", icon: CheckCircle2 },
  { label: "مستفيد", value: "50,000+", icon: Users },
  { label: "مدينة", value: "45+", icon: MapPin },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  // الشعار الرئيسي (ملون) للهيدر ذو الخلفية الفاتحة
  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  return (
    <div className="min-h-screen flex flex-col">
      {/* شريط التنقل */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src={mainLogoSrc} 
                alt="شعار" 
                className="w-12 h-12 xs:w-14 xs:h-14 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
              />
              <div>
                <h1 className="font-bold text-lg text-foreground">{orgName}</h1>
                <p className="text-xs text-muted-foreground">{orgNameShort}</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">خدمات المساجد</a>
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">عن البوابة</a>
              <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">تواصل معنا</a>
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button className="gradient-primary text-white">
                    لوحة التحكم
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">تسجيل الدخول</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="gradient-primary text-white">إنشاء حساب</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* قسم البطل */}
      <section className="relative py-20 lg:py-32" style={{ background: `linear-gradient(135deg, ${(orgSettings as any)?.colorPrimary1 || '#09707e'} 0%, ${(orgSettings as any)?.colorPrimary2 || '#0891b2'} 100%)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* شعار القسم الرئيسي - يظهر دائماً */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm p-3 flex items-center justify-center shadow-xl">
                <img
                  src={orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || '/logo.svg'}
                  alt="شعار"
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
                />
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-white drop-shadow-lg">
              {orgName}
            </h1>
            <p className="text-lg lg:text-xl mb-8 leading-relaxed text-white/95 drop-shadow">
              يمكنكم من خلال هذه البوابة رفع طلبات الخدمات المتعلقة بمساجدكم، وسنعمل جاهدين بإذن الله على دراستها والعمل على تلبيتها قدر المستطاع، بما يخدم بيوت الله ويحقق الأثر المأمول.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={isAuthenticated ? "/request-form-dynamic" : "/login"}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-8 text-lg font-semibold">
                  تقدم بطلبك الآن
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </Link>
              <Link href="/track">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                  <FileText className="w-5 h-5 ml-2" />
                  تتبع طلبك
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* موجة سفلية */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* قسم الإحصائيات */}
      <section className="py-12 bg-white -mt-1">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* قسم خدمات المساجد */}
      <section id="services" className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">خدمات المساجد</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              خدمات متخصصة تغطي جميع احتياجات المساجد من البناء والصيانة إلى التشغيل والخدمات
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {services.map((service) => (
              <Card key={service.key} className="card-hover border-0 shadow-sm overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl ${service.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <service.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{service.name}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* زر تقديم الطلب الموحد */}
          <div className="text-center">
            <Link href={isAuthenticated ? "/request-form-dynamic" : "/login"}>
              <Button size="lg" className="gradient-primary text-white px-12 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow">
                تقدم بطلبك الآن
                <ArrowLeft className="w-6 h-6 mr-2" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              اختر الخدمة المناسبة من داخل النموذج الموحد
            </p>
          </div>
        </div>
      </section>

      {/* قسم كيف يعمل */}
      <section id="about" className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">كيف تعمل البوابة؟</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              خطوات بسيطة للحصول على الخدمة المطلوبة لمسجدك
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "إنشاء حساب", description: "سجل في البوابة وأنشئ حسابك الخاص" },
              { step: 2, title: "تسجيل المسجد", description: "أضف بيانات المسجد وموقعه على الخريطة" },
              { step: 3, title: "تقديم الطلب", description: "اختر الخدمة المناسبة وقدم طلبك" },
              { step: 4, title: "متابعة الطلب", description: "تابع حالة طلبك عبر المراحل السبع" },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary text-white text-2xl font-bold mb-4">
                  {item.step}
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 -left-full w-full h-0.5 bg-border -translate-y-1/2" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* قسم الدعوة للعمل */}
      <section className="py-16 lg:py-24 gradient-primary islamic-pattern">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              ابدأ رحلتك مع بوابة تمام
            </h2>
            <p className="text-lg opacity-90 mb-8">
              انضم إلى آلاف المستفيدين واحصل على أفضل الخدمات لمسجدك
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-8">
                سجل الآن مجاناً
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* التذييل */}
      <footer id="contact" className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo-white.svg" alt="شعار بوابة تمام" className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-lg">بوابة تمام</h3>
                  <p className="text-xs opacity-70">للعناية بالمساجد</p>
                </div>
              </div>
              <p className="text-sm opacity-70">
                منصة متكاملة لإدارة خدمات المساجد وتلبية احتياجاتها
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-sm opacity-70">
                <li><a href="#services" className="hover:opacity-100 transition-opacity">خدمات المساجد</a></li>
                <li><a href="#about" className="hover:opacity-100 transition-opacity">عن البوابة</a></li>
                <li><Link href="/login" className="hover:opacity-100 transition-opacity">تسجيل الدخول</Link></li>
                <li><Link href="/register" className="hover:opacity-100 transition-opacity">إنشاء حساب</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">الخدمات</h4>
              <ul className="space-y-2 text-sm opacity-70">
                {services.slice(0, 5).map((service) => (
                  <li key={service.key}>
                    <span className="hover:opacity-100 transition-opacity cursor-pointer">{service.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-sm opacity-70">
                <li>البريد: info@tamam.sa</li>
                <li>الهاتف: 920000000</li>
                <li>العنوان: المملكة العربية السعودية</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm opacity-70">
            <p>جميع الحقوق محفوظة © {new Date().getFullYear()} بوابة تمام للعناية بالمساجد</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
