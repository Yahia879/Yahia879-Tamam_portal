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
  isConnectedToDesalination: boolean = true
): SedanaBasketItem[] => {
  const items: SedanaBasketItem[] = [
    // 1. العمالة
    {
      id: 'cleaner',
      category: 'العمالة',
      name: 'عامل نظافة متفرغ للمسجد',
      quantity: 0,
      unit: 'شهر',
      frequency: 'شهري',
    },
    {
      id: 'maintenance',
      category: 'العمالة',
      name: 'مكافأة صيانة دورية',
      quantity: 0,
      unit: 'شهر',
      frequency: 'شهري',
    },

    // 2. مواد النظافة
    {
      id: 'liquid_soap',
      category: 'مواد النظافة',
      name: 'صابون سائل للأيدي',
      quantity: 0,
      unit: 'جالون',
      frequency: 'ربع سنوي',
    },
    {
      id: 'foam_soap',
      category: 'مواد النظافة',
      name: 'صابون رغوة للمغاسل',
      quantity: 0,
      unit: 'عبوة',
      frequency: 'ربع سنوي',
    },
    {
      id: 'floor_disinfectant',
      category: 'مواد النظافة',
      name: 'مطهر ومعقم أرضيات',
      quantity: 0,
      unit: 'جالون',
      frequency: 'ربع سنوي',
    },

    // 3. المعطرات
    {
      id: 'diffusers',
      category: 'المعطرات',
      name: 'أجهزة تعطير ذكية',
      quantity: 0,
      unit: 'جهاز',
      frequency: 'نصف سنوي',
    },
    {
      id: 'aroma_refills',
      category: 'المعطرات',
      name: 'عبوات زيت عطري فاخر',
      quantity: 0,
      unit: 'عبوة',
      frequency: 'نصف سنوي',
    },

    // 4. سقيا الماء
    {
      id: 'water_cartons',
      category: 'سقيا الماء',
      name: 'كراتين مياه شرب (330 مل)',
      quantity: 0,
      unit: 'كرتون',
      frequency: 'شهري',
    },

    // 5. البلاستيكيات
    {
      id: 'trash_bags',
      category: 'البلاستيكيات',
      name: 'أكياس نفايات كبيرة (50 جالون)',
      quantity: 0,
      unit: 'كرتون',
      frequency: 'ربع سنوي',
    },
    {
      id: 'plastic_cups',
      category: 'البلاستيكيات',
      name: 'كاسات ماء بلاستيك',
      quantity: 0,
      unit: 'كرتون',
      frequency: 'شهري',
    },
    {
      id: 'tissues',
      category: 'البلاستيكيات',
      name: 'مناديل ورقية (سحب / رول)',
      quantity: 0,
      unit: 'كرتون',
      frequency: 'شهري',
    },

    // 6. أدوات المسجد العامة
    {
      id: 'cleaning_tools',
      category: 'أدوات المسجد العامة',
      name: 'طقم مكانس ومساحات أرضية',
      quantity: 0,
      unit: 'طقم',
      frequency: 'ربع سنوي',
    },
    {
      id: 'mop_bucket',
      category: 'أدوات المسجد العامة',
      name: 'سطل وعصارة نظافة متحركة',
      quantity: 0,
      unit: 'قطعة',
      frequency: 'نصف سنوي',
    },
  ];

  // إذا كان المسجد غير متصل بالتحلية، يُفعّل صهاريج المياه تلقائياً
  if (!isConnectedToDesalination) {
    const waterIndex = items.findIndex((i) => i.category === 'سقيا الماء');
    items.splice(waterIndex + 1, 0, {
      id: 'water_tankers',
      category: 'سقيا الماء',
      name: 'صهاريج مياه (وايت ماء 19 طن)',
      quantity: 0,
      unit: 'صهريج',
      frequency: 'شهري',
    });
  }

  return items;
};
