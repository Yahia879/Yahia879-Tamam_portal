export const MAWASIM_PERMISSIONS = [
  { action: "view", id: "mawasim.view", nameAr: "عرض مواسم", nameEn: "View Seasons", description: "عرض صفحة برنامج مواسم ومتابعة الطلبات والسعات" },
  { action: "manage", id: "mawasim.manage", nameAr: "إدارة إعدادات المواسم", nameEn: "Manage Season Settings", description: "إضافة وتعديل المواسم وضبط إعدادات وسعات الخدمات" },
] as const;

export const MAWASIM_PERMISSION_IDS: string[] = MAWASIM_PERMISSIONS.map(p => p.id);

export function isMawasimPermission(permission: string): boolean {
  return permission === "mawasim" || permission.startsWith("mawasim.");
}

export function canManageMawasim(role?: string, permissions?: readonly string[]): boolean {
  if (role === "super_admin" || role === "system_admin") return true;
  if (!permissions) return false;
  return permissions.includes("mawasim.manage");
}

export function canViewMawasim(role?: string, permissions?: readonly string[]): boolean {
  if (role === "super_admin" || role === "system_admin") return true;
  if (!permissions) return false;
  return permissions.includes("mawasim.view") || permissions.includes("mawasim.manage");
}
