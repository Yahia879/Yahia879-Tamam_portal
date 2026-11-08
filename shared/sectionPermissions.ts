import { requestReportPermissionSelection, requestReportInterventionPrerequisite, requestReportDependentIntervention, RETIRED_REQUEST_REPORT_PERMISSIONS } from "./requestReportPermissions";
import { beneficiaryPermissionSelection, BENEFICIARY_LOG_ACTIONS, RETIRED_BENEFICIARY_PERMISSIONS } from "./beneficiaryPermissions";
import { calendarPermissionSelection, RETIRED_CALENDAR_PERMISSIONS } from "./calendarPermissions";
export const RETIRED_SECTION_PERMISSIONS = [...RETIRED_REQUEST_REPORT_PERMISSIONS, ...RETIRED_BENEFICIARY_PERMISSIONS, ...RETIRED_CALENDAR_PERMISSIONS];
export function sectionPermissionSelection(permissions: string[]) {
  return requestReportPermissionSelection(beneficiaryPermissionSelection(calendarPermissionSelection(permissions)))
    .filter(p => p !== "requests" && p !== "sedana_requests");
}
export function sectionPermissionPrerequisite(permission: string): string | null {
  return BENEFICIARY_LOG_ACTIONS.includes(permission) ? "beneficiary_evaluations.evaluations_log" : requestReportInterventionPrerequisite(permission);
}
export function sectionPermissionDependents(permission: string): string[] {
  const report = requestReportDependentIntervention(permission);
  return permission === "beneficiary_evaluations.evaluations_log" ? [...BENEFICIARY_LOG_ACTIONS] : report ? [report] : [];
}
