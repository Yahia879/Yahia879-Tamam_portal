import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  TrendingUp,
  DollarSign,
  Briefcase,
  HeartHandshake,
  FileSpreadsheet,
  Activity,
  Sparkles,
  ExternalLink,
  Loader2,
  Check,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// خريطة الأقسام وعناوينها وأيقوناتها
const TAB_SECTION_META: Record<
  string,
  {
    tabTitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    iconBg: string;
  }
> = {
  kpi: {
    tabTitle: "مؤشرات الأداء العامة (KPI)",
    icon: TrendingUp,
    accentColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-200/60 dark:bg-blue-950/40 dark:border-blue-800/40",
  },
  financial: {
    tabTitle: "التقارير واللوحة المالية",
    icon: DollarSign,
    accentColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/40",
  },
  board: {
    tabTitle: "تحليلات مجلس الإدارة والقيادة العليا",
    icon: Briefcase,
    accentColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-800/40",
  },
  beneficiary: {
    tabTitle: "تقييم ورضا المستفيدين",
    icon: HeartHandshake,
    accentColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-200/60 dark:bg-amber-950/40 dark:border-amber-800/40",
  },
  operations: {
    tabTitle: "العمليات والمعاينات الميدانية",
    icon: FileSpreadsheet,
    accentColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-200/60 dark:bg-cyan-950/40 dark:border-cyan-800/40",
  },
  progress: {
    tabTitle: "تقارير ونسب الإنجاز",
    icon: Activity,
    accentColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-200/60 dark:bg-purple-950/40 dark:border-purple-800/40",
  },
};

export default function FormsCustomizationAnalytics() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // جلب إعدادات التخصيص من الخادم
  const { data: configData, isLoading } = trpc.forms.getAnalyticsCustomizationConfig.useQuery();

  // حفظ التخصيص
  const saveMutation = trpc.forms.saveAnalyticsCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ تخصيص اللوحة المخصصة بنجاح");
      utils.forms.getAnalyticsCustomizationConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  // استعادة الافتراضي
  const resetMutation = trpc.forms.resetAnalyticsCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تمت استعادة الإعدادات الافتراضية بنجاح");
      if (res.data?.enabledCardIds) {
        setEnabledIds(res.data.enabledCardIds);
      }
      utils.forms.getAnalyticsCustomizationConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء استعادة الإعدادات");
    },
  });

  // تهيئة الحالة المحلية عند تحميل البيانات
  useEffect(() => {
    if (configData && !isInitialized) {
      setEnabledIds(configData.enabledCardIds || []);
      setIsInitialized(true);
    }
  }, [configData, isInitialized]);

  const cards = configData?.cards || [];

  // تبديل حالة كارد محدد
  const handleToggleCard = (cardId: string) => {
    setEnabledIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // تحديد الكل
  const handleSelectAll = () => {
    const allIds = cards.map((c) => c.id);
    setEnabledIds(allIds);
    toast.info("تم تحديد كافة العناصر للوحة المخصصة");
  };

  // إلغاء تحديد الكل
  const handleDeselectAll = () => {
    setEnabledIds([]);
    toast.info("تم إلغاء تحديد كافة العناصر");
  };

  // تفعيل / إلغاء تفعيل كل عناصر قسم (تاب) معين
  const handleToggleCategoryAll = (categoryId: string, enable: boolean) => {
    const categoryCardIds = cards.filter((c) => c.category === categoryId).map((c) => c.id);
    setEnabledIds((prev) => {
      if (enable) {
        return Array.from(new Set([...prev, ...categoryCardIds]));
      } else {
        return prev.filter((id) => !categoryCardIds.includes(id));
      }
    });
  };

  // حفظ الإعدادات
  const handleSave = () => {
    saveMutation.mutate({ enabledCardIds: enabledIds });
  };

  // إعادة التعيين للافتراضي
  const handleReset = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية للوحة المخصصة؟")) {
      resetMutation.mutate();
    }
  };

  // فلترة الكروت حسب البحث
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const query = searchQuery.toLowerCase();
    return cards.filter(
      (card) =>
        card.title.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        card.categoryName.toLowerCase().includes(query)
    );
  }, [cards, searchQuery]);

  // تجميع الكروت حسب التاب للعرض المنظم في مكان واحد
  const groupedCards = useMemo(() => {
    const order = ["kpi", "financial", "board", "beneficiary", "operations", "progress"];
    const groups: { categoryId: string; cards: typeof cards }[] = [];

    order.forEach((catId) => {
      const catCards = filteredCards.filter((c) => c.category === catId);
      if (catCards.length > 0) {
        groups.push({ categoryId: catId, cards: catCards });
      }
    });

    // إضافة أي أقسام أخرى قد توجد
    filteredCards.forEach((c) => {
      if (!order.includes(c.category) && !groups.some((g) => g.categoryId === c.category)) {
        const extraCards = filteredCards.filter((item) => item.category === c.category);
        groups.push({ categoryId: c.category, cards: extraCards });
      }
    });

    return groups;
  }, [filteredCards]);

  const totalCardsCount = cards.length;
  const enabledCardsCount = enabledIds.length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            جاري تحميل عناصر اللوحة المخصصة...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        {/* ==================== 🌟 رأس الصفحة ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link href="/forms-customization">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="shrink-0 rounded-xl hover:bg-muted"
                title="العودة لتخصيص النماذج"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  تخصيص اللوحة المخصصة
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/40">
                  الخيار الرابع
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                حدد العناصر والمؤشرات التي ترغب في إظهارها داخل اللوحة المخصصة في مركز الإحصائيات
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات العلوية */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <Link href="/analytics-hub?tab=custom">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted bg-background cursor-pointer"
                title="معاينة اللوحة المخصصة"
              >
                <Eye className="w-4 h-4 text-primary" />
                <span>معاينة اللوحة</span>
                <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted bg-background cursor-pointer"
              title="استعادة الإعدادات الافتراضية"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetMutation.isPending ? "animate-spin" : ""}`} />
              <span>استعادة الافتراضي</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ التخصيص</span>
            </Button>
          </div>
        </div>

        {/* ==================== 📊 شريط التحكم الموحد السريع ==================== */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* مؤشر العدد */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  عناصر اللوحة المخصصة
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تم تفعيل <span className="font-black text-primary">{enabledCardsCount}</span> من أصل{" "}
                  <span className="font-bold">{totalCardsCount}</span> عنصر متاح
                </p>
              </div>
            </div>

            {/* أزرار التحديد السريع */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl border-border/80 hover:bg-muted"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>تحديد الكل</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-3.5 h-3.5 text-destructive" />
                <span>إلغاء التحديد</span>
              </Button>
            </div>
          </div>

          {/* شريط نسبة التفعيل */}
          <div className="w-full bg-muted/70 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-primary to-purple-600 transition-all duration-300"
              style={{
                width: `${totalCardsCount > 0 ? (enabledCardsCount / totalCardsCount) * 100 : 0}%`,
              }}
            />
          </div>

          {/* شريط البحث المباشر */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="بحث في أسماء العناصر والمؤشرات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-10 text-xs rounded-xl border-border bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs bg-muted px-1.5 py-0.5 rounded-md"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* ==================== 📋 قائمة عناصر التابات في مكان واحد منظم ==================== */}
        {groupedCards.length === 0 ? (
          <div className="p-12 rounded-2xl border border-border bg-card text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">لا توجد نتائج مطابقة</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              لم يتم العثور على أي مؤشرات أو كروت تطابق عبارة البحث "{searchQuery}".
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold rounded-xl"
            >
              مسح البحث
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedCards.map(({ categoryId, cards: categoryCards }) => {
              const meta = TAB_SECTION_META[categoryId] || {
                tabTitle: categoryCards[0]?.categoryName || categoryId,
                icon: LayoutGrid,
                accentColor: "text-primary",
                iconBg: "bg-primary/10 border-primary/20",
              };
              const SectionIcon = meta.icon;
              const enabledInCategory = categoryCards.filter((c) => enabledIds.includes(c.id)).length;
              const isAllEnabled = enabledInCategory === categoryCards.length;

              return (
                <div
                  key={categoryId}
                  className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all"
                >
                  {/* ترويسة التاب الواضحة */}
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-muted/40 border-b border-border/70">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.iconBg} ${meta.accentColor}`}
                      >
                        <SectionIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-black text-foreground">
                          {meta.tabTitle}
                        </h2>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {enabledInCategory} من {categoryCards.length} عنصر مفعّل
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleCategoryAll(categoryId, !isAllEnabled)}
                      className="h-8 px-3 text-xs font-bold rounded-xl hover:bg-background border border-transparent hover:border-border text-primary cursor-pointer"
                    >
                      {isAllEnabled ? "إلغاء تحديد الكل" : "تحديد الكل"}
                    </Button>
                  </div>

                  {/* شبكة كروت التاب البسيطة والمختصرة */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 sm:p-5">
                    {categoryCards.map((card) => {
                      const isEnabled = enabledIds.includes(card.id);

                      return (
                        <div
                          key={card.id}
                          onClick={() => handleToggleCard(card.id)}
                          className={`group flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isEnabled
                              ? "border-primary/50 bg-primary/[0.06] shadow-xs"
                              : "border-border/70 bg-background/60 hover:bg-muted/40 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isEnabled
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              <SectionIcon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-bold text-foreground truncate">
                                {card.title}
                              </h3>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {card.description}
                              </p>
                            </div>
                          </div>

                          {/* زر السويتش */}
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleToggleCard(card.id)}
                              aria-label={`تفعيل ${card.title}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================== 💾 شريط الحفظ العائم في الأسفل ==================== */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 pr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">
              {enabledCardsCount} عنصر محدد للوحة المخصصة
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/analytics-hub?tab=custom">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-bold rounded-xl border-border hover:bg-muted"
              >
                معاينة
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-8 px-4 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
              ) : (
                <Save className="w-3.5 h-3.5 ml-1" />
              )}
              <span>حفظ الآن</span>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
