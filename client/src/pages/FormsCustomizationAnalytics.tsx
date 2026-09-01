import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Search,
  CheckCircle2,
  X,
  Loader2,
  Layers,
  ChevronLeft,
  Monitor,
  Smartphone,
  Signal,
  Wifi,
  Battery,
  SlidersHorizontal,
  TrendingUp,
  DollarSign,
  Briefcase,
  HeartHandshake,
  FileSpreadsheet,
  Activity,
  AlertCircle,
  LayoutGrid,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import CustomAnalyticsDashboard from "@/pages/CustomAnalyticsDashboard";

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
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // حالات النوافذ المنبثقة
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // جلب إعدادات التخصيص من الخادم
  const { data: configData, isLoading } = trpc.forms.getAnalyticsCustomizationConfig.useQuery();

  // حفظ التخصيص
  const saveMutation = trpc.forms.saveAnalyticsCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ تخصيص اللوحة المخصصة بنجاح");
      setInitialIds([...enabledIds]);
      utils.forms.getAnalyticsCustomizationConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التخصيص");
    },
  });

  // استعادة الافتراضي
  const resetMutation = trpc.forms.resetAnalyticsCustomizationConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تمت استعادة الإعدادات الافتراضية بنجاح");
      const restored = res.data?.enabledCardIds || [];
      setEnabledIds([...restored]);
      setInitialIds([...restored]);
      setIsResetConfirmOpen(false);
      utils.forms.getAnalyticsCustomizationConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء استعادة الافتراضي");
    },
  });

  // تهيئة الحالة عند وصول البيانات من الخادم
  useEffect(() => {
    if (configData && !isInitialized) {
      setEnabledIds(configData.enabledCardIds || []);
      setInitialIds(configData.enabledCardIds || []);
      setIsInitialized(true);
    }
  }, [configData, isInitialized]);

  // فحص وجود تغييرات غير محفوظة
  const hasChanges = useMemo(() => {
    if (!isInitialized) return false;
    if (enabledIds.length !== initialIds.length) return true;
    const initialSet = new Set(initialIds);
    return enabledIds.some((id) => !initialSet.has(id));
  }, [enabledIds, initialIds, isInitialized]);

  // حماية المستخدم عند محاولة مغادرة الصفحة مع وجود تغييرات غير محفوظة
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // اختصار لوحة المفاتيح للحفظ السريع (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (hasChanges && !saveMutation.isPending) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabledIds, hasChanges, saveMutation.isPending]);

  const cards = useMemo(() => configData?.cards || [], [configData]);

  // تبديل حالة كرت واحد
  const handleToggleCard = (cardId: string) => {
    setEnabledIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  // تفعيل أو تعطيل قسم كامل
  const handleToggleCategoryAll = (categoryId: string, enable: boolean) => {
    const categoryCardIds = cards.filter((c) => c.category === categoryId).map((c) => c.id);
    setEnabledIds((prev) => {
      const filtered = prev.filter((id) => !categoryCardIds.includes(id));
      if (enable) {
        return [...filtered, ...categoryCardIds];
      }
      return filtered;
    });
  };

  // تفعيل الكل العام
  const handleSelectAllGlobal = () => {
    setEnabledIds(cards.map((c) => c.id));
  };

  // إلغاء تحديد الكل العام
  const handleDeselectAllGlobal = () => {
    setEnabledIds([]);
  };

  // تنفيذ الحفظ
  const handleSave = () => {
    if (enabledIds.length === 0) {
      toast.error("يرجى تفعيل مؤشر أو كرت واحد على الأقل في اللوحة المخصصة");
      return;
    }
    saveMutation.mutate({ enabledCardIds: enabledIds });
  };

  // تصفية الكروت حسب البحث
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase().trim();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.categoryName.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  // تجميع الكروت حسب القسم لسهولة الاستعراض
  const groupedCards = useMemo(() => {
    const order = ["kpi", "financial", "board", "beneficiary", "operations", "progress"];
    const groups: Array<{ categoryId: string; cards: typeof cards }> = [];

    order.forEach((catId) => {
      const catCards = filteredCards.filter((c) => c.category === catId);
      if (catCards.length > 0) {
        groups.push({ categoryId: catId, cards: catCards });
      }
    });

    const otherCards = filteredCards.filter((c) => !order.includes(c.category));
    if (otherCards.length > 0) {
      groups.push({ categoryId: "other", cards: otherCards });
    }

    return groups;
  }, [filteredCards]);

  const totalCardsCount = cards.length;
  const enabledCardsCount = enabledIds.length;
  const disabledCardsCount = totalCardsCount - enabledCardsCount;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">جاري تحميل عناصر اللوحة المخصصة...</p>
            <p className="text-xs text-muted-foreground">يتم جلب المؤشرات والكروت المتاحة</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl mx-auto pb-24">
        
        {/* ==================== 1. شريط المسار (Breadcrumbs) ==================== */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
          <Link href="/forms-customization" className="hover:text-foreground transition-colors">
            تخصيص النماذج
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-bold">اللوحة المخصصة</span>
        </div>

        {/* ==================== 2. رأس الصفحة التفاعلي ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/forms-customization">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="shrink-0 rounded-2xl hover:bg-muted"
                title="العودة لتخصيص النماذج"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/20 shadow-xs transition-transform hover:scale-105">
              <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                  تخصيص اللوحة المخصصة
                </h1>
                {hasChanges && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 animate-pulse flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>تعديلات غير محفوظة</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                تحديد وترتيب المؤشرات والكروت المعروضة في اللوحة المخصصة بمركز الإحصائيات
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات العلوية */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetMutation.isPending}
              className="text-xs h-10 px-3.5 rounded-xl border-border/80 shadow-2xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
              title="استعادة الكروت والمؤشرات الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>الافتراضي</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-bold gap-2 h-10 px-4 rounded-xl shadow-2xs hover:bg-muted/80 cursor-pointer"
              title="معاينة حية لشاشة اللوحة المخصصة"
            >
              <Eye className="w-4 h-4 text-primary" />
              <span>معاينة حية</span>
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
              className={`text-xs font-bold px-5 h-10 rounded-xl shadow-md gap-2 transition-all ${
                hasChanges
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:shadow-lg cursor-pointer"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed shadow-none hover:bg-muted"
              }`}
              title={hasChanges ? "حفظ التعديلات (Ctrl+S)" : "لا توجد تعديلات غير محفوظة"}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ التعديلات</span>
              <span className="hidden lg:inline text-[10px] opacity-75 font-mono">(Ctrl+S)</span>
            </Button>
          </div>
        </div>

        {/* ==================== 3. شريط الإحصائيات والإجراءات السريعة ==================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 px-5 rounded-2xl bg-muted/40 border border-border/80 text-xs">
          <div className="flex items-center gap-3 sm:gap-5 text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>إجمالي العناصر: <strong className="text-foreground">{totalCardsCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>مفعّلة: <strong className="text-foreground">{enabledCardsCount}</strong></span>
            </div>
            {disabledCardsCount > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>معطلة: <strong className="text-foreground">{disabledCardsCount}</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllGlobal}
              className="text-xs h-8 px-3 rounded-lg border-border/70 hover:bg-background cursor-pointer"
            >
              تحديد الكل
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeselectAllGlobal}
              className="text-xs h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>

        {/* ==================== 4. شريط البحث ==================== */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث عن مؤشر، رسم بياني، أو كرت إحصائي بالاسم أو الوصف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pr-10 pl-10 rounded-2xl bg-card border-border/80 text-xs sm:text-sm shadow-2xs focus-visible:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* ==================== 5. قائمة الأقسام والكروت ==================== */}
        {filteredCards.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
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
                  className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all"
                >
                  {/* ترويسة القسم */}
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

                  {/* شبكة كروت القسم - بدون تقطيع في النص ومع مساحة مريحة */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 sm:p-5">
                    {categoryCards.map((card) => {
                      const isEnabled = enabledIds.includes(card.id);

                      return (
                        <div
                          key={card.id}
                          onClick={() => handleToggleCard(card.id)}
                          className={`group flex items-start justify-between gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                            isEnabled
                              ? "border-primary/50 bg-primary/[0.05] shadow-xs"
                              : "border-border/70 bg-background/60 hover:bg-muted/40 hover:border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isEnabled
                                  ? "bg-primary text-white shadow-xs"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              <SectionIcon className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs sm:text-sm font-bold leading-snug ${isEnabled ? "text-foreground" : "text-foreground/85"}`}>
                                {card.title}
                              </p>
                              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-1">
                                {card.description}
                              </p>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 mt-0.5 mr-1">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleToggleCard(card.id)}
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

        {/* ========================================================================= */}
        {/* نافذة المعاينة الحية بصفحة كاملة (Full Screen) المطابقة لصفحة تخصيص الخدمات */}
        {/* ========================================================================= */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent
            showCloseButton={false}
            className="fixed inset-0 top-0 left-0 w-screen h-[100dvh] max-w-none max-h-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 overflow-hidden flex flex-col text-right shadow-none bg-slate-100 dark:bg-zinc-950 duration-200"
            dir="rtl"
          >
            {/* Header المعاينة الصلب والأنيق والمطابق تماماً */}
            <div className="p-3.5 sm:p-4 border-b border-border/80 bg-card flex items-center justify-between gap-3 shrink-0 shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-primary text-white shadow-xs shrink-0">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <span className="truncate">معاينة حية: اللوحة المخصصة</span>
                    <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hidden md:inline-flex shrink-0">
                      {enabledCardsCount} كارد مفعّل
                    </Badge>
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    تظهر هذه المعاينة التفاعلية تماماً كما ستظهر للمستخدم في مركز الإحصائيات
                  </p>
                </div>
              </div>

              {/* محول الجهاز (Desktop vs Mobile) وزر الإغلاق */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewDevice === "desktop"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="عرض بنسخة الكمبيوتر"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">كمبيوتر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewDevice === "mobile"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="عرض بنسخة الجوال"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">جوال</span>
                  </button>
                </div>

                {/* زر الإغلاق */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-8.5 h-8.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  title="إغلاق المعاينة"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* محتوى المعاينة التفاعلي الواقعي الكامل */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start bg-slate-100/90 dark:bg-zinc-950">
              <div
                className={`w-full transition-all duration-300 ${
                  previewDevice === "mobile"
                    ? "relative w-[395px] max-w-[395px] h-[820px] max-h-[88vh] bg-background rounded-[50px] border-[10px] border-slate-900 dark:border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.08)] flex flex-col overflow-hidden select-none my-auto ring-1 ring-black/20 shrink-0"
                    : "max-w-6xl mx-auto space-y-6 bg-card rounded-3xl p-5 sm:p-8 border border-border/80 shadow-md min-h-[85vh]"
                }`}
              >
                {/* شريط حالة هاتف iPhone مع الجزيرة التفاعلية (Dynamic Island) */}
                {previewDevice === "mobile" && (
                  <div className="pt-3 px-5 pb-2 shrink-0 bg-background/95 backdrop-blur z-20 select-none border-b border-border/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="font-semibold tracking-tight text-xs">9:41</span>
                      <div className="w-24 h-5.5 bg-black dark:bg-zinc-900 rounded-full flex items-center justify-end px-2.5 gap-1.5 shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-slate-900/90 border border-slate-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground/80">
                        <Signal className="w-3.5 h-3.5" />
                        <Wifi className="w-3.5 h-3.5" />
                        <Battery className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {/* مساحة محتوى شاشة الهاتف أو الكمبيوتر القابلة للتمرير والتفاعل */}
                <div className={previewDevice === "mobile" ? "flex-1 overflow-y-auto p-3 space-y-3.5 text-right bg-background" : "space-y-6"}>
                  <CustomAnalyticsDashboard
                    overrideEnabledIds={enabledIds}
                    isPreview={true}
                    isMobilePreview={previewDevice === "mobile"}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ==================== 7. نافذة تأكيد استعادة الافتراضي ==================== */}
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent className="max-w-md rounded-3xl border-border p-6 shadow-xl">
            <DialogHeader className="text-right space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-black text-foreground">
                استعادة الإعدادات الافتراضية للوحة
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-right">
              هل أنت متأكد من رغبتك في استعادة المؤشرات والكروت الافتراضية؟ سيتم تفعيل العناصر القياسية الموصى بها للوحة المخصصة.
            </p>
            <DialogFooter className="flex-row-reverse justify-start gap-2 pt-3">
              <Button
                type="button"
                variant="destructive"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="text-xs font-bold rounded-xl h-10 px-5 gap-1.5 cursor-pointer"
              >
                {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>استعادة الافتراضي</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetConfirmOpen(false)}
                className="text-xs font-semibold rounded-xl h-10 px-4 cursor-pointer"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
