import { requestReportPermissionSelection, requestReportInterventionPrerequisite, requestReportDependentIntervention, RETIRED_REQUEST_REPORT_PERMISSIONS } from "./requestReportPermissions";
import { beneficiaryPermissionSelection, BENEFICIARY_LOG_ACTIONS, RETIRED_BENEFICIARY_PERMISSIONS } from "./beneficiaryPermissions";
import { calendarPermissionSelection, RETIRED_CALENDAR_PERMISSIONS } from "./calendarPermissions";
import { linkedPermissionPrerequisites, LINKED_PERMISSION_TARGETS } from "./linkedPermissionDependencies";
import { progressInvoicePermissionSelection, PROGRESS_INVOICE_PERMISSION_IDS } from "./progressInvoicePermissions";
import { progressReportPermissionSelection, PROGRESS_REPORT_PERMISSION_IDS } from "./progressReportPermissions";
export const RETIRED_SECTION_PERMISSIONS = ["fund.transfer", ...RETIRED_REQUEST_REPORT_PERMISSIONS, ...RETIRED_BENEFICIARY_PERMISSIONS, ...RETIRED_CALENDAR_PERMISSIONS];
export function sectionPermissionSelection(permissions: string[]) {
  const normalized = progressReportPermissionSelection(progressInvoicePermissionSelection(permissions));
  const selected = requestReportPermissionSelection(beneficiaryPermissionSelection(calendarPermissionSelection(normalized)))
    .filter(p => !RETIRED_SECTION_PERMISSIONS.includes(p) && p !== "requests" && p !== "sedana_requests" && sectionPermissionPrerequisites(p).every(required => normalized.includes(required)));
  return selected.filter(p => p !== "escalation" || selected.includes("escalation.delayed_requests") || selected.includes("escalation.delayed_beneficiaries"));
}
export function sectionPermissionPrerequisite(permission: string): string | null {
  if (permission !== "progress_reports.view" && PROGRESS_REPORT_PERMISSION_IDS.includes(permission)) return "progress_reports.view";
  if (permission.startsWith("progress_invoices.") && permission !== "progress_invoices.view") return "progress_invoices.view";
  return BENEFICIARY_LOG_ACTIONS.includes(permission) ? "beneficiary_evaluations.evaluations_log" : requestReportInterventionPrerequisite(permission);
}
export function sectionPermissionDependents(permission: string): string[] {
  const report = requestReportDependentIntervention(permission);
  return [
    ...(permission === "progress_reports.view" ? PROGRESS_REPORT_PERMISSION_IDS.filter(id => id !== permission) : []),
    ...(permission === "progress_invoices.view" ? PROGRESS_INVOICE_PERMISSION_IDS.filter(id => id !== permission) : []),
    ...(permission === "beneficiary_evaluations.evaluations_log" ? BENEFICIARY_LOG_ACTIONS : report ? [report] : []),
    ...LINKED_PERMISSION_TARGETS.filter(target => linkedPermissionPrerequisites(target).includes(permission)),
  ];
}
export function sectionPermissionPrerequisites(permission: string): string[] {
  const prerequisite = sectionPermissionPrerequisite(permission);
  return [...(prerequisite ? [prerequisite] : []), ...linkedPermissionPrerequisites(permission)];
}
