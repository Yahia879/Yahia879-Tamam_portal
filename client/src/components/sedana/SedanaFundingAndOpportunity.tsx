import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Coins, Share2, CheckCircle2, Calculator, UserCheck, Paperclip, Sparkles, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { FileUpload, UploadedFile } from '@/components/FileUpload';

interface SedanaFundingAndOpportunityProps {
  request: {
    id: number;
    requestNumber: string;
    programType: string;
    programData?: any;
    currentStage: string;
  };
  onComplete?: () => void;
  onSaveDraft?: (data: any) => void;
  canEdit?: boolean;
}

export const SedanaFundingAndOpportunity: React.FC<SedanaFundingAndOpportunityProps> = ({
  request,
  onComplete,
  onSaveDraft,
  canEdit = true,
}) => {
  let programData: Record<string, any> = {};
  try {
    let pData: any = request.programData;
    while (typeof pData === 'string') {
      try {
        pData = JSON.parse(pData);
      } catch {
        break;
      }
    }
    programData = pData && typeof pData === 'object' && !Array.isArray(pData) ? pData : {};
  } catch (e) {
    programData = {};
  }

  const existingFunding = programData.sedanaFundingDetails || {};
  const matrixTotal = Number(programData.sedanaSuppliersMatrix?.totalActualCost || 0);
  const actualMosqueCost = Number(programData.actualMosqueCost || existingFunding.actualMosqueCost || matrixTotal || 25000);
  const isAlreadyConfigured = Boolean(existingFunding.configuredAt);

  // حاسبة نموذج 25/30 الهندسية المالية
  const [operationalFeePercent, setOperationalFeePercent] = useState<number>(
    Number(existingFunding.operationalFeePercent ?? 15)
  );
  const [gatewayFeePercent, setGatewayFeePercent] = useState<number>(
    Number(existingFunding.gatewayFeePercent ?? 5)
  );

  // احتساب المبالغ آلياً
  const operationalAmount = useMemo(() => {
    return Math.round((actualMosqueCost * operationalFeePercent) / 100);
  }, [actualMosqueCost, operationalFeePercent]);

  const gatewayAmount = useMemo(() => {
    return Math.round((actualMosqueCost * gatewayFeePercent) / 100);
  }, [actualMosqueCost, gatewayFeePercent]);

  const totalAdminFees = useMemo(() => {
    return operationalAmount + gatewayAmount;
  }, [operationalAmount, gatewayAmount]);

  // سعر الفرصة النهائي للمتبرع (غير قابل للتعديل العشوائي، ناتج تلقائياً)
  const calculatedOpportunityPrice = useMemo(() => {
    return actualMosqueCost + totalAdminFees;
  }, [actualMosqueCost, totalAdminFees]);

  const [fundingPath, setFundingPath] = useState<'direct_purchase' | 'crowdfunding'>(
    existingFunding.fundingPath || 'crowdfunding'
  );

  // بيانات المتبرع المباشر (عند اختيار مسار متبرع مباشر)
  const existingDirectDonor = existingFunding.directDonorInfo || {};
  const [directDonorInfo, setDirectDonorInfo] = useState({
    donorName: existingDirectDonor.donorName || '',
    donorPhone: existingDirectDonor.donorPhone || '',
    receiptRef: existingDirectDonor.receiptRef || '',
    receiptFileUrl: existingDirectDonor.receiptFileUrl || '',
    notes: existingDirectDonor.notes || '',
  });

  const [notes, setNotes] = useState<string>(
    existingFunding.notes || 'تم تطبيق الهندسة المالية (نموذج 25/30) واحتساب تكاليف التشغيل وبوابات الدفع الإلكترونية بنجاح.'
  );

  // تفكيك أسهم التبرع عند الطرح للتمويل الجماعي
  const shareCalculations = useMemo(() => {
    const target = calculatedOpportunityPrice;
    return {
      share100: Math.ceil(target / 100),
      share300: Math.ceil(target / 300),
      share500: Math.ceil(target / 500),
      share1000: Math.ceil(target / 1000),
    };
  }, [calculatedOpportunityPrice]);

  const saveFundingMutation = trpc.requests.saveSedanaFundingChoice.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      if (onComplete) onComplete();
    },
    onError: (err) => {
      toast.error(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    },
  });

  const handleSaveChoice = () => {
    if (fundingPath === 'direct_purchase' && (!directDonorInfo.donorName || !directDonorInfo.receiptRef)) {
      toast.error('يرجى إدخال اسم المتبرع المباشر ورقم سند القبض/المرجع البنكي');
      return;
    }

    const payload = {
      actualMosqueCost,
      operationalFeePercent,
      gatewayFeePercent,
      adminFeeTotal: totalAdminFees,
      donorOpportunityPrice: calculatedOpportunityPrice,
      fundingPath,
      directDonorInfo: fundingPath === 'direct_purchase' ? directDonorInfo : undefined,
      crowdfundingConfig: fundingPath === 'crowdfunding' ? {
        sharePrices: [100, 300, 500, 1000],
        defaultSharePrice: 100,
        targetAmount: calculatedOpportunityPrice,
      } : undefined,
      notes,
    };

    if (onSaveDraft) {
      onSaveDraft(payload);
    }

    if (!request.id || request.id === 0) {
      toast.success('تم تحديد سعر الفرصة وإعداد نموذج التمويل بنجاح');
      if (onComplete) onComplete();
      return;
    }

    saveFundingMutation.mutate({
      requestId: request.id,
      ...payload,
      shouldAdvanceStage: true,
    });
  };

  return (
    <div className="space-y-5 p-5 rounded-2xl border border-border/80 bg-card text-right shadow-xs" dir="rtl">
      {/* شريط العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              المحطة 4
            </span>
            <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-600" />
              الهندسة المالية وطرح الفرصة للتبرع (نموذج 25/30)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            احتساب أجور الإدارة ورسوم بوابات الدفع آلياً (تحويل الـ 25 ألف إلى 30 ألف) واختيار مسار الكفالة (متبرع مباشر أم تمويل جماعي).
          </p>
        </div>
        {isAlreadyConfigured && (
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 self-start sm:self-center flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            تم تحديد مسار التمويل ({existingFunding.fundingPath === 'crowdfunding' ? 'تمويل جماعي' : 'متبرع مباشر'})
          </span>
        )}
      </div>

      {/* حاسبة نموذج 25/30 الهندسية المالية */}
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-indigo-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-200/80 dark:border-indigo-900 pb-2">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>حاسبة الرسوم المحملة بالأجور (نموذج 25/30):</span>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
            معادلة احتساب آلي
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. تكلفة الشراء المباشرة الفعلية */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
              1. تكلفة الشراء والعمالة المباشرة:
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {actualMosqueCost.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">ريال</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              مجموع عروض الأسعار من الموردين للمياه والمستلزمات والعمالة.
            </p>
          </div>

          {/* 2. مصاريف إدارية + رسوم بوابات الدفع */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white/80 dark:bg-slate-900/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 block">
                2. أجور الإدارة ومنصات التبرع:
              </span>
              <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400">
                +{totalAdminFees.toLocaleString()} ريال
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block mb-0.5">
                  مصاريف تشغيلية (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={operationalFeePercent}
                  onChange={(e) => setOperationalFeePercent(Number(e.target.value))}
                  disabled={!canEdit}
                  className="h-8 text-xs font-bold font-mono text-amber-800 dark:text-amber-300 text-center bg-amber-50/50 dark:bg-amber-950/30"
                />
                <span className="text-[10px] text-slate-500 block text-center mt-0.5">({operationalAmount.toLocaleString()} ريال)</span>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block mb-0.5">
                  رسوم مدى/فيزا (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={gatewayFeePercent}
                  onChange={(e) => setGatewayFeePercent(Number(e.target.value))}
                  disabled={!canEdit}
                  className="h-8 text-xs font-bold font-mono text-amber-800 dark:text-amber-300 text-center bg-amber-50/50 dark:bg-amber-950/30"
                />
                <span className="text-[10px] text-slate-500 block text-center mt-0.5">({gatewayAmount.toLocaleString()} ريال)</span>
              </div>
            </div>
          </div>

          {/* 3. سعر الفرصة النهائي للمتبرع (ناتج نهائي تلقائي) */}
          <div className="p-3.5 rounded-xl border-2 border-indigo-400 dark:border-indigo-600 bg-indigo-600 text-white space-y-1.5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold block text-indigo-100">
                  3. سعر الفرصة النهائي للمتبرع:
                </span>
                <Sparkles className="w-4 h-4 text-indigo-200" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {calculatedOpportunityPrice.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-indigo-200">ريال سعودي</span>
              </div>
            </div>
            <p className="text-[10px] text-indigo-100 leading-snug">
              حقل ناتج نهائي تلقائي غير قابل للتعديل يدويًا يُعرض على المنصة.
            </p>
          </div>
        </div>
      </div>

      {/* اختيار مسار التمويل */}
      <div className="space-y-3 pt-1">
        <label className="text-sm font-bold text-foreground block">اختيار مسار التمويل والتنفيذ:</label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* الخيار 1: متبرع مباشر (كفالة فردية كاملة) */}
          <div
            onClick={() => canEdit && setFundingPath('direct_purchase')}
            className={`p-4.5 rounded-xl border-2 cursor-pointer transition-all ${
              fundingPath === 'direct_purchase'
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs'
                : 'border-border/60 bg-card hover:border-emerald-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${fundingPath === 'direct_purchase' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-foreground">1. متبرع مباشر (كفالة مسجد كاملة)</h5>
                  {fundingPath === 'direct_purchase' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  شخص مقتدر يتكفل بكفالة المسجد للسنة كاملة بمبلغ الفرصة ({calculatedOpportunityPrice.toLocaleString()} ريال) أو بتكلفة الشراء المباشرة.
                </p>
              </div>
            </div>
          </div>

          {/* الخيار 2: طرح للتمويل الجماعي (أسهم تبرع) */}
          <div
            onClick={() => canEdit && setFundingPath('crowdfunding')}
            className={`p-4.5 rounded-xl border-2 cursor-pointer transition-all ${
              fundingPath === 'crowdfunding'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 shadow-xs'
                : 'border-border/60 bg-card hover:border-indigo-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${fundingPath === 'crowdfunding' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Share2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-foreground">2. طرح للتمويل الجماعي</h5>
                  {fundingPath === 'crowdfunding' && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  إدراج الطلب كفرصة تبرع على موقع الجمعية وتقسيمها إلى أسهم (سهم بـ 100 ريال، 300 ريال...) حتى اكتمل المبلغ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* تفاصيل مسار المتبرع المباشر عند اختياره */}
      {fundingPath === 'direct_purchase' && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs pb-1 border-b border-emerald-200 dark:border-emerald-800">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>بيانات المتبرع المباشر وسند القبض:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">اسم المتبرع / الكفيل</label>
              <Input
                placeholder="اسم فاعل الخير / المتبرع"
                value={directDonorInfo.donorName}
                onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, donorName: e.target.value }))}
                disabled={!canEdit}
                className="text-xs h-9 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم الجوال (اختياري)</label>
              <Input
                placeholder="05XXXXXXXX"
                value={directDonorInfo.donorPhone}
                onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, donorPhone: e.target.value }))}
                disabled={!canEdit}
                className="text-xs h-9 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">رقم سند القبض / المرجع البنكي</label>
              <Input
                placeholder="مثال: REC-2026-88"
                value={directDonorInfo.receiptRef}
                onChange={(e) => setDirectDonorInfo((prev) => ({ ...prev, receiptRef: e.target.value }))}
                disabled={!canEdit}
                className="text-xs h-9 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">مرفق سند القبض / إيصال التحويل (PDF / صورة)</label>
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
                description="اسحب إيصال التحويل أو انقر للرفع"
              />
            ) : null}
            {directDonorInfo.receiptFileUrl && (
              <div className="mt-1.5 flex items-center justify-between p-2 rounded bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium truncate">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  سند القبض مرفق بنجاح
                </span>
                <a
                  href={directDonorInfo.receiptFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline underline-offset-2 shrink-0"
                >
                  معاينة
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* تفاصيل التمويل الجماعي عند اختياره */}
      {fundingPath === 'crowdfunding' && (
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-1 border-b border-indigo-200 dark:border-indigo-800">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-indigo-600" />
              تفكيك أسهم التبرع لفرصة التمويل الجماعي:
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
              المبلغ المستهدف: {calculatedOpportunityPrice.toLocaleString()} ريال
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <span className="text-[10px] text-muted-foreground block">سهم بـ 100 ريال</span>
              <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                {shareCalculations.share100} <span className="text-[10px] font-normal">سهم</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <span className="text-[10px] text-muted-foreground block">سهم بـ 300 ريال</span>
              <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                {shareCalculations.share300} <span className="text-[10px] font-normal">سهم</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <span className="text-[10px] text-muted-foreground block">سهم بـ 500 ريال</span>
              <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                {shareCalculations.share500} <span className="text-[10px] font-normal">سهم</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <span className="text-[10px] text-muted-foreground block">سهم بـ 1000 ريال</span>
              <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                {shareCalculations.share1000} <span className="text-[10px] font-normal">سهم</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ملاحظات القرار */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-foreground block">ملاحظات اعتماد التسعير والتمويل</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="تفاصيل إضافية حول آلية التمويل أو الاتفاق المالي..."
          disabled={!canEdit}
          rows={2}
          className="text-xs bg-white dark:bg-slate-900 resize-none"
        />
      </div>

      {/* أزرار الإجراءات */}
      {canEdit && (
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button
            type="button"
            onClick={handleSaveChoice}
            disabled={saveFundingMutation.isPending || calculatedOpportunityPrice <= 0}
            className={`w-full sm:w-auto text-xs h-10 px-6 gap-2 font-bold shadow-xs ${
              fundingPath === 'crowdfunding'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {saveFundingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-1.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 ml-1" />
            )}
            {fundingPath === 'crowdfunding'
              ? 'اعتماد الطرح للتمويل الجماعي بسعر الفرصة والانتقال للمراجعة النهائي'
              : 'اعتماد المتبرع المباشر وتأكيد الشراء والتنفيذ'}
          </Button>
        </div>
      )}
    </div>
  );
};
