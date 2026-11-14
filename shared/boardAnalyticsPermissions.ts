export const BOARD_ANALYTICS_PERMISSIONS = [
  { id: "board_analytics.mosques", action: "mosques", nameAr: "إحصائيات المساجد", nameEn: "Mosque Statistics" },
  { id: "board_analytics.requests", action: "requests", nameAr: "إحصائيات الطلبات", nameEn: "Request Statistics" },
  { id: "board_analytics.procurement", action: "procurement", nameAr: "المشتريات والعقود", nameEn: "Procurement and Contracts" },
  { id: "board_analytics.financials", action: "financials", nameAr: "المالية والصرف", nameEn: "Finance and Disbursement" },
] as const;

export const BOARD_ANALYTICS_PERMISSION_IDS: string[] = BOARD_ANALYTICS_PERMISSIONS.map(permission => permission.id);
export type BoardAnalyticsTab = typeof BOARD_ANALYTICS_PERMISSIONS[number]["action"];

export function isBoardAnalyticsPermission(permission: string): boolean {
  return permission === "board_analytics" || permission.startsWith("board_analytics.");
}

export function boardAnalyticsTabs(permissions: readonly string[]): BoardAnalyticsTab[] {
  return BOARD_ANALYTICS_PERMISSIONS.filter(permission => permissions.includes(permission.id)).map(permission => permission.action);
}
