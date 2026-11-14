export const INFORMATION_DASHBOARD_TAB_IDS = [
  "digital_screen", "mosques", "requests", "procurement", "financial",
] as const;

export type InformationDashboardTab = typeof INFORMATION_DASHBOARD_TAB_IDS[number];

export const INFORMATION_DASHBOARD_PERMISSION_IDS = INFORMATION_DASHBOARD_TAB_IDS.map(
  tab => `information_dashboard.${tab}`,
);

export function isInformationDashboardPermission(permission: string): boolean {
  return permission === "information_dashboard" || permission.startsWith("information_dashboard.");
}

// These grants are explicit, including for administrators and wildcard holders.
export function informationDashboardTabs(permissions: readonly string[]): InformationDashboardTab[] {
  return INFORMATION_DASHBOARD_TAB_IDS.filter(tab => permissions.includes(`information_dashboard.${tab}`));
}

export function hasAllInformationDashboardTabs(tabs: readonly string[]): boolean {
  return INFORMATION_DASHBOARD_TAB_IDS.every(tab => tabs.includes(tab));
}

export const INFORMATION_DASHBOARD_CATEGORY_TABS: Record<string, InformationDashboardTab> = {
  digital_screen_section: "digital_screen",
  mosque_section: "mosques",
  request_section: "requests",
  procurement_section: "procurement",
  financial_section: "financial",
};

export function canCustomizeDashboardElement(category: string, tabs: readonly string[], elementId?: string): boolean {
  const tab = INFORMATION_DASHBOARD_CATEGORY_TABS[category];
  if (!tab) return false;
  // The digital screen reuses the statistics cards of the other sections.
  // Their section toggles and charts still require that section's own grant.
  const sharedDigitalCard = !!elementId && !elementId.startsWith("section_") && !elementId.endsWith("_charts");
  return tabs.includes(tab) || (tabs.includes("digital_screen") && sharedDigitalCard);
}

export function roleInformationDashboardPermissions(
  roleId: string, description: string | null | undefined, storedPermissions: readonly string[],
): string[] {
  try {
    const saved = JSON.parse(description || "null");
    if (Array.isArray(saved)) return INFORMATION_DASHBOARD_PERMISSION_IDS.filter(p => saved.includes(p));
  } catch {}
  if (["super_admin", "system_admin", "dashboard_viewer"].includes(roleId)) {
    return [...INFORMATION_DASHBOARD_PERMISSION_IDS];
  }
  return INFORMATION_DASHBOARD_PERMISSION_IDS.filter(p => storedPermissions.includes(p));
}
