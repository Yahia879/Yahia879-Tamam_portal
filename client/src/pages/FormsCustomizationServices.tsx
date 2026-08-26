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
  CheckCircle2,
  FileSpreadsheet,
  Settings2,
  Eye,
  Sliders,
  Layers,
  Sparkle,
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const hasPermission = userPermissions.includes("forms_customization.services");

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.isActive) ||
        (statusFilter === "inactive" && !p.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [programs, searchQuery, statusFilter]);

  const activeCount = programs.filter((p) => p.isActive).length;
  const inactiveCount = programs.filter((p) => !p.isActive).length;

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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ترويسة الصفحة الاحترافية مع الروابط السريعة */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="h-10 w-10 rounded-xl hover:bg-muted/80 shrink-0">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-2xs">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 flex-wrap">
                <span>تخصيص نماذج طلبات الخدمات</span>
                <Badge variant="outline" className="text-[11px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20">
                  {programs.length} خدمة
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                تخصيص وترتيب حقول استمارات التقديم والشروط والمعاينة المباشرة لكل برنامج وخدمة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href="/program-customization">
              <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 h-10 px-4 rounded-xl border-border/80 shadow-2xs hover:bg-muted/60">
                <Settings2 className="w-4 h-4 text-primary" />
                <span>إدارة البرامج والشروط</span>
              </Button>
            </Link>
            <Link href="/forms-customization/evaluation">
              <Button variant="secondary" size="sm" className="text-xs font-bold gap-1.5 h-10 px-4 rounded-xl shadow-2xs hover:bg-muted/80">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>استمارة التقييم</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">إجمالي الخدمات المتاحة</p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{programs.length} خدمة</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الخدمات النشطة للتقديم</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount} خدمة</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">تكامل ديناميكي فوري</p>
              <p className="text-xs font-bold text-foreground mt-0.5">معاينة حية ومزامنة تلقائية</p>
            </div>
          </div>
        </div>

        {/* شريط البحث وتصفية الخدمات */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن خدمة أو برنامج..."
              className="h-10 pr-9 text-xs rounded-xl bg-background border-border/70 focus-visible:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({programs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "active"
                  ? "bg-card text-emerald-600 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              النشطة ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "inactive"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المعطلة ({inactiveCount})
            </button>
          </div>
        </div>

        {/* شبكة الخدمات الغنية والحديثة */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[350px] bg-card rounded-3xl border border-border/80">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground font-medium">جاري تحميل خدمات الجمعية...</p>
            </div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-3xl border border-border/80 space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">لا توجد خدمات مطابقة للبحث</h3>
            <p className="text-xs text-muted-foreground">جرب البحث بكلمات أخرى أو إعادة ضبط عوامل التصفية.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-xs rounded-xl"
            >
              إعادة ضبط البحث
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredPrograms.map((program) => {
              const Icon = ICON_MAP[program.icon || "Package"] || Package;

              return (
                <div
                  key={program.id}
                  onClick={() => navigate(`/forms-customization/services/${program.id}`)}
                  className="group flex flex-col justify-between p-5 rounded-3xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative overflow-hidden text-right shadow-2xs"
                >
                  {/* شريط الألوان العلوي النحيف */}
                  <div className={`absolute top-0 right-0 left-0 h-1.5 ${program.color || "bg-primary"}`} />

                  <div>
                    {/* Header البطاقة */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          program.color || "bg-indigo-600"
                        } text-white shadow-xs group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {program.isActive ? (
                          <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold text-gray-500 border-gray-300 bg-muted">
                            معطّل
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* عنوان ووصف البرنامج */}
                    <h3 className="font-black text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      <span className="truncate">{program.name}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                      {program.description || "تخصيص وترتيب حقول استمارة التقديم والبيانات المطلوبة لهذا البرنامج."}
                    </p>

                    {/* مميزات النموذج */}
                    <div className="flex items-center gap-2 flex-wrap mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md font-medium">
                        <FileSpreadsheet className="w-3 h-3 text-primary/70" />
                        حقول ديناميكية
                      </span>
                      <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md font-medium">
                        <Eye className="w-3 h-3 text-cyan-600" />
                        معاينة حية
                      </span>
                    </div>
                  </div>

                  {/* زر الإجراء السفلي */}
                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary/90">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      تخصيص النموذج
                    </span>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-transform shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* بطاقة الإرشادات والملاحظات السفلية */}
        <div className="p-5 sm:p-6 rounded-3xl bg-cyan-500/5 border border-cyan-500/20 space-y-3 text-right" dir="rtl">
          <h4 className="text-sm font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>كيف تعمل تخصيصات نماذج الخدمات؟</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-cyan-950/80 dark:text-cyan-200/80 leading-relaxed">
            <div className="space-y-1 bg-background/80 dark:bg-card/60 p-3.5 rounded-2xl border border-cyan-500/10 shadow-2xs">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-[10px]">1</span>
                <span>تعديل التسميات والشروط</span>
              </p>
              <p className="text-[11px] text-muted-foreground">يمكنك إضافة حقول جديدة أو تعديل تسميات الحقول الحالية وجعلها إلزامية أو اختيارية.</p>
            </div>

            <div className="space-y-1 bg-background/80 dark:bg-card/60 p-3.5 rounded-2xl border border-cyan-500/10 shadow-2xs">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-[10px]">2</span>
                <span>المعاينة التفاعلية الفورية</span>
              </p>
              <p className="text-[11px] text-muted-foreground">تتيح لك نافذة المعاينة الحية تجربة تعبئة النموذج بنسختي الكمبيوتر والجوال قبل اعتماده.</p>
            </div>

            <div className="space-y-1 bg-background/80 dark:bg-card/60 p-3.5 rounded-2xl border border-cyan-500/10 shadow-2xs">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-[10px]">3</span>
                <span>انعكاس فوري على الطلبات</span>
              </p>
              <p className="text-[11px] text-muted-foreground">تنعكس التعديلات مباشرة على صفحة تقديم المستفيد وعلى شاشة مراجعة الطلب والمرفقات للإدارة.</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
