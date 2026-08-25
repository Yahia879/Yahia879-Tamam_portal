import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/usePermission";
import {
  ArrowRight,
  Package,
  Building2,
  Hammer,
  Wrench,
  Receipt,
  Sparkles,
  Sun,
  Droplets,
  GlassWater,
  Loader2,
  ChevronLeft,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const ICON_MAP: Record<string, any> = {
  Building2,
  Hammer,
  Wrench,
  Package,
  Receipt,
  Sparkles,
  Sun,
  Droplets,
  GlassWater,
};

export default function FormsCustomizationServices() {
  const [, navigate] = useLocation();
  const userPermissions = useUserPermissions();
  const { data: programs = [], isLoading } = trpc.programs.getAll.useQuery();

  const hasPermission = userPermissions.includes("forms_customization.services");

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto my-16 p-8 rounded-2xl border border-border bg-card text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">غير مصرح بالوصول</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            لا تملك الصلاحية اللازمة لتخصيص نماذج طلبات الخدمات.
          </p>
          <Link href="/forms-customization">
            <Button variant="outline" size="sm" className="mt-2 text-xs font-semibold">
              العودة لقائمة النماذج
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <Link href="/forms-customization">
            <Button variant="ghost" size="icon" type="button" className="shrink-0">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              تخصيص نماذج طلبات الخدمات
            </h1>
            <p className="text-xs text-muted-foreground">
              اختر نوع الخدمة التي ترغب بتخصيص وتعديل حقول واستمارة التقديم الخاصة بها
            </p>
          </div>
        </div>

        {/* شبكة الخدمات (نفس شبكة الخدمات في تقديم الطلب) */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">جاري تحميل الخدمات...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {programs
              .filter((p) => p.isActive)
              .map((program) => {
                const Icon = ICON_MAP[program.icon || "Package"] || Package;

                return (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => navigate(`/forms-customization/services/${program.id}`)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all text-right group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          program.color || "bg-indigo-600"
                        } text-white shadow-2xs`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {program.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {program.description || "تخصيص حقول هذا النموذج"}
                        </p>
                      </div>
                    </div>

                    <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all shrink-0 mr-2" />
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
