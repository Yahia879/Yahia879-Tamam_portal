export const REQUEST_REPORT_TYPES = ["field_visit", "quick_response", "quick_request", "final_report"] as const;
export type RequestReportType = typeof REQUEST_REPORT_TYPES[number];

const labels: Record<RequestReportType, string> = {
  field_visit: "تقارير الزيارة الميدانية",
  quick_response: "تقارير الاستجابة السريعة",
  quick_request: "تقارير الطلبات السريعة",
  final_report: "التقارير الختامية",
};

export const REQUEST_REPORT_PERMISSIONS = REQUEST_REPORT_TYPES.flatMap(type => [
  { action: `view_${type}`, nameAr: `عرض ${labels[type]}` },
  { action: `intervene_${type}`, nameAr: `التدخل في ${labels[type]}` },
]);
export const REQUEST_REPORT_PERMISSION_IDS = REQUEST_REPORT_PERMISSIONS.map(p => `pending_reports.${p.action}`);
export const REQUEST_REPORT_VIEW_PERMISSIONS = REQUEST_REPORT_TYPES.map(type => `pending_reports.view_${type}`);
export const REQUEST_REPORT_INTERVENTION_PERMISSIONS = REQUEST_REPORT_TYPES.map(type => `pending_reports.intervene_${type}`);
export const RETIRED_REQUEST_REPORT_PERMISSIONS = ["pending_reports", "pending_reports.view", "pending_reports.intervene"];

export function isRequestReportType(type: unknown): type is RequestReportType {
  return REQUEST_REPORT_TYPES.includes(type as RequestReportType);
}

export function requestReportAccess(permissions: readonly string[]) {
  const canView = (type: unknown) => isRequestReportType(type) && permissions.includes(`pending_reports.view_${type}`);
  const canIntervene = (type: unknown) => canView(type) && permissions.includes(`pending_reports.intervene_${type}`);
  return { canView, canIntervene, canEnter: REQUEST_REPORT_TYPES.some(canView) };
}

export function requestReportPermissionSelection(permissions: string[]): string[] {
  return permissions.filter(p => {
    const prerequisite = requestReportInterventionPrerequisite(p);
    return !RETIRED_REQUEST_REPORT_PERMISSIONS.includes(p) && (!prerequisite || permissions.includes(prerequisite));
  });
}

export function requestReportInterventionPrerequisite(permission: string): string | null {
  const type = permission.replace(/^pending_reports\.intervene_/, "");
  return permission.startsWith("pending_reports.intervene_") && isRequestReportType(type)
    ? `pending_reports.view_${type}` : null;
}

export function requestReportDependentIntervention(permission: string): string | null {
  const type = permission.replace(/^pending_reports\.view_/, "");
  return permission.startsWith("pending_reports.view_") && isRequestReportType(type)
    ? `pending_reports.intervene_${type}` : null;
}

// Quick requests are identified by their source, rather than their completion stage.
export function isQuickRequestReport(request: { programData?: unknown; requestTrack?: string | null }): boolean {
  let data: any = request.programData ?? {};
  try { if (typeof data === "string") data = JSON.parse(data); } catch { data = {}; }
  return !!(data?.isQuickCreate || data?.source === "quick_create" ||
    (request.requestTrack === "quick_response" && data?.customMosqueName));
}
