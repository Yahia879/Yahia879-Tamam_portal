import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
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
  // خيار فحص المياه (متصل بالتحلية)
  const isConnectedToDesalination: boolean =
    formData.isConnectedToDesalination !== undefined
      ? Boolean(formData.isConnectedToDesalination)
      : true;

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

  // مزامنة السلة الديناميكية عند تحميل بيانات التصنيفات لأول مرة فقط
  useEffect(() => {
    if (isInitializedRef.current) return;

    if (Array.isArray(formData.basketItems) && formData.basketItems.length > 0) {
      isInitializedRef.current = true;
      setBasketItems(formData.basketItems);
      return;
    }

    if (sedanaCategoryData?.values && Array.isArray(sedanaCategoryData.values)) {
      isInitializedRef.current = true;
      // نختار أول بندين افتراضياً كما طلب المستخدم
      const initialDbItems: SedanaBasketItem[] = sedanaCategoryData.values.slice(0, 2).map((v: any, index: number) => {
        const meta = v.metadata || {};
        const periodLimits = meta.limits || {
          'شهري': Number(meta.monthlyLimit) || 0,
          'ربع سنوي': Number(meta.quarterlyLimit) || 0,
          'نصف سنوي': Number(meta.semiAnnualLimit) || 0,
        };
        return {
          id: `item_${v.id}_${Date.now()}_${index}`,
          dbCategoryId: v.id,
          category: (meta.category || 'أدوات المسجد العامة') as SedanaCategory,
          name: v.valueAr || v.value,
          monthlyLimit: Number(meta.monthlyLimit) || 0,
          quarterlyLimit: Number(meta.quarterlyLimit) || 0,
          semiAnnualLimit: Number(meta.semiAnnualLimit) || 0,
          periodLimits,
          quantity: 0,
          unit: meta.unit || 'قطعة',
          frequency: 'شهري' as SedanaDeliveryFrequency,
        };
      });

      if (!isConnectedToDesalination && initialDbItems.length > 0) {
        const waterIndex = initialDbItems.findIndex((i) => i.category === 'سقيا الماء');
        const tankerItem: SedanaBasketItem = {
          id: 'water_tankers',
          category: 'سقيا الماء',
          name: 'صهاريج مياه (وايت ماء 19 طن)',
          quantity: 0,
          unit: 'صهريج',
          frequency: 'شهري',
        };
        if (waterIndex !== -1) {
          initialDbItems.splice(waterIndex + 1, 0, tankerItem);
        } else {
          initialDbItems.push(tankerItem);
        }
      }

      setBasketItems(initialDbItems);
      onFieldChange('basketItems', initialDbItems);
    }
  }, [sedanaCategoryData]);

  // قائمة أصناف القاعدة للاختيار من بينها
  const dbOptions = sedanaCategoryData?.values || [];

  // تغيير الصنف المحدد من المنسدلة
  const handleSelectDbCategory = (rowId: string, selectedId: number) => {
    const selectedDbItem = dbOptions.find((v: any) => v.id === selectedId);
    if (!selectedDbItem) return;

    const meta = selectedDbItem.metadata || {};
    const periodLimits = meta.limits || {
      'شهري': Number(meta.monthlyLimit) || 0,
      'ربع سنوي': Number(meta.quarterlyLimit) || 0,
      'نصف سنوي': Number(meta.semiAnnualLimit) || 0,
    };

    handleUpdateItem(rowId, {
      dbCategoryId: selectedDbItem.id,
      name: selectedDbItem.valueAr || selectedDbItem.value,
      category: (meta.category || 'أدوات المسجد العامة') as SedanaCategory,
      monthlyLimit: Number(meta.monthlyLimit) || 0,
      quarterlyLimit: Number(meta.quarterlyLimit) || 0,
      semiAnnualLimit: Number(meta.semiAnnualLimit) || 0,
      periodLimits,
      unit: meta.unit || 'قطعة',
    });
  };

  // إضافة بند جديد من أصناف القاعدة
  const handleAddNewRow = () => {
    if (dbOptions.length === 0) return;
    const usedDbIds = new Set(basketItems.map((item) => item.dbCategoryId).filter(Boolean));
    const availableOption = dbOptions.find((opt: any) => !usedDbIds.has(opt.id)) || dbOptions[0];

    const meta = availableOption.metadata || {};
    const periodLimits = meta.limits || {
      'شهري': Number(meta.monthlyLimit) || 0,
      'ربع سنوي': Number(meta.quarterlyLimit) || 0,
      'نصف سنوي': Number(meta.semiAnnualLimit) || 0,
    };

    const newItem: SedanaBasketItem = {
      id: `item_${availableOption.id}_${Date.now()}`,
      dbCategoryId: availableOption.id,
      category: (meta.category || 'أدوات المسجد العامة') as SedanaCategory,
      name: availableOption.valueAr || availableOption.value,
      monthlyLimit: Number(meta.monthlyLimit) || 0,
      quarterlyLimit: Number(meta.quarterlyLimit) || 0,
      semiAnnualLimit: Number(meta.semiAnnualLimit) || 0,
      periodLimits,
      quantity: 0,
      unit: meta.unit || 'قطعة',
      frequency: 'شهري' as SedanaDeliveryFrequency,
    };

    updateBasketItems((prev) => [...prev, newItem]);
  };

  // تحديث خيار فحص المياه والتفعيل التلقائي لصهاريج المياه
  const handleToggleDesalination = (connected: boolean) => {
    onFieldChange('isConnectedToDesalination', connected);
    if (!connected) {
      // إذا "لا": تفعيل صهاريج المياه تلقائياً
      updateBasketItems((prev) => {
        const hasTanker = prev.some((i) => i.id === 'water_tankers');
        if (hasTanker) return prev;
        const waterIdx = prev.findIndex((i) => i.category === 'سقيا الماء');
        const newItem: SedanaBasketItem = {
          id: 'water_tankers',
          category: 'سقيا الماء',
          name: 'صهاريج مياه (وايت ماء 19 طن)',
          quantity: 0,
          unit: 'صهريج',
          frequency: 'شهري',
        };
        const next = [...prev];
        if (waterIdx !== -1) {
          next.splice(waterIdx + 1, 0, newItem);
        } else {
          next.push(newItem);
        }
        return next;
      });
    } else {
      // إذا "نعم": إزالة بند صهاريج المياه تلقائياً
      updateBasketItems((prev) => prev.filter((i) => i.id !== 'water_tankers'));
    }
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
      {/* 1. خيار فحص المياه: هل المسجد متصل بالتحلية؟ */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-foreground">
              فحص شبكة المياه
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              هل المسجد متصل بالتحلية؟ (إذا كان غير متصل، يتم تفعيل بند صهاريج المياه تلقائياً)
            </p>
          </div>

          <div className="flex items-center gap-2 h-8 w-full sm:w-60">
            <button
              type="button"
              onClick={() => handleToggleDesalination(true)}
              className={`flex-1 h-full rounded-md border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                isConnectedToDesalination
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 hover:bg-muted/50 border-border/70 text-muted-foreground'
              }`}
            >
              {isConnectedToDesalination && <Check className="w-3.5 h-3.5" />}
              <span>نعم (متصل)</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleDesalination(false)}
              className={`flex-1 h-full rounded-md border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                !isConnectedToDesalination
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-muted/30 hover:bg-muted/50 border-border/70 text-muted-foreground'
              }`}
            >
              {!isConnectedToDesalination && <Check className="w-3.5 h-3.5" />}
              <span>لا (غير متصل)</span>
            </button>
          </div>
        </div>

        {/* تنبيه تفعيل صهاريج المياه عند اختيار لا */}
        {!isConnectedToDesalination && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            ✓ المسجد غير متصل بالتحلية: تم تفعيل بند <strong>صهاريج المياه (وايت ماء)</strong> تلقائياً في سلة الاحتياجات السنوية أدناه.
          </div>
        )}
      </div>

      {/* 2. جدول بنود الباقة السنوية (سلة الاحتياجات) */}
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
            className="h-8 text-xs font-medium gap-1.5 text-primary hover:bg-primary/10 border-primary/30 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة بند مخصص</span>
          </Button>
        </div>

        {/* نموذج إضافة بند مخصص سريع */}
        {showAddCustom && (
          <div className="p-3 rounded-lg bg-muted/20 border border-primary/30 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-foreground">إضافة صنف إضافي لسلة الاحتياجات</p>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
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
                <Label className="text-[11px] mb-1 block text-muted-foreground">الوصف / الملاحظات (اختياري)</Label>
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="ملاحظات أو مواصفات البند..."
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
              <Button type="button" size="sm" onClick={handleAddCustom} className="h-7 text-xs">
                إضافة للجدول
              </Button>
            </div>
          </div>
        )}

        {/* جدول بنود السلة */}
        <div className="overflow-x-auto border border-border/70 rounded-lg">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-bold">
              <tr>
                <th className="p-3 min-w-[200px]">اسم الصنف</th>
                <th className="p-3 w-36 text-center">الكمية</th>
                <th className="p-3 w-24 text-center">وحدة القياس</th>
                <th className="p-3 w-32 text-center">دورية التوريد</th>
                <th className="p-3 w-12 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {basketItems.map((item) => {
                const minLimit = getItemLimitForFrequency(item);
                const isUnderMin =
                  minLimit !== undefined &&
                  minLimit > 0 &&
                  item.quantity < minLimit &&
                  !item.isCustom;

                return (
                  <tr key={item.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-3 font-medium text-foreground align-middle">
                      {item.isCustom || item.id === 'water_tankers' || dbOptions.length === 0 ? (
                        <div>
                          <span className="font-semibold">{item.name}</span>
                          {item.isCustom && (
                            <span className="text-[10px] text-primary mr-1.5 font-normal bg-primary/10 px-1.5 py-0.5 rounded">
                              (مخصص)
                            </span>
                          )}
                        </div>
                      ) : (
                        <Select
                          value={String(item.dbCategoryId || dbOptions.find((v: any) => (v.valueAr || v.value) === item.name)?.id || '')}
                          onValueChange={(val) => handleSelectDbCategory(item.id, Number(val))}
                        >
                          <SelectTrigger size="sm" className="h-8 text-xs w-full bg-background border-input font-medium">
                            <SelectValue placeholder="اختر الصنف..." />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {dbOptions.map((opt: any) => (
                              <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
                                {opt.valueAr || opt.value} {opt.metadata?.unit ? `(${opt.metadata.unit})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="p-3 text-center align-middle">
                      <div className="flex flex-col items-center justify-center">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })
                          }
                          className={`h-8 text-xs text-center w-24 mx-auto transition-all ${
                            isUnderMin
                              ? 'border-amber-500 focus-visible:ring-amber-500/30 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300'
                              : ''
                          }`}
                        />
                        {isUnderMin && (
                          <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold whitespace-nowrap bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                            أقل من الحد الأدنى ({minLimit})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center text-muted-foreground font-medium align-middle">
                      {item.unit}
                    </td>
                    <td className="p-3 text-center align-middle">
                      <Select
                        value={item.frequency}
                        onValueChange={(val) =>
                          handleUpdateItem(item.id, {
                            frequency: val as SedanaDeliveryFrequency,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-8 text-xs w-28 mx-auto bg-background border-input font-medium">
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
                    <td className="p-3 text-center align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* أزرار إضافة بند جديد */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddNewRow}
            className="h-8 text-xs font-medium gap-1.5 text-cyan-700 border-cyan-500/40 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة بند جديد</span>
          </Button>
        </div>
      </div>

      {/* 3. حقل رفع صور مستودع المسجد الحالي (اختياري) */}
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              صور مستودع المسجد الحالي (المرفقات)
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/70">
              اختياري
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            (اختياري - ليس إلزامياً) يمكنك إرفاق صور واضحة لمستودع المسجد أو خزانة الأدوات والمواد إن وُجدت للمساعدة في دراسة الاحتياج، أو المتابعة دون إرفاق
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
              اضغط لرفع صور مستودع المسجد (اختياري) أو اسحب الملف هنا
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
