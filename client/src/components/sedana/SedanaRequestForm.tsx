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
    <div className="space-y-4 text-right" dir="rtl">
      {/* 1. جدول بنود الباقة السنوية (سلة الاحتياجات) */}
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              جدول بنود الباقة السنوية (سلة الاحتياجات)
            </h3>
            <p className="text-xs text-muted-foreground">
              اختيار الأصناف المعتمدة وتحديد الكميات ودورية التوريد
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustom(true)}
            className="h-8 text-xs font-semibold gap-1.5 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border-sky-400/50 shrink-0 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة بند مخصص</span>
          </Button>
        </div>

        {/* نموذج إضافة بند مخصص سريع */}
        {showAddCustom && (
          <div className="p-3 rounded-lg bg-muted/20 border border-sky-400/40 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-foreground">إضافة صنف إضافي لسلة الاحتياجات</p>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
              <div className="sm:col-span-2">
                <Label className="text-[11px] mb-1 block text-muted-foreground">التصنيف *</Label>
                <Select
                  value={customCategory}
                  onValueChange={(val) => setCustomCategory(val as SedanaCategory)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-60">
                    {categoriesList.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] mb-1 block text-muted-foreground">اسم الصنف *</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="مثال: سجاد خارجي، معطر سجاد..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] mb-1 block text-muted-foreground">وحدة القياس *</Label>
                <Input
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="مثال: قطعة، كرتون، لتر..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-6">
                <Label className="text-[11px] mb-1 block text-muted-foreground">الوصف / الملاحظات (اختياري)</Label>
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="ملاحظات أو مواصفات البند..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCustom(false)}
                className="h-7 text-xs"
              >
                إلغاء
              </Button>
              <Button type="button" size="sm" onClick={handleAddCustom} className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                إضافة للجدول
              </Button>
            </div>
          </div>
        )}

        {/* حالة السلة الفارغة: يظهر زر إضافة باللون الأزرق بدون أي بنود افتراضية */}
        {basketItems.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-sky-300 dark:border-sky-800 rounded-xl bg-sky-50/30 dark:bg-sky-950/15 space-y-3.5 my-2">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300 flex items-center justify-center mx-auto border border-sky-200 dark:border-sky-800/80 shadow-xs">
              <Plus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">
                سلة الاحتياجات فارغة حالياً
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                لم يتم إضافة أي بنود للسلة بعد. انقر على زر "إضافة بند لسلة الاحتياجات" للبدء في تحديد تصنيف سدانة والأصناف المطلوبة لمسجدك.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAddNewRow}
                className="h-9 px-5 text-xs font-bold gap-2 cursor-pointer shadow-md bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة بند لسلة الاحتياجات</span>
              </Button>
            </div>
          </div>
        ) : (
          /* بطاقات بنود السلة بتصميم مريح ومرتب (Card-based Layout) */
          <div className="space-y-3">
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
                  className="p-4 rounded-xl border border-border/80 bg-background/50 hover:bg-background/80 hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-xs space-y-3.5"
                >
                  {/* شريط رأس البطاقة: رقم البند وزر الحذف */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {item.isCustom ? 'بند مخصص' : (item.name || 'بند جديد')}
                      </span>
                      {item.isCustom && (
                        <span className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-300/40">
                          مخصص
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg gap-1 transition-colors"
                      title="حذف هذا البند"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-destructive font-medium">حذف البند</span>
                    </Button>
                  </div>

                  {/* شبكة حقول البند: موزعة بمساحات مريحة وواضحة */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* 1. التصنيف */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        التصنيف <span className="text-destructive">*</span>
                      </Label>
                      {item.isCustom ? (
                        <div className="h-9 px-3 flex items-center text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg">
                          {item.category || 'بند مخصص'}
                        </div>
                      ) : (
                        <Select
                          value={resolvedCategory || ''}
                          onValueChange={(cat) => handleCategoryChange(item.id, cat)}
                        >
                          <SelectTrigger className="h-9 text-xs w-full bg-background border-input font-medium rounded-lg">
                            <SelectValue placeholder="اختر تصنيف سدانة..." />
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
                    </div>

                    {/* 2. الصنف المطلوب */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        الصنف المطلوب <span className="text-destructive">*</span>
                      </Label>
                      {item.isCustom || item.id === 'water_tankers' || dbOptions.length === 0 ? (
                        <Input
                          value={item.name}
                          disabled
                          className="h-9 text-xs bg-muted/40 font-semibold rounded-lg"
                        />
                      ) : (
                        <Select
                          value={item.dbCategoryId ? String(item.dbCategoryId) : ''}
                          onValueChange={(val) => handleSelectDbCategory(item.id, Number(val))}
                          disabled={!resolvedCategory}
                        >
                          <SelectTrigger
                            className={`h-9 text-xs w-full bg-background border-input font-medium rounded-lg ${
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
                    </div>

                    {/* 3. الكمية */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        الكمية <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })
                        }
                        className={`h-9 text-xs rounded-lg ${
                          isUnderMin
                            ? 'border-amber-500 focus-visible:ring-amber-500/30 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300'
                            : ''
                        }`}
                      />
                      {isUnderMin && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          الحد الأدنى الموصى به: {minLimit}
                        </p>
                      )}
                    </div>

                    {/* 4. وحدة القياس */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">وحدة القياس</Label>
                      <div className="h-9 px-3 flex items-center text-xs text-foreground bg-muted/30 border border-input/60 rounded-lg font-medium">
                        {item.unit || 'قطعة'}
                      </div>
                    </div>

                    {/* 5. دورية التوريد */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">دورية التوريد</Label>
                      <Select
                        value={item.frequency}
                        onValueChange={(val) =>
                          handleUpdateItem(item.id, {
                            frequency: val as SedanaDeliveryFrequency,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-xs w-full bg-background border-input font-medium rounded-lg">
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
                    </div>

                    {/* 6. المواصفات والملاحظات الإضافية - مساحة كاملة ومريحة */}
                    <div className="sm:col-span-12 space-y-1.5 pt-0.5">
                      <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>المواصفات أو ملاحظات إضافية للصنف</span>
                        <span className="text-[11px] text-muted-foreground font-normal">(اختياري)</span>
                      </Label>
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { description: e.target.value })
                        }
                        placeholder="اكتب أي مواصفات أو تفاصيل وملاحظات إضافية للصنف هنا..."
                        rows={2}
                        className="text-xs min-h-[52px] resize-y bg-background border-input/80 py-2 px-3 leading-relaxed rounded-lg transition-colors focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* أزرار إضافة بند جديد عند وجود بنود في السلة */}
        {basketItems.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddNewRow}
              className="h-8 text-xs font-semibold gap-1.5 text-sky-700 dark:text-sky-300 border-sky-400/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة بند جديد</span>
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              عدد البنود المضافة: {basketItems.length}
            </span>
          </div>
        )}
      </div>

      {/* 2. إدراج مرفقات (اختياري) */}
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
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
          <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-50/40 dark:bg-cyan-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-600 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
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
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
              >
                إزالة
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => document.getElementById('sedana-warehouse-photo')?.click()}
            className="p-5 border-2 border-dashed border-border/70 hover:border-cyan-500/50 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/20 transition-all rounded-xl cursor-pointer text-center"
          >
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="font-bold text-xs text-foreground">
              يرجى إدراج المرفقات المطلوبة (اختياري)
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              اختياري - يدعم الصور (JPG, PNG, WEBP) ومستندات PDF بحد أقصى 10 ميجابايت
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
