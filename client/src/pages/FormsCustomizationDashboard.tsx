import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  X,
  Loader2,
  Layers,
  ChevronLeft,
  SlidersHorizontal,
  TrendingUp,
  Briefcase,
  Building2,
  FileText,
  Store,
  Banknote,
  FolderKanban,
  ShieldAlert,
  LayoutDashboard,
  Check,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const CATEGORY_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    iconBg: string;
    badgeColor: string;
  }
> = {
  main_cards: {
    icon: TrendingUp,
    accentColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-200/60 dark:bg-blue-950/40 dark:border-blue-800/40",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
  },
  mosque_cards: {
    icon: Building2,
    accentColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/40",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  request_cards: {
    icon: FileText,
    accentColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-200/60 dark:bg-cyan-950/40 dark:border-cyan-800/40",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
  procurement_cards: {
    icon: Store,
    accentColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-200/60 dark:bg-amber-950/40 dark:border-amber-800/40",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300",
  },
  financial_cards: {
    icon: Banknote,
    accentColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-800/40",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  project_cards: {
    icon: FolderKanban,
    accentColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-200/60 dark:bg-purple-950/40 dark:border-purple-800/40",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300",
  },
  major_sections: {
    icon: Layers,
    accentColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-200/60 dark:bg-rose-950/40 dark:border-rose-800/40",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

export default function FormsCustomizationDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // استعلام الإعدادات
  const { data: configData, isLoading } = trpc.forms.getDetailedDashboardCustomizationConfig.useQuery();

  // تهيئة المعرفات عند تحميل البيانات
  useEffect(() => {
    if (configData?.enabledElementIds && !isInitialized) {
      setEnabledIds(configData.enabledElementIds);
      setInitialIds(configData.enabledElementIds);
      setIsInitialized(true);
    }
  }, [configData, isInitialized]);

  // حفظ التخصيص
  const saveMutation = trpc.forms.saveDetailedDashboardCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ تخصيص اللوحة المفصلة بنجاح");
      setInitialIds(enabledIds);
      utils.forms.getDetailedDashboardCustomizationConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التخصيص");
    },
  });

  // استعادة الإعدادات الافتراضية
  const resetMutation = trpc.forms.resetDetailedDashboardCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تمت استعادة الإعدادات الافتراضية بنجاح");
      setShowResetDialog(false);
      utils.forms.getDetailedDashboardCustomizationConfig.invalidate().then((data: any) => {
        if (data?.enabledElementIds) {
          setEnabledIds(data.enabledElementIds);
          setInitialIds(data.enabledElementIds);
        }
      });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء استعادة الافتراضي");
    },
  });

  const allElements = useMemo(() => configData?.elements || [], [configData]);
  const allCategories = useMemo(() => configData?.categories || [], [configData]);

  // هل يوجد تعديلات غير محفوظة؟
  const hasChanges = useMemo(() => {
    if (!isInitialized) return false;
    if (enabledIds.length !== initialIds.length) return true;
    const initialSet = new Set(initialIds);
    return enabledIds.some((id) => !initialSet.has(id));
  }, [enabledIds, initialIds, isInitialized]);

  // تصفية العناصر حسب البحث والتبويب
  const filteredElements = useMemo(() => {
    return allElements.filter((el) => {
      const matchesCategory =
        selectedCategory === "all" || el.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        el.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [allElements, selectedCategory, searchQuery]);

  // تبديل حالة عنصر واحد
  const toggleElement = (id: string) => {
    setEnabledIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // تفعيل كافة العناصر المعروضة
  const enableAllFiltered = () => {
    const idsToAdd = filteredElements.map((el) => el.id);
    setEnabledIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  // إخفاء كافة العناصر المعروضة
  const disableAllFiltered = () => {
    const idsToRemove = new Set(filteredElements.map((el) => el.id));
    setEnabledIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  // تفعيل أو تعطيل قسم كامل
  const toggleCategory = (categoryId: string) => {
    const categoryElements = allElements.filter((el) => el.category === categoryId);
    const categoryIds = categoryElements.map((el) => el.id);
    const allEnabled = categoryIds.every((id) => enabledIds.includes(id));

    if (allEnabled) {
      setEnabledIds((prev) => prev.filter((id) => !categoryIds.includes(id)));
    } else {
      setEnabledIds((prev) => Array.from(new Set([...prev, ...categoryIds])));
    }
  };

  const handleSave = () => {
    saveMutation.mutate({ enabledElementIds: enabledIds });
  };

  // تحقق صلاحية super_admin
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">غير مصرح بالدخول</h2>
          <p className="text-sm text-muted-foreground">
            تخصيص لوحة القيادة المفصلة متاح حصرياً لمدير النظام الشامل (Super Admin).
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/forms-customization")}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة لصفحة تخصيص النماذج
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const enabledCount = enabledIds.length;
  const totalCount = allElements.length;
  const disabledCount = Math.max(0, totalCount - enabledCount);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-16" dir="rtl">
        {/* رأس الصفحة وأزرار التحكم الرئيسية */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-xl hover:bg-muted">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  تخصيص لوحة القيادة المفصلة
                </h1>
                <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300">
                  حصري لمدير النظام الشامل
                </Badge>
                {configData?.isCustomized && (
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                    مخصص حالياً
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحكم بإظهار وإخفاء أي مؤشر أو بطاقة أو مخطط أو قسم في الوضع المفصل بصفحة لوحة التحكم
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/dashboard?view=detailed", "_blank")}
              className="gap-1.5 rounded-xl text-xs font-bold border-border/80"
              title="معاينة اللوحة المفصلة في تبويب جديد"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span>معاينة اللوحة</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              disabled={resetMutation.isPending || !configData?.isCustomized}
              className="gap-1.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
              title="استعادة الحالة الافتراضية لكافة العناصر"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
              className={`gap-1.5 rounded-xl text-xs font-bold px-4 shadow-sm transition-all ${
                hasChanges
                  ? "bg-primary hover:bg-primary/90 text-white animate-pulse"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{hasChanges ? "حفظ التخصيص *" : "تم الحفظ"}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* بطاقات الإحصاءات السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border-border/60 shadow-2xs bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">إجمالي العناصر المتاحة</p>
                <p className="text-2xl font-black text-foreground mt-0.5">{totalCount}</p>
                <p className="text-[11px] text-muted-foreground">عنصراً وبطاقة وقسماً باللوحة المفصلة</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 shadow-2xs bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">العناصر المفعلة والظاهرة</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{enabledCount}</p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">ستظهر لمدير النظام بالوضع المفصل</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">العناصر المخفية (المستبعدة)</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{disabledCount}</p>
                <p className="text-[11px] text-muted-foreground">تم إخفاؤها واستبعادها من الصفحة</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <EyeOff className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* شريط البحث وتصفية التبويبات */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* حقل البحث */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="ابحث عن اسم مؤشر، بطاقة، أو قسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 pl-8 rounded-xl border-border/80 text-xs sm:text-sm h-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* أزرار التحديد والتعطيل الجماعي */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={enableAllFiltered}
                className="text-xs font-bold rounded-xl h-9 gap-1"
                title="تفعيل كل العناصر المعروضة حالياً"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>تفعيل المعروض ({filteredElements.length})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={disableAllFiltered}
                className="text-xs font-bold rounded-xl h-9 gap-1 text-muted-foreground hover:text-destructive"
                title="إخفاء كل العناصر المعروضة حالياً"
              >
                <X className="w-3.5 h-3.5" />
                <span>إخفاء المعروض</span>
              </Button>
            </div>
          </div>

          {/* أزرار التبويبات حسب الأقسام */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide border-b border-border/50">
            {allCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const categoryElements = cat.id === "all" ? allElements : allElements.filter((el) => el.category === cat.id);
              const enabledInCategory = categoryElements.filter((el) => enabledIds.includes(el.id)).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-background text-muted-foreground border"
                    }`}
                  >
                    {enabledInCategory}/{categoryElements.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* قائمة بطاقات التخصيص */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">جاري تحميل خريطة عناصر اللوحة المفصلة...</p>
          </div>
        ) : filteredElements.length === 0 ? (
          <div className="py-16 text-center border border-dashed rounded-2xl bg-muted/10 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">لا توجد عناصر مطابقة لبحثك</p>
            <p className="text-xs text-muted-foreground">جرب كلمة بحث أخرى أو غير التبويب المختار</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-2 text-xs"
            >
              عرض كافة العناصر
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredElements.map((el) => {
              const isEnabled = enabledIds.includes(el.id);
              const meta = CATEGORY_META[el.category] || CATEGORY_META.main_cards;
              const Icon = meta.icon;

              return (
                <div
                  key={el.id}
                  onClick={() => toggleElement(el.id)}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                    isEnabled
                      ? "bg-card border-border hover:border-primary/50 shadow-2xs"
                      : "bg-muted/30 border-dashed border-border/60 opacity-60 hover:opacity-85"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.iconBg} ${meta.accentColor}`}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {el.title}
                          </h4>
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mt-0.5 ${meta.badgeColor}`}
                          >
                            {el.categoryName}
                          </span>
                        </div>
                      </div>

                      {/* زر التبديل السريع */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleElement(el.id)}
                          aria-label={`تفعيل ${el.title}`}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {el.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-[10px] text-muted-foreground/80 truncate">
                      #{el.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isEnabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>ظاهر في اللوحة</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>مخفي</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* تنبيه بالأسفل عند وجود تعديلات غير محفوظة */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-2xl rounded-2xl p-3 sm:px-6 flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
              لديك تعديلات غير محفوظة على تخصيص عناصر اللوحة
            </p>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl h-8 px-4 gap-1.5 shadow-sm shrink-0"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>حفظ الآن</span>
            </Button>
          </div>
        )}

        {/* نافذة تأكيد استعادة الإعدادات الافتراضية */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                تأكيد استعادة الإعدادات الافتراضية
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية للوحة القيادة المفصلة؟ سيتم تفعيل وإظهار كافة البطاقات والمؤشرات والأقسام الـ {totalCount} كما كانت عند تثبيت النظام.
            </p>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(false)}
                className="text-xs font-semibold"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="text-xs font-bold gap-1.5"
              >
                {resetMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>تأكيد الاستعادة</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
