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
  }
): ActiveAction | null {
  const config = ACTION_CONFIGS[currentStage as keyof typeof ACTION_CONFIGS];

  if (!config) {
    return null;
  }

  // التحقق من الصلاحيات
  const hasRole = userRole && config.allowedRoles.some(role => role === userRole);

  // التحقق من الإسناد (إذا كان الطلب مسنداً لشخص معين)
  const isAssignedToUser =
    !requestData?.assignedTo || requestData.assignedTo === requestData.userId;

  const canPerformAction = Boolean(hasRole && isAssignedToUser);

  return {
    stage: currentStage,
    title: config.title,
    description: config.description,
    icon: config.icon,
    iconColor: config.iconColor,
    actionButton: 'actionButton' in config ? config.actionButton : undefined,
    allowedRoles: config.allowedRoles,
    canPerformAction,
  };
}

/**
 * الحصول على المراحل المكتملة بناءً على المرحلة الحالية
 */
export function getCompletedSteps(currentStage: string): string[] {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStage);
  if (currentIndex === -1) return [];

  return WORKFLOW_STEPS.slice(0, currentIndex).map((s) => s.id);
}

/**
 * حساب نسبة التقدم
 */
export function getProgressPercentage(currentStage: string): number {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStage);
  if (currentIndex === -1) return 0;

  return Math.round(((currentIndex + 1) / WORKFLOW_STEPS.length) * 100);
}
