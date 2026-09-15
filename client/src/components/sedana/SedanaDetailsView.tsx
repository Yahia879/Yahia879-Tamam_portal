import React from 'react';
import { SedanaBasketItem } from './sedanaTypes';
import { Droplets, Package, Users, Coins, UserCheck, Share2, Paperclip, CheckCircle2, Building2 } from 'lucide-react';

interface SedanaDetailsViewProps {
  programData: any;
  mosque?: {
    name: string;
    city?: string | null;
    capacity?: number | null;
    area?: number | string | null;
  } | null;
}

export const SedanaDetailsView: React.FC<SedanaDetailsViewProps> = ({
  programData: rawProgramData,
}) => {
  const data = React.useMemo(() => {
    try {
      if (typeof rawProgramData === 'string') {
        return JSON.parse(rawProgramData);
      }
      return (rawProgramData as Record<string, any>) || {};
    } catch (e) {
      return {};
    }
  }, [rawProgramData]);

  const isConnectedToDesalination: boolean =
    data.isConnectedToDesalination !== undefined
      ? Boolean(data.isConnectedToDesalination)
      : true;

  const basketItems: SedanaBasketItem[] = data.basketItems || [];
  const approvedPlan = data.approvedPlan;
  const approvedItems = approvedPlan?.approvedItems || {};
  const hasApprovedPlan = Boolean(approvedPlan?.approvedAt);

  const matrix = data.sedanaSuppliersMatrix;
  const funding = data.sedanaFundingDetails;

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* بطاقة شبكة المياه */}
      <div className="bg-white dark:bg-slate-800/50 p-3.5 rounded-xl border border-border/80 shadow-xs flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-semibold">شبكة المياه (التحلية) للمسجد</p>
        <p className={`text-xs sm:text-sm font-bold ${isConnectedToDesalination ? 'text-slate-800 dark:text-slate-200' : 'text-amber-600'}`}>
          {isConnectedToDesalination ? 'متصل بالتحلية' : 'غير متصل (يتطلب صهاريج مياه)'}
        </p>
      </div>

      {/* المحطة 1 و 2: جدول بنود سلة الاحتياجات السنوية المعتمدة */}
      {basketItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-border/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              بنود سلة الاحتياجات السنوية المعتمدة ({basketItems.length} صنف)
            </p>
            {hasApprovedPlan && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                معتمد وفق التقييم المكتبي
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-border/70 rounded-lg">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-semibold">
                <tr>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">التصنيف</th>
                  <th className="p-2.5 text-center">دورية التوريد</th>
                  <th className="p-2.5 text-center">الكمية المطلوبة</th>
                  {hasApprovedPlan && <th className="p-2.5 text-center">الكمية المعتمدة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {basketItems.map((item) => {
                  const approvedVal = approvedItems[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium text-foreground">
                        {item.name}
                        {item.isCustom && (
                          <span className="text-[10px] text-primary mr-1">(مخصص)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px]">{item.category}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{item.frequency}</td>
                      <td className="p-2.5 text-center font-bold text-foreground">
                        {item.quantity} <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                      </td>
                      {hasApprovedPlan && (
                        <td className="p-2.5 text-center font-bold text-emerald-600">
                          {approvedVal !== undefined ? `${approvedVal} ${item.unit}` : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* المحطة 4: تفاصيل التسعير والهندسة المالية (نموذج 25/30) ومسار التمويل */}
      {funding && (
        <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                المحطة 4
              </span>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                الهندسة المالية ومسار الكفالة
              </span>
            </div>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
              funding.fundingPath === 'crowdfunding'
                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-200'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
            }`}>
              {funding.fundingPath === 'crowdfunding' ? 'طرح للتمويل الجماعي' : 'متبرع مباشر (شراء مباشر)'}
            </span>
          </div>

          {/* تفكيك النموذج المالي 25/30 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-muted-foreground block text-[10px]">تكلفة الشراء الفعلية (الموردين):</span>
              <span className="font-bold font-mono text-base text-slate-800 dark:text-slate-100">
                {Number(funding.actualMosqueCost).toLocaleString()} ريال
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-muted-foreground block text-[10px]">أجور الإدارة وبوابات الدفع:</span>
              <span className="font-bold font-mono text-base text-amber-700 dark:text-amber-400">
                +{Number(funding.adminFeeTotal || 0).toLocaleString()} ريال
              </span>
            </div>

            <div className="bg-indigo-600 text-white p-3 rounded-xl border border-indigo-700 shadow-xs">
              <span className="text-indigo-100 block text-[10px] font-bold">سعر الفرصة النهائي للمتبرع:</span>
              <span className="font-black font-mono text-lg text-white">
                {Number(funding.donorOpportunityPrice).toLocaleString()} ريال
              </span>
            </div>
          </div>

          {/* تفاصيل المتبرع المباشر إن وجد */}
          {funding.fundingPath === 'direct_purchase' && funding.directDonorInfo && (
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>بيانات المتبرع المباشر والكفيل:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                <div><strong className="text-slate-900 dark:text-slate-100">الاسم:</strong> {funding.directDonorInfo.donorName || '-'}</div>
                <div><strong className="text-slate-900 dark:text-slate-100">سند القبض:</strong> {funding.directDonorInfo.receiptRef || '-'}</div>
                {funding.directDonorInfo.receiptFileUrl && (
                  <div>
                    <a
                      href={funding.directDonorInfo.receiptFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      إيصال سند القبض
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تفاصيل التمويل الجماعي إن وجد */}
          {funding.fundingPath === 'crowdfunding' && (
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-bold">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>الفرصة متاحة للتمويل الجماعي على موقع الجمعية:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                سهم بـ 100 ريال (300 سهم) | سهم بـ 300 ريال (100 سهم) | سهم بـ 500 ريال (60 سهم)
              </p>
            </div>
          )}

          {/* المحطة 5: صورة التأمين وأمر الشراء */}
          {funding.procurementMode && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">صورة التأمين وأمر الشراء (المحطة 05):</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-md">
                {funding.procurementMode === 'supplier_contract' && 'عقد مع مورد'}
                {funding.procurementMode === 'direct_purchase' && 'شراء مباشر'}
                {funding.procurementMode === 'official_commission' && 'تعميد جهة'}
                {funding.procurementMode === 'csr_in_kind' && 'مسؤولية مجتمعية / عيني'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
