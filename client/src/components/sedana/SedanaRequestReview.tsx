import React from 'react';
import { SedanaCustomItem } from './SedanaRequestForm';

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
  const workforce = formData.workforce || {};
  const cleaning = formData.cleaningMaterials || {};
  const drinkingWater = formData.drinkingWater || {};
  const waterTankers = formData.waterTankers || {};
  const aromatic = formData.aromaticEnvironment || {};
  const customItems: SedanaCustomItem[] = formData.customItems || [];

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          {/* القوى العاملة */}
          <div className="space-y-1.5 border-b sm:border-b-0 pb-2 sm:pb-0 border-border/40">
            <span className="font-bold text-foreground block">القوى العاملة:</span>
            <div className="text-muted-foreground space-y-0.5">
              <div>عامل نظافة متفرغ: <strong className="text-foreground">{workforce.hasFullTimeCleaner ? `نعم (${workforce.cleanerSalary || 0} ريال/شهرياً)` : 'لا'}</strong></div>
              <div>مكافأة صيانة دورية: <strong className="text-foreground">{workforce.hasPeriodicMaintenanceReward ? `نعم (${workforce.maintenanceRewardAmount || 0} ريال)` : 'لا'}</strong></div>
            </div>
          </div>

          {/* سقيا المياه */}
          <div className="space-y-1.5 border-b sm:border-b-0 pb-2 sm:pb-0 border-border/40">
            <span className="font-bold text-foreground block">سقيا المياه:</span>
            <div className="text-muted-foreground space-y-0.5">
              <div>كراتين مياه الشرب: <strong className="text-foreground">{drinkingWater.cartonsQty || 0} كرتون/سنة</strong></div>
              <div>الجدول: <strong className="text-foreground">{drinkingWater.schedule === 'monthly' ? 'شهري منتظم' : drinkingWater.schedule === 'bimonthly' ? 'كل شهرين' : 'مواسم'}</strong></div>
            </div>
          </div>

          {/* مواد النظافة */}
          <div className="space-y-1.5 sm:col-span-2 border-t border-border/40 pt-2">
            <span className="font-bold text-foreground block">مواد النظافة والتعقيم:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground pt-0.5">
              <div>مناديل ورقية: <strong className="text-foreground">{cleaning.tissuesQty || 0} كرتون</strong></div>
              <div>صابون سائل: <strong className="text-foreground">{cleaning.liquidSoapQty || 0} جالون</strong></div>
              <div>صابون رغوة: <strong className="text-foreground">{cleaning.foamSoapQty || 0} عبوة</strong></div>
              <div>مطهر أرضيات: <strong className="text-foreground">{cleaning.floorDisinfectantQty || 0} جالون</strong></div>
              <div>أكياس نفايات: <strong className="text-foreground">{cleaning.trashBagsQty || 0} كرتون</strong></div>
            </div>
          </div>

          {/* صهاريج المياه والبيئة العطرية */}
          <div className="space-y-1.5 sm:col-span-2 border-t border-border/40 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-foreground block">صهاريج المياه:</span>
              <span className="text-muted-foreground">
                {!waterTankers.isConnectedToNetwork
                  ? `${waterTankers.tankersQtyPerYear || 0} صهريج/سنة (${waterTankers.tankerSize || 'وايت عادي'})`
                  : 'متصل بشبكة المياه العامة'}
              </span>
            </div>
            <div>
              <span className="font-bold text-foreground block">البيئة العطرية:</span>
              <span className="text-muted-foreground">
                {aromatic.diffusersCount || 0} أجهزة تعطير ({aromatic.refillsPerYear || 0} عبوات زيت سنوياً)
              </span>
            </div>
          </div>

          {/* البنود المخصصة إن وجدت */}
          {customItems.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2 border-t border-border/40 pt-2">
              <span className="font-bold text-foreground block">بنود مخصصة:</span>
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                {customItems.map((item) => (
                  <span key={item.id} className="bg-muted/40 px-2 py-0.5 rounded text-[11px]">
                    {item.name}: <strong className="text-foreground">{item.quantity} {item.unit}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
