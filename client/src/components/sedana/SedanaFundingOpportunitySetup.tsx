import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SaudiRiyal } from '@/components/SaudiRiyal';
import {
  UserCheck,
  Receipt,
  Share2,
  Sparkles,
  Calculator,
  HeartHandshake,
  CheckCircle2,
  FileText,
  Upload,
  Info,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

export type FundingModelType = 'direct_donor' | 'crowdfunding';

export interface DirectDonorData {
  donorName: string;
  donorPhone: string;
  donorNationalId?: string;
  donatedAmount: number;
  receiptVoucherNumber: string;
  receiptVoucherDate: string;
  notes?: string;
}

export interface CrowdfundingData {
  directPurchaseCost: number;
  managementFees: number;
  finalOpportunityPrice: number;
  opportunityTitle: string;
  opportunityDescription?: string;
  isPublishedImmediately: boolean;
}

export interface SedanaFundingOpportunitySetupProps {
  initialModel?: FundingModelType;
  directCost?: number;
  adminFeeAmount?: number;
  requestNumber?: string;
  mosqueName?: string;
  onSave?: (data: {
    fundingModel: FundingModelType;
    directDonorData?: DirectDonorData;
    crowdfundingData?: CrowdfundingData;
  }) => void;
  isReadOnly?: boolean;
}

export const SedanaFundingOpportunitySetup: React.FC<SedanaFundingOpportunitySetupProps> = ({
  initialModel = 'direct_donor',
  directCost = 25000,
  adminFeeAmount = 5000,
  requestNumber = '',
  mosqueName = '',
  onSave,
  isReadOnly = false,
}) => {
  const [fundingModel, setFundingModel] = useState<FundingModelType>(initialModel);

  // Direct Donor State
  const [donorData, setDonorData] = useState<DirectDonorData>({
    donorName: '',
    donorPhone: '',
    donorNationalId: '',
    donatedAmount: directCost + adminFeeAmount,
    receiptVoucherNumber: '',
    receiptVoucherDate: new Date().toISOString().split('T')[0],
    notes: 'كفالة مباشرة كاملة للفرصة السنوية شاملة مصاريف التشغيل والإدارة.',
  });

  // Crowdfunding State
  const [crowdCost, setCrowdCost] = useState<number>(directCost);
  const [crowdFee, setCrowdFee] = useState<number>(adminFeeAmount);
  const [opportunityTitle, setOpportunityTitle] = useState<string>(
    mosqueName ? `كفالة وتشغيل ${mosqueName} السنوية (سدانة)` : 'فرصة كفالة وتشغيل المسجد السنوية'
  );
  const [opportunityDescription, setOpportunityDescription] = useState<string>(
    'فرصة تبرع لفرز وتغطية تكاليف التشغيل والنظافة والصيانة السنوية للمسجد عبر نموذج التمويل الجماعي.'
  );
  const [isPublished, setIsPublished] = useState<boolean>(true);

  const totalCalculatedOpportunity = crowdCost + crowdFee;

  const handleSave = () => {
    if (fundingModel === 'direct_donor') {
      if (!donorData.donorName.trim()) {
        toast.error('يرجى إدخال اسم المتبرع المباشر');
        return;
      }
      if (!donorData.receiptVoucherNumber.trim()) {
        toast.error('يرجى إدخال رقم سند القبض');
        return;
      }
    }

    const payload = {
      fundingModel,
      directDonorData: fundingModel === 'direct_donor' ? donorData : undefined,
      crowdfundingData:
        fundingModel === 'crowdfunding'
          ? {
              directPurchaseCost: crowdCost,
              managementFees: crowdFee,
              finalOpportunityPrice: totalCalculatedOpportunity,
              opportunityTitle,
              opportunityDescription,
              isPublishedImmediately: isPublished,
            }
          : undefined,
    };

    if (onSave) {
      onSave(payload);
    }
    toast.success('تم حفظ خيار التمويل بنجاح');
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/10 via-sky-900/10 to-cyan-900/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-base text-foreground">
              المحطة 4: الهندسة المالية وتحديد مسار التمويل
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            اختر طريقة تغطية تكلفة الفرصة: إما عبر متبرع مباشر يتكفل بكامل المبلغ أو طرح الفرصة للتمويل الجماعي بالمنصة.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 shrink-0">
          <span>التكلفة الإجمالية للفرصة:</span>
          <span className="font-bold text-sm inline-flex items-center gap-1 font-sans">
            {(fundingModel === 'direct_donor' ? donorData.donatedAmount : totalCalculatedOpportunity).toLocaleString('en-US')}{' '}
            <SaudiRiyal className="w-3.5 h-3.5 inline" />
          </span>
        </div>
      </div>

      {/* Radio Selection Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radio Option 1: Direct Donor */}
        <label
          className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
            fundingModel === 'direct_donor'
              ? 'border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-md ring-2 ring-cyan-500/20'
              : 'border-border bg-card hover:border-cyan-300 dark:hover:border-cyan-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="funding_model_option"
                value="direct_donor"
                checked={fundingModel === 'direct_donor'}
                onChange={() => setFundingModel('direct_donor')}
                disabled={isReadOnly}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
              />
              <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">متبرع مباشر</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  شخص مقتدر أو جهة تتوكل بكفالة المسجد للسنة بالكامل
                </p>
              </div>
            </div>
            {fundingModel === 'direct_donor' && (
              <Badge className="bg-cyan-600 text-white text-[10px] px-2 py-0.5">محدد</Badge>
            )}
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-cyan-200/60 dark:border-cyan-800/40 pt-2 flex items-center justify-between">
            <span>إدخال بيانات المتبرع + سند القبض</span>
            <Receipt className="w-3.5 h-3.5 text-cyan-600" />
          </div>
        </label>

        {/* Radio Option 2: Crowdfunding Opportunity */}
        <label
          className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
            fundingModel === 'crowdfunding'
              ? 'border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-md ring-2 ring-cyan-500/20'
              : 'border-border bg-card hover:border-cyan-300 dark:hover:border-cyan-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="funding_model_option"
                value="crowdfunding"
                checked={fundingModel === 'crowdfunding'}
                onChange={() => setFundingModel('crowdfunding')}
                disabled={isReadOnly}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
              />
              <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">طرح فرصة تمويل جماعي بالمنصة</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  عرض الفرصة كفرصة تبرع عامة للمجتمع على المنصة الإلكترونية
                </p>
              </div>
            </div>
            {fundingModel === 'crowdfunding' && (
              <Badge className="bg-cyan-600 text-white text-[10px] px-2 py-0.5">محدد</Badge>
            )}
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-cyan-200/60 dark:border-cyan-800/40 pt-2 flex items-center justify-between">
            <span>نموذج التكلفة (25,000 / 30,000 ريال)</span>
            <Calculator className="w-3.5 h-3.5 text-cyan-600" />
          </div>
        </label>
      </div>

      {/* Dynamic Content Panel based on selected Radio option */}
      {fundingModel === 'direct_donor' ? (
        <Card className="border-cyan-200 dark:border-cyan-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-600" />
                <CardTitle className="text-sm font-bold text-foreground">
                  بيانات المتبرع المباشر وسند القبض
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-cyan-300 text-cyan-700 dark:text-cyan-300">
                كفالة مباشرة
              </Badge>
            </div>
            <CardDescription className="text-xs">
              أدخل تفاصيل المتبرع المالي ورقم سند القبض المالي الموثق للدفعات.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">اسم المتبرع المباشر *</Label>
                <Input
                  value={donorData.donorName}
                  onChange={(e) => setDonorData({ ...donorData, donorName: e.target.value })}
                  placeholder="مثال: الشيخ عبد الرحمن بن عبدالله..."
                  disabled={isReadOnly}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">رقم جوال / هوية المتبرع *</Label>
                <Input
                  value={donorData.donorPhone}
                  onChange={(e) => setDonorData({ ...donorData, donorPhone: e.target.value })}
                  placeholder="05xxxxxxx"
                  disabled={isReadOnly}
                  className="h-9 text-xs font-sans dir-ltr text-right"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  مبلغ الكفالة المستلم (<SaudiRiyal className="w-3 h-3 inline" />) *
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={donorData.donatedAmount}
                  onChange={(e) =>
                    setDonorData({ ...donorData, donatedAmount: Number(e.target.value) || 0 })
                  }
                  disabled={isReadOnly}
                  className="h-9 text-xs font-bold text-cyan-700 dark:text-cyan-400 font-sans"
                />
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">رقم سند القبض المالي *</Label>
                <Input
                  value={donorData.receiptVoucherNumber}
                  onChange={(e) => setDonorData({ ...donorData, receiptVoucherNumber: e.target.value })}
                  placeholder="مثال: REC-2026-0891"
                  disabled={isReadOnly}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">تاريخ سند القبض *</Label>
                <Input
                  type="date"
                  value={donorData.receiptVoucherDate}
                  onChange={(e) => setDonorData({ ...donorData, receiptVoucherDate: e.target.value })}
                  disabled={isReadOnly}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5 border-dashed border-cyan-400 text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                  onClick={() => toast.info('يمكنك ربط أو رفع نسخة سند القبض المالي من صفحة سندات القبض')}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>مرفق سند القبض</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ملاحظات الكفالة المباشرة</Label>
              <Textarea
                rows={2}
                value={donorData.notes}
                onChange={(e) => setDonorData({ ...donorData, notes: e.target.value })}
                disabled={isReadOnly}
                className="text-xs resize-none"
                placeholder="تفاهمات إضافية مع الداعم المباشر..."
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-cyan-200 dark:border-cyan-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-600" />
                <CardTitle className="text-sm font-bold text-foreground">
                  تفاصيل الهندسة المالية وطرح الفرصة للتبرع (نموذج 25/30)
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-cyan-300 text-cyan-700 dark:text-cyan-300">
                تمويل جماعي
              </Badge>
            </div>
            <CardDescription className="text-xs">
              حساب التكلفة آلياً وتفصيل تكلفة الشراء المباشرة وأجور الإدارة لتحديد سعر الفرصة للمتبرع.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-muted-foreground block mb-1">تكلفة الشراء المباشرة (عروض الأسعار)</span>
                <div className="flex items-center justify-between">
                  <Input
                    type="number"
                    min={0}
                    value={crowdCost}
                    onChange={(e) => setCrowdCost(Number(e.target.value) || 0)}
                    disabled={isReadOnly}
                    className="h-8 text-xs font-bold w-32 font-sans"
                  />
                  <SaudiRiyal className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 block mb-1">أجور الإدارة ومنصات التبرع</span>
                <div className="flex items-center justify-between">
                  <Input
                    type="number"
                    min={0}
                    value={crowdFee}
                    onChange={(e) => setCrowdFee(Number(e.target.value) || 0)}
                    disabled={isReadOnly}
                    className="h-8 text-xs font-bold w-32 font-sans text-amber-700 dark:text-amber-400"
                  />
                  <SaudiRiyal className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800">
                <span className="text-[11px] text-cyan-800 dark:text-cyan-300 font-bold block mb-1">سعر الفرصة النهائي للمتبرع</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold text-cyan-700 dark:text-cyan-400 font-sans">
                    {totalCalculatedOpportunity.toLocaleString('en-US')}
                  </span>
                  <SaudiRiyal className="w-4 h-4 text-cyan-600" />
                </div>
              </div>
            </div>

            {/* Opportunity Details */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">عنوان فرصة التبرع بالمنصة *</Label>
                <Input
                  value={opportunityTitle}
                  onChange={(e) => setOpportunityTitle(e.target.value)}
                  placeholder="عنوان الفرصة المطروحة للتبرع..."
                  disabled={isReadOnly}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الوصف والتفاصيل المتاحة للجمهور</Label>
                <Textarea
                  rows={2}
                  value={opportunityDescription}
                  onChange={(e) => setOpportunityDescription(e.target.value)}
                  placeholder="وصف مشجع ومفصل للفرصة للمتبرعين..."
                  disabled={isReadOnly}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="publish_immediately"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  disabled={isReadOnly}
                  className="w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                />
                <label htmlFor="publish_immediately" className="text-xs text-foreground font-medium cursor-pointer">
                  نشر الفرصة فوراً على متجر التبرعات الإلكتروني بالمنصة عند الحفظ
                </label>
              </div>
            </div>

            <Alert className="border-cyan-200 bg-cyan-50/60 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-200 py-2 px-3">
              <Info className="w-4 h-4 text-cyan-600" />
              <AlertDescription className="text-xs">
                سيتم فك البنود وتوزيعها تلقائياً على الموردين وتخصيص حصة التبرع لكل سهم أو مساهمة عبر متجر المنصة.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Action Footer */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/70">
          <Button
            type="button"
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium h-9 px-5 text-xs gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ اعتماد خيار التمويل</span>
          </Button>
        </div>
      )}
    </div>
  );
};
