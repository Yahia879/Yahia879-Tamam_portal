import React from 'react';
import { SedanaBasketItem } from './sedanaTypes';
import { Paperclip, CheckCircle2 } from 'lucide-react';

interface SedanaRequestReviewProps {
  formData: Record<string, any>;
  selectedMosque?: {
    name: string;
    city?: string | null;
    capacity?: number | null;
    area?: number | string | null;
  } | null;
}

export const SedanaRequestReview: React.FC<SedanaRequestReviewProps> = ({
  formData,
  selectedMosque,
}) => {
  const mosqueArea = Number(formData.mosqueArea ?? selectedMosque?.area ?? 250);
  const worshippers = Number(formData.actualWorshippers ?? selectedMosque?.capacity ?? 150);
  const isConnectedToDesalination: boolean =
    formData.isConnectedToDesalination !== undefined
      ? Boolean(formData.isConnectedToDesalination)
      : true;

  const basketItems: SedanaBasketItem[] = formData.basketItems || [];
  const warehousePhoto = formData.warehousePhoto;

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <h4 className="font-bold text-sm text-foreground">
            ملخص احتياجات سدانة (التشغيل السنوي)
          </h4>
          {selectedMosque && (
            <span className="text-xs text-muted-foreground">
              المسجد: <strong className="text-foreground">{selectedMosque.name}</strong>
            </span>
          )}
        </div>

        {/* شبكة المياه (التحلية) */}
        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">شبكة المياه (التحلية):</span>
          <strong className={isConnectedToDesalination ? 'text-foreground' : 'text-amber-600 font-bold'}>
            {isConnectedToDesalination ? 'متصل بالتحلية' : 'غير متصل (يتطلب صهاريج مياه)'}
          </strong>
        </div>

        {/* جدول بنود السلة السنوية */}
        <div className="space-y-1.5 pt-1">
          <span className="font-bold text-xs text-foreground block">
            بنود سلة الاحتياجات السنوية ({basketItems.length} صنف):
          </span>

          <div className="overflow-x-auto border border-border/70 rounded-md">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-semibold">
                <tr>
                  <th className="p-2">الصنف</th>
                  <th className="p-2">التصنيف</th>
                  <th className="p-2 text-center">الكمية السنوية</th>
                  <th className="p-2 text-center">الوحدة</th>
                  <th className="p-2 text-center">دورية التوريد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {basketItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="p-2 font-medium text-foreground">
                      <div>
                        <span>{item.name}</span>
                        {item.isCustom && (
                          <span className="text-[10px] text-primary mr-1">(مخصص)</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                      {item.monthlyLimit !== undefined && item.monthlyLimit > 0 && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-normal">
                          الحد الشهري (اللمت): <strong className="font-mono">{item.monthlyLimit}</strong> {item.unit}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground text-[11px]">{item.category}</td>
                    <td className="p-2 text-center font-bold text-foreground font-mono">
                      {item.quantity}
                    </td>
                    <td className="p-2 text-center text-muted-foreground">{item.unit}</td>
                    <td className="p-2 text-center text-foreground font-medium">{item.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* مرفق صور المستودع إن وجد */}
        {warehousePhoto && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300">
            <Paperclip className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>مرفق صور مستودع المسجد: <strong>{warehousePhoto}</strong></span>
            <CheckCircle2 className="w-3.5 h-3.5 mr-auto text-emerald-600" />
          </div>
        )}
      </div>
    </div>
  );
};
