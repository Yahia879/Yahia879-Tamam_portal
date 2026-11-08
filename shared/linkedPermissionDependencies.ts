import { REQUEST_REPORT_INTERVENTION_PERMISSIONS, REQUEST_REPORT_PERMISSIONS } from "./requestReportPermissions";
import { REQUEST_MANAGEMENT_REQUIREMENTS } from "./requestPermissions";
import { CALENDAR_MANAGEMENT_PERMISSION_IDS } from "./calendarPermissions";
export { REQUEST_MANAGEMENT_REQUIREMENTS } from "./requestPermissions";

export const BENEFICIARY_MANAGEMENT_REQUIREMENTS = [
  ["requester_accounts.view", "حسابات طالبي الخدمة: عرض الحسابات"],
  ["requester_accounts.view_details", "حسابات طالبي الخدمة: عرض تفاصيل الحساب"],
  ["requester_accounts.approve", "حسابات طالبي الخدمة: اعتماد الحساب"],
  ["requester_accounts.suspend", "حسابات طالبي الخدمة: إيقاف الحساب"],
  ["requester_exceptions.view", "عرض طلبات الاستثناء"],
  ["requester_exceptions.approve", "اعتماد طلبات الاستثناء"],
  ["requester_exceptions.reject", "رفض طلبات الاستثناء"],
  ["requester_donations.view", "عرض طلبات التبرعات"],
  ["requester_donations.review", "مراجعة طلبات التبرعات"],
  ["requester_donations.approve", "اعتماد طلبات التبرعات"],
  ["requester_donations.send_email", "إرسال بريد إلكتروني لطلبات التبرعات"],
  ["requester_donations.send_whatsapp", "إرسال واتساب لطلبات التبرعات"],
  ["requester_inquiries.view", "عرض الاستفسارات العامة"],
  ["requester_inquiries.review", "مراجعة الاستفسارات العامة"],
  ["requester_inquiries.mark_reviewed", "تحديد الاستفسارات كمراجعة"],
  ["requester_inquiries.send_email", "إرسال بريد إلكتروني للاستفسارات"],
  ["requester_inquiries.send_whatsapp", "إرسال واتساب للاستفسارات"],
  ["requester_sedana.view", "عرض طلبات المستفيدين لبرنامج سدانة"],
  ["requester_sedana.review", "طلبات برنامج سدانة: اتخاذ إجراء واعتماد الطلب"],
  ["requester_sedana.send_email", "إرسال بريد إلكتروني لطلبات المستفيدين لبرنامج سدانة"],
  ["requester_sedana.send_whatsapp", "إرسال واتساب لطلبات المستفيدين لبرنامج سدانة"],
] as const;
export const BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS = BENEFICIARY_MANAGEMENT_REQUIREMENTS.map(([id]) => id as string);
export function isBeneficiaryManagementPermission(permission: string) {
  return ["requester_accounts", "requester_exceptions", "requester_donations", "requester_inquiries", "requester_sedana"]
    .some(module => permission === module || permission.startsWith(`${module}.`));
}
export const LINKED_PERMISSION_TARGETS = [...REQUEST_REPORT_INTERVENTION_PERMISSIONS, ...CALENDAR_MANAGEMENT_PERMISSION_IDS, "escalation.delayed_requests", "escalation.delayed_beneficiaries"];
export function linkedPermissionPrerequisites(permission: string): string[] {
  if (REQUEST_REPORT_INTERVENTION_PERMISSIONS.includes(permission) || CALENDAR_MANAGEMENT_PERMISSION_IDS.includes(permission) || permission === "escalation.delayed_requests") return REQUEST_MANAGEMENT_REQUIREMENTS;
  return permission === "escalation.delayed_beneficiaries" ? BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS : [];
}
export function linkedPermissionLabel(permission: string) {
  if (permission === "requests.view") return "عرض كافة الطلبات";
  if (permission === "requests.view_details") return "عرض تفاصيل الطلب وإدارته";
  return BENEFICIARY_MANAGEMENT_REQUIREMENTS.find(([id]) => id === permission)?.[1] ??
    REQUEST_REPORT_PERMISSIONS.find(p => `pending_reports.${p.action}` === permission)?.nameAr ?? permission;
}
export function linkedPermissionGrantPlan(requested: string[], has: (permission: string) => boolean) {
  const required = Array.from(new Set(requested.flatMap(linkedPermissionPrerequisites)));
  return {
    permissions: Array.from(new Set([...requested, ...required])),
    missing: required.filter(permission => !has(permission)),
  };
}
