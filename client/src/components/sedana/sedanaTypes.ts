export type SedanaCategory =
  | 'العمالة'
  | 'مواد النظافة'
  | 'المعطرات'
  | 'سقيا الماء'
  | 'البلاستيكيات'
  | 'أدوات المسجد العامة';

export type SedanaDeliveryFrequency = 'شهري' | 'ربع سنوي' | 'نصف سنوي';

export interface SedanaBasketItem {
  id: string;
  category?: SedanaCategory;
  name: string;
  description?: string;
  monthlyLimit?: number;
  quarterlyLimit?: number;
  semiAnnualLimit?: number;
  periodLimits?: Record<string, number>;
  quantity: number;
  unit: string;
  frequency: SedanaDeliveryFrequency;
  isCustom?: boolean;
}

export const getItemLimitForFrequency = (
  item: SedanaBasketItem
): number | undefined => {
  if (item.isCustom) return undefined;
  if (item.periodLimits && item.frequency in item.periodLimits) {
    const limit = item.periodLimits[item.frequency];
    if (limit !== undefined && limit !== null && Number(limit) > 0) {
      return Number(limit);
    }
  }
  if (item.frequency === 'شهري' && item.monthlyLimit && item.monthlyLimit > 0) {
    return item.monthlyLimit;
  }
  if (item.frequency === 'ربع سنوي' && item.quarterlyLimit && item.quarterlyLimit > 0) {
    return item.quarterlyLimit;
  }
  if (item.frequency === 'نصف سنوي' && item.semiAnnualLimit && item.semiAnnualLimit > 0) {
    return item.semiAnnualLimit;
  }
  return undefined;
};

export const SEDANA_CATEGORIES: SedanaCategory[] = [
  'العمالة',
  'مواد النظافة',
  'المعطرات',
  'سقيا الماء',
  'البلاستيكيات',
  'أدوات المسجد العامة',
];

export const DELIVERY_FREQUENCIES: SedanaDeliveryFrequency[] = [
  'شهري',
  'ربع سنوي',
  'نصف سنوي',
];

export const getDefaultBasketItems = (
  _mosqueArea: number = 250,
  _worshippers: number = 150,
  _isConnectedToDesalination: boolean = true,
  customItems?: SedanaBasketItem[]
): SedanaBasketItem[] => {
  if (Array.isArray(customItems) && customItems.length > 0) {
    return customItems;
  }
  return [];
};
