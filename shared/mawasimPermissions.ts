export const MAWASIM_PERMISSIONS = [
  { action: "view", id: "mawasim.view", nameAr: "عرض كافة المواسم", nameEn: "View All Seasons", description: "عرض صفحة مواسم وكافة المواسم ومتابعة السعات" },
  { action: "view_assigned", id: "mawasim.view_assigned", nameAr: "عرض المواسم المسندة لك كمدير", nameEn: "View Assigned Seasons", description: "عرض المواسم المسندة للمستخدم كمدير للموسم فقط" },
  { action: "create", id: "mawasim.create", nameAr: "إضافة موسم", nameEn: "Add Season", description: "إضافة مواسم جديدة وفتح فترات التسجيل" },
  { action: "manage", id: "mawasim.manage", nameAr: "إعدادات الموسم", nameEn: "Season Settings", description: "تعديل وضبط إعدادات وسعات خدمات المواسم" },
  { action: "view_requests", id: "mawasim.view_requests", nameAr: "عرض طلبات برنامج مواسم", nameEn: "View Mawasim Requests", description: "عرض قسم طلبات الموسم وتفاصيلها وتصديرها" },
  { action: "approve_requests", id: "mawasim.approve_requests", nameAr: "اعتماد طلبات برنامج مواسم", nameEn: "Approve Mawasim Requests", description: "مراجعة طلبات الموسم واعتماد الكميات أو الاعتذار عنها" },
] as const;

export const MAWASIM_PERMISSION_IDS: string[] = MAWASIM_PERMISSIONS.map(p => p.id);
export const MAWASIM_VIEW_PERMISSIONS = ["mawasim.view", "mawasim.view_assigned"] as const;
export const MAWASIM_SUB_PERMISSION_IDS = [
  "mawasim.create",
  "mawasim.manage",
  "mawasim.view_requests",
  "mawasim.approve_requests",
] as const;

export function hasMawasimSeasonViewPermission(perms: readonly string[] | ReadonlySet<string>): boolean {
  const has = (id: string) => ("has" in perms ? perms.has(id) : perms.includes(id));
  return has("mawasim.view") || has("mawasim.view_assigned");
}

export function isMawasimSubPermission(permission: string): boolean {
  return MAWASIM_SUB_PERMISSION_IDS.includes(permission as (typeof MAWASIM_SUB_PERMISSION_IDS)[number]);
}

export function isMawasimPermission(permission: string): boolean {
  return permission === "mawasim" || permission.startsWith("mawasim.");
}

export function canViewMawasim(roleOrPermissions?: string | readonly string[], permissions?: readonly string[]): boolean {
  const perms = Array.isArray(roleOrPermissions) ? roleOrPermissions : permissions;
  if (perms) {
    return MAWASIM_PERMISSION_IDS.some(id => perms.includes(id));
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

export function canViewMawasimRequests(roleOrPermissions?: string | readonly string[], permissions?: readonly string[]): boolean {
  const perms = Array.isArray(roleOrPermissions) ? roleOrPermissions : permissions;
  if (perms) {
    return perms.includes("mawasim.view_requests") || perms.includes("mawasim.approve_requests");
  }
  const role = typeof roleOrPermissions === "string" ? roleOrPermissions : undefined;
  return role === "super_admin" || role === "system_admin";
}

export function canApproveMawasimRequests(roleOrPermissions?: string | readonly string[], permissions?: readonly string[]): boolean {
  const perms = Array.isArray(roleOrPermissions) ? roleOrPermissions : permissions;
  if (perms) {
    return perms.includes("mawasim.approve_requests");
  }
  const role = typeof roleOrPermissions === "string" ? roleOrPermissions : undefined;
  return role === "super_admin" || role === "system_admin";
}
