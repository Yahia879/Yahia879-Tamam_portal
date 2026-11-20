import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Upload, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SedanaBasketItem,
  SedanaCategory,
  SedanaDeliveryFrequency,
  SEDANA_CATEGORIES,
  DELIVERY_FREQUENCIES,
  getItemLimitForFrequency,
} from './sedanaTypes';

interface SedanaRequestFormProps {
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  selectedMosque?: {
    id: number;
    name: string;
    city?: string | null;
    capacity?: number | null;
    area?: number | string | null;
  } | null;
  errors?: Record<string, string>;
  selectedFile?: File | null;
  onSelectFile?: (file: File | null) => void;
}

export const SedanaRequestForm: React.FC<SedanaRequestFormProps> = ({
  formData,
  onFieldChange,
  selectedMosque,
  selectedFile,
  onSelectFile,
}) => {

  // جلب تصنيفات سدانة من قاعدة البيانات
  const { data: sedanaCategoryData } = trpc.categories.getCategoryByType.useQuery({ type: 'sedana_items' });

  // سلة الاحتياجات السنوية
  const [basketItems, setBasketItems] = useState<SedanaBasketItem[]>(() => {
    if (Array.isArray(formData.basketItems) && formData.basketItems.length > 0) {
      return formData.basketItems;
    }
    return [];
  });

  const isInitializedRef = useRef(false);

  // تحديث السلة المحلية وإشعارات formData
  const updateBasketItems = (nextOrFn: SedanaBasketItem[] | ((prev: SedanaBasketItem[]) => SedanaBasketItem[])) => {
    setBasketItems((prev) => {
      const next = typeof nextOrFn === 'function' ? nextOrFn(prev) : nextOrFn;
      onFieldChange('basketItems', next);
      return next;
    });
  };

  // مزامنة السلة عند تحميل بيانات formData السابقة إن وجدت فقط (بدون إضافة بنود افتراضية)
  useEffect(() => {
    if (isInitializedRef.current) return;

    if (Array.isArray(formData.basketItems) && formData.basketItems.length > 0) {
      isInitializedRef.current = true;
      setBasketItems(formData.basketItems);
      return;
    }

    if (sedanaCategoryData?.values) {
      isInitializedRef.current = true;
      if (!Array.isArray(formData.basketItems)) {
        onFieldChange('basketItems', []);
      }
    }
  }, [sedanaCategoryData, formData.basketItems]);

  // قائمة أصناف القاعدة للاختيار من بينها
  const dbOptions = sedanaCategoryData?.values || [];

  // استخراج قائمة تصنيفات سدانة المتاحة ديناميكياً من أصناف القاعدة
  const categoriesList = React.useMemo(() => {
    const catsSet = new Set<string>();
    dbOptions.forEach((opt: any) => {
      const cat = opt.metadata?.category || opt.category;
      if (cat && typeof cat === 'string' && cat.trim()) {
        catsSet.add(cat.trim());
      }
    });
    if (catsSet.size === 0) {
      SEDANA_CATEGORIES.forEach((c) => catsSet.add(c));
    }
    return Array.from(catsSet);
  }, [dbOptions]);

  // تغيير التصنيف المختار للبند
  const handleCategoryChange = (rowId: string, selectedCategory: string) => {
    const currentItem = basketItems.find((item) => item.id === rowId);
    if (!currentItem) return;

    const itemsForCat = dbOptions.filter((opt: any) => {
      const cat = opt.metadata?.category || opt.category || 'أدوات المسجد العامة';
      return cat === selectedCategory;
    });

    const stillBelongs = itemsForCat.some((opt: any) => opt.id === currentItem.dbCategoryId);

    if (stillBelongs) {
      handleUpdateItem(rowId, { category: selectedCategory as SedanaCategory });
    } else {
      // تفريغ الصنف ليقوم طالب الخدمة باختيار صنف من التصنيف المختار
      handleUpdateItem(rowId, {
        category: selectedCategory as SedanaCategory,
        dbCategoryId: undefined,
        name: '',
        unit: itemsForCat[0]?.metadata?.unit || 'قطعة',
        monthlyLimit: 0,
        quarterlyLimit: 0,
        semiAnnualLimit: 0,
        oneTimeLimit: 0,
        periodLimits: {},
        quantity: 0,
      });
    }
  };

  // تغيير الصنف المحدد من المنسدلة
  const handleSelectDbCategory = (rowId: string, selectedId: number) => {
    const selectedDbItem = dbOptions.find((v: any) => v.id === selectedId);
    if (!selectedDbItem) return;

    const meta = selectedDbItem.metadata || {};
    const itemCat = meta.category || (selectedDbItem as any).category || 'أدوات المسجد العامة';
    const periodLimits = meta.limits || {
      'شهري': Number(meta.monthlyLimit) || 0,
      'ربع سنوي': Number(meta.quarterlyLimit) || 0,
      'نصف سنوي': Number(meta.semiAnnualLimit) || 0,
      'مرة واحدة': Number(meta.oneTimeLimit) || 0,
    };

    handleUpdateItem(rowId, {
      dbCategoryId: selectedDbItem.id,
      name: selectedDbItem.valueAr || selectedDbItem.nameAr || selectedDbItem.value || selectedDbItem.name,
      category: itemCat as SedanaCategory,
      monthlyLimit: Number(meta.monthlyLimit) || 0,
      quarterlyLimit: Number(meta.quarterlyLimit) || 0,
      semiAnnualLimit: Number(meta.semiAnnualLimit) || 0,
      oneTimeLimit: Number(meta.oneTimeLimit) || 0,
      periodLimits,
      unit: meta.unit || 'قطعة',
    });
  };

  // إضافة بند جديد إلى السلة (يبدأ فارغاً ويطلب تحديد التصنيف أولاً)
  const handleAddNewRow = () => {
    const newItem: SedanaBasketItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category: '' as any,
      name: '',
      description: '',
      quantity: 0,
      unit: 'قطعة',
      frequency: 'شهري' as SedanaDeliveryFrequency,
    };

    updateBasketItems((prev) => [...prev, newItem]);
  };


  // تعديل صنف في السلة
  const handleUpdateItem = (id: string, patch: Partial<SedanaBasketItem>) => {
    updateBasketItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // حذف صنف
  const handleRemoveItem = (id: string) => {
    updateBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  // إضافة بند مخصص
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customCategory, setCustomCategory] = useState<SedanaCategory>('أدوات المسجد العامة');
  const [customQty, setCustomQty] = useState(0);
  const [customUnit, setCustomUnit] = useState('قطعة');
  const [customFreq, setCustomFreq] = useState<SedanaDeliveryFrequency>('ربع سنوي');

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newItem: SedanaBasketItem = {
      id: 'custom_' + Date.now(),
      name: customName.trim(),
      category: customCategory,
      description: customDescription.trim() || undefined,
      quantity: Number(customQty) || 0,
      unit: customUnit.trim() || 'قطعة',
      frequency: customFreq,
      isCustom: true,
    };
    updateBasketItems((prev) => [...prev, newItem]);
    setCustomName('');
    setCustomDescription('');
    setCustomQty(0);
    setShowAddCustom(false);
  };

  // رفع ملف مستودع المسجد
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (onSelectFile) onSelectFile(file);
      onFieldChange('warehousePhoto', file.name);
    }
  };

  const handleRemoveFile = () => {
    if (onSelectFile) onSelectFile(null);
    onFieldChange('warehousePhoto', '');
  };

  return (
    <div className="space-y-4 text-right min-w-0" dir="rtl">
      {/* 1. جدول بنود الباقة السنوية (سلة الاحتياجات) */}
      <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card space-y-3.5 shadow-xs min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-border/60">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
              جدول بنود الباقة السنوية (سلة الاحتياجات)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              اختيار الأصناف المعتمدة وتحديد الكميات ودورية التوريد
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustom(true)}
            className="w-full sm:w-auto h-9 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs font-semibold gap-1.5 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border-sky-400/50 shrink-0 rounded-lg justify-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>إضافة بند مخصص</span>
          </Button>
        </div>

        {/* نموذج إضافة بند مخصص سريع */}
        {showAddCustom && (
          <div className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-sky-400/40 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs sm:text-sm font-bold text-foreground">إضافة صنف إضافي لسلة الاحتياجات</p>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 sm:gap-3 text-xs">
              <div className="sm:col-span-2 min-w-0">
                <Label className="text-[11px] mb-1.5 block text-muted-foreground font-semibold">التصنيف *</Label>
                <Select
                  value={customCategory}
                  onValueChange={(val) => setCustomCategory(val as SedanaCategory)}
                >
                  <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-60">
                    {categoriesList.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs sm:text-sm min-h-10">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 min-w-0">
                <Label className="text-[11px] mb-1.5 block text-muted-foreground font-semibold">اسم الصنف *</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="مثال: سجاد خارجي، معطر سجاد..."
                  className="h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm max-md:text-base"
                />
              </div>
              <div className="sm:col-span-2 min-w-0">
                <Label className="text-[11px] mb-1.5 block text-muted-foreground font-semibold">وحدة القياس *</Label>
                <Input
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="مثال: قطعة، كرتون، لتر..."
                  className="h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm max-md:text-base"
                />
              </div>
              <div className="sm:col-span-6 min-w-0">
                <Label className="text-[11px] mb-1.5 block text-muted-foreground font-semibold">الوصف / الملاحظات (اختياري)</Label>
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="ملاحظات أو مواصفات البند..."
                  className="h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm max-md:text-base"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCustom(false)}
                className="w-full sm:w-auto h-9 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs"
              >
                إلغاء
              </Button>
              <Button type="button" size="sm" onClick={handleAddCustom} className="w-full sm:w-auto h-9 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                إضافة للجدول
              </Button>
            </div>
          </div>
        )}

        {/* حالة السلة الفارغة: يظهر زر إضافة باللون الأزرق بدون أي بنود افتراضية */}
        {basketItems.length === 0 ? (
          <div className="p-5 sm:p-8 text-center border-2 border-dashed border-sky-300 dark:border-sky-800 rounded-xl bg-sky-50/30 dark:bg-sky-950/15 space-y-3.5 my-2">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300 flex items-center justify-center mx-auto border border-sky-200 dark:border-sky-800/80 shadow-xs">
              <Plus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">
                سلة الاحتياجات فارغة حالياً
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                لم يتم إضافة أي بنود للسلة بعد. انقر على زر "إضافة بند لسلة الاحتياجات" للبدء في تحديد تصنيف سدانة والأصناف المطلوبة لمسجدك.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAddNewRow}
                className="w-full sm:w-auto h-10 max-lg:min-h-11 pointer-coarse:min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer shadow-md bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg transition-all justify-center"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>إضافة بند لسلة الاحتياجات</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* عرض البطاقات للموبايل والآيباد العمودي (< lg) بدون تمرير أفقي */}
            <div className="lg:hidden space-y-3">
              {basketItems.map((item, index) => {
                const minLimit = getItemLimitForFrequency(item);
                const isUnderMin =
                  minLimit !== undefined &&
                  minLimit > 0 &&
                  item.quantity < minLimit &&
                  !item.isCustom;

                const itemDbOption = dbOptions.find((opt: any) => opt.id === item.dbCategoryId);
                const resolvedCategory = (item.category || (itemDbOption as any)?.metadata?.category || (itemDbOption as any)?.category || '') as string;
                const itemsForCat = resolvedCategory
                  ? dbOptions.filter((opt: any) => (opt.metadata?.category || (opt as any).category || 'أدوات المسجد العامة') === resolvedCategory)
                  : [];

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-muted/15 space-y-3 shadow-2xs"
                  >
                    {/* ترويسة البند */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800">
                          بند #{index + 1}
                        </span>
                        {item.isCustom && (
                          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md">
                            مخصص
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="size-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg shrink-0"
                        title="حذف الصنف"
                        aria-label="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {/* التصنيف والصنف */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-xs font-bold text-foreground block">التصنيف</Label>
                        {item.isCustom ? (
                          <div className="min-h-11 px-3 py-2 rounded-lg bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800 flex items-center text-xs sm:text-sm font-semibold text-sky-800 dark:text-sky-300">
                            {item.category || 'بند مخصص'}
                          </div>
                        ) : (
                          <Select
                            value={resolvedCategory || ''}
                            onValueChange={(cat) => handleCategoryChange(item.id, cat)}
                          >
                            <SelectTrigger className="w-full min-w-0 h-11 text-xs sm:text-sm bg-background border-input font-medium rounded-lg">
                              <SelectValue placeholder="اختر التصنيف..." />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="max-h-60">
                              {categoriesList.map((cat) => (
                                <SelectItem key={cat} value={cat} className="text-xs sm:text-sm min-h-10">
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-xs font-bold text-foreground block">الصنف المطلوب</Label>
                        {item.isCustom || item.id === 'water_tankers' || dbOptions.length === 0 ? (
                          <div className="min-h-11 px-3 py-2 rounded-lg bg-background border border-border/80 flex items-center text-xs sm:text-sm font-semibold text-foreground">
                            {item.name}
                          </div>
                        ) : (
                          <Select
                            value={item.dbCategoryId ? String(item.dbCategoryId) : ''}
                            onValueChange={(val) => handleSelectDbCategory(item.id, Number(val))}
                            disabled={!resolvedCategory}
                          >
                            <SelectTrigger
                              className={`w-full min-w-0 h-11 text-xs sm:text-sm bg-background border-input font-medium rounded-lg ${
                                !resolvedCategory ? 'opacity-60 cursor-not-allowed bg-muted/30' : ''
                              }`}
                            >
                              <SelectValue
                                placeholder={resolvedCategory ? 'اختر الصنف المطلوب...' : 'يرجى تحديد التصنيف أولاً'}
                              />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="max-h-60">
                              {itemsForCat.map((opt: any) => (
                                <SelectItem key={opt.id} value={String(opt.id)} className="text-xs sm:text-sm min-h-10">
                                  {opt.valueAr || opt.nameAr || opt.value || opt.name}{' '}
                                  {opt.metadata?.unit ? `(${opt.metadata.unit})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* الكمية + وحدة القياس + دورية التوريد */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-xs font-bold text-foreground block">الكمية</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })
                          }
                          className={`h-11 text-sm max-md:text-base text-center w-full transition-all rounded-lg bg-background ${
                            isUnderMin
                              ? 'border-amber-500 focus-visible:ring-amber-500/30 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300'
                              : ''
                          }`}
                        />
                        {isUnderMin && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 text-center">
                            أقل من الحد ({minLimit})
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-xs font-bold text-foreground block">وحدة القياس</Label>
                        <div className="h-11 px-3 rounded-lg bg-muted/40 border border-border/70 flex items-center justify-center text-xs sm:text-sm font-medium text-muted-foreground">
                          {item.unit || 'قطعة'}
                        </div>
                      </div>

                      <div className="space-y-1.5 min-w-0 col-span-2 sm:col-span-1">
                        <Label className="text-xs font-bold text-foreground block">دورية التوريد</Label>
                        <Select
                          value={item.frequency}
                          onValueChange={(val) =>
                            handleUpdateItem(item.id, {
                              frequency: val as SedanaDeliveryFrequency,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 text-xs sm:text-sm w-full min-w-0 bg-background border-input font-medium rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {DELIVERY_FREQUENCIES.map((freq) => (
                              <SelectItem key={freq} value={freq} className="text-xs sm:text-sm min-h-10">
                                {freq}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* المواصفات / التفاصيل الإضافية */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground block">مواصفات أو تفاصيل إضافية (اختياري)</Label>
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { description: e.target.value })
                        }
                        placeholder="اكتب مواصفات أو تفاصيل إضافية للصنف (اختياري)..."
                        rows={2}
                        className="text-xs sm:text-sm max-md:text-base min-h-[56px] resize-y bg-background border-input/80 py-2.5 px-3 leading-relaxed rounded-lg focus:border-sky-500 w-full transition-colors"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* عرض الجدول للشاشات الكبيرة والآيباد الأفقي (>= lg) */}
            <div className="hidden lg:block overflow-x-auto border border-border/70 rounded-lg">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-bold">
                  <tr>
                    <th className="p-3 w-44 xl:w-48 text-right">التصنيف</th>
                    <th className="p-3 text-right">الصنف المطلوب</th>
                    <th className="p-3 w-28 text-center">الكمية</th>
                    <th className="p-3 w-24 text-center">وحدة القياس</th>
                    <th className="p-3 w-32 text-center">دورية التوريد</th>
                    <th className="p-3 w-12 text-center">إجراء</th>
                  </tr>
                </thead>
                {basketItems.map((item) => {
                  const minLimit = getItemLimitForFrequency(item);
                  const isUnderMin =
                    minLimit !== undefined &&
                    minLimit > 0 &&
                    item.quantity < minLimit &&
                    !item.isCustom;

                  const itemDbOption = dbOptions.find((opt: any) => opt.id === item.dbCategoryId);
                  const resolvedCategory = (item.category || (itemDbOption as any)?.metadata?.category || (itemDbOption as any)?.category || '') as string;
                  const itemsForCat = resolvedCategory
                    ? dbOptions.filter((opt: any) => (opt.metadata?.category || (opt as any).category || 'أدوات المسجد العامة') === resolvedCategory)
                    : [];

                  return (
                    <tbody key={item.id} className="border-b border-border/70 divide-y-0 hover:bg-muted/15 transition-colors">
                      {/* السطر الأساسي: الحقول الرئيسية مرتبة بدون تكديس */}
                      <tr>
                        {/* عمود 1: التصنيف */}
                        <td className="p-3 align-middle w-44 xl:w-48">
                          {item.isCustom ? (
                            <span className="inline-block text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-2 py-1 rounded-md">
                              {item.category || 'بند مخصص'}
                            </span>
                          ) : (
                            <Select
                              value={resolvedCategory || ''}
                              onValueChange={(cat) => handleCategoryChange(item.id, cat)}
                            >
                              <SelectTrigger className="h-9 pointer-coarse:min-h-11 text-xs w-full bg-background border-input font-medium rounded-lg">
                                <SelectValue placeholder="اختر التصنيف..." />
                              </SelectTrigger>
                              <SelectContent dir="rtl" className="max-h-60">
                                {categoriesList.map((cat) => (
                                  <SelectItem key={cat} value={cat} className="text-xs">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>

                        {/* عمود 2: الصنف المطلوب فقط (بدون حشر الوصف تحته) */}
                        <td className="p-3 align-middle font-medium text-foreground">
                          {item.isCustom || item.id === 'water_tankers' || dbOptions.length === 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-foreground">{item.name}</span>
                              {item.isCustom && (
                                <span className="text-[10px] text-sky-700 dark:text-sky-300 font-normal bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-300/40">
                                  (مخصص)
                                </span>
                              )}
                            </div>
                          ) : (
                            <Select
                              value={item.dbCategoryId ? String(item.dbCategoryId) : ''}
                              onValueChange={(val) => handleSelectDbCategory(item.id, Number(val))}
                              disabled={!resolvedCategory}
                            >
                              <SelectTrigger
                                className={`h-9 pointer-coarse:min-h-11 text-xs w-full bg-background border-input font-medium rounded-lg ${
                                  !resolvedCategory ? 'opacity-60 cursor-not-allowed bg-muted/30' : ''
                                }`}
                              >
                                <SelectValue
                                  placeholder={resolvedCategory ? 'اختر الصنف المطلوب...' : 'يرجى تحديد التصنيف أولاً'}
                                />
                              </SelectTrigger>
                              <SelectContent dir="rtl" className="max-h-60">
                                {itemsForCat.map((opt: any) => (
                                  <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
                                    {opt.valueAr || opt.nameAr || opt.value || opt.name}{' '}
                                    {opt.metadata?.unit ? `(${opt.metadata.unit})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>

                        {/* عمود 3: الكمية */}
                        <td className="p-3 align-middle text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })
                              }
                              className={`h-9 pointer-coarse:min-h-11 text-xs text-center w-20 mx-auto transition-all rounded-lg ${
                                isUnderMin
                                  ? 'border-amber-500 focus-visible:ring-amber-500/30 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300'
                                  : ''
                              }`}
                            />
                            {isUnderMin && (
                              <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold whitespace-nowrap bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                                أقل من الحد ({minLimit})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* عمود 4: وحدة القياس */}
                        <td className="p-3 align-middle text-center text-muted-foreground font-medium">
                          {item.unit || 'قطعة'}
                        </td>

                        {/* عمود 5: دورية التوريد */}
                        <td className="p-3 align-middle text-center">
                          <Select
                            value={item.frequency}
                            onValueChange={(val) =>
                              handleUpdateItem(item.id, {
                                frequency: val as SedanaDeliveryFrequency,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 pointer-coarse:min-h-11 text-xs w-28 mx-auto bg-background border-input font-medium rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {DELIVERY_FREQUENCIES.map((freq) => (
                                <SelectItem key={freq} value={freq} className="text-xs">
                                  {freq}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* عمود 6: إجراء */}
                        <td className="p-3 align-middle text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 pointer-coarse:size-10 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>

                      {/* السطر الفرعي الموسع: خانة المواصفات تمتد بعرض الجدول بالكامل */}
                      <tr>
                        <td colSpan={6} className="px-3 pt-1.5 pb-3.5">
                          <Textarea
                            value={item.description || ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { description: e.target.value })
                            }
                            placeholder="اكتب مواصفات أو تفاصيل إضافية للصنف (اختياري)..."
                            rows={2}
                            className="text-xs min-h-[48px] resize-y bg-muted/20 focus:bg-background border-input/80 py-2.5 px-3 leading-relaxed rounded-lg focus:border-sky-500 w-full transition-colors"
                          />
                        </td>
                      </tr>
                    </tbody>
                  );
                })}
              </table>
            </div>
          </>
        )}

        {/* أزرار إضافة بند جديد عند وجود بنود في السلة */}
        {basketItems.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddNewRow}
              className="w-full sm:w-auto h-9 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs font-semibold gap-1.5 text-sky-700 dark:text-sky-300 border-sky-400/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer rounded-lg justify-center"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>إضافة بند جديد</span>
            </Button>
            <span className="text-xs text-muted-foreground font-medium text-center sm:text-left">
              عدد البنود المضافة: {basketItems.length}
            </span>
          </div>
        )}
      </div>

      {/* 2. إدراج مرفقات (اختياري) */}
      <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              إدراج مرفقات
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/70">
              اختياري
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            يرجى إدراج المرفقات المطلوبة (اختياري - يمكنك المتابعة دون إرفاق)
          </p>
        </div>

        <input
          type="file"
          id="sedana-warehouse-photo"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {selectedFile ? (
          <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-50/40 dark:bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/15 text-cyan-600 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-foreground truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="w-full sm:w-auto h-9 max-lg:min-h-10 pointer-coarse:min-h-11 text-xs text-destructive hover:bg-destructive/10"
              >
                إزالة
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => document.getElementById('sedana-warehouse-photo')?.click()}
            className="p-5 sm:p-6 border-2 border-dashed border-border/70 hover:border-cyan-500/50 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/20 transition-all rounded-xl cursor-pointer text-center"
          >
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="font-bold text-xs sm:text-sm text-foreground">
              يرجى إدراج المرفقات المطلوبة (اختياري)
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              اختياري - يدعم الصور (JPG, PNG, WEBP) ومستندات PDF بحد أقصى 10 ميجابايت
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
