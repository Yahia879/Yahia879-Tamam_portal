import { requestReportPermissionSelection, requestReportInterventionPrerequisite, requestReportDependentIntervention, RETIRED_REQUEST_REPORT_PERMISSIONS } from "./requestReportPermissions";
import { beneficiaryPermissionSelection, BENEFICIARY_LOG_ACTIONS, RETIRED_BENEFICIARY_PERMISSIONS } from "./beneficiaryPermissions";
import { calendarPermissionSelection, RETIRED_CALENDAR_PERMISSIONS } from "./calendarPermissions";
import { linkedPermissionPrerequisites, LINKED_PERMISSION_TARGETS } from "./linkedPermissionDependencies";
export const RETIRED_SECTION_PERMISSIONS = ["fund.transfer", ...RETIRED_REQUEST_REPORT_PERMISSIONS, ...RETIRED_BENEFICIARY_PERMISSIONS, ...RETIRED_CALENDAR_PERMISSIONS];
export function sectionPermissionSelection(permissions: string[]) {
  const selected = requestReportPermissionSelection(beneficiaryPermissionSelection(calendarPermissionSelection(permissions)))
    .filter(p => !RETIRED_SECTION_PERMISSIONS.includes(p) && p !== "requests" && p !== "sedana_requests" && sectionPermissionPrerequisites(p).every(required => permissions.includes(required)));
  return selected.filter(p => p !== "escalation" || selected.includes("escalation.delayed_requests") || selected.includes("escalation.delayed_beneficiaries"));
}
export function sectionPermissionPrerequisite(permission: string): string | null {
  return BENEFICIARY_LOG_ACTIONS.includes(permission) ? "beneficiary_evaluations.evaluations_log" : requestReportInterventionPrerequisite(permission);
}
export function sectionPermissionDependents(permission: string): string[] {
  const report = requestReportDependentIntervention(permission);
  return [
    ...(permission === "beneficiary_evaluations.evaluations_log" ? BENEFICIARY_LOG_ACTIONS : report ? [report] : []),
    ...LINKED_PERMISSION_TARGETS.filter(target => linkedPermissionPrerequisites(target).includes(permission)),
  ];
}
export function sectionPermissionPrerequisites(permission: string): string[] {
  const prerequisite = sectionPermissionPrerequisite(permission);
  return [...(prerequisite ? [prerequisite] : []), ...linkedPermissionPrerequisites(permission)];
}
