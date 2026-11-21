import { isProgressInvoice } from "./progressInvoicePermissions";
import { isFollowUpReport } from "./followUpReport";

export const PROGRESS_REPORT_ACTIONS = ["view", "add", "edit", "approve", "revoke_approval", "exception_approve", "view_revoke_reason"] as const;
export const PROGRESS_REPORT_PERMISSION_IDS = PROGRESS_REPORT_ACTIONS.map(action => `progress_reports.${action}`);

export function isProgressReportPermission(permission: string): boolean {
  return permission === "progress_reports" || permission.startsWith("progress_reports.");
}

export function isSeparateProjectReport(report: { title?: string | null; reportNumber?: string | null }): boolean {
  if (isFollowUpReport(report)) return true;
  const title = report.title?.toLowerCase() || "";
  const number = report.reportNumber?.toUpperCase() || "";
  return ["زيارة", "visit", "نصف", "شهري", "ربعي", "semi", "monthly", "quarterly"].some(marker => title.includes(marker)) ||
    ["VISIT", "SEMI", "MONTH", "Q"].some(marker => number.includes(marker));
}

export function isAchievementProgressReport(report: { title?: string | null; reportNumber?: string | null; workSummary?: string | null }): boolean {
  return !isProgressInvoice(report) && !isSeparateProjectReport(report);
}

export function progressReportPermissionSelection(permissions: string[]): string[] {
  const selected = permissions.includes("progress_reports") && !permissions.some(permission => permission.startsWith("progress_reports."))
    ? [...permissions, ...PROGRESS_REPORT_PERMISSION_IDS] : permissions;
  return selected.filter(permission => permission !== "progress_reports");
}

export function progressReportAccess(permissions: readonly string[]) {
  const canView = permissions.includes("progress_reports.view");
  const has = (action: string) => canView && permissions.includes(`progress_reports.${action}`);
  const canAdd = has("add"), canEdit = has("edit"), canApprove = has("approve");
  const canRevoke = has("revoke_approval"), canExceptionApprove = has("exception_approve"), canViewRevokeReason = has("view_revoke_reason");
  return { canView, canAdd, canEdit, canApprove, canRevoke, canExceptionApprove, canViewRevokeReason,
    hasActions: canEdit || canApprove || canRevoke || canExceptionApprove || canViewRevokeReason };
}
