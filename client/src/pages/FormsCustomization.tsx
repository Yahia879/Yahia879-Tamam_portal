import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/usePermission";
import {
  ArrowRight,
  Star,
  Layers,
  ChevronLeft,
  SlidersHorizontal,
  FileText,
  ShieldAlert,
  HeartHandshake,
} from "lucide-react";

export default function FormsCustomization() {
  const [, navigate] = useLocation();

  const allOptions = [
    {
      id: "evaluation",
      title: "تخصيص استمارة تقييم رضا المستفيد",
      subtitle: "تعديل أسئلة وحقول تقييم المستفيد للطلبات والمشاريع",
      path: "/forms-customization/evaluation",
      icon: Star,
      iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
      visible: true,
      optionBadge: "الخيار الأول",
    },
    {
      id: "services",
      title: "تخصيص نماذج طلبات الخدمات",
      subtitle: "تخصيص حقول واستمارات تقديم الطلب لكل نوع من أنواع الخدمات",
      path: "/forms-customization/services",
      icon: FileText,
      iconColor: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40",
      visible: true,
      optionBadge: "الخيار الثاني",
    },
    {
      id: "registration",
      title: "تخصيص نماذج التسجيل والتبرع",
      subtitle: "تخصيص وترتيب حقول استمارات التبرعات (أرض، عيني، مالي) والاستفسارات في صفحة التسجيل",
      path: "/forms-customization/registration",
      icon: HeartHandshake,
      iconColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
      visible: true,
      optionBadge: "الخيار الثالث",
    },
  ];

  const visibleOptions = allOptions.filter((opt) => opt.visible);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* رأس الصفحة البسيط */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <Link href="/settings">
            <Button variant="ghost" size="icon" type="button" className="shrink-0">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">تخصيص النماذج</h1>
            <p className="text-xs text-muted-foreground">
              اختر النموذج الذي ترغب بتعديله وتخصيص أسئلته
            </p>
          </div>
        </div>

        {visibleOptions.length === 0 ? (
          <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">لا تملك صلاحية لتخصيص النماذج</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              يرجى مراجعة مدير النظام لمنحك الصلاحيات المطلوبة لتعديل استمارة التقييم أو نماذج الخدمات.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
              className="mt-2 text-xs font-semibold"
            >
              العودة لمركز الإعدادات
            </Button>
          </div>
        ) : (
          /* قائمة الخيارات المتاحة حسب الصلاحيات */
          <div className="space-y-3.5">
            {visibleOptions.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => navigate(opt.path)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all text-right group shadow-2xs"
                >
                  <div className="flex items-center gap-4">
                    {/* رقم الخيار البارز */}
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center border border-primary/20 shrink-0">
                      {idx + 1}
                    </div>

                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${opt.iconColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                          {opt.title}
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {opt.optionBadge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                    <span className="text-xs font-bold hidden sm:inline">دخول</span>
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
