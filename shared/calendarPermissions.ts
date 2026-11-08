import { REQUEST_MANAGEMENT_REQUIREMENTS } from "./requestPermissions";
export const CALENDAR_EVENT_TYPES = ["field_visit", "quick_response", "final_report", "custom"] as const;
export type CalendarEventType = typeof CALENDAR_EVENT_TYPES[number];
export const CALENDAR_PERMISSIONS = [
  { action: "view_field_visit", nameAr: "عرض مواعيد الزيارات الميدانية" },
  { action: "view_quick_response", nameAr: "عرض مواعيد الاستجابة السريعة" },
  { action: "view_final_report", nameAr: "عرض مواعيد التقارير الختامية" },
  { action: "view_custom", nameAr: "عرض المواعيد المخصصة" },
  { action: "create_custom", nameAr: "إضافة حدث مخصص" },
  { action: "view_own", nameAr: "عرض زياراتي الميدانية الخاصة بي فقط" },
] as const;
export const CALENDAR_PERMISSION_IDS = CALENDAR_PERMISSIONS.map(p => `appointments.${p.action}`);
export const CALENDAR_MANAGEMENT_PERMISSION_IDS = CALENDAR_PERMISSION_IDS.filter(p => p !== "appointments.view_own");
export const CALENDAR_ENTRY_PERMISSIONS = [...CALENDAR_PERMISSION_IDS];
export const RETIRED_CALENDAR_PERMISSIONS = ["appointments.view_all", "appointments.view", "appointments.add", "appointments.edit", "appointments", "appointments_calendar"];
export function calendarPermissionConflicts(permission: string): string[] {
  if (permission === "appointments.view_own") return CALENDAR_PERMISSION_IDS.filter(p => p !== permission);
  return CALENDAR_PERMISSION_IDS.includes(permission) ? ["appointments.view_own"] : [];
}
export function toggleCalendarPermission(permissions: string[], permission: string, enabled: boolean) {
  const conflicts = enabled ? calendarPermissionConflicts(permission) : [];
  const next = permissions.filter(p => p !== permission && !conflicts.includes(p));
  return enabled ? [...next, permission] : next;
}
export function calendarPermissionOverrides(overrides: Record<string, boolean>, inherited: readonly string[], permission: string, enabled: boolean) {
  const next = { ...overrides };
  if (inherited.includes(permission) === enabled) delete next[permission];
  else next[permission] = enabled;
  if (enabled) for (const conflict of calendarPermissionConflicts(permission)) {
    if (inherited.includes(conflict)) next[conflict] = false;
    else delete next[conflict];
  }
  return next;
}
export function calendarPermissionSelection(permissions: string[]) {
  const ownOnly = permissions.includes("appointments.view_own");
  return permissions.filter(p => !RETIRED_CALENDAR_PERMISSIONS.includes(p) &&
    (!ownOnly || !p.startsWith("appointments.") || p === "appointments.view_own"));
}
export function calendarAccess(permissions: readonly string[]) {
  const ownOnly = permissions.includes("appointments.view_own");
  const hasRequestAccess = REQUEST_MANAGEMENT_REQUIREMENTS.every(p => permissions.includes(p));
  const canView = (type: unknown) => CALENDAR_EVENT_TYPES.includes(type as CalendarEventType) &&
    (ownOnly || (hasRequestAccess && permissions.includes(`appointments.view_${type}`)));
  const ownFieldVisitsOnly = ownOnly;
  const readableTypes = CALENDAR_EVENT_TYPES.filter(canView);
  const canCreateCustom = !ownOnly && hasRequestAccess && permissions.includes("appointments.create_custom");
  return { canView, ownOnly, ownFieldVisitsOnly, readableTypes, canRead: readableTypes.length > 0, canCreateCustom, canEnter: readableTypes.length > 0 || canCreateCustom };
}
