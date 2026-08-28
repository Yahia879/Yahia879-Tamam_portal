import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  LandPlot,
  Package,
  CreditCard,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  SlidersHorizontal,
  Loader2,
  HeartHandshake,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const ICON_MAP: Record<string, any> = {
  LandPlot,
  Package,
  CreditCard,
  Sparkles,
  HelpCircle,
  HeartHandshake,
};

export default function FormsCustomizationRegistration() {
  const [, navigate] = useLocation();
  const { data: formsList = [], isLoading } = trpc.forms.getRegistrationFormsList.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="h-9 w-9 rounded-xl hover:bg-muted/80 shrink-0">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <span>تخصيص نماذج التسجيل والتبرع</span>
                <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {formsList.length} نماذج
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تخصيص وترتيب حقول استمارات التقديم الخاصة بمسارات التبرع والاستفسارات العامة
              </p>
            </div>
          </div>
        </div>

        {/* شبكة بطاقات النماذج */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[250px]">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">جاري تحميل النماذج...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formsList.map((form) => {
              const Icon = ICON_MAP[form.icon] || HeartHandshake;

              return (
                <div
                  key={form.id}
                  onClick={() => navigate(`/forms-customization/registration/${form.id}`)}
                  className="flex items-start justify-between p-5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-muted/30 transition-all cursor-pointer text-right group shadow-2xs relative overflow-hidden"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        form.color || "bg-emerald-600"
                      } text-white shadow-sm transition-transform group-hover:scale-105 mt-0.5`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {form.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {form.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {form.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0 mr-2 mt-2">
                    <span className="text-xs font-bold hidden sm:inline">تخصيص</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
