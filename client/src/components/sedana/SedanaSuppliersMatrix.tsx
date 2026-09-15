import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Droplets, Package, Users, FileText, CheckCircle2, ArrowRight, Upload, Paperclip, AlertCircle, ShoppingBag } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { FileUpload, UploadedFile } from '@/components/FileUpload';

interface SedanaSuppliersMatrixProps {
  request: {
    id: number;
    requestNumber: string;
    programType: string;
    programData?: any;
    currentStage: string;
  };
  onComplete?: () => void;
  canEdit?: boolean;
}

export const SedanaSuppliersMatrix: React.FC<SedanaSuppliersMatrixProps> = ({
  request,
  onComplete,
  canEdit = true,
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

  const existingMatrix = programData.sedanaSuppliersMatrix?.matrix || {};
  const isAlreadySaved = Boolean(programData.sedanaSuppliersMatrix?.updatedAt);

  // استخراج البنود السنوية المعتمدة لتفكيكها تلقائياً على الموردين
  const approvedItemsMap = programData.approvedPlan?.approvedItems || {};
  const rawBasketItems: any[] = programData.basketItems || [];

  // تفكيك البنود تلقائياً حسب المجال
  const groupedItems = useMemo(() => {
    const water: string[] = [];
    const supplies: string[] = [];
    const labor: string[] = [];

    rawBasketItems.forEach((item) => {
      const name = item.name || '';
      const cat = (item.category || '').toLowerCase();
      const qty = approvedItemsMap[item.id] ?? item.quantity ?? 1;
      const displayStr = `${name} (${qty} ${item.unit || ''})`;

      if (cat.includes('ماء') || cat.includes('مياه') || name.includes('ماء') || name.includes('مياه') || name.includes('صهريج')) {
        water.push(displayStr);
      } else if (cat.includes('عمالة') || cat.includes('نظافة') || name.includes('عامل') || name.includes('تشغيل') || name.includes('صيانة')) {
        labor.push(displayStr);
      } else {
        supplies.push(displayStr);
      }
    });

    if (water.length === 0) water.push('كراتين المياه الشرب', 'صهاريج المياه (عند الحاجة)');
    if (supplies.length === 0) supplies.push('المناديل الورقية والعبوات', 'المنظفات والمعطرات مطهرة الأرضيات', 'الأكياس والمستلزمات البلاستيكية');
    if (labor.length === 0) labor.push('عقد عمالة النظافة التشغيلية السنوي', 'الإشراف والصيانة الفورية');

    return { water, supplies, labor };
  }, [rawBasketItems, approvedItemsMap]);

  // حالة الموردين لكل مجال
  const [waterSupplier, setWaterSupplier] = useState({
    supplierName: existingMatrix.water?.supplierName || '',
    quoteRef: existingMatrix.water?.quoteRef || '',
    quoteFileUrl: existingMatrix.water?.quoteFileUrl || '',
    totalCost: Number(existingMatrix.water?.totalCost || 0),
    notes: existingMatrix.water?.notes || '',
  });

  const [suppliesSupplier, setSuppliesSupplier] = useState({
    supplierName: existingMatrix.supplies?.supplierName || '',
    quoteRef: existingMatrix.supplies?.quoteRef || '',
    quoteFileUrl: existingMatrix.supplies?.quoteFileUrl || '',
    totalCost: Number(existingMatrix.supplies?.totalCost || 0),
    notes: existingMatrix.supplies?.notes || '',
  });

  const [laborSupplier, setLaborSupplier] = useState({
    supplierName: existingMatrix.labor?.supplierName || '',
    quoteRef: existingMatrix.labor?.quoteRef || '',
    quoteFileUrl: existingMatrix.labor?.quoteFileUrl || '',
    totalCost: Number(existingMatrix.labor?.totalCost || 0),
    notes: existingMatrix.labor?.notes || '',
  });

  const [generalNotes, setGeneralNotes] = useState(
    programData.sedanaSuppliersMatrix?.notes || 'تم تفكيك البنود تلقائياً وإسنادها للموردين المتخصصين واحتساب التكلفة الفعلية للمسجد.'
  );

  // التكلفة الفعلية الإجمالية للمسجد
  const totalActualCost = useMemo(() => {
    return Number(waterSupplier.totalCost || 0) + 
           Number(suppliesSupplier.totalCost || 0) + 
           Number(laborSupplier.totalCost || 0);
  }, [waterSupplier.totalCost, suppliesSupplier.totalCost, laborSupplier.totalCost]);

  const saveMatrixMutation = trpc.requests.saveSedanaSuppliersMatrix.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      if (onComplete) onComplete();
    },
    onError: (err) => {
      toast.error(err.message || 'حدث خطأ أثناء حفظ مصفوفة عروض الأسعار');
    },
  });

  const handleSave = (shouldAdvanceStage: boolean) => {
    saveMatrixMutation.mutate({
      requestId: request.id,
      suppliersMatrix: {
        water: {
          ...waterSupplier,
          items: groupedItems.water,
        },
        supplies: {
          ...suppliesSupplier,
          items: groupedItems.supplies,
        },
        labor: {
          ...laborSupplier,
          items: groupedItems.labor,
        },
      },
      totalActualCost,
      notes: generalNotes,
      shouldAdvanceStage,
    });
  };

  return (
    <div className="space-y-5 p-5 rounded-2xl border border-border/80 bg-card text-right shadow-xs" dir="rtl">
      {/* شريط العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              المحطة 3
            </span>
            <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              تجزئة الشراء وتعدد الموردين (مصفوفة عروض الأسعار)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            يتم تفكيك بنود المسجد آلياً لتوزيعها على الموردين المتخصصين بدلاً من الاحتكار، وتحديد التكلفة الفعلية للمسجد.
          </p>
        </div>
        {isAlreadySaved && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 self-start sm:self-center flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            التكلفة الفعلية المعتمدة: {totalActualCost.toLocaleString()} ريال
          </span>
        )}
      </div>

      {/* التفكيك الآلي لبنود سدانة */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <span>التفكيك التلقائي لبنود التشغيل المقترحة:</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          قام النظام بتوزيع البنود المعتمدة في السلة على 3 مسارات توريد مستقلة لمنع احتكار المورد الواحد وضمان أنسب الأسعار.
        </p>
      </div>

      {/* الموردين مقسمين حسب المجال */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. مورد المياه */}
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/70 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>1. مورد المياه والصهاريج</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                تخصص مياه
              </span>
            </div>

            {/* قائمة البنود المفككة لهذا المسار */}
            <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50 space-y-1">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">البنود المفككة الموجهة للمورد:</span>
              <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                {groupedItems.water.map((it, idx) => (
                  <li key={idx} className="truncate">{it}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">اسم شركة / مورد المياه</label>
                <Input
                  placeholder="مثال: شركة سقيا الماء المحدودة"
                  value={waterSupplier.supplierName}
                  onChange={(e) => setWaterSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم عرض السعر / المرجع</label>
                <Input
                  placeholder="مثال: QUO-WAT-2026-01"
                  value={waterSupplier.quoteRef}
                  onChange={(e) => setWaterSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              {/* ملف عرض السعر */}
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">ملف عرض السعر (PDF / صورة)</label>
                {canEdit ? (
                  <FileUpload
                    onFilesSelected={(files: UploadedFile[]) => {
                      if (files.length > 0) {
                        setWaterSupplier((prev) => ({ ...prev, quoteFileUrl: files[0].fileData }));
                        toast.success('تم إرفاق ملف عرض سعر المياه');
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={5}
                    label="رفع عرض السعر"
                    description="اختر ملف عرض سعر المياه"
                  />
                ) : null}
                {waterSupplier.quoteFileUrl && (
                  <div className="mt-1.5 flex items-center justify-between p-2 rounded bg-blue-100/60 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px]">
                    <span className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-medium truncate">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      مرفق عرض السعر
                    </span>
                    <a
                      href={waterSupplier.quoteFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 dark:text-blue-400 font-bold hover:underline underline-offset-2 shrink-0"
                    >
                      معاينة
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 block mb-1">التكلفة الفعلية لمسار المياه (ريال)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={waterSupplier.totalCost || ''}
                  onChange={(e) => setWaterSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                  disabled={!canEdit}
                  className="text-sm font-bold font-mono bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. مورد المناديل والمستلزمات البلاستيكية والمنظفات */}
        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-200/70 dark:border-purple-800">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold text-sm">
                <Package className="w-4 h-4 text-purple-600" />
                <span>2. مورد المنظفات والورقيات</span>
              </div>
              <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded">
                مستلزمات وبلاستيك
              </span>
            </div>

            {/* قائمة البنود المفككة لهذا المسار */}
            <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/50 space-y-1">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block">البنود المفككة الموجهة للمورد:</span>
              <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                {groupedItems.supplies.map((it, idx) => (
                  <li key={idx} className="truncate">{it}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">اسم مصنع / مورد المستلزمات</label>
                <Input
                  placeholder="مثال: مصنع النظافة والمنتجات البلاستيكية"
                  value={suppliesSupplier.supplierName}
                  onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم عرض السعر / المرجع</label>
                <Input
                  placeholder="مثال: QUO-PLS-2026-99"
                  value={suppliesSupplier.quoteRef}
                  onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              {/* ملف عرض السعر */}
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">ملف عرض السعر (PDF / صورة)</label>
                {canEdit ? (
                  <FileUpload
                    onFilesSelected={(files: UploadedFile[]) => {
                      if (files.length > 0) {
                        setSuppliesSupplier((prev) => ({ ...prev, quoteFileUrl: files[0].fileData }));
                        toast.success('تم إرفاق ملف عرض سعر المستلزمات والورقيات');
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={5}
                    label="رفع عرض السعر"
                    description="اختر ملف عرض سعر المنظفات والمناديل"
                  />
                ) : null}
                {suppliesSupplier.quoteFileUrl && (
                  <div className="mt-1.5 flex items-center justify-between p-2 rounded bg-purple-100/60 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px]">
                    <span className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300 font-medium truncate">
                      <Paperclip className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      مرفق عرض السعر
                    </span>
                    <a
                      href={suppliesSupplier.quoteFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 dark:text-purple-400 font-bold hover:underline underline-offset-2 shrink-0"
                    >
                      معاينة
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-purple-900 dark:text-purple-300 block mb-1">التكلفة الفعلية لمسار المستلزمات (ريال)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={suppliesSupplier.totalCost || ''}
                  onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                  disabled={!canEdit}
                  className="text-sm font-bold font-mono bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. شركة التشغيل أو عمالة النظافة / التعميد الداخلي */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/70 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                <Users className="w-4 h-4 text-amber-600" />
                <span>3. شركة التشغيل / عمالة النظافة</span>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">
                تشغيل وصيانة
              </span>
            </div>

            {/* قائمة البنود المفككة لهذا المسار */}
            <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/50 space-y-1">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">البنود المفككة الموجهة للمورد:</span>
              <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                {groupedItems.labor.map((it, idx) => (
                  <li key={idx} className="truncate">{it}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">اسم شركة التشغيل / التعميد الداخلي</label>
                <Input
                  placeholder="مثال: شركة النظافة والصيانة المعتمدة"
                  value={laborSupplier.supplierName}
                  onChange={(e) => setLaborSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم العقد / التعميد</label>
                <Input
                  placeholder="مثال: CNT-LBR-2026-15"
                  value={laborSupplier.quoteRef}
                  onChange={(e) => setLaborSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              {/* ملف عرض السعر أو العقد */}
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">ملف العقد / عرض السعر (PDF / صورة)</label>
                {canEdit ? (
                  <FileUpload
                    onFilesSelected={(files: UploadedFile[]) => {
                      if (files.length > 0) {
                        setLaborSupplier((prev) => ({ ...prev, quoteFileUrl: files[0].fileData }));
                        toast.success('تم إرفاق ملف عقد التشغيل والعمالة');
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={5}
                    label="رفع العقد / عرض السعر"
                    description="اختر ملف عقد العمالة والتشغيل"
                  />
                ) : null}
                {laborSupplier.quoteFileUrl && (
                  <div className="mt-1.5 flex items-center justify-between p-2 rounded bg-amber-100/60 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px]">
                    <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium truncate">
                      <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      مرفق عقد التشغيل
                    </span>
                    <a
                      href={laborSupplier.quoteFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 dark:text-amber-400 font-bold hover:underline underline-offset-2 shrink-0"
                    >
                      معاينة
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 block mb-1">التكلفة الفعلية لمسار العمالة (ريال)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={laborSupplier.totalCost || ''}
                  onChange={(e) => setLaborSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                  disabled={!canEdit}
                  className="text-sm font-bold font-mono bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* بطاقة ملخص التكلفة الفعلية للمسجد */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-muted-foreground font-semibold block">إجمالي التكلفة الفعلية الشاملة للمسجد (Base Cost):</span>
          <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
            {totalActualCost.toLocaleString()} <span className="text-sm font-normal text-slate-600 dark:text-slate-300">ريال سعودي</span>
          </span>
        </div>
        <div className="text-right sm:max-w-xs space-y-1">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            هذه التكلفة الناتجة عن تجميع عروض أسعار الموردين المتخصصين لمجموع البنود الثلاثة.
          </p>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">
            ستُستخدم هذه التكلفة كأساس في الهندسة المالية (المحطة 4).
          </span>
        </div>
      </div>

      {/* ملاحظات إضافية */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-foreground block">ملاحظات اعتماد المصفوفة والتوريد</label>
        <Textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="إضافة أي تفاصيل خاصة بشروط التوريد والموردين..."
          disabled={!canEdit}
          rows={2}
          className="text-xs bg-white dark:bg-slate-900 resize-none"
        />
      </div>

      {/* أزرار الإجراءات */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saveMatrixMutation.isPending}
            className="w-full sm:w-auto text-xs h-10 px-4"
          >
            {saveMatrixMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
            حفظ المصفوفة فقط
          </Button>

          <Button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saveMatrixMutation.isPending || totalActualCost <= 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-5 gap-2 font-bold shadow-xs"
          >
            {saveMatrixMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-1.5" />
            ) : (
              <ArrowRight className="w-4 h-4 ml-1" />
            )}
            اعتماد التكلفة الفعلية والانتقال للهندسة المالية والتمويل (المحطة 4)
          </Button>
        </div>
      )}
    </div>
  );
};
