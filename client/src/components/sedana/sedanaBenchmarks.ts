/**
 * محرك معايير الاستهلاك السنوي القياسي لبرنامج سدانة
 * يحسب الاحتياج القياسي ويكشف حالات الهدر استناداً إلى سعة ومساحة المسجد وشبكة التحلية
 */
import { SedanaBasketItem } from './sedanaTypes';

export interface MosqueSpecs {
  capacity: number; // سعة المسجد (عدد المصلين)
  area: number; // مساحة المسجد بالمتر المربع
  actualWorshippers?: number;
  isConnectedToWaterNetwork?: boolean;
  isConnectedToDesalination?: boolean;
}

export interface ItemEvaluation {
  key: string;
  category: string;
  label: string;
  unit: string;
  frequency?: string;
  requestedQty: number;
  standardQty: number;
  minStandard: number;
  maxStandard: number;
  status: 'fair' | 'moderate' | 'waste';
  statusLabel: string;
  ratioPercent: number;
  wasteQty: number;
  warningMessage?: string;
  recommendation: string;
}

export interface OverallEvaluation {
  items: ItemEvaluation[];
  hasWasteAlert: boolean;
  totalWasteAlertsCount: number;
  overallHealthScore: number;
  overallStatus: 'balanced' | 'needs_adjustment' | 'critical_waste';
  overallStatusLabel: string;
  summaryText: string;
}

export function evaluateSedanaNeeds(
  specs: MosqueSpecs,
  requestedData: {
    basketItems?: SedanaBasketItem[];
    isConnectedToDesalination?: boolean;
    cleaningMaterials?: {
      liquidSoapQty?: number;
      foamSoapQty?: number;
      floorDisinfectantQty?: number;
      trashBagsQty?: number;
      tissuesQty?: number;
    };
    drinkingWater?: {
      cartonsQty?: number;
    };
    waterTankers?: {
      isConnectedToNetwork?: boolean;
      tankersQtyPerYear?: number;
    };
    aromaticEnvironment?: {
      enabled?: boolean;
      diffusersCount?: number;
      refillsPerYear?: number;
    };
    workforce?: {
      hasFullTimeCleaner?: boolean;
      cleanerSalary?: number;
      hasPeriodicMaintenanceReward?: boolean;
      maintenanceRewardAmount?: number;
    };
  }
): OverallEvaluation {
  const cap = Math.max(specs.capacity || specs.actualWorshippers || 100, 30);
  const area = Math.max(specs.area || 150, 40);
  const isConnected =
    specs.isConnectedToDesalination ??
    requestedData.isConnectedToDesalination ??
    specs.isConnectedToWaterNetwork ??
    requestedData.waterTankers?.isConnectedToNetwork ??
    true;

  const items: ItemEvaluation[] = [];

  // إذا تم تمرير سلة الاحتياجات (سدانة المحدثة)
  if (Array.isArray(requestedData.basketItems) && requestedData.basketItems.length > 0) {
    requestedData.basketItems.forEach((bItem) => {
      const name = bItem.name || '';
      const req = Number(bItem.quantity) || 0;
      let std = req;
      let minStd = req;
      let maxStd = req;
      let warningMsg: string | undefined = undefined;

      if (name.includes('مناديل')) {
        minStd = Math.round(cap * 0.7);
        maxStd = Math.round(cap * 1.0);
        std = Math.round(cap * 0.85);
      } else if (name.includes('مياه شرب')) {
        minStd = Math.round(cap * 1.4);
        maxStd = Math.round(cap * 2.2);
        std = Math.round(cap * 1.8);
      } else if (name.includes('صابون سائل')) {
        minStd = Math.max(6, Math.round(cap * 0.1));
        maxStd = Math.max(18, Math.round(cap * 0.2));
        std = Math.max(12, Math.round(cap * 0.15));
      } else if (name.includes('صابون رغوة')) {
        minStd = Math.max(12, Math.round(cap * 0.15));
        maxStd = Math.max(36, Math.round(cap * 0.35));
        std = Math.max(24, Math.round(cap * 0.25));
      } else if (name.includes('مطهر')) {
        minStd = Math.max(12, Math.round(area * 0.08));
        maxStd = Math.max(24, Math.round(area * 0.15));
        std = Math.max(18, Math.round(area * 0.11));
      } else if (name.includes('أكياس نفايات')) {
        minStd = Math.max(12, Math.round(cap * 0.15 + area * 0.03));
        maxStd = Math.max(36, Math.round(cap * 0.3 + area * 0.08));
        std = Math.max(24, Math.round(cap * 0.2 + area * 0.05));
      } else if (name.includes('كاسات')) {
        minStd = Math.max(6, Math.round(cap * 0.08));
        maxStd = Math.max(20, Math.round(cap * 0.18));
        std = Math.max(12, Math.round(cap * 0.12));
      } else if (name.includes('صهاريج')) {
        if (isConnected) {
          std = 0;
          minStd = 0;
          maxStd = 0;
          if (req > 0) {
            warningMsg = 'المسجد متصل بالتحلية، طلب صهاريج مياه غير مبرر ويعد هدراً.';
          }
        } else {
          minStd = Math.max(12, Math.round(cap * 0.15));
          maxStd = Math.max(26, Math.round(cap * 0.3));
          std = Math.max(18, Math.round(cap * 0.22));
        }
      } else if (name.includes('أجهزة تعطير')) {
        std = Math.max(1, Math.round(area / 100));
        minStd = std;
        maxStd = std + 1;
      } else if (name.includes('زيت عطري')) {
        const diffs = Math.max(1, Math.round(area / 100));
        std = diffs * 2;
        minStd = diffs * 2;
        maxStd = diffs * 4;
      } else if (name.includes('عامل نظافة')) {
        std = cap > 350 || area > 600 ? 24 : 12;
        minStd = 12;
        maxStd = 24;
      } else if (name.includes('صيانة')) {
        std = 12;
        minStd = 12;
        maxStd = 12;
      }

      const ratio = req > 0 && std > 0 ? Math.round((req / std) * 100) : req === 0 ? 0 : 999;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';

      if (std === 0 && req > 0) {
        status = 'waste';
      } else if (req > 0 && req > maxStd * 2.2) {
        status = 'waste';
        if (!warningMsg) {
          warningMsg = `الكمية المطلوبة (${req}) تتجاوز المعدل القياسي لمسجد بسعة ${cap} ومساحة ${area} م² (${std} ${bItem.unit}).`;
        }
      } else if (req > 0 && req > maxStd * 1.3) {
        status = 'moderate';
      }

      items.push({
        key: bItem.id,
        category: bItem.category || 'أدوات المسجد العامة',
        label: bItem.name,
        unit: bItem.unit,
        frequency: bItem.frequency,
        requestedQty: req,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'عادل ومتناسب',
        ratioPercent: ratio,
        wasteQty: Math.max(0, req - maxStd),
        warningMessage: warningMsg,
        recommendation: `المعيار القياسي لمسجد بهذا الحجم هو ${std} ${bItem.unit}.`,
      });
    });
  } else {
    // 1. مناديل الورق (Tissues)
    {
      const requested = Number(requestedData.cleaningMaterials?.tissuesQty) || 0;
      const minStd = Math.round(cap * 0.7);
      const maxStd = Math.round(cap * 1.0);
      const std = Math.round(cap * 0.85);
      const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';
      let warningMsg: string | undefined = undefined;

      if (requested > maxStd * 2.2) {
        status = 'waste';
        warningMsg = `الكمية المطلوبة (${requested} كرتون) تتجاوز المعدل القياسي السنوي لمسجد بسعة ${cap} مصلياً بنسبة ${ratio}%. هذا يُعتبر هدراً غير متناسب يتطلب الضبط!`;
      } else if (requested > maxStd * 1.3) {
        status = 'moderate';
        warningMsg = `الكمية المطلوبة (${requested} كرتون) أعلى من المعدل الموصى به (${minStd} - ${maxStd} كرتون).`;
      }

      items.push({
        key: 'tissuesQty',
        category: 'مواد النظافة والتعقيم',
        label: 'مناديل ورقية وسحب',
        unit: 'كرتون/سنة',
        requestedQty: requested,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: ratio,
        wasteQty: Math.max(0, requested - maxStd),
        warningMessage: warningMsg,
        recommendation: `المعدل القياسي العادل هو ${std} كرتون سنوياً لمسجد يتسع لـ ${cap} مصلياً.`,
      });
    }

    // 2. كراتين مياه الشرب (Drinking water)
    {
      const requested = Number(requestedData.drinkingWater?.cartonsQty) || 0;
      const minStd = Math.round(cap * 1.4);
      const maxStd = Math.round(cap * 2.2);
      const std = Math.round(cap * 1.8);
      const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';
      let warningMsg: string | undefined = undefined;

      if (requested > maxStd * 2.5) {
        status = 'waste';
        warningMsg = `طلب ${requested} كرتون مياه شرب يتجاوز الاستهلاك السنوي القياسي لمسجد سعته ${cap} مصلياً بشكل مبالغ فيه.`;
      } else if (requested > maxStd * 1.4) {
        status = 'moderate';
        warningMsg = `الكمية أعلى من المعدل المتوسط المتوقع لمسجد بهذا الحجم (${std} كرتون سنوياً).`;
      }

      items.push({
        key: 'drinkingWaterCartonsQty',
        category: 'سقيا المياه',
        label: 'كراتين مياه شرب للمصلين',
        unit: 'كرتون/سنة',
        requestedQty: requested,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: ratio,
        wasteQty: Math.max(0, requested - maxStd),
        warningMessage: warningMsg,
        recommendation: `المعدل القياسي السنوي العادل هو حوالي ${std} كرتون (بمعدل ~${Math.round(std / 12)} كرتون شهرياً).`,
      });
    }

    // 3. مطهر ومعقم أرضيات (Floor Disinfectant)
    {
      const requested = Number(requestedData.cleaningMaterials?.floorDisinfectantQty) || 0;
      const minStd = Math.max(12, Math.round(area * 0.08));
      const maxStd = Math.max(24, Math.round(area * 0.15));
      const std = Math.max(18, Math.round(area * 0.11));
      const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';
      let warningMsg: string | undefined = undefined;

      if (requested > maxStd * 2.5) {
        status = 'waste';
        warningMsg = `كمية المطهرات المطلوبة (${requested} جالون) غير متناسبة مع مساحة المسجد (${area} م²).`;
      } else if (requested > maxStd * 1.4) {
        status = 'moderate';
      }

      items.push({
        key: 'floorDisinfectantQty',
        category: 'مواد النظافة والتعقيم',
        label: 'مطهر ومعقم أرضيات',
        unit: 'جالون/سنة',
        requestedQty: requested,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: ratio,
        wasteQty: Math.max(0, requested - maxStd),
        warningMessage: warningMsg,
        recommendation: `المعدل القياسي السنوي لمساحة ${area} م² هو حوالي ${std} جالون.`,
      });
    }

    // 4. صابون سائل للأيدي (Liquid Soap)
    {
      const requested = Number(requestedData.cleaningMaterials?.liquidSoapQty) || 0;
      const minStd = Math.max(6, Math.round(cap * 0.1));
      const maxStd = Math.max(18, Math.round(cap * 0.2));
      const std = Math.max(12, Math.round(cap * 0.15));
      const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';

      if (requested > maxStd * 2.5) {
        status = 'waste';
      } else if (requested > maxStd * 1.4) {
        status = 'moderate';
      }

      items.push({
        key: 'liquidSoapQty',
        category: 'مواد النظافة والتعقيم',
        label: 'صابون سائل للأيدي',
        unit: 'جالون/سنة',
        requestedQty: requested,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: ratio,
        wasteQty: Math.max(0, requested - maxStd),
        recommendation: `المعدل القياسي هو ${std} جالون سنوياً.`,
      });
    }

    // 5. صابون رغوة (Foam Soap)
    {
      const requested = Number(requestedData.cleaningMaterials?.foamSoapQty) || 0;
      const minStd = Math.max(12, Math.round(cap * 0.15));
      const maxStd = Math.max(36, Math.round(cap * 0.35));
      const std = Math.max(24, Math.round(cap * 0.25));
      const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';

      if (requested > maxStd * 2.5) {
        status = 'waste';
      } else if (requested > maxStd * 1.4) {
        status = 'moderate';
      }

      items.push({
        key: 'foamSoapQty',
        category: 'مواد النظافة والتعقيم',
        label: 'صابون رغوة',
        unit: 'عبوة/سنة',
        requestedQty: requested,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: ratio,
        wasteQty: Math.max(0, requested - maxStd),
        recommendation: `المعدل الموصى به هو ${std} عبوة سنوياً.`,
      });
    }

    // 6. أكياس نفايات (Trash Bags)
    {
      const requested = Number(requestedData.cleaningMaterials?.trashBagsQty) || 0;
      const minStd = Math.max(12, Math.round(cap * 0.15 + area * 0.03));
      const maxStd = Math.max(36, Math.round(cap * 0.3 + area * 0.08));
      const std = Math.max(24, Math.round(cap * 0.2 + area * 0.05));
      const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
      let status: 'fair' | 'moderate' | 'waste' = 'fair';

      if (requested > maxStd * 2.5) {
        status = 'waste';
      } else if (requested > maxStd * 1.4) {
        status = 'moderate';
      }

      items.push({
        key: 'trashBagsQty',
        category: 'مواد النظافة والتعقيم',
        label: 'أكياس نفايات',
        unit: 'كرتون/سنة',
        requestedQty: requested,
        standardQty: std,
        minStandard: minStd,
        maxStandard: maxStd,
        status,
        statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: ratio,
        wasteQty: Math.max(0, requested - maxStd),
        recommendation: `المعدل السنوي القياسي هو ${std} كرتون.`,
      });
    }

    // 7. صهاريج المياه (Water Tankers)
    {
      const requested = Number(requestedData.waterTankers?.tankersQtyPerYear) || 0;
      if (isConnected) {
        const status = requested > 0 ? 'waste' : 'fair';
        items.push({
          key: 'tankersQtyPerYear',
          category: 'صهاريج المياه',
          label: 'صهاريج مياه (وايت ماء)',
          unit: 'صهريج/سنة',
          requestedQty: requested,
          standardQty: 0,
          minStandard: 0,
          maxStandard: 0,
          status,
          statusLabel: status === 'waste' ? 'تعارض وهدر' : 'متناسب (شبكة عامة)',
          ratioPercent: requested > 0 ? 999 : 100,
          wasteQty: requested,
          warningMessage: requested > 0 ? 'المسجد مسجل كمتصل بالشبكة، طلب صهاريج مياه يعد هدراً.' : undefined,
          recommendation: 'المسجد متصل بالشبكة، لا داعي لصهاريج مياه منتظمة.',
        });
      } else {
        const minStd = Math.max(12, Math.round(cap * 0.15));
        const maxStd = Math.max(26, Math.round(cap * 0.3));
        const std = Math.max(18, Math.round(cap * 0.22));
        const ratio = requested > 0 ? Math.round((requested / std) * 100) : 100;
        let status: 'fair' | 'moderate' | 'waste' = 'fair';
        let warningMsg: string | undefined = undefined;

        if (requested > maxStd * 2.2) {
          status = 'waste';
          warningMsg = `عدد صهاريج المياه المطلوبة (${requested}) يتجاوز حاجة المسجد غير المتصل بالشبكة.`;
        } else if (requested > maxStd * 1.3) {
          status = 'moderate';
        }

        items.push({
          key: 'tankersQtyPerYear',
          category: 'صهاريج المياه',
          label: 'صهاريج مياه (وايت ماء)',
          unit: 'صهريج/سنة',
          requestedQty: requested,
          standardQty: std,
          minStandard: minStd,
          maxStandard: maxStd,
          status,
          statusLabel: status === 'waste' ? 'هدر مفرط' : status === 'moderate' ? 'مرتفع' : 'متناسب وعادل',
          ratioPercent: ratio,
          wasteQty: Math.max(0, requested - maxStd),
          warningMessage: warningMsg,
          recommendation: `المعدل القياسي لمسجد بهذا الحجم غير متصل بالشبكة هو ~${std} صهريج سنوياً.`,
        });
      }
    }

    // 8. البيئة العطرية (Aromatic Environment)
    {
      const requestedRefills = Number(requestedData.aromaticEnvironment?.refillsPerYear) || 0;
      const stdDiffusers = Math.max(1, Math.round(area / 100));
      const stdRefills = stdDiffusers * 2;

      items.push({
        key: 'aromaRefillsQty',
        category: 'البيئة العطرية',
        label: 'معطرات دورية (كل 6 أشهر)',
        unit: 'عبوة معطر/سنة',
        requestedQty: requestedRefills,
        standardQty: stdRefills,
        minStandard: stdDiffusers * 2,
        maxStandard: stdDiffusers * 4,
        status: requestedRefills > stdDiffusers * 6 ? 'waste' : requestedRefills > stdDiffusers * 4 ? 'moderate' : 'fair',
        statusLabel: requestedRefills > stdDiffusers * 6 ? 'هدر مفرط' : requestedRefills > stdDiffusers * 4 ? 'مرتفع' : 'متناسب وعادل',
        ratioPercent: requestedRefills > 0 ? Math.round((requestedRefills / stdRefills) * 100) : 100,
        wasteQty: Math.max(0, requestedRefills - stdDiffusers * 4),
        recommendation: `المعدل القياسي هو ${stdDiffusers} أجهزة مع ${stdRefills} عبوات سنوياً.`,
      });
    }
  }

  const wasteCount = items.filter((i) => i.status === 'waste').length;
  const modCount = items.filter((i) => i.status === 'moderate').length;

  let overallStatus: 'balanced' | 'needs_adjustment' | 'critical_waste' = 'balanced';
  let overallStatusLabel = 'الاحتياج متوازن وعادل';
  let healthScore = 100;

  if (wasteCount > 0) {
    overallStatus = 'critical_waste';
    overallStatusLabel = `يحتوي على ${wasteCount} بنود بهدر مفرط غير متناسب`;
    healthScore = Math.max(25, 100 - wasteCount * 25 - modCount * 10);
  } else if (modCount > 0) {
    overallStatus = 'needs_adjustment';
    overallStatusLabel = `يحتاج ضبط (${modCount} بنود مرتفعة نسبياً)`;
    healthScore = Math.max(65, 100 - modCount * 12);
  }

  const summaryText =
    overallStatus === 'critical_waste'
      ? `تم اكتشاف عدم تناسب في ${wasteCount} بنود مقارنة بحجم المسجد (سعة ${cap} مصلياً، مساحة ${area} م²). يُرجى ضبط الكميات قبل الاعتماد.`
      : overallStatus === 'needs_adjustment'
      ? `الكميات مقبولة إجمالاً مع وجود ${modCount} بنود أعلى قليلاً من المعايير القياسية.`
      : `جميع الكميات المطلوبة متطابقة وعادلة وفقاً لمعايير تشغيل المساجد.`;

  return {
    items,
    hasWasteAlert: wasteCount > 0,
    totalWasteAlertsCount: wasteCount,
    overallHealthScore: healthScore,
    overallStatus,
    overallStatusLabel,
    summaryText,
  };
}
