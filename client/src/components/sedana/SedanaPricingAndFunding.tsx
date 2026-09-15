import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Droplets, Package, Users, FileText, CheckCircle2, Coins, UserCheck, Share2, Paperclip, Building2, ShoppingBag, ShieldCheck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { FileUpload, UploadedFile } from '@/components/FileUpload';

interface SedanaPricingAndFundingProps {
  request: {
    id: number;
    requestNumber: string;
    programType: string;
    programData?: any;
    currentStage: string;
  };
  onComplete?: () => void;
  onSaveDraft?: (fieldUpdates: any) => void;
  canEdit?: boolean;
}

export const SedanaPricingAndFunding: React.FC<SedanaPricingAndFundingProps> = ({
  request,
  onComplete,
  onSaveDraft,
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
  const existingFunding = programData.sedanaFundingDetails || {};

  // 1. مصفوفة عروض الأسعار للموردين (Multi-Vendor Quotations)
  const [waterSupplier, setWaterSupplier] = useState({
    supplierName: existingMatrix.water?.supplierName || '',
    quoteRef: existingMatrix.water?.quoteRef || '',
    quoteFileUrl: existingMatrix.water?.quoteFileUrl || '',
    totalCost: Number(existingMatrix.water?.totalCost || 0),
  });

  const [suppliesSupplier, setSuppliesSupplier] = useState({
    supplierName: existingMatrix.supplies?.supplierName || '',
    quoteRef: existingMatrix.supplies?.quoteRef || '',
    quoteFileUrl: existingMatrix.supplies?.quoteFileUrl || '',
    totalCost: Number(existingMatrix.supplies?.totalCost || 0),
  });

  const [laborSupplier, setLaborSupplier] = useState({
    supplierName: existingMatrix.labor?.supplierName || '',
    quoteRef: existingMatrix.labor?.quoteRef || '',
    quoteFileUrl: existingMatrix.labor?.quoteFileUrl || '',
    totalCost: Number(existingMatrix.labor?.totalCost || 0),
  });

  // حساب التكلفة الفعلية الشاملة (Base Cost)
  const totalActualCost = useMemo(() => {
    return Number(waterSupplier.totalCost || 0) + 
           Number(suppliesSupplier.totalCost || 0) + 
           Number(laborSupplier.totalCost || 0);
  }, [waterSupplier.totalCost, suppliesSupplier.totalCost, laborSupplier.totalCost]);

  // 2. حاسبة الرسوم والمصاريف الإدارية (Fee Loading Calculator)
  const [operationalFeePercent, setOperationalFeePercent] = useState<number>(
    Number(existingFunding.operationalFeePercent ?? 15)
  );
  const [gatewayFeePercent, setGatewayFeePercent] = useState<number>(
    Number(existingFunding.gatewayFeePercent ?? 5)
  );
  const [supervisionFeeFixed, setSupervisionFeeFixed] = useState<number>(
    Number(existingFunding.supervisionFeeFixed ?? 0)
  );

  const operationalAmount = useMemo(() => Math.round((totalActualCost * operationalFeePercent) / 100), [totalActualCost, operationalFeePercent]);
  const gatewayAmount = useMemo(() => Math.round((totalActualCost * gatewayFeePercent) / 100), [totalActualCost, gatewayFeePercent]);
  const totalAdminFees = useMemo(() => operationalAmount + gatewayAmount + Number(supervisionFeeFixed || 0), [operationalAmount, gatewayAmount, supervisionFeeFixed]);
  const targetOpportunityValue = useMemo(() => totalActualCost + totalAdminFees, [totalActualCost, totalAdminFees]);

  // 3. مسار التمويل والتنفيذ
  const [fundingPath, setFundingPath] = useState<'direct_purchase' | 'crowdfunding'>(
    existingFunding.fundingPath || 'crowdfunding'
  );

  // صور التأمين وإصدار أمر الشراء (المحطة 05)
  const [procurementMode, setProcurementMode] = useState<
    'supplier_contract' | 'direct_purchase' | 'official_commission' | 'csr_in_kind'
  >(existingFunding.procurementMode || 'supplier_contract');

  const existingDirectDonor = existingFunding.directDonorInfo || {};
  const [directDonorInfo, setDirectDonorInfo] = useState({
    donorName: existingDirectDonor.donorName || '',
    donorPhone: existingDirectDonor.donorPhone || '',
    receiptRef: existingDirectDonor.receiptRef || '',
    receiptFileUrl: existingDirectDonor.receiptFileUrl || '',
  });

  const saveMatrixMutation = trpc.requests.saveSedanaSuppliersMatrix.useMutation();
  const saveFundingMutation = trpc.requests.saveSedanaFundingChoice.useMutation();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAll = async (shouldAdvance: boolean = true) => {
    if (fundingPath === 'direct_purchase' && (!directDonorInfo.donorName || !directDonorInfo.receiptRef)) {
      toast.error('يرجى إدخال اسم المتبرع المباشر ورقم سند القبض');
      return;
    }

    setIsSaving(true);
    try {
      const matrixPayload = {
        suppliersMatrix: {
          water: { ...waterSupplier, items: ['مياه الشرب والصهاريج'] },
          supplies: { ...suppliesSupplier, items: ['المناديل والورقيات والمنظفات'] },
          labor: { ...laborSupplier, items: ['عقد عمالة النظافة والتشغيل'] },
        },
        totalActualCost,
        notes: 'تم اعتماد تجزئة الشراء والتكلفة الفعلية للمسجد.',
      };

      const fundingPayload = {
        actualMosqueCost: totalActualCost,
        operationalFeePercent,
        gatewayFeePercent,
        supervisionFeeFixed,
        adminFeeTotal: totalAdminFees,
        donorOpportunityPrice: targetOpportunityValue,
        fundingPath,
        procurementMode,
        directDonorInfo: fundingPath === 'direct_purchase' ? directDonorInfo : undefined,
        crowdfundingConfig: fundingPath === 'crowdfunding' ? {
          sharePrices: [100, 300, 500],
          targetAmount: targetOpportunityValue,
        } : undefined,
        notes: 'تم تطبيق حاسبة الهندسة المالية واعتمد مسار التمويل وأمر الشراء.',
      };

      if (onSaveDraft) {
        onSaveDraft({
          sedanaSuppliersMatrix: matrixPayload,
          actualMosqueCost: totalActualCost,
          sedanaFundingDetails: fundingPayload,
          donorOpportunityPrice: targetOpportunityValue,
        });
      }

      if (request.id && request.id !== 0) {
        await saveMatrixMutation.mutateAsync({
          requestId: request.id,
          ...matrixPayload,
          shouldAdvanceStage: false,
        });

        await saveFundingMutation.mutateAsync({
          requestId: request.id,
          ...fundingPayload,
          shouldAdvanceStage: shouldAdvance,
        });
      }

      toast.success('تم حفظ التكلفة والهندسة المالية ومسار التمويل بنجاح');
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* المحطة 03: مصفوفة عروض الأسعار وتعدد الموردين */}
      <div className="bg-card border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              03
            </span>
            <h3 className="font-bold text-base text-foreground">مصفوفة عروض الأسعار وتعدد الموردين</h3>
          </div>
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 self-start sm:self-center flex items-center gap-2">
            <span>التكلفة الفعلية الشاملة (Base Cost):</span>
            <span className="font-mono text-sm font-extrabold">{totalActualCost.toLocaleString()} ر.س</span>
          </div>
        </div>

        {/* الموردين 3 مسارات مجهزة تحت بعض أو شبكة متناسقة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. مورد المياه */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-600" />
                مورد مياه الصفا والصهاريج
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold px-2 py-0.5 rounded">
                مياه
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">اسم المورد / الشركة</label>
                <Input
                  placeholder="شركة سقيا المياه"
                  value={waterSupplier.supplierName}
                  onChange={(e) => setWaterSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">رقم عرض السعر</label>
                <Input
                  placeholder="QUO-WAT-2026"
                  value={waterSupplier.quoteRef}
                  onChange={(e) => setWaterSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">إرفاق عرض السعر</label>
                {canEdit ? (
                  <FileUpload
                    onFilesSelected={(files: UploadedFile[]) => {
                      if (files.length > 0) {
                        setWaterSupplier((prev) => ({ ...prev, quoteFileUrl: files[0].fileData }));
                        toast.success('تم إرفاق عرض سعر المياه');
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={5}
                    label="رفع الملف"
                  />
                ) : null}
                {waterSupplier.quoteFileUrl && (
                  <a
                    href={waterSupplier.quoteFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline mt-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    معاينة الملف المرفق
                  </a>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">التكلفة (ريال)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={waterSupplier.totalCost || ''}
                  onChange={(e) => setWaterSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                  disabled={!canEdit}
                  className="text-xs font-bold font-mono h-9 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* 2. مورد المستلزمات والمنظفات */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-600" />
                مورد المنظفات والورقيات
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold px-2 py-0.5 rounded">
                مستلزمات
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">اسم المصنع / المورد</label>
                <Input
                  placeholder="مصنع المنظفات والورقيات"
                  value={suppliesSupplier.supplierName}
                  onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">رقم عرض السعر</label>
                <Input
                  placeholder="QUO-SUP-2026"
                  value={suppliesSupplier.quoteRef}
                  onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">إرفاق عرض السعر</label>
                {canEdit ? (
                  <FileUpload
                    onFilesSelected={(files: UploadedFile[]) => {
                      if (files.length > 0) {
                        setSuppliesSupplier((prev) => ({ ...prev, quoteFileUrl: files[0].fileData }));
                        toast.success('تم إرفاق عرض سعر المستلزمات');
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={5}
                    label="رفع الملف"
                  />
                ) : null}
                {suppliesSupplier.quoteFileUrl && (
                  <a
                    href={suppliesSupplier.quoteFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline mt-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    معاينة الملف المرفق
                  </a>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">التكلفة (ريال)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={suppliesSupplier.totalCost || ''}
                  onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                  disabled={!canEdit}
                  className="text-xs font-bold font-mono h-9 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* 3. شركة العمالة والتشغيل */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                شركة التشغيل وعمالة النظافة
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded">
                عمالة وتأمين
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">اسم الشركة / الجهة</label>
                <Input
                  placeholder="شركة الصيانة التشغيلية"
                  value={laborSupplier.supplierName}
                  onChange={(e) => setLaborSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">رقم العقد / التعميد</label>
                <Input
                  placeholder="CNT-LBR-2026"
                  value={laborSupplier.quoteRef}
                  onChange={(e) => setLaborSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">إرفاق العقد الرسمي</label>
                {canEdit ? (
                  <FileUpload
                    onFilesSelected={(files: UploadedFile[]) => {
                      if (files.length > 0) {
                        setLaborSupplier((prev) => ({ ...prev, quoteFileUrl: files[0].fileData }));
                        toast.success('تم إرفاق عقد العمالة والتشغيل');
                      }
                    }}
                    maxFiles={1}
                    maxSizeMB={5}
                    label="رفع العقد"
                  />
                ) : null}
                {laborSupplier.quoteFileUrl && (
                  <a
                    href={laborSupplier.quoteFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline mt-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    معاينة الملف المرفق
                  </a>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">التكلفة (ريال)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={laborSupplier.totalCost || ''}
                  onChange={(e) => setLaborSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                  disabled={!canEdit}
                  className="text-xs font-bold font-mono h-9 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* المحطة 04: الهندسة المالية وحاسبة الرسوم الإدارية (نموذج 25/30) */}
      <div className="bg-card border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              04
            </span>
            <h3 className="font-bold text-base text-foreground">الهندسة المالية وحاسبة الأجور (نموذج 25/30)</h3>
          </div>
          <div className="text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 self-start sm:self-center">
            <span>سعر الفرصة المحمل بالأجور:</span>
            <span className="font-mono text-sm">{targetOpportunityValue.toLocaleString()} ر.س</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <label className="text-muted-foreground block text-[11px] mb-1 font-medium">المصاريف الإدارية والتشغيلية (%)</label>
            <Input
              type="number"
              value={operationalFeePercent}
              onChange={(e) => setOperationalFeePercent(Number(e.target.value))}
              disabled={!canEdit}
              className="h-9 text-xs font-bold font-mono text-center bg-white dark:bg-slate-900"
            />
            <span className="text-[10px] text-muted-foreground block text-center mt-1 font-mono">({operationalAmount.toLocaleString()} ر.س)</span>
          </div>

          <div>
            <label className="text-muted-foreground block text-[11px] mb-1 font-medium">رسوم المنصات والبوابات البنكية (%)</label>
            <Input
              type="number"
              value={gatewayFeePercent}
              onChange={(e) => setGatewayFeePercent(Number(e.target.value))}
              disabled={!canEdit}
              className="h-9 text-xs font-bold font-mono text-center bg-white dark:bg-slate-900"
            />
            <span className="text-[10px] text-muted-foreground block text-center mt-1 font-mono">({gatewayAmount.toLocaleString()} ر.س)</span>
          </div>

          <div>
            <label className="text-muted-foreground block text-[11px] mb-1 font-medium">رسوم الإشراف والاستشارات (مبلغ ثابت)</label>
            <Input
              type="number"
              value={supervisionFeeFixed || ''}
              onChange={(e) => setSupervisionFeeFixed(Number(e.target.value))}
              disabled={!canEdit}
              placeholder="0"
              className="h-9 text-xs font-bold font-mono text-center bg-white dark:bg-slate-900"
            />
            <span className="text-[10px] text-muted-foreground block text-center mt-1 font-mono">({Number(supervisionFeeFixed || 0).toLocaleString()} ر.س)</span>
          </div>

          <div className="flex flex-col justify-center items-center p-2.5 rounded-xl bg-emerald-600 text-white font-bold text-center">
            <span className="text-[10px] opacity-90 block font-normal">إجمالي أجور الجمعية والمنصات</span>
            <span className="text-base font-mono mt-0.5">+{totalAdminFees.toLocaleString()} ر.س</span>
          </div>
        </div>
      </div>

      {/* المحطة 05: تحديد مسار التمويل وصور التأمين لإصدار أمر الشراء */}
      <div className="bg-card border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            05
          </span>
          <h3 className="font-bold text-base text-foreground">تحديد مسار التمويل وصور التأمين (أمر الشراء)</h3>
        </div>

        {/* 1. خيارات مسار التمويل */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">مسار التمويل:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* خيار أ: إسناد لمتبرع مباشر */}
            <div
              onClick={() => canEdit && setFundingPath('direct_purchase')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                fundingPath === 'direct_purchase'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-border/60 bg-card hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-2 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  خيار أ: إسناد لمتبرع مباشر (كفالة فردية)
                </span>
                {fundingPath === 'direct_purchase' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />}
              </div>
            </div>

            {/* خيار ب: تحويل إلى فرصة تبرع رقمية */}
            <div
              onClick={() => canEdit && setFundingPath('crowdfunding')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                fundingPath === 'crowdfunding'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-border/60 bg-card hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-2 text-xs">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  خيار ب: فرصة تبرع رقمية (تمويل جماعي)
                </span>
                {fundingPath === 'crowdfunding' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />}
              </div>
            </div>
          </div>
        </div>

        {/* بيانات المتبرع المباشر */}
        {fundingPath === 'direct_purchase' && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">اسم المتبرع المباشر *</label>
                <Input
                  placeholder="اسم فاعل الخير / الكفيل"
                  value={directDonorInfo.donorName}
                  onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, donorName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم الجوال</label>
                <Input
                  placeholder="05XXXXXXXX"
                  value={directDonorInfo.donorPhone}
                  onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, donorPhone: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم سند القبض / المرجع *</label>
                <Input
                  placeholder="رقم السند / الإيصال"
                  value={directDonorInfo.receiptRef}
                  onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, receiptRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">إرفاق إيصال سند القبض</label>
              {canEdit ? (
                <FileUpload
                  onFilesSelected={(files: UploadedFile[]) => {
                    if (files.length > 0) {
                      setDirectDonorInfo((prev) => ({ ...prev, receiptFileUrl: files[0].fileData }));
                      toast.success('تم إرفاق سند القبض');
                    }
                  }}
                  maxFiles={1}
                  maxSizeMB={5}
                  label="رفع سند القبض"
                />
              ) : null}
              {directDonorInfo.receiptFileUrl && (
                <a
                  href={directDonorInfo.receiptFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline mt-1"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  معاينة إيصال سند القبض
                </a>
              )}
            </div>
          </div>
        )}

        {/* بيانات التمويل الجماعي */}
        {fundingPath === 'crowdfunding' && (
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-300">
              هدف الفرصة ({targetOpportunityValue.toLocaleString()} ر.س) - توزيع أسهم التبرع:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border font-mono font-semibold">100 ر.س / سهم</span>
              <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border font-mono font-semibold">300 ر.س / سهم</span>
              <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border font-mono font-semibold">500 ر.س / سهم</span>
            </div>
          </div>
        )}

        {/* 2. صور التأمين (صور التنفيذ وأمر الشراء) */}
        <div className="pt-2 space-y-2 border-t border-border/50">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            صور التأمين وإصدار أمر الشراء (المحطة 05):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { id: 'supplier_contract', label: 'عقد مع مورد' },
              { id: 'direct_purchase', label: 'شراء مباشر' },
              { id: 'official_commission', label: 'تعميد جهة' },
              { id: 'csr_in_kind', label: 'مسؤولية مجتمعية / عيني' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => canEdit && setProcurementMode(mode.id as any)}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                  procurementMode === mode.id
                    ? 'border-emerald-600 bg-emerald-600 text-white font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* زر الاعتماد الموحد */}
      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            onClick={() => handleSaveAll(true)}
            disabled={isSaving || totalActualCost <= 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-11 px-7 gap-2 font-bold shadow-md rounded-xl"
          >
            {isSaving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <CheckCircle2 className="w-4.5 h-4.5" />}
            اعتماد التسعير والهندسة المالية وإصدار أمر الشراء
          </Button>
        </div>
      )}
    </div>
  );
};
