export const BENEFICIARY_PERMISSIONS = [
  { action: "view", nameAr: "عرض إحصائيات رضا المستفيدين" },
  { action: "evaluations_log", nameAr: "سجل استبيانات التقييم" },
  { action: "view_details", nameAr: "عرض التفاصيل" },
  { action: "view_reply", nameAr: "عرض الرد" },
  { action: "reply", nameAr: "إضافة رد على التقييم" },
  { action: "hide", nameAr: "إخفاء وإظهار التقييمات" },
] as const;
export const BENEFICIARY_PERMISSION_IDS = BENEFICIARY_PERMISSIONS.map(p => `beneficiary_evaluations.${p.action}`);
export const BENEFICIARY_LOG_ACTIONS = ["beneficiary_evaluations.view_reply", "beneficiary_evaluations.reply", "beneficiary_evaluations.hide"];
export const RETIRED_BENEFICIARY_PERMISSIONS = ["beneficiary_evaluations.dispatch_log", "beneficiary_evaluations.contacts", "beneficiary_evaluations.resend_reminder", "beneficiary_evaluations.send_reminder", "beneficiary_evaluations", "beneficiary_satisfaction"];
export function beneficiaryPermissionSelection(permissions: string[]) {
  return permissions.filter(p => !RETIRED_BENEFICIARY_PERMISSIONS.includes(p) &&
    (!BENEFICIARY_LOG_ACTIONS.includes(p) || permissions.includes("beneficiary_evaluations.evaluations_log")));
}
export function beneficiaryAccess(permissions: readonly string[]) {
  const has = (id: string) => permissions.includes(`beneficiary_evaluations.${id}`);
  const canViewLog = has("evaluations_log");
  return {
    canEnter: has("view") || canViewLog, canViewLog,
    canViewReply: canViewLog && has("view_reply"), canReply: canViewLog && has("reply"), canHide: canViewLog && has("hide"),
  };
}
