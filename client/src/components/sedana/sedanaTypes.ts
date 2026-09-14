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
  category: SedanaCategory;
  name: string;
  description?: string;
  monthlyLimit?: number;
  quantity: number;
  unit: string;
  frequency: SedanaDeliveryFrequency;
  isCustom?: boolean;
}

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
