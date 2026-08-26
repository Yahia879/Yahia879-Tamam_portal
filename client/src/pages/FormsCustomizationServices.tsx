import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search,
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
  const [searchQuery, setSearchQuery] = useState("");

  const hasPermission = userPermissions.includes("forms_customization.services");

  const filteredPrograms = useMemo(() => {
    return programs
      .filter((p) => p.isActive)
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q)
        );
      });
  }, [programs, searchQuery]);

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
      <div className="space-y-5 max-w-5xl mx-auto">
        {/* رأس الصفحة البسيط والمنسق */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="h-9 w-9 rounded-xl hover:bg-muted/80 shrink-0">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <span>تخصيص نماذج طلبات الخدمات</span>
                <Badge variant="outline" className="text-[11px] font-mono border-border/80">
                  {filteredPrograms.length}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                اختر الخدمة لتعديل وترتيب حقول استمارة التقديم الخاصة بها
              </p>
            </div>
          </div>

          {/* خانة بحث سريعة */}
          {programs.length > 4 && (
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الخدمات..."
                className="h-9 pr-9 text-xs rounded-xl bg-card border-border/80"
              />
            </div>
          )}
        </div>

        {/* شبكة بطاقات الخدمات */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[250px]">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">جاري تحميل الخدمات...</p>
            </div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-2xl border border-border/70 space-y-2">
            <p className="text-sm font-semibold text-foreground">لا توجد خدمات مطابقة للبحث</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs h-8 rounded-lg"
            >
              عرض جميع الخدمات
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPrograms.map((program) => {
              const Icon = ICON_MAP[program.icon || "Package"] || Package;

              return (
                <div
                  key={program.id}
                  onClick={() => navigate(`/forms-customization/services/${program.id}`)}
                  className="flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer text-right group shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        program.color || "bg-indigo-600"
                      } text-white shadow-2xs transition-transform group-hover:scale-105`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {program.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {program.description || "تخصيص وترتيب حقول هذا النموذج"}
                      </p>
                    </div>
                  </div>

                  <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all shrink-0 mr-2" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
