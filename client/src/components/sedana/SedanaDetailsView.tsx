import React from 'react';

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

  const workforce = data.workforce || {};
  const cleaning = data.cleaningMaterials || {};
  const drinkingWater = data.drinkingWater || {};
  const waterTankers = data.waterTankers || {};
  const aromatic = data.aromaticEnvironment || {};
  const customItems = data.customItems || [];
  const approvedPlan = data.approvedPlan;
  const approvedItems = approvedPlan?.approvedItems || {};
  const hasApprovedPlan = Boolean(approvedPlan?.approvedAt);

  return (
    <div className="space-y-3 text-right" dir="rtl">
      {/* شبكة البنود الرئيسية بأسلوب كروت النظام المعتادة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 1. القوى العاملة */}
        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">القوى العاملة</p>
          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 space-y-1">
            <div>
              عامل نظافة:{' '}
              <span className="font-medium text-foreground">
                {workforce.hasFullTimeCleaner
                  ? `متفرغ (${workforce.cleanerSalary || 0} ر.س/شهرياً)`
                  : 'غير مطلوب'}
              </span>
            </div>
            <div>
              صيانة دورية:{' '}
              <span className="font-medium text-foreground">
                {workforce.hasPeriodicMaintenanceReward
                  ? `مكافأة (${workforce.maintenanceRewardAmount || 0} ر.س/شهرياً)`
                  : 'غير مطلوب'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. سقيا المياه */}
        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">سقيا المياه (سنوي)</p>
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            {approvedItems.drinkingWaterCartonsQty ?? drinkingWater.cartonsQty ?? 0} كرتون
            <span className="text-xs font-normal text-muted-foreground mr-1">
              ({drinkingWater.schedule === 'monthly'
                ? 'شهري'
                : drinkingWater.schedule === 'bimonthly'
                ? 'كل شهرين'
                : 'مواسم'})
            </span>
          </p>
        </div>

        {/* 3. صهاريج المياه */}
        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">صهاريج المياه</p>
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            {waterTankers.isConnectedToNetwork
              ? 'متصل بشبكة المياه العامة'
              : `${approvedItems.tankersQtyPerYear ?? waterTankers.tankersQtyPerYear ?? 0} صهريج/سنة (${waterTankers.tankerSize || 'وايت عادي'})`}
          </p>
        </div>

        {/* 4. البيئة العطرية */}
        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">البيئة العطرية</p>
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            {aromatic.diffusersCount || 0} أجهزة تعطير
            <span className="text-xs font-normal text-muted-foreground mr-1">
              ({approvedItems.aromaRefillsQty ?? aromatic.refillsPerYear ?? 0} عبوة زيت/سنة)
            </span>
          </p>
        </div>

        {/* 5. مواد النظافة والتعقيم */}
        <div className="space-y-1 col-span-1 sm:col-span-2 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">مواد النظافة والتعقيم (الاحتياج السنوي)</p>
            {hasApprovedPlan && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                معتمد
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground pt-1">
            <span>مناديل: <strong>{approvedItems.tissuesQty ?? cleaning.tissuesQty ?? 0}</strong> كرتون</span>
            <span>صابون سائل: <strong>{approvedItems.liquidSoapQty ?? cleaning.liquidSoapQty ?? 0}</strong> جالون</span>
            <span>صابون رغوة: <strong>{approvedItems.foamSoapQty ?? cleaning.foamSoapQty ?? 0}</strong> عبوة</span>
            <span>مطهر أرضيات: <strong>{approvedItems.floorDisinfectantQty ?? cleaning.floorDisinfectantQty ?? 0}</strong> جالون</span>
            <span>أكياس نفايات: <strong>{approvedItems.trashBagsQty ?? cleaning.trashBagsQty ?? 0}</strong> كرتون</span>
          </div>
        </div>

        {/* 6. البنود المخصصة إن وجدت */}
        {customItems.length > 0 && (
          <div className="space-y-1 col-span-1 sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">بنود إضافية مخصصة</p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              {customItems.map((item: any, idx: number) => (
                <span key={idx} className="bg-muted px-2 py-0.5 rounded text-foreground font-medium">
                  {item.name}: <strong>{item.quantity} {item.unit}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* حالة الاعتماد والملاحظات */}
        {hasApprovedPlan && (
          <div className="space-y-1 col-span-1 sm:col-span-2 lg:col-span-3 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              التقييم الفني المكتبي
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {approvedPlan.notes || 'تم اعتماد الاحتياج السنوي للمسجد وضبط الكميات القياسية.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
