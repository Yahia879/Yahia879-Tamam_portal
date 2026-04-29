/**
 * جدول تكوين المراحل والإجراءات (Stage Action Configuration)
 * 
 * يربط كل مرحلة بالإجراءات المطلوبة وترتيبها المنطقي
 * يحدد العلاقات بين الإجراءات (قبله، بعده، يتزامن معه، غير مرتبط)
 */

export type ActionRelation = 'before' | 'after' | 'concurrent' | 'independent';

export interface ActionConfig {
  key: string;
  label: string;
  description: string;
  route?: string; // المسار الذي يفتح عند الضغط على الزر
  requiredRoles: string[]; // الأدوار المسموح لها بتنفيذ الإجراء
  prerequisite?: string; // الإجراء المطلوب قبل هذا الإجراء (يجب إتمامه أولاً)
  nextAction?: string; // الإجراء التالي بعد إتمام هذا الإجراء
  relation?: ActionRelation; // العلاقة مع الإجراءات الأخرى
  checkCompletion?: (request: any) => boolean; // دالة للتحقق من إتمام الإجراء
}

export interface StageConfig {
  stage: string;
  actions: ActionConfig[];
}

/**
 * جدول تكوين المراحل الكامل
 */
export const STAGE_ACTION_CONFIG: StageConfig[] = [
  // ==================== 1. تقديم الطلب ====================
  {
    stage: 'submitted',
    actions: [
      {
        key: 'review_request',
        label: 'مراجعة الطلب',
        description: 'مراجعة بيانات الطلب والمستندات المرفقة',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        nextAction: 'move_to_initial_review',
        relation: 'before',
      },
      {
        key: 'move_to_initial_review',
        label: 'نقل للمراجعة الأولية',
        description: 'نقل الطلب لمرحلة المراجعة الأولية',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        prerequisite: 'review_request',
        relation: 'after',
      },
    ],
  },

  // ==================== 2. المراجعة الأولية ====================
  {
    stage: 'initial_review',
    actions: [
      {
        key: 'review_and_approve',
        label: 'مراجعة واعتماد الطلب',
        description: 'مراجعة بيانات الطلب والمستندات واعتماده للانتقال للزيارة الميدانية',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        relation: 'independent',
        checkCompletion: (request) => {
          // التحقق من إتمام المراجعة الأولية
          return !!request.reviewCompleted;
        },
      },
    ],
  },

  // ==================== 3. الزيارة الميدانية ====================
  {
    stage: 'field_visit',
    actions: [
      {
        key: 'assign_field_team',
        label: 'إسناد الفريق الميداني',
        description: 'إسناد الطلب لفريق الزيارة الميدانية',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        nextAction: 'schedule_field_visit',
        relation: 'before',
      },
      {
        key: 'schedule_field_visit',
        label: 'جدولة الزيارة الميدانية',
        description: 'تحديد موعد الزيارة الميدانية',
        route: '/field-visits/schedule',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'field_team'],
        prerequisite: 'assign_field_team',
        nextAction: 'submit_field_report',
        relation: 'after',
        checkCompletion: (request) => {
          // التحقق من وجود زيارة ميدانية مجدولة
          return request.fieldVisits && request.fieldVisits.some((visit: any) => visit.scheduledDate);
        },
      },
      {
        key: 'submit_field_report',
        label: 'رفع تقرير الزيارة الميدانية',
        description: 'رفع تقرير المعاينة الميدانية بعد تنفيذ الزيارة',
        route: '/field-visits/report',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'field_team'],
        prerequisite: 'schedule_field_visit',
        relation: 'after',
        checkCompletion: (request) => {
          // التحقق من وجود تقرير زيارة ميدانية مكتمل
          return request.fieldVisits && request.fieldVisits.some((visit: any) => visit.status === 'completed');
        },
      },
    ],
  },

  // ==================== 4. التقييم الفني ====================
  {
    stage: 'technical_eval',
    actions: [
      {
        key: 'technical_decision',
        label: 'اتخاذ قرار التقييم الفني',
        description: 'اختيار أحد الخيارات: اعتذار/تعليق/استجابة سريعة/تحويل لمشروع',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        relation: 'independent',
        checkCompletion: (request) => !!request.technicalEvalDecision,
      },
    ],
  },

  // ==================== 5. إعداد جدول الكميات ====================
  {
    stage: 'boq_preparation',
    actions: [
      {
        key: 'create_boq',
        label: 'إنشاء جدول الكميات',
        description: 'إضافة بنود جدول الكميات والمواصفات',
        route: '/boq',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        nextAction: 'finalize_boq',
        relation: 'before',
        checkCompletion: (request) => {
          // التحقق من وجود بنود في جدول الكميات
          return request.quantitySchedules && request.quantitySchedules.length > 0;
        },
      },
      {
        key: 'finalize_boq',
        label: 'إنهاء إعداد جدول الكميات',
        description: 'مراجعة واعتماد جدول الكميات',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        prerequisite: 'create_boq',
        relation: 'after',
      },
    ],
  },

  // ==================== 6. التقييم المالي واعتماد العرض ====================
  {
    stage: 'financial_eval_and_approval',
    actions: [
      {
        key: 'add_quotations',
        label: 'إضافة عروض الأسعار',
        description: 'إضافة عروض الأسعار من الموردين',
        route: '/quotations',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'financial'],
        nextAction: 'select_and_approve',
        relation: 'before',
        checkCompletion: (request) => {
          // التحقق من وجود عروض أسعار
          return request.quotations && request.quotations.length > 0;
        },
      },
      {
        key: 'select_and_approve',
        label: 'اختيار واعتماد العرض الفائز',
        description: 'اختيار عرض السعر الفائز واعتماده مالياً للانتقال للتعاقد',
        route: '/financial-approval',
        requiredRoles: ['super_admin', 'system_admin', 'financial'],
        prerequisite: 'add_quotations',
        relation: 'after',
        checkCompletion: (request) => !!request.selectedQuotationId && !!request.financiallyApproved,
      },
    ],
  },

  // ==================== 8. التعاقد ====================
  {
    stage: 'contracting',
    actions: [
      {
        key: 'create_contract',
        label: 'إنشاء العقد',
        description: 'إعداد عقد المشروع مع المورد الفائز',
        route: '/contracts/create',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'financial'],
        nextAction: 'sign_contract',
        relation: 'before',
        checkCompletion: (request) => !!request.contractId,
      },
      {
        key: 'sign_contract',
        label: 'توقيع العقد',
        description: 'توقيع العقد وإبرامه',
        requiredRoles: ['super_admin', 'system_admin', 'financial'],
        prerequisite: 'create_contract',
        nextAction: 'convert_to_project',
        relation: 'after',
        checkCompletion: (request) => request.contractStatus === 'signed',
      },
      {
        key: 'convert_to_project',
        label: 'تحويل إلى مشروع',
        description: 'تحويل العقد إلى مشروع تنفيذي',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        prerequisite: 'sign_contract',
        relation: 'after',
      },
    ],
  },

  // ==================== 9. التنفيذ ====================
  {
    stage: 'execution',
    actions: [
      {
        key: 'submit_progress_report',
        label: 'رفع تقرير الإنجاز',
        description: 'رفع تقرير إنجاز المرحلة الحالية من التنفيذ',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
        nextAction: 'request_payment',
        relation: 'before',
      },
      {
        key: 'request_payment',
        label: 'طلب صرف دفعة',
        description: 'طلب صرف دفعة مالية بناءً على الإنجاز',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
        prerequisite: 'submit_progress_report',
        nextAction: 'issue_payment_order',
        relation: 'after',
      },
      {
        key: 'issue_payment_order',
        label: 'إصدار أمر صرف',
        description: 'إصدار أمر صرف الدفعة المالية',
        requiredRoles: ['super_admin', 'system_admin', 'financial'],
        prerequisite: 'request_payment',
        relation: 'after',
      },
      // إجراء خاص بمسار الاستجابة السريعة
      {
        key: 'submit_quick_response_report',
        label: 'رفع تقرير الاستجابة السريعة',
        description: 'رفع تقرير الاستجابة السريعة بعد إتمام الأعمال',
        route: '/quick-response/report',
        requiredRoles: ['super_admin', 'system_admin', 'quick_response'],
        relation: 'independent',
        checkCompletion: (request) => !!request.quickResponseReportId,
      },
    ],
  },

  // ==================== 10. الاستلام ====================
  {
    stage: 'handover',
    actions: [
      {
        key: 'preliminary_handover',
        label: 'الاستلام الابتدائي',
        description: 'إجراء الاستلام الابتدائي للمشروع',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
        nextAction: 'warranty_period',
        relation: 'before',
      },
      {
        key: 'warranty_period',
        label: 'فترة الضمان',
        description: 'فترة الضمان والمتابعة',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
        prerequisite: 'preliminary_handover',
        nextAction: 'final_handover',
        relation: 'after',
      },
      {
        key: 'final_handover',
        label: 'الاستلام النهائي',
        description: 'إجراء الاستلام النهائي للمشروع',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
        prerequisite: 'warranty_period',
        nextAction: 'final_report',
        relation: 'after',
      },
      {
        key: 'final_report',
        label: 'التقرير الختامي',
        description: 'إعداد التقرير الختامي للمشروع',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
        prerequisite: 'final_handover',
        nextAction: 'final_payment',
        relation: 'after',
      },
      {
        key: 'final_payment',
        label: 'الدفعة الختامية',
        description: 'صرف الدفعة المالية الختامية',
        requiredRoles: ['super_admin', 'system_admin', 'financial'],
        prerequisite: 'final_report',
        relation: 'after',
      },
    ],
  },

  // ==================== 11. الإغلاق ====================
  {
    stage: 'closed',
    actions: [
      {
        key: 'stakeholder_satisfaction',
        label: 'قياس رضا أصحاب المصلحة',
        description: 'قياس رضا أصحاب المصلحة عن المشروع',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'corporate_comm'],
        nextAction: 'beneficiary_satisfaction',
        relation: 'before',
      },
      {
        key: 'beneficiary_satisfaction',
        label: 'قياس رضا المستفيدين',
        description: 'قياس رضا المستفيدين من المشروع',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office', 'corporate_comm'],
        prerequisite: 'stakeholder_satisfaction',
        nextAction: 'publish_project',
        relation: 'after',
      },
      {
        key: 'publish_project',
        label: 'نشر المشروع',
        description: 'نشر المشروع والإعلان عنه',
        requiredRoles: ['super_admin', 'system_admin', 'corporate_comm'],
        prerequisite: 'beneficiary_satisfaction',
        nextAction: 'collect_feedback',
        relation: 'after',
      },
      {
        key: 'collect_feedback',
        label: 'التغذية الراجعة',
        description: 'جمع التغذية الراجعة والدروس المستفادة',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        prerequisite: 'publish_project',
        nextAction: 'archive_project',
        relation: 'after',
      },
      {
        key: 'archive_project',
        label: 'أرشفة الملف',
        description: 'أرشفة ملف المشروع الكامل',
        requiredRoles: ['super_admin', 'system_admin', 'projects_office'],
        prerequisite: 'collect_feedback',
        relation: 'after',
      },
    ],
  },
];

/**
 * دالة للحصول على تكوين مرحلة معينة
 */
export function getStageConfig(stage: string): StageConfig | undefined {
  return STAGE_ACTION_CONFIG.find(config => config.stage === stage);
}

/**
 * دالة للحصول على الإجراءات المتاحة لمرحلة معينة
 */
export function getAvailableActions(stage: string, userRole: string, request: any): ActionConfig[] {
  const stageConfig = getStageConfig(stage);
  if (!stageConfig) return [];

  return stageConfig.actions.filter(action => {
    // التحقق من الصلاحية
    if (!action.requiredRoles.includes(userRole)) return false;

    // التحقق من الشرط المسبق
    if (action.prerequisite) {
      const prerequisiteAction = stageConfig.actions.find(a => a.key === action.prerequisite);
      if (prerequisiteAction?.checkCompletion && !prerequisiteAction.checkCompletion(request)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * دالة للحصول على الإجراء النشط الحالي (الإجراء الذي يجب تنفيذه الآن)
 */
export function getCurrentActiveAction(stage: string, userRole: string, request: any): ActionConfig | null {
  const availableActions = getAvailableActions(stage, userRole, request);
  
  // البحث عن أول إجراء غير مكتمل
  for (const action of availableActions) {
    if (action.checkCompletion && !action.checkCompletion(request)) {
      return action;
    }
    // إذا لم يكن هناك دالة checkCompletion، يعتبر الإجراء نشطاً
    if (!action.checkCompletion) {
      return action;
    }
  }

  // إذا كانت جميع الإجراءات مكتملة، نعيد آخر إجراء (للانتقال للمرحلة التالية)
  return availableActions[availableActions.length - 1] || null;
}

/**
 * دالة للحصول على جميع الإجراءات المكتملة في مرحلة معينة
 */
export function getCompletedActions(stage: string, request: any): string[] {
  const stageConfig = getStageConfig(stage);
  if (!stageConfig) return [];

  return stageConfig.actions
    .filter(action => action.checkCompletion && action.checkCompletion(request))
    .map(action => action.key);
}

/**
 * دالة للحصول على نسبة الإنجاز في مرحلة معينة
 */
export function getStageProgress(stage: string, request: any): number {
  const stageConfig = getStageConfig(stage);
  if (!stageConfig || stageConfig.actions.length === 0) return 0;

  const completedCount = getCompletedActions(stage, request).length;
  return Math.round((completedCount / stageConfig.actions.length) * 100);
}
