import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

/**
 * التحقق مما إذا كانت الصلاحية تابعة لقسم إدارة المخزون
 * لقسم إدارة المخزون، يُمنع التجاوز التلقائي بالـ Wildcard (*) للمدراء ويجب مطابقة الصلاحية صراحةً
 */
export function isInventoryPermission(permission: string): boolean {
  return (
    permission.startsWith("sedana_quotations") ||
    permission.startsWith("orders_and_letters") ||
    permission.startsWith("purchase_orders") ||
    permission.startsWith("csr_letters") ||
    permission.startsWith("sedana_warehouse")
  );
}

/**
 * Hook للتحقق من صلاحية واحدة
 * @param permission - معرف الصلاحية (مثل: requests.view)
 * @returns true إذا كان المستخدم يملك الصلاحية، false إذا لم يملكها
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  
  const { data: permissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  // إذا كان المستخدم غير مسجل دخول، لا يملك أي صلاحيات
  if (!user) {
    return false;
  }

  const isInv = isInventoryPermission(permission);

  if (permissions !== undefined) {
    if (isInv) {
      return permissions.includes(permission);
    }
    return permissions.includes(permission) || permissions.includes("*");
  }

  const userPerms: string[] = (user as any)?.permissions ?? [];
  if (isInv) {
    return userPerms.includes(permission);
  }
  return userPerms.includes(permission) || userPerms.includes("*");
}

/**
 * Hook للتحقق من عدة صلاحيات (يجب أن يملك جميعها)
 * @param requiredPermissions - قائمة معرفات الصلاحيات
 * @returns true إذا كان المستخدم يملك جميع الصلاحيات، false إذا لم يملك إحداها
 */
export function usePermissions(requiredPermissions: string[]): boolean {
  const { user } = useAuth();
  
  const { data: permissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  if (!user) {
    return false;
  }

  const hasInventory = requiredPermissions.some(isInventoryPermission);

  if (permissions !== undefined) {
    if (hasInventory) {
      return requiredPermissions.every(p =>
        isInventoryPermission(p) ? permissions.includes(p) : (permissions.includes(p) || permissions.includes("*"))
      );
    }
    return permissions.includes("*") || requiredPermissions.every(p => permissions.includes(p));
  }

  const userPerms: string[] = (user as any)?.permissions ?? [];
  if (hasInventory) {
    return requiredPermissions.every(p =>
      isInventoryPermission(p) ? userPerms.includes(p) : (userPerms.includes(p) || userPerms.includes("*"))
    );
  }
  return userPerms.includes("*") || requiredPermissions.every(p => userPerms.includes(p));
}

/**
 * Hook للتحقق من صلاحية واحدة على الأقل من قائمة
 * @param permissionsList - قائمة معرفات الصلاحيات
 * @returns true إذا كان المستخدم يملك صلاحية واحدة على الأقل
 */
export function useAnyPermission(permissionsList: string[]): boolean {
  const { user } = useAuth();
  
  const { data: permissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  if (!user) {
    return false;
  }

  if (permissions !== undefined) {
    return permissionsList.some(p =>
      isInventoryPermission(p) ? permissions.includes(p) : (permissions.includes(p) || permissions.includes("*"))
    );
  }

  const userPerms: string[] = (user as any)?.permissions ?? [];
  return permissionsList.some(p =>
    isInventoryPermission(p) ? userPerms.includes(p) : (userPerms.includes(p) || userPerms.includes("*"))
  );
}

/**
 * Hook لجلب جميع صلاحيات المستخدم
 * @returns قائمة جميع الصلاحيات
 */
export function useUserPermissions(): string[] {
  const { user } = useAuth();
  
  const { data: permissions } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  return permissions ?? [];
}
