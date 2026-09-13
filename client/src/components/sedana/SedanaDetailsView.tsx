import React from 'react';
import { SedanaBasketItem } from './sedanaTypes';

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

  const mosqueArea = Number(data.mosqueArea ?? 250);
  const worshippers = Number(data.actualWorshippers ?? 150);
  const isConnectedToDesalination: boolean =
    data.isConnectedToDesalination !== undefined
      ? Boolean(data.isConnectedToDesalination)
      : true;

  const basketItems: SedanaBasketItem[] = data.basketItems || [];
  const approvedPlan = data.approvedPlan;
  const approvedItems = approvedPlan?.approvedItems || {};
  const hasApprovedPlan = Boolean(approvedPlan?.approvedAt);

  return (
    <div className="space-y-3.5 text-right" dir="rtl">
      {/* بطاقة شبكة المياه */}
      <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">شبكة المياه (التحلية)</p>
        <p className={`text-xs sm:text-sm font-bold ${isConnectedToDesalination ? 'text-slate-800 dark:text-slate-200' : 'text-amber-600'}`}>
          {isConnectedToDesalination ? 'متصل بالتحلية' : 'غير متصل (يتطلب صهاريج مياه)'}
        </p>
      </div>

      {/* جدول بنود سلة الاحتياجات السنوية */}
      {basketItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              بنود سلة الاحتياجات السنوية ({basketItems.length} صنف)
            </p>
            {hasApprovedPlan && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                معتمد وفق التقييم المكتبي
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-border/70 rounded-md">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-semibold">
                <tr>
                  <th className="p-2">الصنف</th>
                  <th className="p-2">التصنيف</th>
                  <th className="p-2 text-center">دورية التوريد</th>
                  <th className="p-2 text-center">الكمية المطلوبة</th>
                  {hasApprovedPlan && <th className="p-2 text-center">الكمية المعتمدة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {basketItems.map((item) => {
                  const approvedVal = approvedItems[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td className="p-2 font-medium text-foreground">
                        {item.name}
                        {item.isCustom && (
                          <span className="text-[10px] text-primary mr-1">(مخصص)</span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-[11px]">{item.category}</td>
                      <td className="p-2 text-center text-muted-foreground">{item.frequency}</td>
                      <td className="p-2 text-center font-bold text-foreground">
                        {item.quantity} <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                      </td>
                      {hasApprovedPlan && (
                        <td className="p-2 text-center font-bold text-emerald-600">
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

      {/* تفاصيل الاعتماد والملاحظات */}
      {hasApprovedPlan && (
        <div className="space-y-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            محضر الاعتماد الفني المكتبي
          </p>
          <p className="text-xs text-foreground leading-relaxed">
            {approvedPlan.notes || 'تم اعتماد الاحتياج السنوي للمسجد وضبط الكميات القياسية العادلة.'}
          </p>
        </div>
      )}
    </div>
  );
};
