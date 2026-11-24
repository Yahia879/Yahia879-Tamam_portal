export const MAWASIM_PERMISSIONS = [
  { action: "view", id: "mawasim.view", nameAr: "عرض مواسم", nameEn: "View Seasons", description: "عرض صفحة مواسم وقائمة المواسم والطلبات الموسمية" },
  { action: "create", id: "mawasim.create", nameAr: "إضافة موسم", nameEn: "Add Season", description: "إضافة مواسم جديدة وفتح فترات التسجيل" },
  { action: "manage", id: "mawasim.manage", nameAr: "إعدادات الموسم", nameEn: "Season Settings", description: "تعديل وضبط إعدادات وسعات خدمات المواسم" },
] as const;

export const MAWASIM_PERMISSION_IDS: string[] = MAWASIM_PERMISSIONS.map(p => p.id);

export function isMawasimPermission(permission: string): boolean {
  return permission === "mawasim" || permission.startsWith("mawasim.");
}

export function canViewMawasim(roleOrPermissions?: string | readonly string[], permissions?: readonly string[]): boolean {
  const perms = Array.isArray(roleOrPermissions) ? roleOrPermissions : permissions;
  if (perms) {
    return perms.includes("mawasim.view") || perms.includes("mawasim.create") || perms.includes("mawasim.manage");
  }
  const role = typeof roleOrPermissions === "string" ? roleOrPermissions : undefined;
  return role === "super_admin" || role === "system_admin";
}

export function canCreateMawasim(roleOrPermissions?: string | readonly string[], permissions?: readonly string[]): boolean {
  const perms = Array.isArray(roleOrPermissions) ? roleOrPermissions : permissions;
  if (perms) {
    return perms.includes("mawasim.create");
  }
  const role = typeof roleOrPermissions === "string" ? roleOrPermissions : undefined;
  return role === "super_admin" || role === "system_admin";
}

export function canManageMawasim(roleOrPermissions?: string | readonly string[], permissions?: readonly string[]): boolean {
  const perms = Array.isArray(roleOrPermissions) ? roleOrPermissions : permissions;
  if (perms) {
    return perms.includes("mawasim.manage");
  }
  const role = typeof roleOrPermissions === "string" ? roleOrPermissions : undefined;
  return role === "super_admin" || role === "system_admin";
}
