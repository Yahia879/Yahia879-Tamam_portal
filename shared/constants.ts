// ==================== الأدوار ====================
export const USER_ROLES = {
  super_admin: { key: 'super_admin', label: 'المدير العام', labelEn: 'Super Admin' },
  system_admin: { key: 'system_admin', label: 'مدير النظام', labelEn: 'System Admin' },
  projects_office: { key: 'projects_office', label: 'مكتب المشاريع', labelEn: 'Projects Office' },
  field_team: { key: 'field_team', label: 'الفريق الميداني', labelEn: 'Field Team' },
  quick_response: { key: 'quick_response', label: 'فريق الاستجابة السريعة', labelEn: 'Quick Response Team' },
  financial: { key: 'financial', label: 'الإدارة المالية', labelEn: 'Financial Management' },
  project_manager: { key: 'project_manager', label: 'مدير المشروع', labelEn: 'Project Manager' },
  corporate_comm: { key: 'corporate_comm', label: 'الاتصال المؤسسي', labelEn: 'Corporate Communications' },
  service_requester: { key: 'service_requester', label: 'طالب الخدمة', labelEn: 'Service Requester' },
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'المدير العام',
  system_admin: 'مدير النظام',
  projects_office: 'مكتب المشاريع',
  field_team: 'الفريق الميداني',
  quick_response: 'فريق الاستجابة السريعة',
  financial: 'الإدارة المالية',
  project_manager: 'مدير المشروع',
  corporate_comm: 'الاتصال المؤسسي',
  service_requester: 'طالب الخدمة',
};

// الأدوار الداخلية (الموظفين)
export const INTERNAL_ROLES = [
  'super_admin',
  'system_admin',
  'projects_office',
  'field_team',
  'quick_response',
  'financial',
  'project_manager',
  'corporate_comm',
];

// ==================== البرامج ====================
export const PROGRAMS = {
  bunyan: {
    key: 'bunyan',
    name: 'بنيان',
    nameEn: 'Bunyan',
    description: 'بناء مسجد جديد',
    icon: 'Building2',
    color: '#1E40AF', // أزرق داكن
  },
  daaem: {
    key: 'daaem',
    name: 'دعائم',
    nameEn: 'Daaem',
    description: 'استكمال المساجد المتعثرة',
    icon: 'Hammer',
    color: '#7C3AED', // بنفسجي
  },
  enaya: {
    key: 'enaya',
    name: 'عناية',
    nameEn: 'Enaya',
    description: 'الصيانة والترميم',
    icon: 'Wrench',
    color: '#059669', // أخضر
  },
  emdad: {
    key: 'emdad',
    name: 'إمداد',
    nameEn: 'Emdad',
    description: 'توفير تجهيزات المساجد',
    icon: 'Package',
    color: '#D97706', // برتقالي
  },
  ethraa: {
    key: 'ethraa',
    name: 'إثراء',
    nameEn: 'Ethraa',
    description: 'سداد فواتير الخدمات',
    icon: 'Receipt',
    color: '#DC2626', // أحمر
  },
  sedana: {
    key: 'sedana',
    name: 'سدانة',
    nameEn: 'Sedana',
    description: 'خدمات التشغيل والنظافة',
    icon: 'Sparkles',
    color: '#0891B2', // سماوي
  },
  taqa: {
    key: 'taqa',
    name: 'طاقة',
    nameEn: 'Taqa',
    description: 'الطاقة الشمسية',
    icon: 'Sun',
    color: '#F59E0B', // أصفر
  },
  miyah: {
    key: 'miyah',
    name: 'مياه',
    nameEn: 'Miyah',
    description: 'أنظمة المياه',
    icon: 'Droplets',
    color: '#0284C7', // أزرق فاتح
  },
  suqya: {
    key: 'suqya',
    name: 'سقيا',
    nameEn: 'Suqya',
    description: 'توفير ماء الشرب',
    icon: 'GlassWater',
    color: '#06B6D4', // تركواز
  },
} as const;

export const PROGRAM_LABELS: Record<string, string> = {
  bunyan: 'بنيان',
  daaem: 'دعائم',
  enaya: 'عناية',
  emdad: 'إمداد',
  ethraa: 'إثراء',
  sedana: 'سدانة',
  taqa: 'طاقة',
  miyah: 'مياه',
  suqya: 'سقيا',
};

// أسماء أيقونات Lucide للبرامج
export const PROGRAM_ICON_NAMES: Record<string, string> = {
  bunyan: 'Building2',
  daaem: 'Hammer',
  enaya: 'Wrench',
  emdad: 'Package',
  ethraa: 'Receipt',
  sedana: 'Sparkles',
  taqa: 'Sun',
  miyah: 'Droplets',
  suqya: 'GlassWater',
};

// ألوان البرامج
export const PROGRAM_COLORS: Record<string, string> = {
  bunyan: '#1E40AF',
  daaem: '#7C3AED',
  enaya: '#059669',
  emdad: '#D97706',
  ethraa: '#DC2626',
  sedana: '#0891B2',
  taqa: '#F59E0B',
  miyah: '#0284C7',
  suqya: '#06B6D4',
};

// ==================== المراحل الرئيسية للطلبات (11 مرحلة) ====================
export const REQUEST_STAGES = {
  submitted: {
    key: 'submitted',
    name: 'تقديم الطلب',
    nameEn: 'Submitted',
    order: 1,
    description: 'تم تقديم الطلب وبانتظار المراجعة',
    color: '#6B7280',
    icon: 'FileText',
    durationDays: 1,
  },
  initial_review: {
    key: 'initial_review',
    name: 'المراجعة الأولية',
    nameEn: 'Initial Review',
    order: 2,
    description: 'مراجعة البيانات والمستندات',
    color: '#3B82F6',
    icon: 'FileSearch',
    durationDays: 3,
  },
  field_visit: {
    key: 'field_visit',
    name: 'الزيارة الميدانية',
    nameEn: 'Field Visit',
    order: 3,
    description: 'إسناد وجدولة وتنفيذ الزيارة ورفع التقرير',
    color: '#8B5CF6',
    icon: 'MapPin',
    durationDays: 7,
  },
  technical_eval: {
    key: 'technical_eval',
    name: 'التقييم الفني',
    nameEn: 'Technical Evaluation',
    order: 4,
    description: 'اتخاذ القرار: اعتذار/تعليق/استجابة سريعة/تحويل لمشروع',
    color: '#F59E0B',
    icon: 'ClipboardCheck',
    durationDays: 5,
  },
  boq_preparation: {
    key: 'boq_preparation',
    name: 'إعداد جدول الكميات',
    nameEn: 'BOQ Preparation',
    order: 5,
    description: 'إعداد جدول الكميات والمواصفات',
    color: '#EC4899',
    icon: 'Table',
    durationDays: 5,
  },
  financial_eval: {
    key: 'financial_eval',
    name: 'التقييم المالي',
    nameEn: 'Financial Evaluation',
    order: 6,
    description: 'جمع عروض الأسعار والمقارنة',
    color: '#10B981',
    icon: 'Calculator',
    durationDays: 10,
  },
  quotation_approval: {
    key: 'quotation_approval',
    name: 'اعتماد العرض',
    nameEn: 'Quotation Approval',
    order: 7,
    description: 'اعتماد العرض الفائز',
    color: '#14B8A6',
    icon: 'BadgeCheck',
    durationDays: 3,
  },
  contracting: {
    key: 'contracting',
    name: 'التعاقد',
    nameEn: 'Contracting',
    order: 8,
    description: 'إنشاء العقد وتوقيعه وتحويله لمشروع',
    color: '#6366F1',
    icon: 'FileSignature',
    durationDays: 5,
  },
  execution: {
    key: 'execution',
    name: 'التنفيذ',
    nameEn: 'Execution',
    order: 9,
    description: 'تنفيذ الأعمال: تقرير إنجاز → طلب صرف → أمر صرف',
    color: '#06B6D4',
    icon: 'Cog',
    durationDays: 0,
  },
  handover: {
    key: 'handover',
    name: 'الاستلام',
    nameEn: 'Handover',
    order: 10,
    description: 'الاستلام الابتدائي → فترة الضمان → الاستلام النهائي → التقرير الختامي → الدفعة الختامية',
    color: '#22C55E',
    icon: 'ClipboardList',
    durationDays: 14,
  },
  closed: {
    key: 'closed',
    name: 'الإغلاق',
    nameEn: 'Closed',
    order: 11,
    description: 'قياس رضا أصحاب المصلحة والمستفيدين والنشر والتغذية الراجعة',
    color: '#059669',
    icon: 'CheckCircle2',
    durationDays: 14,
  },
} as const;

export const STAGE_LABELS: Record<string, string> = {
  submitted: 'تقديم الطلب',
  initial_review: 'المراجعة الأولية',
  field_visit: 'الزيارة الميدانية',
  technical_eval: 'التقييم الفني',
  boq_preparation: 'إعداد جدول الكميات',
  financial_eval: 'التقييم المالي',
  financial_eval_and_approval: 'التقييم المالي واعتماد العرض',
  quotation_approval: 'اعتماد العرض',
  contracting: 'التعاقد',
  execution: 'التنفيذ',
  handover: 'الاستلام',
  closed: 'الإغلاق',
};

// ==================== المراحل الفرعية (الإجراءات) ====================
export const SUB_STAGES = {
  // الزيارة الميدانية
  field_visit_assign: { key: 'field_visit_assign', name: 'إسناد الزيارة', parentStage: 'field_visit', order: 1, durationDays: 1 },
  field_visit_schedule: { key: 'field_visit_schedule', name: 'جدولة الزيارة', parentStage: 'field_visit', order: 2, durationDays: 2 },
  field_visit_execute: { key: 'field_visit_execute', name: 'تنفيذ الزيارة', parentStage: 'field_visit', order: 3, durationDays: 3 },
  field_visit_report: { key: 'field_visit_report', name: 'رفع التقرير', parentStage: 'field_visit', order: 4, durationDays: 1 },
  
  // التقييم الفني
  technical_eval_review: { key: 'technical_eval_review', name: 'مراجعة التقرير', parentStage: 'technical_eval', order: 1, durationDays: 2 },
  technical_eval_decision: { key: 'technical_eval_decision', name: 'اتخاذ القرار', parentStage: 'technical_eval', order: 2, durationDays: 3 },
  
  // إعداد جدول الكميات
  boq_items_add: { key: 'boq_items_add', name: 'إضافة البنود', parentStage: 'boq_preparation', order: 1, durationDays: 3 },
  boq_review: { key: 'boq_review', name: 'مراجعة الكميات', parentStage: 'boq_preparation', order: 2, durationDays: 1 },
  boq_approve: { key: 'boq_approve', name: 'اعتماد الجدول', parentStage: 'boq_preparation', order: 3, durationDays: 1 },
  
  // التقييم المالي
  financial_request_quotes: { key: 'financial_request_quotes', name: 'طلب عروض الأسعار', parentStage: 'financial_eval', order: 1, durationDays: 3 },
  financial_receive_quotes: { key: 'financial_receive_quotes', name: 'استلام العروض', parentStage: 'financial_eval', order: 2, durationDays: 5 },
  financial_compare: { key: 'financial_compare', name: 'مقارنة العروض', parentStage: 'financial_eval', order: 3, durationDays: 2 },
  
  // التعاقد
  contract_prepare: { key: 'contract_prepare', name: 'إعداد العقد', parentStage: 'contracting', order: 1, durationDays: 2 },
  contract_review: { key: 'contract_review', name: 'مراجعة العقد', parentStage: 'contracting', order: 2, durationDays: 1 },
  contract_sign: { key: 'contract_sign', name: 'توقيع العقد', parentStage: 'contracting', order: 3, durationDays: 1 },
  contract_to_project: { key: 'contract_to_project', name: 'تحويل إلى مشروع', parentStage: 'contracting', order: 4, durationDays: 1 },
  
  // التنفيذ (لكل مرحلة)
  execution_progress_report: { key: 'execution_progress_report', name: 'تقرير إنجاز', parentStage: 'execution', order: 1, durationDays: 0 },
  execution_payment_request: { key: 'execution_payment_request', name: 'طلب صرف', parentStage: 'execution', order: 2, durationDays: 3 },
  execution_payment_order: { key: 'execution_payment_order', name: 'أمر صرف', parentStage: 'execution', order: 3, durationDays: 2 },
  
  // الاستلام
  handover_preliminary: { key: 'handover_preliminary', name: 'الاستلام الابتدائي', parentStage: 'handover', order: 1, durationDays: 3 },
  handover_warranty: { key: 'handover_warranty', name: 'فترة الضمان', parentStage: 'handover', order: 2, durationDays: 0 },
  handover_final: { key: 'handover_final', name: 'الاستلام النهائي', parentStage: 'handover', order: 3, durationDays: 3 },
  handover_final_report: { key: 'handover_final_report', name: 'التقرير الختامي', parentStage: 'handover', order: 4, durationDays: 3 },
  handover_final_payment: { key: 'handover_final_payment', name: 'الدفعة الختامية', parentStage: 'handover', order: 5, durationDays: 5 },
  
  // الإغلاق
  closure_stakeholder_satisfaction: { key: 'closure_stakeholder_satisfaction', name: 'قياس رضا أصحاب المصلحة', parentStage: 'closed', order: 1, durationDays: 3 },
  closure_beneficiary_satisfaction: { key: 'closure_beneficiary_satisfaction', name: 'قياس رضا المستفيدين', parentStage: 'closed', order: 2, durationDays: 3 },
  closure_publish: { key: 'closure_publish', name: 'النشر', parentStage: 'closed', order: 3, durationDays: 3 },
  closure_feedback: { key: 'closure_feedback', name: 'التغذية الراجعة', parentStage: 'closed', order: 4, durationDays: 3 },
  closure_archive: { key: 'closure_archive', name: 'أرشفة الملف', parentStage: 'closed', order: 5, durationDays: 2 },
} as const;

export const SUB_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(SUB_STAGES).map(s => [s.key, s.name])
);

// ==================== حالات الطلب ====================
export const REQUEST_STATUSES = {
  pending: { key: 'pending', label: 'قيد الانتظار', color: '#6B7280' },
  under_review: { key: 'under_review', label: 'قيد المراجعة', color: '#3B82F6' },
  approved: { key: 'approved', label: 'معتمد', color: '#22C55E' },
  rejected: { key: 'rejected', label: 'مرفوض', color: '#EF4444' },
  suspended: { key: 'suspended', label: 'معلق', color: '#F59E0B' },
  in_progress: { key: 'in_progress', label: 'قيد التنفيذ', color: '#06B6D4' },
  completed: { key: 'completed', label: 'مكتمل', color: '#10B981' },
} as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  under_review: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  suspended: 'معلق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};

// ==================== حالات المسجد ====================
export const MOSQUE_STATUSES = {
  new: { key: 'new', label: 'جديد', color: '#3B82F6' },
  existing: { key: 'existing', label: 'قائم', color: '#22C55E' },
  under_construction: { key: 'under_construction', label: 'تحت الإنشاء', color: '#F59E0B' },
} as const;

export const MOSQUE_STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  existing: 'قائم',
  under_construction: 'تحت الإنشاء',
};

// ==================== أنواع ملكية المسجد ====================
export const MOSQUE_OWNERSHIP = {
  government: { key: 'government', label: 'حكومي', color: '#1E40AF' },
  waqf: { key: 'waqf', label: 'وقف', color: '#7C3AED' },
  private: { key: 'private', label: 'أهلي', color: '#059669' },
} as const;

export const OWNERSHIP_LABELS: Record<string, string> = {
  government: 'حكومي',
  waqf: 'وقف',
  private: 'أهلي',
};

// ==================== حالات المستخدم ====================
export const USER_STATUSES = {
  pending: { key: 'pending', label: 'قيد الانتظار', color: '#F59E0B' },
  active: { key: 'active', label: 'نشط', color: '#22C55E' },
  suspended: { key: 'suspended', label: 'معلق', color: '#6B7280' },
  blocked: { key: 'blocked', label: 'محظور', color: '#EF4444' },
} as const;

export const USER_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  active: 'نشط',
  suspended: 'معلق',
  blocked: 'محظور',
};

// ==================== أولويات الطلب ====================
export const PRIORITIES = {
  urgent: { key: 'urgent', label: 'عاجل', color: '#EF4444' },
  medium: { key: 'medium', label: 'متوسط', color: '#F59E0B' },
  normal: { key: 'normal', label: 'عادي', color: '#6B7280' },
} as const;

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'عاجل',
  medium: 'متوسط',
  normal: 'عادي',
};

// ==================== أنواع صفة طالب الخدمة ====================
export const REQUESTER_TYPES = [
  { value: 'imam', label: 'إمام المسجد' },
  { value: 'muezzin', label: 'مؤذن المسجد' },
  { value: 'board_member', label: 'عضو مجلس إدارة' },
  { value: 'committee_member', label: 'عضو لجنة' },
  { value: 'volunteer', label: 'متطوع' },
  { value: 'other', label: 'أخرى' },
] as const;

// ==================== أنواع المرفقات ====================
export const ATTACHMENT_TYPES = {
  image: { key: 'image', label: 'صورة' },
  document: { key: 'document', label: 'مستند' },
  report: { key: 'report', label: 'تقرير' },
  contract: { key: 'contract', label: 'عقد' },
  invoice: { key: 'invoice', label: 'فاتورة' },
} as const;

// ==================== أنواع الشركاء ====================
export const PARTNER_TYPES = {
  strategic: { key: 'strategic', label: 'شريك استراتيجي' },
  sponsor: { key: 'sponsor', label: 'راعي' },
  supporter: { key: 'supporter', label: 'داعم' },
  media: { key: 'media', label: 'شريك إعلامي' },
} as const;

// ==================== صلاحيات الأدوار ====================
export const ROLE_PERMISSIONS = {
  super_admin: {
    canManageUsers: true,
    canManageRoles: true,
    canManageSettings: true,
    canViewAllRequests: true,
    canApproveRequests: true,
    canManageProjects: true,
    canManageFinance: true,
    canViewReports: true,
    canManageMosques: true,
    canManagePartners: true,
    canManageBranding: true,
  },
  system_admin: {
    canManageUsers: true,
    canManageRoles: true,
    canManageSettings: true,
    canViewAllRequests: true,
    canApproveRequests: false,
    canManageProjects: false,
    canManageFinance: false,
    canViewReports: true,
    canManageMosques: true,
    canManagePartners: true,
    canManageBranding: true,
  },
  projects_office: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: true,
    canApproveRequests: true,
    canManageProjects: true,
    canManageFinance: false,
    canViewReports: true,
    canManageMosques: true,
    canManagePartners: false,
    canManageBranding: false,
  },
  field_team: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: false,
    canApproveRequests: false,
    canManageProjects: false,
    canManageFinance: false,
    canViewReports: false,
    canManageMosques: false,
    canManagePartners: false,
    canManageBranding: false,
    canSubmitFieldReports: true,
  },
  quick_response: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: false,
    canApproveRequests: false,
    canManageProjects: false,
    canManageFinance: false,
    canViewReports: false,
    canManageMosques: false,
    canManagePartners: false,
    canManageBranding: false,
    canSubmitQuickResponse: true,
  },
  financial: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: true,
    canApproveRequests: false,
    canManageProjects: false,
    canManageFinance: true,
    canViewReports: true,
    canManageMosques: false,
    canManagePartners: false,
    canManageBranding: false,
  },
  project_manager: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: false,
    canApproveRequests: false,
    canManageProjects: true,
    canManageFinance: false,
    canViewReports: true,
    canManageMosques: false,
    canManagePartners: false,
    canManageBranding: false,
  },
  corporate_comm: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: true,
    canApproveRequests: false,
    canManageProjects: false,
    canManageFinance: false,
    canViewReports: true,
    canManageMosques: false,
    canManagePartners: true,
    canManageBranding: true,
  },
  service_requester: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewAllRequests: false,
    canApproveRequests: false,
    canManageProjects: false,
    canManageFinance: false,
    canViewReports: false,
    canManageMosques: false,
    canManagePartners: false,
    canManageBranding: false,
    canSubmitRequests: true,
    canViewOwnRequests: true,
  },
} as const;


// ==================== صلاحيات تحويل المراحل ====================
// تحديد الأدوار المسموح لها بتحويل الطلب من كل مرحلة إلى المرحلة التالية
export const STAGE_TRANSITION_PERMISSIONS: Record<string, string[]> = {
  // من تقديم الطلب إلى المراجعة الأولية
  submitted: ['super_admin', 'system_admin', 'projects_office'],
  
  // من المراجعة الأولية إلى الزيارة الميدانية
  initial_review: ['super_admin', 'system_admin', 'projects_office'],
  
  // من الزيارة الميدانية إلى التقييم الفني
  field_visit: ['super_admin', 'system_admin', 'projects_office', 'field_team'],
  
  // من التقييم الفني إلى إعداد جدول الكميات (للمشاريع) أو التنفيذ (للاستجابة السريعة)
  technical_eval: ['super_admin', 'system_admin', 'projects_office'],
  
  // من إعداد جدول الكميات إلى التقييم المالي
  boq_preparation: ['super_admin', 'system_admin', 'projects_office'],
  
  // من التقييم المالي إلى اعتماد العرض
  financial_eval: ['super_admin', 'system_admin', 'projects_office', 'financial'],
  
  // من التقييم المالي واعتماد العرض إلى التعاقد (المرحلة الموحدة)
  financial_eval_and_approval: ['super_admin', 'system_admin', 'projects_office', 'financial'],
  
  // من اعتماد العرض إلى التعاقد
  quotation_approval: ['super_admin', 'system_admin', 'financial'],
  
  // من التعاقد إلى التنفيذ
  contracting: ['super_admin', 'system_admin', 'projects_office', 'financial'],
  
  // من التنفيذ إلى الاستلام
  execution: ['super_admin', 'system_admin', 'projects_office', 'project_manager', 'quick_response'],
  
  // من الاستلام إلى الإغلاق
  handover: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
  
  // مرحلة الإغلاق - لا يمكن التحويل منها
  closed: [],
};

// صلاحيات اعتماد/رفض الطلبات
export const STATUS_CHANGE_PERMISSIONS: Record<string, string[]> = {
  // اعتماد الطلب
  approve: ['super_admin', 'system_admin', 'projects_office'],
  
  // رفض الطلب
  reject: ['super_admin', 'system_admin', 'projects_office'],
  
  // تعليق الطلب
  suspend: ['super_admin', 'system_admin', 'projects_office'],
};

// دالة للتحقق من صلاحية تحويل المرحلة
export function canTransitionStage(userRole: string, currentStage: string): boolean {
  const allowedRoles = STAGE_TRANSITION_PERMISSIONS[currentStage] || [];
  return allowedRoles.includes(userRole);
}

// دالة للتحقق من صلاحية تغيير الحالة
export function canChangeStatus(userRole: string, action: string): boolean {
  const allowedRoles = STATUS_CHANGE_PERMISSIONS[action] || [];
  return allowedRoles.includes(userRole);
}

// الحصول على اسم المرحلة التالية (للمسار العادي)
export function getNextStage(currentStage: string, track: 'standard' | 'quick_response' = 'standard'): string | null {
  const standardStages = ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'boq_preparation', 'financial_eval', 'quotation_approval', 'contracting', 'execution', 'handover', 'closed'];
  const quickResponseStages = ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'execution', 'closed'];
  
  const stages = track === 'quick_response' ? quickResponseStages : standardStages;
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }
  return null;
}

// الحصول على رقم المرحلة الحالية
export function getStageOrder(stage: string): number {
  const stages = ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'boq_preparation', 'financial_eval', 'quotation_approval', 'contracting', 'execution', 'handover', 'closed'];
  return stages.indexOf(stage) + 1;
}

// ==================== خيارات التقييم الفني (الخيارات الأربعة) ====================
export const TECHNICAL_EVAL_OPTIONS = {
  apologize: {
    key: 'apologize',
    name: 'الاعتذار عن الطلب',
    nameEn: 'Apologize for Request',
    description: 'رفض الطلب مع ذكر المبررات',
    requiresJustification: true,
    nextStage: 'closed',
    resultStatus: 'rejected',
    allowedRoles: ['super_admin', 'system_admin', 'projects_office'],
    icon: 'XCircle',
    color: '#EF4444',
  },
  suspend: {
    key: 'suspend',
    name: 'تعليق الطلب',
    nameEn: 'Suspend Request',
    description: 'تعليق الطلب مع ذكر المبررات',
    requiresJustification: true,
    nextStage: null, // يبقى في نفس المرحلة
    resultStatus: 'suspended',
    allowedRoles: ['super_admin', 'system_admin', 'projects_office'],
    icon: 'PauseCircle',
    color: '#F59E0B',
  },
  quick_response: {
    key: 'quick_response',
    name: 'التحويل إلى الاستجابة السريعة',
    nameEn: 'Transfer to Quick Response',
    description: 'تتم الزيارة واستكمال الخدمة ثم يتم رفع تقرير الاستجابة السريعة',
    requiresJustification: false,
    nextStage: 'execution', // ينتقل للتنفيذ مباشرة
    resultStatus: 'in_progress',
    allowedRoles: ['super_admin', 'system_admin', 'projects_office'],
    assignTo: 'quick_response', // يسند لفريق الاستجابة السريعة
    icon: 'Zap',
    color: '#8B5CF6',
  },
  convert_to_project: {
    key: 'convert_to_project',
    name: 'التحويل إلى مشروع',
    nameEn: 'Convert to Project',
    description: 'تحويل الطلب إلى مشروع والانتقال لإعداد جدول الكميات',
    requiresJustification: false,
    nextStage: 'boq_preparation',
    resultStatus: 'in_progress',
    allowedRoles: ['super_admin', 'system_admin', 'projects_office'],
    createsProject: true,
    icon: 'FolderKanban',
    color: '#22C55E',
  },
} as const;

export const TECHNICAL_EVAL_OPTION_LABELS: Record<string, string> = {
  apologize: 'الاعتذار عن الطلب',
  suspend: 'تعليق الطلب',
  quick_response: 'التحويل إلى الاستجابة السريعة',
  convert_to_project: 'التحويل إلى مشروع',
};

// ==================== الخطوات الفرعية لكل مرحلة ====================
export const STAGE_SUBSTEPS = {
  submitted: [
    { key: 'account_login', name: 'تسجيل الدخول', responsible: 'service_requester' },
    { key: 'mosque_registration', name: 'تسجيل المسجد', responsible: 'service_requester' },
    { key: 'service_request', name: 'تعبئة نموذج الطلب', responsible: 'service_requester' },
  ],
  initial_review: [
    { key: 'account_approval', name: 'اعتماد تسجيل الحساب/المسجد', responsible: 'projects_office', durationDays: 1 },
    { key: 'initial_evaluation', name: 'الاطلاع على الطلب وتقييمه', responsible: 'projects_office', durationDays: 2 },
    { key: 'assign_technical', name: 'إسناد الطلب للدراسة الفنية', responsible: 'projects_office' },
  ],
  field_visit: [
    { key: 'assign_visit', name: 'إسناد الزيارة', responsible: 'projects_office', durationDays: 1 },
    { key: 'schedule_visit', name: 'جدولة الزيارة', responsible: 'field_team', durationDays: 2 },
    { key: 'execute_visit', name: 'تنفيذ الزيارة', responsible: 'field_team', durationDays: 3 },
    { key: 'submit_report', name: 'رفع التقرير', responsible: 'field_team', durationDays: 1 },
  ],
  technical_eval: [
    { key: 'review_report', name: 'مراجعة التقرير الفني', responsible: 'projects_office', durationDays: 2 },
    { key: 'make_decision', name: 'اتخاذ القرار (الخيارات الأربعة)', responsible: 'projects_office', durationDays: 3 },
  ],
  boq_preparation: [
    { key: 'add_items', name: 'إضافة بنود جدول الكميات', responsible: 'projects_office', durationDays: 3 },
    { key: 'review_boq', name: 'مراجعة الكميات', responsible: 'projects_office', durationDays: 1 },
    { key: 'approve_boq', name: 'اعتماد الجدول', responsible: 'projects_office', durationDays: 1 },
  ],
  financial_eval: [
    { key: 'request_quotes', name: 'طلب عروض الأسعار', responsible: 'projects_office', durationDays: 3 },
    { key: 'receive_quotes', name: 'استلام العروض', responsible: 'projects_office', durationDays: 5 },
    { key: 'compare_quotes', name: 'مقارنة العروض', responsible: 'projects_office', durationDays: 2 },
  ],
  quotation_approval: [
    { key: 'select_supplier', name: 'اختيار المورد', responsible: 'projects_office', durationDays: 1 },
    { key: 'approve_quotation', name: 'اعتماد العرض', responsible: 'financial', durationDays: 2 },
  ],
  contracting: [
    { key: 'prepare_contract', name: 'إعداد العقد', responsible: 'projects_office', durationDays: 2 },
    { key: 'review_contract', name: 'مراجعة العقد', responsible: 'financial', durationDays: 1 },
    { key: 'sign_contract', name: 'توقيع العقد', responsible: 'super_admin', durationDays: 1 },
    { key: 'convert_to_project', name: 'تحويل إلى مشروع', responsible: 'projects_office', durationDays: 1 },
  ],
  execution: [
    { key: 'progress_report', name: 'تقرير إنجاز', responsible: 'project_manager' },
    { key: 'payment_request', name: 'طلب صرف', responsible: 'project_manager', durationDays: 3 },
    { key: 'payment_order', name: 'أمر صرف', responsible: 'financial', durationDays: 2 },
  ],
  handover: [
    { key: 'preliminary_handover', name: 'الاستلام الابتدائي', responsible: 'project_manager', durationDays: 3 },
    { key: 'warranty_period', name: 'فترة الضمان', responsible: 'project_manager' },
    { key: 'final_handover', name: 'الاستلام النهائي', responsible: 'project_manager', durationDays: 3 },
    { key: 'final_report', name: 'التقرير الختامي', responsible: 'project_manager', durationDays: 3 },
    { key: 'final_payment', name: 'الدفعة الختامية', responsible: 'financial', durationDays: 5 },
  ],
  closed: [
    { key: 'stakeholder_satisfaction', name: 'قياس رضا أصحاب المصلحة', responsible: 'corporate_comm', durationDays: 3 },
    { key: 'beneficiary_satisfaction', name: 'قياس رضا المستفيدين', responsible: 'corporate_comm', durationDays: 3 },
    { key: 'publish_results', name: 'النشر', responsible: 'corporate_comm', durationDays: 3 },
    { key: 'feedback', name: 'التغذية الراجعة', responsible: 'corporate_comm', durationDays: 3 },
    { key: 'archive', name: 'أرشفة الملف', responsible: 'projects_office', durationDays: 2 },
  ],
} as const;

// ==================== مسارات الطلب ====================
export const REQUEST_TRACKS = {
  standard: {
    key: 'standard',
    name: 'المسار العادي (مشروع)',
    description: 'المسار الكامل من التقديم إلى الإغلاق',
    stages: ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'boq_preparation', 'financial_eval', 'quotation_approval', 'contracting', 'execution', 'handover', 'closed'],
  },
  quick_response: {
    key: 'quick_response',
    name: 'مسار الاستجابة السريعة',
    description: 'مسار مختصر للحالات البسيطة',
    stages: ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'execution', 'closed'],
  },
  rejected: {
    key: 'rejected',
    name: 'مسار الاعتذار',
    description: 'الطلبات التي تم الاعتذار عنها',
    stages: ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'closed'],
  },
} as const;


// ==================== الشروط المسبقة للانتقال بين المراحل ====================
export type PrerequisiteType = 
  | 'field_inspection_report'  // تقرير المعاينة الميدانية
  | 'quick_response_report'    // تقرير الاستجابة السريعة
  | 'technical_eval_decision'  // قرار التقييم الفني
  | 'boq_created'              // جدول الكميات
  | 'quotes_received'          // عروض الأسعار
  | 'supplier_selected'        // اختيار المورد
  | 'contract_signed'          // توقيع العقد
  | 'final_report'             // التقرير الختامي
  | 'satisfaction_survey';     // استبيان الرضا

export interface StagePrerequisite {
  type: PrerequisiteType;
  name: string;
  description: string;
  required: boolean;
  checkField?: string;  // الحقل الذي يتم التحقق منه في قاعدة البيانات
  checkTable?: string;  // الجدول الذي يتم التحقق منه
}

export const STAGE_PREREQUISITES: Record<string, StagePrerequisite[]> = {
  // من تقديم الطلب إلى المراجعة الأولية - لا توجد شروط
  submitted_to_initial_review: [],
  
  // من المراجعة الأولية إلى الزيارة الميدانية - لا توجد شروط
  initial_review_to_field_visit: [],
  
  // من الزيارة الميدانية إلى التقييم الفني - يجب وجود تقرير المعاينة
  field_visit_to_technical_eval: [
    {
      type: 'field_inspection_report',
      name: 'تقرير المعاينة الميدانية',
      description: 'يجب رفع تقرير المعاينة الميدانية قبل الانتقال للتقييم الفني',
      required: true,
      checkTable: 'field_inspection_reports',
      checkField: 'requestId',
    },
  ],
  
  // من التقييم الفني إلى إعداد جدول الكميات (مسار المشروع)
  technical_eval_to_boq_preparation: [
    {
      type: 'technical_eval_decision',
      name: 'قرار التقييم الفني',
      description: 'يجب اختيار "التحويل إلى مشروع" للانتقال لإعداد جدول الكميات',
      required: true,
      checkField: 'technicalEvalDecision',
      checkTable: 'mosque_requests',
    },
  ],
  
  // من التقييم الفني إلى التنفيذ (مسار الاستجابة السريعة)
  technical_eval_to_execution_quick: [
    {
      type: 'technical_eval_decision',
      name: 'قرار التقييم الفني',
      description: 'يجب اختيار "التحويل إلى الاستجابة السريعة" للانتقال للتنفيذ',
      required: true,
      checkField: 'technicalEvalDecision',
      checkTable: 'mosque_requests',
    },
  ],
  
  // من إعداد جدول الكميات إلى التقييم المالي
  boq_preparation_to_financial_eval: [
    {
      type: 'boq_created',
      name: 'جدول الكميات',
      description: 'يجب إعداد جدول الكميات قبل الانتقال للتقييم المالي',
      required: true,
      checkTable: 'quantity_schedules',
      checkField: 'requestId',
    },
  ],
  
  // من التقييم المالي إلى اعتماد العرض
  financial_eval_to_quotation_approval: [
    {
      type: 'quotes_received',
      name: 'عروض الأسعار',
      description: 'يجب استلام عروض الأسعار قبل الانتقال لاعتماد العرض',
      required: true,
      checkTable: 'quotations',
      checkField: 'requestId',
    },
  ],
  
  // من اعتماد العرض إلى التعاقد
  quotation_approval_to_contracting: [
    {
      type: 'supplier_selected',
      name: 'اختيار المورد',
      description: 'يجب اختيار المورد الفائز قبل الانتقال للتعاقد',
      required: true,
      checkTable: 'quotations',
      checkField: 'status',
    },
  ],
  
  // من التعاقد إلى التنفيذ
  contracting_to_execution: [
    {
      type: 'contract_signed',
      name: 'العقد الموقع',
      description: 'يجب توقيع العقد قبل الانتقال للتنفيذ',
      required: true,
      checkTable: 'contracts_enhanced',
      checkField: 'requestId',
    },
  ],
  
  // من التنفيذ إلى الاستلام
  execution_to_handover: [
    {
      type: 'final_report',
      name: 'تقرير الإنجاز',
      description: 'يجب رفع تقرير إنجاز 100% قبل الانتقال للاستلام',
      required: true,
      checkTable: 'progress_reports',
      checkField: 'projectId',
    },
  ],
  
  // من الاستلام إلى الإغلاق
  handover_to_closed: [
    {
      type: 'final_report',
      name: 'التقرير الختامي',
      description: 'يجب رفع التقرير الختامي قبل الإغلاق',
      required: true,
      checkTable: 'final_reports',
      checkField: 'projectId',
    },
  ],
  
  // من التنفيذ إلى الإغلاق (مسار الاستجابة السريعة)
  execution_to_closed_quick: [
    {
      type: 'quick_response_report',
      name: 'تقرير الاستجابة السريعة',
      description: 'يجب رفع تقرير الاستجابة السريعة قبل إغلاق الطلب',
      required: true,
      checkTable: 'quick_response_reports',
      checkField: 'requestId',
    },
  ],
  
  // من التنفيذ إلى الإغلاق (مسار المشروع - قديم)
  execution_to_closed_project: [
    {
      type: 'contract_signed',
      name: 'العقد الموقع',
      description: 'يجب وجود عقد موقع مع المورد',
      required: true,
      checkTable: 'contracts',
      checkField: 'projectId',
    },
    {
      type: 'final_report',
      name: 'التقرير الختامي',
      description: 'يجب رفع التقرير الختامي للمشروع',
      required: false,
      checkTable: 'final_reports',
      checkField: 'projectId',
    },
  ],
};

// دالة للحصول على الشروط المسبقة بناءً على المرحلة الحالية والتالية والمسار
export function getPrerequisites(
  currentStage: string,
  nextStage: string,
  requestTrack: string = 'standard'
): StagePrerequisite[] {
  const key = `${currentStage}_to_${nextStage}`;
  
  // التحقق من المسار للحالات الخاصة
  if (currentStage === 'execution' && nextStage === 'closed') {
    if (requestTrack === 'quick_response') {
      return STAGE_PREREQUISITES['execution_to_closed_quick'] || [];
    }
    return STAGE_PREREQUISITES['execution_to_closed_project'] || [];
  }
  
  if (currentStage === 'technical_eval' && nextStage === 'execution') {
    return STAGE_PREREQUISITES['technical_eval_to_execution_quick'] || [];
  }
  
  return STAGE_PREREQUISITES[key] || [];
}

// رسائل الخطأ للشروط المسبقة
export const PREREQUISITE_ERROR_MESSAGES: Record<PrerequisiteType, string> = {
  field_inspection_report: 'يجب رفع تقرير المعاينة الميدانية قبل الانتقال للمرحلة التالية',
  quick_response_report: 'يجب رفع تقرير الاستجابة السريعة قبل إغلاق الطلب',
  technical_eval_decision: 'يجب اتخاذ قرار التقييم الفني (أحد الخيارات الأربعة)',
  boq_created: 'يجب إعداد جدول الكميات قبل الانتقال للتنفيذ',
  quotes_received: 'يجب استلام عروض الأسعار من الموردين',
  supplier_selected: 'يجب اختيار المورد المناسب من العروض المقدمة',
  contract_signed: 'يجب توقيع العقد مع المورد قبل إغلاق المشروع',
  final_report: 'يجب رفع التقرير الختامي للمشروع',
  satisfaction_survey: 'يجب إكمال استبيان رضا المستفيد',
};


// ==================== تكوين الإجراءات النشطة ====================
export interface ActionButton {
  label: string;
  nextStage?: string;
  redirectUrl?: string;
  openModal?: string; // فتح نافذة منبثقة بدلاً من التنقل لصفحة جديدة
}

export interface ActionConfig {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  actionButton?: ActionButton;
  allowedRoles: string[];
}

export const ACTION_CONFIGS: Record<string, ActionConfig> = {
  submitted: {
    title: "مراجعة الطلب",
    description: "قم بمراجعة الطلب الجديد والتأكد من استيفاء جميع المتطلبات الأساسية قبل الانتقال للمرحلة التالية.",
    icon: "FileSearch",
    iconColor: "text-blue-600",
    actionButton: {
      label: "بدء المراجعة الأولية",
      nextStage: "initial_review",
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office"],
  },
  initial_review: {
    title: "المراجعة الأولية",
    description: "راجع المستندات والمعلومات المقدمة وتأكد من اكتمالها. يمكنك الموافقة على الطلب أو طلب معلومات إضافية.",
    icon: "ClipboardCheck",
    iconColor: "text-indigo-600",
    actionButton: {
      label: "اعتماد المراجعة والانتقال للزيارة الميدانية",
      nextStage: "field_visit",
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office"],
  },
  field_visit: {
    title: "جدولة الزيارة الميدانية",
    description: "قم بتحديد موعد الزيارة الميدانية وتعيين الفريق المسؤول عن إجراء الزيارة وتقييم الموقع.",
    icon: "MapPin",
    iconColor: "text-green-600",
    actionButton: {
      label: "جدولة الزيارة الميدانية",
      redirectUrl: "/field-visits/schedule/:requestId",
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office", "field_team"],
  },
  technical_eval: {
    title: "اتخاذ قرار التقييم الفني",
    description: "بناءً على نتائج الزيارة الميدانية والتقييم الفني، اختر الإجراء المناسب للطلب.",
    icon: "GitBranch",
    iconColor: "text-purple-600",
    // لا يوجد actionButton واحد - سيتم عرض الخيارات الأربعة
    allowedRoles: ["super_admin", "system_admin", "projects_office"],
  },
  boq_preparation: {
    title: "إعداد جدول الكميات",
    description: "قم بإضافة بنود جدول الكميات (BOQ) لتحديد الأعمال والكميات والتكاليف المطلوبة للمشروع.",
    icon: "FileSpreadsheet",
    iconColor: "text-orange-600",
    actionButton: {
      label: "فتح جدول الكميات",
      openModal: "boq", // فتح نافذة منبثقة بدلاً من صفحة منفصلة
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office"],
  },
  financial_eval: {
    title: "التقييم المالي",
    description: "راجع جدول الكميات والتكاليف المقدرة وقم بإعداد عرض السعر النهائي للمشروع.",
    icon: "DollarSign",
    iconColor: "text-emerald-600",
    actionButton: {
      label: "إضافة عروض الأسعار",
      redirectUrl: "/quotations",
    },
    allowedRoles: ["super_admin", "system_admin", "financial"],
  },
  financial_eval_and_approval: {
    title: "التقييم المالي واعتماد العرض",
    description: "راجع عروض الأسعار المقدمة من الموردين واعتمد العرض المناسب من صفحة عروض الأسعار، ثم اضغط 'الانتقال للتعاقد' للمتابعة.",
    icon: "DollarSign",
    iconColor: "text-emerald-600",
    actionButton: {
      label: "الانتقال إلى مرحلة التعاقد",
      nextStage: "contracting",
    },
    allowedRoles: ["super_admin", "system_admin", "financial", "projects_office"],
  },
  quotation_approval: {
    title: "اعتماد عرض السعر",
    description: "راجع عرض السعر النهائي واعتمده للانتقال إلى مرحلة التعاقد مع المقاول.",
    icon: "CheckCircle2",
    iconColor: "text-teal-600",
    actionButton: {
      label: "اعتماد عرض السعر",
      nextStage: "contracting",
    },
    allowedRoles: ["super_admin", "system_admin", "financial"],
  },
  contracting: {
    title: "إعداد واعتماد العقد",
    description: "قم بإعداد العقد مع المقاول واعتماده لبدء تنفيذ المشروع.",
    icon: "FileText",
    iconColor: "text-cyan-600",
    actionButton: {
      label: "إنشاء عقد جديد",
      nextStage: "contracting", // يبقى في نفس المرحلة حتى يتم اعتماد العقد
      redirectUrl: "/contracts/new?requestId=:requestId", // فتح صفحة إنشاء عقد جديد
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office"],
  },
  execution: {
    title: "متابعة تنفيذ المشروع",
    description: "تابع تقدم تنفيذ المشروع وتأكد من سير العمل وفقاً للعقد والجدول الزمني المحدد. بعد اكتمال التنفيذ، اضغط 'الانتقال إلى الاستلام' لرفع التقرير الختامي.",
    icon: "Hammer",
    iconColor: "text-amber-600",
    actionButton: {
      label: "عرض تفاصيل المشروع",
      nextStage: "execution", // يبقى في نفس المرحلة
      redirectUrl: "/projects/:projectId", // فتح صفحة تفاصيل المشروع
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office", "project_manager"],
  },
  handover: {
    title: "مرحلة الاستلام والتسليم",
    description: "قم برفع التقرير الختامي للمشروع وتوثيق استلام الأعمال المنجزة قبل الإغلاق الرسمي.",
    icon: "ClipboardCheck",
    iconColor: "text-purple-600",
    actionButton: {
      label: "رفع التقرير الختامي",
      nextStage: "handover",
      redirectUrl: "/final-report/new?requestId=:requestId",
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office", "project_manager"],
  },
  closed: {
    title: "المشروع مكتمل",
    description: "تم إغلاق المشروع بنجاح. يمكنك مراجعة التقارير النهائية والمستندات.",
    icon: "CheckCircle",
    iconColor: "text-green-600",
    actionButton: {
      label: "عرض التقرير النهائي",
      nextStage: "closed", // يبقى في نفس المرحلة
    },
    allowedRoles: ["super_admin", "system_admin", "projects_office"],
  },
} as const;

// مراحل سير العمل للعرض في ProgressStepper
export const WORKFLOW_STEPS = [
  { id: "submitted", label: "تقديم الطلب", order: 1 },
  { id: "initial_review", label: "المراجعة الأولية", order: 2 },
  { id: "field_visit", label: "الزيارة الميدانية", order: 3 },
  { id: "technical_eval", label: "التقييم الفني", order: 4 },
  { id: "boq_preparation", label: "جدول الكميات", order: 5 },
  { id: "financial_eval_and_approval", label: "التقييم المالي واعتماد العرض", order: 6 },
  { id: "contracting", label: "التعاقد", order: 7 },
  { id: "execution", label: "التنفيذ", order: 8 },
  { id: "handover", label: "الاستلام والتسليم", order: 9 },
  { id: "closed", label: "الإغلاق", order: 10 },
] as const;

// مسار الاستجابة السريعة (Fast Response Workflow)
// يتخطى المراحل غير الضرورية للاستجابة السريعة
export const FAST_RESPONSE_WORKFLOW = [
  { id: "submitted", label: "تقديم الطلب", order: 1 },
  { id: "initial_review", label: "المراجعة الأولية", order: 2 },
  { id: "field_visit", label: "الزيارة الميدانية", order: 3 },
  { id: "technical_eval", label: "التقييم الفني", order: 4 },
  { id: "execution", label: "التنفيذ", order: 5 },
  { id: "closed", label: "الإغلاق", order: 6 },
] as const;

// دالة لاختيار Workflow المناسب حسب نوع الطلب
export function getWorkflowForRequest(requestTrack: 'standard' | 'quick_response' | 'rejected') {
  if (requestTrack === 'quick_response') {
    return FAST_RESPONSE_WORKFLOW;
  }
  return WORKFLOW_STEPS;
}

// ترجمة أحداث السجل الزمني
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // طلبات
  request_created: "تم تقديم الطلب",
  stage_updated: "تم تحديث مرحلة الطلب",
  status_updated: "تم تحديث حالة الطلب",
  select_winning_quotation: "تم اختيار عرض السعر الفائز",
  financial_approval: "تمت الموافقة المالية",
  field_visit_assigned: "تم تعيين فريق الزيارة الميدانية",
  field_visit_scheduled: "تم جدولة الزيارة الميدانية",
  // مساجد
  mosque_created: "تم تسجيل المسجد",
  mosque_updated: "تم تحديث بيانات المسجد",
  mosque_approved: "تم اعتماد المسجد",
  mosque_rejected: "تم رفض المسجد",
  mosque_exemption_granted: "تم منح إعفاء للمسجد",
  mosque_exemption_revoked: "تم إلغاء إعفاء المسجد",
  // مستخدمون
  user_registered: "تم تسجيل المستخدم",
  user_login: "تسجيل دخول",
  user_logout: "تسجيل خروج",
  user_approved: "تم اعتماد المستخدم",
  user_rejected: "تم رفض المستخدم",
  user_suspended: "تم إيقاف المستخدم",
  user_role_changed: "تم تغيير دور المستخدم",
  employee_created: "تم إنشاء حساب موظف",
  // كلمات المرور
  password_changed: "تم تغيير كلمة المرور",
  password_reset_by_admin: "تم إعادة تعيين كلمة المرور بواسطة المدير",
  password_set: "تم تعيين كلمة المرور",
  // عقود
  "اعتماد العقد": "تم اعتماد العقد",
};

// ترجمة حقول بيانات البرنامج (programData)
export const PROGRAM_DATA_LABELS: Record<string, string> = {
  // حقول مشتركة
  workDescription: "وصف الأعمال المطلوبة",
  mosqueArea: "مساحة المسجد (م²)",
  actualWorshippers: "عدد المصلين الفعلي",
  hasDonorForMaintenance: "وجود متبرع للصيانة",
  willingToVolunteer: "الاستعداد لتأسيس فريق تطوعي",
  // بنيان
  hasLand: "وجود أرض",
  landOwnership: "ملكية الأرض",
  landArea: "مساحة الأرض (م²)",
  hasDonor: "وجود متبرع",
  donationAmount: "مبلغ التبرع",
  fundingProposal: "مقترح التمويل",
  landProposal: "مقترح الأرض",
  nearestMosque: "أقرب مسجد",
  distanceToMosque: "المسافة لأقرب مسجد (كم)",
  neighborhoodName: "اسم الحي",
  // سقيا
  cartonsNeeded: "عدد الكراتين المطلوبة",
  monthlyCartonNeed: "الاحتياج الشهري (كرتون)",
  hasWaterFridge: "وجود ثلاجة مياه",
};

// ترجمة قيم نعم/لا
export const BOOL_LABELS: Record<string, string> = {
  "true": "نعم",
  "false": "لا",
  "yes": "نعم",
  "no": "لا",
};
