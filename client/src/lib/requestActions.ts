import { ACTION_CONFIGS, WORKFLOW_STEPS, ActionButton } from "../../../shared/constants";

export interface ActiveAction {
  stage: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  actionButton?: ActionButton;
  allowedRoles: readonly string[];
  canPerformAction: boolean;
}

/**
 * تحديد الإجراء النشط بناءً على المرحلة الحالية وصلاحيات المستخدم
 */
export function getActiveAction(
  currentStage: string,
  userRole: string | undefined,
  requestData?: {
    assignedTo?: number | null;
    userId?: number;
    requestTrack?: string | null;
    quickReports?: any[];
    userPermissions?: string[];
  }
): ActiveAction | null {
  const config = ACTION_CONFIGS[currentStage as keyof typeof ACTION_CONFIGS];

  if (!config) {
    return null;
  }

  const userPerms = requestData?.userPermissions || [];
  const hasViewDetails = userPerms.includes("requests.view_details");
  const hasFieldTeamPerm = userPerms.includes("requests.manage_as_field_team");
  const hasQuickResponsePerm = userPerms.includes("requests.manage_as_quick_response");

  // التحقق من الصلاحيات
  let hasRole = (userRole && config.allowedRoles.some(role => role === userRole)) || 
                 hasViewDetails || 
                 (hasFieldTeamPerm && config.allowedRoles.includes("field_team")) ||
                 (hasQuickResponsePerm && config.allowedRoles.includes("quick_response"));

  // التحقق من الإسناد (إذا كان الطلب مسنداً لشخص معين)
  let isAssignedToUser =
    !requestData?.assignedTo ||
    requestData.assignedTo === requestData.userId ||
    (userRole && ['super_admin', 'system_admin', 'projects_office'].includes(userRole)) ||
    hasViewDetails ||
    hasFieldTeamPerm ||
    hasQuickResponsePerm;

  let title = config.title;
  let description = config.description;
  let icon = config.icon;
  let iconColor = config.iconColor;
  let actionButton = 'actionButton' in config ? config.actionButton : undefined;
  let allowedRoles = config.allowedRoles;

  const hasReport = requestData?.quickReports && requestData.quickReports.length > 0;

  // تخصيص مرحلة التنفيذ لمسار الاستجابة السريعة
  if (currentStage === 'execution' && requestData?.requestTrack === 'quick_response') {
    if (hasReport) {
      title = "تم تقديم تقرير الاستجابة السريعة";
      description = "تم تقديم واعتماد تقرير الاستجابة السريعة بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.";
      icon = "Zap";
      iconColor = "text-emerald-600";
      actionButton = {
        label: "عرض تقرير الاستجابة السريعة",
        openModal: "quick_response_report",
      };
      
      const allowedQRRoles = ["quick_response", "super_admin", "system_admin", "projects_office"];
      hasRole = Boolean(userRole && allowedQRRoles.includes(userRole)) || hasQuickResponsePerm;
      isAssignedToUser = true;
      allowedRoles = allowedQRRoles;
    } else {
      title = "تقديم تقرير الاستجابة السريعة";
      description = "تم تحويل هذا الطلب لمسار الاستجابة السريعة وهو قيد المتابعة والزيارة من قبل الشخص المسؤول. يرجى تعبئة ورفع تقرير الاستجابة السريعة لإكمال الخدمة.";
      icon = "Zap";
      iconColor = "text-purple-600";
      actionButton = {
        label: "رفع تقرير الاستجابة السريعة",
        redirectUrl: "/requests/:requestId/quick-response",
      };
      
      // الأدوار المسموح لها برفع التقرير في الاستجابة السريعة
      const allowedQRRoles = ["quick_response"];
      hasRole = Boolean(userRole && allowedQRRoles.includes(userRole)) || hasQuickResponsePerm;
      
      // يجب أن يكون المستخدم هو المسؤول المسند إليه الطلب
      isAssignedToUser = Boolean(requestData && requestData.assignedTo === requestData.userId);
      allowedRoles = allowedQRRoles;
    }
  }

  // تخصيص لمسار الاستجابة السريعة في حالة الإغلاق مع وجود تقرير
  if (currentStage === 'closed' && requestData?.requestTrack === 'quick_response' && hasReport) {
    title = "تم تقديم تقرير الاستجابة السريعة";
    description = "تم تقديم واعتماد تقرير الاستجابة السريعة بنجاح وإغلاق الطلب. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.";
    icon = "CheckCircle";
    iconColor = "text-green-600";
    actionButton = {
      label: "عرض تقرير الاستجابة السريعة",
      openModal: "quick_response_report",
    };
    
    const allowedQRRoles = ["quick_response", "super_admin", "system_admin", "projects_office"];
    hasRole = Boolean(userRole && allowedQRRoles.includes(userRole)) || hasQuickResponsePerm;
    isAssignedToUser = true;
    allowedRoles = allowedQRRoles;
  }

  const canPerformAction = Boolean(hasRole && isAssignedToUser);

  return {
    stage: currentStage,
    title,
    description,
    icon,
    iconColor,
    actionButton,
    allowedRoles,
    canPerformAction,
  };
}

/**
 * الحصول على المراحل المكتملة بناءً على المرحلة الحالية
 */
export function getCompletedSteps(
  currentStage: string,
  workflow: readonly { id: string; label: string; order: number }[] = WORKFLOW_STEPS
): string[] {
  const currentIndex = workflow.findIndex((s) => s.id === currentStage);
  if (currentIndex === -1) return [];

  return workflow.slice(0, currentIndex).map((s) => s.id);
}

/**
 * حساب نسبة التقدم
 */
export function getProgressPercentage(
  currentStage: string,
  workflow: readonly { id: string; label: string; order: number }[] = WORKFLOW_STEPS
): number {
  const currentIndex = workflow.findIndex((s) => s.id === currentStage);
  if (currentIndex === -1) return 0;

  return Math.round(((currentIndex + 1) / workflow.length) * 100);
}

