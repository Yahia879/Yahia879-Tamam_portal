import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { evaluateSedanaNeeds } from './sedanaBenchmarks';
import {
  SedanaBasketItem,
  SedanaCategory,
  SedanaDeliveryFrequency,
  SEDANA_CATEGORIES,
  DELIVERY_FREQUENCIES,
} from './sedanaTypes';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface SedanaOfficeEvaluationProps {
  request: {
    id: number;
    requestNumber: string;
    programType: string;
    programData?: any;
    currentStage: string;
    mosque?: {
      id: number;
      name: string;
      city?: string | null;
      capacity?: number | null;
      area?: number | string | null;
    } | null;
  };
  onEvaluationComplete?: () => void;
  canEvaluate?: boolean;
}

export const SedanaOfficeEvaluation: React.FC<SedanaOfficeEvaluationProps> = ({
  request,
  onEvaluationComplete,
  canEvaluate = true,
}) => {
  let programData: Record<string, any> = {};
  try {
    if (typeof request.programData === 'string') {
      programData = JSON.parse(request.programData);
    } else {
      programData = request.programData || {};
    }
  } catch (e) {
    programData = {};
  }

  const existingApprovedPlan = programData.approvedPlan;
  const isAlreadyApproved = Boolean(existingApprovedPlan?.approvedAt);

  const mosqueArea = Number(programData.mosqueArea ?? request.mosque?.area ?? 250);
  const worshippers = Number(programData.actualWorshippers ?? request.mosque?.capacity ?? 150);
  const isConnectedToDesalination =
    programData.isConnectedToDesalination !== undefined
      ? Boolean(programData.isConnectedToDesalination)
      : true;

  // جلب أصناف سدانة المعتمدة في النظام
  const { data: sedanaCategoriesData } = trpc.categories.getCategoryByType.useQuery(
    { type: 'sedana_items' }
  );
  const dbOptions = sedanaCategoriesData?.values || [];

  // قائمة بنود سدانة (الحالية والقابلة للتعديل والإضافة والحذف المباشر)
  const [itemsList, setItemsList] = useState<SedanaBasketItem[]>(() => {
    if (Array.isArray(programData.basketItems) && programData.basketItems.length > 0) {
      return programData.basketItems;
    }
    const initialEval = evaluateSedanaNeeds(
      {
        capacity: worshippers,
        area: mosqueArea,
        actualWorshippers: worshippers,
        isConnectedToDesalination,
      },
      programData
    );
    return initialEval.items.map((item) => ({
      id: item.key,
      name: item.label,
      description: (item as any).description || '',
      category: (item.category as SedanaCategory) || 'أدوات المسجد العامة',
      quantity: item.requestedQty,
      unit: item.unit,
      frequency: (item.frequency || 'شهري') as SedanaDeliveryFrequency,
      isCustom: false,
    }));
  });

  // تقييم الاحتياج الفني والمعايير استناداً إلى قائمة البنود الحالية
  const evaluation = useMemo(() => {
    return evaluateSedanaNeeds(
      {
        capacity: worshippers,
        area: mosqueArea,
        actualWorshippers: worshippers,
        isConnectedToDesalination,
      },
      {
        ...programData,
        basketItems: itemsList,
      }
    );
  }, [worshippers, mosqueArea, isConnectedToDesalination, programData, itemsList]);

  // الكميات المعتمدة لكل بند
  const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>(() => {
    if (existingApprovedPlan?.approvedItems) {
      return existingApprovedPlan.approvedItems;
    }
    const initial: Record<string, number> = {};
    if (Array.isArray(programData.basketItems) && programData.basketItems.length > 0) {
      programData.basketItems.forEach((it: SedanaBasketItem) => {
        initial[it.id] = it.quantity;
      });
    } else {
      evaluation.items.forEach((item) => {
        initial[item.key] = item.requestedQty;
      });
    }
    return initial;
  });

  const [officeNotes, setOfficeNotes] = useState<string>(
    existingApprovedPlan?.notes || 'تمت دراسة ومراجعة الاحتياج السنوي مكتبياً واعتماد البنود والكميات.'
  );

  // حالة إضافة بند مخصص سريع
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customUnit, setCustomUnit] = useState('قطعة');

  // تحديث حقول أي بند في الجدول
  const handleUpdateItem = (id: string, patch: Partial<SedanaBasketItem>) => {
    setItemsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // تغيير الصنف من القائمة المنسدلة في نفس السطر
  const handleSelectDbCategory = (itemId: string, dbId: number) => {
    const selected = dbOptions.find((o: any) => o.id === dbId);
    if (!selected) return;
    const meta = selected.metadata || {};
    const periodLimits = meta.limits || {
      'شهري': Number(meta.monthlyLimit) || 0,
      'ربع سنوي': Number(meta.quarterlyLimit) || 0,
      'نصف سنوي': Number(meta.semiAnnualLimit) || 0,
    };

    handleUpdateItem(itemId, {
      dbCategoryId: selected.id,
      category: (meta.category || 'أدوات المسجد العامة') as SedanaCategory,
      name: selected.valueAr || selected.value,
      monthlyLimit: Number(meta.monthlyLimit) || 0,
      quarterlyLimit: Number(meta.quarterlyLimit) || 0,
      semiAnnualLimit: Number(meta.semiAnnualLimit) || 0,
      periodLimits,
      unit: meta.unit || 'قطعة',
    });
  };

  // تعديل الكمية المعتمدة
  const handleApprovedQuantityChange = (key: string, val: number) => {
    setApprovedQuantities((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  // إضافة بند جديد من أصناف القاعدة في نهاية الجدول
  const handleAddNewRow = () => {
    if (dbOptions.length === 0) return;
    const usedDbIds = new Set(itemsList.map((item) => item.dbCategoryId).filter(Boolean));
    const availableOption = dbOptions.find((opt: any) => !usedDbIds.has(opt.id)) || dbOptions[0];

    const meta = availableOption.metadata || {};
    const periodLimits = meta.limits || {
      'شهري': Number(meta.monthlyLimit) || 0,
      'ربع سنوي': Number(meta.quarterlyLimit) || 0,
      'نصف سنوي': Number(meta.semiAnnualLimit) || 0,
    };

    const newId = `item_${availableOption.id}_${Date.now()}`;
    const defaultQty = Number(meta.defaultQuantity) || 1;

    const newItem: SedanaBasketItem = {
      id: newId,
      dbCategoryId: availableOption.id,
      category: (meta.category || 'أدوات المسجد العامة') as SedanaCategory,
      name: availableOption.valueAr || availableOption.value,
      description: '',
      monthlyLimit: Number(meta.monthlyLimit) || 0,
      quarterlyLimit: Number(meta.quarterlyLimit) || 0,
      semiAnnualLimit: Number(meta.semiAnnualLimit) || 0,
      periodLimits,
      quantity: defaultQty,
      unit: meta.unit || 'قطعة',
      frequency: (meta.frequency || 'شهري') as SedanaDeliveryFrequency,
    };

    setItemsList((prev) => [...prev, newItem]);
    setApprovedQuantities((prev) => ({
      ...prev,
      [newId]: defaultQty,
    }));

    toast.success('تمت إضافة بند جديد للجدول');
  };

  // إضافة بند مخصص
  const handleAddCustom = () => {
    if (!customName.trim()) {
      toast.error('يرجى إدخال اسم الصنف المخصص');
      return;
    }

    const newId = 'custom_' + Date.now();
    const newItem: SedanaBasketItem = {
      id: newId,
      name: customName.trim(),
      category: 'أدوات المسجد العامة',
      description: customDescription.trim() || undefined,
      quantity: 1,
      unit: customUnit.trim() || 'قطعة',
      frequency: 'شهري',
      isCustom: true,
    };

    setItemsList((prev) => [...prev, newItem]);
    setApprovedQuantities((prev) => ({
      ...prev,
      [newId]: 1,
    }));

    // إعادة تعيين الحقول وإغلاق النموذج
    setCustomName('');
    setCustomDescription('');
    setCustomUnit('قطعة');
    setShowAddCustom(false);
    toast.success('تمت إضافة البند المخصص بنجاح');
  };

  // حذف صنف من الجدول
  const handleRemoveItem = (id: string) => {
    const itemToDelete = itemsList.find((i) => i.id === id);
    const itemName = itemToDelete?.name || 'البند';

    setItemsList((prev) => prev.filter((item) => item.id !== id));
    setApprovedQuantities((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    toast.success(`تم حذف ${itemName} بنجاح`);
  };

  const approveMutation = trpc.requests.approveSedanaEvaluation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'تمت العملية بنجاح');
      if (onEvaluationComplete) onEvaluationComplete();
    },
    onError: (err) => {
      toast.error(err.message || 'حدث خطأ أثناء حفظ الاحتياج');
    },
  });

  // حفظ التعديلات كمسودة بدون نقل المرحلة
  const handleSaveDraft = () => {
    approveMutation.mutate({
      requestId: request.id,
      approvedItems: approvedQuantities,
      notes: officeNotes,
      basketItems: itemsList,
      shouldAdvanceStage: false,
    });
  };

  // اعتماد الاحتياج والانتقال للمرحلة التالية
  const handleApproveAnnualNeed = () => {
    approveMutation.mutate({
      requestId: request.id,
      approvedItems: approvedQuantities,
      notes: officeNotes,
      basketItems: itemsList,
      shouldAdvanceStage: true,
    });
  };

  const wasteAlerts = evaluation.items.filter((i) => i.status === 'waste' && i.warningMessage);

  return (
    <div className="space-y-4 p-4 sm:p-5 rounded-xl border border-border/80 bg-card text-right shadow-2xs" dir="rtl">
      {/* 1. شريط العنوان وزر إضافة بند مخصص في نفس مكان نموذج الطلب */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            <span>جدول دراسة وتدقيق الاحتياج السنوي (سدانة)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            تدقيق وتعديل الأصناف والكميات المطلوبة والمعتمدة ومقارنتها بالمعيار القياسي
          </p>
        </div>

        {canEvaluate && !isAlreadyApproved && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustom(true)}
            className="h-8 text-xs font-medium gap-1.5 text-primary hover:bg-primary/10 border-primary/30 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة بند مخصص</span>
          </Button>
        )}
      </div>

      {/* نموذج إضافة بند مخصص سريع - مطابق تماماً لصفحة الطلب */}
      {showAddCustom && canEvaluate && !isAlreadyApproved && (
        <div className="p-3 rounded-lg bg-muted/20 border border-primary/30 space-y-3 animate-in fade-in duration-150">
          <p className="text-xs font-bold text-foreground">إضافة صنف إضافي لسلة الاحتياجات</p>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
            <div className="sm:col-span-2">
              <Label className="text-[11px] mb-1 block text-muted-foreground">اسم الصنف *</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="مثال: سجاد خارجي، معطر سجاد..."
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] mb-1 block text-muted-foreground">الوصف / الملاحظات (اختياري)</Label>
              <Input
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="ملاحظات أو مواصفات البند..."
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-[11px] mb-1 block text-muted-foreground">وحدة القياس *</Label>
              <Input
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="مثال: قطعة، كرتون، لتر..."
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddCustom(false)}
              className="h-7 text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustom}
              className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              إضافة للجدول
            </Button>
          </div>
        </div>
      )}

      {/* تنبيه الهدر إن وجد */}
      {wasteAlerts.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 py-2.5 px-3 rounded-lg">
          <AlertDescription className="text-xs space-y-1">
            <span className="font-bold block">ملاحظات ضبط الكميات وفق المعيار القياسي:</span>
            {wasteAlerts.map((item) => (
              <span key={item.key} className="block text-[11px] text-amber-800 dark:text-amber-300">
                • {item.label}: المطلوب ({item.requestedQty} {item.unit}) يتجاوز المعيار القياسي لمسجد بهذا الحجم ({item.standardQty} {item.unit}).
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* جدول بنود دراسة وتدقيق الاحتياج السنوي */}
      <div className="overflow-x-auto border border-border/70 rounded-lg">
        <table className="w-full text-xs text-right">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-bold">
            <tr>
              <th className="p-3 min-w-[200px]">اسم الصنف</th>
              <th className="p-3 w-28 text-center">التصنيف</th>
              <th className="p-3 w-32 text-center">دورية التوريد</th>
              <th className="p-3 w-28 text-center">الكمية المطلوبة</th>
              <th className="p-3 w-28 text-center">المعيار القياسي</th>
              <th className="p-3 w-32 text-center">الكمية المعتمدة</th>
              {canEvaluate && !isAlreadyApproved && (
                <th className="p-3 w-12 text-center">إجراء</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {itemsList.map((item) => {
              const evalItem = evaluation.items.find((i) => i.key === item.id);
              const approvedVal = approvedQuantities[item.id] ?? item.quantity;
              const isWaste = evalItem?.status === 'waste';

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-muted/15 transition-colors ${
                    isWaste ? 'bg-amber-50/25 dark:bg-amber-950/10' : ''
                  }`}
                >
                  {/* 1. اسم الصنف مع إمكانية تغييره مباشرة من القائمة أو نص للبند المخصص */}
                  <td className="p-3 font-medium text-foreground align-top pt-3 space-y-1.5 min-w-[220px]">
                    {item.isCustom || item.id === 'water_tankers' || dbOptions.length === 0 || !canEvaluate || isAlreadyApproved ? (
                      <div>
                        {item.isCustom && canEvaluate && !isAlreadyApproved ? (
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                            className="h-8 text-xs font-semibold bg-background"
                          />
                        ) : (
                          <span className="font-semibold">{item.name}</span>
                        )}
                        {item.isCustom && (
                          <span className="text-[10px] text-primary mr-1.5 font-normal bg-primary/10 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            (مخصص)
                          </span>
                        )}
                      </div>
                    ) : (
                      <Select
                        value={String(
                          item.dbCategoryId ||
                            dbOptions.find(
                              (v: any) => (v.valueAr || v.value) === item.name
                            )?.id ||
                            ''
                        )}
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
                    {canEvaluate && !isAlreadyApproved ? (
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { description: e.target.value })
                        }
                        placeholder="اكتب مواصفات أو تفاصيل إضافية للصنف (اختياري)..."
                        rows={1}
                        className="text-xs min-h-[36px] max-h-[90px] resize-y bg-muted/20 focus:bg-background border-input/80 py-1.5 px-2.5 leading-relaxed rounded-md transition-colors mt-1.5"
                      />
                    ) : (
                      item.description && (
                        <p className="text-[11px] text-muted-foreground mt-1">{item.description}</p>
                      )
                    )}
                  </td>

                  {/* 2. التصنيف الفرعي */}
                  <td className="p-3 text-center align-top pt-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium text-[10px]">
                      {item.category || 'عام'}
                    </span>
                  </td>

                  {/* 3. دورية التوريد */}
                  <td className="p-3 text-center align-top pt-3">
                    {canEvaluate && !isAlreadyApproved ? (
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
                    ) : (
                      <span className="text-muted-foreground font-medium">{item.frequency || 'شهري'}</span>
                    )}
                  </td>

                  {/* 4. الكمية المطلوبة - قابلة للتعديل مباشرة في الجدول */}
                  <td className="p-3 text-center align-top pt-3">
                    {canEvaluate && !isAlreadyApproved ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })
                          }
                          className="h-8 text-xs text-center w-20 mx-auto bg-background border-border/80"
                        />
                        <span className="text-[10px] text-muted-foreground font-normal shrink-0">{item.unit}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-foreground">
                        {item.quantity}{' '}
                        <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                      </span>
                    )}
                  </td>

                  {/* 5. المعيار القياسي */}
                  <td className="p-3 text-center align-top pt-3.5 text-muted-foreground">
                    {evalItem ? (
                      <>
                        <span className="font-medium">{evalItem.standardQty}</span>{' '}
                        <span className="text-[10px]">{evalItem.unit}</span>
                      </>
                    ) : (
                      <span className="text-[10px]">-</span>
                    )}
                  </td>

                  {/* 6. الكمية المعتمدة - قابلة للتعديل مباشرة في الجدول */}
                  <td className="p-3 text-center align-top pt-3">
                    {canEvaluate && !isAlreadyApproved ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={approvedVal}
                          onChange={(e) => handleApprovedQuantityChange(item.id, Number(e.target.value))}
                          className="h-8 text-xs text-center w-20 mx-auto font-bold text-cyan-600 bg-background border-border/80"
                        />
                        <span className="text-[10px] text-muted-foreground font-normal shrink-0">{item.unit}</span>
                      </div>
                    ) : (
                      <strong className="font-bold text-cyan-600">
                        {approvedVal} {item.unit}
                      </strong>
                    )}
                  </td>

                  {/* 7. إجراء الحذف فقط (تمت إزالة زر القلم كما طُلب) */}
                  {canEvaluate && !isAlreadyApproved && (
                    <td className="p-3 text-center align-top pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}

            {itemsList.length === 0 && (
              <tr>
                <td
                  colSpan={canEvaluate && !isAlreadyApproved ? 7 : 6}
                  className="p-6 text-center text-muted-foreground text-xs"
                >
                  لا توجد بنود مسجلة حالياً في دراسة الاحتياج. يمكنك إضافة بنود جديدة من الأزرار.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2. زر إضافة بند جديد في أسفل الجدول تماماً كما في صفحة نموذج الطلب */}
      {canEvaluate && !isAlreadyApproved && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddNewRow}
            className="h-8 text-xs font-medium gap-1.5 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة بند جديد</span>
          </Button>
        </div>
      )}

      {/* ملاحظات الموظف */}
      <div className="pt-2">
        <label className="text-xs font-semibold text-foreground mb-1 block">
          ملاحظات وتوصيات التقييم المكتبي
        </label>
        <Textarea
          rows={2}
          value={officeNotes}
          onChange={(e) => setOfficeNotes(e.target.value)}
          disabled={!canEvaluate || isAlreadyApproved}
          className="text-xs resize-none bg-background border-border/80"
          placeholder="ملاحظات فنية حول دراسة الاحتياج وضبط الكميات..."
        />
      </div>

      {/* أزرار الحفظ والاعتماد */}
      {canEvaluate && !isAlreadyApproved && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={approveMutation.isPending}
            className="w-full sm:w-auto text-xs font-semibold h-9 px-4 gap-1.5 border-border hover:bg-muted/60 cursor-pointer"
          >
            {approveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span>حفظ التعديلات كمسودة</span>
          </Button>

          <Button
            type="button"
            onClick={handleApproveAnnualNeed}
            disabled={approveMutation.isPending}
            className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-9 px-5 text-xs gap-1.5 shadow-xs cursor-pointer"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الاحتياج السنوي والانتقال للمرحلة القادمة</span>
              </>
            )}
          </Button>
        </div>
      )}

      {isAlreadyApproved && (
        <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-800 dark:text-cyan-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
          <span>تم اعتماد الاحتياج السنوي ونقل الطلب لمرحلة جدول الكميات (BOQ) بنجاح.</span>
        </div>
      )}
    </div>
  );
};
