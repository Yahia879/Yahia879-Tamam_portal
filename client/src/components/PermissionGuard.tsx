import { ReactNode } from "react";
import { usePermission, usePermissions, useAnyPermission } from "../hooks/usePermission";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  anyPermission?: string[];
  fallback?: ReactNode;
  mode?: "all" | "any";
}

/**
 * مكون لإخفاء/إظهار المحتوى بناءً على الصلاحيات
 * 
 * @example
 * // إظهار المحتوى فقط إذا كان المستخدم يملك صلاحية واحدة
 * <PermissionGuard permission="requests.create">
 *   <Button>إنشاء طلب جديد</Button>
 * </PermissionGuard>
 * 
 * @example
 * // إظهار المحتوى فقط إذا كان المستخدم يملك جميع الصلاحيات
 * <PermissionGuard permissions={["requests.view", "requests.edit"]}>
 *   <Button>تعديل الطلب</Button>
 * </PermissionGuard>
 * 
 * @example
 * // إظهار المحتوى إذا كان المستخدم يملك صلاحية واحدة على الأقل
 * <PermissionGuard anyPermission={["requests.view", "requests.edit"]}>
 *   <Link to="/requests">الطلبات</Link>
 * </PermissionGuard>
 * 
 * @example
 * // إظهار محتوى بديل إذا لم يملك الصلاحية
 * <PermissionGuard permission="requests.view" fallback={<div>ليس لديك صلاحية</div>}>
 *   <RequestsList />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  anyPermission,
  fallback = null,
  mode = "all"
}: PermissionGuardProps) {
  const hasSinglePermission = usePermission(permission ?? "");
  const hasAllPermissions = usePermissions(permissions ?? []);
  const hasAnyPermissions = useAnyPermission(anyPermission ?? []);

  // تحديد ما إذا كان يجب إظهار المحتوى
  let shouldShow = false;

  if (permission) {
    shouldShow = hasSinglePermission;
  } else if (permissions && permissions.length > 0) {
    shouldShow = hasAllPermissions;
  } else if (anyPermission && anyPermission.length > 0) {
    shouldShow = hasAnyPermissions;
  } else {
    // إذا لم يتم تحديد أي صلاحيات، إظهار المحتوى دائماً
    shouldShow = true;
  }

  return shouldShow ? <>{children}</> : <>{fallback}</>;
}
