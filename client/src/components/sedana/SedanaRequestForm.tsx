import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Upload, Check } from 'lucide-react';
import {
  SedanaBasketItem,
  SedanaCategory,
  SedanaDeliveryFrequency,
  SEDANA_CATEGORIES,
  DELIVERY_FREQUENCIES,
  getDefaultBasketItems,
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

  // سلة الاحتياجات السنوية
  const [basketItems, setBasketItems] = useState<SedanaBasketItem[]>(() => {
    if (Array.isArray(formData.basketItems) && formData.basketItems.length > 0) {
      return formData.basketItems;
    }
    const mosqueArea = Number(selectedMosque?.area ?? 250);
    const worshippers = Number(selectedMosque?.capacity ?? 150);
    return getDefaultBasketItems(mosqueArea, worshippers, isConnectedToDesalination);
  });

  // مزامنة السلة مع formData
  useEffect(() => {
    onFieldChange('basketItems', basketItems);
    onFieldChange('isConnectedToDesalination', isConnectedToDesalination);
  }, [basketItems, isConnectedToDesalination]);

  // تحديث خيار فحص المياه والتفعيل التلقائي لصهاريج المياه
  const handleToggleDesalination = (connected: boolean) => {
    onFieldChange('isConnectedToDesalination', connected);
    if (!connected) {
      // إذا "لا": تفعيل صهاريج المياه تلقائياً
      setBasketItems((prev) => {
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
      setBasketItems((prev) => prev.filter((i) => i.id !== 'water_tankers'));
    }
  };

  // تعديل صنف في السلة
  const handleUpdateItem = (id: string, patch: Partial<SedanaBasketItem>) => {
    setBasketItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // حذف صنف
  const handleRemoveItem = (id: string) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  // إضافة بند مخصص
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
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
      quantity: Number(customQty) || 0,
      unit: customUnit.trim() || 'قطعة',
      frequency: customFreq,
      isCustom: true,
    };
    setBasketItems((prev) => [...prev, newItem]);
    setCustomName('');
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
              يحتوي التصنيفات الستة المعتمدة مع إمكانية تعديل الكميات ودورية التوريد
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustom(true)}
            className="h-8 text-xs font-medium gap-1 text-primary hover:bg-primary/10 border-primary/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة بند مخصص</span>
          </Button>
        </div>

        {/* نموذج إضافة بند مخصص سريع */}
        {showAddCustom && (
          <div className="p-3 rounded-lg bg-muted/20 border border-primary/30 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-foreground">إضافة صنف إضافي لسلة الاحتياجات</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="sm:col-span-2">
                <Label className="text-[11px] mb-1 block text-muted-foreground">اسم الصنف</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="مثال: سجاد خارجي، معطر سجاد..."
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">التصنيف</Label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as SedanaCategory)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {SEDANA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">الكمية والوحدة</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={customQty}
                    onChange={(e) => setCustomQty(Number(e.target.value))}
                    className="h-8 text-xs w-16 text-center"
                  />
                  <Input
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="قطعة"
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">دورية التوريد</Label>
                <select
                  value={customFreq}
                  onChange={(e) => setCustomFreq(e.target.value as SedanaDeliveryFrequency)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {DELIVERY_FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>
                      {freq}
                    </option>
                  ))}
                </select>
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
                إضافة للسلة
              </Button>
            </div>
          </div>
        )}

        {/* جدول بنود السلة */}
        <div className="overflow-x-auto border border-border/70 rounded-lg">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-bold">
              <tr>
                <th className="p-2.5">اسم الصنف</th>
                <th className="p-2.5">التصنيف</th>
                <th className="p-2.5 w-28 text-center">الكمية السنوية</th>
                <th className="p-2.5 w-24 text-center">وحدة القياس</th>
                <th className="p-2.5 w-32 text-center">دورية التوريد</th>
                <th className="p-2.5 w-12 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {basketItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/15 transition-colors">
                  <td className="p-2.5 font-medium text-foreground">
                    {item.name}
                    {item.isCustom && (
                      <span className="text-[10px] text-primary mr-1.5 font-normal">(مخصص)</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-muted/60 text-muted-foreground font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <Input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })
                      }
                      className="h-7 text-xs text-center w-20 mx-auto"
                    />
                  </td>
                  <td className="p-2.5 text-center text-muted-foreground font-medium">
                    {item.unit}
                  </td>
                  <td className="p-2.5 text-center">
                    <select
                      value={item.frequency}
                      onChange={(e) =>
                        handleUpdateItem(item.id, {
                          frequency: e.target.value as SedanaDeliveryFrequency,
                        })
                      }
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs w-28 mx-auto"
                    >
                      {DELIVERY_FREQUENCIES.map((freq) => (
                        <option key={freq} value={freq}>
                          {freq}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
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
            className="p-5 border-2 border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all rounded-xl cursor-pointer text-center"
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
