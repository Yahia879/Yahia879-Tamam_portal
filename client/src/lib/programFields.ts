import {
  Building2,
  Hammer,
  Wrench,
  Package,
  Receipt,
  Sparkles,
  Sun,
  Droplets,
  GlassWater,
} from 'lucide-react';

// ==================== أنواع الحقول ====================

export type FieldType = 'text' | 'number' | 'email' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface ConditionalLogic {
  dependsOn: string; // اسم الحقل الذي يعتمد عليه
  condition: (value: any) => boolean; // دالة تحدد هل يظهر الحقل
}

export interface FormField {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
  conditional?: ConditionalLogic;
  help?: string;
  defaultValue?: any;
}

export interface ProgramConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // Tailwind class مثل 'bg-blue-500'
  requiresMosque: boolean; // هل يتطلب اختيار مسجد
  sharedFields: string[]; // أسماء الحقول المشتركة
  specificFields: FormField[]; // الحقول المتخصصة
}

// ==================== الحقول المشتركة ====================

export const SHARED_FIELDS: Record<string, FormField> = {
  // اختيار المسجد (مطلوب لجميع البرامج ما عدا بنيان)
  mosqueId: {
    name: 'mosqueId',
    type: 'select',
    label: 'اختر المسجد',
    required: true,
    placeholder: 'اختر المسجد المراد تقديم الطلب له',
    help: 'اختر المسجد المراد تقديم الطلب له',
  },

  // وصف الأعمال المطلوبة
  workDescription: {
    name: 'workDescription',
    type: 'textarea',
    label: 'وصف الأعمال المطلوبة',
    required: true,
    placeholder: 'اكتب وصفاً تفصيلياً للأعمال المطلوبة...',
    validation: {
      minLength: 20,
      maxLength: 1000,
      message: 'الوصف يجب أن يكون بين 20 و 1000 حرف',
    },
    help: 'قدم وصفاً مفصلاً لما تحتاجه المسجد',
  },

  // مساحة المسجد
  mosqueArea: {
    name: 'mosqueArea',
    type: 'number',
    label: 'مساحة المسجد بالمتر المربع',
    placeholder: 'مثال: 300',
    validation: {
      min: 10,
      max: 10000,
      message: 'المساحة يجب أن تكون بين 10 و 10000 متر مربع',
    },
  },

  // عدد المصلين الفعلي
  actualWorshippers: {
    name: 'actualWorshippers',
    type: 'number',
    label: 'عدد المصلين الفعلي',
    placeholder: 'مثال: 200',
    validation: {
      min: 1,
      max: 100000,
      message: 'العدد يجب أن يكون موجباً',
    },
  },

  // وجود متبرع للصيانة
  hasDonorForMaintenance: {
    name: 'hasDonorForMaintenance',
    type: 'radio',
    label: 'هل يوجد متبرع للقيام بتكاليف الصيانة المطلوبة؟',
    options: [
      { value: 'yes', label: 'نعم' },
      { value: 'no', label: 'لا' },
    ],
  },

  // الاستعداد للعمل التطوعي
  willingToVolunteer: {
    name: 'willingToVolunteer',
    type: 'radio',
    label: 'هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟',
    required: true,
    options: [
      { value: 'yes', label: 'نعم' },
      { value: 'no', label: 'لا' },
    ],
  },
};

// ==================== الحقول المتخصصة لكل برنامج ====================

// برنامج بنيان - بناء مساجد جديدة
const BUNYAN_SPECIFIC_FIELDS: FormField[] = [
  {
    name: 'neighborhoodName',
    type: 'text',
    label: 'اسم الحي',
    required: true,
    placeholder: 'مثال: حي النسيم',
    validation: {
      minLength: 2,
      maxLength: 100,
      message: 'اسم الحي يجب أن يكون بين 2 و 100 حرف',
    },
  },

  {
    name: 'hasLand',
    type: 'radio',
    label: 'هل لديكم أرض مخصصة للبناء؟',
    required: true,
    options: [
      { value: 'yes', label: 'نعم' },
      { value: 'no', label: 'لا' },
    ],
  },

  {
    name: 'landOwnership',
    type: 'select',
    label: 'ملكية الأرض',
    required: true,
    options: [
      { value: 'owned', label: 'ملك خاص' },
      { value: 'waqf', label: 'وقف' },
      { value: 'government', label: 'حكومية' },
      { value: 'other', label: 'أخرى' },
    ],
    conditional: {
      dependsOn: 'hasLand',
      condition: (value) => value === 'yes',
    },
  },

  {
    name: 'landArea',
    type: 'number',
    label: 'مساحة الأرض بالمتر المربع',
    placeholder: 'مثال: 500',
    validation: {
      min: 50,
      max: 50000,
      message: 'المساحة يجب أن تكون بين 50 و 50000 متر مربع',
    },
    conditional: {
      dependsOn: 'hasLand',
      condition: (value) => value === 'yes',
    },
  },

  {
    name: 'landProposal',
    type: 'textarea',
    label: 'مقترحات بخصوص الأرض',
    placeholder: 'أي مقترحات أو ملاحظات بخصوص الأرض...',
    conditional: {
      dependsOn: 'hasLand',
      condition: (value) => value === 'yes',
    },
  },

  {
    name: 'hasDonor',
    type: 'radio',
    label: 'هل لديكم متبرع للقيام بتكاليف البناء؟',
    required: true,
    options: [
      { value: 'yes', label: 'نعم' },
      { value: 'no', label: 'لا' },
    ],
  },

  {
    name: 'donationAmount',
    type: 'number',
    label: 'مبلغ التبرع (بالريال السعودي)',
    placeholder: 'مثال: 100000',
    validation: {
      min: 1000,
      message: 'المبلغ يجب أن يكون على الأقل 1000 ريال',
    },
    conditional: {
      dependsOn: 'hasDonor',
      condition: (value) => value === 'yes',
    },
  },

  {
    name: 'fundingProposal',
    type: 'textarea',
    label: 'مقترحات التمويل',
    placeholder: 'أي مقترحات بخصوص التمويل والتبرعات...',
    required: true,
    validation: {
      minLength: 20,
      maxLength: 500,
    },
  },

  {
    name: 'nearestMosque',
    type: 'text',
    label: 'أقرب مسجد موجود',
    placeholder: 'اسم أقرب مسجد للموقع المقترح',
  },

  {
    name: 'distanceToMosque',
    type: 'number',
    label: 'المسافة من أقرب مسجد (بالكيلومتر)',
    placeholder: 'مثال: 2.5',
    validation: {
      min: 0.1,
      max: 100,
    },
  },
];

// برنامج سقيا - توفير ماء الشرب
const SUQYA_SPECIFIC_FIELDS: FormField[] = [
  {
    name: 'cartonsNeeded',
    type: 'number',
    label: 'عدد الكراتين المطلوبة',
    required: true,
    placeholder: 'مثال: 50',
    validation: {
      min: 1,
      max: 10000,
      message: 'العدد يجب أن يكون بين 1 و 10000',
    },
  },

  {
    name: 'monthlyCartonNeed',
    type: 'number',
    label: 'احتياج المسجد الشهري بالكرتون',
    placeholder: 'مثال: 20',
    validation: {
      min: 1,
      max: 10000,
    },
  },

  {
    name: 'hasWaterFridge',
    type: 'radio',
    label: 'هل لديكم ثلاجة مخصصة للماء بالمسجد؟',
    required: true,
    options: [
      { value: 'yes', label: 'نعم' },
      { value: 'no', label: 'لا' },
    ],
  },
];

// البرامج الأخرى (7 برامج) - تستخدم الحقول المشتركة فقط بدون حقول متخصصة
const NO_SPECIFIC_FIELDS: FormField[] = [];

// ==================== إعدادات البرامج ====================

export const PROGRAM_CONFIGS: Record<string, ProgramConfig> = {
  bunyan: {
    id: 'bunyan',
    name: 'بنيان',
    description: 'بناء مساجد جديدة',
    icon: Building2,
    color: 'bg-blue-600',
    requiresMosque: false,
    sharedFields: ['workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: BUNYAN_SPECIFIC_FIELDS,
  },

  daaem: {
    id: 'daaem',
    name: 'دعائم',
    description: 'استكمال المساجد المتعثرة',
    icon: Hammer,
    color: 'bg-purple-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  enaya: {
    id: 'enaya',
    name: 'عناية',
    description: 'الصيانة والترميم',
    icon: Wrench,
    color: 'bg-green-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  emdad: {
    id: 'emdad',
    name: 'إمداد',
    description: 'توفير تجهيزات المساجد',
    icon: Package,
    color: 'bg-orange-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  ethraa: {
    id: 'ethraa',
    name: 'إثراء',
    description: 'سداد فواتير الخدمات',
    icon: Receipt,
    color: 'bg-red-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  sedana: {
    id: 'sedana',
    name: 'سدانة',
    description: 'خدمات التشغيل والنظافة',
    icon: Sparkles,
    color: 'bg-cyan-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  taqa: {
    id: 'taqa',
    name: 'طاقة',
    description: 'الطاقة الشمسية',
    icon: Sun,
    color: 'bg-amber-500',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  miyah: {
    id: 'miyah',
    name: 'مياه',
    description: 'أنظمة المياه',
    icon: Droplets,
    color: 'bg-sky-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: NO_SPECIFIC_FIELDS,
  },

  suqya: {
    id: 'suqya',
    name: 'سقيا',
    description: 'توفير ماء الشرب',
    icon: GlassWater,
    color: 'bg-teal-600',
    requiresMosque: true,
    sharedFields: ['mosqueId', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
    specificFields: SUQYA_SPECIFIC_FIELDS,
  },
};

// ==================== دوال مساعدة ====================

/**
 * الحصول على جميع الحقول (المشتركة + المتخصصة) لبرنامج معين
 */
export function getAllFieldsForProgram(programId: string): FormField[] {
  let config = PROGRAM_CONFIGS[programId];
  if (!config) {
    // For custom/dynamic programs, fallback to the standard form fields used by other programs (e.g., daaem, enaya, etc.)
    config = {
      id: programId,
      name: 'برنامج مخصص',
      description: '',
      icon: Hammer,
      color: 'bg-indigo-600',
      requiresMosque: true,
      sharedFields: ['mosqueId', 'workDescription', 'mosqueArea', 'actualWorshippers', 'hasDonorForMaintenance', 'willingToVolunteer'],
      specificFields: [],
    };
  }

  const fields: FormField[] = [];

  // إضافة الحقول المشتركة
  for (const fieldName of config.sharedFields) {
    if (SHARED_FIELDS[fieldName]) {
      fields.push(SHARED_FIELDS[fieldName]);
    }
  }

  // إضافة الحقول المتخصصة
  fields.push(...config.specificFields);

  return fields;
}

/**
 * التحقق من صحة قيمة الحقل
 */
export function validateField(field: FormField, value: any): string | null {
  // التحقق من الحقول المطلوبة
  if (field.required && !value) {
    return `${field.label} مطلوب`;
  }

  // التحقق الخاص بحقل الفريق التطوعي
  if (field.name === 'willingToVolunteer' && value === 'no') {
    return "عذراً، لا يمكن إكمال إنشاء الطلب دون وجود فريق تطوعي. يرجى تأمين الفريق للمتابعة.";
  }

  // إذا كان الحقل فارغاً والتحقق من الحقول المطلوبة فقط
  if (!value) {
    return null;
  }

  // التحقق من الطول الأدنى
  if (field.validation?.minLength && value.toString().length < field.validation.minLength) {
    return field.validation.message || `${field.label} يجب أن يكون على الأقل ${field.validation.minLength} أحرف`;
  }

  // التحقق من الطول الأقصى
  if (field.validation?.maxLength && value.toString().length > field.validation.maxLength) {
    return field.validation.message || `${field.label} يجب ألا يزيد عن ${field.validation.maxLength} أحرف`;
  }

  // التحقق من الحد الأدنى للأرقام
  if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
    return field.validation.message || `${field.label} يجب أن يكون على الأقل ${field.validation.min}`;
  }

  // التحقق من الحد الأقصى للأرقام
  if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
    return field.validation.message || `${field.label} يجب ألا يزيد عن ${field.validation.max}`;
  }

  // التحقق من النمط (Regex)
  if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
    return field.validation.message || `${field.label} صيغة غير صحيحة`;
  }

  return null;
}

/**
 * التحقق من ظهور الحقل بناءً على الشروط
 */
export function shouldShowField(field: FormField, formData: Record<string, any>): boolean {
  if (!field.conditional) {
    return true;
  }

  const dependencyValue = formData[field.conditional.dependsOn];
  return field.conditional.condition(dependencyValue);
}

/**
 * الحصول على جميع الحقول المرئية لبرنامج معين
 */
export function getVisibleFieldsForProgram(programId: string, formData: Record<string, any>): FormField[] {
  const allFields = getAllFieldsForProgram(programId);
  return allFields.filter((field) => shouldShowField(field, formData));
}
