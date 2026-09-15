import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Droplets, Package, Users, FileText, CheckCircle2, Coins, UserCheck, Share2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

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

  // حالة الموردين (المحطة 3 - تجزئة الشراء وتعدد الموردين)
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

  // التكلفة الفعلية المباشرة للمسجد (Base Cost)
  const totalActualCost = useMemo(() => {
    return Number(waterSupplier.totalCost || 0) + 
           Number(suppliesSupplier.totalCost || 0) + 
           Number(laborSupplier.totalCost || 0);
  }, [waterSupplier.totalCost, suppliesSupplier.totalCost, laborSupplier.totalCost]);

  // الهندسة المالية (المحطة 4 - نموذج 25/30)
  const [operationalFeePercent, setOperationalFeePercent] = useState<number>(
    Number(existingFunding.operationalFeePercent ?? 15)
  );
  const [gatewayFeePercent, setGatewayFeePercent] = useState<number>(
    Number(existingFunding.gatewayFeePercent ?? 5)
  );

  const operationalAmount = useMemo(() => Math.round((totalActualCost * operationalFeePercent) / 100), [totalActualCost, operationalFeePercent]);
  const gatewayAmount = useMemo(() => Math.round((totalActualCost * gatewayFeePercent) / 100), [totalActualCost, gatewayFeePercent]);
  const totalAdminFees = useMemo(() => operationalAmount + gatewayAmount, [operationalAmount, gatewayAmount]);
  const donorOpportunityPrice = useMemo(() => totalActualCost + totalAdminFees, [totalActualCost, totalAdminFees]);

  // مسار التمويل
  const [fundingPath, setFundingPath] = useState<'direct_purchase' | 'crowdfunding'>(
    existingFunding.fundingPath || 'crowdfunding'
  );

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
      toast.error('يرجى كتابة اسم المتبرع المباشر ورقم سند القبض');
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
        adminFeeTotal: totalAdminFees,
        donorOpportunityPrice,
        fundingPath,
        directDonorInfo: fundingPath === 'direct_purchase' ? directDonorInfo : undefined,
        crowdfundingConfig: fundingPath === 'crowdfunding' ? {
          sharePrices: [100, 300, 500],
          targetAmount: donorOpportunityPrice,
        } : undefined,
        notes: 'تم تطبيق نموذج الهندسة المالية (25/30) واعتمد مسار الكفالة.',
      };

      if (onSaveDraft) {
        onSaveDraft({
          sedanaSuppliersMatrix: matrixPayload,
          actualMosqueCost: totalActualCost,
          sedanaFundingDetails: fundingPayload,
          donorOpportunityPrice,
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
      {/* القسم الأول: تجزئة الشراء وتعدد الموردين */}
      <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-foreground">1. تجزئة الشراء وتعدد الموردين</h3>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            التكلفة الفعلية للمسجد: {totalActualCost.toLocaleString()} ريال
          </span>
        </div>

        {/* كروت الموردين الثلاثة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* مورد المياه */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-emerald-600" />
                مورد المياه والصهاريج
              </span>
            </div>
            <Input
              placeholder="اسم شركة / مورد المياه"
              value={waterSupplier.supplierName}
              onChange={(e) => setWaterSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
              disabled={!canEdit}
              className="text-xs h-8.5 bg-white dark:bg-slate-900"
            />
            <Input
              placeholder="رقم عرض السعر / المرجع"
              value={waterSupplier.quoteRef}
              onChange={(e) => setWaterSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
              disabled={!canEdit}
              className="text-xs h-8.5 bg-white dark:bg-slate-900"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="التكلفة (ريال)"
                value={waterSupplier.totalCost || ''}
                onChange={(e) => setWaterSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                disabled={!canEdit}
                className="text-xs font-bold font-mono h-8.5 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
              />
              <span className="text-xs text-muted-foreground shrink-0">ريال</span>
            </div>
          </div>

          {/* مورد الورقيات والنظافة */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                مورد الورقيات والمنظفات
              </span>
            </div>
            <Input
              placeholder="اسم مصنع / مورد المستلزمات"
              value={suppliesSupplier.supplierName}
              onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
              disabled={!canEdit}
              className="text-xs h-8.5 bg-white dark:bg-slate-900"
            />
            <Input
              placeholder="رقم عرض السعر / المرجع"
              value={suppliesSupplier.quoteRef}
              onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
              disabled={!canEdit}
              className="text-xs h-8.5 bg-white dark:bg-slate-900"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="التكلفة (ريال)"
                value={suppliesSupplier.totalCost || ''}
                onChange={(e) => setSuppliesSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                disabled={!canEdit}
                className="text-xs font-bold font-mono h-8.5 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
              />
              <span className="text-xs text-muted-foreground shrink-0">ريال</span>
            </div>
          </div>

          {/* شركة التشغيل والعمالة */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                شركة التشغيل والعمالة
              </span>
            </div>
            <Input
              placeholder="اسم شركة التشغيل / التعميد"
              value={laborSupplier.supplierName}
              onChange={(e) => setLaborSupplier((prev) => ({ ...prev, supplierName: e.target.value }))}
              disabled={!canEdit}
              className="text-xs h-8.5 bg-white dark:bg-slate-900"
            />
            <Input
              placeholder="رقم العقد / المرجع"
              value={laborSupplier.quoteRef}
              onChange={(e) => setLaborSupplier((prev) => ({ ...prev, quoteRef: e.target.value }))}
              disabled={!canEdit}
              className="text-xs h-8.5 bg-white dark:bg-slate-900"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="التكلفة (ريال)"
                value={laborSupplier.totalCost || ''}
                onChange={(e) => setLaborSupplier((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
                disabled={!canEdit}
                className="text-xs font-bold font-mono h-8.5 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
              />
              <span className="text-xs text-muted-foreground shrink-0">ريال</span>
            </div>
          </div>
        </div>
      </div>

      {/* القسم الثاني: الهندسة المالية ومسار التمويل (نموذج 25/30) */}
      <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-foreground">2. الهندسة المالية ومسار الكفالة (نموذج 25/30)</h3>
          </div>
          <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full">
            سعر الفرصة الكافلة: {donorOpportunityPrice.toLocaleString()} ريال
          </span>
        </div>

        {/* حاسبة الرسوم والأجور المباشرة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] mb-1 font-medium">مصاريف تشغيلية للجمعية (%)</span>
            <Input
              type="number"
              value={operationalFeePercent}
              onChange={(e) => setOperationalFeePercent(Number(e.target.value))}
              disabled={!canEdit}
              className="h-8 text-xs font-bold font-mono text-center bg-white dark:bg-slate-900"
            />
            <span className="text-[10px] text-muted-foreground block text-center mt-1">({operationalAmount.toLocaleString()} ريال)</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] mb-1 font-medium">رسوم بوابات الدفع (%)</span>
            <Input
              type="number"
              value={gatewayFeePercent}
              onChange={(e) => setGatewayFeePercent(Number(e.target.value))}
              disabled={!canEdit}
              className="h-8 text-xs font-bold font-mono text-center bg-white dark:bg-slate-900"
            />
            <span className="text-[10px] text-muted-foreground block text-center mt-1">({gatewayAmount.toLocaleString()} ريال)</span>
          </div>

          <div className="flex flex-col justify-center items-center p-2 rounded-lg bg-emerald-600 text-white font-bold text-center">
            <span className="text-[10px] opacity-90 block font-normal">أجور الإدارة والمنصات</span>
            <span className="text-base font-mono mt-0.5">+{totalAdminFees.toLocaleString()} ريال</span>
          </div>
        </div>

        {/* اختيار مسار الكفالة والتمويل */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground block">اختيار مسار التمويل والتنفيذ:</label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* متبرع مباشر */}
            <div
              onClick={() => canEdit && setFundingPath('direct_purchase')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                fundingPath === 'direct_purchase'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-border/60 bg-card hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  1. متبرع مباشر (كفالة مسجد كاملة)
                </span>
                {fundingPath === 'direct_purchase' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
            </div>

            {/* تمويل جماعي */}
            <div
              onClick={() => canEdit && setFundingPath('crowdfunding')}
              className={`p-4.5 rounded-xl border-2 cursor-pointer transition-all ${
                fundingPath === 'crowdfunding'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-border/60 bg-card hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  2. طرح للتمويل الجماعي (أسهم تبرع)
                </span>
                {fundingPath === 'crowdfunding' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
            </div>
          </div>

          {/* تفاصيل المتبرع المباشر عند اختياره */}
          {fundingPath === 'direct_purchase' && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">اسم المتبرع المباشر *</label>
                <Input
                  placeholder="اسم فاعل الخير"
                  value={directDonorInfo.donorName}
                  onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, donorName: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-8 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم الجوال</label>
                <Input
                  placeholder="05XXXXXXXX"
                  value={directDonorInfo.donorPhone}
                  onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, donorPhone: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-8 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم سند القبض *</label>
                <Input
                  placeholder="رقم السند / المرجع"
                  value={directDonorInfo.receiptRef}
                  onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, receiptRef: e.target.value }))}
                  disabled={!canEdit}
                  className="text-xs h-8 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {/* تفاصيل التمويل الجماعي عند اختياره */}
          {fundingPath === 'crowdfunding' && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-300">
                تفكيك أسهم التبرع على الموقع:
              </span>
              <div className="flex items-center gap-2">
                <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded border font-mono">300 سهم × 100 ريال</span>
                <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded border font-mono">100 سهم × 300 ريال</span>
                <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded border font-mono">60 سهم × 500 ريال</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* زر الاعتماد النهائي */}
      {canEdit && (
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button
            type="button"
            onClick={() => handleSaveAll(true)}
            disabled={isSaving || totalActualCost <= 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-6 gap-2 font-bold shadow-xs rounded-xl"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            اعتماد التكلفة الفعلية والهندسة المالية والمتابعة
          </Button>
        </div>
      )}
    </div>
  );
};
